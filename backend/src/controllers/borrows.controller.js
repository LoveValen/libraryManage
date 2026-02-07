const borrowsService = require('../services/borrows.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, successJson, error, notFound } = require('../utils/response');

/**
 * 借阅控制器 - 处理图书借阅、归还、续借等操作
 */

/**
 * 创建借阅记录
 */
const createBorrow = asyncHandler(async (req, res) => {
  const borrow = await borrowsService.createBorrow(req.body, req.user);
  success(res, borrow, '图书借阅成功', 201);
});

/**
 * 获取借阅记录列表
 */
const getBorrowList = asyncHandler(async (req, res) => {
  const result = await borrowsService.getBorrowList(req.query);

  successWithPagination(
    res,
    result.borrows,
    result.pagination,
    '获取借阅记录成功'
  );
});

/**
 * 获取借阅记录详情
 */
const getBorrowById = asyncHandler(async (req, res) => {
  const borrow = await borrowsService.getBorrowById(req.params.id, req.user);
  success(res, borrow, '获取借阅记录详情成功');
});

/**
 * 归还图书
 * PUT /api/v1/borrows/:id/return
 */
const returnBook = asyncHandler(async (req, res) => {
  const borrow = await borrowsService.returnBook(req.params.id, req.body, req.user);
  successJson(res, { borrow }, 'Book returned successfully');
});

/**
 * 续借图书
 * PUT /api/v1/borrows/:id/renew
 */
const renewBook = asyncHandler(async (req, res) => {
  const borrow = await borrowsService.renewBook(req.params.id, req.body, req.user);
  successJson(res, { borrow }, 'Book renewed successfully');
});

/**
 * 标记图书为丢失
 * PUT /api/v1/borrows/:id/lost
 */
const markBookAsLost = asyncHandler(async (req, res) => {
  const borrow = await borrowsService.markBookAsLost(req.params.id, req.body, req.user);
  successJson(res, { borrow }, 'Book marked as lost successfully');
});

/**
 * 获取逾期借阅记录
 * GET /api/v1/borrows/overdue
 */
const getOverdueRecords = asyncHandler(async (req, res) => {
  const records = await borrowsService.getOverdueRecords(req.query);

  successJson(res, {
    overdueRecords: records,
    total: records.length,
  }, 'Overdue records retrieved successfully');
});

/**
 * 获取逾期借阅记录（分页版本）
 * GET /api/v1/borrows/overdue-records
 */
const getOverdueRecordsPaginated = asyncHandler(async (req, res) => {
  const result = await borrowsService.getOverdueRecordsPaginated(req.query);

  successWithPagination(
    res,
    result.records,
    result.pagination,
    'Overdue records retrieved successfully'
  );
});

/**
 * 获取即将到期的借阅记录
 * GET /api/v1/borrows/due-soon
 */
const getDueSoonRecords = asyncHandler(async (req, res) => {
  const records = await borrowsService.getDueSoonRecords(req.query);

  successJson(res, {
    dueSoonRecords: records,
    total: records.length,
  }, 'Due soon records retrieved successfully');
});

/**
 * 获取借阅统计信息
 * GET /api/v1/borrows/statistics
 */
const getBorrowStatistics = asyncHandler(async (req, res) => {
  const statistics = await borrowsService.getBorrowStatistics();
  successJson(res, { statistics }, 'Borrow statistics retrieved successfully');
});

/**
 * 批量处理借阅记录
 * POST /api/v1/borrows/batch
 */
const batchProcessBorrows = asyncHandler(async (req, res) => {
  const { borrowIds, action, params = {} } = req.body;

  if (!Array.isArray(borrowIds) || borrowIds.length === 0) {
    return error(res, 'Borrow IDs array is required and cannot be empty', 400);
  }

  if (!action) {
    return error(res, 'Action is required', 400);
  }

  const result = await borrowsService.batchProcessBorrows(borrowIds, action, params, req.user);
  successJson(res, { batchResult: result }, 'Batch operation completed');
});

/**
 * 获取用户借阅历史
 * GET /api/v1/borrows/user/:userId
 */
const getUserBorrowHistory = asyncHandler(async (req, res) => {
  const result = await borrowsService.getUserBorrowHistory(
    req.params.userId,
    req.query,
    req.user
  );

  successWithPagination(
    res,
    result.borrows,
    result.pagination,
    'User borrow history retrieved successfully'
  );
});

/**
 * 获取当前用户借阅历史
 * GET /api/v1/borrows/my-history
 */
const getMyBorrowHistory = asyncHandler(async (req, res) => {
  const result = await borrowsService.getUserBorrowHistory(
    req.user.id,
    req.query,
    req.user
  );

  successWithPagination(
    res,
    result.borrows,
    result.pagination,
    'Your borrow history retrieved successfully'
  );
});

/**
 * 检查用户借阅限制
 * GET /api/v1/borrows/limits/:userId
 */
const checkBorrowLimits = asyncHandler(async (req, res) => {
  const limits = await borrowsService.checkBorrowLimits(req.params.userId);
  successJson(res, { limits }, 'Borrow limits checked successfully');
});

/**
 * 获取当前用户借阅限制
 * GET /api/v1/borrows/my-limits
 */
const getMyBorrowLimits = asyncHandler(async (req, res) => {
  const limits = await borrowsService.checkBorrowLimits(req.user.id);
  successJson(res, { limits }, 'Your borrow limits checked successfully');
});

/**
 * 快速借阅（通过扫码等）
 * POST /api/v1/borrows/quick-borrow
 */
const quickBorrow = asyncHandler(async (req, res) => {
  const { userIdentifier, bookIdentifier } = req.body;

  if (!userIdentifier || !bookIdentifier) {
    return error(res, 'User identifier and book identifier are required', 400);
  }

  // 根据标识符查找用户和图书
  const UserService = require('../services/user.service');
  const BookService = require('../services/book.service');

  const user = await UserService.findByIdentifier(userIdentifier);
  if (!user) {
    return notFound(res, 'User not found');
  }

  let book;
  // 尝试通过ISBN或ID查找图书
  if (/^\d+$/.test(bookIdentifier)) {
    book = await BookService.findById(parseInt(bookIdentifier));
  } else {
    book = await BookService.findByISBN(bookIdentifier);
  }

  if (!book) {
    return notFound(res, 'Book not found');
  }

  const borrow = await borrowsService.createBorrow({
    userId: user.id,
    bookId: book.id,
  }, req.user);

  successJson(res, { borrow }, 'Quick borrow completed successfully', 201);
});

/**
 * 快速归还（通过扫码等）
 * POST /api/v1/borrows/quick-return
 */
const quickReturn = asyncHandler(async (req, res) => {
  const { bookIdentifier, condition = 'good', notes = '' } = req.body;

  if (!bookIdentifier) {
    return error(res, 'Book identifier is required', 400);
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
    return notFound(res, 'Book not found');
  }

  // 查找该图书的活跃借阅记录
  const activeBorrow = await BorrowService.findOne({
    where: {
      bookId: book.id,
      status: { in: ['borrowed', 'overdue'] },
      isDeleted: false
    },
    include: {
      borrower: {
        select: {
          id: true,
          username: true,
          realName: true
        }
      }
    }
  });

  if (!activeBorrow) {
    return notFound(res, 'No active borrow record found for this book');
  }

  const borrow = await borrowsService.returnBook(activeBorrow.id, {
    condition,
    notes,
  }, req.user);

  successJson(res, { borrow }, 'Quick return completed successfully');
});

/**
 * 获取借阅趋势数据
 * GET /api/v1/borrows/trends
 */
const getBorrowTrends = asyncHandler(async (req, res) => {
  const { period = '30d', type = 'daily' } = req.query;

  const prisma = require('../utils/prisma');

  const now = new Date();
  let dateRange;

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
    by: ['borrowDate'],
    where: {
      borrowDate: {
        gte: dateRange,
      },
      isDeleted: false,
    },
    _count: true,
    orderBy: {
      borrowDate: 'asc'
    }
  });

  // Get return trends grouped by date
  const returnTrends = await prisma.borrows.groupBy({
    by: ['returnDate'],
    where: {
      returnDate: {
        gte: dateRange,
      },
      isDeleted: false,
    },
    _count: true,
    orderBy: {
      returnDate: 'asc'
    }
  });

  // 简化日期格式化
  const formattedBorrowTrends = borrowTrends
    .map(item => ({
      count: item._count,
      period: item.borrowDate ? item.borrowDate.toISOString().split('T')[0] : null
    }))
    .filter(item => item.period);

  const formattedReturnTrends = returnTrends
    .map(item => ({
      count: item._count,
      period: item.returnDate ? item.returnDate.toISOString().split('T')[0] : null
    }))
    .filter(item => item.period);

  successJson(res, {
    borrowTrends: formattedBorrowTrends,
    returnTrends: formattedReturnTrends,
    period,
    type,
  }, 'Borrow trends retrieved successfully');
});

module.exports = {
  createBorrow,
  getBorrowList,
  getBorrowById,
  returnBook,
  renewBook,
  markBookAsLost,
  getOverdueRecords,
  getOverdueRecordsPaginated,
  getDueSoonRecords,
  getBorrowStatistics,
  batchProcessBorrows,
  getUserBorrowHistory,
  getMyBorrowHistory,
  checkBorrowLimits,
  getMyBorrowLimits,
  quickBorrow,
  quickReturn,
  getBorrowTrends,
};
