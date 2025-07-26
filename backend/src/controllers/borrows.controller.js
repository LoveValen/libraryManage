const borrowsService = require('../services/borrows.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * 借阅控制器
 * 处理所有借阅相关的HTTP请求
 */
class BorrowsController {
  /**
   * 创建借阅记录
   * POST /api/v1/borrows
   */
  createBorrow = asyncHandler(async (req, res) => {
    const borrow = await borrowsService.createBorrow(req.body, req.user);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Book borrowed successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取借阅记录列表
   * GET /api/v1/borrows
   */
  getBorrowList = asyncHandler(async (req, res) => {
    const result = await borrowsService.getBorrowList(req.query);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Borrow records retrieved successfully',
      data: {
        borrows: result.borrows,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取借阅记录详情
   * GET /api/v1/borrows/:id
   */
  getBorrowById = asyncHandler(async (req, res) => {
    const borrow = await borrowsService.getBorrowById(req.params.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Borrow record retrieved successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 归还图书
   * PUT /api/v1/borrows/:id/return
   */
  returnBook = asyncHandler(async (req, res) => {
    const borrow = await borrowsService.returnBook(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book returned successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 续借图书
   * PUT /api/v1/borrows/:id/renew
   */
  renewBook = asyncHandler(async (req, res) => {
    const borrow = await borrowsService.renewBook(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book renewed successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 标记图书为丢失
   * PUT /api/v1/borrows/:id/lost
   */
  markBookAsLost = asyncHandler(async (req, res) => {
    const borrow = await borrowsService.markBookAsLost(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book marked as lost successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取逾期借阅记录
   * GET /api/v1/borrows/overdue
   */
  getOverdueRecords = asyncHandler(async (req, res) => {
    const records = await borrowsService.getOverdueRecords(req.query);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Overdue records retrieved successfully',
      data: {
        overdueRecords: records,
        total: records.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取逾期借阅记录（分页版本）
   * GET /api/v1/borrows/overdue-records
   */
  getOverdueRecordsPaginated = asyncHandler(async (req, res) => {
    const result = await borrowsService.getOverdueRecordsPaginated(req.query);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Overdue records retrieved successfully',
      data: {
        overdueRecords: result.records,
        pagination: result.pagination,
        statistics: result.statistics,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取即将到期的借阅记录
   * GET /api/v1/borrows/due-soon
   */
  getDueSoonRecords = asyncHandler(async (req, res) => {
    const records = await borrowsService.getDueSoonRecords(req.query);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Due soon records retrieved successfully',
      data: {
        dueSoonRecords: records,
        total: records.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取借阅统计信息
   * GET /api/v1/borrows/statistics
   */
  getBorrowStatistics = asyncHandler(async (req, res) => {
    const statistics = await borrowsService.getBorrowStatistics();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Borrow statistics retrieved successfully',
      data: {
        statistics,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 批量处理借阅记录
   * POST /api/v1/borrows/batch
   */
  batchProcessBorrows = asyncHandler(async (req, res) => {
    const { borrowIds, action, params = {} } = req.body;
    
    if (!Array.isArray(borrowIds) || borrowIds.length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Borrow IDs array is required and cannot be empty',
        timestamp: new Date().toISOString(),
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Action is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await borrowsService.batchProcessBorrows(borrowIds, action, params, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Batch operation completed',
      data: {
        batchResult: result,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户借阅历史
   * GET /api/v1/borrows/user/:userId
   */
  getUserBorrowHistory = asyncHandler(async (req, res) => {
    const result = await borrowsService.getUserBorrowHistory(
      req.params.userId,
      req.query,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User borrow history retrieved successfully',
      data: {
        borrows: result.borrows,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取当前用户借阅历史
   * GET /api/v1/borrows/my-history
   */
  getMyBorrowHistory = asyncHandler(async (req, res) => {
    const result = await borrowsService.getUserBorrowHistory(
      req.user.id,
      req.query,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Your borrow history retrieved successfully',
      data: {
        borrows: result.borrows,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 检查用户借阅限制
   * GET /api/v1/borrows/limits/:userId
   */
  checkBorrowLimits = asyncHandler(async (req, res) => {
    const limits = await borrowsService.checkBorrowLimits(req.params.userId);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Borrow limits checked successfully',
      data: {
        limits,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取当前用户借阅限制
   * GET /api/v1/borrows/my-limits
   */
  getMyBorrowLimits = asyncHandler(async (req, res) => {
    const limits = await borrowsService.checkBorrowLimits(req.user.id);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Your borrow limits checked successfully',
      data: {
        limits,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 快速借阅（通过扫码等）
   * POST /api/v1/borrows/quick-borrow
   */
  quickBorrow = asyncHandler(async (req, res) => {
    const { userIdentifier, bookIdentifier } = req.body;
    
    if (!userIdentifier || !bookIdentifier) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'User identifier and book identifier are required',
        timestamp: new Date().toISOString(),
      });
    }

    // 根据标识符查找用户和图书
    const UserService = require('../services/user.service');
    const BookService = require('../services/book.service');
    
    const user = await UserService.findByIdentifier(userIdentifier);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
    }

    let book;
    // 尝试通过ISBN或ID查找图书
    if (/^\d+$/.test(bookIdentifier)) {
      book = await BookService.findById(parseInt(bookIdentifier));
    } else {
      book = await BookService.findByISBN(bookIdentifier);
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Book not found',
        timestamp: new Date().toISOString(),
      });
    }

    const borrow = await borrowsService.createBorrow({
      userId: user.id,
      bookId: book.id,
    }, req.user);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Quick borrow completed successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 快速归还（通过扫码等）
   * POST /api/v1/borrows/quick-return
   */
  quickReturn = asyncHandler(async (req, res) => {
    const { bookIdentifier, condition = 'good', notes = '' } = req.body;
    
    if (!bookIdentifier) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Book identifier is required',
        timestamp: new Date().toISOString(),
      });
    }

    const BookService = require('../services/book.service');
    const BorrowService = require('../services/borrow.service');
    
    let book;
    // 尝试通过ISBN或ID查找图书
    if (/^\d+$/.test(bookIdentifier)) {
      book = await BookService.findById(parseInt(bookIdentifier));
    } else {
      book = await BookService.findByISBN(bookIdentifier);
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Book not found',
        timestamp: new Date().toISOString(),
      });
    }

    // 查找该图书的活跃借阅记录
    const activeBorrow = await BorrowService.findOne({
      where: {
        book_id: book.id,
        status: { in: ['borrowed', 'overdue'] },
        is_deleted: false
      },
      include: {
        borrower: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      }
    });

    if (!activeBorrow) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'No active borrow record found for this book',
        timestamp: new Date().toISOString(),
      });
    }

    const borrow = await borrowsService.returnBook(activeBorrow.id, {
      condition,
      notes,
    }, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Quick return completed successfully',
      data: {
        borrow,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取借阅趋势数据
   * GET /api/v1/borrows/trends
   */
  getBorrowTrends = asyncHandler(async (req, res) => {
    const { period = '30d', type = 'daily' } = req.query;
    
    const prisma = require('../utils/prisma');
    
    let dateRange;
    
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateRange = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get borrow trends grouped by date
    const borrowTrends = await prisma.borrows.groupBy({
      by: ['borrow_date'],
      where: {
        borrow_date: {
          gte: dateRange,
        },
        is_deleted: false,
      },
      _count: true,
      orderBy: {
        borrow_date: 'asc'
      }
    });

    // Get return trends grouped by date
    const returnTrends = await prisma.borrows.groupBy({
      by: ['return_date'],
      where: {
        return_date: {
          gte: dateRange,
        },
        is_deleted: false,
      },
      _count: true,
      orderBy: {
        return_date: 'asc'
      }
    });
    
    // Format the results
    const formattedBorrowTrends = borrowTrends.map(item => ({
      count: item._count,
      period: item.borrow_date ? new Date(item.borrow_date).toISOString().split('T')[0] : null
    })).filter(item => item.period);
    
    const formattedReturnTrends = returnTrends.map(item => ({
      count: item._count,
      period: item.return_date ? new Date(item.return_date).toISOString().split('T')[0] : null
    })).filter(item => item.period);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Borrow trends retrieved successfully',
      data: {
        borrowTrends: formattedBorrowTrends,
        returnTrends: formattedReturnTrends,
        period,
        type,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new BorrowsController();