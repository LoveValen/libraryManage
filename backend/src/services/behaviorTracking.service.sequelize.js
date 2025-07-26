const { models } = require('../models');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');

/**
 * 行为追踪服务 - 实时收集和分析用户行为
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
        userId,
        bookId,
        behaviorType,
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
        recommendationId,
        isImplicit: this.isImplicitBehavior(behaviorType),
        confidenceScore: this.calculateConfidenceScore(behaviorType, intensity, context)
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
      const recommendation = await models.Recommendation.findByPk(recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      const behaviorType = this.mapActionToBehavior(action);
      const intensity = this.getActionIntensity(action);

      // 追踪行为
      await this.trackBehavior({
        userId,
        bookId: recommendation.bookId,
        behaviorType,
        intensity,
        context: {
          ...context,
          recommendationContext: true,
          algorithmType: recommendation.algorithm,
          recommendationScore: recommendation.score
        },
        recommendationId
      });

      // 更新推荐状态
      await this.updateRecommendationStatus(recommendation, action);

      // 实时更新用户偏好
      if (this.realTimeLearningEnabled) {
        await this.updateUserPreferencesRealTime(userId, recommendation.bookId, action, intensity);
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
      const analysis = {};

      // 基础统计
      analysis.basicStats = await models.UserBehavior.getUserBehaviorStats(userId, timeRange);

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
      await models.UserBehavior.bulkCreate(behaviorsToProcess, {
        ignoreDuplicates: true
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
      await models.UserBehavior.create(behavior);

      // 实时更新用户偏好
      if (behavior.bookId && this.realTimeLearningEnabled) {
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
      const globalAnomalies = await models.UserBehavior.detectAnomalies(null, 60);
      
      if (globalAnomalies.length > 0) {
        logger.warn(`检测到 ${globalAnomalies.length} 个全局行为异常`);
        this.emit('anomaliesDetected', globalAnomalies);
      }

      // 检测个别用户异常
      const recentActiveUsers = await this.getRecentActiveUsers();
      
      for (const userId of recentActiveUsers) {
        const userAnomalies = await models.UserBehavior.detectAnomalies(userId, 60);
        
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
      if (behavior.bookId && this.shouldTriggerLearning(behavior)) {
        await this.updateUserPreferencesRealTime(
          behavior.userId, 
          behavior.bookId, 
          behavior.behaviorType, 
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
      const userPreference = await models.UserPreference.findOrCreateForUser(userId);
      const book = await models.Book.findByPk(bookId);
      
      if (!book) return;

      // 计算学习率
      const learningRate = this.calculateLearningRate(behaviorType, intensity);
      
      // 更新分类偏好
      if (book.category) {
        const currentScore = userPreference.categoryPreferences[book.category] || 0;
        const newScore = this.updatePreferenceScore(currentScore, intensity, learningRate);
        
        await userPreference.updateCategoryPreferences({
          [book.category]: newScore
        });
      }

      // 更新作者偏好
      if (book.author) {
        const currentScore = userPreference.authorPreferences[book.author] || 0;
        const newScore = this.updatePreferenceScore(currentScore, intensity, learningRate);
        
        await userPreference.updateAuthorPreferences({
          [book.author]: newScore
        });
      }

      // 更新置信度
      const newConfidence = Math.min(1.0, userPreference.confidenceScore + learningRate * 0.1);
      await userPreference.updateConfidence(newConfidence);

    } catch (error) {
      logger.error('实时更新用户偏好失败:', error);
    }
  }

  /**
   * 立即更新用户偏好
   */
  async updateUserPreferencesImmediate(behavior) {
    try {
      const userPreference = await models.UserPreference.findOrCreateForUser(behavior.userId);
      
      // 高优先级行为使用更高的学习率
      const learningRate = this.calculateLearningRate(behavior.behaviorType, behavior.intensity) * 2;
      
      if (behavior.bookId) {
        const book = await models.Book.findByPk(behavior.bookId);
        if (book) {
          // 更强的偏好更新
          const updates = {};
          
          if (book.category) {
            const currentScore = userPreference.categoryPreferences[book.category] || 0;
            updates[book.category] = this.updatePreferenceScore(currentScore, behavior.intensity, learningRate);
          }
          
          if (Object.keys(updates).length > 0) {
            await userPreference.updateCategoryPreferences(updates);
          }
        }
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
      recommendation.status = newStatus;
      await recommendation.save();
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
    if (alwaysLearn.includes(behavior.behaviorType)) {
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
      if (!grouped.has(behavior.userId)) {
        grouped.set(behavior.userId, []);
      }
      grouped.get(behavior.userId).push(behavior);
    });
    
    return grouped;
  }

  async getRecentActiveUsers(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const activeUsers = await models.UserBehavior.findAll({
      where: {
        createdAt: {
          [models.sequelize.Op.gte]: since
        }
      },
      attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('userId')), 'userId']],
      raw: true
    });
    
    return activeUsers.map(u => u.userId);
  }

  // 占位符方法（完整实现需要更多代码）
  async trackSearchResults(userId, query, results, context) {}
  async updateReadingStatistics(userId, bookId, sessionData) {}
  async analyzeBehaviorPatterns(userId, timeRange) { return {}; }
  async analyzeInterestEvolution(userId, timeRange) { return {}; }
  async analyzeReadingHabits(userId, timeRange) { return {}; }
  async analyzeRecommendationEffectiveness(userId, timeRange) { return {}; }
  async updateUserPreferences(userId, behaviors) {}
  async detectBehaviorAnomalies(userId, behaviors) {}
  async updateUserProfile(userId, behaviors) {}
}

// 创建单例实例
const behaviorTrackingService = new BehaviorTrackingService();

module.exports = behaviorTrackingService;