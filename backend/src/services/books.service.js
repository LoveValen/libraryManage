const BookService = require('./book.service');
const BookCategoryService = require('./bookCategory.service');
const BookTagService = require('./bookTag.service');
const BookLocationService = require('./bookLocation.service');
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
const { formatDate, formatDateTime } = require('../utils/date');

/**
 * Format book response to match existing API
 */
const formatBookResponse = (book) => {
  if (!book) return null;

  const rawPublishDate = book.publish_date || book.publishDate || null;
  const inferredPublishDate = book.publication_year || book.publicationYear
    ? `${book.publication_year || book.publicationYear}-01-01`
    : null;
  const publishDateValue = rawPublishDate || inferredPublishDate;

  const categoryId = book.category_id ?? book.categoryId ?? null;
  const categoryName = book.bookCategory?.name || book.category || null;

  const tagRelations = Array.isArray(book.bookTagRelations) ? book.bookTagRelations : [];
  const normalizedTags = tagRelations
    .map(relation => {
      if (!relation || !relation.tag) return null;
      return {
        id: relation.tag.id,
        name: relation.tag.name,
        code: relation.tag.code,
        color: relation.tag.color,
        isActive: relation.tag.is_active
      };
    })
    .filter(Boolean);
  const tagNames = normalizedTags.map(item => item.name);
  const tagIds = normalizedTags.map(item => item.id);

  const locationInfoRaw = book.bookLocation
    ? {
        id: book.bookLocation.id,
        name: book.bookLocation.name,
        code: book.bookLocation.code,
        area: book.bookLocation.area,
        floor: book.bookLocation.floor,
        shelf: book.bookLocation.shelf,
        description: book.bookLocation.description,
        createdAt: book.bookLocation.created_at || book.bookLocation.createdAt || null,
        updatedAt: book.bookLocation.updated_at || book.bookLocation.updatedAt || null
      }
    : null;
  const locationId = book.location_id ?? book.locationId ?? locationInfoRaw?.id ?? null;
  const locationName = locationInfoRaw?.name || book.location || null;

  const createdAtValue = book.created_at || book.createdAt || null;
  const updatedAtValue = book.updated_at || book.updatedAt || null;
  const deletedAtValue = book.deleted_at || book.deletedAt || null;

  const response = {
    id: book.id,
    title: book.title,
    authors: book.authors,
    isbn: book.isbn,
    categoryId,
    category: categoryId,
    categoryName,
    locationId,
    locationName,
    publisher: book.publisher,
    publicationYear: book.publication_year || book.publicationYear,
    publishDate: publishDateValue ? formatDate(publishDateValue) : null,
    price: book.price,
    totalStock: book.total_stock || book.totalStock,
    availableStock: book.available_stock || book.availableStock,
    stock: book.total_stock || book.totalStock, // For frontend compatibility
    status: book.status,
    language: book.language,
    pages: book.pages,
    summary: book.summary,
    description: book.description,
    cover: book.cover_image || book.coverUrl || book.cover || null,
    coverUrl: book.cover_image || book.coverUrl || book.cover || null,
    cover_image: book.cover_image || book.coverUrl || book.cover || null,
    location: locationName,
    locationInfo: locationInfoRaw,
    tags: tagNames.length > 0 ? tagNames : Array.isArray(book.tags) ? book.tags : [],
    tagIds,
    tagItems: normalizedTags,
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
    createdAt: createdAtValue ? formatDateTime(createdAtValue) : null,
    updatedAt: updatedAtValue ? formatDateTime(updatedAtValue) : null,
    deletedAt: deletedAtValue ? formatDateTime(deletedAtValue) : null,
    toSafeJSON: () => formatBookResponse(book)
  };

  if (response.locationInfo) {
    const info = { ...response.locationInfo };
    info.createdAt = info.createdAt ? formatDateTime(info.createdAt) : null;
    info.updatedAt = info.updatedAt ? formatDateTime(info.updatedAt) : null;
    response.locationInfo = info;
  }

  return response;
};

/**
 * Create book
 */
const createBook = async (bookData, user) => {
  // Check if ISBN already exists
  const existingBook = await BookService.findByISBN(bookData.isbn);
  if (existingBook) {
    throw new ConflictError('Book with this ISBN already exists');
  }

  // Prepare clean data for creation - remove any duplicate fields
  const rawTagIds = Array.isArray(bookData.tagIds) ? bookData.tagIds
    : Array.isArray(bookData.tag_ids) ? bookData.tag_ids
    : [];
  const tagIds = rawTagIds
    .map(tag => Number(tag))
    .filter(id => !Number.isNaN(id));

  const locationIdCandidate = typeof bookData.locationId === 'number' ? bookData.locationId
    : (typeof bookData.locationId === 'string' && bookData.locationId.trim() !== '' ? Number(bookData.locationId) : null);
  const locationId = typeof bookData.location_id === 'number' ? bookData.location_id
    : (locationIdCandidate !== null && !Number.isNaN(locationIdCandidate) ? Number(locationIdCandidate) : null);

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
    locationId,
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

  const syncedTags = tagIds.length > 0 ? await BookTagService.syncBookTags(book.id, tagIds) : [];
  if (tagIds.length > 0) {
    await prisma.books.update({
      where: { id: book.id },
      data: { tags: syncedTags.map(tag => tag.name) }
    });
  } else if (Array.isArray(bookToCreate.tags)) {
    await prisma.books.update({
      where: { id: book.id },
      data: { tags: bookToCreate.tags }
    });
  }

  logBusinessOperation({
    operation: 'book_created',
    userId: user.id,
    details: {
      bookId: book.id,
      isbn: book.isbn,
      title: book.title,
    },
  });

  const createdBook = await BookService.findById(book.id);
  return formatBookResponse(createdBook);
};

/**
 * Get book list with pagination
 */
const getBookList = async (filters = {}) => {
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
    locationId,
    startDate,
    endDate,
  } = filters;

  const result = await BookService.findWithPagination({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
    categoryId: categoryId || category,
    status,
    hasEbook: hasEbook,
    locationId,
    orderBy: sortBy,
    order: sortOrder.toLowerCase(),
    startDate,
    endDate
  });

  return {
    books: result.data.map(book => formatBookResponse(book)),
    pagination: result.pagination
  };
};

/**
 * Get book by ID
 */
const getBookById = async (bookId, user = null) => {
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

  const enrichedBook = { ...book };

  const hasLocationId = enrichedBook.location_id !== undefined && enrichedBook.location_id !== null;
  const hasLocationIdCamel = enrichedBook.locationId !== undefined && enrichedBook.locationId !== null;
  if ((!hasLocationId && !hasLocationIdCamel) && typeof enrichedBook.location === 'string') {
    const locationName = enrichedBook.location.trim();
    if (locationName) {
      const locationRecord = await BookLocationService.findByName(locationName);
      if (locationRecord) {
        enrichedBook.location_id = locationRecord.id;
        enrichedBook.locationId = locationRecord.id;
        enrichedBook.location = locationRecord.name;
        enrichedBook.bookLocation = enrichedBook.bookLocation || locationRecord;
      }
    }
  }

  const hasTagRelations = Array.isArray(enrichedBook.bookTagRelations) && enrichedBook.bookTagRelations.length > 0;
  if (!hasTagRelations) {
    let tagNameList = [];
    if (Array.isArray(enrichedBook.tags)) {
      tagNameList = enrichedBook.tags.filter(name => typeof name === 'string' && name.trim().length > 0);
    } else if (typeof enrichedBook.tags === 'string' && enrichedBook.tags.trim().length > 0) {
      tagNameList = [enrichedBook.tags.trim()];
    }

    if (tagNameList.length > 0) {
      const fallbackTags = await BookTagService.findManyByNames(tagNameList);
      if (fallbackTags.length > 0) {
        enrichedBook.bookTagRelations = fallbackTags.map(tag => ({ tag }));
        enrichedBook.tagIds = fallbackTags.map(tag => tag.id);
        enrichedBook.tags = fallbackTags.map(tag => tag.name);
      }
    }
  }

  return formatBookResponse(enrichedBook);
};

/**
 * Update book
 */
const updateBook = async (bookId, updateData, user) => {
  const book = await BookService.findById(parseInt(bookId));

  if (!book || book.is_deleted) {
    throw new NotFoundError('Book not found');
  }

  const tagIdsProvided = Object.prototype.hasOwnProperty.call(updateData, 'tagIds') || Object.prototype.hasOwnProperty.call(updateData, 'tag_ids');
  const rawTagIds = tagIdsProvided ? (Array.isArray(updateData.tagIds) ? updateData.tagIds : Array.isArray(updateData.tag_ids) ? updateData.tag_ids : []) : [];
  const tagIds = rawTagIds.map(tag => Number(tag)).filter(id => !Number.isNaN(id));

  const locationIdCandidate = typeof updateData.locationId === 'number' ? updateData.locationId
    : (typeof updateData.locationId === 'string' && updateData.locationId.trim() !== '' ? Number(updateData.locationId) : null);
  const locationId = Object.prototype.hasOwnProperty.call(updateData, 'location_id') ? updateData.location_id
    : (locationIdCandidate !== null && !Number.isNaN(locationIdCandidate) ? Number(locationIdCandidate) : undefined);

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
  if (locationId !== undefined) formattedData.locationId = locationId;
  if (updateData.location_id !== undefined) formattedData.locationId = updateData.location_id;
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

  if (tagIdsProvided) {
    const syncedTags = await BookTagService.syncBookTags(updatedBook.id, tagIds);
    await prisma.books.update({
      where: { id: updatedBook.id },
      data: { tags: syncedTags.map(tag => tag.name) }
    });
  } else if (updateData.tags !== undefined) {
    await prisma.books.update({
      where: { id: updatedBook.id },
      data: { tags: Array.isArray(updateData.tags) ? updateData.tags : [] }
    });
  }

  logBusinessOperation({
    operation: 'book_updated',
    userId: user.id,
    details: {
      bookId: book.id,
      title: book.title,
      changes: Object.keys(updateData),
    },
  });

  const refreshedBook = await BookService.findById(updatedBook.id);
  return formatBookResponse(refreshedBook);
};

/**
 * Delete book (soft delete)
 */
const deleteBook = async (bookId, user) => {
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
};

/**
 * Get categories
 */
const getCategories = async () => {
  const categories = await BookCategoryService.findAll({ includeBookCount: true });
  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    sortOrder: cat.sort_order,
    bookCount: cat._count?.books || 0
  }));
};

/**
 * Get popular books
 */
const getPopularBooks = async (limit = 10, days = 30) => {
  const books = await BookService.getPopularBooks(limit);
  return books.map(book => formatBookResponse(book));
};

/**
 * Get recent books
 */
const getRecentBooks = async (limit = 10) => {
  const books = await BookService.getNewArrivals(days = 30, limit);
  return books.map(book => formatBookResponse(book));
};

/**
 * Get book statistics
 */
const getBookStatistics = async () => {
  return await BookService.getStatistics();
};

/**
 * Search books
 */
const searchBooks = async (query, options = {}) => {
  const { limit = 10, offset = 0, categoryId } = options;

  const books = await BookService.search(query, {
    limit: parseInt(limit),
    categoryId: categoryId ? parseInt(categoryId) : null
  });

  const total = books.length; // For simple search, we don't have total count

  return {
    books: books.map(book => formatBookResponse(book)),
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit: limit,
      total: total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update book stock
 */
const updateBookStock = async (bookId, stockData, user) => {
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

  return formatBookResponse(updatedBook);
};

/**
 * Get book tags
 */
const getBookTags = async () => {
  const result = await BookTagService.listActive();
  return result.map(tag => ({
    id: tag.id,
    name: tag.name,
    code: tag.code,
    color: tag.color,
    isActive: tag.isActive
  }));
};

/**
 * Get book locations
 */
const getBookLocations = async () => {
  const locations = await BookLocationService.listActive();
  return locations.map(location => ({
    id: location.id,
    name: location.name,
    code: location.code,
    area: location.area,
    floor: location.floor,
    shelf: location.shelf,
    description: location.description
  }));
};

module.exports = {
  createBook,
  getBookList,
  getBookById,
  updateBook,
  deleteBook,
  getCategories,
  getPopularBooks,
  getRecentBooks,
  getBookStatistics,
  searchBooks,
  updateBookStock,
  getBookTags,
  getBookLocations,
  formatBookResponse
};