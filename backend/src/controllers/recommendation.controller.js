const prisma = require('../utils/prisma');
const recommendationService = require('../services/recommendation.service');
const behaviorTrackingService = require('../services/behaviorTracking.service');
const { logger } = require('../utils/logger');
const { formatResponse } = require('../utils/response');
const Joi = require('joi');

/**
 * 推荐系统控制器
 */
class RecommendationController {
  /**
   * 获取用户推荐
   */
  async getUserRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const schema = Joi.object({
        scenario: Joi.string().valid('homepage', 'book_detail', 'user_profile', 'search_results', 'category_browse', 'email_campaign', 'mobile_app').default('homepage'),
        algorithm: Joi.string().default('auto'),
        limit: Joi.number().integer().min(1).max(50).default(10),
        useCache: Joi.boolean().default(true),
        forceRefresh: Joi.boolean().default(false),
        includeExplanations: Joi.boolean().default(true),
        diversityFactor: Joi.number().min(0).max(1).default(0.3),
        excludeBooks: Joi.array().items(Joi.number().integer()).default([]),
        contextInfo: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const recommendations = await recommendationService.getUserRecommendations(parseInt(userId), {
        ...value,
        contextInfo: {
          ...value.contextInfo,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          requestTime: new Date()
        }
      });

      res.json(formatResponse(true, '获取推荐成功', recommendations));
    } catch (error) {
      logger.error('获取用户推荐失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取相似图书推荐
   */
  async getSimilarBooks(req, res) {
    try {
      const { bookId } = req.params;
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(20).default(10),
        includeExplanations: Joi.boolean().default(true)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const userId = req.user ? req.user.id : null;
      const similarBooks = await recommendationService.getSimilarBooks(parseInt(bookId), userId, value.limit);

      res.json(formatResponse(true, '获取相似图书成功', {
        similarBooks,
        totalCount: similarBooks.length,
        targetBookId: parseInt(bookId)
      }));
    } catch (error) {
      logger.error('获取相似图书失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取热门推荐
   */
  async getTrendingRecommendations(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(90).default(7),
        category: Joi.string().optional(),
        limit: Joi.number().integer().min(1).max(50).default(20),
        includeGlobal: Joi.boolean().default(true)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const userId = req.user ? req.user.id : null;
      const trending = await recommendationService.getTrendingRecommendations(userId, value);

      res.json(formatResponse(true, '获取热门推荐成功', {
        recommendations: trending,
        timeRange: value.timeRange,
        category: value.category || 'all'
      }));
    } catch (error) {
      logger.error('获取热门推荐失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取新书推荐
   */
  async getNewBooksRecommendations(req, res) {
    try {
      const schema = Joi.object({
        daysRange: Joi.number().integer().min(1).max(90).default(30),
        limit: Joi.number().integer().min(1).max(50).default(20),
        minRating: Joi.number().min(0).max(5).default(3.5)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const userId = req.user ? req.user.id : null;
      const newBooks = await recommendationService.getNewBooksRecommendations(userId, value);

      res.json(formatResponse(true, '获取新书推荐成功', {
        recommendations: newBooks,
        daysRange: value.daysRange,
        minRating: value.minRating
      }));
    } catch (error) {
      logger.error('获取新书推荐失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取社交推荐
   */
  async getSocialRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(30).default(10),
        friendsOnly: Joi.boolean().default(false)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const socialRecommendations = await recommendationService.getSocialRecommendations(parseInt(userId), value);

      res.json(formatResponse(true, '获取社交推荐成功', {
        recommendations: socialRecommendations,
        friendsOnly: value.friendsOnly
      }));
    } catch (error) {
      logger.error('获取社交推荐失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 追踪用户行为
   */
  async trackBehavior(req, res) {
    try {
      const schema = Joi.object({
        userId: Joi.number().integer().positive().required(),
        bookId: Joi.number().integer().positive().optional(),
        behaviorType: Joi.string().valid(
          'view', 'search', 'borrow', 'return', 'review', 'rate', 'bookmark', 
          'share', 'download', 'read', 'click', 'hover', 'scroll', 
          'recommendation_click', 'recommendation_dismiss'
        ).required(),
        intensity: Joi.number().min(-5).max(5).default(1.0),
        duration: Joi.number().integer().min(0).optional(),
        context: Joi.object().default({}),
        sessionId: Joi.string().optional(),
        recommendationId: Joi.number().integer().positive().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 添加请求上下文信息
      const enrichedContext = {
        ...value.context,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referer: req.get('Referer'),
        timestamp: new Date()
      };

      const result = await behaviorTrackingService.trackBehavior({
        ...value,
        context: enrichedContext
      });

      res.json(formatResponse(true, '行为追踪成功', result));
    } catch (error) {
      logger.error('追踪用户行为失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 追踪推荐点击
   */
  async trackRecommendationClick(req, res) {
    try {
      const { recommendationId } = req.params;
      const schema = Joi.object({
        userId: Joi.number().integer().positive().required(),
        position: Joi.number().integer().min(0).optional(),
        context: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const context = {
        ...value.context,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        clickPosition: value.position,
        timestamp: new Date()
      };

      const result = await recommendationService.trackRecommendationClick(
        value.userId,
        parseInt(recommendationId),
        context
      );

      res.json(formatResponse(true, '推荐点击追踪成功', result));
    } catch (error) {
      logger.error('追踪推荐点击失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 记录推荐反馈
   */
  async recordRecommendationFeedback(req, res) {
    try {
      const { recommendationId } = req.params;
      const schema = Joi.object({
        userId: Joi.number().integer().positive().required(),
        feedbackType: Joi.string().valid('explicit', 'implicit', 'rating', 'thumbs', 'survey').default('explicit'),
        rating: Joi.number().min(1).max(5).optional(),
        relevance: Joi.number().min(-1).max(1).optional(),
        satisfaction: Joi.number().min(-1).max(1).optional(),
        interest: Joi.number().min(-1).max(1).optional(),
        quality: Joi.number().min(-1).max(1).optional(),
        comment: Joi.string().max(1000).optional(),
        reasons: Joi.array().items(Joi.string()).optional(),
        emotion: Joi.string().valid('love', 'like', 'neutral', 'dislike', 'hate').optional(),
        context: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const feedbackData = {
        ...value,
        context: {
          ...value.context,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          source: 'web',
          timestamp: new Date()
        }
      };

      const result = await recommendationService.recordRecommendationFeedback(
        value.userId,
        parseInt(recommendationId),
        feedbackData
      );

      res.json(formatResponse(true, '推荐反馈记录成功', result));
    } catch (error) {
      logger.error('记录推荐反馈失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取推荐解释
   */
  async getRecommendationExplanation(req, res) {
    try {
      const { recommendationId } = req.params;

      const explanation = await recommendationService.getRecommendationExplanation(parseInt(recommendationId));

      res.json(formatResponse(true, '获取推荐解释成功', explanation));
    } catch (error) {
      logger.error('获取推荐解释失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取用户偏好档案
   */
  async getUserPreferences(req, res) {
    try {
      const { userId } = req.params;

      const preferences = await models.UserPreference.findOrCreateForUser(parseInt(userId));
      const weights = preferences.getRecommendationWeights();

      res.json(formatResponse(true, '获取用户偏好成功', {
        preferences: preferences.toJSON(),
        weights,
        coldStart: preferences.coldStartInfo
      }));
    } catch (error) {
      logger.error('获取用户偏好失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 更新用户偏好
   */
  async updateUserPreferences(req, res) {
    try {
      const { userId } = req.params;
      const schema = Joi.object({
        categoryPreferences: Joi.object().optional(),
        authorPreferences: Joi.object().optional(),
        tagPreferences: Joi.object().optional(),
        languagePreferences: Joi.object().optional(),
        diversityPreferences: Joi.object().optional(),
        negativePreferences: Joi.object().optional(),
        personalizationStrength: Joi.number().min(0).max(1).optional(),
        privacySettings: Joi.object().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const updatedPreferences = await models.UserPreference.updateUserPreferences(
        parseInt(userId),
        value,
        'explicit_feedback'
      );

      res.json(formatResponse(true, '用户偏好更新成功', {
        preferences: updatedPreferences.toJSON()
      }));
    } catch (error) {
      logger.error('更新用户偏好失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalysis(req, res) {
    try {
      const { userId } = req.params;
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(365).default(30)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const analysis = await behaviorTrackingService.getUserBehaviorAnalysis(parseInt(userId), value.timeRange);

      res.json(formatResponse(true, '获取用户行为分析成功', analysis));
    } catch (error) {
      logger.error('获取用户行为分析失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取推荐统计
   */
  async getRecommendationStatistics(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(365).default(30),
        groupBy: Joi.string().valid('algorithm', 'scenario', 'type').default('algorithm')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const statistics = await recommendationService.getRecommendationStatistics(value.timeRange);

      res.json(formatResponse(true, '获取推荐统计成功', {
        ...statistics,
        timeRange: value.timeRange,
        generatedAt: new Date()
      }));
    } catch (error) {
      logger.error('获取推荐统计失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取推荐模型列表
   */
  async getRecommendationModels(req, res) {
    try {
      const schema = Joi.object({
        enabled: Joi.boolean().optional(),
        type: Joi.string().optional(),
        trainingStatus: Joi.string().valid('not_trained', 'training', 'trained', 'updating', 'failed', 'deprecated').optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const where = {};
      if (value.enabled !== undefined) where.enabled = value.enabled;
      if (value.type) where.type = value.type;
      if (value.trainingStatus) where.trainingStatus = value.trainingStatus;

      const models_list = await models.RecommendationModel.findAll({
        where,
        order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        include: [
          {
            model: models.User,
            as: 'creator',
            attributes: ['id', 'username', 'realName']
          }
        ]
      });

      res.json(formatResponse(true, '获取推荐模型列表成功', {
        models: models_list.map(model => model.getSummary()),
        totalCount: models_list.length
      }));
    } catch (error) {
      logger.error('获取推荐模型列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 创建推荐模型
   */
  async createRecommendationModel(req, res) {
    try {
      const schema = Joi.object({
        name: Joi.string().min(2).max(200).required(),
        type: Joi.string().valid(
          'collaborative_filtering', 'content_based', 'matrix_factorization',
          'deep_learning', 'hybrid', 'knowledge_based', 'demographic',
          'contextual', 'sequential', 'multi_armed_bandit', 'reinforcement_learning'
        ).required(),
        description: Joi.string().max(1000).optional(),
        config: Joi.object().required(),
        hyperparameters: Joi.object().optional(),
        featureConfig: Joi.object().optional(),
        enabled: Joi.boolean().default(true),
        priority: Joi.number().integer().min(1).max(10).default(5),
        applicableScenarios: Joi.array().items(Joi.string()).optional(),
        targetUserSegments: Joi.array().items(Joi.string()).optional(),
        tags: Joi.array().items(Joi.string()).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const modelData = {
        ...value,
        createdBy: req.user.id,
        computationVersion: '1.0.0'
      };

      const model = await models.RecommendationModel.create(modelData);

      res.status(201).json(formatResponse(true, '推荐模型创建成功', {
        model: model.getSummary()
      }));
    } catch (error) {
      logger.error('创建推荐模型失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 更新推荐模型
   */
  async updateRecommendationModel(req, res) {
    try {
      const { modelId } = req.params;
      const model = await models.RecommendationModel.findByPk(modelId);
      
      if (!model) {
        return res.status(404).json(formatResponse(false, '推荐模型不存在'));
      }

      const schema = Joi.object({
        name: Joi.string().min(2).max(200).optional(),
        description: Joi.string().max(1000).optional(),
        enabled: Joi.boolean().optional(),
        config: Joi.object().optional(),
        hyperparameters: Joi.object().optional(),
        priority: Joi.number().integer().min(1).max(10).optional(),
        applicableScenarios: Joi.array().items(Joi.string()).optional(),
        targetUserSegments: Joi.array().items(Joi.string()).optional(),
        tags: Joi.array().items(Joi.string()).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const updateData = {
        ...value,
        updatedBy: req.user.id
      };

      await model.update(updateData);

      res.json(formatResponse(true, '推荐模型更新成功', {
        model: model.getSummary()
      }));
    } catch (error) {
      logger.error('更新推荐模型失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 删除推荐模型
   */
  async deleteRecommendationModel(req, res) {
    try {
      const { modelId } = req.params;
      const model = await models.RecommendationModel.findByPk(modelId);
      
      if (!model) {
        return res.status(404).json(formatResponse(false, '推荐模型不存在'));
      }

      if (model.isDefault) {
        return res.status(400).json(formatResponse(false, '不能删除默认模型'));
      }

      await model.destroy();

      res.json(formatResponse(true, '推荐模型已删除'));
    } catch (error) {
      logger.error('删除推荐模型失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 设置默认推荐模型
   */
  async setDefaultRecommendationModel(req, res) {
    try {
      const { modelId } = req.params;
      const model = await models.RecommendationModel.findByPk(modelId);
      
      if (!model) {
        return res.status(404).json(formatResponse(false, '推荐模型不存在'));
      }

      if (!model.enabled || model.trainingStatus !== 'trained') {
        return res.status(400).json(formatResponse(false, '只能设置已启用且已训练的模型为默认模型'));
      }

      await model.setAsDefault();

      res.json(formatResponse(true, '默认推荐模型设置成功', {
        model: model.getSummary()
      }));
    } catch (error) {
      logger.error('设置默认推荐模型失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 批量追踪行为
   */
  async trackBehaviorBatch(req, res) {
    try {
      const schema = Joi.object({
        behaviors: Joi.array().items(
          Joi.object({
            userId: Joi.number().integer().positive().required(),
            bookId: Joi.number().integer().positive().optional(),
            behaviorType: Joi.string().required(),
            intensity: Joi.number().default(1.0),
            duration: Joi.number().integer().min(0).optional(),
            context: Joi.object().default({}),
            sessionId: Joi.string().optional(),
            recommendationId: Joi.number().integer().positive().optional()
          })
        ).min(1).max(100).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 为每个行为添加请求上下文
      const enrichedBehaviors = value.behaviors.map(behavior => ({
        ...behavior,
        context: {
          ...behavior.context,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          batchRequest: true,
          timestamp: new Date()
        }
      }));

      const result = await behaviorTrackingService.trackBehaviorBatch(enrichedBehaviors);

      res.json(formatResponse(true, '批量行为追踪成功', result));
    } catch (error) {
      logger.error('批量追踪行为失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取推荐性能指标
   */
  async getRecommendationPerformance(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(365).default(7),
        metrics: Joi.array().items(
          Joi.string().valid('ctr', 'conversion', 'diversity', 'coverage', 'novelty', 'serendipity')
        ).default(['ctr', 'conversion', 'diversity'])
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const performance = {};

      // 点击率
      if (value.metrics.includes('ctr')) {
        performance.clickThroughRate = await models.Recommendation.getClickThroughRates('algorithm', value.timeRange);
      }

      // 转化率（推荐到借阅）
      if (value.metrics.includes('conversion')) {
        performance.conversionRate = await this.calculateConversionRate(value.timeRange);
      }

      // 多样性
      if (value.metrics.includes('diversity')) {
        performance.diversity = await this.calculateAverageDiversity(value.timeRange);
      }

      // 覆盖率
      if (value.metrics.includes('coverage')) {
        performance.coverage = await this.calculateCoverage(value.timeRange);
      }

      res.json(formatResponse(true, '获取推荐性能指标成功', {
        performance,
        timeRange: value.timeRange,
        metrics: value.metrics,
        calculatedAt: new Date()
      }));
    } catch (error) {
      logger.error('获取推荐性能指标失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 工具方法
   */
  async calculateConversionRate(timeRange) {
    // 计算推荐到借阅的转化率
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    const totalRecommendations = await models.Recommendation.count({
      where: {
        createdAt: { [models.sequelize.Op.gte]: startDate },
        status: ['displayed', 'clicked', 'borrowed']
      }
    });
    
    const borrowedRecommendations = await models.Recommendation.count({
      where: {
        createdAt: { [models.sequelize.Op.gte]: startDate },
        status: 'borrowed'
      }
    });
    
    return totalRecommendations > 0 ? (borrowedRecommendations / totalRecommendations * 100).toFixed(2) : 0;
  }

  async calculateAverageDiversity(timeRange) {
    // 计算平均多样性
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    const users = await models.Recommendation.findAll({
      where: {
        createdAt: { [models.sequelize.Op.gte]: startDate },
        status: ['displayed', 'clicked']
      },
      attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('userId')), 'userId']],
      raw: true
    });
    
    let totalDiversity = 0;
    let userCount = 0;
    
    for (const user of users) {
      const userRecommendations = await models.Recommendation.findAll({
        where: {
          userId: user.userId,
          createdAt: { [models.sequelize.Op.gte]: startDate }
        },
        include: [{ model: models.Book, as: 'book', attributes: ['category', 'author'] }]
      });
      
      if (userRecommendations.length > 1) {
        const diversity = models.Recommendation.calculateDiversityMetrics(userRecommendations);
        totalDiversity += diversity.diversityScore || 0;
        userCount++;
      }
    }
    
    return userCount > 0 ? (totalDiversity / userCount).toFixed(3) : 0;
  }

  async calculateCoverage(timeRange) {
    // 计算推荐覆盖率
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    const totalBooks = await models.Book.count();
    const recommendedBooks = await models.Recommendation.count({
      where: {
        createdAt: { [models.sequelize.Op.gte]: startDate }
      },
      distinct: true,
      col: 'bookId'
    });
    
    return totalBooks > 0 ? (recommendedBooks / totalBooks * 100).toFixed(2) : 0;
  }
}

module.exports = new RecommendationController();