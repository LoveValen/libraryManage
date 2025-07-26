const BorrowService = require('./borrow.service');
const UserService = require('./user.service');
const BookService = require('./book.service');
const prisma = require('../utils/prisma');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError,
  UnauthorizedError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { BORROW_STATUS, BORROW_RULES, USER_ROLES } = require('../utils/constants');

/**
 * Borrows service adapter for Prisma
 * Maintains compatibility with existing controller interface
 */
class BorrowsService {
  /**
   * Create borrow
   */
  async createBorrow(borrowData, operatorUser) {
    const { userId, bookId, borrowDays = BORROW_RULES.DEFAULT_BORROW_DAYS } = borrowData;

    // Validate user exists and can borrow
    const user = await UserService.findById(userId);
    if (!user || user.status !== 'active') {
      throw new BadRequestError('User not found or inactive');
    }

    // Check borrow limits
    const borrowLimits = await this.checkBorrowLimits(userId);
    if (!borrowLimits.canBorrow) {
      throw new BadRequestError(borrowLimits.reason || 'User cannot borrow books');
    }

    // Validate book exists and is available
    const book = await BookService.findById(bookId);
    if (!book || book.available_stock <= 0 || book.status !== 'available') {
      throw new BadRequestError('Book not found or not available');
    }

    // Check if user already borrowed this book
    const existingBorrow = await BorrowService.findActiveBorrow(userId, bookId);
    if (existingBorrow) {
      throw new ConflictError('User has already borrowed this book');
    }

    // Create borrow record
    const borrow = await prisma.$transaction(async (tx) => {
      const borrowRecord = await BorrowService.create({
        user_id: userId,
        book_id: bookId,
        borrow_days: borrowDays,
        processed_by: operatorUser.id,
        borrow_location: borrowData.borrowLocation || 'Main Library',
        borrow_notes: borrowData.notes
      }, tx);

      return borrowRecord;
    });

    logBusinessOperation({
      operation: 'book_borrowed',
      userId: operatorUser.id,
      details: {
        borrowId: borrow.id,
        userId,
        bookId,
        bookTitle: borrow.book?.title
      }
    });

    return this.formatBorrowResponse(borrow);
  }

  /**
   * Get borrow list
   */
  async getBorrowList(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      userId,
      bookId,
      startDate,
      endDate,
      overdue,
      sortBy = 'borrow_date',
      sortOrder = 'desc'
    } = filters;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      user_id: userId,
      book_id: bookId,
      status,
      overdue_only: overdue === 'true' || overdue === true,
      orderBy: sortBy,
      order: sortOrder.toLowerCase()
    };

    const result = await BorrowService.findWithPagination(options);

    return {
      borrows: result.data.map(borrow => this.formatBorrowResponse(borrow)),
      pagination: result.pagination
    };
  }

  /**
   * Get borrow by ID
   */
  async getBorrowById(borrowId, operatorUser) {
    const borrow = await BorrowService.findById(borrowId);

    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    // Check access permissions
    if (operatorUser.role === USER_ROLES.PATRON && borrow.user_id !== operatorUser.id) {
      throw new UnauthorizedError('Access denied');
    }

    return this.formatBorrowResponse(borrow);
  }

  /**
   * Return book
   */
  async returnBook(borrowId, returnData = {}, operatorUser) {
    const borrow = await BorrowService.findById(borrowId);

    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    if (borrow.status === 'returned') {
      throw new BadRequestError('Book has already been returned');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedBorrow = await BorrowService.returnBook(borrowId, {
        return_date: returnData.returnDate || new Date(),
        condition: returnData.condition,
        return_notes: returnData.notes,
        damage_description: returnData.damageDescription,
        fine_per_day: BORROW_RULES.FINE_PER_DAY,
        waive_fine: returnData.waiveFine
      }, tx);

      // Award points if enabled
      if (BORROW_RULES.POINTS_FOR_RETURN > 0) {
        // This would need PointsService implementation
        // await PointsService.awardPoints(...)
      }

      return updatedBorrow;
    });

    logBusinessOperation({
      operation: 'book_returned',
      userId: operatorUser.id,
      details: {
        borrowId,
        userId: result.user_id,
        bookId: result.book_id,
        overdueDays: result.overdue_days,
        fine: result.fine
      }
    });

    return this.formatBorrowResponse(result);
  }

  /**
   * Renew book
   */
  async renewBook(borrowId, renewalData = {}, operatorUser) {
    const borrow = await BorrowService.findById(borrowId);

    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    // Check permissions
    if (operatorUser.role === USER_ROLES.PATRON && borrow.user_id !== operatorUser.id) {
      throw new UnauthorizedError('Access denied');
    }

    if (borrow.status !== 'borrowed') {
      throw new BadRequestError('Only active borrows can be renewed');
    }

    if (borrow.renewal_count >= borrow.max_renewals) {
      throw new BadRequestError('Maximum renewal limit reached');
    }

    // Check if book is overdue
    if (new Date(borrow.due_date) < new Date()) {
      throw new BadRequestError('Cannot renew overdue books');
    }

    const renewedBorrow = await BorrowService.renewBorrow(
      borrowId, 
      renewalData.additionalDays || BORROW_RULES.DEFAULT_RENEWAL_DAYS
    );

    logBusinessOperation({
      operation: 'book_renewed',
      userId: operatorUser.id,
      details: {
        borrowId,
        userId: borrow.user_id,
        bookId: borrow.book_id,
        newDueDate: renewedBorrow.due_date,
        renewalCount: renewedBorrow.renewal_count
      }
    });

    return this.formatBorrowResponse(renewedBorrow);
  }

  /**
   * Mark book as lost
   */
  async markBookAsLost(borrowId, lostData = {}, operatorUser) {
    const borrow = await BorrowService.findById(borrowId);

    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    if (borrow.status === 'returned') {
      throw new BadRequestError('Cannot mark returned book as lost');
    }

    const updatedBorrow = await BorrowService.markAsLost(borrowId, lostData.notes || '');

    // Apply lost book fine
    if (lostData.applyFine) {
      const book = await BookService.findById(borrow.book_id);
      const fine = book.price || BORROW_RULES.DEFAULT_LOST_BOOK_FINE;
      
      await prisma.borrows.update({
        where: { id: parseInt(borrowId) },
        data: { fine }
      });
    }

    logBusinessOperation({
      operation: 'book_marked_lost',
      userId: operatorUser.id,
      details: {
        borrowId,
        userId: borrow.user_id,
        bookId: borrow.book_id
      }
    });

    return this.formatBorrowResponse(updatedBorrow);
  }

  /**
   * Get overdue records
   */
  async getOverdueRecords(filters = {}) {
    const { limit = 100, daysOverdue = 0 } = filters;

    const borrows = await BorrowService.getOverdueBorrows({
      limit: parseInt(limit),
      daysOverdue: parseInt(daysOverdue)
    });

    return borrows.map(borrow => this.formatBorrowResponse(borrow));
  }

  /**
   * Get overdue records with pagination
   */
  async getOverdueRecordsPaginated(filters = {}) {
    const result = await BorrowService.findWithPagination({
      ...filters,
      overdue_only: true
    });

    return {
      borrows: result.data.map(borrow => this.formatBorrowResponse(borrow)),
      pagination: result.pagination
    };
  }

  /**
   * Get due soon records
   */
  async getDueSoonRecords(filters = {}) {
    const { days = 3, limit = 100 } = filters;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days));

    const borrows = await prisma.borrows.findMany({
      where: {
        status: 'borrowed',
        due_date: {
          gte: new Date(),
          lte: dueDate
        }
      },
      take: parseInt(limit),
      orderBy: { due_date: 'asc' },
      include: {
        borrower: true,
        book: true
      }
    });

    return borrows.map(borrow => this.formatBorrowResponse(borrow));
  }

  /**
   * Get borrow statistics
   */
  async getBorrowStatistics() {
    const stats = await BorrowService.getStatistics({});
    
    // Get additional statistics
    const popularBooks = await BorrowService.getPopularBorrowedBooks(10, 30);
    
    return {
      ...stats,
      popularBooks: popularBooks.map(item => ({
        book: BookService.toSafeJSON(item.book),
        borrowCount: item.borrowCount
      }))
    };
  }

  /**
   * Batch process borrows
   */
  async batchProcessBorrows(borrowIds, action, params, operatorUser) {
    const results = {
      success: [],
      failed: []
    };

    for (const borrowId of borrowIds) {
      try {
        let result;
        
        switch (action) {
          case 'return':
            result = await this.returnBook(borrowId, params, operatorUser);
            break;
          case 'renew':
            result = await this.renewBook(borrowId, params, operatorUser);
            break;
          case 'markLost':
            result = await this.markBookAsLost(borrowId, params, operatorUser);
            break;
          default:
            throw new BadRequestError(`Unknown action: ${action}`);
        }
        
        results.success.push({ borrowId, result });
      } catch (error) {
        results.failed.push({ borrowId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get user borrow history
   */
  async getUserBorrowHistory(userId, filters = {}, operatorUser) {
    // Check permissions
    if (operatorUser.role === USER_ROLES.PATRON && userId !== operatorUser.id) {
      throw new UnauthorizedError('Access denied');
    }

    const result = await BorrowService.getUserBorrowHistory(userId, {
      ...filters,
      includeReviews: true
    });

    return {
      borrows: result.data.map(borrow => this.formatBorrowResponse(borrow)),
      pagination: result.pagination
    };
  }

  /**
   * Check borrow limits
   */
  async checkBorrowLimits(userId) {
    const result = await BorrowService.canUserBorrow(userId, BORROW_RULES.MAX_BORROW_BOOKS);
    
    return {
      canBorrow: result.canBorrow,
      currentBorrows: result.activeBorrows,
      maxBorrows: BORROW_RULES.MAX_BORROW_BOOKS,
      availableSlots: result.remainingQuota,
      unpaidFines: result.unpaidFines,
      reason: !result.canBorrow ? 
        (result.unpaidFines > 0 ? 'User has unpaid fines' : 'User has reached maximum borrow limit') : 
        null
    };
  }

  /**
   * Format borrow response to match existing API
   */
  formatBorrowResponse(borrow) {
    if (!borrow) return null;

    return {
      id: borrow.id,
      userId: borrow.user_id,
      bookId: borrow.book_id,
      borrowDate: borrow.borrow_date,
      dueDate: borrow.due_date,
      returnDate: borrow.return_date,
      actualReturnDate: borrow.actual_return_date,
      status: borrow.status,
      borrowDays: borrow.borrow_days,
      renewalCount: borrow.renewal_count,
      maxRenewals: borrow.max_renewals,
      overdueDays: borrow.overdue_days,
      fine: parseFloat(borrow.fine || 0),
      finePaid: borrow.fine_paid,
      condition: borrow.condition,
      damageDescription: borrow.damage_description,
      returnNotes: borrow.return_notes,
      borrowNotes: borrow.borrow_notes,
      notificationsSent: borrow.notifications_sent,
      pointsEarned: borrow.points_earned,
      processedBy: borrow.processed_by,
      borrowLocation: borrow.borrow_location,
      createdAt: borrow.created_at,
      updatedAt: borrow.updated_at,
      // Relations
      user: borrow.borrower ? UserService.toSafeJSON(borrow.borrower) : undefined,
      book: borrow.book ? BookService.toSafeJSON(borrow.book) : undefined,
      processor: borrow.processor ? UserService.toSafeJSON(borrow.processor) : undefined,
      reviews: borrow.reviews || [],
      // Add safe JSON conversion
      toSafeJSON: () => this.formatBorrowResponse(borrow)
    };
  }
}

module.exports = new BorrowsService();