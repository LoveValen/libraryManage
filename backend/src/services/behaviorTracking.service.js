const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');

/**
 * 行为追踪服务 - 实时收集和分析用户行为 (Prisma版本)
 */
class BehaviorTrackingService extends EventEmitter {
  constructor() {
    super();
    this.behaviorQueue = [];
    this.isProcessing = false;
    this.batchSize = 100;
    this.flushInterval = 5000; // 5秒
    this.anomalyDetectionEnabled = true;
    this.realTimeLearningEnabled = true;
  }

  /**
   * 启动行为追踪服务
   */
  async start() {
    try {
      logger.info('🔍 启动行为追踪服务...');
      
      // 启动批处理定时器
      this.startBatchProcessor();
      
      // 启动异常检测
      if (this.anomalyDetectionEnabled) {
        this.startAnomalyDetection();
      }
      
      // 启动实时学习
      if (this.realTimeLearningEnabled) {
        this.startRealTimeLearning();
      }
      
      logger.info('✅ 行为追踪服务启动成功');
    } catch (error) {
      logger.error('❌ 行为追踪服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止行为追踪服务
   */
  async stop() {
    try {
      logger.info('🛑 停止行为追踪服务...');
      
      // 清理定时器
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      
      if (this.anomalyTimer) {
        clearInterval(this.anomalyTimer);
      }
      
      // 处理剩余的行为数据
      await this.flushBehaviorQueue();
      
      logger.info('✅ 行为追踪服务已停止');
    } catch (error) {
      logger.error('❌ 停止行为追踪服务失败:', error);
    }
  }

  /**
   * 追踪用户行为
   */
  async trackBehavior(behaviorData) {
    try {
      const {
        userId,
        bookId = null,
        behaviorType,
        intensity = 1.0,
        duration = null,
        context = {},
        sessionId = null,
        recommendationId = null
      } = behaviorData;

      // 验证必需参数
      if (!userId || !behaviorType) {
        throw new Error('userId and behaviorType are required');
      }

      // 构建行为记录
      const behavior = {
        user_id: userId,
        book_id: bookId,
        behavior_type: behaviorType,
        intensity,
        duration,
        context: {
          ...context,
          timestamp: new Date(),
          sessionId,
          userAgent: context.userAgent || null,
          ipAddress: context.ipAddress || null,
          device: context.device || null,
          source: context.source || null
        },
        search_query: context.searchQuery || null,
        rating_value: context.ratingValue || null,
        recommendation_id: recommendationId,
        recommendation_algorithm: context.recommendationAlgorithm || null,
        recommendation_position: context.recommendationPosition || null,
        feedback: context.feedback || null,
        session_info: context.sessionInfo || null,
        experiment_id: context.experimentId || null,
        experiment_variant: context.experimentVariant || null,
        ip_address: context.ipAddress || null,
        user_agent: context.userAgent || null,
        processed: false,
        processed_at: null,
        is_implicit: this.isImplicitBehavior(behaviorType),
        confidence_score: this.calculateConfidenceScore(behaviorType, intensity, context),
        is_anomaly: false,
        metadata: context.metadata || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // 添加到处理队列
      this.behaviorQueue.push(behavior);

      // 实时处理高优先级行为
      if (this.isHighPriorityBehavior(behaviorType)) {
        await this.processHighPriorityBehavior(behavior);
      }

      // 触发事件
      this.emit('behaviorTracked', behavior);

      // 如果队列满了，立即处理
      if (this.behaviorQueue.length >= this.batchSize) {
        await this.flushBehaviorQueue();
      }

      return { success: true, behaviorId: behavior.id };

    } catch (error) {
      logger.error('追踪用户行为失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 追踪推荐交互
   */
  async trackRecommendationInteraction(userId, recommendationId, action, context = {}) {
    try {
      // 获取推荐记录
      const recommendation = await prisma.recommendations.findUnique({
        where: { id: recommendationId }
      });
      
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      const behaviorType = this.mapActionToBehavior(action);
      const intensity = this.getActionIntensity(action);

      // 追踪行为
      await this.trackBehavior({
        userId,
        bookId: recommendation.book_id,
        behaviorType,
        intensity,
        context: {
          ...context,
          recommendationContext: true,
          algorithmType: recommendation.algorithm_type,
          recommendationScore: recommendation.score
        },
        recommendationId
      });

      // 更新推荐状态
      await this.updateRecommendationStatus(recommendation, action);

      // 实时更新用户偏好
      if (this.realTimeLearningEnabled) {
        await this.updateUserPreferencesRealTime(userId, recommendation.book_id, action, intensity);
      }

      return { success: true };

    } catch (error) {
      logger.error('追踪推荐交互失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 追踪搜索行为
   */
  async trackSearchBehavior(userId, query, results, context = {}) {
    try {
      const searchBehavior = {
        userId,
        behaviorType: 'search',
        searchQuery: query,
        intensity: 1.5,
        context: {
          ...context,
          searchQuery: query,
          resultCount: results.length,
          hasResults: results.length > 0,
          searchType: context.searchType || 'general'
        }
      };

      await this.trackBehavior(searchBehavior);

      // 如果有结果，追踪搜索结果相关性
      if (results.length > 0) {
        await this.trackSearchResults(userId, query, results, context);
      }

      return { success: true };

    } catch (error) {
      logger.error('追踪搜索行为失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 追踪阅读会话
   */
  async trackReadingSession(userId, bookId, sessionData) {
    try {
      const {
        startTime,
        endTime,
        pagesRead = 0,
        progressPercentage = 0,
        readingSpeed = null,
        interruptions = 0,
        device = null
      } = sessionData;

      const duration = endTime ? (new Date(endTime) - new Date(startTime)) / 1000 : null;
      const intensity = this.calculateReadingIntensity(duration, pagesRead, progressPercentage);

      await this.trackBehavior({
        userId,
        bookId,
        behaviorType: 'read',
        intensity,
        duration,
        context: {
          readingSession: true,
          pagesRead,
          progressPercentage,
          readingSpeed,
          interruptions,
          device,
          sessionQuality: this.assessSessionQuality(duration, interruptions, progressPercentage)
        }
      });

      // 更新阅读统计
      await this.updateReadingStatistics(userId, bookId, sessionData);

      return { success: true };

    } catch (error) {
      logger.error('追踪阅读会话失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量追踪行为
   */
  async trackBehaviorBatch(behaviors) {
    try {
      const results = [];
      
      for (const behaviorData of behaviors) {
        const result = await this.trackBehavior(behaviorData);
        results.push(result);
      }

      return {
        success: true,
        processed: results.length,
        results
      };

    } catch (error) {
      logger.error('批量追踪行为失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalysis(userId, timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      const analysis = {};

      // 基础统计
      analysis.basicStats = await this.getUserBehaviorStats(userId, timeRange);

      // 行为模式分析
      analysis.patterns = await this.analyzeBehaviorPatterns(userId, timeRange);

      // 兴趣演化
      analysis.interestEvolution = await this.analyzeInterestEvolution(userId, timeRange);

      // 阅读习惯
      analysis.readingHabits = await this.analyzeReadingHabits(userId, timeRange);

      // 推荐效果
      analysis.recommendationEffectiveness = await this.analyzeRecommendationEffectiveness(userId, timeRange);

      return analysis;

    } catch (error) {
      logger.error('获取用户行为分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户行为统计
   */
  async getUserBehaviorStats(userId, timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.$queryRaw`
        SELECT 
          behavior_type,
          COUNT(*) as count,
          AVG(intensity) as avgIntensity,
          SUM(duration) as totalDuration
        FROM user_behaviors 
        WHERE user_id = ${userId}
          AND created_at >= ${startDate}
        GROUP BY behavior_type
      `;
      
      return this.formatBehaviorStats(stats);
    } catch (error) {
      logger.error('获取用户行为统计失败:', error);
      return {};
    }
  }

  /**
   * 获取图书交互统计
   */
  async getBookInteractionStats(bookId, timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      return await prisma.$queryRaw`
        SELECT 
          behavior_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as uniqueUsers
        FROM user_behaviors 
        WHERE book_id = ${bookId}
          AND created_at >= ${startDate}
        GROUP BY behavior_type
      `;
    } catch (error) {
      logger.error('获取图书交互统计失败:', error);
      return [];
    }
  }

  /**
   * 获取用户相似度
   */
  async getUserSimilarity(userId1, userId2) {
    try {
      // 获取两个用户的共同行为
      const commonBehaviors = await prisma.user_behaviors.findMany({
        where: {
          user_id: {
            in: [userId1, userId2]
          },
          book_id: {
            not: null
          }
        },
        select: {
          user_id: true,
          book_id: true,
          behavior_type: true,
          intensity: true
        }
      });
      
      return this.calculateCosineSimilarity(commonBehaviors, userId1, userId2);
    } catch (error) {
      logger.error('计算用户相似度失败:', error);
      return 0;
    }
  }

  /**
   * 获取热门行为
   */
  async getTrendingBehaviors(timeRange = 7) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      return await prisma.$queryRaw`
        SELECT 
          book_id,
          COUNT(*) as interactionCount,
          COUNT(DISTINCT user_id) as uniqueUsers,
          AVG(intensity) as avgIntensity
        FROM user_behaviors 
        WHERE created_at >= ${startDate}
          AND book_id IS NOT NULL
        GROUP BY book_id
        ORDER BY interactionCount DESC
        LIMIT 100
      `;
    } catch (error) {
      logger.error('获取热门行为失败:', error);
      return [];
    }
  }

  /**
   * 获取用户偏好向量
   */
  async getUserPreferenceVector(userId, timeRange = 90) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const behaviors = await prisma.user_behaviors.findMany({
        where: {
          user_id: userId,
          book_id: {
            not: null
          },
          created_at: {
            gte: startDate
          }
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              category_id: true,
              tags: true,
              isbn: true
            }
          }
        }
      });
      
      return this.buildUserVector(behaviors);
    } catch (error) {
      logger.error('获取用户偏好向量失败:', error);
      return {};
    }
  }

  /**
   * 检测异常行为
   */
  async detectAnomalies(userId = null, timeWindow = 60) {
    try {
      const startTime = new Date(Date.now() - timeWindow * 60 * 1000);
      
      const whereClause = {
        created_at: {
          gte: startTime
        }
      };
      
      if (userId) {
        whereClause.user_id = userId;
      }
      
      const recentBehaviors = await prisma.user_behaviors.findMany({
        where: whereClause,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      return this.analyzeAnomalies(recentBehaviors);
    } catch (error) {
      logger.error('检测异常行为失败:', error);
      return [];
    }
  }

  /**
   * 获取推荐效果统计
   */
  async getRecommendationEffectiveness(timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.$queryRaw`
        SELECT 
          recommendation_algorithm,
          behavior_type,
          COUNT(*) as count
        FROM user_behaviors 
        WHERE behavior_type IN ('recommendation_click', 'recommendation_dismiss')
          AND created_at >= ${startDate}
        GROUP BY recommendation_algorithm, behavior_type
      `;
      
      return this.calculateClickThroughRates(stats);
    } catch (error) {
      logger.error('获取推荐效果统计失败:', error);
      return {};
    }
  }

  /**
   * 启动批处理器
   */
  startBatchProcessor() {
    this.batchTimer = setInterval(async () => {
      if (this.behaviorQueue.length > 0) {
        await this.flushBehaviorQueue();
      }
    }, this.flushInterval);
  }

  /**
   * 处理行为队列
   */
  async flushBehaviorQueue() {
    if (this.isProcessing || this.behaviorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const behaviorsToProcess = this.behaviorQueue.splice(0, this.batchSize);
      
      // 批量插入数据库
      await prisma.user_behaviors.createMany({
        data: behaviorsToProcess,
        skipDuplicates: true
      });

      // 异步处理各种分析
      setImmediate(async () => {
        await this.processBehaviorAnalytics(behaviorsToProcess);
      });

      logger.debug(`✅ 处理了 ${behaviorsToProcess.length} 个行为记录`);

    } catch (error) {
      logger.error('处理行为队列失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理高优先级行为
   */
  async processHighPriorityBehavior(behavior) {
    try {
      // 立即保存到数据库
      await prisma.user_behaviors.create({
        data: behavior
      });

      // 实时更新用户偏好
      if (behavior.book_id && this.realTimeLearningEnabled) {
        await this.updateUserPreferencesImmediate(behavior);
      }

      // 触发实时事件
      this.emit('highPriorityBehavior', behavior);

    } catch (error) {
      logger.error('处理高优先级行为失败:', error);
    }
  }

  /**
   * 处理行为分析
   */
  async processBehaviorAnalytics(behaviors) {
    try {
      // 按用户分组处理
      const userBehaviors = this.groupBehaviorsByUser(behaviors);

      for (const [userId, userBehaviorList] of userBehaviors.entries()) {
        // 更新用户偏好
        await this.updateUserPreferences(userId, userBehaviorList);

        // 检测异常行为
        await this.detectBehaviorAnomalies(userId, userBehaviorList);

        // 更新用户画像
        await this.updateUserProfile(userId, userBehaviorList);
      }

    } catch (error) {
      logger.error('处理行为分析失败:', error);
    }
  }

  /**
   * 启动异常检测
   */
  startAnomalyDetection() {
    this.anomalyTimer = setInterval(async () => {
      try {
        await this.performAnomalyDetection();
      } catch (error) {
        logger.error('异常检测失败:', error);
      }
    }, 60000); // 每分钟检测一次
  }

  /**
   * 执行异常检测
   */
  async performAnomalyDetection() {
    try {
      // 检测全局异常
      const globalAnomalies = await this.detectAnomalies(null, 60);
      
      if (globalAnomalies.length > 0) {
        logger.warn(`检测到 ${globalAnomalies.length} 个全局行为异常`);
        this.emit('anomaliesDetected', globalAnomalies);
      }

      // 检测个别用户异常
      const recentActiveUsers = await this.getRecentActiveUsers();
      
      for (const userId of recentActiveUsers) {
        const userAnomalies = await this.detectAnomalies(userId, 60);
        
        if (userAnomalies.length > 0) {
          logger.warn(`用户 ${userId} 检测到 ${userAnomalies.length} 个行为异常`);
          this.emit('userAnomaliesDetected', { userId, anomalies: userAnomalies });
        }
      }

    } catch (error) {
      logger.error('执行异常检测失败:', error);
    }
  }

  /**
   * 启动实时学习
   */
  startRealTimeLearning() {
    this.on('behaviorTracked', async (behavior) => {
      if (behavior.book_id && this.shouldTriggerLearning(behavior)) {
        await this.updateUserPreferencesRealTime(
          behavior.user_id, 
          behavior.book_id, 
          behavior.behavior_type, 
          behavior.intensity
        );
      }
    });

    this.on('highPriorityBehavior', async (behavior) => {
      // 高优先级行为触发更积极的学习
      await this.updateUserPreferencesImmediate(behavior);
    });
  }

  /**
   * 实时更新用户偏好
   */
  async updateUserPreferencesRealTime(userId, bookId, behaviorType, intensity) {
    try {
      // 查找或创建用户偏好记录
      let userPreference = await prisma.user_preferences.findUnique({
        where: { user_id: userId }
      });

      if (!userPreference) {
        userPreference = await prisma.user_preferences.create({
          data: {
            user_id: userId,
            category_preferences: {},
            author_preferences: {},
            tag_preferences: {},
            confidence_score: 0.1,
            last_updated: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      const book = await prisma.books.findUnique({
        where: { id: bookId },
        include: {
          book_categories: true
        }
      });
      
      if (!book) return;

      // 计算学习率
      const learningRate = this.calculateLearningRate(behaviorType, intensity);
      
      // 更新分类偏好
      if (book.category_id) {
        const categoryPrefs = userPreference.category_preferences || {};
        const currentScore = categoryPrefs[book.category_id] || 0;
        const newScore = this.updatePreferenceScore(currentScore, intensity, learningRate);
        
        categoryPrefs[book.category_id] = newScore;
        
        await prisma.user_preferences.update({
          where: { id: userPreference.id },
          data: {
            category_preferences: categoryPrefs,
            last_updated: new Date(),
            updated_at: new Date()
          }
        });
      }

      // 更新作者偏好
      if (book.author) {
        const authorPrefs = userPreference.author_preferences || {};
        const currentScore = authorPrefs[book.author] || 0;
        const newScore = this.updatePreferenceScore(currentScore, intensity, learningRate);
        
        authorPrefs[book.author] = newScore;
        
        await prisma.user_preferences.update({
          where: { id: userPreference.id },
          data: {
            author_preferences: authorPrefs,
            last_updated: new Date(),
            updated_at: new Date()
          }
        });
      }

      // 更新置信度
      const newConfidence = Math.min(1.0, userPreference.confidence_score + learningRate * 0.1);
      await prisma.user_preferences.update({
        where: { id: userPreference.id },
        data: {
          confidence_score: newConfidence,
          last_updated: new Date(),
          updated_at: new Date()
        }
      });

    } catch (error) {
      logger.error('实时更新用户偏好失败:', error);
    }
  }

  /**
   * 立即更新用户偏好
   */
  async updateUserPreferencesImmediate(behavior) {
    try {
      // 高优先级行为使用更高的学习率
      const learningRate = this.calculateLearningRate(behavior.behavior_type, behavior.intensity) * 2;
      
      if (behavior.book_id) {
        await this.updateUserPreferencesRealTime(
          behavior.user_id, 
          behavior.book_id, 
          behavior.behavior_type, 
          behavior.intensity
        );
      }

    } catch (error) {
      logger.error('立即更新用户偏好失败:', error);
    }
  }

  /**
   * 工具方法
   */

  isImplicitBehavior(behaviorType) {
    const implicitBehaviors = ['view', 'click', 'hover', 'scroll', 'search'];
    return implicitBehaviors.includes(behaviorType);
  }

  isHighPriorityBehavior(behaviorType) {
    const highPriorityBehaviors = ['borrow', 'rate', 'review', 'share'];
    return highPriorityBehaviors.includes(behaviorType);
  }

  calculateConfidenceScore(behaviorType, intensity, context) {
    let baseConfidence = 0.5;
    
    const confidenceMap = {
      'borrow': 0.9,
      'rate': 0.8,
      'review': 0.8,
      'bookmark': 0.7,
      'share': 0.7,
      'read': 0.6,
      'click': 0.4,
      'view': 0.3,
      'search': 0.2
    };
    
    baseConfidence = confidenceMap[behaviorType] || 0.5;
    
    // 根据强度调整
    const intensityFactor = Math.min(1.0, intensity / 5.0);
    
    // 根据上下文调整
    let contextFactor = 1.0;
    if (context.sessionQuality) {
      contextFactor *= context.sessionQuality;
    }
    
    return Math.min(1.0, baseConfidence * intensityFactor * contextFactor);
  }

  mapActionToBehavior(action) {
    const actionMap = {
      'click': 'recommendation_click',
      'dismiss': 'recommendation_dismiss',
      'view': 'view',
      'borrow': 'borrow',
      'share': 'share',
      'bookmark': 'bookmark'
    };
    
    return actionMap[action] || 'click';
  }

  getActionIntensity(action) {
    const intensityMap = {
      'click': 2.0,
      'dismiss': -1.0,
      'view': 1.0,
      'borrow': 5.0,
      'share': 3.0,
      'bookmark': 2.5
    };
    
    return intensityMap[action] || 1.0;
  }

  async updateRecommendationStatus(recommendation, action) {
    const statusMap = {
      'click': 'clicked',
      'dismiss': 'dismissed',
      'borrow': 'borrowed',
      'share': 'shared'
    };
    
    const newStatus = statusMap[action];
    if (newStatus && recommendation.status !== newStatus) {
      await prisma.recommendations.update({
        where: { id: recommendation.id },
        data: {
          status: newStatus,
          updated_at: new Date()
        }
      });
    }
  }

  calculateReadingIntensity(duration, pagesRead, progressPercentage) {
    let intensity = 1.0;
    
    // 基于阅读时长
    if (duration > 0) {
      const minutes = duration / 60;
      if (minutes > 30) intensity += 1.0;
      if (minutes > 60) intensity += 1.0;
    }
    
    // 基于页数
    if (pagesRead > 10) intensity += 0.5;
    if (pagesRead > 50) intensity += 1.0;
    
    // 基于进度
    if (progressPercentage > 50) intensity += 1.0;
    if (progressPercentage >= 100) intensity += 2.0;
    
    return Math.min(5.0, intensity);
  }

  assessSessionQuality(duration, interruptions, progressPercentage) {
    let quality = 1.0;
    
    // 基于时长
    if (duration > 1800) quality += 0.2; // 30分钟以上
    
    // 基于中断次数
    quality -= interruptions * 0.1;
    
    // 基于进度
    if (progressPercentage > 10) quality += 0.1;
    
    return Math.max(0.1, Math.min(1.0, quality));
  }

  shouldTriggerLearning(behavior) {
    // 某些行为类型总是触发学习
    const alwaysLearn = ['borrow', 'rate', 'review', 'bookmark'];
    if (alwaysLearn.includes(behavior.behavior_type)) {
      return true;
    }
    
    // 高强度行为触发学习
    if (behavior.intensity >= 3.0) {
      return true;
    }
    
    // 随机触发学习（降低频率）
    return Math.random() < 0.1;
  }

  calculateLearningRate(behaviorType, intensity) {
    let baseLearningRate = 0.1;
    
    const rateMap = {
      'borrow': 0.3,
      'rate': 0.25,
      'review': 0.2,
      'bookmark': 0.15,
      'share': 0.15,
      'read': 0.1,
      'click': 0.05,
      'view': 0.02
    };
    
    baseLearningRate = rateMap[behaviorType] || 0.1;
    
    // 基于强度调整
    const intensityFactor = Math.min(2.0, intensity / 3.0);
    
    return baseLearningRate * intensityFactor;
  }

  updatePreferenceScore(currentScore, intensity, learningRate) {
    // 使用指数移动平均更新偏好分数
    const normalizedIntensity = Math.max(-1, Math.min(1, intensity / 5.0));
    return currentScore * (1 - learningRate) + normalizedIntensity * learningRate;
  }

  groupBehaviorsByUser(behaviors) {
    const grouped = new Map();
    
    behaviors.forEach(behavior => {
      if (!grouped.has(behavior.user_id)) {
        grouped.set(behavior.user_id, []);
      }
      grouped.get(behavior.user_id).push(behavior);
    });
    
    return grouped;
  }

  async getRecentActiveUsers(minutes = 60) {
    try {
      const since = new Date(Date.now() - minutes * 60 * 1000);
      
      const activeUsers = await prisma.user_behaviors.findMany({
        where: {
          created_at: {
            gte: since
          }
        },
        select: {
          user_id: true
        },
        distinct: ['user_id']
      });
      
      return activeUsers.map(u => u.user_id);
    } catch (error) {
      logger.error('获取最近活跃用户失败:', error);
      return [];
    }
  }

  // 格式化行为统计
  formatBehaviorStats(rawStats) {
    const formatted = {
      totalInteractions: 0,
      behaviorBreakdown: {},
      avgIntensity: 0,
      totalDuration: 0
    };
    
    rawStats.forEach(stat => {
      const count = parseInt(stat.count);
      formatted.totalInteractions += count;
      formatted.behaviorBreakdown[stat.behavior_type] = {
        count,
        avgIntensity: parseFloat(stat.avgIntensity || 0),
        totalDuration: parseInt(stat.totalDuration || 0)
      };
    });
    
    if (formatted.totalInteractions > 0) {
      formatted.avgIntensity = rawStats.reduce((sum, stat) => {
        return sum + (parseFloat(stat.avgIntensity || 0) * parseInt(stat.count));
      }, 0) / formatted.totalInteractions;
    }
    
    return formatted;
  }

  // 计算余弦相似度
  calculateCosineSimilarity(behaviors, userId1, userId2) {
    const user1Behaviors = behaviors.filter(b => b.user_id === userId1);
    const user2Behaviors = behaviors.filter(b => b.user_id === userId2);
    
    // 构建共同图书的行为向量
    const commonBooks = new Set([
      ...user1Behaviors.map(b => b.book_id),
      ...user2Behaviors.map(b => b.book_id)
    ]);
    
    if (commonBooks.size === 0) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (const bookId of commonBooks) {
      const user1Score = user1Behaviors
        .filter(b => b.book_id === bookId)
        .reduce((sum, b) => sum + b.intensity, 0);
      
      const user2Score = user2Behaviors
        .filter(b => b.book_id === bookId)
        .reduce((sum, b) => sum + b.intensity, 0);
      
      dotProduct += user1Score * user2Score;
      norm1 += user1Score * user1Score;
      norm2 += user2Score * user2Score;
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // 构建用户偏好向量
  buildUserVector(behaviors) {
    const vector = {
      categories: {},
      authors: {},
      tags: {},
      totalInteractions: behaviors.length,
      avgIntensity: 0
    };
    
    let totalIntensity = 0;
    
    behaviors.forEach(behavior => {
      const { book, intensity } = behavior;
      totalIntensity += intensity;
      
      // 分类偏好
      if (book && book.category_id) {
        vector.categories[book.category_id] = (vector.categories[book.category_id] || 0) + intensity;
      }
      
      // 作者偏好
      if (book && book.author) {
        vector.authors[book.author] = (vector.authors[book.author] || 0) + intensity;
      }
      
      // 标签偏好
      if (book && book.tags && Array.isArray(book.tags)) {
        book.tags.forEach(tag => {
          vector.tags[tag] = (vector.tags[tag] || 0) + intensity;
        });
      }
    });
    
    vector.avgIntensity = behaviors.length > 0 ? totalIntensity / behaviors.length : 0;
    
    return vector;
  }

  // 分析异常行为
  analyzeAnomalies(behaviors) {
    const anomalies = [];
    
    // 检查频率异常
    const frequencyThreshold = 10; // 1分钟内超过10次操作
    if (behaviors.length > frequencyThreshold) {
      anomalies.push({
        type: 'high_frequency',
        count: behaviors.length,
        threshold: frequencyThreshold
      });
    }
    
    // 检查行为模式异常
    const behaviorCounts = {};
    behaviors.forEach(b => {
      behaviorCounts[b.behavior_type] = (behaviorCounts[b.behavior_type] || 0) + 1;
    });
    
    // 检查重复点击
    const clickThreshold = 5;
    if (behaviorCounts.click > clickThreshold) {
      anomalies.push({
        type: 'excessive_clicking',
        count: behaviorCounts.click,
        threshold: clickThreshold
      });
    }
    
    return anomalies;
  }

  // 计算点击率
  calculateClickThroughRates(stats) {
    const algorithms = {};
    
    stats.forEach(stat => {
      const algo = stat.recommendation_algorithm || 'unknown';
      if (!algorithms[algo]) {
        algorithms[algo] = { clicks: 0, dismissals: 0, total: 0 };
      }
      
      const count = parseInt(stat.count);
      algorithms[algo].total += count;
      
      if (stat.behavior_type === 'recommendation_click') {
        algorithms[algo].clicks += count;
      } else if (stat.behavior_type === 'recommendation_dismiss') {
        algorithms[algo].dismissals += count;
      }
    });
    
    Object.keys(algorithms).forEach(algo => {
      const data = algorithms[algo];
      data.clickThroughRate = data.total > 0 ? (data.clicks / data.total) * 100 : 0;
      data.dismissalRate = data.total > 0 ? (data.dismissals / data.total) * 100 : 0;
    });
    
    return algorithms;
  }

  // 占位符方法（完整实现需要更多代码）
  async trackSearchResults(userId, query, results, context) {
    // TODO: 实现搜索结果追踪
  }
  
  async updateReadingStatistics(userId, bookId, sessionData) {
    // TODO: 实现阅读统计更新
  }
  
  async analyzeBehaviorPatterns(userId, timeRange) { 
    // TODO: 实现行为模式分析
    return {}; 
  }
  
  async analyzeInterestEvolution(userId, timeRange) { 
    // TODO: 实现兴趣演化分析
    return {}; 
  }
  
  async analyzeReadingHabits(userId, timeRange) { 
    // TODO: 实现阅读习惯分析
    return {}; 
  }
  
  async analyzeRecommendationEffectiveness(userId, timeRange) { 
    // TODO: 实现推荐效果分析
    return {}; 
  }
  
  async updateUserPreferences(userId, behaviors) {
    // TODO: 实现用户偏好更新
  }
  
  async detectBehaviorAnomalies(userId, behaviors) {
    // TODO: 实现行为异常检测
  }
  
  async updateUserProfile(userId, behaviors) {
    // TODO: 实现用户画像更新
  }
}

// 创建单例实例
const behaviorTrackingService = new BehaviorTrackingService();

module.exports = behaviorTrackingService;