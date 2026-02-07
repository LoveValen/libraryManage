const prisma = require('../utils/prisma');

class BookCategoryService {
  /**
   * Find all categories with optional pagination
   */
  static async findAll(options = {}) {
    const {
      includeBookCount = false,
      orderBy = 'sortOrder',
      order = 'asc'
    } = options;

    const include = includeBookCount ? {
      _count: {
        select: {
          books: {
            where: { isDeleted: false }
          }
        }
      }
    } : undefined;

    return prisma.book_categories.findMany({
      orderBy: { [orderBy]: order },
      include
    });
  }

  /**
   * Find category by ID
   */
  static async findById(id, includeBooks = false) {
    const include = includeBooks ? {
      books: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      _count: {
        select: {
          books: {
            where: { isDeleted: false }
          }
        }
      }
    } : undefined;

    return prisma.book_categories.findUnique({
      where: { id },
      include
    });
  }

  /**
   * Find category by name
   */
  static async findByName(name) {
    return prisma.book_categories.findFirst({
      where: { name }
    });
  }

  /**
   * Find category by name with stats
   */
  static async findByNameWithStats(name) {
    const category = await prisma.book_categories.findFirst({
      where: { name },
      include: {
        _count: {
          select: {
            books: {
              where: { isDeleted: false }
            }
          }
        },
        books: {
          where: { isDeleted: false },
          select: {
            status: true,
            hasEbook: true
          }
        }
      }
    });

    if (!category) return null;

    const stats = {
      total: category._count.books,
      available: 0,
      borrowed: 0,
      hasEbook: 0
    };

    category.books.forEach(book => {
      if (book.status === 'available') stats.available++;
      if (book.status === 'borrowed') stats.borrowed++;
      if (book.hasEbook) stats.hasEbook++;
    });

    // Remove the books array from response
    const { books, ...categoryData } = category;

    return {
      ...categoryData,
      stats
    };
  }

  /**
   * Create new category
   */
  static async create(categoryData) {
    // Get max sort order
    const maxSortOrder = await prisma.book_categories.aggregate({
      _max: {
        sortOrder: true
      }
    });

    const now = new Date();
    return prisma.book_categories.create({
      data: {
        ...categoryData,
        sortOrder: categoryData.sortOrder || ((maxSortOrder._max.sortOrder || 0) + 1),
        createdAt: now,
        updatedAt: now
      }
    });
  }

  /**
   * Update category
   */
  static async update(id, updateData) {
    return prisma.book_categories.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Delete category
   */
  static async delete(id) {
    // Check if category has books
    const bookCount = await prisma.books.count({
      where: {
        categoryId: id,
        isDeleted: false
      }
    });

    if (bookCount > 0) {
      throw new Error(`Cannot delete category. ${bookCount} books are still associated with this category.`);
    }

    return prisma.book_categories.delete({
      where: { id }
    });
  }

  /**
   * Get categories with book statistics
   */
  static async getCategoriesWithStats() {
    const categories = await prisma.book_categories.findMany({
      include: {
        _count: {
          select: {
            books: {
              where: { isDeleted: false }
            }
          }
        },
        books: {
          where: { isDeleted: false },
          select: {
            status: true,
            hasEbook: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return categories.map(category => {
      const stats = {
        total: category._count.books,
        available: 0,
        borrowed: 0,
        hasEbook: 0
      };

      category.books.forEach(book => {
        if (book.status === 'available') stats.available++;
        if (book.status === 'borrowed') stats.borrowed++;
        if (book.hasEbook) stats.hasEbook++;
      });

      // Remove the books array from response
      const { books, ...categoryData } = category;

      return {
        ...categoryData,
        stats
      };
    });
  }

  /**
   * Update sort order for multiple categories
   */
  static async updateSortOrders(updates) {
    const operations = updates.map(update =>
      prisma.book_categories.update({
        where: { id: update.id },
        data: { sortOrder: update.sortOrder }
      })
    );

    return prisma.$transaction(operations);
  }

  /**
   * Search categories by name
   */
  static async search(query) {
    return prisma.book_categories.findMany({
      where: {
        name: {
          contains: query
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  /**
   * Get popular categories (based on book count)
   */
  static async getPopularCategories(limit = 5) {
    const categories = await prisma.book_categories.findMany({
      include: {
        _count: {
          select: {
            books: {
              where: { isDeleted: false }
            }
          }
        }
      }
    });

    // Sort by book count and take top N
    return categories
      .sort((a, b) => b._count.books - a._count.books)
      .slice(0, limit);
  }

  /**
   * Check if category name exists
   */
  static async isNameExists(name, excludeId = null) {
    const where = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.book_categories.count({ where });
    return count > 0;
  }
}

module.exports = BookCategoryService;