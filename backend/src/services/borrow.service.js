const prisma = require('../utils/prisma');
const BookService = require('./book.service');
const { BORROW_STATUS } = require('../utils/constants');

class BorrowService {
  /**
   * Find borrows with pagination and filters
   */
  static async findWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      user_id,
      book_id,
      status,
      overdue_only = false,
      orderBy = 'borrow_date',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (user_id) where.user_id = parseInt(user_id);
    if (book_id) where.book_id = parseInt(book_id);
    if (status) where.status = status;
    
    if (overdue_only) {
      where.status = 'borrowed';
      where.due_date = { lt: new Date() };
    }

    const [borrows, total] = await Promise.all([
      prisma.borrows.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          borrower: true,
          book: {
            include: {
              bookCategory: true
            }
          },
          processor: true
        }
      }),
      prisma.borrows.count({ where })
    ]);

    return {
      data: borrows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find borrow by ID
   */
  static async findById(id, includeRelations = true) {
    const include = includeRelations ? {
      borrower: true,
      book: {
        include: {
          bookCategory: true
        }
      },
      processor: true,
      reviews: true
    } : undefined;

    return prisma.borrows.findUnique({
      where: { id: parseInt(id) },
      include
    });
  }

  /**
   * Find active borrow for user and book
   */
  static async findActiveBorrow(userId, bookId) {
    return prisma.borrows.findFirst({
      where: {
        user_id: parseInt(userId),
        book_id: parseInt(bookId),
        status: { in: ['borrowed', 'overdue'] }
      }
    });
  }

  /**
   * Find one borrow based on conditions
   */
  static async findOne(options = {}) {
    const { where, include } = options;
    return prisma.borrows.findFirst({
      where,
      include
    });
  }

  /**
   * Create a new borrow
   */
  static async create(borrowData, transaction = null) {
    const client = transaction || prisma;
    
    // Check if user already has this book borrowed
    const existingBorrow = await this.findActiveBorrow(borrowData.user_id, borrowData.book_id);
    if (existingBorrow) {
      throw new Error('User already has an active borrow for this book');
    }

    // Check book availability
    const book = await BookService.findById(borrowData.book_id);
    if (!book || book.available_stock <= 0) {
      throw new Error('Book is not available for borrowing');
    }

    // Calculate due date if not provided
    const borrowDays = borrowData.borrow_days || 30;
    const borrowDate = borrowData.borrow_date || new Date();
    const dueDate = borrowData.due_date || new Date(borrowDate.getTime() + borrowDays * 24 * 60 * 60 * 1000);

    const borrow = await client.borrows.create({
      data: {
        ...borrowData,
        borrow_date: borrowDate,
        due_date: dueDate,
        borrow_days: borrowDays,
        status: 'borrowed',
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        borrower: true,
        book: true
      }
    });

    // Update book stock
    await BookService.updateStock(borrowData.book_id, -1, client);

    return borrow;
  }

  /**
   * Return a book
   */
  static async returnBook(borrowId, returnData = {}, transaction = null) {
    const client = transaction || prisma;
    
    const borrow = await this.findById(borrowId);
    if (!borrow) {
      throw new Error('Borrow record not found');
    }

    if (borrow.status === 'returned') {
      throw new Error('Book has already been returned');
    }

    const returnDate = returnData.return_date || new Date();
    const overdueDays = Math.max(0, Math.floor((returnDate - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24)));

    const updateData = {
      status: 'returned',
      return_date: returnDate,
      actual_return_date: returnDate,
      overdue_days: overdueDays,
      condition: returnData.condition || 'good',
      return_notes: returnData.return_notes,
      updated_at: new Date()
    };

    // Calculate fine if overdue
    if (overdueDays > 0 && !returnData.waive_fine) {
      updateData.fine = overdueDays * (returnData.fine_per_day || 1.00);
    }

    const updatedBorrow = await client.borrows.update({
      where: { id: parseInt(borrowId) },
      data: updateData,
      include: {
        borrower: true,
        book: true
      }
    });

    // Update book stock
    await BookService.updateStock(borrow.book_id, 1, client);

    return updatedBorrow;
  }

  /**
   * Renew a borrow
   */
  static async renewBorrow(borrowId, additionalDays = 30) {
    const borrow = await this.findById(borrowId);
    if (!borrow) {
      throw new Error('Borrow record not found');
    }

    if (borrow.status !== 'borrowed') {
      throw new Error('Only active borrows can be renewed');
    }

    if (borrow.renewal_count >= borrow.max_renewals) {
      throw new Error('Maximum renewal limit reached');
    }

    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + additionalDays);

    return prisma.borrows.update({
      where: { id: parseInt(borrowId) },
      data: {
        due_date: newDueDate,
        renewal_count: { increment: 1 },
        updated_at: new Date()
      },
      include: {
        borrower: true,
        book: true
      }
    });
  }

  /**
   * Get user's borrow history
   */
  static async getUserBorrowHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      includeReviews = false
    } = options;

    const where = { user_id: parseInt(userId) };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [borrows, total] = await Promise.all([
      prisma.borrows.findMany({
        where,
        skip,
        take: limit,
        orderBy: { borrow_date: 'desc' },
        include: {
          book: {
            include: {
              bookCategory: true
            }
          },
          reviews: includeReviews
        }
      }),
      prisma.borrows.count({ where })
    ]);

    return {
      data: borrows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get overdue borrows
   */
  static async getOverdueBorrows(options = {}) {
    const { limit = 100, daysOverdue = 0 } = options;

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - daysOverdue);

    return prisma.borrows.findMany({
      where: {
        status: 'borrowed',
        due_date: { lt: overdueDate }
      },
      take: limit,
      orderBy: { due_date: 'asc' },
      include: {
        borrower: true,
        book: true
      }
    });
  }

  /**
   * Update overdue status
   */
  static async updateOverdueStatus() {
    const now = new Date();
    
    const updated = await prisma.borrows.updateMany({
      where: {
        status: 'borrowed',
        due_date: { lt: now }
      },
      data: {
        status: 'overdue',
        updated_at: now
      }
    });

    return updated.count;
  }

  /**
   * Get borrow statistics
   */
  static async getStatistics(options = {}) {
    const { startDate, endDate } = options;

    const where = {};
    if (startDate || endDate) {
      where.borrow_date = {};
      if (startDate) where.borrow_date.gte = startDate;
      if (endDate) where.borrow_date.lte = endDate;
    }

    const [total, active, overdue, returned] = await Promise.all([
      prisma.borrows.count({ where }),
      prisma.borrows.count({ 
        where: { ...where, status: 'borrowed' } 
      }),
      prisma.borrows.count({ 
        where: { ...where, status: 'overdue' } 
      }),
      prisma.borrows.count({ 
        where: { ...where, status: 'returned' } 
      })
    ]);

    // Calculate average borrow duration
    const completedBorrows = await prisma.borrows.findMany({
      where: {
        ...where,
        status: 'returned',
        actual_return_date: { not: null }
      },
      select: {
        borrow_date: true,
        actual_return_date: true
      }
    });

    let avgDuration = 0;
    if (completedBorrows.length > 0) {
      const totalDays = completedBorrows.reduce((sum, borrow) => {
        const days = Math.floor((new Date(borrow.actual_return_date) - new Date(borrow.borrow_date)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgDuration = Math.round(totalDays / completedBorrows.length);
    }

    return {
      total,
      active,
      overdue,
      returned,
      lost: await prisma.borrows.count({ where: { ...where, status: 'lost' } }),
      damaged: await prisma.borrows.count({ where: { ...where, status: 'damaged' } }),
      averageBorrowDuration: avgDuration,
      overdueRate: total > 0 ? ((overdue / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get popular borrowed books
   */
  static async getPopularBorrowedBooks(limit = 10, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const borrows = await prisma.borrows.groupBy({
      by: ['book_id'],
      where: {
        borrow_date: { gte: startDate }
      },
      _count: {
        book_id: true
      },
      orderBy: {
        _count: {
          book_id: 'desc'
        }
      },
      take: limit
    });

    // Get book details
    const bookIds = borrows.map(b => b.book_id);
    const books = await prisma.books.findMany({
      where: {
        id: { in: bookIds }
      },
      include: {
        bookCategory: true
      }
    });

    // Map counts to books
    const bookMap = books.reduce((map, book) => {
      map[book.id] = book;
      return map;
    }, {});

    return borrows.map(borrow => ({
      book: bookMap[borrow.book_id],
      borrowCount: borrow._count.book_id
    })).filter(item => item.book);
  }

  /**
   * Mark borrow as lost
   */
  static async markAsLost(borrowId, notes = '') {
    return prisma.borrows.update({
      where: { id: parseInt(borrowId) },
      data: {
        status: 'lost',
        return_notes: notes,
        updated_at: new Date()
      }
    });
  }

  /**
   * Mark borrow as damaged
   */
  static async markAsDamaged(borrowId, damageDescription, fine = 0) {
    return prisma.borrows.update({
      where: { id: parseInt(borrowId) },
      data: {
        status: 'damaged',
        condition: 'damaged',
        damage_description: damageDescription,
        fine,
        updated_at: new Date()
      }
    });
  }

  /**
   * Pay fine
   */
  static async payFine(borrowId, amount) {
    const borrow = await this.findById(borrowId);
    if (!borrow || !borrow.fine) {
      throw new Error('No fine to pay for this borrow');
    }

    if (amount < borrow.fine) {
      throw new Error('Payment amount is less than fine amount');
    }

    return prisma.borrows.update({
      where: { id: parseInt(borrowId) },
      data: {
        fine_paid: true,
        updated_at: new Date()
      }
    });
  }

  /**
   * Check if user can borrow
   */
  static async canUserBorrow(userId, maxBorrows = 5) {
    const activeBorrows = await prisma.borrows.count({
      where: {
        user_id: parseInt(userId),
        status: { in: ['borrowed', 'overdue'] }
      }
    });

    const unpaidFines = await prisma.borrows.count({
      where: {
        user_id: parseInt(userId),
        fine: { gt: 0 },
        fine_paid: false
      }
    });

    return {
      canBorrow: activeBorrows < maxBorrows && unpaidFines === 0,
      activeBorrows,
      unpaidFines,
      remainingQuota: Math.max(0, maxBorrows - activeBorrows)
    };
  }

  /**
   * Batch create borrows
   */
  static async batchCreate(borrowsData) {
    return prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const data of borrowsData) {
        try {
          const borrow = await this.create(data, tx);
          results.push({ success: true, borrow });
        } catch (error) {
          results.push({ success: false, error: error.message, data });
        }
      }
      
      return results;
    });
  }
}

module.exports = BorrowService;