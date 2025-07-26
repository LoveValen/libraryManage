const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { BOOK_STATUS } = require('../utils/constants');

class BookService {
  /**
   * Find books with pagination and filters
   */
  static async findWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      category_id = null,
      status = null,
      has_ebook = null,
      orderBy = 'created_at',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    let where = { is_deleted: false };
    let whereConditions = ['is_deleted = FALSE'];
    let searchParams = [];

    // Add search conditions using raw SQL for MySQL compatibility
    if (search) {
      whereConditions.push('(title LIKE ? OR isbn LIKE ? OR authors LIKE ? OR publisher LIKE ?)');
      const searchTerm = `%${search}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add filters - ensure all numeric values are converted to regular numbers
    if (category_id) {
      where.category_id = Number(category_id);
    }
    if (status) {
      where.status = status;
    }
    if (has_ebook !== null) {
      where.has_ebook = Boolean(has_ebook);
    }

    // If we have search, use raw SQL for the main query
    if (search) {
      const orderClause = `ORDER BY ${orderBy} ${order.toUpperCase()}`;
      const limitClause = `LIMIT ${Number(limit)} OFFSET ${Number(skip)}`;
      
      const searchQuery = `
        SELECT b.*, bc.name as category_name, bc.description as category_description,
               (SELECT COUNT(*) FROM borrows WHERE book_id = b.id AND is_deleted = FALSE) as borrow_count,
               (SELECT COUNT(*) FROM reviews WHERE book_id = b.id AND is_deleted = FALSE) as review_count
        FROM books b
        LEFT JOIN book_categories bc ON b.category_id = bc.id
        WHERE ${whereConditions.join(' AND ')}
        ${category_id ? `AND b.category_id = ${Number(category_id)}` : ''}
        ${status ? `AND b.status = '${status}'` : ''}
        ${has_ebook !== null ? `AND b.has_ebook = ${Boolean(has_ebook) ? 1 : 0}` : ''}
        ${orderClause}
        ${limitClause}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM books b
        WHERE ${whereConditions.join(' AND ')}
        ${category_id ? `AND b.category_id = ${Number(category_id)}` : ''}
        ${status ? `AND b.status = '${status}'` : ''}
        ${has_ebook !== null ? `AND b.has_ebook = ${Boolean(has_ebook) ? 1 : 0}` : ''}
      `;

      const [books, countResult] = await Promise.all([
        prisma.$queryRawUnsafe(searchQuery, ...searchParams),
        prisma.$queryRawUnsafe(countQuery, ...searchParams)
      ]);

      const total = Number(countResult[0].total);

      return {
        data: books.map(book => ({
          ...book,
          // Convert any BigInt values to numbers
          id: Number(book.id),
          category_id: book.category_id ? Number(book.category_id) : null,
          total_stock: Number(book.total_stock || 0),
          available_stock: Number(book.available_stock || 0),
          reserved_stock: Number(book.reserved_stock || 0),
          borrow_count: Number(book.borrow_count || 0),
          reserve_count: Number(book.reserve_count || 0),
          review_count: Number(book.review_count || 0),
          view_count: Number(book.view_count || 0),
          download_count: Number(book.download_count || 0),
          // Convert boolean fields from MySQL integers
          has_ebook: Boolean(book.has_ebook),
          is_deleted: Boolean(book.is_deleted),
          bookCategory: book.category_name ? {
            id: book.category_id ? Number(book.category_id) : null,
            name: book.category_name,
            description: book.category_description
          } : null,
          _count: {
            borrows: Number(book.borrow_count || 0),
            reviews: Number(book.review_count || 0)
          }
        })),
        pagination: {
          page,
          limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    // No search - use regular Prisma query
    const [books, total] = await Promise.all([
      prisma.books.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          bookCategory: true,
          _count: {
            select: {
              borrows: true,
              reviews: true
            }
          }
        }
      }),
      prisma.books.count({ where })
    ]);

    return {
      data: books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find book by ID
   */
  static async findById(id, includeRelations = true) {
    const include = includeRelations ? {
      bookCategory: true,
      reviews: {
        where: { status: 'published' },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          reviewer: true
        }
      },
      _count: {
        select: {
          borrows: true,
          reviews: true
        }
      }
    } : undefined;

    return prisma.books.findUnique({
      where: { id },
      include
    });
  }

  /**
   * Find book by ISBN
   */
  static async findByISBN(isbn) {
    return prisma.books.findUnique({
      where: { isbn }
    });
  }

  /**
   * Create a new book
   */
  static async create(bookData) {
    return prisma.books.create({
      data: bookData,
      include: {
        bookCategory: true
      }
    });
  }

  /**
   * Update book
   */
  static async update(id, updateData) {
    return prisma.books.update({
      where: { id },
      data: updateData,
      include: {
        bookCategory: true
      }
    });
  }

  /**
   * Update book status
   */
  static async updateStatus(id, status) {
    return prisma.books.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(id) {
    return prisma.books.update({
      where: { id },
      data: {
        view_count: { increment: 1 }
      }
    });
  }

  /**
   * Increment download count
   */
  static async incrementDownloadCount(id) {
    return prisma.books.update({
      where: { id },
      data: {
        download_count: { increment: 1 }
      }
    });
  }

  /**
   * Update book stock
   */
  static async updateStock(id, stockChange, transaction = null) {
    const client = transaction || prisma;
    
    const book = await client.books.findUnique({
      where: { id }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const newAvailableStock = book.available_stock + stockChange;
    if (newAvailableStock < 0) {
      throw new Error('Insufficient stock');
    }

    return client.books.update({
      where: { id },
      data: {
        available_stock: newAvailableStock,
        status: newAvailableStock === 0 ? BOOK_STATUS.BORROWED : BOOK_STATUS.AVAILABLE
      }
    });
  }

  /**
   * Soft delete book
   */
  static async softDelete(id) {
    return prisma.books.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        status: BOOK_STATUS.RETIRED
      }
    });
  }

  /**
   * Get book statistics
   */
  static async getStatistics() {
    const [total, available, borrowed, hasEbook] = await Promise.all([
      prisma.books.count({ where: { is_deleted: false } }),
      prisma.books.count({ 
        where: { 
          status: BOOK_STATUS.AVAILABLE, 
          is_deleted: false 
        } 
      }),
      prisma.books.count({ 
        where: { 
          status: BOOK_STATUS.BORROWED, 
          is_deleted: false 
        } 
      }),
      prisma.books.count({ 
        where: { 
          has_ebook: true, 
          is_deleted: false 
        } 
      })
    ]);

    return {
      total,
      available,
      borrowed,
      hasEbook,
      borrowRate: total > 0 ? ((borrowed / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Search books
   */
  static async search(query, options = {}) {
    const { limit = 10, category_id = null } = options;

    // Use a raw query approach for more complex searching
    // because authors is a JSON field and publisher might have special characters
    const searchConditions = [];
    const params = [];
    
    searchConditions.push('title LIKE ?');
    params.push(`%${query}%`);
    
    searchConditions.push('isbn LIKE ?');
    params.push(`%${query}%`);
    
    if (query) {
      searchConditions.push('JSON_UNQUOTE(JSON_EXTRACT(authors, "$[0]")) LIKE ?');
      params.push(`%${query}%`);
    }
    
    searchConditions.push('publisher LIKE ?');
    params.push(`%${query}%`);
    
    let whereClause = `(${searchConditions.join(' OR ')}) AND is_deleted = 0 AND status = 'available'`;
    
    if (category_id) {
      whereClause += ' AND category_id = ?';
      params.push(category_id);
    }
    
    const sql = `
      SELECT * FROM books 
      WHERE ${whereClause}
      ORDER BY borrow_count DESC, average_rating DESC 
      LIMIT ?
    `;
    params.push(limit);
    
    return prisma.$queryRaw`
      SELECT * FROM books 
      WHERE (title LIKE ${`%${query}%`} 
         OR isbn LIKE ${`%${query}%`}
         OR JSON_UNQUOTE(JSON_EXTRACT(authors, "$[0]")) LIKE ${`%${query}%`}
         OR publisher LIKE ${`%${query}%`})
      AND is_deleted = 0 
      AND status = 'available'
      ${category_id ? Prisma.sql`AND category_id = ${category_id}` : Prisma.empty}
      ORDER BY borrow_count DESC, average_rating DESC 
      LIMIT ${limit}
    `;
  }

  /**
   * Get popular books
   */
  static async getPopularBooks(limit = 10) {
    return prisma.books.findMany({
      where: {
        is_deleted: false,
        status: { not: BOOK_STATUS.RETIRED }
      },
      orderBy: [
        { borrow_count: 'desc' },
        { view_count: 'desc' }
      ],
      take: limit,
      include: {
        bookCategory: true
      }
    });
  }

  /**
   * Get new arrivals
   */
  static async getNewArrivals(days = 30, limit = 10) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return prisma.books.findMany({
      where: {
        is_deleted: false,
        created_at: { gte: dateThreshold }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        bookCategory: true
      }
    });
  }

  /**
   * Get books by category
   */
  static async getByCategory(categoryId, limit = 20) {
    return prisma.books.findMany({
      where: {
        category_id: categoryId,
        is_deleted: false,
        status: { not: BOOK_STATUS.RETIRED }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        bookCategory: true
      }
    });
  }

  /**
   * Update book rating
   */
  static async updateRating(bookId) {
    const result = await prisma.reviews.aggregate({
      where: {
        book_id: bookId,
        status: 'published'
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    });

    return prisma.books.update({
      where: { id: bookId },
      data: {
        average_rating: result._avg.rating || 0,
        review_count: result._count.rating
      }
    });
  }

  /**
   * Check if ISBN exists
   */
  static async isISBNExists(isbn, excludeId = null) {
    const where = { isbn };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.books.count({ where });
    return count > 0;
  }

  /**
   * Bulk update books
   */
  static async bulkUpdate(bookIds, updateData) {
    return prisma.books.updateMany({
      where: {
        id: { in: bookIds }
      },
      data: updateData
    });
  }

  /**
   * Convert book to safe JSON (remove sensitive fields if any)
   */
  static toSafeJSON(book) {
    const safeBook = { ...book };
    // Remove any sensitive fields if needed
    return safeBook;
  }
}

module.exports = BookService;