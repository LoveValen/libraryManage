const express = require('express');
const path = require('path');
const booksController = require('../controllers/books.controller');
const reviewsController = require('../controllers/reviews.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { 
  validate, 
  validateId,
  validatePagination,
  apiRateLimit,
  sanitizeInput,
} = require('../middlewares/validation.middleware');
const { bookSchemas } = require('../utils/validation');

const router = express.Router();

/**
 * 图书路由
 * /api/v1/books/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容

/**
 * 公开路由（不需要认证）
 */

/**
 * @route   GET /api/v1/books
 * @desc    获取图书列表
 * @access  Public
 */
router.get('/',
  optionalAuth, // 可选的认证，用于检查是否是管理员
  (req, res, next) => {
    // 根据用户角色选择合适的验证模式
    const schema = req.user && req.user.role === 'admin' 
      ? bookSchemas.adminGetBookList 
      : bookSchemas.getBookList;
    return validate(schema, 'query')(req, res, next);
  },
  booksController.getBookList
);

/**
 * @route   GET /api/v1/books/search
 * @desc    搜索图书
 * @access  Public
 */
router.get('/search',
  booksController.searchBooks
);

/**
 * @route   GET /api/v1/books/popular
 * @desc    获取热门图书
 * @access  Public
 */
router.get('/popular',
  booksController.getPopularBooks
);

/**
 * @route   GET /api/v1/books/recent
 * @desc    获取最新图书
 * @access  Public
 */
router.get('/recent',
  booksController.getRecentBooks
);

/**
 * @route   GET /api/v1/books/categories
 * @desc    获取图书分类
 * @access  Public
 */
router.get('/categories',
  booksController.getCategories
);

/**
 * @route   GET /api/v1/books/statistics
 * @desc    获取图书统计信息
 * @access  Public
 */
router.get('/statistics',
  booksController.getBookStatistics
);

/**
 * @route   GET /api/v1/books/isbn/:isbn
 * @desc    根据ISBN查找图书
 * @access  Public
 */
router.get('/isbn/:isbn',
  booksController.getBookByISBN
);

/**
 * @route   GET /api/v1/books/:id
 * @desc    获取图书详情
 * @access  Public
 */
router.get('/:id',
  validateId(),
  optionalAuth, // 可选认证（如果有token会记录访问）
  booksController.getBookById
);

/**
 * @route   GET /api/v1/books/:bookId/reviews
 * @desc    获取图书评价列表
 * @access  Public
 */
router.get('/:bookId/reviews',
  validateId('bookId'),
  reviewsController.getBookReviews
);

/**
 * @route   GET /api/v1/books/:bookId/reviews/stats
 * @desc    获取图书评分统计
 * @access  Public
 */
router.get('/:bookId/reviews/stats',
  validateId('bookId'),
  reviewsController.getBookRatingStats
);

/**
 * 需要认证的路由
 */
router.use(authenticateToken);

/**
 * @route   GET /api/v1/books/:bookId/can-review
 * @desc    检查是否可以评价图书
 * @access  Private
 */
router.get('/:bookId/can-review',
  validateId('bookId'),
  reviewsController.checkCanReview
);

/**
 * @route   GET /api/v1/books/:id/download
 * @desc    下载电子书
 * @access  Private
 */
router.get('/:id/download',
  validateId(),
  booksController.downloadEbook
);

/**
 * 管理员路由（需要admin或librarian权限）
 */

/**
 * @route   POST /api/v1/books
 * @desc    创建图书
 * @access  Private (Admin/Librarian)
 */
router.post('/',
  requireRole(['admin', 'librarian']),
  validate(bookSchemas.createBook),
  booksController.createBook
);

/**
 * @route   PUT /api/v1/books/:id
 * @desc    更新图书信息
 * @access  Private (Admin/Librarian)
 */
router.put('/:id',
  requireRole(['admin', 'librarian']),
  validateId(),
  validate(bookSchemas.updateBook),
  booksController.updateBook
);

/**
 * @route   PATCH /api/v1/books/:id/stock
 * @desc    更新图书库存
 * @access  Private (Admin/Librarian)
 */
router.patch('/:id/stock',
  requireRole(['admin', 'librarian']),
  validateId(),
  validate(require('joi').object({
    totalStock: require('joi').number().integer().min(0).required(),
    availableStock: require('joi').number().integer().min(0).required(),
  })),
  booksController.updateBookStock
);

/**
 * 图书导入相关路由
 */


/**
 * @route   DELETE /api/v1/books/:id
 * @desc    删除图书
 * @access  Private (Admin)
 */
router.delete('/:id',
  requireRole(['admin']),
  validateId(),
  booksController.deleteBook
);

module.exports = router;