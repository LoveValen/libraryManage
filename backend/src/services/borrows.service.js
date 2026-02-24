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
    if (!book || book.availableStock <= 0 || book.status !== 'available') {
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
        userId: userId,
        bookId: bookId,
        borrowDays: borrowDays,
        processedBy: operatorUser.id,
        borrowLocation: borrowData.borrowLocation || 'Main Library',
        borrowNotes: borrowData.notes
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
      sortBy = 'borrowDate',
      sortOrder = 'desc'
    } = filters;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      userId: userId,
      bookId: bookId,
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
    if (operatorUser.role === USER_ROLES.PATRON && borrow.userId !== operatorUser.id) {
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
        returnDate: returnData.returnDate || new Date(),
        condition: returnData.condition,
        returnNotes: returnData.notes,
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
        userId: result.userId,
        bookId: result.bookId,
        overdueDays: result.overdueDays,
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
    if (operatorUser.role === USER_ROLES.PATRON && borrow.userId !== operatorUser.id) {
      throw new UnauthorizedError('Access denied');
    }

    if (borrow.status !== 'borrowed') {
      throw new BadRequestError('Only active borrows can be renewed');
    }

    if (borrow.renewalCount >= borrow.maxRenewals) {
      throw new BadRequestError('Maximum renewal limit reached');
    }

    // Check if book is overdue
    if (new Date(borrow.dueDate) < new Date()) {
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
        userId: borrow.userId,
        bookId: borrow.bookId,
        newDueDate: renewedBorrow.dueDate,
        renewalCount: renewedBorrow.renewalCount
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
      const book = await BookService.findById(borrow.bookId);
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
        userId: borrow.userId,
        bookId: borrow.bookId
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
    const {
      page = 1,
      limit = 20,
      keyword = '',
      minOverdueDays = '',
      maxOverdueDays = '',
      sortBy = 'currentOverdueDays',
      sortOrder = 'desc'
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      isDeleted: false,
      status: BORROW_STATUS.BORROWED,
      dueDate: { lt: new Date() }
    };

    // 关键字搜索（用户名、真实姓名、图书标题）
    if (keyword && keyword.trim()) {
      where.OR = [
        {
          borrower: {
            username: { contains: keyword.trim() }
          }
        },
        {
          borrower: {
            realName: { contains: keyword.trim() }
          }
        },
        {
          book: {
            title: { contains: keyword.trim() }
          }
        }
      ];
    }

    // 逾期天数过滤
    const now = new Date();
    if (minOverdueDays !== '' && !isNaN(Number(minOverdueDays))) {
      const minDate = new Date(now);
      minDate.setDate(minDate.getDate() - Number(minOverdueDays));
      where.dueDate = {
        ...where.dueDate,
        lte: minDate
      };
    }

    if (maxOverdueDays !== '' && !isNaN(Number(maxOverdueDays))) {
      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() - Number(maxOverdueDays));
      where.dueDate = {
        ...where.dueDate,
        gte: maxDate
      };
    }

    // 排序字段映射
    const sortMapping = {
      'currentOverdueDays': 'dueDate',
      'borrowDate': 'borrowDate',
      'dueDate': 'dueDate',
      'userName': 'borrower.username',
      'bookTitle': 'book.title'
    };

    let orderBy = {};
    const mappedSortBy = sortMapping[sortBy] || 'dueDate';
    
    if (mappedSortBy.includes('.')) {
      // 处理关联字段排序
      const [relation, field] = mappedSortBy.split('.');
      orderBy = { [relation]: { [field]: sortOrder } };
    } else {
      orderBy = { [mappedSortBy]: sortOrder };
    }

    // 对于currentOverdueDays，我们按dueDate升序排列（最早到期的在前，逾期天数最多）
    if (sortBy === 'currentOverdueDays') {
      orderBy = { dueDate: sortOrder === 'desc' ? 'asc' : 'desc' };
    }

    try {
      const [records, total] = await Promise.all([
        prisma.borrows.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy,
          include: {
            borrower: {
              select: {
                id: true,
                username: true,
                realName: true,
                email: true,
                phone: true
              }
            },
            book: {
              include: {
                bookCategory: true
              }
            },
            processor: {
              select: {
                id: true,
                username: true,
                realName: true
              }
            }
          }
        }),
        prisma.borrows.count({ where })
      ]);

      // 计算逾期天数并添加到记录中
      const recordsWithOverdueDays = records.map(record => {
        const overdueDays = Math.floor((now - new Date(record.dueDate)) / (1000 * 60 * 60 * 24));
        return {
          ...record,
          currentOverdueDays: overdueDays,
          overdue_days: overdueDays // 保持与现有字段的兼容性
        };
      });

      // 获取统计信息
      const statistics = {
        totalOverdueRecords: total,
        totalOverdueDays: recordsWithOverdueDays.reduce((sum, record) => sum + record.currentOverdueDays, 0),
        averageOverdueDays: total > 0 ? recordsWithOverdueDays.reduce((sum, record) => sum + record.currentOverdueDays, 0) / total : 0,
        maxOverdueDays: Math.max(...recordsWithOverdueDays.map(record => record.currentOverdueDays), 0)
      };

      return {
        records: recordsWithOverdueDays.map(record => this.formatBorrowResponse(record)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        },
        statistics
      };
    } catch (error) {
      throw new Error(`获取逾期记录失败: ${error.message}`);
    }
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
        dueDate: {
          gte: new Date(),
          lte: dueDate
        }
      },
      take: parseInt(limit),
      orderBy: { dueDate: 'asc' },
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
      userId: borrow.userId,
      bookId: borrow.bookId,
      borrowDate: borrow.borrowDate,
      dueDate: borrow.dueDate,
      returnDate: borrow.returnDate,
      actualReturnDate: borrow.actualReturnDate,
      status: borrow.status,
      borrowDays: borrow.borrowDays,
      renewalCount: borrow.renewalCount,
      maxRenewals: borrow.maxRenewals,
      overdueDays: borrow.overdueDays,
      currentOverdueDays: borrow.currentOverdueDays || borrow.overdue_days || 0, // 支持新的currentOverdueDays字段
      fine: parseFloat(borrow.fine || 0),
      finePaid: borrow.finePaid,
      condition: borrow.condition,
      damageDescription: borrow.damageDescription,
      returnNotes: borrow.returnNotes,
      borrowNotes: borrow.borrowNotes,
      notificationsSent: borrow.notificationsSent,
      pointsEarned: borrow.pointsEarned,
      processedBy: borrow.processedBy,
      borrowLocation: borrow.borrowLocation,
      createdAt: borrow.createdAt,
      updatedAt: borrow.updatedAt,
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
