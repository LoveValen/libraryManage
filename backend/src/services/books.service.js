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

    // Prepare clean data for creation - remove any duplicate fields
    const bookToCreate = {
      title: bookData.title,
      isbn: bookData.isbn,
      authors: Array.isArray(bookData.authors) ? bookData.authors : [bookData.authors || bookData.author],
      publisher: bookData.publisher,
      publicationYear: bookData.publicationYear || bookData.publication_year,
      language: bookData.language,
      // Only set categoryId if it's a number, otherwise leave as null
      categoryId: typeof bookData.categoryId === 'number' ? bookData.categoryId : 
                  typeof bookData.category_id === 'number' ? bookData.category_id : null,
      category: bookData.category,
      tags: bookData.tags || [],
      summary: bookData.summary,
      description: bookData.description,
      coverUrl: bookData.coverUrl || bookData.cover_image || bookData.cover,
      totalStock: bookData.totalStock || bookData.total_stock || 1,
      availableStock: bookData.availableStock || bookData.available_stock || bookData.totalStock || bookData.total_stock || 1,
      reservedStock: bookData.reservedStock || bookData.reserved_stock || 0,
      status: bookData.status || BOOK_STATUS.AVAILABLE,
      location: bookData.location,
      price: bookData.price,
      pages: bookData.pages,
      format: bookData.format,
      hasEbook: bookData.hasEbook || bookData.has_ebook || false,
      condition: bookData.condition,
      notes: bookData.notes
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

    // Format update data - only include fields that are being updated
    const formattedData = {};
    
    if (updateData.title !== undefined) formattedData.title = updateData.title;
    if (updateData.isbn !== undefined) formattedData.isbn = updateData.isbn;
    if (updateData.authors !== undefined) {
      formattedData.authors = Array.isArray(updateData.authors) ? updateData.authors : [updateData.authors];
    }
    if (updateData.publisher !== undefined) formattedData.publisher = updateData.publisher;
    if (updateData.publicationYear !== undefined) formattedData.publicationYear = updateData.publicationYear;
    if (updateData.publication_year !== undefined) formattedData.publicationYear = updateData.publication_year;
    if (updateData.language !== undefined) formattedData.language = updateData.language;
    if (updateData.categoryId !== undefined) formattedData.categoryId = updateData.categoryId;
    if (updateData.category_id !== undefined) formattedData.categoryId = updateData.category_id;
    if (updateData.category !== undefined && !formattedData.categoryId) formattedData.category = updateData.category;
    if (updateData.tags !== undefined) formattedData.tags = updateData.tags;
    if (updateData.summary !== undefined) formattedData.summary = updateData.summary;
    if (updateData.description !== undefined) formattedData.description = updateData.description;
    if (updateData.coverUrl !== undefined) formattedData.coverUrl = updateData.coverUrl;
    if (updateData.cover_image !== undefined) formattedData.coverUrl = updateData.cover_image;
    if (updateData.cover !== undefined) formattedData.coverUrl = updateData.cover;
    if (updateData.totalStock !== undefined) formattedData.totalStock = updateData.totalStock;
    if (updateData.total_stock !== undefined) formattedData.totalStock = updateData.total_stock;
    if (updateData.availableStock !== undefined) formattedData.availableStock = updateData.availableStock;
    if (updateData.available_stock !== undefined) formattedData.availableStock = updateData.available_stock;
    if (updateData.reservedStock !== undefined) formattedData.reservedStock = updateData.reservedStock;
    if (updateData.reserved_stock !== undefined) formattedData.reservedStock = updateData.reserved_stock;
    if (updateData.status !== undefined) formattedData.status = updateData.status;
    if (updateData.location !== undefined) formattedData.location = updateData.location;
    if (updateData.price !== undefined) formattedData.price = updateData.price;
    if (updateData.pages !== undefined) formattedData.pages = updateData.pages;
    if (updateData.format !== undefined) formattedData.format = updateData.format;
    if (updateData.hasEbook !== undefined) formattedData.hasEbook = updateData.hasEbook;
    if (updateData.has_ebook !== undefined) formattedData.hasEbook = updateData.has_ebook;
    if (updateData.condition !== undefined) formattedData.condition = updateData.condition;
    if (updateData.notes !== undefined) formattedData.notes = updateData.notes;

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

    // Use camelCase field names - they will be converted in BookService.update
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
      category: book.category_id || book.categoryId,
      categoryName: book.bookCategory?.name || book.category,
      publisher: book.publisher,
      publicationYear: book.publication_year || book.publicationYear,
      publishDate: book.publish_date,
      price: book.price,
      totalStock: book.total_stock || book.totalStock,
      availableStock: book.available_stock || book.availableStock,
      stock: book.total_stock || book.totalStock, // For frontend compatibility
      status: book.status,
      language: book.language,
      pages: book.pages,
      summary: book.summary,
      description: book.description,
      // Fix cover field mapping - support multiple field names
      cover: book.cover_image || book.coverUrl || book.cover || null,
      coverUrl: book.cover_image || book.coverUrl || book.cover || null,
      cover_image: book.cover_image || book.coverUrl || book.cover || null,
      location: book.location,
      tags: book.tags || [],
      hasEbook: book.has_ebook || book.hasEbook || false,
      ebookUrl: book.ebook_url || book.ebookUrl,
      ebookFormat: book.ebook_format || book.ebookFormat,
      ebookFileSize: book.ebook_file_size || book.ebookFileSize,
      borrowCount: book.borrow_count || book.borrowCount || 0,
      viewCount: book.view_count || book.viewCount || 0,
      downloadCount: book.download_count || book.downloadCount || 0,
      averageRating: book.average_rating || book.averageRating,
      reviewCount: book.review_count || book.reviewCount || 0,
      condition: book.condition,
      notes: book.notes,
      format: book.format,
      is_deleted: book.is_deleted,
      createdAt: book.created_at || book.createdAt,
      updatedAt: book.updated_at || book.updatedAt,
      deletedAt: book.deleted_at || book.deletedAt,
      // Add safe JSON conversion
      toSafeJSON: () => this.formatBookResponse(book)
    };
  }
}

module.exports = new BooksService();