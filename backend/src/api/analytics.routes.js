const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { 
  validate, 
  apiRateLimit,
  sanitizeInput,
} = require('../middlewares/validation.middleware');
const { analyticsSchemas } = require('../utils/validation');

const router = express.Router();

/**
 * 分析路由
 * /api/v1/analytics/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容
router.use(authenticateToken); // 所有分析功能都需要认证

/**
 * 管理员和图书管理员可访问的路由
 */
router.use(requireRole(['admin', 'librarian']));

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    获取综合仪表板数据
 * @access  Private (Admin/Librarian)
 */
router.get('/dashboard',
  validate(analyticsSchemas.getDashboard, 'query'),
  analyticsController.getDashboard
);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    获取概览统计数据
 * @access  Private (Admin/Librarian)
 */
router.get('/overview',
  validate(analyticsSchemas.getOverview, 'query'),
  analyticsController.getOverview
);

/**
 * @route   GET /api/v1/analytics/trends
 * @desc    获取趋势分析数据
 * @access  Private (Admin/Librarian)
 */
router.get('/trends',
  validate(analyticsSchemas.getTrends, 'query'),
  analyticsController.getTrendsAnalytics
);

/**
 * @route   GET /api/v1/analytics/books
 * @desc    获取图书分析报告
 * @access  Private (Admin/Librarian)
 */
router.get('/books',
  validate(analyticsSchemas.getBooksAnalytics, 'query'),
  analyticsController.getBooksAnalytics
);

/**
 * @route   GET /api/v1/analytics/users
 * @desc    获取用户分析报告
 * @access  Private (Admin/Librarian)
 */
router.get('/users',
  validate(analyticsSchemas.getUsersAnalytics, 'query'),
  analyticsController.getUsersAnalytics
);

/**
 * @route   GET /api/v1/analytics/categories
 * @desc    获取分类分析报告
 * @access  Private (Admin/Librarian)
 */
router.get('/categories',
  validate(analyticsSchemas.getCategoriesAnalytics, 'query'),
  analyticsController.getCategoriesAnalytics
);

/**
 * @route   GET /api/v1/analytics/performance
 * @desc    获取性能指标
 * @access  Private (Admin/Librarian)
 */
router.get('/performance',
  validate(analyticsSchemas.getPerformance, 'query'),
  analyticsController.getPerformanceMetrics
);

/**
 * @route   GET /api/v1/analytics/insights
 * @desc    获取预测性洞察
 * @access  Private (Admin/Librarian)
 */
router.get('/insights',
  validate(analyticsSchemas.getInsights, 'query'),
  analyticsController.getPredictiveInsights
);

/**
 * @route   GET /api/v1/analytics/realtime
 * @desc    获取实时统计数据
 * @access  Private (Admin/Librarian)
 */
router.get('/realtime',
  apiRateLimit, // 限制实时查询频率
  analyticsController.getRealTimeStats
);

/**
 * 仅管理员可访问的路由
 */
router.use(requireRole(['admin']));

/**
 * @route   POST /api/v1/analytics/export
 * @desc    导出分析报告
 * @access  Private (Admin only)
 */
router.post('/export',
  validate(analyticsSchemas.exportReport, 'body'),
  analyticsController.exportReport
);

/**
 * @route   POST /api/v1/analytics/query
 * @desc    执行自定义查询
 * @access  Private (Admin only)
 */
router.post('/query',
  validate(analyticsSchemas.customQuery, 'body'),
  apiRateLimit, // 限制查询频率
  analyticsController.customQuery
);

module.exports = router;