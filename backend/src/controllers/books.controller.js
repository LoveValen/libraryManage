const booksService = require('../services/books.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, successJson } = require('../utils/response');
const { cleanParams } = require('../utils/queryHelper');
const prisma = require('../utils/prisma');
const { formatDate, formatDateTime } = require('../utils/date');

/**
 * 图书控制器 - 处理图书的增删改查、搜索等操作
 */

/**
 * 创建图书
 */
const createBook = asyncHandler(async (req, res) => {
  const book = await booksService.createBook(req.body, req.user);
  success(res, book, '图书创建成功', 201);
});

/**
 * 获取图书列表
 */
const getBookList = asyncHandler(async (req, res) => {
  const cleanedQuery = cleanParams(req.query, 'books');
  const result = await booksService.getBookList(cleanedQuery);

  successWithPagination(
    res,
    result.books,
    result.pagination,
    '获取图书列表成功'
  );
});

/**
 * 获取管理员图书列表
 */
const getAdminBookList = asyncHandler(async (req, res) => {
  const cleanedQuery = cleanParams(req.query, 'books');
  const result = await booksService.getBookList(cleanedQuery);

  successWithPagination(
    res,
    result.books,
    result.pagination,
    '获取管理员图书列表成功'
  );
});

/**
 * 获取图书详情
 */
const getBookById = asyncHandler(async (req, res) => {
  const book = await booksService.getBookById(req.params.id, req.user);
  success(res, book, '获取图书详情成功');
});

/**
 * 获取图书借阅记录
 */
const getBookBorrowHistory = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { page = 1, size = 10, search = '', status = '' } = req.query;
    
    // 构建查询条件
    const where = {
      book_id: parseInt(bookId)
    };
    
    // 状态筛选
    if (status) {
      where.status = status;
    }
    
    // 搜索条件（搜索用户名）
    if (search) {
      where.borrower = {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } }
        ]
      };
    }
    
    // 获取总数
    const total = await prisma.borrows.count({ where });
    
    // 获取借阅记录
    const borrows = await prisma.borrows.findMany({
      where,
      skip: (page - 1) * size,
      take: parseInt(size),
      include: {
        borrower: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            isbn: true
          }
        }
      },
      orderBy: {
        borrow_date: 'desc'
      }
    });

    // 简化日期格式化
    const formattedBorrows = borrows.map(record => ({
      ...record,
      borrow_date: formatDateTime(record.borrow_date),
      due_date: formatDate(record.due_date),
      return_date: record.return_date ? formatDateTime(record.return_date) : null,
      created_at: formatDateTime(record.created_at),
      updated_at: formatDateTime(record.updated_at)
    }));

    successWithPagination(
      res,
      formattedBorrows,
      { page, pageSize: size, total },
      '获取借阅记录成功'
    );
});

/**
 * 更新图书信息
 */
const updateBook = asyncHandler(async (req, res) => {
  const book = await booksService.updateBook(req.params.id, req.body, req.user);
  success(res, book, '图书更新成功');
});

/**
 * 删除图书
 */
const deleteBook = asyncHandler(async (req, res) => {
  const result = await booksService.deleteBook(req.params.id, req.user);
  success(res, null, result.message);
});

/**
 * 获取图书分类
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await booksService.getCategories();
  success(res, categories, '获取图书分类成功');
});

/**
 * 获取图书标签
 */
const getBookTags = asyncHandler(async (req, res) => {
  const tags = await booksService.getBookTags();
  success(res, tags, '获取图书标签成功');
});

/**
 * 获取图书存放位置列表
 */
const getBookLocations = asyncHandler(async (req, res) => {
  const locations = await booksService.getBookLocations();
  success(res, locations, '获取图书存放位置成功');
});

/**
 * 搜索图书
 */
const searchBooks = asyncHandler(async (req, res) => {
    // Accept multiple query parameter names to bypass validation issues
    const { q, query, search, keyword, ...options } = req.query;
    const searchQuery = q || query || search || keyword;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required (use q, query, search, or keyword parameter)',
        timestamp: formatDateTime(new Date()),
      });
    }

    const result = await booksService.searchBooks(searchQuery, options);

    successWithPagination(
      res,
      result.books,
      result.pagination,
      'Search completed successfully'
    );
});

/**
 * 获取热门图书
 */
const getPopularBooks = asyncHandler(async (req, res) => {
  const { limit = 10, days = 30 } = req.query;
  const books = await booksService.getPopularBooks(parseInt(limit), parseInt(days));

  successJson(res, {
    books,
    criteria: {
      limit: parseInt(limit),
      days: parseInt(days),
    },
  }, 'Popular books retrieved successfully');
});

/**
 * 获取最新图书
 */
const getRecentBooks = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const books = await booksService.getRecentBooks(parseInt(limit));

  successJson(res, {
    books,
    limit: parseInt(limit),
  }, 'Recent books retrieved successfully');
});

/**
 * 获取图书统计信息
 */
const getBookStatistics = asyncHandler(async (req, res) => {
  const statistics = await booksService.getBookStatistics();
  successJson(res, { statistics }, 'Book statistics retrieved successfully');
});

/**
 * 更新图书库存
 */
const updateBookStock = asyncHandler(async (req, res) => {
  const book = await booksService.updateBookStock(req.params.id, req.body, req.user);
  successJson(res, { book }, 'Book stock updated successfully');
});

/**
 * 下载电子书
 */
const downloadEbook = asyncHandler(async (req, res) => {
  const book = await booksService.getBookById(req.params.id, req.user);

  if (!book.hasEbook || !book.ebookUrl) {
    return res.status(404).json({
      success: false,
      message: 'E-book not available for this book',
      timestamp: formatDateTime(new Date()),
    });
  }

  // 增加下载次数
  const BookService = require('../services/book.service');
  await BookService.incrementDownloadCount(parseInt(req.params.id));

  successJson(res, {
    downloadUrl: book.ebookUrl,
    format: book.ebookFormat,
    fileSize: book.ebookFileSize,
    book: {
      id: book.id,
      title: book.title,
      authors: book.authors,
    },
  }, 'E-book download link retrieved successfully');
});

module.exports = {
  createBook,
  getBookList,
  getAdminBookList,
  getBookById,
  getBookBorrowHistory,
  updateBook,
  deleteBook,
  getCategories,
  getBookTags,
  getBookLocations,
  searchBooks,
  getPopularBooks,
  getRecentBooks,
  getBookStatistics,
  updateBookStock,
  downloadEbook,
};