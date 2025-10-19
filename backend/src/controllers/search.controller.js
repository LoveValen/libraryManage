const searchService = require('../services/search.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { BadRequestError, ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

// Validation schemas
const SEARCH_SCHEMA = Joi.object({
  q: Joi.string().trim().min(1).max(200).optional(),
  type: Joi.string().valid('all', 'books', 'users', 'reviews', 'borrows').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().valid('_score', 'title', 'author', 'date', 'rating', 'popularity').optional(),
  order: Joi.string().valid('asc', 'desc').optional(),
  highlight: Joi.boolean().optional(),
  suggest: Joi.boolean().optional()
});

const ADVANCED_SEARCH_SCHEMA = Joi.object({
  query: Joi.string().trim().max(500).optional(),
  type: Joi.string().valid('books', 'users', 'reviews', 'borrows').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  filters: Joi.object().optional(),
  facets: Joi.boolean().optional(),
  aggregations: Joi.boolean().optional()
});

const EXPORT_SCHEMA = Joi.object({
  query: Joi.string().trim().max(500).optional(),
  type: Joi.string().valid('books', 'users', 'reviews', 'borrows').optional(),
  format: Joi.string().valid('csv', 'json', 'xlsx').optional(),
  filters: Joi.object().optional(),
  limit: Joi.number().integer().min(1).max(10000).optional()
});

// Helper functions
/**
 * Parse integer parameter
 */
const parseIntParam = (value, defaultValue = null) => {
  return value ? parseInt(value) : defaultValue;
};

/**
 * Parse boolean parameter
 */
const parseBoolParam = (value, defaultValue = false) => {
  return value === 'true' || value === true;
};

/**
 * Check admin permission
 */
const checkAdminPermission = (user) => {
  if (user.role !== 'admin') {
    throw new ForbiddenError('只有管理员可以执行此操作');
  }
};

/**
 * Check admin or librarian permission
 */
const checkLibrarianPermission = (user) => {
  if (!['admin', 'librarian'].includes(user.role)) {
    throw new ForbiddenError('权限不足，需要管理员或图书管理员权限');
  }
};

/**
 * Parse filters from query parameters
 */
const parseFilters = (filters) => {
  const parsed = {};

  // Parse common filters
  if (filters.category) parsed.category = filters.category;
  if (filters.author) parsed.author = filters.author;
  if (filters.publisher) parsed.publisher = filters.publisher;
  if (filters.language) parsed.language = filters.language;
  if (filters.status) parsed.status = filters.status;
  if (filters.role) parsed.role = filters.role;
  if (filters.rating) parsed.rating = parseInt(filters.rating);
  if (filters.available === 'true') parsed.available = true;
  if (filters.isOverdue === 'true') parsed.isOverdue = true;

  // Parse range filters
  if (filters.yearStart && filters.yearEnd) {
    parsed.yearRange = {
      start: parseInt(filters.yearStart),
      end: parseInt(filters.yearEnd)
    };
  }

  if (filters.ratingMin && filters.ratingMax) {
    parsed.ratingRange = {
      min: parseFloat(filters.ratingMin),
      max: parseFloat(filters.ratingMax)
    };
  }

  if (filters.dateStart && filters.dateEnd) {
    parsed.dateRange = {
      start: filters.dateStart,
      end: filters.dateEnd
    };
  }

  // Parse array filters
  if (filters.tags) {
    parsed.tags = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
  }

  return parsed;
};

/**
 * Get index statistics
 */
const getIndexStatistics = async () => {
  try {
    const health = await searchService.healthCheck();
    return {
      available: health.status === 'connected',
      cluster: health.cluster,
      indices: {
        books: { docs: 0, size: '0kb' },
        users: { docs: 0, size: '0kb' },
        borrows: { docs: 0, size: '0kb' },
        reviews: { docs: 0, size: '0kb' }
      }
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
};

/**
 * Get popular search queries
 */
const getPopularQueries = async (startDate, endDate) => {
  // This can be implemented based on search logs
  return [
    { query: 'JavaScript', count: 156 },
    { query: 'Python', count: 134 },
    { query: '数据结构', count: 98 },
    { query: '算法', count: 87 },
    { query: '机器学习', count: 76 }
  ];
};

/**
 * Get search trends
 */
const getSearchTrends = async (startDate, endDate) => {
  // This can be implemented based on time-based search analysis
  return {
    totalSearches: 5432,
    averageResultsPerSearch: 23.4,
    popularCategories: ['计算机', '文学', '历史', '科学'],
    peakHours: ['14:00-15:00', '20:00-21:00']
  };
};

/**
 * Get autocomplete results
 */
const getAutocompleteResults = async (query, type, field) => {
  try {
    const results = await searchService.search(query, {
      type,
      limit: 10,
      highlight: false
    });

    return results.hits.map(hit => ({
      text: hit[field] || hit.title || hit.name,
      value: hit.id,
      type
    }));
  } catch (error) {
    console.error('Autocomplete search failed:', error);
    return [];
  }
};

/**
 * Find similar content
 */
const findSimilarContent = async (type, id, limit) => {
  // This can be implemented using ML algorithms or tag/category-based similarity
  return [];
};

/**
 * Format export data
 */
const formatExportData = async (results, format) => {
  switch (format) {
    case 'csv':
      return formatCsv(results.hits);
    case 'json':
      return JSON.stringify(results.hits, null, 2);
    case 'xlsx':
      return formatExcel(results.hits);
    default:
      throw new BadRequestError('Unsupported export format');
  }
};

/**
 * Format data as CSV
 */
const formatCsv = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
  const csvHeaders = headers.join(',');

  const csvRows = data.map(item =>
    headers.map(header => {
      const value = item[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Format data as Excel (placeholder)
 */
const formatExcel = (data) => {
  // Excel formatting would require a library like xlsx
  throw new BadRequestError('Excel export not yet implemented');
};

/**
 * Get content type for export format
 */
const getContentType = (format) => {
  const contentTypes = {
    csv: 'text/csv',
    json: 'application/json',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return contentTypes[format] || 'text/plain';
};

// Controller functions

/**
 * Comprehensive search
 */
const search = asyncHandler(async (req, res) => {
  const {
    q: query,
    type = 'all',
    page = 1,
    limit = 20,
    sort = '_score',
    order = 'desc',
    highlight = true,
    suggest = false,
    ...filters
  } = req.query;

  if (!query && type === 'all') {
    throw new BadRequestError('搜索关键词不能为空');
  }

  const options = {
    type,
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    sort,
    order,
    highlight: parseBoolParam(highlight, true),
    suggest: parseBoolParam(suggest, false),
    filters: parseFilters(filters)
  };

  const results = await searchService.search(query, options);
  success(res, results, '搜索完成');
});

/**
 * Intelligent search (personalized)
 */
const intelligentSearch = asyncHandler(async (req, res) => {
  const {
    q: query,
    type = 'books',
    page = 1,
    limit = 20,
    sort = '_score',
    order = 'desc',
    ...filters
  } = req.query;

  if (!query) {
    throw new BadRequestError('搜索关键词不能为空');
  }

  const options = {
    type,
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    sort,
    order,
    filters: parseFilters(filters)
  };

  const results = await searchService.intelligentSearch(query, req.user.id, options);
  const responseData = { ...results, personalized: true, userId: req.user.id };
  success(res, responseData, '智能搜索完成');
});

/**
 * Get search suggestions
 */
const getSuggestions = asyncHandler(async (req, res) => {
  const { q: query, type = 'books', limit = 10 } = req.query;

  if (!query || query.length < 2) {
    return success(res, [], '搜索建议获取成功');
  }

  const suggestions = await searchService.getSuggestions(query, type);
  success(res, suggestions.slice(0, parseIntParam(limit, 10)), '搜索建议获取成功');
});

/**
 * Advanced search
 */
const advancedSearch = asyncHandler(async (req, res) => {
  const validatedData = validateRequest(ADVANCED_SEARCH_SCHEMA, req.body);
  const {
    query,
    type = 'books',
    page = 1,
    limit = 20,
    filters = {},
    facets = true,
    aggregations = true
  } = validatedData;

  const options = {
    type,
    page: parseIntParam(page, 1),
    limit: Math.min(parseIntParam(limit, 20), 100),
    filters,
    facets: parseBoolParam(facets, true),
    aggregations: parseBoolParam(aggregations, true),
    highlight: true
  };

  const results = await searchService.search(query, options);
  success(res, results, '高级搜索完成');
});

/**
 * Get search statistics
 */
const getSearchStats = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const { startDate, endDate } = req.query;

  const stats = {
    searchHealth: await searchService.healthCheck(),
    indexStats: await getIndexStatistics(),
    popularQueries: await getPopularQueries(startDate, endDate),
    searchTrends: await getSearchTrends(startDate, endDate)
  };

  success(res, stats, '获取搜索统计成功');
});

/**
 * Reindex all data
 */
const reindexAll = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);

  // Asynchronously execute reindex
  searchService.reindexAll().catch(error => {
    console.error('Reindex failed:', error);
  });

  res.status(200).json({
    success: true,
    message: '索引重建启动成功',
    data: { message: '索引重建已启动', status: 'in_progress' },
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * Search health check
 */
const healthCheck = asyncHandler(async (req, res) => {
  const health = await searchService.healthCheck();
  success(res, health, '搜索健康检查完成');
});

/**
 * Autocomplete search
 */
const autocomplete = asyncHandler(async (req, res) => {
  const { q: query, type = 'books', field = 'title' } = req.query;

  if (!query || query.length < 2) {
    return success(res, [], '自动完成获取成功');
  }

  const suggestions = await getAutocompleteResults(query, type, field);
  success(res, suggestions, '自动完成获取成功');
});

/**
 * Find similar content
 */
const findSimilar = asyncHandler(async (req, res) => {
  const { type, id, limit = 10 } = req.params;

  if (!['books', 'users', 'reviews'].includes(type)) {
    throw new BadRequestError('相似性搜索类型无效');
  }

  const similar = await findSimilarContent(type, id, parseIntParam(limit, 10));
  success(res, similar, '相似内容推荐获取成功');
});

/**
 * Export search results
 */
const exportSearchResults = asyncHandler(async (req, res) => {
  checkLibrarianPermission(req.user);
  const validatedData = validateRequest(EXPORT_SCHEMA, req.body);
  const {
    query,
    type = 'books',
    format = 'csv',
    filters = {},
    limit = 1000
  } = validatedData;

  const options = {
    type,
    page: 1,
    limit: Math.min(parseIntParam(limit, 1000), 10000),
    filters,
    highlight: false
  };

  const results = await searchService.search(query, options);
  const exportData = await formatExportData(results, format);

  res.setHeader('Content-Type', getContentType(format));
  res.setHeader('Content-Disposition', `attachment; filename="search_results.${format}"`);
  res.send(exportData);
});

module.exports = {
  search,
  intelligentSearch,
  getSuggestions,
  advancedSearch,
  getSearchStats,
  reindexAll,
  healthCheck,
  autocomplete,
  findSimilar,
  exportSearchResults
};
