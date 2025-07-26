const { models } = require('../models');
const { 
  NotFoundError, 
  BadRequestError, 
  ConflictError, 
  ForbiddenError 
} = require('../utils/apiError');
const { POINTS_TRANSACTION_TYPES, POINTS_RULES } = require('../utils/constants');
const pointsService = require('./points.service');

/**
 * 评价服务类
 */
class ReviewsService {
  /**
   * 创建评价
   */
  async createReview(reviewData, user) {
    const { userId, bookId, borrowId, rating, title, content, tags, isRecommended, spoilerAlert } = reviewData;

    // 验证用户权限（用户只能为自己创建评价）
    if (userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('用户只能为自己创建评价');
    }

    // 检查图书是否存在
    const book = await models.Book.findByPk(bookId);
    if (!book) {
      throw new NotFoundError('图书不存在');
    }

    // 检查用户是否已经评价过这本书
    const checkResult = await models.Review.checkCanReview(userId, bookId);
    if (!checkResult.canReview) {
      throw new ConflictError('您已经评价过这本图书了');
    }

    // 验证借阅记录（如果提供）
    let borrow = null;
    let isVerifiedPurchase = false;
    
    if (borrowId) {
      borrow = await models.Borrow.findOne({
        where: {
          id: borrowId,
          userId,
          bookId,
        },
      });
      
      if (!borrow) {
        throw new BadRequestError('借阅记录不存在或不匹配');
      }
      
      isVerifiedPurchase = ['returned', 'overdue', 'lost', 'damaged'].includes(borrow.status);
    } else {
      // 检查用户是否曾经借阅过这本书
      const pastBorrow = await models.Borrow.findOne({
        where: {
          userId,
          bookId,
          status: ['returned', 'overdue', 'lost', 'damaged'],
        },
        order: [['created_at', 'DESC']],
      });
      
      if (pastBorrow) {
        isVerifiedPurchase = true;
        borrow = pastBorrow;
      }
    }

    // 创建评价
    const review = await models.Review.create({
      userId,
      bookId,
      borrowId: borrow?.id,
      rating,
      title,
      content,
      tags: tags || [],
      isRecommended: isRecommended !== undefined ? isRecommended : rating >= 4,
      isVerifiedPurchase,
      spoilerAlert: spoilerAlert || false,
      status: 'published', // 默认发布，可以根据需要调整为需要审核
    });

    // 奖励积分
    try {
      await pointsService.addPoints(
        userId,
        POINTS_RULES.WRITE_REVIEW,
        POINTS_TRANSACTION_TYPES.WRITE_REVIEW,
        `评价图书《${book.title}》`,
        user.id,
        {
          reviewId: review.id,
          bookId,
          rating,
        }
      );
    } catch (error) {
      console.warn('奖励评价积分失败:', error.message);
    }

    // 返回完整的评价信息
    return this.getReviewById(review.id, { includeUser: true, includeBook: true });
  }

  /**
   * 获取评价详情
   */
  async getReviewById(reviewId, options = {}) {
    const { includeUser = false, includeBook = false, includeModeration = false } = options;

    const include = [];
    
    if (includeUser) {
      include.push({
        model: models.User,
        as: 'user',
        attributes: ['id', 'username', 'realName', 'avatar'],
      });
    }
    
    if (includeBook) {
      include.push({
        model: models.Book,
        as: 'book',
        attributes: ['id', 'title', 'authors', 'coverImage', 'isbn'],
      });
    }
    
    if (includeModeration) {
      include.push({
        model: models.User,
        as: 'moderator',
        attributes: ['id', 'username', 'realName'],
      });
    }

    const review = await models.Review.findByPk(reviewId, {
      include,
    });

    if (!review) {
      throw new NotFoundError('评价不存在');
    }

    return review;
  }

  /**
   * 更新评价
   */
  async updateReview(reviewId, updateData, user) {
    const review = await models.Review.findByPk(reviewId);
    if (!review) {
      throw new NotFoundError('评价不存在');
    }

    // 权限检查
    if (review.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('您只能修改自己的评价');
    }

    // 普通用户只能修改发布状态的评价
    if (user.role !== 'admin' && review.status !== 'published') {
      throw new ForbiddenError('当前状态的评价无法修改');
    }

    // 允许更新的字段
    const allowedFields = ['rating', 'title', 'content', 'tags', 'isRecommended', 'spoilerAlert'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError('没有可更新的字段');
    }

    // 如果用户修改了评价，可能需要重新审核
    if (user.role !== 'admin' && (updates.content || updates.rating)) {
      updates.status = 'published'; // 或者设置为 'pending' 需要重新审核
    }

    await review.update(updates);
    
    return this.getReviewById(reviewId, { includeUser: true, includeBook: true });
  }

  /**
   * 删除评价
   */
  async deleteReview(reviewId, user) {
    const review = await models.Review.findByPk(reviewId);
    if (!review) {
      throw new NotFoundError('评价不存在');
    }

    // 权限检查
    if (review.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('您只能删除自己的评价');
    }

    // 软删除
    await review.destroy();

    // 如果有积分奖励，可以考虑扣除（根据业务需求）
    try {
      const book = await models.Book.findByPk(review.bookId);
      await pointsService.addPoints(
        review.userId,
        -POINTS_RULES.WRITE_REVIEW,
        POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        `删除图书《${book?.title}》的评价`,
        user.id,
        {
          reviewId,
          bookId: review.bookId,
          reason: 'review_deleted',
        }
      );
    } catch (error) {
      console.warn('扣除评价积分失败:', error.message);
    }

    return { message: '评价已删除' };
  }

  /**
   * 获取图书的评价列表
   */
  async getBookReviews(bookId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'helpful',
      status = 'published',
      includeUser = true,
    } = options;

    // 验证图书存在
    const book = await models.Book.findByPk(bookId);
    if (!book) {
      throw new NotFoundError('图书不存在');
    }

    const offset = (page - 1) * limit;

    const result = await models.Review.getTopReviews(bookId, {
      limit,
      offset,
      sortBy,
      includeUser,
    });

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 获取用户的评价列表
   */
  async getUserReviews(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = 'published',
      includeBook = true,
      requestingUser,
    } = options;

    // 验证用户存在
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 权限检查 - 只有用户本人或管理员可以查看非公开状态的评价
    let finalStatus = status;
    if (requestingUser?.id !== userId && requestingUser?.role !== 'admin') {
      finalStatus = 'published';
    }

    const offset = (page - 1) * limit;

    const result = await models.Review.getUserReviews(userId, {
      limit,
      offset,
      status: finalStatus,
      includeBook,
    });

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 搜索评价
   */
  async searchReviews(searchParams) {
    const {
      query,
      bookId,
      userId,
      rating,
      status = 'published',
      tags,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = searchParams;

    const result = await models.Review.searchReviews({
      query,
      bookId,
      userId,
      rating,
      status,
      tags,
      sortBy,
      page,
      limit,
    });

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 获取图书评分统计
   */
  async getBookRatingStats(bookId) {
    // 验证图书存在
    const book = await models.Book.findByPk(bookId);
    if (!book) {
      throw new NotFoundError('图书不存在');
    }

    const [averageRating, ratingDistribution] = await Promise.all([
      models.Review.getAverageRating(bookId),
      models.Review.getRatingDistribution(bookId),
    ]);

    return {
      bookId,
      ...averageRating,
      ratingDistribution,
    };
  }

  /**
   * 标记评价为有用/无用
   */
  async markReviewHelpful(reviewId, isHelpful, user) {
    const review = await models.Review.findByPk(reviewId);
    if (!review) {
      throw new NotFoundError('评价不存在');
    }

    if (review.status !== 'published') {
      throw new BadRequestError('只能对已发布的评价进行评价');
    }

    if (review.userId === user.id) {
      throw new BadRequestError('不能对自己的评价进行评价');
    }

    // 这里可以实现更复杂的逻辑，比如记录用户的评价历史，防止重复评价等
    if (isHelpful) {
      await review.markAsHelpful();
    } else {
      await review.markAsUnhelpful();
    }

    return this.getReviewById(reviewId);
  }

  /**
   * 审核评价（管理员功能）
   */
  async moderateReview(reviewId, moderationData, moderator) {
    if (moderator.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以审核评价');
    }

    const { status, notes } = moderationData;
    
    const review = await models.Review.findByPk(reviewId);
    if (!review) {
      throw new NotFoundError('评价不存在');
    }

    await review.moderate(moderator.id, status, notes);
    
    return this.getReviewById(reviewId, { 
      includeUser: true, 
      includeBook: true, 
      includeModeration: true 
    });
  }

  /**
   * 获取评价统计信息
   */
  async getReviewStatistics(options = {}) {
    return models.Review.getStatistics(options);
  }

  /**
   * 获取推荐评价
   */
  async getRecommendedReviews(options = {}) {
    return models.Review.findRecommended(options);
  }

  /**
   * 获取待审核评价列表（管理员功能）
   */
  async getPendingReviews(options = {}, user) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以查看待审核评价');
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = options;

    const result = await models.Review.searchReviews({
      status: 'pending',
      sortBy,
      page,
      limit,
    });

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 批量操作评价（管理员功能）
   */
  async batchProcessReviews(reviewIds, action, actionData, user) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以进行批量操作');
    }

    const reviews = await models.Review.findAll({
      where: {
        id: reviewIds,
      },
    });

    if (reviews.length === 0) {
      throw new BadRequestError('没有找到要操作的评价');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const review of reviews) {
      try {
        switch (action) {
          case 'approve':
            await review.moderate(user.id, 'published', actionData.notes);
            break;
          case 'reject':
            await review.moderate(user.id, 'hidden', actionData.notes);
            break;
          case 'delete':
            await review.destroy();
            break;
          default:
            throw new BadRequestError('不支持的操作类型');
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          reviewId: review.id,
          error: error.message,
        });
      }
    }

    return {
      message: `批量操作完成，成功: ${results.success}, 失败: ${results.failed}`,
      results,
    };
  }

  /**
   * 检查用户是否可以评价指定图书
   */
  async checkCanReview(userId, bookId) {
    return models.Review.checkCanReview(userId, bookId);
  }
}

module.exports = new ReviewsService();