const express = require('express');
const reviewsController = require('../controllers/reviews.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { createRateLimit } = require('../middlewares/validation.middleware');

const router = express.Router();

// 应用通用中间件
router.use(authenticateToken); // 所有评价相关接口都需要认证

/**
 * 公共评价接口（所有认证用户可访问）
 */

// 搜索评价
router.get('/search', reviewsController.searchReviews);

// 获取推荐评价
router.get('/recommended', reviewsController.getRecommendedReviews);

// 获取评价总览（仪表板用）
router.get('/overview', reviewsController.getReviewOverview);

// 获取我的评价列表
router.get('/my', reviewsController.getMyReviews);

// 获取评价详情
router.get('/:id', reviewsController.getReview);

// 创建评价（限制频率：每分钟最多3次）
router.post('/', 
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 3 }),
  reviewsController.createReview
);

// 更新评价
router.put('/:id', reviewsController.updateReview);

// 删除评价
router.delete('/:id', reviewsController.deleteReview);

// 标记评价为有用/无用（限制频率：每分钟最多10次）
router.post('/:id/helpful',
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  reviewsController.markReviewHelpful
);

/**
 * 管理员专用接口
 */

// 获取评价统计信息
router.get('/statistics', 
  requireRole(['admin']),
  reviewsController.getReviewStatistics
);

// 获取待审核评价列表
router.get('/pending',
  requireRole(['admin']),
  reviewsController.getPendingReviews
);

// 审核评价
router.post('/:id/moderate',
  requireRole(['admin']),
  reviewsController.moderateReview
);

// 批量操作评价
router.post('/batch',
  requireRole(['admin']),
  reviewsController.batchProcessReviews
);

/**
 * 嵌套在其他资源下的评价接口
 * 这些路由会在主app中通过其他路由文件注册
 */

// 在books.routes.js中会有：
// router.get('/:bookId/reviews', reviewsController.getBookReviews);
// router.get('/:bookId/reviews/stats', reviewsController.getBookRatingStats);
// router.get('/:bookId/can-review', reviewsController.checkCanReview);

// 在users.routes.js中会有：
// router.get('/:userId/reviews', reviewsController.getUserReviews);

module.exports = router;