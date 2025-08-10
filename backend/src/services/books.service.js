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
      availableStock: bookData.totalStock || bookData.availableStock || 0,
      totalStock: bookData.totalStock || bookData.totalStock || 0,
      status: BOOK_STATUS.AVAILABLE,
      categoryId: bookData.categoryId || bookData.category || null,
      authors: Array.isArray(bookData.authors) ? bookData.authors : [bookData.authors || bookData.author],
      tags: bookData.tags || [],
      publicationYear: bookData.publicationYear,
      coverUrl: bookData.coverUrl,
      hasEbook: bookData.hasEbook || false,
      ebookUrl: bookData.ebookUrl,
      ebookFormat: bookData.ebookFormat,
      averageRating: 0,
      borrowCount: 0,
      reviewCount: 0,
      viewCount: 0,
      downloadCount: 0
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
      categoryId,
      author,
      publisher,
      status,
      language,
      hasEbook,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minYear,
      maxYear,
    } = filters;

    const result = await BookService.findWithPagination({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      categoryId: categoryId || category,
      status,
      hasEbook: hasEbook,
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
      categoryId: updateData.categoryId || updateData.category,
      publicationYear: updateData.publicationYear,
      coverUrl: updateData.coverUrl,
      hasEbook: updateData.hasEbook,
      ebookUrl: updateData.ebookUrl,
      ebookFormat: updateData.ebookFormat,
      totalStock: updateData.totalStock,
      availableStock: updateData.availableStock
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
        bookId: book.id,
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
    const { limit = 10, offset = 0, categoryId } = options;
    
    const books = await BookService.search(query, {
      limit: parseInt(limit),
      categoryId: categoryId ? parseInt(categoryId) : null
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
      totalStock: totalStock,
      availableStock: availableStock,
    });

    logBusinessOperation({
      operation: 'book_stock_updated',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        oldTotalStock: book.totalStock,
        newTotalStock: totalStock,
        oldAvailableStock: book.availableStock,
        newAvailableStock: availableStock,
      },
    });

    return this.formatBookResponse(updatedBook);
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
      category: book.categoryId,
      categoryName: book.bookCategory?.name,
      publisher: book.publisher,
      publicationYear: book.publicationYear,
      publishDate: book.publish_date,
      price: book.price,
      totalStock: book.totalStock,
      availableStock: book.availableStock,
      status: book.status,
      language: book.language,
      pages: book.pages,
      summary: book.summary,
      coverUrl: book.coverUrl,
      location: book.location,
      tags: book.tags || [],
      hasEbook: book.hasEbook,
      ebookUrl: book.ebookUrl,
      ebookFormat: book.ebookFormat,
      ebookFileSize: book.ebookFileSize,
      borrowCount: book.borrowCount,
      viewCount: book.viewCount,
      downloadCount: book.downloadCount,
      averageRating: book.averageRating,
      reviewCount: book.reviewCount,
      is_deleted: book.is_deleted,
      createdAt: book.createdAt,
      updatedAt: book.updated_at,
      deletedAt: book.deleted_at,
      // Add safe JSON conversion
      toSafeJSON: () => this.formatBookResponse(book)
    };
  }
}

module.exports = new BooksService();