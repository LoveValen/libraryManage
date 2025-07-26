const pointsService = require('../services/points.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { validateRequest } = require('../utils/validation');
const { ApiResponse } = require('../utils/response');
const Joi = require('joi');

/**
 * 积分控制器
 */
class PointsController {
  /**
   * 获取用户积分信息
   * GET /api/v1/points/users/:userId
   */
  getUserPoints = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // 权限检查：用户只能查看自己的积分，管理员可以查看所有用户
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '权限不足', 403);
    }
    
    const userPoints = await pointsService.getUserPoints(parseInt(userId));
    
    ApiResponse.success(res, userPoints, '获取用户积分信息成功');
  });

  /**
   * 获取当前用户积分信息
   * GET /api/v1/points/me
   */
  getMyPoints = asyncHandler(async (req, res) => {
    const userPoints = await pointsService.getUserPoints(req.user.id);
    
    ApiResponse.success(res, userPoints, '获取我的积分信息成功');
  });

  /**
   * 添加积分（管理员功能）
   * POST /api/v1/points/add
   */
  addPoints = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      userId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '用户ID必须是数字',
          'number.integer': '用户ID必须是整数',
          'number.positive': '用户ID必须大于0',
          'any.required': '用户ID不能为空',
        }),
      points: Joi.number().integer().positive().max(10000).required()
        .messages({
          'number.base': '积分数量必须是数字',
          'number.integer': '积分数量必须是整数',
          'number.positive': '积分数量必须大于0',
          'number.max': '单次最多添加10000积分',
          'any.required': '积分数量不能为空',
        }),
      type: Joi.string().valid(
        'ADMIN_ADJUSTMENT',
        'BONUS_REWARD',
        'COMPLETE_TUTORIAL'
      ).default('ADMIN_ADJUSTMENT'),
      description: Joi.string().max(200).required()
        .messages({
          'string.max': '描述不能超过200字符',
          'any.required': '描述不能为空',
        }),
      metadata: Joi.object().optional(),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await pointsService.addPoints(
      validatedData.userId,
      validatedData.points,
      validatedData.type,
      validatedData.description,
      req.user.id,
      validatedData.metadata
    );
    
    ApiResponse.success(res, result, '积分添加成功', 201);
  });

  /**
   * 扣除积分（管理员功能）
   * POST /api/v1/points/deduct
   */
  deductPoints = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      userId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '用户ID必须是数字',
          'number.integer': '用户ID必须是整数',
          'number.positive': '用户ID必须大于0',
          'any.required': '用户ID不能为空',
        }),
      points: Joi.number().integer().positive().max(10000).required()
        .messages({
          'number.base': '积分数量必须是数字',
          'number.integer': '积分数量必须是整数',
          'number.positive': '积分数量必须大于0',
          'number.max': '单次最多扣除10000积分',
          'any.required': '积分数量不能为空',
        }),
      type: Joi.string().valid(
        'PENALTY_DEDUCTION',
        'ADMIN_ADJUSTMENT',
        'REDEEM_REWARD'
      ).default('PENALTY_DEDUCTION'),
      description: Joi.string().max(200).required()
        .messages({
          'string.max': '描述不能超过200字符',
          'any.required': '描述不能为空',
        }),
      metadata: Joi.object().optional(),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await pointsService.deductPoints(
      validatedData.userId,
      validatedData.points,
      validatedData.type,
      validatedData.description,
      req.user.id,
      validatedData.metadata
    );
    
    ApiResponse.success(res, result, '积分扣除成功');
  });

  /**
   * 转移积分（管理员功能）
   * POST /api/v1/points/transfer
   */
  transferPoints = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      fromUserId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '转出用户ID必须是数字',
          'number.integer': '转出用户ID必须是整数',
          'number.positive': '转出用户ID必须大于0',
          'any.required': '转出用户ID不能为空',
        }),
      toUserId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '转入用户ID必须是数字',
          'number.integer': '转入用户ID必须是整数',
          'number.positive': '转入用户ID必须大于0',
          'any.required': '转入用户ID不能为空',
        }),
      points: Joi.number().integer().positive().max(10000).required()
        .messages({
          'number.base': '积分数量必须是数字',
          'number.integer': '积分数量必须是整数',
          'number.positive': '积分数量必须大于0',
          'number.max': '单次最多转移10000积分',
          'any.required': '积分数量不能为空',
        }),
      description: Joi.string().max(200).required()
        .messages({
          'string.max': '描述不能超过200字符',
          'any.required': '描述不能为空',
        }),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await pointsService.transferPoints(
      validatedData.fromUserId,
      validatedData.toUserId,
      validatedData.points,
      validatedData.description,
      req.user.id
    );
    
    ApiResponse.success(res, result, '积分转移成功');
  });

  /**
   * 获取积分交易历史
   * GET /api/v1/points/users/:userId/history
   */
  getPointsHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate,
      includeOperator = 'false',
    } = req.query;

    // 权限检查：用户只能查看自己的历史，管理员可以查看所有用户
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: '权限不足',
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString()
      });
    }
    
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      type,
      includeOperator: includeOperator === 'true' && req.user.role === 'admin',
    };

    if (startDate) {
      options.startDate = new Date(startDate);
    }
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    const result = await pointsService.getPointsHistory(parseInt(userId), options);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取积分历史成功',
      data: result,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * 获取我的积分交易历史
   * GET /api/v1/points/my/history
   */
  getMyPointsHistory = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate,
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
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
    
    ApiResponse.success(res, result, '获取我的积分历史成功');
  });

  /**
   * 获取积分统计信息
   * GET /api/v1/points/statistics
   */
  getPointsStatistics = asyncHandler(async (req, res) => {
    const { userId, startDate, endDate } = req.query;
    
    const options = {};
    
    if (userId) {
      // 权限检查：用户只能查看自己的统计，管理员可以查看所有用户
      if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(
          ApiResponse.error('权限不足', 403)
        );
      }
      options.userId = parseInt(userId);
    }
    
    if (startDate && endDate) {
      options.startDate = new Date(startDate);
      options.endDate = new Date(endDate);
    }
    
    const statistics = await pointsService.getPointsStatistics(options);
    
    ApiResponse.success(res, statistics, '获取积分统计成功');
  });

  /**
   * 冲正交易（管理员功能）
   * POST /api/v1/points/transactions/:transactionId/reverse
   */
  reverseTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    
    // 输入验证
    const schema = Joi.object({
      reason: Joi.string().max(200).required()
        .messages({
          'string.max': '冲正原因不能超过200字符',
          'any.required': '冲正原因不能为空',
        }),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await pointsService.reverseTransaction(
      parseInt(transactionId),
      validatedData.reason,
      req.user.id
    );
    
    ApiResponse.success(res, result, '交易冲正成功');
  });

  /**
   * 获取积分排行榜
   * GET /api/v1/points/leaderboard
   */
  getPointsLeaderboard = asyncHandler(async (req, res) => {
    const {
      limit = 100,
      period = 'all', // all, monthly, weekly
    } = req.query;
    
    const leaderboard = await pointsService.getPointsLeaderboard({
      limit: Math.min(parseInt(limit), 500),
      period,
    });
    
    ApiResponse.success(res, leaderboard, '获取积分排行榜成功');
  });

  /**
   * 批量操作积分（管理员功能）
   * POST /api/v1/points/batch
   */
  batchProcessPoints = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      operations: Joi.array().items(
        Joi.object({
          userId: Joi.number().integer().positive().required(),
          action: Joi.string().valid('add', 'deduct').required(),
          amount: Joi.number().integer().positive().max(10000).required(),
          description: Joi.string().max(200).optional(),
        })
      ).min(1).max(100).required()
        .messages({
          'array.min': '至少要有一个操作',
          'array.max': '一次最多处理100个操作',
          'any.required': '操作列表不能为空',
        }),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await pointsService.batchProcessPoints(
      validatedData.operations,
      req.user.id
    );
    
    ApiResponse.success(res, result, '批量操作成功');
  });

  /**
   * 获取用户等级信息
   * GET /api/v1/points/levels/:userId
   */
  getUserLevel = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // 权限检查：用户只能查看自己的等级，管理员可以查看所有用户
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '权限不足', 403);
    }
    
    const userPoints = await pointsService.getUserPoints(parseInt(userId));
    
    ApiResponse.success(res, {
      userId: parseInt(userId),
      level: userPoints.level,
      totalPoints: userPoints.totalPoints,
    }, '获取用户等级信息成功');
  });

  /**
   * 获取我的等级信息
   * GET /api/v1/points/my/level
   */
  getMyLevel = asyncHandler(async (req, res) => {
    const userPoints = await pointsService.getUserPoints(req.user.id);
    
    ApiResponse.success(res, {
      userId: req.user.id,
      level: userPoints.level,
      totalPoints: userPoints.totalPoints,
    }, '获取我的等级信息成功');
  });

  /**
   * 获取积分总览信息（用于仪表板）
   * GET /api/v1/points/overview
   */
  getPointsOverview = asyncHandler(async (req, res) => {
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
    
    ApiResponse.success(res, overview, '获取积分总览成功');
  });

  /**
   * 获取系统积分规则
   * GET /api/v1/points/rules
   */
  getPointsRules = asyncHandler(async (req, res) => {
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
    
    ApiResponse.success(res, rules, '获取积分规则成功');
  });
}

module.exports = new PointsController();