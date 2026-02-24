const ReviewService = require('./review.service');
const UserService = require('./user.service');
const BookService = require('./book.service');
const prisma = require('../utils/prisma');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

/**
 * Reviews service adapter for Prisma
 * Maintains compatibility with existing controller interface
 */
class ReviewsService {
  /**
   * Create review
   */
  async createReview(reviewData, user) {
    const { bookId, rating, title, content, tags, isRecommended, spoilerAlert } = reviewData;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Check if user can review
    const canReview = await ReviewService.canUserReview(user.id, bookId, true);
    if (!canReview.canReview) {
      throw new BadRequestError(canReview.reason);
    }

    const review = await ReviewService.create({
      userId: user.id,
      bookId: bookId,
      rating,
      title,
      content,
      tags: tags || [],
      is_recommended: isRecommended !== false,
      spoiler_alert: spoilerAlert || false,
      require_borrow_verification: true
    });

    logBusinessOperation({
      operation: 'review_created',
      userId: user.id,
      details: {
        reviewId: review.id,
        bookId,
        rating
      }
    });

    return this.formatReviewResponse(review);
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId, options = {}) {
    const review = await ReviewService.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    return this.formatReviewResponse(review);
  }

  /**
   * Update review
   */
  async updateReview(reviewId, updateData, user) {
    const review = await ReviewService.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Check permissions
    if (user.role !== USER_ROLES.ADMIN && review.userId !== user.id) {
      throw new ForbiddenError('You can only edit your own reviews');
    }

    // Validate rating if provided
    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const updatedReview = await ReviewService.update(reviewId, {
      rating: updateData.rating,
      title: updateData.title,
      content: updateData.content,
      tags: updateData.tags,
      is_recommended: updateData.isRecommended,
      spoiler_alert: updateData.spoilerAlert
    });

    logBusinessOperation({
      operation: 'review_updated',
      userId: user.id,
      details: {
        reviewId,
        changes: Object.keys(updateData)
      }
    });

    return this.formatReviewResponse(updatedReview);
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId, user) {
    const review = await ReviewService.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Check permissions
    if (user.role !== USER_ROLES.ADMIN && review.userId !== user.id) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await ReviewService.softDelete(reviewId);

    logBusinessOperation({
      operation: 'review_deleted',
      userId: user.id,
      details: {
        reviewId,
        bookId: review.bookId
      }
    });

    return {
      message: 'Review deleted successfully'
    };
  }

  /**
   * Get book reviews
   */
  async getBookReviews(bookId, options = {}) {
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = 'helpful_count',
      sortOrder = 'desc'
    } = options;

    const result = await ReviewService.getBookReviews(bookId, {
      page: parseInt(page),
      limit: parseInt(limit),
      rating,
      sortBy,
      order: sortOrder
    });

    return {
      reviews: result.reviews.map(review => this.formatReviewResponse(review)),
      pagination: result.pagination,
      statistics: result.statistics
    };
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId, options = {}) {
    const result = await ReviewService.getUserReviews(userId, options);

    return {
      reviews: result.data.map(review => this.formatReviewResponse(review)),
      pagination: result.pagination
    };
  }

  /**
   * Search reviews
   */
  async searchReviews(searchParams) {
    const {
      query,
      bookId,
      userId,
      rating,
      status = 'published',
      page = 1,
      limit = 20
    } = searchParams;

    const where = { status };
    
    if (bookId) where.bookId = parseInt(bookId);
    if (userId) where.userId = parseInt(userId);
    if (rating) where.rating = parseInt(rating);
    
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { content: { contains: query } }
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: true,
          book: true
        }
      }),
      prisma.reviews.count({ where })
    ]);

    return {
      reviews: reviews.map(review => this.formatReviewResponse(review)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get book rating statistics
   */
  async getBookRatingStats(bookId) {
    const book = await BookService.findById(bookId);
    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const ratingDistribution = await prisma.reviews.groupBy({
      by: ['rating'],
      where: {
        bookId: parseInt(bookId),
        status: 'published'
      },
      _count: {
        rating: true
      }
    });

    const stats = {
      averageRating: book.averageRating,
      totalReviews: book.reviewCount,
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    };

    ratingDistribution.forEach(item => {
      stats.ratingDistribution[item.rating] = item._count.rating;
    });

    // Calculate percentages
    if (stats.totalReviews > 0) {
      Object.keys(stats.ratingDistribution).forEach(rating => {
        const count = stats.ratingDistribution[rating];
        stats.ratingDistribution[rating] = {
          count,
          percentage: ((count / stats.totalReviews) * 100).toFixed(1)
        };
      });
    }

    return stats;
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId, isHelpful, user) {
    const review = await ReviewService.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Prevent self-voting
    if (review.userId === user.id) {
      throw new BadRequestError('Cannot vote on your own review');
    }

    await ReviewService.markHelpfulness(reviewId, isHelpful);

    logBusinessOperation({
      operation: 'review_helpfulness_marked',
      userId: user.id,
      details: {
        reviewId,
        isHelpful
      }
    });

    return {
      message: `Review marked as ${isHelpful ? 'helpful' : 'unhelpful'}`
    };
  }

  /**
   * Moderate review
   */
  async moderateReview(reviewId, moderationData, moderator) {
    const review = await ReviewService.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const moderatedReview = await ReviewService.moderate(reviewId, {
      status: moderationData.status,
      moderator_id: moderator.id,
      notes: moderationData.notes
    });

    logBusinessOperation({
      operation: 'review_moderated',
      userId: moderator.id,
      details: {
        reviewId,
        oldStatus: review.status,
        newStatus: moderationData.status
      }
    });

    return this.formatReviewResponse(moderatedReview);
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics(options = {}) {
    return await ReviewService.getStatistics(options);
  }

  /**
   * Get recommended reviews
   */
  async getRecommendedReviews(options = {}) {
    const {
      page = 1,
      limit = 10
    } = options;

    const result = await ReviewService.findWithPagination({
      page: parseInt(page),
      limit: parseInt(limit),
      status: 'published',
      is_recommended: true,
      orderBy: 'helpful_count',
      order: 'desc'
    });

    return {
      reviews: result.data.map(review => this.formatReviewResponse(review)),
      pagination: result.pagination
    };
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(options = {}, user) {
    if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.LIBRARIAN) {
      throw new ForbiddenError('Access denied');
    }

    const result = await ReviewService.findWithPagination({
      ...options,
      status: 'pending'
    });

    return {
      reviews: result.data.map(review => this.formatReviewResponse(review)),
      pagination: result.pagination
    };
  }

  /**
   * Batch process reviews
   */
  async batchProcessReviews(reviewIds, action, actionData, user) {
    const results = {
      success: [],
      failed: []
    };

    for (const reviewId of reviewIds) {
      try {
        let result;
        
        switch (action) {
          case 'approve':
            result = await this.moderateReview(reviewId, { status: 'published', ...actionData }, user);
            break;
          case 'reject':
            result = await this.moderateReview(reviewId, { status: 'rejected', ...actionData }, user);
            break;
          case 'delete':
            result = await this.deleteReview(reviewId, user);
            break;
          default:
            throw new BadRequestError(`Unknown action: ${action}`);
        }
        
        results.success.push({ reviewId, result });
      } catch (error) {
        results.failed.push({ reviewId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check if user can review
   */
  async checkCanReview(userId, bookId) {
    return await ReviewService.canUserReview(userId, bookId, true);
  }

  /**
   * Get review list (general purpose)
   */
  async getReviewList(options = {}) {
    const result = await ReviewService.findWithPagination(options);

    return {
      reviews: result.data.map(review => this.formatReviewResponse(review)),
      pagination: result.pagination
    };
  }

  /**
   * Format review response to match existing API
   */
  formatReviewResponse(review) {
    if (!review) return null;

    return {
      id: review.id,
      userId: review.userId,
      bookId: review.bookId,
      borrowId: review.borrowId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      tags: review.tags || [],
      isRecommended: review.isRecommended,
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
      status: review.status,
      moderatorId: review.moderatorId,
      moderatorNotes: review.moderatorNotes,
      moderatedAt: review.moderatedAt,
      isVerifiedPurchase: review.isVerifiedPurchase,
      readingProgress: review.readingProgress,
      readingTime: review.readingTime,
      spoilerAlert: review.spoilerAlert,
      language: review.language,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      deletedAt: review.deletedAt,
      // Relations
      user: review.reviewer ? UserService.toSafeJSON(review.reviewer) : undefined,
      book: review.book ? BookService.toSafeJSON(review.book) : undefined,
      moderator: review.moderator ? UserService.toSafeJSON(review.moderator) : undefined,
      // Add safe JSON conversion
      toSafeJSON: () => this.formatReviewResponse(review)
    };
  }
}

module.exports = new ReviewsService();