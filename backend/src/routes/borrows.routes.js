const express = require('express');
const borrowsController = require('../controllers/borrows.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');
const { 
  validate, 
  validateId,
  validatePagination,
  sanitizeInput,
} = require('../middlewares/validation.middleware');
const { borrowSchemas } = require('../utils/validation');

const router = express.Router();

/**
 * 借阅路由
 * /api/v1/borrows/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容
router.use(authenticateToken); // 所有借阅路由都需要认证

/**
 * 统计和查询路由
 */

/**
 * @route   GET /api/v1/borrows/statistics
 * @desc    获取借阅统计信息
 * @access  Private (Admin/Librarian)
 */
router.get('/statistics',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  borrowsController.getBorrowStatistics
);

/**
 * @route   GET /api/v1/borrows/overdue
 * @desc    获取逾期借阅记录
 * @access  Private (Admin/Librarian)
 */
router.get('/overdue',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  validate(require('joi').object({
    graceDays: require('joi').number().integer().min(0).max(30).optional(),
  }), 'query'),
  borrowsController.getOverdueRecords
);

/**
 * @route   GET /api/v1/borrows/overdue-records
 * @desc    获取逾期借阅记录（分页版本）
 * @access  Private (Admin/Librarian)
 */
router.get('/overdue-records',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  validate(require('joi').object({
    page: require('joi').number().integer().min(1).optional(),
    limit: require('joi').number().integer().min(1).max(100).optional(),
    keyword: require('joi').string().max(100).allow('').optional(),
    minOverdueDays: require('joi').number().integer().min(0).allow('').optional(),
    maxOverdueDays: require('joi').number().integer().min(0).allow('').optional(),
    sortBy: require('joi').string().valid('currentOverdueDays', 'borrowDate', 'dueDate', 'userName', 'bookTitle').optional(),
    sortOrder: require('joi').string().valid('asc', 'desc').optional(),
    _t: require('joi').string().optional(), // timestamp parameter for cache busting
  }), 'query'),
  borrowsController.getOverdueRecordsPaginated
);

/**
 * @route   GET /api/v1/borrows/due-soon
 * @desc    获取即将到期的借阅记录
 * @access  Private (Admin/Librarian)
 */
router.get('/due-soon',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  validate(require('joi').object({
    reminderDays: require('joi').number().integer().min(1).max(7).optional(),
  }), 'query'),
  borrowsController.getDueSoonRecords
);

/**
 * @route   GET /api/v1/borrows/trends
 * @desc    获取借阅趋势数据
 * @access  Private (Admin/Librarian)
 */
router.get('/trends',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  validate(require('joi').object({
    period: require('joi').string().valid('7d', '30d', '90d', '1y').optional(),
    type: require('joi').string().valid('daily', 'weekly', 'monthly').optional(),
  }), 'query'),
  borrowsController.getBorrowTrends
);

/**
 * 用户相关路由
 */

/**
 * @route   GET /api/v1/borrows/my-history
 * @desc    获取当前用户借阅历史
 * @access  Private
 */
router.get('/my-history',
  borrowsController.getMyBorrowHistory
);

/**
 * @route   GET /api/v1/borrows/my-limits
 * @desc    获取当前用户借阅限制
 * @access  Private
 */
router.get('/my-limits',
  borrowsController.getMyBorrowLimits
);

/**
 * @route   GET /api/v1/borrows/user/:userId
 * @desc    获取指定用户借阅历史
 * @access  Private (Admin/Librarian or Self)
 */
router.get('/user/:userId',
  validateId('userId'),
  borrowsController.getUserBorrowHistory
);

/**
 * @route   GET /api/v1/borrows/limits/:userId
 * @desc    检查指定用户借阅限制
 * @access  Private (Admin/Librarian)
 */
router.get('/limits/:userId',
  requireRole(['admin', 'librarian']),
  validateId('userId'),
  borrowsController.checkBorrowLimits
);

/**
 * 主要CRUD路由
 */

/**
 * @route   GET /api/v1/borrows
 * @desc    获取借阅记录列表
 * @access  Private (Admin/Librarian)
 */
router.get('/',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.read'),
  validate(borrowSchemas.getBorrowList, 'query'),
  borrowsController.getBorrowList
);

/**
 * @route   POST /api/v1/borrows
 * @desc    创建借阅记录
 * @access  Private (Admin/Librarian)
 */
router.post('/',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.create'),
  validate(borrowSchemas.borrowBook),
  borrowsController.createBorrow
);

/**
 * @route   POST /api/v1/borrows/batch
 * @desc    批量处理借阅记录
 * @access  Private (Admin/Librarian)
 */
router.post('/batch',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.update'),
  validate(require('joi').object({
    borrowIds: require('joi').array().items(require('joi').number().integer().positive()).min(1).required(),
    action: require('joi').string().valid('return', 'renew', 'markLost', 'sendReminder').required(),
    params: require('joi').object({
      condition: require('joi').string().valid('good', 'damaged', 'lost').optional(),
      notes: require('joi').string().max(500).optional(),
      days: require('joi').number().integer().min(1).max(90).optional(),
      damageDescription: require('joi').string().max(1000).optional(),
    }).optional(),
  })),
  borrowsController.batchProcessBorrows
);

/**
 * 快速操作路由
 */

/**
 * @route   POST /api/v1/borrows/quick-borrow
 * @desc    快速借阅（通过扫码等）
 * @access  Private (Admin/Librarian)
 */
router.post('/quick-borrow',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.create'),
  validate(require('joi').object({
    userIdentifier: require('joi').string().required(),
    bookIdentifier: require('joi').string().required(),
    borrowDays: require('joi').number().integer().min(1).max(90).optional(),
  })),
  borrowsController.quickBorrow
);

/**
 * @route   POST /api/v1/borrows/quick-return
 * @desc    快速归还（通过扫码等）
 * @access  Private (Admin/Librarian)
 */
router.post('/quick-return',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.update'),
  validate(require('joi').object({
    bookIdentifier: require('joi').string().required(),
    condition: require('joi').string().valid('good', 'damaged', 'lost').optional(),
    notes: require('joi').string().max(500).optional(),
    damageDescription: require('joi').string().max(1000).optional(),
  })),
  borrowsController.quickReturn
);

/**
 * 单个借阅记录操作
 */

/**
 * @route   GET /api/v1/borrows/:id
 * @desc    获取借阅记录详情
 * @access  Private (Admin/Librarian or Self)
 */
router.get('/:id',
  validateId(),
  borrowsController.getBorrowById
);

/**
 * @route   PUT /api/v1/borrows/:id/return
 * @desc    归还图书
 * @access  Private (Admin/Librarian)
 */
router.put('/:id/return',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.update'),
  validateId(),
  validate(borrowSchemas.returnBook),
  borrowsController.returnBook
);

/**
 * @route   PUT /api/v1/borrows/:id/renew
 * @desc    续借图书
 * @access  Private (Admin/Librarian or Self)
 */
router.put('/:id/renew',
  validateId(),
  validate(borrowSchemas.renewBook),
  borrowsController.renewBook
);

/**
 * @route   PUT /api/v1/borrows/:id/lost
 * @desc    标记图书为丢失
 * @access  Private (Admin/Librarian)
 */
router.put('/:id/lost',
  requireRole(['admin', 'librarian']),
  requirePermission('borrows.update'),
  validateId(),
  validate(require('joi').object({
    notes: require('joi').string().max(1000).optional(),
    damageDescription: require('joi').string().max(1000).optional(),
  })),
  borrowsController.markBookAsLost
);

module.exports = router;