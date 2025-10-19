const express = require('express');
const pointsController = require('../controllers/points.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');
const { createRateLimit } = require('../middlewares/validation.middleware');

const router = express.Router();

// 应用通用中间件
router.use(authenticateToken); // 所有积分相关接口都需要认证

/**
 * 公共积分接口（所有认证用户可访问）
 */

// 获取积分规则
router.get('/rules', pointsController.getPointsRules);

// 获取积分总览（仪表板用）
router.get('/overview', pointsController.getPointsOverview);

// 获取我的积分信息
router.get('/me', pointsController.getMyPoints);

// 获取我的等级信息
router.get('/my/level', pointsController.getMyLevel);

// 获取我的积分历史
router.get('/my/history', pointsController.getMyPointsHistory);

// 获取积分排行榜
router.get('/leaderboard', pointsController.getPointsLeaderboard);

// 获取用户积分信息（可以查看自己的，管理员可以查看所有）
router.get('/users/:userId', pointsController.getUserPoints);

// 获取用户等级信息（可以查看自己的，管理员可以查看所有）
router.get('/levels/:userId', pointsController.getUserLevel);

// 获取用户积分历史（可以查看自己的，管理员可以查看所有）
router.get('/users/:userId/history', pointsController.getPointsHistory);

// 获取积分统计信息（可以查看自己的，管理员可以查看所有）
router.get('/statistics', pointsController.getPointsStatistics);

/**
 * 管理员专用接口
 */

// 添加积分（限制频率：每分钟最多10次）
router.post('/add',
  requireRole(['admin']),
  requirePermission('points.update'),
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  pointsController.addPoints
);

// 扣除积分（限制频率：每分钟最多10次）
router.post('/deduct',
  requireRole(['admin']),
  requirePermission('points.update'),
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  pointsController.deductPoints
);

// 转移积分（限制频率：每分钟最多5次）
router.post('/transfer',
  requireRole(['admin']),
  requirePermission('points.update'),
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  pointsController.transferPoints
);

// 冲正交易（限制频率：每分钟最多3次）
router.post('/transactions/:transactionId/reverse',
  requireRole(['admin']),
  requirePermission('points.update'),
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 3 }),
  pointsController.reverseTransaction
);

// 批量操作积分（限制频率：每分钟最多2次）
router.post('/batch',
  requireRole(['admin']),
  requirePermission('points.update'),
  createRateLimit({ windowMs: 60 * 1000, maxRequests: 2 }),
  pointsController.batchProcessPoints
);

module.exports = router;