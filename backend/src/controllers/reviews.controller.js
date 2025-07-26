const reviewsService = require('../services/reviews.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { validateRequest } = require('../utils/validation');
const { ApiResponse } = require('../utils/response');
const Joi = require('joi');

/**
 * 评价控制器
 */
class ReviewsController {
  /**
   * 创建评价
   * POST /api/v1/reviews
   */
  createReview = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      userId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '用户ID必须是数字',
          'number.integer': '用户ID必须是整数',
          'number.positive': '用户ID必须大于0',
          'any.required': '用户ID不能为空',
        }),
      bookId: Joi.number().integer().positive().required()
        .messages({
          'number.base': '图书ID必须是数字',
          'number.integer': '图书ID必须是整数',
          'number.positive': '图书ID必须大于0',
          'any.required': '图书ID不能为空',
        }),
      borrowId: Joi.number().integer().positive().optional()
        .messages({
          'number.base': '借阅记录ID必须是数字',
          'number.integer': '借阅记录ID必须是整数',
          'number.positive': '借阅记录ID必须大于0',
        }),
      rating: Joi.number().integer().min(1).max(5).required()
        .messages({
          'number.base': '评分必须是数字',
          'number.integer': '评分必须是整数',
          'number.min': '评分不能低于1星',
          'number.max': '评分不能超过5星',
          'any.required': '评分不能为空',
        }),
      title: Joi.string().max(100).optional()
        .messages({
          'string.max': '评价标题长度不能超过100字符',
        }),
      content: Joi.string().min(10).max(2000).required()
        .messages({
          'string.min': '评价内容至少需要10个字符',
          'string.max': '评价内容不能超过2000字符',
          'any.required': '评价内容不能为空',
        }),
      tags: Joi.array().items(Joi.string().max(20)).max(10).optional()
        .messages({
          'array.max': '标签数量不能超过10个',
          'string.max': '单个标签长度不能超过20字符',
        }),
      isRecommended: Joi.boolean().optional(),
      spoilerAlert: Joi.boolean().optional(),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const review = await reviewsService.createReview(validatedData, req.user);
    
    ApiResponse.success(res, review, '评价创建成功', 201);
  });

  /**
   * 获取评价详情
   * GET /api/v1/reviews/:id
   */
  getReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeUser = 'true', includeBook = 'true' } = req.query;
    
    const review = await reviewsService.getReviewById(
      parseInt(id),
      {
        includeUser: includeUser === 'true',
        includeBook: includeBook === 'true',
      }
    );
    
    ApiResponse.success(res, review, '获取评价详情成功');
  });

  /**
   * 更新评价
   * PUT /api/v1/reviews/:id
   */
  updateReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // 输入验证
    const schema = Joi.object({
      rating: Joi.number().integer().min(1).max(5).optional(),
      title: Joi.string().max(100).optional(),
      content: Joi.string().min(10).max(2000).optional(),
      tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
      isRecommended: Joi.boolean().optional(),
      spoilerAlert: Joi.boolean().optional(),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const review = await reviewsService.updateReview(
      parseInt(id),
      validatedData,
      req.user
    );
    
    ApiResponse.success(res, review, '评价更新成功');
  });

  /**
   * 删除评价
   * DELETE /api/v1/reviews/:id
   */
  deleteReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await reviewsService.deleteReview(parseInt(id), req.user);
    
    ApiResponse.success(res, result, '评价删除成功');
  });

  /**
   * 获取图书的评价列表
   * GET /api/v1/books/:bookId/reviews
   */
  getBookReviews = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'helpful',
      status = 'published',
      includeUser = 'true',
    } = req.query;
    
    const result = await reviewsService.getBookReviews(
      parseInt(bookId),
      {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        status,
        includeUser: includeUser === 'true',
      }
    );
    
    ApiResponse.success(res, result, '获取图书评价列表成功');
  });

  /**
   * 获取用户的评价列表
   * GET /api/v1/users/:userId/reviews
   */
  getUserReviews = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      status = 'published',
      includeBook = 'true',
    } = req.query;
    
    const result = await reviewsService.getUserReviews(
      parseInt(userId),
      {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status,
        includeBook: includeBook === 'true',
        requestingUser: req.user,
      }
    );
    
    ApiResponse.success(res, result, '获取用户评价列表成功');
  });

  /**
   * 搜索评价
   * GET /api/v1/reviews/search
   */
  searchReviews = asyncHandler(async (req, res) => {
    const {
      q: query,
      bookId,
      userId,
      rating,
      status = 'published',
      tags,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    // 处理tags参数（可能是逗号分隔的字符串）
    let parsedTags = null;
    if (tags) {
      parsedTags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    
    const result = await reviewsService.searchReviews({
      query,
      bookId: bookId ? parseInt(bookId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      rating: rating ? parseInt(rating) : undefined,
      status,
      tags: parsedTags,
      sortBy,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    
    ApiResponse.success(res, result, '搜索评价成功');
  });

  /**
   * 获取图书评分统计
   * GET /api/v1/books/:bookId/reviews/stats
   */
  getBookRatingStats = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    
    const stats = await reviewsService.getBookRatingStats(parseInt(bookId));
    
    ApiResponse.success(res, stats, '获取图书评分统计成功');
  });

  /**
   * 标记评价为有用/无用
   * POST /api/v1/reviews/:id/helpful
   */
  markReviewHelpful = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { helpful } = req.body;
    
    // 输入验证
    const schema = Joi.object({
      helpful: Joi.boolean().required()
        .messages({
          'any.required': '必须指定是否有用',
          'boolean.base': 'helpful字段必须是布尔值',
        }),
    });

    const validatedData = validateRequest(schema, { helpful });
    
    const review = await reviewsService.markReviewHelpful(
      parseInt(id),
      validatedData.helpful,
      req.user
    );
    
    ApiResponse.success(res, review, '评价反馈成功');
  });

  /**
   * 审核评价（管理员功能）
   * POST /api/v1/reviews/:id/moderate
   */
  moderateReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // 输入验证
    const schema = Joi.object({
      status: Joi.string().valid('published', 'hidden', 'deleted').required()
        .messages({
          'any.required': '审核状态不能为空',
          'any.only': '审核状态必须是published、hidden或deleted之一',
        }),
      notes: Joi.string().max(500).optional()
        .messages({
          'string.max': '审核备注不能超过500字符',
        }),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const review = await reviewsService.moderateReview(
      parseInt(id),
      validatedData,
      req.user
    );
    
    ApiResponse.success(res, review, '评价审核成功');
  });

  /**
   * 获取评价统计信息
   * GET /api/v1/reviews/statistics
   */
  getReviewStatistics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const options = {};
    if (startDate && endDate) {
      options.startDate = new Date(startDate);
      options.endDate = new Date(endDate);
    }
    
    const statistics = await reviewsService.getReviewStatistics(options);
    
    ApiResponse.success(res, statistics, '获取评价统计成功');
  });

  /**
   * 获取推荐评价
   * GET /api/v1/reviews/recommended
   */
  getRecommendedReviews = asyncHandler(async (req, res) => {
    const {
      limit = 10,
      minRating = 4,
      minHelpfulScore = 70,
    } = req.query;
    
    const reviews = await reviewsService.getRecommendedReviews({
      limit: Math.min(parseInt(limit), 50),
      minRating: parseInt(minRating),
      minHelpfulScore: parseInt(minHelpfulScore),
    });
    
    ApiResponse.success(res, reviews, '获取推荐评价成功');
  });

  /**
   * 获取待审核评价列表（管理员功能）
   * GET /api/v1/reviews/pending
   */
  getPendingReviews = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = req.query;
    
    const result = await reviewsService.getPendingReviews(
      {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
      },
      req.user
    );
    
    ApiResponse.success(res, result, '获取待审核评价列表成功');
  });

  /**
   * 批量操作评价（管理员功能）
   * POST /api/v1/reviews/batch
   */
  batchProcessReviews = asyncHandler(async (req, res) => {
    // 输入验证
    const schema = Joi.object({
      reviewIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required()
        .messages({
          'array.min': '至少选择一个评价',
          'array.max': '一次最多处理100个评价',
          'any.required': '评价ID列表不能为空',
        }),
      action: Joi.string().valid('approve', 'reject', 'delete').required()
        .messages({
          'any.required': '操作类型不能为空',
          'any.only': '操作类型必须是approve、reject或delete之一',
        }),
      notes: Joi.string().max(500).optional()
        .messages({
          'string.max': '备注不能超过500字符',
        }),
    });

    const validatedData = validateRequest(schema, req.body);
    
    const result = await reviewsService.batchProcessReviews(
      validatedData.reviewIds,
      validatedData.action,
      { notes: validatedData.notes },
      req.user
    );
    
    ApiResponse.success(res, result, '批量操作成功');
  });

  /**
   * 检查用户是否可以评价指定图书
   * GET /api/v1/books/:bookId/can-review
   */
  checkCanReview = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { userId } = req.query;
    
    // 如果没有提供userId，使用当前用户ID
    const targetUserId = userId ? parseInt(userId) : req.user.id;
    
    // 权限检查：只有用户本人或管理员可以查询
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '权限不足', 403);
    }
    
    const result = await reviewsService.checkCanReview(targetUserId, parseInt(bookId));
    
    ApiResponse.success(res, result, '检查评价权限成功');
  });

  /**
   * 获取我的评价列表
   * GET /api/v1/reviews/my
   */
  getMyReviews = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      includeBook = 'true',
    } = req.query;
    
    const result = await reviewsService.getUserReviews(
      req.user.id,
      {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status,
        includeBook: includeBook === 'true',
        requestingUser: req.user,
      }
    );
    
    ApiResponse.success(res, result, '获取我的评价列表成功');
  });

  /**
   * 获取评价总览信息（用于仪表板）
   * GET /api/v1/reviews/overview
   */
  getReviewOverview = asyncHandler(async (req, res) => {
    const [statistics, recommendedReviews] = await Promise.all([
      reviewsService.getReviewStatistics(),
      reviewsService.getRecommendedReviews({ limit: 5 }),
    ]);
    
    const overview = {
      statistics,
      recommendedReviews,
    };
    
    ApiResponse.success(res, overview, '获取评价总览成功');
  });
}

module.exports = new ReviewsController();