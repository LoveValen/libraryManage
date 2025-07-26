const BookService = require('./book.service');
const BookCategoryService = require('./bookCategory.service');
const prisma = require('../utils/prisma');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError,
  ForbiddenError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { BOOK_STATUS } = require('../utils/constants');

/**
 * Books service adapter for Prisma
 * Maintains compatibility with existing controller interface
 */
class BooksService {
  /**
   * Create book
   */
  async createBook(bookData, user) {
    // Check if ISBN already exists
    const existingBook = await BookService.findByISBN(bookData.isbn);
    if (existingBook) {
      throw new ConflictError('Book with this ISBN already exists');
    }

    // Set default values
    const bookToCreate = {
      ...bookData,
      available_stock: bookData.totalStock || bookData.available_stock || 0,
      total_stock: bookData.totalStock || bookData.total_stock || 0,
      status: BOOK_STATUS.AVAILABLE,
      category_id: bookData.category_id || bookData.category || null,
      authors: Array.isArray(bookData.authors) ? bookData.authors : [bookData.authors || bookData.author],
      tags: bookData.tags || [],
      publication_year: bookData.publicationYear || bookData.publication_year,
      cover_url: bookData.coverUrl || bookData.cover_url,
      has_ebook: bookData.hasEbook || bookData.has_ebook || false,
      ebook_url: bookData.ebookUrl || bookData.ebook_url,
      ebook_format: bookData.ebookFormat || bookData.ebook_format,
      average_rating: 0,
      borrow_count: 0,
      review_count: 0,
      view_count: 0,
      download_count: 0
    };

    const book = await BookService.create(bookToCreate);

    logBusinessOperation({
      operation: 'book_created',
      userId: user.id,
      details: {
        bookId: book.id,
        isbn: book.isbn,
        title: book.title,
      },
    });

    return this.formatBookResponse(book);
  }

  /**
   * Get book list with pagination
   */
  async getBookList(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      category_id,
      author,
      publisher,
      status,
      language,
      hasEbook,
      has_ebook,
      sortBy = 'created_at',
      sortOrder = 'desc',
      minYear,
      maxYear,
    } = filters;

    const result = await BookService.findWithPagination({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category_id: category_id || category,
      status,
      has_ebook: hasEbook !== undefined ? hasEbook : has_ebook,
      orderBy: sortBy,
      order: sortOrder.toLowerCase()
    });

    return {
      books: result.data.map(book => this.formatBookResponse(book)),
      pagination: result.pagination
    };
  }

  /**
   * Get book by ID
   */
  async getBookById(bookId, user = null) {
    const book = await BookService.findById(parseInt(bookId));

    if (!book || book.is_deleted) {
      throw new NotFoundError('Book not found');
    }

    // Increment view count
    await BookService.incrementViewCount(book.id);

    // Log access
    if (user) {
      logBusinessOperation({
        operation: 'book_viewed',
        userId: user.id,
        details: {
          bookId: book.id,
          title: book.title,
        },
      });
    }

    return this.formatBookResponse(book);
  }

  /**
   * Update book
   */
  async updateBook(bookId, updateData, user) {
    const book = await BookService.findById(parseInt(bookId));

    if (!book || book.is_deleted) {
      throw new NotFoundError('Book not found');
    }

    // Check ISBN conflict
    if (updateData.isbn && updateData.isbn !== book.isbn) {
      const existingBook = await BookService.findByISBN(updateData.isbn);
      if (existingBook && existingBook.id !== book.id) {
        throw new ConflictError('Book with this ISBN already exists');
      }
    }

    // Format update data
    const formattedData = {
      ...updateData,
      authors: updateData.authors ? (Array.isArray(updateData.authors) ? updateData.authors : [updateData.authors]) : undefined,
      category_id: updateData.category_id || updateData.category,
      publication_year: updateData.publicationYear || updateData.publication_year,
      cover_url: updateData.coverUrl || updateData.cover_url,
      has_ebook: updateData.hasEbook !== undefined ? updateData.hasEbook : updateData.has_ebook,
      ebook_url: updateData.ebookUrl || updateData.ebook_url,
      ebook_format: updateData.ebookFormat || updateData.ebook_format,
      total_stock: updateData.totalStock || updateData.total_stock,
      available_stock: updateData.availableStock || updateData.available_stock
    };

    // Remove undefined values
    Object.keys(formattedData).forEach(key => {
      if (formattedData[key] === undefined) {
        delete formattedData[key];
      }
    });

    const updatedBook = await BookService.update(book.id, formattedData);

    logBusinessOperation({
      operation: 'book_updated',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        changes: Object.keys(updateData),
      },
    });

    return this.formatBookResponse(updatedBook);
  }

  /**
   * Delete book (soft delete)
   */
  async deleteBook(bookId, user) {
    const book = await BookService.findById(parseInt(bookId));

    if (!book || book.is_deleted) {
      throw new NotFoundError('Book not found');
    }

    // Check active borrows
    const activeBorrows = await prisma.borrows.count({
      where: {
        book_id: book.id,
        status: { in: ['borrowed', 'overdue'] }
      }
    });

    if (activeBorrows > 0) {
      throw new BadRequestError('Cannot delete book with active borrows');
    }

    await BookService.softDelete(book.id);

    logBusinessOperation({
      operation: 'book_deleted',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        isbn: book.isbn,
      },
    });

    return {
      message: 'Book deleted successfully',
    };
  }

  /**
   * Get categories
   */
  async getCategories() {
    const categories = await BookCategoryService.findAll({ includeBookCount: true });
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      sortOrder: cat.sort_order,
      bookCount: cat._count?.books || 0
    }));
  }

  /**
   * Bulk import books
   */
  async bulkImportBooks(booksData, user) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const [index, bookData] of booksData.entries()) {
      try {
        // Validate required fields
        if (!bookData.title || !bookData.isbn || !bookData.authors) {
          throw new ValidationError('Missing required fields: title, isbn, or authors');
        }

        // Check if ISBN exists
        const existingBook = await BookService.findByISBN(bookData.isbn);
        if (existingBook) {
          throw new ConflictError(`Book with ISBN ${bookData.isbn} already exists`);
        }

        // Create book
        await this.createBook(bookData, user);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: index + 1,
          isbn: bookData.isbn || 'N/A',
          title: bookData.title || 'N/A',
          error: error.message,
        });
      }
    }

    logBusinessOperation({
      operation: 'books_bulk_import',
      userId: user.id,
      details: {
        totalBooks: booksData.length,
        successCount: results.success,
        failedCount: results.failed,
      },
    });

    return results;
  }

  /**
   * Get popular books
   */
  async getPopularBooks(limit = 10, days = 30) {
    const books = await BookService.getPopularBooks(limit);
    return books.map(book => this.formatBookResponse(book));
  }

  /**
   * Get recent books
   */
  async getRecentBooks(limit = 10) {
    const books = await BookService.getNewArrivals(days = 30, limit);
    return books.map(book => this.formatBookResponse(book));
  }

  /**
   * Get book statistics
   */
  async getBookStatistics() {
    return await BookService.getStatistics();
  }

  /**
   * Search books
   */
  async searchBooks(query, options = {}) {
    const { limit = 10, offset = 0, category_id } = options;
    
    const books = await BookService.search(query, {
      limit: parseInt(limit),
      category_id: category_id ? parseInt(category_id) : null
    });

    const total = books.length; // For simple search, we don't have total count

    return {
      books: books.map(book => this.formatBookResponse(book)),
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update book stock
   */
  async updateBookStock(bookId, stockData, user) {
    const book = await BookService.findById(parseInt(bookId));

    if (!book || book.is_deleted) {
      throw new NotFoundError('Book not found');
    }

    const { totalStock, availableStock } = stockData;
    
    if (availableStock > totalStock) {
      throw new BadRequestError('Available stock cannot exceed total stock');
    }

    const updatedBook = await BookService.update(book.id, {
      total_stock: totalStock,
      available_stock: availableStock,
    });

    logBusinessOperation({
      operation: 'book_stock_updated',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        oldTotalStock: book.total_stock,
        newTotalStock: totalStock,
        oldAvailableStock: book.available_stock,
        newAvailableStock: availableStock,
      },
    });

    return this.formatBookResponse(updatedBook);
  }

  /**
   * Generate import template
   */
  async generateImportTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('图书导入模板');

    // Set column headers
    const headers = [
      { header: '书名*', key: 'title', width: 25 },
      { header: '作者*', key: 'author', width: 20 },
      { header: 'ISBN*', key: 'isbn', width: 15 },
      { header: '分类*', key: 'category', width: 15 },
      { header: '出版社', key: 'publisher', width: 20 },
      { header: '出版日期', key: 'publishDate', width: 12 },
      { header: '价格', key: 'price', width: 10 },
      { header: '库存数量', key: 'stock', width: 10 },
      { header: '描述', key: 'description', width: 30 },
      { header: '标签', key: 'tags', width: 20 },
      { header: '位置', key: 'location', width: 15 },
      { header: '封面图片URL', key: 'coverUrl', width: 25 }
    ];

    worksheet.columns = headers;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add sample data
    worksheet.addRow([
      '示例图书名称',
      '示例作者',
      '9787111234567',
      '计算机科学',
      '机械工业出版社',
      '2024-01-01',
      '89.00',
      '10',
      '这是一本关于编程的好书',
      'JavaScript,编程,前端',
      'A区1层3号',
      'https://example.com/cover.jpg'
    ]);

    // Add instruction sheet
    const instructionSheet = workbook.addWorksheet('使用说明');
    instructionSheet.columns = [
      { header: '字段名', key: 'field', width: 15 },
      { header: '是否必填', key: 'required', width: 10 },
      { header: '说明', key: 'description', width: 50 },
      { header: '示例', key: 'example', width: 25 }
    ];

    const instructions = [
      { field: '书名', required: '是', description: '图书的完整标题', example: '深入理解计算机系统' },
      { field: '作者', required: '是', description: '图书作者，多个作者用逗号分隔', example: '张三,李四' },
      { field: 'ISBN', required: '是', description: '图书的ISBN号码，确保唯一性', example: '9787111234567' },
      { field: '分类', required: '是', description: '图书分类，系统会自动创建不存在的分类', example: '计算机科学' },
      { field: '出版社', required: '否', description: '图书出版社名称', example: '机械工业出版社' },
      { field: '出版日期', required: '否', description: '格式：YYYY-MM-DD', example: '2024-01-01' },
      { field: '价格', required: '否', description: '图书价格，数字格式', example: '89.00' },
      { field: '库存数量', required: '否', description: '图书库存数量，默认为1', example: '10' },
      { field: '描述', required: '否', description: '图书简介或描述', example: '一本优秀的技术图书' },
      { field: '标签', required: '否', description: '图书标签，多个标签用逗号分隔', example: 'JavaScript,编程' },
      { field: '位置', required: '否', description: '图书在图书馆的位置', example: 'A区1层3号' },
      { field: '封面图片URL', required: '否', description: '图书封面图片的网络地址', example: 'https://example.com/cover.jpg' }
    ];

    instructions.forEach(instruction => {
      instructionSheet.addRow(instruction);
    });

    // Style instruction header
    const instHeaderRow = instructionSheet.getRow(1);
    instHeaderRow.font = { bold: true };
    instHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Process import file
   */
  async processImportFile(file, user) {
    // This is a complex operation that would need additional implementation
    // For now, throw not implemented error
    throw new Error('Import file processing not yet implemented in Prisma version');
  }

  /**
   * Validate import data
   */
  async validateImportData(fileId, user) {
    // This is a complex operation that would need additional implementation
    throw new Error('Import validation not yet implemented in Prisma version');
  }

  /**
   * Import books
   */
  async importBooks(importData, user) {
    // This is a complex operation that would need additional implementation
    throw new Error('Book import not yet implemented in Prisma version');
  }

  /**
   * Get import history
   */
  async getImportHistory(params, user) {
    // This would need a separate ImportFile model in Prisma
    throw new Error('Import history not yet implemented in Prisma version');
  }

  /**
   * Get import task status
   */
  async getImportTaskStatus(taskId, user) {
    // This would need a separate ImportFile model in Prisma
    throw new Error('Import task status not yet implemented in Prisma version');
  }

  /**
   * Format book response to match existing API
   */
  formatBookResponse(book) {
    if (!book) return null;

    return {
      id: book.id,
      title: book.title,
      authors: book.authors,
      isbn: book.isbn,
      category: book.category_id,
      categoryName: book.bookCategory?.name,
      publisher: book.publisher,
      publicationYear: book.publication_year,
      publishDate: book.publish_date,
      price: book.price,
      totalStock: book.total_stock,
      availableStock: book.available_stock,
      status: book.status,
      language: book.language,
      pages: book.pages,
      summary: book.summary,
      coverUrl: book.cover_url,
      location: book.location,
      tags: book.tags || [],
      hasEbook: book.has_ebook,
      ebookUrl: book.ebook_url,
      ebookFormat: book.ebook_format,
      ebookFileSize: book.ebook_file_size,
      borrowCount: book.borrow_count,
      viewCount: book.view_count,
      downloadCount: book.download_count,
      averageRating: book.average_rating,
      reviewCount: book.review_count,
      isDeleted: book.is_deleted,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
      deletedAt: book.deleted_at,
      // Add safe JSON conversion
      toSafeJSON: () => this.formatBookResponse(book)
    };
  }
}

module.exports = new BooksService();