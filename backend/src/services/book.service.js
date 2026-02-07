const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { BOOK_STATUS } = require('../utils/constants');

/**
 * 构建查询条件
 * @private
 */
const _buildWhereCondition = ({ search, categoryId, status, hasEbook, locationId, startDate, endDate }) => {
  const where = { isDeleted: false };

  // 搜索条件
  const normalizedSearch = typeof search === 'string' ? search.trim() : '';
  if (normalizedSearch) {
    where.OR = [
      { title: { contains: normalizedSearch } },
      { isbn: { contains: normalizedSearch } },
      { publisher: { contains: normalizedSearch } },
      {
        authors: {
          path: '$[*]',
          string_contains: normalizedSearch
        }
      }
    ];
  }

  // 分类过滤
  if (categoryId) {
    where.categoryId = Number(categoryId);
  }

  // 状态过滤
  if (status) {
    where.status = status;
  }

  // 电子书过滤
  if (hasEbook !== null) {
    where.hasEbook = Boolean(hasEbook);
  }

  if (locationId) {
    where.locationId = Number(locationId);
  }

  // 日期范围过滤
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  return where;
};

/**
 * 获取分页图书列表，支持搜索和过滤
 * @param {Object} options 查询选项
 * @returns {Promise<Object>} 分页结果
 */
const findWithPagination = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      categoryId = null,
      status = null,
      hasEbook = null,
      locationId = null,
      orderBy = 'createdAt',
      order = 'desc',
      startDate = null,
      endDate = null
    } = options;

    const skip = (page - 1) * limit;
    const where = _buildWhereCondition({
      search,
      categoryId,
      status,
      hasEbook,
      locationId,
      startDate,
      endDate
    });

    const [books, total] = await Promise.all([
      prisma.books.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          bookCategory: true,
          bookLocation: true,
          bookTagRelations: {
            include: { tag: true }
          },
          _count: {
            select: {
              borrows: { where: { isDeleted: false } },
              reviews: { where: { status: 'published' } }
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
};

/**
 * 根据 ID 获取图书
 * @param {number} id 图书 ID
 * @param {boolean} includeRelations 是否包含关联数据
 * @returns {Promise<Object|null>} 图书信息
 */
const findById = async (id, includeRelations = true) => {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('无效的图书 ID');
    }

    const include = includeRelations ? {
      bookCategory: true,
      bookLocation: true,
      bookTagRelations: {
        include: { tag: true }
      },
      reviews: {
        where: {
          status: 'published'
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              realName: true,
              avatar: true
            }
          }
        }
      },
      _count: {
        select: {
          borrows: { where: { isDeleted: false } },
          reviews: { where: { status: 'published' } }
        }
      }
    } : undefined;

    return await prisma.books.findUnique({
      where: {
        id: Number(id),
        isDeleted: false
      },
      include
    });
  } catch (error) {
    throw new Error(`获取图书详情失败: ${error.message}`);
  }
};

/**
 * 根据 ISBN 获取图书
 * @param {string} isbn ISBN 号
 * @returns {Promise<Object|null>} 图书信息
 */
const findByISBN = async (isbn) => {
  try {
    if (!isbn?.trim()) {
      throw new Error('无效的 ISBN');
    }

    return await prisma.books.findUnique({
      where: {
        isbn: isbn.trim(),
        isDeleted: false
      },
      include: {
        bookCategory: true
      }
    });
  } catch (error) {
    throw new Error(`根据 ISBN 获取图书失败: ${error.message}`);
  }
};

/**
 * 创建新图书
 * @param {Object} bookData 图书数据
 * @returns {Promise<Object>} 创建的图书
 */
const create = async (bookData) => {
  try {
    if (!bookData?.title?.trim()) {
      throw new Error('图书标题不能为空');
    }

    if (!bookData?.isbn?.trim()) {
      throw new Error('ISBN 不能为空');
    }

    // 检查 ISBN 是否已存在
    const existingBook = await findByISBN(bookData.isbn);
    if (existingBook) {
      throw new Error('该 ISBN 已存在');
    }

    const locationIdCandidate = typeof bookData.locationId === 'number' ? bookData.locationId
      : (typeof bookData.locationId === 'string' && bookData.locationId.trim() !== '' ? Number(bookData.locationId) : null);
    const locationId = typeof bookData.location_id === 'number' ? bookData.location_id
      : (locationIdCandidate !== null && !Number.isNaN(locationIdCandidate) ? Number(locationIdCandidate) : null);
    let resolvedLocation = bookData.location || null;
    if (locationId) {
      const locationRecord = await prisma.book_locations.findUnique({ where: { id: Number(locationId) } });
      if (!locationRecord) {
        throw new Error('指定的存放位置不存在');
      }
      resolvedLocation = locationRecord.name;
    }

    // Build Prisma data with camelCase field names
    const prismaData = {
      title: bookData.title,
      isbn: bookData.isbn,
      authors: bookData.authors,
      publisher: bookData.publisher,
      publicationYear: bookData.publicationYear || bookData.publication_year,
      language: bookData.language || 'zh-CN',
      // Only set categoryId if it's a number, otherwise use null
      categoryId: typeof bookData.categoryId === 'number' ? bookData.categoryId :
                   typeof bookData.category_id === 'number' ? bookData.category_id : null,
      category: bookData.category,
      tags: bookData.tags,
      summary: bookData.summary,
      description: bookData.description,
      coverImage: bookData.coverUrl || bookData.cover_image || bookData.cover,
      totalStock: bookData.totalStock || bookData.total_stock || 1,
      availableStock: bookData.availableStock || bookData.available_stock || bookData.totalStock || bookData.total_stock || 1,
      reservedStock: bookData.reservedStock || bookData.reserved_stock || 0,
      status: bookData.status || BOOK_STATUS.AVAILABLE,
      locationId: locationId ? Number(locationId) : undefined,
      location: resolvedLocation,
      price: bookData.price,
      pages: bookData.pages,
      format: bookData.format || 'BOOK',
      hasEbook: bookData.hasEbook || bookData.has_ebook || false,
      borrowCount: bookData.borrowCount || bookData.borrow_count || 0,
      viewCount: bookData.viewCount || bookData.view_count || 0,
      averageRating: bookData.averageRating || bookData.average_rating || null,
      reviewCount: bookData.reviewCount || bookData.review_count || 0,
      condition: bookData.condition || 'new',
      notes: bookData.notes,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Remove undefined values
    Object.keys(prismaData).forEach(key => {
      if (prismaData[key] === undefined) {
        delete prismaData[key];
      }
    });

    return await prisma.books.create({
      data: prismaData,
      include: {
        bookCategory: true
      }
    });
  } catch (error) {
    throw new Error(`创建图书失败: ${error.message}`);
  }
};

/**
 * 更新图书信息
 * @param {number} id 图书 ID
 * @param {Object} updateData 更新数据
 * @returns {Promise<Object>} 更新后的图书
 */
const update = async (id, updateData) => {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('无效的图书 ID');
    }

    // 检查图书是否存在
    const existingBook = await findById(id, false);
    if (!existingBook) {
      throw new Error('图书不存在');
    }

    // 如果更新 ISBN，检查是否已存在
    if (updateData.isbn && updateData.isbn !== existingBook.isbn) {
      const isExists = await isISBNExists(updateData.isbn, id);
      if (isExists) {
        throw new Error('该 ISBN 已存在');
      }
    }

    // Build Prisma data with camelCase field names
    const prismaData = {};

    // Only include fields that are being updated
    if (updateData.title !== undefined) prismaData.title = updateData.title;
    if (updateData.isbn !== undefined) prismaData.isbn = updateData.isbn;
    if (updateData.authors !== undefined) prismaData.authors = updateData.authors;
    if (updateData.publisher !== undefined) prismaData.publisher = updateData.publisher;
    if (updateData.publicationYear !== undefined) prismaData.publicationYear = updateData.publicationYear;
    if (updateData.publication_year !== undefined) prismaData.publicationYear = updateData.publication_year;
    if (updateData.language !== undefined) prismaData.language = updateData.language;
    if (updateData.categoryId !== undefined) prismaData.categoryId = updateData.categoryId;
    if (updateData.category_id !== undefined) prismaData.categoryId = updateData.category_id;
    if (updateData.category !== undefined) prismaData.category = updateData.category;
    if (updateData.tags !== undefined) prismaData.tags = updateData.tags;
    if (updateData.summary !== undefined) prismaData.summary = updateData.summary;
    if (updateData.description !== undefined) prismaData.description = updateData.description;
    if (updateData.coverUrl !== undefined) prismaData.coverImage = updateData.coverUrl;
    if (updateData.cover_image !== undefined) prismaData.coverImage = updateData.cover_image;
    if (updateData.cover !== undefined) prismaData.coverImage = updateData.cover;
    if (updateData.totalStock !== undefined) prismaData.totalStock = updateData.totalStock;
    if (updateData.total_stock !== undefined) prismaData.totalStock = updateData.total_stock;
    if (updateData.availableStock !== undefined) prismaData.availableStock = updateData.availableStock;
    if (updateData.available_stock !== undefined) prismaData.availableStock = updateData.available_stock;
    if (updateData.reservedStock !== undefined) prismaData.reservedStock = updateData.reservedStock;
    if (updateData.reserved_stock !== undefined) prismaData.reservedStock = updateData.reserved_stock;
    if (updateData.status !== undefined) prismaData.status = updateData.status;
    if (updateData.price !== undefined) prismaData.price = updateData.price;
    if (updateData.pages !== undefined) prismaData.pages = updateData.pages;
    if (updateData.format !== undefined) prismaData.format = updateData.format;
    if (updateData.hasEbook !== undefined) prismaData.hasEbook = updateData.hasEbook;
    if (updateData.has_ebook !== undefined) prismaData.hasEbook = updateData.has_ebook;
    if (updateData.condition !== undefined) prismaData.condition = updateData.condition;
    if (updateData.notes !== undefined) prismaData.notes = updateData.notes;

    const hasLocationIdUpdate = Object.prototype.hasOwnProperty.call(updateData, 'locationId') || Object.prototype.hasOwnProperty.call(updateData, 'location_id');
    if (hasLocationIdUpdate) {
      const rawLocationId = updateData.locationId ?? updateData.location_id;
      if (rawLocationId === null || rawLocationId === '' || rawLocationId === undefined) {
        prismaData.locationId = null;
        if (updateData.location !== undefined) {
          prismaData.location = updateData.location;
        } else {
          prismaData.location = null;
        }
      } else {
        const parsedLocationId = Number(rawLocationId);
        if (Number.isNaN(parsedLocationId)) {
          throw new Error('无效的存放位置标识');
        }
        const locationRecord = await prisma.book_locations.findUnique({ where: { id: parsedLocationId } });
        if (!locationRecord) {
          throw new Error('指定的存放位置不存在');
        }
        prismaData.locationId = parsedLocationId;
        prismaData.location = locationRecord.name;
      }
    } else if (updateData.location !== undefined) {
      prismaData.location = updateData.location;
      if (updateData.location === null || updateData.location === '') {
        prismaData.locationId = null;
      }
    }

    prismaData.updatedAt = new Date();

    return await prisma.books.update({
      where: { id: Number(id) },
      data: prismaData,
      include: {
        bookCategory: true
      }
    });
  } catch (error) {
    throw new Error(`更新图书失败: ${error.message}`);
  }
};

/**
 * Update book status
 */
const updateStatus = async (id, status) => {
  return prisma.books.update({
    where: { id },
    data: { status }
  });
};

/**
 * Increment view count
 */
const incrementViewCount = async (id) => {
  return prisma.books.update({
    where: { id },
    data: {
      viewCount: { increment: 1 }
    }
  });
};

/**
 * Increment download count
 */
const incrementDownloadCount = async (id) => {
  return prisma.books.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 }
    }
  });
};

/**
 * 更新图书库存
 * @param {number} id 图书 ID
 * @param {number} stockChange 库存变化量（正数增加，负数减少）
 * @param {Object} transaction 事务对象
 * @returns {Promise<Object>} 更新后的图书
 */
const updateStock = async (id, stockChange, transaction = null) => {
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
        isDeleted: false
      }
    });

    if (!book) {
      throw new Error('图书不存在');
    }

    const newAvailableStock = book.availableStock + Number(stockChange);
    if (newAvailableStock < 0) {
      throw new Error(`库存不足，当前可用库存: ${book.availableStock}`);
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
        availableStock: newAvailableStock,
        status: newStatus,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    throw new Error(`更新图书库存失败: ${error.message}`);
  }
};

/**
 * Soft delete book
 */
const softDelete = async (id) => {
  return prisma.books.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: BOOK_STATUS.RETIRED
    }
  });
};

/**
 * 获取图书统计数据
 * @returns {Promise<Object>} 统计数据
 */
const getStatistics = async () => {
  try {
    const [total, available, borrowed, hasEbook, reserved] = await Promise.all([
      prisma.books.count({
        where: { isDeleted: false }
      }),
      prisma.books.count({
        where: {
          status: BOOK_STATUS.AVAILABLE,
          isDeleted: false
        }
      }),
      prisma.books.count({
        where: {
          status: BOOK_STATUS.BORROWED,
          isDeleted: false
        }
      }),
      prisma.books.count({
        where: {
          hasEbook: true,
          isDeleted: false
        }
      }),
      prisma.books.count({
        where: {
          status: BOOK_STATUS.RESERVED,
          isDeleted: false
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
};

/**
 * 搜索图书
 * @param {string} query 搜索关键词
 * @param {Object} options 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
const search = async (query, options = {}) => {
  try {
    const { limit = 10, categoryId = null } = options;

    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
      return [];
    }

    const where = {
      isDeleted: false,
      status: BOOK_STATUS.AVAILABLE,
      OR: [
        { title: { contains: normalizedQuery } },
        { isbn: { contains: normalizedQuery } },
        { publisher: { contains: normalizedQuery } },
        {
          authors: {
            path: '$[*]',
            string_contains: normalizedQuery
          }
        }
      ]
    };

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    return await prisma.books.findMany({
      where,
      orderBy: [
        { borrowCount: 'desc' },
        { averageRating: 'desc' },
        { viewCount: 'desc' }
      ],
      take: Number(limit),
      include: {
        bookCategory: true
      }
    });
  } catch (error) {
    throw new Error(`搜索图书失败: ${error.message}`);
  }
};

/**
 * Get popular books
 */
const getPopularBooks = async (limit = 10) => {
  return prisma.books.findMany({
    where: {
      isDeleted: false,
      status: { not: BOOK_STATUS.RETIRED }
    },
    orderBy: [
      { borrowCount: 'desc' },
      { viewCount: 'desc' }
    ],
    take: limit,
    include: {
      bookCategory: true
    }
  });
};

/**
 * Get new arrivals
 */
const getNewArrivals = async (days = 30, limit = 10) => {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return prisma.books.findMany({
    where: {
      isDeleted: false,
      createdAt: { gte: dateThreshold }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bookCategory: true
    }
  });
};

/**
 * Get books by category
 */
const getByCategory = async (categoryId, limit = 20) => {
  return prisma.books.findMany({
    where: {
      categoryId: categoryId,
      isDeleted: false,
      status: { not: BOOK_STATUS.RETIRED }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bookCategory: true
    }
  });
};

/**
 * Update book rating
 */
const updateRating = async (bookId) => {
  const result = await prisma.reviews.aggregate({
    where: {
      bookId: bookId,
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
      averageRating: result._avg.rating || 0,
      reviewCount: result._count.rating
    }
  });
};

/**
 * 检查 ISBN 是否已存在
 * @param {string} isbn ISBN 号
 * @param {number} excludeId 排除的图书 ID
 * @returns {Promise<boolean>} 是否存在
 */
const isISBNExists = async (isbn, excludeId = null) => {
  try {
    if (!isbn?.trim()) {
      return false;
    }

    const where = {
      isbn: isbn.trim(),
      isDeleted: false
    };

    if (excludeId) {
      where.id = { not: Number(excludeId) };
    }

    const count = await prisma.books.count({ where });
    return count > 0;
  } catch (error) {
    throw new Error(`检查 ISBN 失败: ${error.message}`);
  }
};

/**
 * Bulk update books
 */
const bulkUpdate = async (bookIds, updateData) => {
  return prisma.books.updateMany({
    where: {
      id: { in: bookIds }
    },
    data: updateData
  });
};

/**
 * 将图书对象转换为安全的 JSON 格式
 * @param {Object} book 图书对象
 * @returns {Object} 安全的图书数据
 */
const toSafeJSON = (book) => {
  if (!book) return null;

  const safeBook = { ...book };

  // 移除敏感或内部字段
  delete safeBook.deletedAt;

  // 确保数据类型正确
  if (safeBook.id) safeBook.id = Number(safeBook.id);
  if (safeBook.categoryId) safeBook.categoryId = Number(safeBook.categoryId);
  if (safeBook.totalStock) safeBook.totalStock = Number(safeBook.totalStock);
  if (safeBook.availableStock) safeBook.availableStock = Number(safeBook.availableStock);
  if (safeBook.reservedStock) safeBook.reservedStock = Number(safeBook.reservedStock);
  if (safeBook.hasEbook !== undefined) safeBook.hasEbook = Boolean(safeBook.hasEbook);
  if (safeBook.is_deleted !== undefined) safeBook.is_deleted = Boolean(safeBook.is_deleted);

  return safeBook;
};

module.exports = {
  findWithPagination,
  findById,
  findByISBN,
  create,
  update,
  updateStatus,
  incrementViewCount,
  incrementDownloadCount,
  updateStock,
  softDelete,
  getStatistics,
  search,
  getPopularBooks,
  getNewArrivals,
  getByCategory,
  updateRating,
  isISBNExists,
  bulkUpdate,
  toSafeJSON
};