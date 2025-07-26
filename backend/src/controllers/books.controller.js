const booksService = require('../services/books.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * 图书控制器
 * 处理所有图书相关的HTTP请求
 */
class BooksController {
  /**
   * 创建图书
   * POST /api/v1/books
   */
  createBook = asyncHandler(async (req, res) => {
    const book = await booksService.createBook(req.body, req.user);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Book created successfully',
      data: {
        book,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取图书列表
   * GET /api/v1/books
   */
  getBookList = asyncHandler(async (req, res) => {
    // 参数映射: keyword -> search, size -> limit (兼容前端)
    const mappedQuery = {
      ...req.query,
      search: req.query.keyword || req.query.search,
      limit: req.query.size || req.query.limit,
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
    
    const result = await booksService.getBookList(mappedQuery);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Books retrieved successfully',
      data: {
        books: result.books,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取管理员图书列表 (兼容前端参数)
   * GET /api/v1/admin/books
   */
  getAdminBookList = asyncHandler(async (req, res) => {
    // 字段名映射: 前端 camelCase -> 数据库 snake_case
    const fieldMapping = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'categoryId': 'category_id',
      'totalStock': 'total_stock',
      'availableStock': 'available_stock',
      'publicationYear': 'publication_year',
      'publicationDate': 'publication_date',
      'callNumber': 'call_number',
      'coverImage': 'cover_image',
      'backCoverImage': 'back_cover_image',
      'averageRating': 'average_rating',
      'reviewCount': 'review_count',
      'borrowCount': 'borrow_count',
      'viewCount': 'view_count'
    };

    // 参数映射: keyword -> search, size -> limit, sortBy -> orderBy
    const mappedQuery = {
      ...req.query,
      search: req.query.keyword || req.query.search,
      limit: req.query.size || req.query.limit,
      orderBy: req.query.sortBy ? (fieldMapping[req.query.sortBy] || req.query.sortBy) : req.query.orderBy,
      order: req.query.sortOrder || req.query.order
    };
    
    // 移除重复和无用参数
    delete mappedQuery.keyword;
    delete mappedQuery.size;
    delete mappedQuery.sortBy;
    delete mappedQuery.sortOrder;
    delete mappedQuery._t; // 移除时间戳参数
    
    // 过滤空字符串参数
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    const result = await booksService.getBookList(mappedQuery);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Admin books retrieved successfully',
      data: {
        books: result.books,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取图书详情
   * GET /api/v1/books/:id
   */
  getBookById = asyncHandler(async (req, res) => {
    const book = await booksService.getBookById(req.params.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book retrieved successfully',
      data: {
        book,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新图书信息
   * PUT /api/v1/books/:id
   */
  updateBook = asyncHandler(async (req, res) => {
    const book = await booksService.updateBook(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book updated successfully',
      data: {
        book,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 删除图书
   * DELETE /api/v1/books/:id
   */
  deleteBook = asyncHandler(async (req, res) => {
    const result = await booksService.deleteBook(req.params.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取图书分类
   * GET /api/v1/books/categories
   */
  getCategories = asyncHandler(async (req, res) => {
    const categories = await booksService.getCategories();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Categories retrieved successfully',
      data: {
        categories,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 批量导入图书
   * POST /api/v1/books/import
   */
  bulkImportBooks = asyncHandler(async (req, res) => {
    const { books } = req.body;
    
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Books array is required and cannot be empty',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await booksService.bulkImportBooks(books, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Books import completed',
      data: {
        importResult: result,
      },
      timestamp: new Date().toISOString(),
    });
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

  /**
   * 根据ISBN查找图书
   * GET /api/v1/books/isbn/:isbn
   */
  getBookByISBN = asyncHandler(async (req, res) => {
    const { isbn } = req.params;
    
    // 使用服务方法查找图书
    const BookService = require('../services/book.service');
    const book = await BookService.findByISBN(isbn);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Book not found',
        timestamp: new Date().toISOString(),
      });
    }

    // 增加访问次数
    await BookService.incrementViewCount(book.id);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Book retrieved successfully',
      data: {
        book: booksService.formatBookResponse(book),
      },
      timestamp: new Date().toISOString(),
    });
  });

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
   * 下载图书导入模板
   * GET /api/v1/books/import/template
   */
  downloadImportTemplate = asyncHandler(async (req, res) => {
    const templateBuffer = await booksService.generateImportTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="books_import_template.xlsx"');
    res.send(templateBuffer);
  });

  /**
   * 上传导入文件并预览
   * POST /api/v1/books/import/upload
   */
  uploadImportFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'No file uploaded',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await booksService.processImportFile(req.file, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'File uploaded and processed successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 验证导入数据
   * POST /api/v1/books/import/validate
   */
  validateImportData = asyncHandler(async (req, res) => {
    const { fileId } = req.body;
    const validationResult = await booksService.validateImportData(fileId, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Data validation completed',
      data: validationResult,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 执行图书数据导入
   * POST /api/v1/books/import
   */
  importBooks = asyncHandler(async (req, res) => {
    const importResult = await booksService.importBooks(req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Books import completed',
      data: importResult,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取导入历史记录
   * GET /api/v1/books/import/history
   */
  getImportHistory = asyncHandler(async (req, res) => {
    const history = await booksService.getImportHistory(req.query, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Import history retrieved successfully',
      data: history,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取导入任务状态
   * GET /api/v1/books/import/status/:taskId
   */
  getImportTaskStatus = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const status = await booksService.getImportTaskStatus(taskId, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Import task status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new BooksController();