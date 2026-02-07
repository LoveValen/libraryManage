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
      userId,
      bookId,
      status = 'published',
      rating,
      isRecommended,
      orderBy = 'createdAt',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (userId) where.userId = parseInt(userId);
    if (bookId) where.bookId = parseInt(bookId);
    if (status) where.status = status;
    if (rating) where.rating = parseInt(rating);
    if (isRecommended !== undefined) where.isRecommended = isRecommended;

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
        userId_bookId: {
          userId: parseInt(userId),
          bookId: parseInt(bookId)
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
    const existingReview = await this.findByUserAndBook(reviewData.userId, reviewData.bookId);
    if (existingReview) {
      throw new Error('User has already reviewed this book');
    }

    // Verify user has borrowed the book
    if (reviewData.requireBorrowVerification) {
      const borrow = await client.borrows.findFirst({
        where: {
          userId: reviewData.userId,
          bookId: reviewData.bookId,
          status: 'returned'
        }
      });

      if (!borrow) {
        throw new Error('User must borrow and return the book before reviewing');
      }

      reviewData.borrowId = borrow.id;
      reviewData.isVerifiedPurchase = true;
    }

    const review = await client.reviews.create({
      data: {
        userId: reviewData.userId,
        bookId: reviewData.bookId,
        borrowId: reviewData.borrowId,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        tags: reviewData.tags || [],
        isRecommended: reviewData.isRecommended !== false,
        isVerifiedPurchase: reviewData.isVerifiedPurchase || false,
        spoilerAlert: reviewData.spoilerAlert || false,
        language: reviewData.language || 'zh-CN',
        readingProgress: reviewData.readingProgress,
        readingTime: reviewData.readingTime,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        reviewer: true,
        book: true
      }
    });

    // Update book rating
    await BookService.updateRating(reviewData.bookId);

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
        updatedAt: new Date()
      },
      include: {
        reviewer: true,
        book: true
      }
    });

    // Update book rating if rating changed
    if (updateData.rating !== undefined) {
      await BookService.updateRating(review.bookId);
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
        deletedAt: new Date(),
        status: 'deleted',
        updatedAt: new Date()
      }
    });

    // Update book rating
    await BookService.updateRating(review.bookId);

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
        moderatorId: moderationData.moderatorId,
        moderatorNotes: moderationData.notes,
        moderatedAt: new Date(),
        updatedAt: new Date()
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
    const field = isHelpful ? 'helpfulCount' : 'unhelpfulCount';

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
      sortBy = 'helpfulCount',
      order = 'desc'
    } = options;

    const where = {
      bookId: parseInt(bookId),
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
        bookId: parseInt(bookId),
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

    const where = { userId: parseInt(userId) };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
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
      by: ['bookId'],
      where: { ...where, status: 'published' },
      _count: {
        bookId: true
      },
      orderBy: {
        _count: {
          bookId: 'desc'
        }
      },
      take: 5
    });

    // Get book details for top books
    const bookIds = topBooks.map(item => item.bookId);
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
        book: bookMap[item.bookId],
        reviewCount: item._count.bookId
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
        moderatorId: moderationData.moderatorId,
        moderatorNotes: moderationData.notes,
        moderatedAt: new Date(),
        updatedAt: new Date()
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
          userId: parseInt(userId),
          bookId: parseInt(bookId),
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