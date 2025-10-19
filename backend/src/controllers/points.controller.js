const pointsService = require('../services/points.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { validateRequest } = require('../utils/validation');
const { success, successWithPagination } = require('../utils/response');
const { ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

// 验证模式常量
const ADD_POINTS_SCHEMA = Joi.object({
  userId: Joi.number().integer().positive().required(),
  points: Joi.number().integer().positive().max(10000).required(),
  type: Joi.string().valid('ADMIN_ADJUSTMENT', 'BONUS_REWARD', 'COMPLETE_TUTORIAL').default('ADMIN_ADJUSTMENT'),
  description: Joi.string().max(200).required(),
  metadata: Joi.object().optional()
});

const DEDUCT_POINTS_SCHEMA = Joi.object({
  userId: Joi.number().integer().positive().required(),
  points: Joi.number().integer().positive().max(10000).required(),
  type: Joi.string().valid('PENALTY_DEDUCTION', 'ADMIN_ADJUSTMENT', 'REDEEM_REWARD').default('PENALTY_DEDUCTION'),
  description: Joi.string().max(200).required(),
  metadata: Joi.object().optional()
});

const TRANSFER_POINTS_SCHEMA = Joi.object({
  fromUserId: Joi.number().integer().positive().required(),
  toUserId: Joi.number().integer().positive().required(),
  points: Joi.number().integer().positive().max(10000).required(),
  description: Joi.string().max(200).required()
});

const REVERSE_TRANSACTION_SCHEMA = Joi.object({
  reason: Joi.string().max(200).required()
});

const BATCH_OPERATIONS_SCHEMA = Joi.object({
  operations: Joi.array().items(Joi.object({
    userId: Joi.number().integer().positive().required(),
    action: Joi.string().valid('add', 'deduct').required(),
    amount: Joi.number().integer().positive().max(10000).required(),
    description: Joi.string().max(200).optional()
  })).min(1).max(100).required()
});

/**
 * 解析整数参数
 */
function parseIntParam(value, defaultValue = null) {
  return value ? parseInt(value) : defaultValue;
}

/**
 * 检查用户权限（用户本人或管理员）
 */
function checkUserOrAdminPermission(targetUserId, currentUser) {
  if (targetUserId !== currentUser.id && currentUser.role !== 'admin') {
    throw new ForbiddenError('权限不足');
  }
}

/**
 * 检查管理员权限
 */
function checkAdminPermission(user) {
  if (user.role !== 'admin') {
    throw new ForbiddenError('只有管理员可以执行此操作');
  }
}

/**
 * 获取用户积分信息
 * GET /api/v1/points/users/:userId
 */
const getUserPoints = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const targetUserId = parseIntParam(userId);

  checkUserOrAdminPermission(targetUserId, req.user);

  const userPoints = await pointsService.getUserPoints(targetUserId);
  success(res, userPoints, '获取用户积分信息成功');
});

/**
 * 获取当前用户积分信息
 * GET /api/v1/points/me
 */
const getMyPoints = asyncHandler(async (req, res) => {
  const userPoints = await pointsService.getUserPoints(req.user.id);
  success(res, userPoints, '获取我的积分信息成功');
});

/**
 * 添加积分（管理员功能）
 * POST /api/v1/points/add
 */
const addPoints = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(ADD_POINTS_SCHEMA, req.body);

  const result = await pointsService.addPoints(
    validatedData.userId,
    validatedData.points,
    validatedData.type,
    validatedData.description,
    req.user.id,
    validatedData.metadata
  );

  success(res, result, '积分添加成功', 201);
});

/**
 * 扣除积分（管理员功能）
 * POST /api/v1/points/deduct
 */
const deductPoints = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(DEDUCT_POINTS_SCHEMA, req.body);

  const result = await pointsService.deductPoints(
    validatedData.userId,
    validatedData.points,
    validatedData.type,
    validatedData.description,
    req.user.id,
    validatedData.metadata
  );

  success(res, result, '积分扣除成功');
});

/**
 * 转移积分（管理员功能）
 * POST /api/v1/points/transfer
 */
const transferPoints = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(TRANSFER_POINTS_SCHEMA, req.body);

  const result = await pointsService.transferPoints(
    validatedData.fromUserId,
    validatedData.toUserId,
    validatedData.points,
    validatedData.description,
    req.user.id
  );

  success(res, result, '积分转移成功');
});

/**
 * 获取积分交易历史
 * GET /api/v1/points/users/:userId/history
 */
const getPointsHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 20,
    type,
    startDate,
    endDate,
    includeOperator = 'false',
  } = req.query;

  const targetUserId = parseIntParam(userId);
  checkUserOrAdminPermission(targetUserId, req.user);

  const options = {
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    type,
    includeOperator: includeOperator === 'true' && req.user.role === 'admin',
  };

  if (startDate) {
    options.startDate = new Date(startDate);
  }
  if (endDate) {
    options.endDate = new Date(endDate);
  }

  const result = await pointsService.getPointsHistory(targetUserId, options);

  successWithPagination(
    res,
    result.transactions,
    result.pagination,
    '获取积分历史成功'
  );
});

/**
 * 获取我的积分交易历史
 * GET /api/v1/points/my/history
 */
const getMyPointsHistory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    startDate,
    endDate,
  } = req.query;

  const options = {
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    type,
    includeOperator: false,
  };

  if (startDate) {
    options.startDate = new Date(startDate);
  }
  if (endDate) {
    options.endDate = new Date(endDate);
  }

  const result = await pointsService.getPointsHistory(req.user.id, options);

  successWithPagination(
    res,
    result.transactions,
    result.pagination,
    '获取我的积分历史成功'
  );
});

/**
 * 获取积分统计信息
 * GET /api/v1/points/statistics
 */
const getPointsStatistics = asyncHandler(async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  const options = {};

  if (userId) {
    const targetUserId = parseIntParam(userId);
    checkUserOrAdminPermission(targetUserId, req.user);
    options.userId = targetUserId;
  }

  if (startDate && endDate) {
    options.startDate = new Date(startDate);
    options.endDate = new Date(endDate);
  }

  const statistics = await pointsService.getPointsStatistics(options);
  success(res, statistics, '获取积分统计成功');
});

/**
 * 冲正交易（管理员功能）
 * POST /api/v1/points/transactions/:transactionId/reverse
 */
const reverseTransaction = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const { transactionId } = req.params;
  const validatedData = validateRequest(REVERSE_TRANSACTION_SCHEMA, req.body);

  const result = await pointsService.reverseTransaction(
    parseIntParam(transactionId),
    validatedData.reason,
    req.user.id
  );

  success(res, result, '交易冲正成功');
});

/**
 * 获取积分排行榜
 * GET /api/v1/points/leaderboard
 */
const getPointsLeaderboard = asyncHandler(async (req, res) => {
  const {
    limit = 100,
    period = 'all', // all, monthly, weekly
  } = req.query;

  const leaderboard = await pointsService.getPointsLeaderboard({
    limit: Math.min(parseIntParam(limit, 100), 500),
    period,
  });

  success(res, leaderboard, '获取积分排行榜成功');
});

/**
 * 批量操作积分（管理员功能）
 * POST /api/v1/points/batch
 */
const batchProcessPoints = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(BATCH_OPERATIONS_SCHEMA, req.body);

  const result = await pointsService.batchProcessPoints(
    validatedData.operations,
    req.user.id
  );

  success(res, result, '批量操作成功');
});

/**
 * 获取用户等级信息
 * GET /api/v1/points/levels/:userId
 */
const getUserLevel = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const targetUserId = parseIntParam(userId);

  checkUserOrAdminPermission(targetUserId, req.user);

  const userPoints = await pointsService.getUserPoints(targetUserId);

  success(res, {
    userId: targetUserId,
    level: userPoints.level,
    totalPoints: userPoints.totalPoints,
  }, '获取用户等级信息成功');
});

/**
 * 获取我的等级信息
 * GET /api/v1/points/my/level
 */
const getMyLevel = asyncHandler(async (req, res) => {
  const userPoints = await pointsService.getUserPoints(req.user.id);

  success(res, {
    userId: req.user.id,
    level: userPoints.level,
    totalPoints: userPoints.totalPoints,
  }, '获取我的等级信息成功');
});

/**
 * 获取积分总览信息（用于仪表板）
 * GET /api/v1/points/overview
 */
const getPointsOverview = asyncHandler(async (req, res) => {
  const [
    myPoints,
    myStatistics,
    leaderboard,
    recentTransactions,
  ] = await Promise.all([
    pointsService.getUserPoints(req.user.id),
    pointsService.getPointsStatistics({ userId: req.user.id }),
    pointsService.getPointsLeaderboard({ limit: 10 }),
    pointsService.getPointsHistory(req.user.id, { limit: 5 }),
  ]);

  const overview = {
    myPoints,
    myStatistics,
    leaderboard,
    recentTransactions: recentTransactions.transactions,
  };

  success(res, overview, '获取积分总览成功');
});

/**
 * 获取系统积分规则
 * GET /api/v1/points/rules
 */
const getPointsRules = asyncHandler(async (req, res) => {
  const { POINTS_RULES, POINTS_TRANSACTION_TYPES, USER_LEVELS } = require('../utils/constants');

  const rules = {
    pointsRules: POINTS_RULES,
    transactionTypes: POINTS_TRANSACTION_TYPES,
    userLevels: USER_LEVELS,
    description: {
      borrowBook: '借阅图书可获得积分',
      returnOnTime: '按时归还图书可获得额外积分',
      writeReview: '撰写图书评价可获得积分',
      completeTutorial: '完成新手教程可获得积分',
      overdueReturn: '逾期归还图书将扣除积分',
      damageBook: '损坏图书将扣除积分',
      loseBook: '丢失图书将扣除积分',
    },
  };

  success(res, rules, '获取积分规则成功');
});

module.exports = {
  getUserPoints,
  getMyPoints,
  addPoints,
  deductPoints,
  transferPoints,
  getPointsHistory,
  getMyPointsHistory,
  getPointsStatistics,
  reverseTransaction,
  getPointsLeaderboard,
  batchProcessPoints,
  getUserLevel,
  getMyLevel,
  getPointsOverview,
  getPointsRules
};