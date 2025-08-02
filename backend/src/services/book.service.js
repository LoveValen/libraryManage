const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { BOOK_STATUS } = require('../utils/constants');

/**
 * Book Service - 图书管理服务
 * 提供图书的增删改查、搜索、统计等功能
 */
class BookService {
  /**
   * 获取分页图书列表，支持搜索和过滤
   * @param {Object} options 查询选项
   * @returns {Promise<Object>} 分页结果
   */
  static async findWithPagination(options = {}) {
    try {
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
      const where = this._buildWhereCondition({
        search,
        category_id,
        status,
        has_ebook
      });

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
                borrows: { where: { is_deleted: false } },
                reviews: { where: { is_deleted: false, status: 'published' } }
              }
            }
          }
        }),
        prisma.books.count({ where })
      ]);

      return {
        data: books,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`获取图书列表失败: ${error.message}`);
    }
  }

  /**
   * 构建查询条件
   * @private
   */
  static _buildWhereCondition({ search, category_id, status, has_ebook }) {
    const where = { is_deleted: false };

    // 搜索条件
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        { publisher: { contains: search, mode: 'insensitive' } },
        {
          authors: {
            path: '$[*]',
            string_contains: search
          }
        }
      ];
    }

    // 分类过滤
    if (category_id) {
      where.category_id = Number(category_id);
    }

    // 状态过滤
    if (status) {
      where.status = status;
    }

    // 电子书过滤
    if (has_ebook !== null) {
      where.has_ebook = Boolean(has_ebook);
    }

    return where;
  }

  /**
   * 根据 ID 获取图书
   * @param {number} id 图书 ID
   * @param {boolean} includeRelations 是否包含关联数据
   * @returns {Promise<Object|null>} 图书信息
   */
  static async findById(id, includeRelations = true) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的图书 ID');
      }

      const include = includeRelations ? {
        bookCategory: true,
        reviews: {
          where: { 
            status: 'published',
            is_deleted: false
          },
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            reviewer: {
              select: {
                id: true,
                username: true,
                real_name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            borrows: { where: { is_deleted: false } },
            reviews: { where: { is_deleted: false, status: 'published' } }
          }
        }
      } : undefined;

      return await prisma.books.findUnique({
        where: { 
          id: Number(id),
          is_deleted: false
        },
        include
      });
    } catch (error) {
      throw new Error(`获取图书详情失败: ${error.message}`);
    }
  }

  /**
   * 根据 ISBN 获取图书
   * @param {string} isbn ISBN 号
   * @returns {Promise<Object|null>} 图书信息
   */
  static async findByISBN(isbn) {
    try {
      if (!isbn?.trim()) {
        throw new Error('无效的 ISBN');
      }

      return await prisma.books.findUnique({
        where: { 
          isbn: isbn.trim(),
          is_deleted: false
        },
        include: {
          bookCategory: true
        }
      });
    } catch (error) {
      throw new Error(`根据 ISBN 获取图书失败: ${error.message}`);
    }
  }

  /**
   * 创建新图书
   * @param {Object} bookData 图书数据
   * @returns {Promise<Object>} 创建的图书
   */
  static async create(bookData) {
    try {
      if (!bookData?.title?.trim()) {
        throw new Error('图书标题不能为空');
      }

      if (!bookData?.isbn?.trim()) {
        throw new Error('ISBN 不能为空');
      }

      // 检查 ISBN 是否已存在
      const existingBook = await this.findByISBN(bookData.isbn);
      if (existingBook) {
        throw new Error('该 ISBN 已存在');
      }

      return await prisma.books.create({
        data: {
          ...bookData,
          status: bookData.status || BOOK_STATUS.AVAILABLE,
          available_stock: bookData.total_stock || 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          bookCategory: true
        }
      });
    } catch (error) {
      throw new Error(`创建图书失败: ${error.message}`);
    }
  }

  /**
   * 更新图书信息
   * @param {number} id 图书 ID
   * @param {Object} updateData 更新数据
   * @returns {Promise<Object>} 更新后的图书
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的图书 ID');
      }

      // 检查图书是否存在
      const existingBook = await this.findById(id, false);
      if (!existingBook) {
        throw new Error('图书不存在');
      }

      // 如果更新 ISBN，检查是否已存在
      if (updateData.isbn && updateData.isbn !== existingBook.isbn) {
        const isExists = await this.isISBNExists(updateData.isbn, id);
        if (isExists) {
          throw new Error('该 ISBN 已存在');
        }
      }

      return await prisma.books.update({
        where: { id: Number(id) },
        data: {
          ...updateData,
          updated_at: new Date()
        },
        include: {
          bookCategory: true
        }
      });
    } catch (error) {
      throw new Error(`更新图书失败: ${error.message}`);
    }
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
   * 更新图书库存
   * @param {number} id 图书 ID
   * @param {number} stockChange 库存变化量（正数增加，负数减少）
   * @param {Object} transaction 事务对象
   * @returns {Promise<Object>} 更新后的图书
   */
  static async updateStock(id, stockChange, transaction = null) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的图书 ID');
      }

      if (isNaN(Number(stockChange))) {
        throw new Error('无效的库存变化量');
      }

      const client = transaction || prisma;
      
      const book = await client.books.findUnique({
        where: { 
          id: Number(id),
          is_deleted: false
        }
      });

      if (!book) {
        throw new Error('图书不存在');
      }

      const newAvailableStock = book.available_stock + Number(stockChange);
      if (newAvailableStock < 0) {
        throw new Error(`库存不足，当前可用库存: ${book.available_stock}`);
      }

      // 根据库存自动调整状态
      let newStatus = book.status;
      if (newAvailableStock === 0 && book.status === BOOK_STATUS.AVAILABLE) {
        newStatus = BOOK_STATUS.BORROWED;
      } else if (newAvailableStock > 0 && book.status === BOOK_STATUS.BORROWED) {
        newStatus = BOOK_STATUS.AVAILABLE;
      }

      return await client.books.update({
        where: { id: Number(id) },
        data: {
          available_stock: newAvailableStock,
          status: newStatus,
          updated_at: new Date()
        }
      });
    } catch (error) {
      throw new Error(`更新图书库存失败: ${error.message}`);
    }
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
   * 获取图书统计数据
   * @returns {Promise<Object>} 统计数据
   */
  static async getStatistics() {
    try {
      const [total, available, borrowed, hasEbook, reserved] = await Promise.all([
        prisma.books.count({ 
          where: { is_deleted: false } 
        }),
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
        }),
        prisma.books.count({ 
          where: { 
            status: BOOK_STATUS.RESERVED, 
            is_deleted: false 
          } 
        })
      ]);

      const borrowRate = total > 0 ? Number(((borrowed / total) * 100).toFixed(2)) : 0;
      const availabilityRate = total > 0 ? Number(((available / total) * 100).toFixed(2)) : 0;
      const ebookRate = total > 0 ? Number(((hasEbook / total) * 100).toFixed(2)) : 0;

      return {
        total,
        available,
        borrowed,
        reserved,
        hasEbook,
        borrowRate,
        availabilityRate,
        ebookRate
      };
    } catch (error) {
      throw new Error(`获取图书统计数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索图书
   * @param {string} query 搜索关键词
   * @param {Object} options 搜索选项
   * @returns {Promise<Array>} 搜索结果
   */
  static async search(query, options = {}) {
    try {
      const { limit = 10, category_id = null } = options;

      if (!query?.trim()) {
        return [];
      }

      const where = {
        is_deleted: false,
        status: BOOK_STATUS.AVAILABLE,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { isbn: { contains: query, mode: 'insensitive' } },
          { publisher: { contains: query, mode: 'insensitive' } },
          {
            authors: {
              path: '$[*]',
              string_contains: query
            }
          }
        ]
      };

      if (category_id) {
        where.category_id = Number(category_id);
      }

      return await prisma.books.findMany({
        where,
        orderBy: [
          { borrow_count: 'desc' },
          { average_rating: 'desc' },
          { view_count: 'desc' }
        ],
        take: Number(limit),
        include: {
          bookCategory: true
        }
      });
    } catch (error) {
      throw new Error(`搜索图书失败: ${error.message}`);
    }
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
   * 检查 ISBN 是否已存在
   * @param {string} isbn ISBN 号
   * @param {number} excludeId 排除的图书 ID
   * @returns {Promise<boolean>} 是否存在
   */
  static async isISBNExists(isbn, excludeId = null) {
    try {
      if (!isbn?.trim()) {
        return false;
      }

      const where = { 
        isbn: isbn.trim(),
        is_deleted: false
      };
      
      if (excludeId) {
        where.id = { not: Number(excludeId) };
      }

      const count = await prisma.books.count({ where });
      return count > 0;
    } catch (error) {
      throw new Error(`检查 ISBN 失败: ${error.message}`);
    }
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
   * 将图书对象转换为安全的 JSON 格式
   * @param {Object} book 图书对象
   * @returns {Object} 安全的图书数据
   */
  static toSafeJSON(book) {
    if (!book) return null;

    const safeBook = { ...book };
    
    // 移除敏感或内部字段
    delete safeBook.deleted_at;
    
    // 确保数据类型正确
    if (safeBook.id) safeBook.id = Number(safeBook.id);
    if (safeBook.category_id) safeBook.category_id = Number(safeBook.category_id);
    if (safeBook.total_stock) safeBook.total_stock = Number(safeBook.total_stock);
    if (safeBook.available_stock) safeBook.available_stock = Number(safeBook.available_stock);
    if (safeBook.reserved_stock) safeBook.reserved_stock = Number(safeBook.reserved_stock);
    if (safeBook.has_ebook !== undefined) safeBook.has_ebook = Boolean(safeBook.has_ebook);
    if (safeBook.is_deleted !== undefined) safeBook.is_deleted = Boolean(safeBook.is_deleted);
    
    return safeBook;
  }
}

module.exports = BookService;