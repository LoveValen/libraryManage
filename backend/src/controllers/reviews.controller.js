const reviewsService = require('../services/reviews.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { validateRequest } = require('../utils/validation');
const { success, successWithPagination, validationError } = require('../utils/response');
const { cleanParams, parseIntParam, parseBoolParam } = require('../utils/queryHelper');
const Joi = require('joi');

/**
 * 评论控制器 - 处理图书评论的增删改查、审核、统计等操作
 */

// 验证模式常量
const CREATE_SCHEMA = Joi.object({
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

const UPDATE_SCHEMA = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(100).optional(),
  content: Joi.string().min(10).max(2000).optional(),
  tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
  isRecommended: Joi.boolean().optional(),
  spoilerAlert: Joi.boolean().optional()
});

const HELPFUL_SCHEMA = Joi.object({
  helpful: Joi.boolean().required()
});

const MODERATE_SCHEMA = Joi.object({
  status: Joi.string().valid('published', 'hidden', 'deleted').required(),
  notes: Joi.string().max(500).optional()
});

const BATCH_SCHEMA = Joi.object({
  reviewIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
  action: Joi.string().valid('approve', 'reject', 'delete').required(),
  notes: Joi.string().max(500).optional()
});

/**
 * 创建评价
 */
const createReview = asyncHandler(async (req, res) => {
  const validatedData = validateRequest(CREATE_SCHEMA, req.body);
  const review = await reviewsService.createReview(validatedData, req.user);
  success(res, review, '评价创建成功', 201);
});

/**
 * 获取评价详情
 */
const getReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeUser = 'true', includeBook = 'true' } = req.query;

  const review = await reviewsService.getReviewById(
    parseIntParam(id),
    {
      includeUser: parseBoolParam(includeUser, true),
      includeBook: parseBoolParam(includeBook, true)
    }
  );

  success(res, review, '获取评价详情成功');
});

/**
 * 更新评价
 */
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = validateRequest(UPDATE_SCHEMA, req.body);

  const review = await reviewsService.updateReview(
    parseIntParam(id),
    validatedData,
    req.user
  );

  success(res, review, '评价更新成功');
});

/**
 * 删除评价
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await reviewsService.deleteReview(parseIntParam(id), req.user);
  success(res, result, '评价删除成功');
});

/**
 * 获取图书的评价列表
 * GET /api/v1/books/:bookId/reviews
 */
const getBookReviews = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = 'helpful',
    status = 'published',
    includeUser = 'true',
  } = req.query;

  const result = await reviewsService.getBookReviews(
    parseIntParam(bookId),
    {
      page: parseIntParam(page, 1),
      limit: Math.min(parseIntParam(limit, 20), 100),
      sortBy,
      status,
      includeUser: parseBoolParam(includeUser, true),
    }
  );

  // 包装数据：reviews和statistics一起返回
  const responseData = {
    reviews: result.reviews,
    statistics: result.statistics
  };

  successWithPagination(
    res,
    responseData,
    result.pagination,
    '获取图书评价列表成功'
  );
});

/**
 * 获取用户的评价列表
 * GET /api/v1/users/:userId/reviews
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 20,
    status = 'published',
    includeBook = 'true',
  } = req.query;

  const result = await reviewsService.getUserReviews(
    parseIntParam(userId),
    {
      page: parseIntParam(page, 1),
      limit: Math.min(parseIntParam(limit, 20), 100),
      status,
      includeBook: parseBoolParam(includeBook, true),
      requestingUser: req.user,
    }
  );

  successWithPagination(
    res,
    result.reviews,
    result.pagination,
    '获取用户评价列表成功'
  );
});

/**
 * 搜索评价
 * GET /api/v1/reviews/search
 */
const searchReviews = asyncHandler(async (req, res) => {
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
    bookId: parseIntParam(bookId),
    userId: parseIntParam(userId),
    rating: parseIntParam(rating),
    status,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : null,
    sortBy,
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
  });

  success(res, result, '搜索评价成功');
});

/**
 * 获取图书评分统计
 * GET /api/v1/books/:bookId/reviews/stats
 */
const getBookRatingStats = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const stats = await reviewsService.getBookRatingStats(parseIntParam(bookId));
  success(res, stats, '获取图书评分统计成功');
});

/**
 * 标记评价为有用/无用
 * POST /api/v1/reviews/:id/helpful
 */
const markReviewHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = validateRequest(HELPFUL_SCHEMA, req.body);

  const review = await reviewsService.markReviewHelpful(
    parseIntParam(id),
    validatedData.helpful,
    req.user
  );

  success(res, review, '评价反馈成功');
});

/**
 * 审核评价（管理员功能）
 * POST /api/v1/reviews/:id/moderate
 */
const moderateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = validateRequest(MODERATE_SCHEMA, req.body);

  const review = await reviewsService.moderateReview(
    parseIntParam(id),
    validatedData,
    req.user
  );

  success(res, review, '评价审核成功');
});

/**
 * 获取评价统计信息
 * GET /api/v1/reviews/statistics
 */
const getReviewStatistics = asyncHandler(async (req, res) => {
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
const getRecommendedReviews = asyncHandler(async (req, res) => {
  const {
    limit = 10,
    minRating = 4,
    minHelpfulScore = 70,
  } = req.query;

  const reviews = await reviewsService.getRecommendedReviews({
    limit: Math.min(parseIntParam(limit, 10), 50),
    minRating: parseIntParam(minRating, 4),
    minHelpfulScore: parseIntParam(minHelpfulScore, 70),
  });

  success(res, reviews, '获取推荐评价成功');
});

/**
 * 获取待审核评价列表（管理员功能）
 * GET /api/v1/reviews/pending
 */
const getPendingReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'newest',
  } = req.query;

  const result = await reviewsService.getPendingReviews(
    {
      page: parseIntParam(page, 1),
      limit: Math.min(parseIntParam(limit, 20), 100),
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
const batchProcessReviews = asyncHandler(async (req, res) => {
  const validatedData = validateRequest(BATCH_SCHEMA, req.body);

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
const checkCanReview = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { userId } = req.query;

  const targetUserId = parseIntParam(userId) || req.user.id;

  // 权限检查：只有用户本人或管理员可以查询
  if (targetUserId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '权限不足' });
  }

  const result = await reviewsService.checkCanReview(targetUserId, parseIntParam(bookId));
  success(res, result, '检查评价权限成功');
});

/**
 * 获取我的评价列表
 * GET /api/v1/reviews/my
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    includeBook = 'true',
  } = req.query;

  const result = await reviewsService.getUserReviews(
    req.user.id,
    {
      page: parseIntParam(page, 1),
      limit: Math.min(parseIntParam(limit, 20), 100),
      status,
      includeBook: parseBoolParam(includeBook, true),
      requestingUser: req.user,
    }
  );

  successWithPagination(
    res,
    result.reviews,
    result.pagination,
    '获取我的评价列表成功'
  );
});

/**
 * 获取评价总览信息（用于仪表板）
 * GET /api/v1/reviews/overview
 */
const getReviewOverview = asyncHandler(async (req, res) => {
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

/**
 * 获取评价列表（通用接口）
 * GET /api/v1/reviews
 */
const getReviewList = asyncHandler(async (req, res) => {
  const cleanedParams = cleanParams(req.query, 'reviews');
  const {
    page = 1,
    limit = 20,
    sortBy = 'newest',
    status,
  } = cleanedParams;

  const result = await reviewsService.getReviewList({
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    sortBy,
    status,
    ...cleanedParams
  });

  successWithPagination(
    res,
    result.reviews,
    result.pagination,
    '获取评价列表成功'
  );
});

module.exports = {
  createReview,
  getReview,
  getReviewList,
  updateReview,
  deleteReview,
  getBookReviews,
  getUserReviews,
  searchReviews,
  getBookRatingStats,
  markReviewHelpful,
  moderateReview,
  getReviewStatistics,
  getRecommendedReviews,
  getPendingReviews,
  batchProcessReviews,
  checkCanReview,
  getMyReviews,
  getReviewOverview
};