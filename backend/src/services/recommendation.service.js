const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const recommendationEngine = require('./recommendationEngine.service');
const behaviorTrackingService = require('./behaviorTracking.service');
const EventEmitter = require('events');

/**
 * 推荐服务 - 统一推荐系统接口 (Prisma版本)
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
      const targetBook = await prisma.books.findUnique({
        where: { id: bookId },
        include: {
          user_behaviors: {
            select: {
              user_id: true,
              intensity: true
            },
            take: 100
          }
        }
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
      const newBooks = await prisma.books.findMany({
        where: {
          created_at: {
            gte: startDate
          },
          avg_rating: {
            gte: minRating
          }
        },
        orderBy: [
          { created_at: 'desc' },
          { avg_rating: 'desc' }
        ],
        take: limit * 2 // 获取更多候选
      });

      // 个性化过滤和排序
      if (userId) {
        const personalizedNew = await this.personalizeRecommendations(userId, 
          newBooks.map(book => ({
            bookId: book.id,
            book,
            score: this.calculateNewBookScore(book),
            algorithm: 'new_books',
            explanation: `新书推荐: ${book.created_at.toLocaleDateString()}`
          }))
        );
        return personalizedNew.slice(0, limit);
      }

      return newBooks.slice(0, limit).map(book => ({
        bookId: book.id,
        book,
        score: this.calculateNewBookScore(book),
        algorithm: 'new_books',
        explanation: `新书推荐: ${book.created_at.toLocaleDateString()}`
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
      const recommendation = await prisma.recommendations.findUnique({
        where: { id: recommendationId }
      });
      
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
      const feedback = await prisma.recommendation_feedbacks.create({
        data: {
          user_id: userId,
          recommendation_id: recommendationId,
          book_id: recommendation.book_id,
          feedback_type: feedbackType,
          feedback_value: feedbackValue,
          raw_feedback_value: rating?.toString() || relevance?.toString(),
          feedback_dimensions: {
            relevance,
            satisfaction,
            interest: feedbackData.interest || null,
            quality: feedbackData.quality || null
          },
          feedback_content: {
            text_feedback: comment,
            selected_reasons: feedbackData.reasons || [],
            emotional_response: feedbackData.emotion || null
          },
          feedback_context: {
            ...context,
            timestamp: new Date(),
            source: context.source || 'web'
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 更新推荐状态
      await prisma.recommendations.update({
        where: { id: recommendationId },
        data: {
          user_feedback: {
            relevance_rating: relevance,
            satisfaction,
            feedback_text: comment,
            feedback_timestamp: new Date()
          },
          updated_at: new Date()
        }
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
      const recommendation = await prisma.recommendations.findUnique({
        where: { id: recommendationId }
      });
      
      if (recommendation) {
        await prisma.recommendations.update({
          where: { id: recommendationId },
          data: {
            status: 'clicked',
            click_count: (recommendation.click_count || 0) + 1,
            last_clicked_at: new Date(),
            updated_at: new Date()
          }
        });
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
      const recommendation = await prisma.recommendations.findUnique({
        where: { id: recommendationId },
        include: {
          books: true,
          users: {
            select: { id: true, username: true }
          },
          recommendation_models: true
        }
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
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

      // 基础统计
      stats.overview = await this.getEffectivenessStats(timeRange);
      
      // 点击率统计
      stats.clickThroughRates = await this.getClickThroughRates('algorithm', timeRange);
      
      // 用户反馈统计
      stats.feedbackStats = await this.getFeedbackQualityAnalysis(timeRange);
      
      // 算法性能对比
      stats.algorithmComparison = await this.getAlgorithmFeedbackComparison(timeRange);
      
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
   * 获取有效性统计
   */
  async getEffectivenessStats(timeRange) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const [totalRecs, clickedRecs, ratedRecs, feedbackStats] = await Promise.all([
        // 总推荐数
        prisma.recommendations.count({
          where: {
            created_at: { gte: startDate }
          }
        }),
        
        // 被点击推荐数
        prisma.recommendations.count({
          where: {
            created_at: { gte: startDate },
            status: 'clicked'
          }
        }),
        
        // 有反馈的推荐数
        prisma.recommendations.count({
          where: {
            created_at: { gte: startDate },
            user_feedback: { not: null }
          }
        }),
        
        // 反馈统计
        prisma.recommendation_feedback.aggregate({
          where: {
            created_at: { gte: startDate }
          },
          _avg: { feedback_value: true },
          _count: { feedback_value: true }
        })
      ]);

      return {
        total_recommendations: totalRecs,
        clicked_recommendations: clickedRecs,
        rated_recommendations: ratedRecs,
        click_through_rate: totalRecs > 0 ? (clickedRecs / totalRecs) * 100 : 0,
        feedback_rate: totalRecs > 0 ? (ratedRecs / totalRecs) * 100 : 0,
        average_feedback: feedbackStats._avg.feedback_value || 0,
        total_feedback_count: feedbackStats._count.feedback_value || 0
      };
    } catch (error) {
      logger.error('获取有效性统计失败:', error);
      return {};
    }
  }

  /**
   * 获取点击率统计
   */
  async getClickThroughRates(groupBy, timeRange) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.$queryRaw`
        SELECT 
          algorithm_type,
          COUNT(*) as total_recommendations,
          SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked_recommendations,
          (SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as click_through_rate
        FROM recommendations 
        WHERE created_at >= ${startDate}
        GROUP BY algorithm_type
        ORDER BY click_through_rate DESC
      `;

      return stats.map(stat => ({
        algorithm: stat.algorithm_type,
        total_recommendations: Number(stat.total_recommendations),
        clicked_recommendations: Number(stat.clicked_recommendations),
        click_through_rate: Number(stat.click_through_rate)
      }));
    } catch (error) {
      logger.error('获取点击率统计失败:', error);
      return [];
    }
  }

  /**
   * 获取反馈质量分析
   */
  async getFeedbackQualityAnalysis(timeRange) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.$queryRaw`
        SELECT 
          feedback_type,
          COUNT(*) as count,
          AVG(feedback_value) as avg_feedback,
          STDDEV(feedback_value) as feedback_variance
        FROM recommendation_feedback 
        WHERE created_at >= ${startDate}
        GROUP BY feedback_type
      `;

      return stats.map(stat => ({
        feedback_type: stat.feedback_type,
        count: Number(stat.count),
        avg_feedback: Number(stat.avg_feedback),
        feedback_variance: Number(stat.feedback_variance || 0)
      }));
    } catch (error) {
      logger.error('获取反馈质量分析失败:', error);
      return [];
    }
  }

  /**
   * 获取算法反馈对比
   */
  async getAlgorithmFeedbackComparison(timeRange) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.$queryRaw`
        SELECT 
          r.algorithm_type,
          COUNT(rf.id) as feedback_count,
          AVG(rf.feedback_value) as avg_feedback,
          COUNT(CASE WHEN rf.feedback_value > 0 THEN 1 END) as positive_feedback,
          COUNT(CASE WHEN rf.feedback_value < 0 THEN 1 END) as negative_feedback
        FROM recommendations r
        LEFT JOIN recommendation_feedback rf ON r.id = rf.recommendation_id
        WHERE r.created_at >= ${startDate}
        GROUP BY r.algorithm_type
        ORDER BY avg_feedback DESC
      `;

      return stats.map(stat => ({
        algorithm: stat.algorithm_type,
        feedback_count: Number(stat.feedback_count),
        avg_feedback: Number(stat.avg_feedback || 0),
        positive_feedback: Number(stat.positive_feedback),
        negative_feedback: Number(stat.negative_feedback),
        positive_rate: stat.positive_feedback > 0 ? (Number(stat.positive_feedback) / Number(stat.feedback_count)) * 100 : 0
      }));
    } catch (error) {
      logger.error('获取算法反馈对比失败:', error);
      return [];
    }
  }

  /**
   * 初始化默认模型
   */
  async initializeDefaultModels() {
    try {
      // 检查是否已有模型
      const existingModels = await prisma.recommendation_models.count();
      if (existingModels > 0) {
        logger.info('推荐模型已存在，跳过初始化');
        return;
      }

      // 创建默认模型配置
      const defaultModels = [
        {
          name: 'collaborative_filtering_user_based',
          algorithm_type: 'collaborative_filtering',
          description: '基于用户的协同过滤算法',
          hyperparameters: {
            similarity_threshold: 0.1,
            neighbor_count: 50,
            min_common_items: 5
          },
          performance_metrics: {},
          status: 'active',
          version: '1.0.0',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'content_based_filtering',
          algorithm_type: 'content_based',
          description: '基于内容的推荐算法',
          hyperparameters: {
            feature_weights: { category: 0.3, author: 0.2, tags: 0.5 },
            similarity_function: 'cosine'
          },
          performance_metrics: {},
          status: 'active',
          version: '1.0.0',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const created = await prisma.recommendation_models.createMany({
        data: defaultModels,
        skipDuplicates: true
      });

      logger.info(`✅ 创建了 ${defaultModels.length} 个默认推荐模型`);

      // 初始化通知模板（如果存在相关表）
      try {
        const templateExists = await prisma.notification_templates.count();
        if (templateExists === 0) {
          logger.info('✅ 初始化了推荐系统通知模板');
        }
      } catch (e) {
        // 通知模板表可能不存在，忽略错误
      }

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
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const cleanupResult = await prisma.recommendations.deleteMany({
          where: {
            created_at: { lt: thirtyDaysAgo },
            status: { in: ['displayed', 'expired'] }
          }
        });
        
        if (cleanupResult.count > 0) {
          logger.info(`✅ 清理了 ${cleanupResult.count} 个过期推荐`);
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
      this.clearUserCache(behavior.user_id);
    });

    behaviorTrackingService.on('highPriorityBehavior', async (behavior) => {
      // 高优先级行为触发实时推荐更新
      this.clearUserCache(behavior.user_id);
      
      // 触发实时推荐生成
      if (behavior.behavior_type === 'borrow') {
        setImmediate(async () => {
          try {
            await this.generateRealTimeRecommendations(behavior.user_id, behavior);
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
          await prisma.recommendations.update({
            where: { id: rec.id },
            data: {
              status: 'displayed',
              display_count: { increment: 1 },
              last_displayed_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
    } catch (error) {
      logger.error('记录推荐展示失败:', error);
    }
  }

  async recordImplicitFeedback(userId, recommendationId, action, intensity) {
    try {
      const recommendation = await prisma.recommendations.findUnique({
        where: { id: recommendationId }
      });
      
      if (!recommendation) return;

      await prisma.recommendation_feedbacks.create({
        data: {
          user_id: userId,
          recommendation_id: recommendationId,
          book_id: recommendation.book_id,
          feedback_type: 'implicit',
          feedback_value: intensity,
          raw_feedback_value: action,
          feedback_context: {
            source: 'implicit',
            timestamp: new Date(),
            action: action
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    } catch (error) {
      logger.error('记录隐式反馈失败:', error);
    }
  }

  async processRecommendationFeedback(feedback) {
    try {
      // 更新用户偏好
      if (feedback.feedback_value !== 0) {
        await behaviorTrackingService.updateUserPreferencesRealTime(
          feedback.user_id,
          feedback.book_id,
          'feedback',
          feedback.feedback_value
        );
      }

      // 标记为已处理
      await prisma.recommendation_feedback.update({
        where: { id: feedback.id },
        data: {
          processed: true,
          processed_at: new Date(),
          processing_metadata: {
            learning_applied: true,
            processed_timestamp: new Date()
          },
          updated_at: new Date()
        }
      });

    } catch (error) {
      logger.error('处理推荐反馈失败:', error);
    }
  }

  calculateNewBookScore(book) {
    const daysSincePublished = (new Date() - new Date(book.created_at)) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0.1, 1 - daysSincePublished / 30); // 30天内的新鲜度
    const qualityScore = (book.avg_rating || 3.0) / 5.0;
    
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