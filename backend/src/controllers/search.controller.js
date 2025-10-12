const searchService = require('../services/search.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { BadRequestError, ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * 搜索控制器
 */
class SearchController {
  // 验证模式常量
  static SEARCH_SCHEMA = Joi.object({
    q: Joi.string().trim().min(1).max(200).optional(),
    type: Joi.string().valid('all', 'books', 'users', 'reviews', 'borrows').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sort: Joi.string().valid('_score', 'title', 'author', 'date', 'rating', 'popularity').optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
    highlight: Joi.boolean().optional(),
    suggest: Joi.boolean().optional()
  });

  static ADVANCED_SEARCH_SCHEMA = Joi.object({
    query: Joi.string().trim().max(500).optional(),
    type: Joi.string().valid('books', 'users', 'reviews', 'borrows').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    filters: Joi.object().optional(),
    facets: Joi.boolean().optional(),
    aggregations: Joi.boolean().optional()
  });

  static EXPORT_SCHEMA = Joi.object({
    query: Joi.string().trim().max(500).optional(),
    type: Joi.string().valid('books', 'users', 'reviews', 'borrows').optional(),
    format: Joi.string().valid('csv', 'json', 'xlsx').optional(),
    filters: Joi.object().optional(),
    limit: Joi.number().integer().min(1).max(10000).optional()
  });

  /**
   * 解析整数参数
   * @private
   */
  _parseIntParam(value, defaultValue = null) {
    return value ? parseInt(value) : defaultValue;
  }

  /**
   * 解析布尔参数
   * @private
   */
  _parseBoolParam(value, defaultValue = false) {
    return value === 'true' || value === true;
  }

  /**
   * 检查管理员权限
   * @private
   */
  _checkAdminPermission(user) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以执行此操作');
    }
  }

  /**
   * 检查管理员或图书管理员权限
   * @private
   */
  _checkLibrarianPermission(user) {
    if (!['admin', 'librarian'].includes(user.role)) {
      throw new ForbiddenError('权限不足，需要管理员或图书管理员权限');
    }
  }
  /**
   * 综合搜索
   */
  search = asyncHandler(async (req, res) => {
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
      page: this._parseIntParam(page, 1),
      limit: Math.min(this._parseIntParam(limit, 20), 100),
      sort,
      order,
      highlight: this._parseBoolParam(highlight, true),
      suggest: this._parseBoolParam(suggest, false),
      filters: this.parseFilters(filters)
    };

    const results = await searchService.search(query, options);
    success(res, results, '搜索完成');
  });

  /**
   * 智能搜索（个性化）
   */
  intelligentSearch = asyncHandler(async (req, res) => {
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
      page: this._parseIntParam(page, 1),
      limit: Math.min(this._parseIntParam(limit, 20), 100),
      sort,
      order,
      filters: this.parseFilters(filters)
    };

    const results = await searchService.intelligentSearch(query, req.user.id, options);
    const responseData = { ...results, personalized: true, userId: req.user.id };
    success(res, responseData, '智能搜索完成');
  });

  /**
   * 搜索建议
   */
  getSuggestions = asyncHandler(async (req, res) => {
    const { q: query, type = 'books', limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return success(res, [], '搜索建议获取成功');
    }

    const suggestions = await searchService.getSuggestions(query, type);
    success(res, suggestions.slice(0, this._parseIntParam(limit, 10)), '搜索建议获取成功');
  });

  /**
   * 高级搜索
   */
  advancedSearch = asyncHandler(async (req, res) => {
    const validatedData = validateRequest(SearchController.ADVANCED_SEARCH_SCHEMA, req.body);
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
      page: this._parseIntParam(page, 1),
      limit: Math.min(this._parseIntParam(limit, 20), 100),
      filters,
      facets: this._parseBoolParam(facets, true),
      aggregations: this._parseBoolParam(aggregations, true),
      highlight: true
    };

    const results = await searchService.search(query, options);
    success(res, results, '高级搜索完成');
  });

  /**
   * 搜索统计
   */
  getSearchStats = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const { startDate, endDate } = req.query;
    
    const stats = {
      searchHealth: await searchService.healthCheck(),
      indexStats: await this.getIndexStatistics(),
      popularQueries: await this.getPopularQueries(startDate, endDate),
      searchTrends: await this.getSearchTrends(startDate, endDate)
    };

    success(res, stats, '获取搜索统计成功');
  });

  /**
   * 重建索引
   */
  reindexAll = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);

    // 异步执行重建索引
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
   * 搜索健康检查
   */
  healthCheck = asyncHandler(async (req, res) => {
    const health = await searchService.healthCheck();
    success(res, health, '搜索健康检查完成');
  });

  /**
   * 自动完成搜索
   */
  autocomplete = asyncHandler(async (req, res) => {
    const { q: query, type = 'books', field = 'title' } = req.query;

    if (!query || query.length < 2) {
      return success(res, [], '自动完成获取成功');
    }

    const suggestions = await this.getAutocompleteResults(query, type, field);
    success(res, suggestions, '自动完成获取成功');
  });

  /**
   * 相似内容推荐
   */
  findSimilar = asyncHandler(async (req, res) => {
    const { type, id, limit = 10 } = req.params;
    
    if (!['books', 'users', 'reviews'].includes(type)) {
      throw new BadRequestError('相似性搜索类型无效');
    }

    const similar = await this.findSimilarContent(type, id, this._parseIntParam(limit, 10));
    success(res, similar, '相似内容推荐获取成功');
  });

  /**
   * 导出搜索结果
   */
  exportSearchResults = asyncHandler(async (req, res) => {
    this._checkLibrarianPermission(req.user);
    const validatedData = validateRequest(SearchController.EXPORT_SCHEMA, req.body);
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
      limit: Math.min(this._parseIntParam(limit, 1000), 10000),
      filters,
      highlight: false
    };

    const results = await searchService.search(query, options);
    const exportData = await this.formatExportData(results, format);
    
    res.setHeader('Content-Type', this.getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename="search_results.${format}"`);
    res.send(exportData);
  });

  // 辅助方法

  /**
   * 解析过滤器参数
   */
  parseFilters(filters) {
    const parsed = {};

    // 解析常用过滤器
    if (filters.category) parsed.category = filters.category;
    if (filters.author) parsed.author = filters.author;
    if (filters.publisher) parsed.publisher = filters.publisher;
    if (filters.language) parsed.language = filters.language;
    if (filters.status) parsed.status = filters.status;
    if (filters.role) parsed.role = filters.role;
    if (filters.rating) parsed.rating = parseInt(filters.rating);
    if (filters.available === 'true') parsed.available = true;
    if (filters.isOverdue === 'true') parsed.isOverdue = true;

    // 解析范围过滤器
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

    // 解析数组过滤器
    if (filters.tags) {
      parsed.tags = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
    }

    return parsed;
  }

  /**
   * 获取索引统计信息
   */
  async getIndexStatistics() {
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
  }

  /**
   * 获取热门搜索词
   */
  async getPopularQueries(startDate, endDate) {
    // 这里可以实现基于日志的热门搜索词统计
    return [
      { query: 'JavaScript', count: 156 },
      { query: 'Python', count: 134 },
      { query: '数据结构', count: 98 },
      { query: '算法', count: 87 },
      { query: '机器学习', count: 76 }
    ];
  }

  /**
   * 获取搜索趋势
   */
  async getSearchTrends(startDate, endDate) {
    // 这里可以实现基于时间的搜索趋势分析
    return {
      totalSearches: 5432,
      averageResultsPerSearch: 23.4,
      popularCategories: ['计算机', '文学', '历史', '科学'],
      peakHours: ['14:00-15:00', '20:00-21:00']
    };
  }

  /**
   * 获取自动完成结果
   */
  async getAutocompleteResults(query, type, field) {
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
      logger.error('Autocomplete search failed:', error);
      return [];
    }
  }

  /**
   * 查找相似内容
   */
  async findSimilarContent(type, id, limit) {
    // 这里可以实现基于内容的相似性推荐
    // 使用机器学习算法或者基于标签、分类等的相似性计算
    return [];
  }

  /**
   * 格式化导出数据
   */
  async formatExportData(results, format) {
    switch (format) {
      case 'csv':
        return this.formatCsv(results.hits);
      case 'json':
        return JSON.stringify(results.hits, null, 2);
      case 'xlsx':
        return this.formatExcel(results.hits);
      default:
        throw new BadRequestError('Unsupported export format');
    }
  }

  /**
   * 格式化CSV数据
   */
  formatCsv(data) {
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
  }

  /**
   * 获取内容类型
   */
  getContentType(format) {
    const contentTypes = {
      csv: 'text/csv',
      json: 'application/json',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return contentTypes[format] || 'text/plain';
  }
}

module.exports = new SearchController();