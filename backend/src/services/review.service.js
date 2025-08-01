const prisma = require('../utils/prisma');
const BookService = require('./book.service');

class ReviewService {
  /**
   * Find reviews with pagination and filters
   */
  static async findWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      user_id,
      book_id,
      status = 'published',
      rating,
      is_recommended,
      orderBy = 'created_at',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (user_id) where.user_id = parseInt(user_id);
    if (book_id) where.book_id = parseInt(book_id);
    if (status) where.status = status;
    if (rating) where.rating = parseInt(rating);
    if (is_recommended !== undefined) where.is_recommended = is_recommended;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          reviewer: true,
          book: {
            include: {
              bookCategory: true
            }
          },
          moderator: true
        }
      }),
      prisma.reviews.count({ where })
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find review by ID
   */
  static async findById(id, includeRelations = true) {
    const include = includeRelations ? {
      reviewer: true,
      book: {
        include: {
          bookCategory: true
        }
      },
      borrow: true,
      moderator: true
    } : undefined;

    return prisma.reviews.findUnique({
      where: { id: parseInt(id) },
      include
    });
  }

  /**
   * Find review by user and book
   */
  static async findByUserAndBook(userId, bookId) {
    return prisma.reviews.findUnique({
      where: {
        uk_reviews_user_book: {
          user_id: parseInt(userId),
          book_id: parseInt(bookId)
        }
      }
    });
  }

  /**
   * Create a new review
   */
  static async create(reviewData, transaction = null) {
    const client = transaction || prisma;

    // Check if user already reviewed this book
    const existingReview = await this.findByUserAndBook(reviewData.user_id, reviewData.book_id);
    if (existingReview) {
      throw new Error('User has already reviewed this book');
    }

    // Verify user has borrowed the book
    if (reviewData.require_borrow_verification) {
      const borrow = await client.borrows.findFirst({
        where: {
          user_id: reviewData.user_id,
          book_id: reviewData.book_id,
          status: 'returned'
        }
      });

      if (!borrow) {
        throw new Error('User must borrow and return the book before reviewing');
      }

      reviewData.borrow_id = borrow.id;
      reviewData.is_verified_purchase = true;
    }

    const review = await client.reviews.create({
      data: {
        user_id: reviewData.user_id,
        book_id: reviewData.book_id,
        borrow_id: reviewData.borrow_id,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        tags: reviewData.tags || [],
        is_recommended: reviewData.is_recommended !== false,
        is_verified_purchase: reviewData.is_verified_purchase || false,
        spoiler_alert: reviewData.spoiler_alert || false,
        language: reviewData.language || 'zh-CN',
        reading_progress: reviewData.reading_progress,
        reading_time: reviewData.reading_time,
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        reviewer: true,
        book: true
      }
    });

    // Update book rating
    await BookService.updateRating(reviewData.book_id);

    return review;
  }

  /**
   * Update review
   */
  static async update(id, updateData) {
    const review = await prisma.reviews.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updated_at: new Date()
      },
      include: {
        reviewer: true,
        book: true
      }
    });

    // Update book rating if rating changed
    if (updateData.rating !== undefined) {
      await BookService.updateRating(review.book_id);
    }

    return review;
  }

  /**
   * Delete review (soft delete)
   */
  static async softDelete(id) {
    const review = await prisma.reviews.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at: new Date(),
        status: 'deleted',
        updated_at: new Date()
      }
    });

    // Update book rating
    await BookService.updateRating(review.book_id);

    return review;
  }

  /**
   * Moderate review
   */
  static async moderate(id, moderationData) {
    return prisma.reviews.update({
      where: { id: parseInt(id) },
      data: {
        status: moderationData.status,
        moderator_id: moderationData.moderator_id,
        moderator_notes: moderationData.notes,
        moderated_at: new Date(),
        updated_at: new Date()
      },
      include: {
        reviewer: true,
        book: true,
        moderator: true
      }
    });
  }

  /**
   * Mark review as helpful/unhelpful
   */
  static async markHelpfulness(id, isHelpful = true) {
    const field = isHelpful ? 'helpful_count' : 'unhelpful_count';
    
    return prisma.reviews.update({
      where: { id: parseInt(id) },
      data: {
        [field]: { increment: 1 }
      }
    });
  }

  /**
   * Get reviews for a book
   */
  static async getBookReviews(bookId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'published',
      rating,
      sortBy = 'helpful_count',
      order = 'desc'
    } = options;

    const where = {
      book_id: parseInt(bookId),
      status
    };

    if (rating) where.rating = parseInt(rating);

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          reviewer: true
        }
      }),
      prisma.reviews.count({ where })
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.reviews.groupBy({
      by: ['rating'],
      where: {
        book_id: parseInt(bookId),
        status: 'published'
      },
      _count: {
        rating: true
      }
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item.rating] = item._count.rating;
          return acc;
        }, {})
      }
    };
  }

  /**
   * Get user's reviews
   */
  static async getUserReviews(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status
    } = options;

    const where = { user_id: parseInt(userId) };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          book: {
            include: {
              bookCategory: true
            }
          }
        }
      }),
      prisma.reviews.count({ where })
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get review statistics
   */
  static async getStatistics(options = {}) {
    const { startDate, endDate } = options;

    const where = {};
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [total, published, pending, rejected] = await Promise.all([
      prisma.reviews.count({ where }),
      prisma.reviews.count({ where: { ...where, status: 'published' } }),
      prisma.reviews.count({ where: { ...where, status: 'pending' } }),
      prisma.reviews.count({ where: { ...where, status: 'rejected' } })
    ]);

    // Average rating
    const avgResult = await prisma.reviews.aggregate({
      where: { ...where, status: 'published' },
      _avg: {
        rating: true
      }
    });

    // Most reviewed books
    const topBooks = await prisma.reviews.groupBy({
      by: ['book_id'],
      where: { ...where, status: 'published' },
      _count: {
        book_id: true
      },
      orderBy: {
        _count: {
          book_id: 'desc'
        }
      },
      take: 5
    });

    // Get book details for top books
    const bookIds = topBooks.map(item => item.book_id);
    const books = await prisma.books.findMany({
      where: { id: { in: bookIds } }
    });

    const bookMap = books.reduce((map, book) => {
      map[book.id] = book;
      return map;
    }, {});

    return {
      total,
      published,
      pending,
      rejected,
      averageRating: avgResult._avg.rating || 0,
      topReviewedBooks: topBooks.map(item => ({
        book: bookMap[item.book_id],
        reviewCount: item._count.book_id
      }))
    };
  }

  /**
   * Batch moderate reviews
   */
  static async batchModerate(reviewIds, moderationData) {
    return prisma.reviews.updateMany({
      where: {
        id: { in: reviewIds.map(id => parseInt(id)) }
      },
      data: {
        status: moderationData.status,
        moderator_id: moderationData.moderator_id,
        moderator_notes: moderationData.notes,
        moderated_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Check if user can review book
   */
  static async canUserReview(userId, bookId, requireBorrow = false) {
    // Check if user already reviewed
    const existingReview = await this.findByUserAndBook(userId, bookId);
    if (existingReview) {
      return {
        canReview: false,
        reason: 'User has already reviewed this book'
      };
    }

    // Check if borrow is required
    if (requireBorrow) {
      const borrow = await prisma.borrows.findFirst({
        where: {
          user_id: parseInt(userId),
          book_id: parseInt(bookId),
          status: 'returned'
        }
      });

      if (!borrow) {
        return {
          canReview: false,
          reason: 'User must borrow and return the book before reviewing'
        };
      }
    }

    return {
      canReview: true,
      reason: null
    };
  }
}

module.exports = ReviewService;