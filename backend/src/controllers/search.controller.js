const searchService = require('../services/search.service');
const { ApiError, BadRequestError, NotFoundError } = require('../utils/apiError');
const { logger } = require('../utils/logger');

/**
 * 搜索控制器
 */
class SearchController {
  /**
   * 综合搜索
   */
  async search(req, res) {
    try {
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
        throw new BadRequestError('Search query is required for comprehensive search');
      }

      const options = {
        type,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // 限制最大返回数量
        sort,
        order,
        highlight: highlight === 'true',
        suggest: suggest === 'true',
        filters: this.parseFilters(filters)
      };

      const results = await searchService.search(query, options);

      // 记录搜索日志
      logger.info('Search performed', {
        query,
        type,
        userId: req.user?.id,
        resultsCount: results.total || 0,
        took: results.took
      });

      res.apiSuccess(results);
    } catch (error) {
      logger.error('Search failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 智能搜索（个性化）
   */
  async intelligentSearch(req, res) {
    try {
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
        throw new BadRequestError('Search query is required');
      }

      const userId = req.user.id;
      const options = {
        type,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sort,
        order,
        filters: this.parseFilters(filters)
      };

      const results = await searchService.intelligentSearch(query, userId, options);

      res.apiSuccess({
        ...results,
        personalized: true,
        userId
      });
    } catch (error) {
      logger.error('Intelligent search failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 搜索建议
   */
  async getSuggestions(req, res) {
    try {
      const { q: query, type = 'books', limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res.apiSuccess([]);
      }

      const suggestions = await searchService.getSuggestions(query, type);
      
      res.apiSuccess(suggestions.slice(0, limit));
    } catch (error) {
      logger.error('Get suggestions failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 高级搜索
   */
  async advancedSearch(req, res) {
    try {
      const {
        query,
        type = 'books',
        page = 1,
        limit = 20,
        filters = {},
        facets = true,
        aggregations = true
      } = req.body;

      const options = {
        type,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        filters,
        facets: facets === true,
        aggregations: aggregations === true,
        highlight: true
      };

      const results = await searchService.search(query, options);

      res.apiSuccess(results);
    } catch (error) {
      logger.error('Advanced search failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 搜索统计
   */
  async getSearchStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new BadRequestError('Only administrators can access search statistics');
      }

      const { startDate, endDate } = req.query;
      
      // 这里可以实现搜索统计逻辑
      // 例如：最热门搜索词、搜索频率、用户搜索行为等
      
      const stats = {
        searchHealth: await searchService.healthCheck(),
        indexStats: await this.getIndexStatistics(),
        popularQueries: await this.getPopularQueries(startDate, endDate),
        searchTrends: await this.getSearchTrends(startDate, endDate)
      };

      res.apiSuccess(stats);
    } catch (error) {
      logger.error('Get search stats failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 重建索引
   */
  async reindexAll(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new BadRequestError('Only administrators can reindex');
      }

      // 异步执行重建索引
      searchService.reindexAll().catch(error => {
        logger.error('Reindex failed:', error);
      });

      res.apiSuccess({
        message: 'Index rebuild started',
        status: 'in_progress'
      });
    } catch (error) {
      logger.error('Reindex request failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 搜索健康检查
   */
  async healthCheck(req, res) {
    try {
      const health = await searchService.healthCheck();
      res.apiSuccess(health);
    } catch (error) {
      logger.error('Search health check failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 自动完成搜索
   */
  async autocomplete(req, res) {
    try {
      const { q: query, type = 'books', field = 'title' } = req.query;

      if (!query || query.length < 2) {
        return res.apiSuccess([]);
      }

      const suggestions = await this.getAutocompleteResults(query, type, field);
      
      res.apiSuccess(suggestions);
    } catch (error) {
      logger.error('Autocomplete failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 相似内容推荐
   */
  async findSimilar(req, res) {
    try {
      const { type, id, limit = 10 } = req.params;
      
      if (!['books', 'users', 'reviews'].includes(type)) {
        throw new BadRequestError('Invalid type for similarity search');
      }

      const similar = await this.findSimilarContent(type, id, limit);
      
      res.apiSuccess(similar);
    } catch (error) {
      logger.error('Find similar content failed:', error);
      res.apiError(error);
    }
  }

  /**
   * 导出搜索结果
   */
  async exportSearchResults(req, res) {
    try {
      const {
        query,
        type = 'books',
        format = 'csv',
        filters = {},
        limit = 1000
      } = req.body;

      if (req.user.role !== 'admin' && req.user.role !== 'librarian') {
        throw new BadRequestError('Insufficient permissions to export search results');
      }

      const options = {
        type,
        page: 1,
        limit: Math.min(parseInt(limit), 10000),
        filters,
        highlight: false
      };

      const results = await searchService.search(query, options);
      
      const exportData = await this.formatExportData(results, format);
      
      res.setHeader('Content-Type', this.getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="search_results.${format}"`);
      res.send(exportData);
    } catch (error) {
      logger.error('Export search results failed:', error);
      res.apiError(error);
    }
  }

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