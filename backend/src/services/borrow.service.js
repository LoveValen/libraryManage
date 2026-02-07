const prisma = require('../utils/prisma');
const BookService = require('./book.service');
const { BORROW_STATUS } = require('../utils/constants');

/**
 * Borrow Service - 借阅管理服务
 * 提供图书借阅、归还、续借、罚金等功能
 */
class BorrowService {
  // 默认配置
  static DEFAULT_BORROW_DAYS = 30;
  static DEFAULT_MAX_BORROWS = 5;
  static DEFAULT_FINE_PER_DAY = 1.0;
  /**
   * 获取分页借阅记录
   * @param {Object} options 查询选项
   * @param {number} [options.page=1] 页码
   * @param {number} [options.limit=20] 每页数量
   * @param {number} [options.userId] 用户 ID
   * @param {number} [options.bookId] 图书 ID
   * @param {string} [options.status] 借阅状态
   * @param {boolean} [options.overdue_only=false] 只显示逾期记录
   * @param {string} [options.orderBy='borrowDate'] 排序字段
   * @param {string} [options.order='desc'] 排序方向
   * @returns {Promise<Object>} 分页结果
   */
  static async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        userId,
        bookId,
        status,
        overdue_only = false,
        orderBy = 'borrowDate',
        order = 'desc'
      } = options;

      const skip = (Number(page) - 1) * Number(limit);
      const where = { isDeleted: false };

      // 添加过滤条件
      if (userId && !isNaN(Number(userId))) {
        where.userId = Number(userId);
      }
      if (bookId && !isNaN(Number(bookId))) {
        where.bookId = Number(bookId);
      }
      if (status) {
        where.status = status;
      }

      // 只显示逾期记录
      if (overdue_only) {
        where.status = BORROW_STATUS.BORROWED;
        where.dueDate = { lt: new Date() };
      }

      const [borrows, total] = await Promise.all([
        prisma.borrows.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { [orderBy]: order },
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

      return {
        data: borrows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      };
    } catch (error) {
      throw new Error(`获取借阅记录列表失败: ${error.message}`);
    }
  }

  /**
   * 根据 ID 获取借阅记录
   * @param {number} id 借阅记录 ID
   * @param {boolean} includeRelations 是否包含关联数据
   * @returns {Promise<Object|null>} 借阅记录
   */
  static async findById(id, includeRelations = true) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的借阅记录 ID');
      }

      const include = includeRelations ? {
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
        },
        reviews: {
          where: {
            deletedAt: null
          }
        }
      } : undefined;

      return await prisma.borrows.findUnique({
        where: {
          id: Number(id),
          isDeleted: false
        },
        include
      });
    } catch (error) {
      throw new Error(`获取借阅记录失败: ${error.message}`);
    }
  }

  /**
   * 查找用户和图书的活跃借阅记录
   * @param {number} userId 用户 ID
   * @param {number} bookId 图书 ID
   * @returns {Promise<Object|null>} 活跃借阅记录
   */
  static async findActiveBorrow(userId, bookId) {
    try {
      if (!userId || isNaN(Number(userId))) {
        throw new Error('无效的用户 ID');
      }
      if (!bookId || isNaN(Number(bookId))) {
        throw new Error('无效的图书 ID');
      }

      return await prisma.borrows.findFirst({
        where: {
          userId: Number(userId),
          bookId: Number(bookId),
          status: { in: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE] },
          isDeleted: false
        }
      });
    } catch (error) {
      throw new Error(`查找活跃借阅记录失败: ${error.message}`);
    }
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
   * 创建新的借阅记录
   * @param {Object} borrowData 借阅数据
   * @param {number} borrowData.userId 用户 ID
   * @param {number} borrowData.bookId 图书 ID
   * @param {number} [borrowData.processorId] 处理人 ID
   * @param {number} [borrowData.borrow_days] 借阅天数
   * @param {Date} [borrowData.borrowDate] 借阅日期
   * @param {Object} [transaction] 事务对象
   * @returns {Promise<Object>} 创建的借阅记录
   */
  static async create(borrowData, transaction = null) {
    try {
      // 验证必要字段
      if (!borrowData?.userId || isNaN(Number(borrowData.userId))) {
        throw new Error('无效的用户 ID');
      }
      if (!borrowData?.bookId || isNaN(Number(borrowData.bookId))) {
        throw new Error('无效的图书 ID');
      }

      const client = transaction || prisma;
      
      // 检查用户是否已经借阅了该图书
      const existingBorrow = await this.findActiveBorrow(borrowData.userId, borrowData.bookId);
      if (existingBorrow) {
        throw new Error('用户已经借阅了该图书');
      }

      // 检查用户是否可以借阅
      const borrowPermission = await this.canUserBorrow(borrowData.userId);
      if (!borrowPermission.canBorrow) {
        if (borrowPermission.unpaidFines > 0) {
          throw new Error('用户有未付罚金，无法借阅');
        }
        if (borrowPermission.activeBorrows >= this.DEFAULT_MAX_BORROWS) {
          throw new Error(`用户已达到最大借阅数量限制 (${this.DEFAULT_MAX_BORROWS})`);
        }
      }

      // 检查图书可用性
      const book = await BookService.findById(borrowData.bookId, false);
      if (!book) {
        throw new Error('图书不存在');
      }
      if (book.availableStock <= 0) {
        throw new Error('图书库存不足，无法借阅');
      }

      // 计算借阅参数
      const borrowDays = borrowData.borrow_days || this.DEFAULT_BORROW_DAYS;
      const borrowDate = borrowData.borrowDate || new Date();
      const dueDate = borrowData.dueDate || new Date(borrowDate.getTime() + borrowDays * 24 * 60 * 60 * 1000);

      // 创建借阅记录
      const borrow = await client.borrows.create({
        data: {
          userId: Number(borrowData.userId),
          bookId: Number(borrowData.bookId),
          processedBy: borrowData.processorId ? Number(borrowData.processorId) : null,
          borrowDate: borrowDate,
          dueDate: dueDate,
          borrowDays: borrowDays,
          status: BORROW_STATUS.BORROWED,
          maxRenewals: borrowData.maxRenewals || 2,
          renewalCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          borrower: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true
            }
          },
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              coverImage: true
            }
          }
        }
      });

      // 更新图书库存
      await BookService.updateStock(borrowData.bookId, -1, client);

      return borrow;
    } catch (error) {
      throw new Error(`创建借阅记录失败: ${error.message}`);
    }
  }

  /**
   * 归还图书
   * @param {number} borrowId 借阅记录 ID
   * @param {Object} [returnData] 归还数据
   * @param {Date} [returnData.returnDate] 归还日期
   * @param {string} [returnData.condition] 图书状态
   * @param {string} [returnData.returnNotes] 归还备注
   * @param {boolean} [returnData.waive_fine] 是否免除罚金
   * @param {number} [returnData.fine_per_day] 每日罚金
   * @param {Object} [transaction] 事务对象
   * @returns {Promise<Object>} 更新后的借阅记录
   */
  static async returnBook(borrowId, returnData = {}, transaction = null) {
    try {
      if (!borrowId || isNaN(Number(borrowId))) {
        throw new Error('无效的借阅记录 ID');
      }

      const client = transaction || prisma;
      
      const borrow = await this.findById(borrowId);
      if (!borrow) {
        throw new Error('借阅记录不存在');
      }

      if (borrow.status === BORROW_STATUS.RETURNED) {
        throw new Error('图书已经归还');
      }

      if (![BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE].includes(borrow.status)) {
        throw new Error('只有已借阅或逾期的图书可以归还');
      }

      const returnDate = returnData.returnDate || new Date();
      const overdueDays = Math.max(0, Math.floor((returnDate - new Date(borrow.dueDate)) / (1000 * 60 * 60 * 24)));

      const updateData = {
        status: BORROW_STATUS.RETURNED,
        returnDate: returnDate,
        actualReturnDate: returnDate,
        overdueDays: overdueDays,
        condition: returnData.condition || 'good',
        returnNotes: returnData.returnNotes || null,
        processedBy: returnData.processorId ? Number(returnData.processorId) : null,
        updatedAt: new Date()
      };

      // 计算罚金（如果逾期）
      if (overdueDays > 0 && !returnData.waive_fine) {
        const finePerDay = returnData.fine_per_day || this.DEFAULT_FINE_PER_DAY;
        updateData.fine = Number((overdueDays * finePerDay).toFixed(2));
        updateData.finePaid = false;
      }

      const updatedBorrow = await client.borrows.update({
        where: { id: Number(borrowId) },
        data: updateData,
        include: {
          borrower: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true
            }
          },
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              coverImage: true
            }
          }
        }
      });

      // 更新图书库存
      await BookService.updateStock(borrow.bookId, 1, client);

      return updatedBorrow;
    } catch (error) {
      throw new Error(`归还图书失败: ${error.message}`);
    }
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

    if (borrow.renewalCount >= borrow.maxRenewals) {
      throw new Error('Maximum renewal limit reached');
    }

    const newDueDate = new Date(borrow.dueDate);
    newDueDate.setDate(newDueDate.getDate() + additionalDays);

    return prisma.borrows.update({
      where: { id: parseInt(borrowId) },
      data: {
        dueDate: newDueDate,
        renewalCount: { increment: 1 },
        updatedAt: new Date()
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

    const where = { userId: parseInt(userId) };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [borrows, total] = await Promise.all([
      prisma.borrows.findMany({
        where,
        skip,
        take: limit,
        orderBy: { borrowDate: 'desc' },
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
        dueDate: { lt: overdueDate }
      },
      take: limit,
      orderBy: { dueDate: 'asc' },
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
        dueDate: { lt: now }
      },
      data: {
        status: 'overdue',
        updatedAt: now
      }
    });

    return updated.count;
  }

  /**
   * 获取借阅统计数据
   * @param {Object} [options] 统计选项
   * @param {Date} [options.startDate] 开始日期
   * @param {Date} [options.endDate] 结束日期
   * @returns {Promise<Object>} 统计数据
   */
  static async getStatistics(options = {}) {
    try {
      const { startDate, endDate } = options;

      const where = { isDeleted: false };
      if (startDate || endDate) {
        where.borrowDate = {};
        if (startDate) where.borrowDate.gte = new Date(startDate);
        if (endDate) where.borrowDate.lte = new Date(endDate);
      }

      const [total, active, overdue, returned, lost, damaged] = await Promise.all([
        prisma.borrows.count({ where }),
        prisma.borrows.count({ 
          where: { ...where, status: BORROW_STATUS.BORROWED } 
        }),
        prisma.borrows.count({ 
          where: { ...where, status: BORROW_STATUS.OVERDUE } 
        }),
        prisma.borrows.count({ 
          where: { ...where, status: BORROW_STATUS.RETURNED } 
        }),
        prisma.borrows.count({ 
          where: { ...where, status: BORROW_STATUS.LOST } 
        }),
        prisma.borrows.count({ 
          where: { ...where, status: BORROW_STATUS.DAMAGED } 
        })
      ]);

      // 计算平均借阅时长
      const completedBorrows = await prisma.borrows.findMany({
        where: {
          ...where,
          status: BORROW_STATUS.RETURNED,
          actualReturnDate: { not: null }
        },
        select: {
          borrowDate: true,
          actualReturnDate: true
        }
      });

      let avgDuration = 0;
      if (completedBorrows.length > 0) {
        const totalDays = completedBorrows.reduce((sum, borrow) => {
          const days = Math.floor((new Date(borrow.actualReturnDate) - new Date(borrow.borrowDate)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        avgDuration = Math.round(totalDays / completedBorrows.length);
      }

      // 计算罚金统计
      const fineStats = await prisma.borrows.aggregate({
        where: {
          ...where,
          fine: { gt: 0 }
        },
        _sum: {
          fine: true
        },
        _count: {
          fine: true
        }
      });

      const overdueRate = total > 0 ? Number(((overdue / total) * 100).toFixed(2)) : 0;
      const returnRate = total > 0 ? Number(((returned / total) * 100).toFixed(2)) : 0;

      return {
        total,
        active,
        overdue,
        returned,
        lost,
        damaged,
        averageBorrowDuration: avgDuration,
        overdueRate,
        returnRate,
        totalFineAmount: Number(fineStats._sum.fine || 0),
        finesCount: fineStats._count.fine || 0
      };
    } catch (error) {
      throw new Error(`获取借阅统计数据失败: ${error.message}`);
    }
  }

  /**
   * Get popular borrowed books
   */
  static async getPopularBorrowedBooks(limit = 10, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const borrows = await prisma.borrows.groupBy({
      by: ['bookId'],
      where: {
        borrowDate: { gte: startDate }
      },
      _count: {
        bookId: true
      },
      orderBy: {
        _count: {
          bookId: 'desc'
        }
      },
      take: limit
    });

    // Get book details
    const bookIds = borrows.map(b => b.bookId);
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
      book: bookMap[borrow.bookId],
      borrowCount: borrow._count.bookId
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
        returnNotes: notes,
        updatedAt: new Date()
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
        damageDescription: damageDescription,
        fine,
        updatedAt: new Date()
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
        finePaid: true,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 检查用户是否可以借阅图书
   * @param {number} userId 用户 ID
   * @param {number} [maxBorrows] 最大借阅数量
   * @returns {Promise<Object>} 借阅权限检查结果
   */
  static async canUserBorrow(userId, maxBorrows = null) {
    try {
      if (!userId || isNaN(Number(userId))) {
        throw new Error('无效的用户 ID');
      }

      const maxBorrowLimit = maxBorrows || this.DEFAULT_MAX_BORROWS;

      const [activeBorrows, unpaidFines, totalFineAmount] = await Promise.all([
        prisma.borrows.count({
          where: {
            userId: Number(userId),
            status: { in: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE] },
            isDeleted: false
          }
        }),
        prisma.borrows.count({
          where: {
            userId: Number(userId),
            fine: { gt: 0 },
            finePaid: false,
            isDeleted: false
          }
        }),
        prisma.borrows.aggregate({
          where: {
            userId: Number(userId),
            fine: { gt: 0 },
            finePaid: false,
            isDeleted: false
          },
          _sum: {
            fine: true
          }
        })
      ]);

      const canBorrow = activeBorrows < maxBorrowLimit && unpaidFines === 0;
      const remainingQuota = Math.max(0, maxBorrowLimit - activeBorrows);

      return {
        canBorrow,
        activeBorrows,
        unpaidFines,
        totalFineAmount: Number(totalFineAmount._sum.fine || 0),
        remainingQuota,
        maxBorrowLimit,
        reason: !canBorrow ? (
          unpaidFines > 0 ? '存在未付罚金' : '已达到最大借阅限制'
        ) : null
      };
    } catch (error) {
      throw new Error(`检查用户借阅权限失败: ${error.message}`);
    }
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