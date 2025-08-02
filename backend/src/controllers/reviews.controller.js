const reviewsService = require('../services/reviews.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { validateRequest } = require('../utils/validation');
const { success, validationError } = require('../utils/response');
const Joi = require('joi');

/**
 * 评论控制器 - 处理图书评论的增删改查、审核、统计等操作
 */
class ReviewsController {
  // 验证模式常量
  static CREATE_SCHEMA = Joi.object({
    userId: Joi.number().integer().positive().required(),
    bookId: Joi.number().integer().positive().required(),
    borrowId: Joi.number().integer().positive().optional(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(100).optional(),
    content: Joi.string().min(10).max(2000).required(),
    tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
    isRecommended: Joi.boolean().optional(),
    spoilerAlert: Joi.boolean().optional()
  });

  static UPDATE_SCHEMA = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().max(100).optional(),
    content: Joi.string().min(10).max(2000).optional(),
    tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
    isRecommended: Joi.boolean().optional(),
    spoilerAlert: Joi.boolean().optional()
  });

  static HELPFUL_SCHEMA = Joi.object({
    helpful: Joi.boolean().required()
  });

  static MODERATE_SCHEMA = Joi.object({
    status: Joi.string().valid('published', 'hidden', 'deleted').required(),
    notes: Joi.string().max(500).optional()
  });

  static BATCH_SCHEMA = Joi.object({
    reviewIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
    action: Joi.string().valid('approve', 'reject', 'delete').required(),
    notes: Joi.string().max(500).optional()
  });

  /**
   * 解析查询参数中的整数值
   * @private
   */
  _parseIntParam(value, defaultValue = null) {
    return value ? parseInt(value) : defaultValue;
  }

  /**
   * 解析布尔参数
   * @private
   */
  _parseBoolParam(value, defaultValue = false) {
    return value === 'true' || value === true;
  }

  /**
   * 清理查询参数
   * @private
   */
  _cleanQueryParams(query) {
    const mappedQuery = { ...query };
    delete mappedQuery._t;
    
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    return mappedQuery;
  }
  /**
   * 创建评价
   */
  createReview = asyncHandler(async (req, res) => {
    const validatedData = validateRequest(ReviewsController.CREATE_SCHEMA, req.body);
    const review = await reviewsService.createReview(validatedData, req.user);
    success(res, { review }, '评价创建成功', 201);
  });

  /**
   * 获取评价详情
   */
  getReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeUser = 'true', includeBook = 'true' } = req.query;
    
    const review = await reviewsService.getReviewById(
      this._parseIntParam(id),
      {
        includeUser: this._parseBoolParam(includeUser, true),
        includeBook: this._parseBoolParam(includeBook, true)
      }
    );
    
    success(res, { review }, '获取评价详情成功');
  });

  /**
   * 更新评价
   */
  updateReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = validateRequest(ReviewsController.UPDATE_SCHEMA, req.body);
    
    const review = await reviewsService.updateReview(
      this._parseIntParam(id),
      validatedData,
      req.user
    );
    
    success(res, { review }, '评价更新成功');
  });

  /**
   * 删除评价
   */
  deleteReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await reviewsService.deleteReview(this._parseIntParam(id), req.user);
    success(res, result, '评价删除成功');
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
      this._parseIntParam(bookId),
      {
        page: this._parseIntParam(page, 1),
        limit: Math.min(this._parseIntParam(limit, 20), 100),
        sortBy,
        status,
        includeUser: this._parseBoolParam(includeUser, true),
      }
    );
    
    success(res, result, '获取图书评价列表成功');
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
      this._parseIntParam(userId),
      {
        page: this._parseIntParam(page, 1),
        limit: Math.min(this._parseIntParam(limit, 20), 100),
        status,
        includeBook: this._parseBoolParam(includeBook, true),
        requestingUser: req.user,
      }
    );
    
    success(res, result, '获取用户评价列表成功');
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

    const result = await reviewsService.searchReviews({
      query,
      bookId: this._parseIntParam(bookId),
      userId: this._parseIntParam(userId),
      rating: this._parseIntParam(rating),
      status,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : null,
      sortBy,
      page: this._parseIntParam(page, 1),
      limit: Math.min(this._parseIntParam(limit, 20), 100),
    });
    
    success(res, result, '搜索评价成功');
  });

  /**
   * 获取图书评分统计
   * GET /api/v1/books/:bookId/reviews/stats
   */
  getBookRatingStats = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const stats = await reviewsService.getBookRatingStats(this._parseIntParam(bookId));
    success(res, stats, '获取图书评分统计成功');
  });

  /**
   * 标记评价为有用/无用
   * POST /api/v1/reviews/:id/helpful
   */
  markReviewHelpful = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = validateRequest(ReviewsController.HELPFUL_SCHEMA, req.body);
    
    const review = await reviewsService.markReviewHelpful(
      this._parseIntParam(id),
      validatedData.helpful,
      req.user
    );
    
    success(res, review, '评价反馈成功');
  });

  /**
   * 审核评价（管理员功能）
   * POST /api/v1/reviews/:id/moderate
   */
  moderateReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = validateRequest(ReviewsController.MODERATE_SCHEMA, req.body);
    
    const review = await reviewsService.moderateReview(
      this._parseIntParam(id),
      validatedData,
      req.user
    );
    
    success(res, review, '评价审核成功');
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
    success(res, statistics, '获取评价统计成功');
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
      limit: Math.min(this._parseIntParam(limit, 10), 50),
      minRating: this._parseIntParam(minRating, 4),
      minHelpfulScore: this._parseIntParam(minHelpfulScore, 70),
    });
    
    success(res, reviews, '获取推荐评价成功');
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
        page: this._parseIntParam(page, 1),
        limit: Math.min(this._parseIntParam(limit, 20), 100),
        sortBy,
      },
      req.user
    );
    
    success(res, result, '获取待审核评价列表成功');
  });

  /**
   * 批量操作评价（管理员功能）
   * POST /api/v1/reviews/batch
   */
  batchProcessReviews = asyncHandler(async (req, res) => {
    const validatedData = validateRequest(ReviewsController.BATCH_SCHEMA, req.body);
    
    const result = await reviewsService.batchProcessReviews(
      validatedData.reviewIds,
      validatedData.action,
      { notes: validatedData.notes },
      req.user
    );
    
    success(res, result, '批量操作成功');
  });

  /**
   * 检查用户是否可以评价指定图书
   * GET /api/v1/books/:bookId/can-review
   */
  checkCanReview = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { userId } = req.query;
    
    const targetUserId = this._parseIntParam(userId) || req.user.id;
    
    // 权限检查：只有用户本人或管理员可以查询
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    
    const result = await reviewsService.checkCanReview(targetUserId, this._parseIntParam(bookId));
    success(res, result, '检查评价权限成功');
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
        page: this._parseIntParam(page, 1),
        limit: Math.min(this._parseIntParam(limit, 20), 100),
        status,
        includeBook: this._parseBoolParam(includeBook, true),
        requestingUser: req.user,
      }
    );
    
    success(res, result, '获取我的评价列表成功');
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
    
    success(res, overview, '获取评价总览成功');
  });
}

module.exports = new ReviewsController();