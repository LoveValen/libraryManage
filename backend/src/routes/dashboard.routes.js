const router = require('express').Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

// 所有dashboard路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    获取仪表盘统计数据
 * @access  Private
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @route   GET /api/v1/dashboard/borrow-trend
 * @desc    获取借阅趋势数据
 * @access  Private
 */
router.get('/borrow-trend', dashboardController.getBorrowTrend);

/**
 * @route   GET /api/v1/dashboard/category-stats
 * @desc    获取图书分类统计
 * @access  Private
 */
router.get('/category-stats', dashboardController.getCategoryStats);

/**
 * @route   GET /api/v1/dashboard/notifications
 * @desc    获取系统通知
 * @access  Private
 */
router.get('/notifications', dashboardController.getSystemNotifications);

module.exports = router;