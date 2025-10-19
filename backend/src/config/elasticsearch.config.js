const { Client } = require('@elastic/elasticsearch');
const config = require('./index');
const { logger } = require('../utils/logger');

/**
 * Elasticsearch配置和客户端
 */
class ElasticsearchConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 5;
  }

  /**
   * 初始化Elasticsearch客户端
   */
  async initialize() {
    try {
      const elasticsearchConfig = {
        node: config.elasticsearch.node,
        auth: config.elasticsearch.auth ? {
          username: config.elasticsearch.auth.username,
          password: config.elasticsearch.auth.password
        } : undefined,
        ssl: config.elasticsearch.ssl ? {
          rejectUnauthorized: config.elasticsearch.ssl.rejectUnauthorized
        } : undefined,
        requestTimeout: 30000,
        pingTimeout: 3000,
        sniffOnStart: true,
        sniffInterval: 60000,
        sniffOnConnectionFault: true,
        maxRetries: 3,
        resurrectStrategy: 'ping'
      };

      this.client = new Client(elasticsearchConfig);

      // 测试连接
      await this.client.ping();
      this.isConnected = true;
      this.retryAttempts = 0;

      logger.info('✅ Elasticsearch连接成功');
      
      // 初始化索引
      await this.initializeIndices();
      
      return this.client;
    } catch (error) {
      this.isConnected = false;
      this.retryAttempts++;
      
      logger.error('❌ Elasticsearch连接失败:', error);
      
      if (this.retryAttempts < this.maxRetryAttempts) {
        logger.info(`🔄 重试连接Elasticsearch (${this.retryAttempts}/${this.maxRetryAttempts})`);
        await this.delay(5000 * this.retryAttempts);
        return this.initialize();
      } else {
        logger.error('❌ Elasticsearch连接失败，已达到最大重试次数');
        throw error;
      }
    }
  }

  /**
   * 初始化索引
   */
  async initializeIndices() {
    try {
      const indices = [
        {
          index: 'books',
          settings: this.getBooksIndexSettings(),
          mappings: this.getBooksIndexMappings()
        },
        {
          index: 'users',
          settings: this.getUsersIndexSettings(),
          mappings: this.getUsersIndexMappings()
        },
        {
          index: 'borrows',
          settings: this.getBorrowsIndexSettings(),
          mappings: this.getBorrowsIndexMappings()
        },
        {
          index: 'reviews',
          settings: this.getReviewsIndexSettings(),
          mappings: this.getReviewsIndexMappings()
        }
      ];

      for (const indexConfig of indices) {
        await this.createIndexIfNotExists(indexConfig);
      }

      logger.info('✅ Elasticsearch索引初始化完成');
    } catch (error) {
      logger.error('❌ Elasticsearch索引初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建索引（如果不存在）
   */
  async createIndexIfNotExists({ index, settings, mappings }) {
    try {
      const exists = await this.client.indices.exists({ index });
      
      if (!exists) {
        await this.client.indices.create({
          index,
          settings,
          mappings
        });
        logger.info(`✅ 创建索引: ${index}`);
      } else {
        // 更新映射（如果需要）
        try {
          await this.client.indices.putMapping({
            index,
            ...mappings
          });
          logger.debug(`🔄 更新索引映射: ${index}`);
        } catch (mappingError) {
          logger.warn(`⚠️ 更新索引映射失败: ${index}`, mappingError.message);
        }
      }
    } catch (error) {
      logger.error(`❌ 创建索引失败: ${index}`, error);
      throw error;
    }
  }

  /**
   * 图书索引设置
   */
  getBooksIndexSettings() {
    return {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          chinese_analyzer: {
            type: 'custom',
            tokenizer: 'ik_max_word',
            filter: ['lowercase']
          },
          chinese_search_analyzer: {
            type: 'custom',
            tokenizer: 'ik_smart',
            filter: ['lowercase']
          }
        }
      }
    };
  }

  /**
   * 图书索引映射
   */
  getBooksIndexMappings() {
    return {
      properties: {
        id: { type: 'integer' },
        title: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          search_analyzer: 'chinese_search_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            suggest: {
              type: 'completion',
              analyzer: 'chinese_analyzer'
            }
          }
        },
        isbn: { type: 'keyword' },
        authors: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          search_analyzer: 'chinese_search_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        publisher: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          search_analyzer: 'chinese_search_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        publicationYear: { type: 'integer' },
        category: { type: 'keyword' },
        tags: { type: 'keyword' },
        summary: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          search_analyzer: 'chinese_search_analyzer'
        },
        language: { type: 'keyword' },
        totalStock: { type: 'integer' },
        availableStock: { type: 'integer' },
        borrowCount: { type: 'integer' },
        averageRating: { type: 'float' },
        reviewCount: { type: 'integer' },
        status: { type: 'keyword' },
        location: { type: 'keyword' },
        coverImage: { type: 'keyword' },
        ebookUrl: { type: 'keyword' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      }
    };
  }

  /**
   * 用户索引设置
   */
  getUsersIndexSettings() {
    return {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          chinese_analyzer: {
            type: 'custom',
            tokenizer: 'ik_max_word',
            filter: ['lowercase']
          }
        }
      }
    };
  }

  /**
   * 用户索引映射
   */
  getUsersIndexMappings() {
    return {
      properties: {
        id: { type: 'integer' },
        username: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        email: { type: 'keyword' },
        realName: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        phone: { type: 'keyword' },
        role: { type: 'keyword' },
        status: { type: 'keyword' },
        totalPoints: { type: 'integer' },
        borrowCount: { type: 'integer' },
        currentBorrows: { type: 'integer' },
        overdueCount: { type: 'integer' },
        createdAt: { type: 'date' },
        lastLogin: { type: 'date' }
      }
    };
  }

  /**
   * 借阅索引设置
   */
  getBorrowsIndexSettings() {
    return {
      number_of_shards: 1,
      number_of_replicas: 0
    };
  }

  /**
   * 借阅索引映射
   */
  getBorrowsIndexMappings() {
    return {
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        bookId: { type: 'integer' },
        userName: { type: 'keyword' },
        bookTitle: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        isbn: { type: 'keyword' },
        status: { type: 'keyword' },
        borrowDate: { type: 'date' },
        dueDate: { type: 'date' },
        returnDate: { type: 'date' },
        renewCount: { type: 'integer' },
        isOverdue: { type: 'boolean' },
        overdueDays: { type: 'integer' },
        fineAmount: { type: 'float' }
      }
    };
  }

  /**
   * 书评索引设置
   */
  getReviewsIndexSettings() {
    return {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          chinese_analyzer: {
            type: 'custom',
            tokenizer: 'ik_max_word',
            filter: ['lowercase']
          }
        }
      }
    };
  }

  /**
   * 书评索引映射
   */
  getReviewsIndexMappings() {
    return {
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        bookId: { type: 'integer' },
        userName: { type: 'keyword' },
        bookTitle: {
          type: 'text',
          analyzer: 'chinese_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        rating: { type: 'integer' },
        title: {
          type: 'text',
          analyzer: 'chinese_analyzer'
        },
        content: {
          type: 'text',
          analyzer: 'chinese_analyzer'
        },
        likes: { type: 'integer' },
        status: { type: 'keyword' },
        isAnonymous: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      }
    };
  }

  /**
   * 获取客户端
   */
  getClient() {
    if (!this.isConnected) {
      throw new Error('Elasticsearch client is not connected');
    }
    return this.client;
  }

  /**
   * 检查连接状态
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return { status: 'disconnected', message: 'Client not initialized' };
      }

      const health = await this.client.cluster.health();
      return {
        status: 'connected',
        cluster: health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      logger.info('✅ Elasticsearch连接已关闭');
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重建索引
   */
  async reindexAll() {
    try {
      logger.info('🔄 开始重建所有索引...');
      
      const indices = ['books', 'users', 'borrows', 'reviews'];
      
      for (const index of indices) {
        await this.client.indices.delete({ index, ignore_unavailable: true });
        logger.info(`🗑️ 删除索引: ${index}`);
      }
      
      await this.initializeIndices();
      
      logger.info('✅ 所有索引重建完成');
    } catch (error) {
      logger.error('❌ 重建索引失败:', error);
      throw error;
    }
  }

  /**
   * 获取索引统计
   */
  async getIndexStats() {
    try {
      const stats = await this.client.indices.stats();
      return stats;
    } catch (error) {
      logger.error('获取索引统计失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const elasticsearchConfig = new ElasticsearchConfig();

module.exports = elasticsearchConfig;