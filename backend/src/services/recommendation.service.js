const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const recommendationEngine = require('./recommendationEngine.service');
const behaviorTrackingService = require('./behaviorTracking.service');
const EventEmitter = require('events');

/**
 * 推荐服务 - 统一推荐系统接口
 */
class RecommendationService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.cache = new Map();
    this.cacheExpiry = 300000; // 5分钟缓存
    this.batchQueue = [];
    this.modelTrainingSchedule = null;
  }

  /**
   * 启动推荐服务
   */
  async start() {
    try {
      logger.info('🎯 启动推荐服务...');
      
      // 初始化推荐引擎
      await recommendationEngine.initialize();
      
      // 启动行为追踪服务
      await behaviorTrackingService.start();
      
      // 初始化默认模型
      await this.initializeDefaultModels();
      
      // 启动定时任务
      this.startScheduledTasks();
      
      // 设置事件监听
      this.setupEventListeners();
      
      this.isRunning = true;
      logger.info('✅ 推荐服务启动成功');
    } catch (error) {
      logger.error('❌ 推荐服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止推荐服务
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      logger.info('🛑 停止推荐服务...');
      
      // 停止行为追踪服务
      await behaviorTrackingService.stop();
      
      // 清理定时任务
      if (this.modelTrainingSchedule) {
        clearInterval(this.modelTrainingSchedule);
      }
      
      // 清理缓存
      this.cache.clear();
      
      this.isRunning = false;
      logger.info('✅ 推荐服务已停止');
    } catch (error) {
      logger.error('❌ 停止推荐服务失败:', error);
    }
  }

  /**
   * 获取用户推荐
   */
  async getUserRecommendations(userId, options = {}) {
    try {
      const {
        scenario = 'homepage',
        algorithm = 'auto',
        limit = 10,
        useCache = true,
        forceRefresh = false,
        includeExplanations = true,
        diversityFactor = 0.3,
        contextInfo = {}
      } = options;

      // 检查缓存
      const cacheKey = this.generateCacheKey(userId, scenario, algorithm, limit);
      if (useCache && !forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          logger.debug(`✅ 返回缓存推荐 [用户: ${userId}, 场景: ${scenario}]`);
          return cached.data;
        }
      }

      // 生成新推荐
      const recommendations = await recommendationEngine.generateRecommendations(userId, {
        scenario,
        algorithm,
        limit,
        diversityFactor,
        includeExplanations,
        contextInfo
      });

      // 更新缓存
      if (useCache) {
        this.cache.set(cacheKey, {
          data: recommendations,
          timestamp: Date.now()
        });
      }

      // 记录推荐展示
      await this.recordRecommendationDisplay(userId, recommendations.recommendations, scenario);

      logger.info(`✅ 为用户 ${userId} 生成推荐成功 [${scenario}]: ${recommendations.recommendations.length} 个`);
      
      return recommendations;

    } catch (error) {
      logger.error(`获取用户推荐失败 [用户: ${userId}]:`, error);
      throw error;
    }
  }

  /**
   * 获取相似图书推荐
   */
  async getSimilarBooks(bookId, userId = null, limit = 10) {
    try {
      // 获取目标图书
      const targetBook = await models.Book.findByPk(bookId, {
        include: [
          {
            model: models.UserBehavior,
            as: 'behaviors',
            attributes: ['userId', 'intensity'],
            limit: 100
          }
        ]
      });

      if (!targetBook) {
        throw new Error('Book not found');
      }

      // 基于内容相似性
      const contentSimilar = await this.findContentSimilarBooks(targetBook, limit);
      
      // 基于行为相似性
      const behaviorSimilar = await this.findBehaviorSimilarBooks(targetBook, limit);
      
      // 合并和排序
      const similarBooks = this.mergeSimilarBooks(contentSimilar, behaviorSimilar, limit);
      
      // 如果有用户信息，个性化调整
      if (userId) {
        const personalizedSimilar = await this.personalizeRecommendations(userId, similarBooks);
        return personalizedSimilar;
      }

      return similarBooks;

    } catch (error) {
      logger.error(`获取相似图书失败 [图书: ${bookId}]:`, error);
      throw error;
    }
  }

  /**
   * 获取热门推荐
   */
  async getTrendingRecommendations(userId = null, options = {}) {
    try {
      const {
        timeRange = 7,
        category = null,
        limit = 20,
        includeGlobal = true
      } = options;

      const trending = [];

      // 全局热门
      if (includeGlobal) {
        const globalTrending = await this.getGlobalTrending(timeRange, limit / 2);
        trending.push(...globalTrending);
      }

      // 分类热门
      if (category) {
        const categoryTrending = await this.getCategoryTrending(category, timeRange, limit / 2);
        trending.push(...categoryTrending);
      }

      // 个性化调整
      if (userId) {
        const personalizedTrending = await this.personalizeRecommendations(userId, trending);
        return personalizedTrending.slice(0, limit);
      }

      return trending.slice(0, limit);

    } catch (error) {
      logger.error('获取热门推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取新书推荐
   */
  async getNewBooksRecommendations(userId = null, options = {}) {
    try {
      const {
        daysRange = 30,
        limit = 20,
        minRating = 3.5
      } = options;

      const startDate = new Date(Date.now() - daysRange * 24 * 60 * 60 * 1000);

      // 获取新书
      const newBooks = await models.Book.findAll({
        where: {
          createdAt: {
            [models.sequelize.Op.gte]: startDate
          },
          avgRating: {
            [models.sequelize.Op.gte]: minRating
          }
        },
        order: [
          ['createdAt', 'DESC'],
          ['avgRating', 'DESC']
        ],
        limit: limit * 2 // 获取更多候选
      });

      // 个性化过滤和排序
      if (userId) {
        const personalizedNew = await this.personalizeRecommendations(userId, 
          newBooks.map(book => ({
            bookId: book.id,
            book,
            score: this.calculateNewBookScore(book),
            algorithm: 'new_books',
            explanation: `新书推荐: ${book.createdAt.toLocaleDateString()}`
          }))
        );
        return personalizedNew.slice(0, limit);
      }

      return newBooks.slice(0, limit).map(book => ({
        bookId: book.id,
        book,
        score: this.calculateNewBookScore(book),
        algorithm: 'new_books',
        explanation: `新书推荐: ${book.createdAt.toLocaleDateString()}`
      }));

    } catch (error) {
      logger.error('获取新书推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取基于朋友的推荐
   */
  async getSocialRecommendations(userId, options = {}) {
    try {
      const { limit = 10, friendsOnly = false } = options;

      // 获取用户社交关系（这里假设有朋友关系表）
      // const friends = await this.getUserFriends(userId);
      
      // 简化实现：基于相似用户
      const similarUsers = await this.findSimilarUsers(userId, 20);
      
      if (similarUsers.length === 0) {
        return [];
      }

      // 获取相似用户的热门行为
      const socialRecommendations = await this.getSimilarUsersRecommendations(userId, similarUsers, limit);

      return socialRecommendations;

    } catch (error) {
      logger.error(`获取社交推荐失败 [用户: ${userId}]:`, error);
      throw error;
    }
  }

  /**
   * 记录用户对推荐的反馈
   */
  async recordRecommendationFeedback(userId, recommendationId, feedbackData) {
    try {
      const {
        feedbackType = 'explicit',
        rating = null,
        relevance = null,
        satisfaction = null,
        comment = null,
        context = {}
      } = feedbackData;

      // 获取推荐记录
      const recommendation = await models.Recommendation.findByPk(recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // 计算反馈值
      let feedbackValue = 0;
      if (rating !== null) {
        feedbackValue = (rating - 3) / 2; // 转换5星评分到-1到1
      } else if (relevance !== null) {
        feedbackValue = relevance;
      }

      // 创建反馈记录
      const feedback = await models.RecommendationFeedback.create({
        userId,
        recommendationId,
        bookId: recommendation.bookId,
        feedbackType,
        feedbackValue,
        rawFeedbackValue: rating?.toString() || relevance?.toString(),
        feedbackDimensions: {
          relevance,
          satisfaction,
          interest: feedbackData.interest || null,
          quality: feedbackData.quality || null
        },
        feedbackContent: {
          text_feedback: comment,
          selected_reasons: feedbackData.reasons || [],
          emotional_response: feedbackData.emotion || null
        },
        feedbackContext: {
          ...context,
          timestamp: new Date(),
          source: context.source || 'web'
        }
      });

      // 更新推荐状态
      await recommendation.addUserFeedback({
        relevance_rating: relevance,
        satisfaction,
        feedback_text: comment,
        feedback_timestamp: new Date()
      });

      // 实时学习
      await this.processRecommendationFeedback(feedback);

      logger.info(`✅ 记录推荐反馈 [用户: ${userId}, 推荐: ${recommendationId}]`);
      
      return { success: true, feedbackId: feedback.id };

    } catch (error) {
      logger.error('记录推荐反馈失败:', error);
      throw error;
    }
  }

  /**
   * 追踪推荐点击
   */
  async trackRecommendationClick(userId, recommendationId, context = {}) {
    try {
      // 更新推荐状态
      const recommendation = await models.Recommendation.findByPk(recommendationId);
      if (recommendation) {
        await recommendation.markAsClicked();
      }

      // 追踪行为
      await behaviorTrackingService.trackRecommendationInteraction(userId, recommendationId, 'click', context);

      // 隐式反馈
      await this.recordImplicitFeedback(userId, recommendationId, 'click', 0.5);

      logger.debug(`✅ 追踪推荐点击 [用户: ${userId}, 推荐: ${recommendationId}]`);
      
      return { success: true };

    } catch (error) {
      logger.error('追踪推荐点击失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐解释
   */
  async getRecommendationExplanation(recommendationId) {
    try {
      const recommendation = await models.Recommendation.findByPk(recommendationId, {
        include: [
          { model: models.Book, as: 'book' },
          { model: models.RecommendationModel, as: 'model' },
          { model: models.User, as: 'user', attributes: ['id', 'username'] }
        ]
      });

      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      const explanation = await this.generateDetailedExplanation(recommendation);
      
      return explanation;

    } catch (error) {
      logger.error(`获取推荐解释失败 [推荐: ${recommendationId}]:`, error);
      throw error;
    }
  }

  /**
   * 获取推荐统计
   */
  async getRecommendationStatistics(timeRange = 30) {
    try {
      const stats = {};

      // 基础统计
      stats.overview = await models.Recommendation.getEffectivenessStats(timeRange);
      
      // 点击率统计
      stats.clickThroughRates = await models.Recommendation.getClickThroughRates('algorithm', timeRange);
      
      // 用户反馈统计
      stats.feedbackStats = await models.RecommendationFeedback.getFeedbackQualityAnalysis(timeRange);
      
      // 算法性能对比
      stats.algorithmComparison = await models.RecommendationFeedback.getAlgorithmFeedbackComparison(timeRange);
      
      // 多样性统计
      stats.diversity = await this.calculateSystemDiversity(timeRange);
      
      // 覆盖率统计
      stats.coverage = await this.calculateSystemCoverage(timeRange);

      return stats;

    } catch (error) {
      logger.error('获取推荐统计失败:', error);
      throw error;
    }
  }

  /**
   * 初始化默认模型
   */
  async initializeDefaultModels() {
    try {
      const created = await models.RecommendationModel.createDefaultModels();
      if (created.length > 0) {
        logger.info(`✅ 创建了 ${created.length} 个默认推荐模型`);
      }

      const defaultTemplates = await models.NotificationTemplate.createDefaultTemplates();
      logger.info(`✅ 初始化了推荐系统通知模板`);

    } catch (error) {
      logger.error('初始化默认模型失败:', error);
    }
  }

  /**
   * 启动定时任务
   */
  startScheduledTasks() {
    // 定期清理过期推荐
    setInterval(async () => {
      try {
        const cleaned = await models.Recommendation.cleanupExpired();
        if (cleaned > 0) {
          logger.info(`✅ 清理了 ${cleaned} 个过期推荐`);
        }
      } catch (error) {
        logger.error('清理过期推荐失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时执行

    // 定期模型重训练检查
    this.modelTrainingSchedule = setInterval(async () => {
      try {
        await this.checkAndTriggerModelTraining();
      } catch (error) {
        logger.error('模型训练检查失败:', error);
      }
    }, 24 * 60 * 60 * 1000); // 每天检查

    // 定期更新用户偏好
    setInterval(async () => {
      try {
        await this.updateStaleUserPreferences();
      } catch (error) {
        logger.error('更新用户偏好失败:', error);
      }
    }, 6 * 60 * 60 * 1000); // 每6小时执行
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听行为追踪事件
    behaviorTrackingService.on('behaviorTracked', async (behavior) => {
      // 清理相关缓存
      this.clearUserCache(behavior.userId);
    });

    behaviorTrackingService.on('highPriorityBehavior', async (behavior) => {
      // 高优先级行为触发实时推荐更新
      this.clearUserCache(behavior.userId);
      
      // 触发实时推荐生成
      if (behavior.behaviorType === 'borrow') {
        setImmediate(async () => {
          try {
            await this.generateRealTimeRecommendations(behavior.userId, behavior);
          } catch (error) {
            logger.error('生成实时推荐失败:', error);
          }
        });
      }
    });
  }

  /**
   * 辅助方法
   */

  generateCacheKey(userId, scenario, algorithm, limit) {
    return `rec_${userId}_${scenario}_${algorithm}_${limit}`;
  }

  clearUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`rec_${userId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async recordRecommendationDisplay(userId, recommendations, scenario) {
    try {
      for (const rec of recommendations) {
        if (rec.id) {
          const recommendation = await models.Recommendation.findByPk(rec.id);
          if (recommendation) {
            await recommendation.markAsDisplayed();
          }
        }
      }
    } catch (error) {
      logger.error('记录推荐展示失败:', error);
    }
  }

  async recordImplicitFeedback(userId, recommendationId, action, intensity) {
    try {
      const recommendation = await models.Recommendation.findByPk(recommendationId);
      if (!recommendation) return;

      await models.RecommendationFeedback.createImplicitFeedback(
        userId,
        recommendation.bookId,
        action,
        intensity,
        {
          recommendationId,
          source: 'implicit',
          timestamp: new Date()
        }
      );
    } catch (error) {
      logger.error('记录隐式反馈失败:', error);
    }
  }

  async processRecommendationFeedback(feedback) {
    try {
      // 更新用户偏好
      if (feedback.feedbackValue !== 0) {
        await behaviorTrackingService.updateUserPreferencesRealTime(
          feedback.userId,
          feedback.bookId,
          'feedback',
          feedback.feedbackValue
        );
      }

      // 标记为已处理
      await feedback.markAsProcessed({
        processed_at: new Date(),
        learning_applied: true
      });

    } catch (error) {
      logger.error('处理推荐反馈失败:', error);
    }
  }

  calculateNewBookScore(book) {
    const daysSincePublished = (new Date() - new Date(book.createdAt)) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0.1, 1 - daysSincePublished / 30); // 30天内的新鲜度
    const qualityScore = (book.avgRating || 3.0) / 5.0;
    
    return (freshnessScore * 0.6 + qualityScore * 0.4);
  }

  // 占位符方法（完整实现需要更多代码）
  async findContentSimilarBooks(targetBook, limit) { return []; }
  async findBehaviorSimilarBooks(targetBook, limit) { return []; }
  mergeSimilarBooks(contentSimilar, behaviorSimilar, limit) { return []; }
  async personalizeRecommendations(userId, recommendations) { return recommendations; }
  async getGlobalTrending(timeRange, limit) { return []; }
  async getCategoryTrending(category, timeRange, limit) { return []; }
  async findSimilarUsers(userId, limit) { return []; }
  async getSimilarUsersRecommendations(userId, similarUsers, limit) { return []; }
  async generateDetailedExplanation(recommendation) { return {}; }
  async calculateSystemDiversity(timeRange) { return 0; }
  async calculateSystemCoverage(timeRange) { return 0; }
  async checkAndTriggerModelTraining() {}
  async updateStaleUserPreferences() {}
  async generateRealTimeRecommendations(userId, behavior) {}
}

// 创建单例实例
const recommendationService = new RecommendationService();

module.exports = recommendationService;