const elasticsearchConfig = require('../config/elasticsearch.config');
const { models } = require('../models');
const { logger } = require('../utils/logger');
const { ApiError, BadRequestError, NotFoundError } = require('../utils/apiError');

class SearchService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * 初始化搜索服务
   */
  async initialize() {
    try {
      this.client = await elasticsearchConfig.initialize();
      this.initialized = true;
      logger.info('✅ 搜索服务初始化完成');
    } catch (error) {
      logger.error('❌ 搜索服务初始化失败:', error);
      // 不抛出错误，允许系统在没有搜索功能的情况下运行
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable() {
    return this.initialized && this.client;
  }

  /**
   * 综合搜索
   */
  async search(query, options = {}) {
    if (!this.isAvailable()) {
      return this.fallbackSearch(query, options);
    }

    try {
      const {
        type = 'all', // all, books, users, borrows, reviews
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true,
        suggest = false
      } = options;

      let searchResults = {};

      if (type === 'all') {
        // 多索引搜索
        const [books, users, borrows, reviews] = await Promise.all([
          this.searchBooks(query, { ...options, limit: Math.ceil(limit / 4) }),
          this.searchUsers(query, { ...options, limit: Math.ceil(limit / 4) }),
          this.searchBorrows(query, { ...options, limit: Math.ceil(limit / 4) }),
          this.searchReviews(query, { ...options, limit: Math.ceil(limit / 4) })
        ]);

        searchResults = {
          books: books.hits || [],
          users: users.hits || [],
          borrows: borrows.hits || [],
          reviews: reviews.hits || [],
          total: (books.total || 0) + (users.total || 0) + (borrows.total || 0) + (reviews.total || 0),
          aggregations: {
            books: books.aggregations,
            users: users.aggregations,
            borrows: borrows.aggregations,
            reviews: reviews.aggregations
          }
        };
      } else {
        // 单一类型搜索
        switch (type) {
          case 'books':
            searchResults = await this.searchBooks(query, options);
            break;
          case 'users':
            searchResults = await this.searchUsers(query, options);
            break;
          case 'borrows':
            searchResults = await this.searchBorrows(query, options);
            break;
          case 'reviews':
            searchResults = await this.searchReviews(query, options);
            break;
          default:
            throw new BadRequestError(`Unknown search type: ${type}`);
        }
      }

      // 添加搜索建议
      if (suggest && query) {
        searchResults.suggestions = await this.getSuggestions(query, type);
      }

      return searchResults;
    } catch (error) {
      logger.error('搜索失败:', error);
      return this.fallbackSearch(query, options);
    }
  }

  /**
   * 搜索图书
   */
  async searchBooks(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const must = [];
      const filter = [];
      const should = [];

      // 主查询
      if (query && query.trim()) {
        const queryTerm = query.trim();
        
        must.push({
          multi_match: {
            query: queryTerm,
            fields: [
              'title^3',
              'authors^2',
              'summary^1',
              'publisher^1',
              'tags^1'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
            operator: 'or'
          }
        });

        // 精确匹配加分
        should.push(
          { match_phrase: { title: { query: queryTerm, boost: 3 } } },
          { match_phrase: { authors: { query: queryTerm, boost: 2 } } },
          { term: { isbn: { value: queryTerm, boost: 5 } } }
        );
      }

      // 过滤条件
      if (filters.category) {
        filter.push({ term: { category: filters.category } });
      }

      if (filters.author) {
        filter.push({ match: { authors: filters.author } });
      }

      if (filters.publisher) {
        filter.push({ match: { publisher: filters.publisher } });
      }

      if (filters.language) {
        filter.push({ term: { language: filters.language } });
      }

      if (filters.status) {
        filter.push({ term: { status: filters.status } });
      }

      if (filters.available === true) {
        filter.push({ range: { availableStock: { gt: 0 } } });
      }

      if (filters.yearRange) {
        const { start, end } = filters.yearRange;
        filter.push({
          range: {
            publicationYear: {
              gte: start,
              lte: end
            }
          }
        });
      }

      if (filters.ratingRange) {
        const { min, max } = filters.ratingRange;
        filter.push({
          range: {
            averageRating: {
              gte: min,
              lte: max
            }
          }
        });
      }

      if (filters.tags && filters.tags.length > 0) {
        filter.push({ terms: { tags: filters.tags } });
      }

      // 构建查询体
      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
            should,
            minimum_should_match: should.length > 0 ? 1 : 0
          }
        },
        sort: this.buildSort(sort, order),
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      };

      // 高亮设置
      if (highlight && query) {
        searchBody.highlight = {
          fields: {
            title: {},
            authors: {},
            summary: {},
            publisher: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        };
      }

      // 聚合设置
      searchBody.aggs = {
        categories: {
          terms: { field: 'category', size: 20 }
        },
        authors: {
          terms: { field: 'authors.keyword', size: 20 }
        },
        publishers: {
          terms: { field: 'publisher.keyword', size: 20 }
        },
        languages: {
          terms: { field: 'language', size: 10 }
        },
        years: {
          date_histogram: {
            field: 'publicationYear',
            calendar_interval: 'year',
            min_doc_count: 1
          }
        },
        ratings: {
          histogram: {
            field: 'averageRating',
            interval: 1,
            min_doc_count: 1
          }
        }
      };

      const response = await this.client.search({
        index: 'books',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('图书搜索失败:', error);
      throw error;
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const must = [];
      const filter = [];

      // 主查询
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: ['username^2', 'realName^2', 'email^1'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // 过滤条件
      if (filters.role) {
        filter.push({ term: { role: filters.role } });
      }

      if (filters.status) {
        filter.push({ term: { status: filters.status } });
      }

      if (filters.registrationDateRange) {
        const { start, end } = filters.registrationDateRange;
        filter.push({
          range: {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        });
      }

      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: this.buildSort(sort, order),
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      };

      if (highlight && query) {
        searchBody.highlight = {
          fields: {
            username: {},
            realName: {},
            email: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        };
      }

      searchBody.aggs = {
        roles: {
          terms: { field: 'role', size: 10 }
        },
        statuses: {
          terms: { field: 'status', size: 10 }
        },
        registrations: {
          date_histogram: {
            field: 'createdAt',
            calendar_interval: 'month',
            min_doc_count: 1
          }
        }
      };

      const response = await this.client.search({
        index: 'users',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('用户搜索失败:', error);
      throw error;
    }
  }

  /**
   * 搜索借阅记录
   */
  async searchBorrows(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const must = [];
      const filter = [];

      // 主查询
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: ['userName^2', 'bookTitle^2', 'isbn^3'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // 过滤条件
      if (filters.status) {
        filter.push({ term: { status: filters.status } });
      }

      if (filters.isOverdue !== undefined) {
        filter.push({ term: { isOverdue: filters.isOverdue } });
      }

      if (filters.borrowDateRange) {
        const { start, end } = filters.borrowDateRange;
        filter.push({
          range: {
            borrowDate: {
              gte: start,
              lte: end
            }
          }
        });
      }

      if (filters.dueDateRange) {
        const { start, end } = filters.dueDateRange;
        filter.push({
          range: {
            dueDate: {
              gte: start,
              lte: end
            }
          }
        });
      }

      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: this.buildSort(sort, order),
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      };

      if (highlight && query) {
        searchBody.highlight = {
          fields: {
            userName: {},
            bookTitle: {},
            isbn: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        };
      }

      searchBody.aggs = {
        statuses: {
          terms: { field: 'status', size: 10 }
        },
        overdue: {
          terms: { field: 'isOverdue', size: 2 }
        },
        borrowTrends: {
          date_histogram: {
            field: 'borrowDate',
            calendar_interval: 'month',
            min_doc_count: 1
          }
        }
      };

      const response = await this.client.search({
        index: 'borrows',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('借阅记录搜索失败:', error);
      throw error;
    }
  }

  /**
   * 搜索书评
   */
  async searchReviews(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const must = [];
      const filter = [];

      // 主查询
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: ['title^2', 'content^1', 'bookTitle^2', 'userName^1'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // 过滤条件
      if (filters.rating) {
        filter.push({ term: { rating: filters.rating } });
      }

      if (filters.status) {
        filter.push({ term: { status: filters.status } });
      }

      if (filters.ratingRange) {
        const { min, max } = filters.ratingRange;
        filter.push({
          range: {
            rating: {
              gte: min,
              lte: max
            }
          }
        });
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filter.push({
          range: {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        });
      }

      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: this.buildSort(sort, order),
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      };

      if (highlight && query) {
        searchBody.highlight = {
          fields: {
            title: {},
            content: {},
            bookTitle: {},
            userName: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        };
      }

      searchBody.aggs = {
        ratings: {
          terms: { field: 'rating', size: 5 }
        },
        statuses: {
          terms: { field: 'status', size: 10 }
        },
        reviewTrends: {
          date_histogram: {
            field: 'createdAt',
            calendar_interval: 'month',
            min_doc_count: 1
          }
        }
      };

      const response = await this.client.search({
        index: 'reviews',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('书评搜索失败:', error);
      throw error;
    }
  }

  /**
   * 获取搜索建议
   */
  async getSuggestions(query, type = 'all') {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const suggestions = [];

      if (type === 'all' || type === 'books') {
        const bookSuggestions = await this.client.search({
          index: 'books',
          body: {
            suggest: {
              title_suggest: {
                prefix: query,
                completion: {
                  field: 'title.suggest',
                  size: 5
                }
              }
            }
          }
        });

        if (bookSuggestions.suggest?.title_suggest?.[0]?.options) {
          suggestions.push(...bookSuggestions.suggest.title_suggest[0].options.map(option => ({
            text: option.text,
            type: 'book',
            score: option._score
          })));
        }
      }

      // 添加其他类型的建议...

      return suggestions.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('获取搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 智能搜索（使用机器学习）
   */
  async intelligentSearch(query, userId, options = {}) {
    try {
      // 获取用户偏好
      const userPreferences = await this.getUserPreferences(userId);
      
      // 基础搜索
      const searchResults = await this.search(query, options);
      
      // 应用个性化权重
      if (searchResults.books && userPreferences) {
        searchResults.books.forEach(book => {
          let personalizedScore = book._score;
          
          // 根据用户偏好调整评分
          if (userPreferences.categories && userPreferences.categories.includes(book._source.category)) {
            personalizedScore *= 1.5;
          }
          
          if (userPreferences.authors && userPreferences.authors.some(author => 
            book._source.authors.includes(author))) {
            personalizedScore *= 1.3;
          }
          
          book._personalizedScore = personalizedScore;
        });
        
        // 重新排序
        searchResults.books.sort((a, b) => b._personalizedScore - a._personalizedScore);
      }
      
      return searchResults;
    } catch (error) {
      logger.error('智能搜索失败:', error);
      return this.search(query, options);
    }
  }

  /**
   * 获取用户偏好
   */
  async getUserPreferences(userId) {
    try {
      // 分析用户借阅历史
      const borrowHistory = await models.Borrow.findAll({
        where: { userId },
        include: [{
          model: models.Book,
          as: 'book',
          attributes: ['category', 'authors']
        }],
        limit: 50,
        order: [['createdAt', 'DESC']]
      });

      const categories = {};
      const authors = {};

      borrowHistory.forEach(borrow => {
        if (borrow.book) {
          // 统计分类偏好
          const category = borrow.book.category;
          categories[category] = (categories[category] || 0) + 1;

          // 统计作者偏好
          borrow.book.authors.forEach(author => {
            authors[author] = (authors[author] || 0) + 1;
          });
        }
      });

      return {
        categories: Object.keys(categories).sort((a, b) => categories[b] - categories[a]).slice(0, 5),
        authors: Object.keys(authors).sort((a, b) => authors[b] - authors[a]).slice(0, 10)
      };
    } catch (error) {
      logger.error('获取用户偏好失败:', error);
      return null;
    }
  }

  /**
   * 构建排序条件
   */
  buildSort(sort, order) {
    const sortMap = {
      '_score': { '_score': { order } },
      'title': { 'title.keyword': { order } },
      'author': { 'authors.keyword': { order } },
      'publicationYear': { 'publicationYear': { order } },
      'rating': { 'averageRating': { order } },
      'borrowCount': { 'borrowCount': { order } },
      'createdAt': { 'createdAt': { order } },
      'updatedAt': { 'updatedAt': { order } }
    };

    return sortMap[sort] || sortMap['_score'];
  }

  /**
   * 格式化搜索响应
   */
  formatSearchResponse(response) {
    return {
      hits: response.hits.hits.map(hit => ({
        ...hit._source,
        _id: hit._id,
        _score: hit._score,
        _highlight: hit.highlight || {}
      })),
      total: typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total,
      maxScore: response.hits.max_score,
      aggregations: response.aggregations || {},
      took: response.took
    };
  }

  /**
   * 降级搜索（当Elasticsearch不可用时）
   */
  async fallbackSearch(query, options = {}) {
    logger.warn('使用数据库降级搜索');
    
    try {
      const { type = 'books', page = 1, limit = 20 } = options;
      
      if (type === 'books' || type === 'all') {
        const where = {};
        
        if (query) {
          where[models.Sequelize.Op.or] = [
            { title: { [models.Sequelize.Op.iLike]: `%${query}%` } },
            { authors: { [models.Sequelize.Op.contains]: [query] } },
            { summary: { [models.Sequelize.Op.iLike]: `%${query}%` } }
          ];
        }

        const books = await models.Book.findAndCountAll({
          where,
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']]
        });

        return {
          hits: books.rows,
          total: books.count,
          aggregations: {},
          fallback: true
        };
      }

      return { hits: [], total: 0, aggregations: {}, fallback: true };
    } catch (error) {
      logger.error('降级搜索失败:', error);
      return { hits: [], total: 0, aggregations: {}, fallback: true };
    }
  }

  /**
   * 索引同步方法
   */
  async indexBook(book) {
    if (!this.isAvailable()) return;

    try {
      await this.client.index({
        index: 'books',
        id: book.id,
        body: book
      });
    } catch (error) {
      logger.error(`索引图书失败 (ID: ${book.id}):`, error);
    }
  }

  async indexUser(user) {
    if (!this.isAvailable()) return;

    try {
      // 移除敏感信息
      const { passwordHash, ...safeUser } = user;
      
      await this.client.index({
        index: 'users',
        id: user.id,
        body: safeUser
      });
    } catch (error) {
      logger.error(`索引用户失败 (ID: ${user.id}):`, error);
    }
  }

  async indexBorrow(borrow) {
    if (!this.isAvailable()) return;

    try {
      await this.client.index({
        index: 'borrows',
        id: borrow.id,
        body: borrow
      });
    } catch (error) {
      logger.error(`索引借阅记录失败 (ID: ${borrow.id}):`, error);
    }
  }

  async indexReview(review) {
    if (!this.isAvailable()) return;

    try {
      await this.client.index({
        index: 'reviews',
        id: review.id,
        body: review
      });
    } catch (error) {
      logger.error(`索引书评失败 (ID: ${review.id}):`, error);
    }
  }

  /**
   * 删除索引
   */
  async deleteFromIndex(index, id) {
    if (!this.isAvailable()) return;

    try {
      await this.client.delete({
        index,
        id,
        ignore: [404]
      });
    } catch (error) {
      logger.error(`删除索引失败 (${index}:${id}):`, error);
    }
  }

  /**
   * 批量重建索引
   */
  async reindexAll() {
    if (!this.isAvailable()) {
      logger.warn('Elasticsearch不可用，无法重建索引');
      return;
    }

    try {
      logger.info('开始重建所有索引...');

      // 重建图书索引
      await this.reindexBooks();
      
      // 重建用户索引
      await this.reindexUsers();
      
      // 重建借阅记录索引
      await this.reindexBorrows();
      
      // 重建书评索引
      await this.reindexReviews();

      logger.info('✅ 所有索引重建完成');
    } catch (error) {
      logger.error('重建索引失败:', error);
      throw error;
    }
  }

  async reindexBooks() {
    logger.info('重建图书索引...');
    
    const books = await models.Book.findAll();
    const operations = [];

    for (const book of books) {
      operations.push(
        { index: { _index: 'books', _id: book.id } },
        book.toJSON()
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 图书索引重建完成 (${books.length} 条记录)`);
  }

  async reindexUsers() {
    logger.info('重建用户索引...');
    
    const users = await models.User.findAll({
      attributes: { exclude: ['passwordHash'] }
    });
    const operations = [];

    for (const user of users) {
      operations.push(
        { index: { _index: 'users', _id: user.id } },
        user.toJSON()
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 用户索引重建完成 (${users.length} 条记录)`);
  }

  async reindexBorrows() {
    logger.info('重建借阅记录索引...');
    
    const borrows = await models.Borrow.findAll({
      include: [
        { model: models.User, as: 'user', attributes: ['username', 'realName'] },
        { model: models.Book, as: 'book', attributes: ['title', 'isbn'] }
      ]
    });
    const operations = [];

    for (const borrow of borrows) {
      const borrowData = {
        ...borrow.toJSON(),
        userName: borrow.user?.realName || borrow.user?.username,
        bookTitle: borrow.book?.title,
        isbn: borrow.book?.isbn
      };

      operations.push(
        { index: { _index: 'borrows', _id: borrow.id } },
        borrowData
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 借阅记录索引重建完成 (${borrows.length} 条记录)`);
  }

  async reindexReviews() {
    logger.info('重建书评索引...');
    
    const reviews = await models.Review.findAll({
      include: [
        { model: models.User, as: 'user', attributes: ['username', 'realName'] },
        { model: models.Book, as: 'book', attributes: ['title'] }
      ]
    });
    const operations = [];

    for (const review of reviews) {
      const reviewData = {
        ...review.toJSON(),
        userName: review.user?.realName || review.user?.username,
        bookTitle: review.book?.title
      };

      operations.push(
        { index: { _index: 'reviews', _id: review.id } },
        reviewData
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 书评索引重建完成 (${reviews.length} 条记录)`);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'unavailable', message: 'Elasticsearch not initialized' };
    }

    return await elasticsearchConfig.healthCheck();
  }
}

// 创建单例实例
const searchService = new SearchService();

module.exports = searchService;