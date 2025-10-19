const elasticsearchConfig = require('../config/elasticsearch.config');
const prisma = require('../utils/prisma');
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
      
      // 如果是Elasticsearch错误，降级到数据库搜索
      if (error.name === 'ConnectionError' || error.name === 'ResponseError') {
        return this.fallbackSearch(query, options);
      }
      
      throw error;
    }
  }

  /**
   * 搜索图书
   */
  async searchBooks(query, options = {}) {
    if (!this.isAvailable()) {
      return this.fallbackSearch(query, { ...options, type: 'books' });
    }

    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const searchBody = {
        query: this.buildBooksQuery(query, filters),
        from: (page - 1) * limit,
        size: limit,
        sort: [this.buildSort(sort, order)],
        aggs: this.buildBooksAggregations()
      };

      if (highlight) {
        searchBody.highlight = {
          fields: {
            title: {},
            authors: {},
            summary: {},
            publisher: {}
          }
        };
      }

      const response = await this.client.search({
        index: 'books',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('图书搜索失败:', error);
      return this.fallbackSearch(query, { ...options, type: 'books' });
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(query, options = {}) {
    if (!this.isAvailable()) {
      return { hits: [], total: 0, aggregations: {} };
    }

    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const searchBody = {
        query: this.buildUsersQuery(query, filters),
        from: (page - 1) * limit,
        size: limit,
        sort: [this.buildSort(sort, order)],
        aggs: this.buildUsersAggregations()
      };

      if (highlight) {
        searchBody.highlight = {
          fields: {
            username: {},
            realName: {},
            email: {}
          }
        };
      }

      const response = await this.client.search({
        index: 'users',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('用户搜索失败:', error);
      return { hits: [], total: 0, aggregations: {} };
    }
  }

  /**
   * 搜索借阅记录
   */
  async searchBorrows(query, options = {}) {
    if (!this.isAvailable()) {
      return { hits: [], total: 0, aggregations: {} };
    }

    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const searchBody = {
        query: this.buildBorrowsQuery(query, filters),
        from: (page - 1) * limit,
        size: limit,
        sort: [this.buildSort(sort, order)],
        aggs: this.buildBorrowsAggregations()
      };

      if (highlight) {
        searchBody.highlight = {
          fields: {
            userName: {},
            bookTitle: {},
            isbn: {}
          }
        };
      }

      const response = await this.client.search({
        index: 'borrows',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('借阅记录搜索失败:', error);
      return { hits: [], total: 0, aggregations: {} };
    }
  }

  /**
   * 搜索书评
   */
  async searchReviews(query, options = {}) {
    if (!this.isAvailable()) {
      return { hits: [], total: 0, aggregations: {} };
    }

    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sort = '_score',
        order = 'desc',
        highlight = true
      } = options;

      const searchBody = {
        query: this.buildReviewsQuery(query, filters),
        from: (page - 1) * limit,
        size: limit,
        sort: [this.buildSort(sort, order)],
        aggs: this.buildReviewsAggregations()
      };

      if (highlight) {
        searchBody.highlight = {
          fields: {
            content: {},
            userName: {},
            bookTitle: {}
          }
        };
      }

      const response = await this.client.search({
        index: 'reviews',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('书评搜索失败:', error);
      return { hits: [], total: 0, aggregations: {} };
    }
  }

  /**
   * 获取搜索建议
   */
  async getSuggestions(query, type = 'all') {
    if (!this.isAvailable()) return [];

    try {
      const indices = type === 'all' ? ['books', 'users', 'borrows', 'reviews'] : [type];
      const suggestions = [];

      for (const index of indices) {
        const response = await this.client.search({
          index,
          body: {
            suggest: {
              [`${index}_suggest`]: {
                text: query,
                term: {
                  field: this.getSuggestField(index),
                  size: 5
                }
              }
            }
          }
        });

        if (response.suggest && response.suggest[`${index}_suggest`]) {
          suggestions.push(...response.suggest[`${index}_suggest`].map(s => s.options).flat());
        }
      }

      return suggestions.slice(0, 10);
    } catch (error) {
      logger.error('获取搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 智能搜索推荐
   */
  async getSmartRecommendations(userId, query, options = {}) {
    try {
      const { limit = 10 } = options;
      
      // 获取用户偏好
      const userPreferences = await this.getUserPreferences(userId);
      if (!userPreferences) {
        return this.searchBooks(query, { limit });
      }

      const searchBody = {
        query: {
          bool: {
            should: [
              // 基于查询的搜索
              {
                multi_match: {
                  query,
                  fields: ['title^3', 'authors^2', 'summary', 'publisher'],
                  fuzziness: 'AUTO'
                }
              },
              // 基于用户偏好的推荐
              {
                terms: {
                  category: userPreferences.categories,
                  boost: 2
                }
              },
              {
                terms: {
                  authors: userPreferences.authors,
                  boost: 1.5
                }
              }
            ],
            minimum_should_match: 1
          }
        },
        size: limit,
        sort: [
          { _score: { order: 'desc' } },
          { borrowCount: { order: 'desc' } }
        ]
      };

      const response = await this.client.search({
        index: 'books',
        body: searchBody
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      logger.error('智能推荐搜索失败:', error);
      return this.searchBooks(query, options);
    }
  }

  /**
   * 构建图书查询
   */
  buildBooksQuery(query, filters = {}) {
    const must = [];
    const filter = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'authors^2', 'summary', 'publisher', 'isbn'],
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // 应用过滤器
    if (filters.category) {
      filter.push({ term: { category } });
    }
    if (filters.authors) {
      filter.push({ terms: { authors: filters.authors } });
    }
    if (filters.publisher) {
      filter.push({ term: { 'publisher.keyword': filters.publisher } });
    }
    if (filters.yearRange) {
      filter.push({
        range: {
          publicationYear: {
            gte: filters.yearRange.min,
            lte: filters.yearRange.max
          }
        }
      });
    }
    if (filters.available !== undefined) {
      filter.push({ term: { available: filters.available } });
    }

    return {
      bool: {
        must,
        filter: filter.length > 0 ? filter : undefined
      }
    };
  }

  /**
   * 构建用户查询
   */
  buildUsersQuery(query, filters = {}) {
    const must = [];
    const filter = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['username^2', 'realName^2', 'email', 'studentId'],
          fuzziness: 'AUTO'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // 应用过滤器
    if (filters.role) {
      filter.push({ term: { role: filters.role } });
    }
    if (filters.status) {
      filter.push({ term: { status: filters.status } });
    }
    if (filters.department) {
      filter.push({ term: { 'department.keyword': filters.department } });
    }

    return {
      bool: {
        must,
        filter: filter.length > 0 ? filter : undefined
      }
    };
  }

  /**
   * 构建借阅记录查询
   */
  buildBorrowsQuery(query, filters = {}) {
    const must = [];
    const filter = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['userName', 'bookTitle', 'isbn'],
          fuzziness: 'AUTO'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // 应用过滤器
    if (filters.status) {
      filter.push({ term: { status: filters.status } });
    }
    if (filters.dateRange) {
      filter.push({
        range: {
          borrowDate: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        }
      });
    }

    return {
      bool: {
        must,
        filter: filter.length > 0 ? filter : undefined
      }
    };
  }

  /**
   * 构建书评查询
   */
  buildReviewsQuery(query, filters = {}) {
    const must = [];
    const filter = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['content^2', 'userName', 'bookTitle'],
          fuzziness: 'AUTO'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // 应用过滤器
    if (filters.rating) {
      filter.push({ term: { rating: filters.rating } });
    }
    if (filters.dateRange) {
      filter.push({
        range: {
          createdAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        }
      });
    }

    return {
      bool: {
        must,
        filter: filter.length > 0 ? filter : undefined
      }
    };
  }

  /**
   * 构建聚合查询
   */
  buildBooksAggregations() {
    return {
      categories: {
        terms: { field: 'category.keyword', size: 10 }
      },
      authors: {
        terms: { field: 'authors.keyword', size: 20 }
      },
      publishers: {
        terms: { field: 'publisher.keyword', size: 10 }
      },
      publication_years: {
        histogram: { field: 'publicationYear', interval: 5 }
      }
    };
  }

  buildUsersAggregations() {
    return {
      roles: {
        terms: { field: 'role.keyword' }
      },
      status: {
        terms: { field: 'status.keyword' }
      },
      departments: {
        terms: { field: 'department.keyword', size: 10 }
      }
    };
  }

  buildBorrowsAggregations() {
    return {
      status: {
        terms: { field: 'status.keyword' }
      },
      borrow_dates: {
        date_histogram: {
          field: 'borrowDate',
          calendar_interval: 'month'
        }
      }
    };
  }

  buildReviewsAggregations() {
    return {
      ratings: {
        terms: { field: 'rating' }
      },
      review_dates: {
        date_histogram: {
          field: 'createdAt',
          calendar_interval: 'month'
        }
      }
    };
  }

  /**
   * 获取建议字段
   */
  getSuggestField(index) {
    const fields = {
      books: 'title',
      users: 'username',
      borrows: 'bookTitle',
      reviews: 'content'
    };
    return fields[index] || 'title';
  }

  /**
   * 获取用户偏好 (Prisma版本)
   */
  async getUserPreferences(userId) {
    try {
      // 分析用户借阅历史
      const borrowHistory = await prisma.borrows.findMany({
        where: { user_id: parseInt(userId) },
        include: {
          book: {
            select: {
              category: true,
              authors: true
            }
          }
        },
        take: 50,
        orderBy: { created_at: 'desc' }
      });

      const categories = {};
      const authors = {};

      borrowHistory.forEach(borrow => {
        if (borrow.book) {
          // 统计分类偏好
          const category = borrow.book.category;
          if (category) {
            categories[category] = (categories[category] || 0) + 1;
          }

          // 统计作者偏好
          if (Array.isArray(borrow.book.authors)) {
            borrow.book.authors.forEach(author => {
              authors[author] = (authors[author] || 0) + 1;
            });
          } else if (typeof borrow.book.authors === 'string') {
            // Handle case where authors is stored as a string
            const authorList = borrow.book.authors.split(',').map(a => a.trim());
            authorList.forEach(author => {
              authors[author] = (authors[author] || 0) + 1;
            });
          }
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
   * 降级搜索（当Elasticsearch不可用时）(Prisma版本)
   */
  async fallbackSearch(query, options = {}) {
    logger.warn('使用数据库降级搜索');
    
    try {
      const { type = 'books', page = 1, limit = 20 } = options;
      
      if (type === 'books' || type === 'all') {
        let where = { is_deleted: false };
        
        const normalizedQuery = typeof query === 'string' ? query.trim() : '';
        if (normalizedQuery) {
          where.OR = [
            { title: { contains: normalizedQuery } },
            { authors: { has: normalizedQuery } },
            { summary: { contains: normalizedQuery } }
          ];
        }

        const [books, totalCount] = await Promise.all([
          prisma.books.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { created_at: 'desc' }
          }),
          prisma.books.count({ where })
        ]);

        return {
          hits: books,
          total: totalCount,
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
      const { password_hash, email_verification_token, ...safeUser } = user;
      
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
   * 批量重建索引 (Prisma版本)
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
    
    const books = await prisma.books.findMany();
    const operations = [];

    for (const book of books) {
      operations.push(
        { index: { _index: 'books', _id: book.id } },
        book
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 图书索引重建完成 (${books.length} 条记录)`);
  }

  async reindexUsers() {
    logger.info('重建用户索引...');
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        real_name: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        last_login_at: true,
        last_login_ip: true,
        created_at: true,
        updated_at: true
        // Exclude password_hash and other sensitive fields
        // Note: removed fields that don't exist in current schema:
        // bio, gender, birthday, student_id, department, points_balance,
        // borrow_permission, borrow_limit, email_verified, phone_verified,
        // login_count, preferences
      }
    });
    const operations = [];

    for (const user of users) {
      operations.push(
        { index: { _index: 'users', _id: user.id } },
        user
      );
    }

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }

    logger.info(`✅ 用户索引重建完成 (${users.length} 条记录)`);
  }

  async reindexBorrows() {
    logger.info('重建借阅记录索引...');
    
    const borrows = await prisma.borrows.findMany({
      include: {
        user: {
          select: {
            username: true,
            real_name: true
          }
        },
        book: {
          select: {
            title: true,
            isbn: true
          }
        }
      }
    });
    const operations = [];

    for (const borrow of borrows) {
      const borrowData = {
        ...borrow,
        userName: borrow.user?.real_name || borrow.user?.username,
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
    
    const reviews = await prisma.reviews.findMany({
      include: {
        user: {
          select: {
            username: true,
            real_name: true
          }
        },
        book: {
          select: {
            title: true
          }
        }
      }
    });
    const operations = [];

    for (const review of reviews) {
      const reviewData = {
        ...review,
        userName: review.user?.real_name || review.user?.username,
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