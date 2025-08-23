const booksService = require('../services/books.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination } = require('../utils/response');

/**
 * 图书控制器 - 处理图书的增删改查、搜索等操作
 */
class BooksController {
  /**
   * 清理和映射查询参数
   * @private
   */
  _cleanQueryParams(query) {
    // 参数映射：兼容前端命名
    const mappedQuery = {
      ...query,
      search: query.keyword || query.search,
      limit: query.size || query.limit
    };
    
    // 移除重复和无用参数
    delete mappedQuery.keyword;
    delete mappedQuery.size;
    delete mappedQuery._t; // 移除时间戳参数
    
    // 过滤空字符串参数
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    return mappedQuery;
  }
  /**
   * 创建图书
   */
  createBook = asyncHandler(async (req, res) => {
    const book = await booksService.createBook(req.body, req.user);
    success(res, { book }, '图书创建成功', 201);
  });

  /**
   * 获取图书列表
   */
  getBookList = asyncHandler(async (req, res) => {
    const mappedQuery = this._cleanQueryParams(req.query);
    const result = await booksService.getBookList(mappedQuery);
    
    successWithPagination(res, result.books, result.pagination, '获取图书列表成功');
  });

  /**
   * 获取管理员图书列表
   */
  getAdminBookList = asyncHandler(async (req, res) => {
    // 字段名映射：前端 camelCase -> 数据库 snake_case
    const fieldMapping = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at', 
      'categoryId': 'category_id',
      'totalStock': 'total_stock',
      'availableStock': 'available_stock',
      'publicationYear': 'publication_year',
      'averageRating': 'average_rating',
      'reviewCount': 'review_count',
      'borrowCount': 'borrow_count',
      'viewCount': 'view_count'
    };

    const mappedQuery = this._cleanQueryParams(req.query);
    
    // 处理排序字段映射
    if (req.query.sortBy) {
      mappedQuery.orderBy = fieldMapping[req.query.sortBy] || req.query.sortBy;
    }
    if (req.query.sortOrder) {
      mappedQuery.order = req.query.sortOrder;
    }
    
    const result = await booksService.getBookList(mappedQuery);
    successWithPagination(res, result.books, result.pagination, '获取管理员图书列表成功');
  });

  /**
   * 获取图书详情
   */
  getBookById = asyncHandler(async (req, res) => {
    const book = await booksService.getBookById(req.params.id, req.user);
    success(res, { book }, '获取图书详情成功');
  });

  /**
   * 更新图书信息
   */
  updateBook = asyncHandler(async (req, res) => {
    const book = await booksService.updateBook(req.params.id, req.body, req.user);
    success(res, { book }, '图书更新成功');
  });

  /**
   * 删除图书
   */
  deleteBook = asyncHandler(async (req, res) => {
    const result = await booksService.deleteBook(req.params.id, req.user);
    success(res, null, result.message);
  });

  /**
   * 获取图书分类
   */
  getCategories = asyncHandler(async (req, res) => {
    const categories = await booksService.getCategories();
    success(res, { categories }, '获取图书分类成功');
  });

  /**
   * 搜索图书
   * GET /api/v1/books/search
   */
  searchBooks = asyncHandler(async (req, res) => {
    // Accept multiple query parameter names to bypass validation issues
    const { q, query, search, keyword, ...options } = req.query;
    const searchQuery = q || query || search || keyword;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Search query is required (use q, query, search, or keyword parameter)',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await booksService.searchBooks(searchQuery, options);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Search completed successfully',
      data: {
        books: result.books,
        pagination: result.pagination,
        query: searchQuery,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取热门图书
   * GET /api/v1/books/popular
   */
  getPopularBooks = asyncHandler(async (req, res) => {
    const { limit = 10, days = 30 } = req.query;
    const books = await booksService.getPopularBooks(parseInt(limit), parseInt(days));
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Popular books retrieved successfully',
      data: {
        books,
        criteria: {
          limit: parseInt(limit),
          days: parseInt(days),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取最新图书
   * GET /api/v1/books/recent
   */
  getRecentBooks = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const books = await booksService.getRecentBooks(parseInt(limit));
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Recent books retrieved successfully',
      data: {
        books,
        limit: parseInt(limit),
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取图书统计信息
   * GET /api/v1/books/statistics
   */
  getBookStatistics = asyncHandler(async (req, res) => {
    const statistics = await booksService.getBookStatistics();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book statistics retrieved successfully',
      data: {
        statistics,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新图书库存
   * PATCH /api/v1/books/:id/stock
   */
  updateBookStock = asyncHandler(async (req, res) => {
    const book = await booksService.updateBookStock(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book stock updated successfully',
      data: {
        book,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ISBN查询功能已移除

  /**
   * 下载电子书
   * GET /api/v1/books/:id/download
   */
  downloadEbook = asyncHandler(async (req, res) => {
    const book = await booksService.getBookById(req.params.id, req.user);
    
    if (!book.hasEbook || !book.ebookUrl) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'E-book not available for this book',
        timestamp: new Date().toISOString(),
      });
    }

    // 增加下载次数
    const BookService = require('../services/book.service');
    await BookService.incrementDownloadCount(parseInt(req.params.id));
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'E-book download link retrieved successfully',
      data: {
        downloadUrl: book.ebookUrl,
        format: book.ebookFormat,
        fileSize: book.ebookFileSize,
        book: {
          id: book.id,
          title: book.title,
          authors: book.authors,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 从外部API搜索图书
   * GET /api/v1/books/external/search
   */
  searchExternalBooks = asyncHandler(async (req, res) => {
    const { query, maxResults = 10, language = 'zh' } = req.query;
    
    const bookApiService = require('../../services/bookApiService');
    const books = await bookApiService.searchBooks(query, {
      maxResults,
      language
    });
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: `Found ${books.length} books from external sources`,
      data: {
        books,
        count: books.length
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ISBN外部查询功能已移除

  /**
   * 从外部API导入图书到系统
   * POST /api/v1/books/import
   */
  importBook = asyncHandler(async (req, res) => {
    const { bookData } = req.body;
    const bookApiService = require('../../services/bookApiService');
    
    // 直接使用用户提供的数据，不再通过ISBN自动获取
    // 验证和清理数据
    const validatedData = bookApiService.validateBookData(bookData);
    
    // 检查ISBN是否已存在
    const BookService = require('../services/book.service');
    const existingBook = await BookService.findByISBN(validatedData.isbn);
    
    if (existingBook) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Book with this ISBN already exists',
        data: {
          existingBook: booksService.formatBookResponse(existingBook)
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // 创建图书
    const newBook = await booksService.createBook(validatedData, req.user);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Book imported successfully',
      data: {
        book: newBook
      },
      timestamp: new Date().toISOString(),
    });
  });

}

module.exports = new BooksController();