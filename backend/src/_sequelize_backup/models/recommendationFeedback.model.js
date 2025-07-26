const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 推荐反馈模型 - 收集用户对推荐的反馈
 */
const RecommendationFeedback = sequelize.define('RecommendationFeedback', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 用户ID
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '用户ID'
  },
  
  // 推荐ID
  recommendationId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '推荐记录ID'
  },
  
  // 图书ID
  bookId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '图书ID'
  },
  
  // 反馈类型
  feedbackType: {
    type: DataTypes.ENUM([
      'explicit',         // 显式反馈（用户主动给出）
      'implicit',         // 隐式反馈（从行为推断）
      'rating',           // 评分反馈
      'thumbs',           // 点赞/点踩
      'survey',           // 问卷调查
      'interaction',      // 交互反馈
      'behavioral',       // 行为反馈
      'contextual'        // 上下文反馈
    ]),
    allowNull: false,
    comment: '反馈类型'
  },
  
  // 反馈值
  feedbackValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: '反馈值（标准化到-1到1之间）'
  },
  
  // 原始反馈值
  rawFeedbackValue: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '原始反馈值（如星级、文本等）'
  },
  
  // 反馈维度
  feedbackDimensions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '多维度反馈',
    defaultValue: {
      relevance: null,      // 相关性
      interest: null,       // 兴趣度
      quality: null,        // 质量
      novelty: null,        // 新颖性
      diversity: null,      // 多样性
      serendipity: null,    // 惊喜度
      usefulness: null,     // 有用性
      accuracy: null,       // 准确性
      satisfaction: null,   // 满意度
      trust: null          // 信任度
    }
  },
  
  // 反馈置信度
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: '反馈置信度（0-1）'
  },
  
  // 反馈情境
  feedbackContext: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈情境信息',
    defaultValue: {
      timestamp: null,
      location: null,
      device: null,
      session_id: null,
      previous_action: null,
      time_spent: null,
      page_source: null,
      interaction_sequence: [],
      mood_context: null,
      environmental_factors: {}
    }
  },
  
  // 反馈动机
  feedbackMotivation: {
    type: DataTypes.ENUM([
      'voluntary',        // 自愿反馈
      'prompted',         // 提示反馈
      'required',         // 必需反馈
      'incentivized',     // 激励反馈
      'passive',          // 被动反馈
      'survey_based',     // 基于调查
      'experiment'        // 实验反馈
    ]),
    allowNull: false,
    defaultValue: 'voluntary',
    comment: '反馈动机'
  },
  
  // 反馈内容
  feedbackContent: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '详细反馈内容',
    defaultValue: {
      text_feedback: null,
      selected_reasons: [],
      improvement_suggestions: [],
      alternative_preferences: [],
      emotional_response: null,
      cognitive_load: null
    }
  },
  
  // 反馈质量
  feedbackQuality: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈质量评估',
    defaultValue: {
      completeness: null,
      consistency: null,
      specificity: null,
      timeliness: null,
      reliability: null,
      informativeness: null
    }
  },
  
  // 用户状态
  userState: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈时的用户状态',
    defaultValue: {
      experience_level: null,
      engagement_level: null,
      fatigue_level: null,
      attention_level: null,
      mood_state: null,
      task_context: null,
      goal_orientation: null
    }
  },
  
  // 算法信息
  algorithmInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '算法相关信息',
    defaultValue: {
      algorithm_type: null,
      model_version: null,
      recommendation_score: null,
      explanation_provided: false,
      transparency_level: null,
      personalization_level: null
    }
  },
  
  // 时间信息
  temporalInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '时间相关信息',
    defaultValue: {
      feedback_delay: null,        // 反馈延迟（从推荐到反馈的时间）
      interaction_duration: null,  // 交互持续时间
      session_position: null,      // 在会话中的位置
      recommendation_age: null,    // 推荐的年龄
      time_of_day: null,          // 反馈时间
      day_of_week: null           // 星期几
    }
  },
  
  // 社交信息
  socialInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '社交相关信息',
    defaultValue: {
      social_influence: null,
      peer_opinions: [],
      expert_opinions: [],
      community_sentiment: null,
      social_context: null
    }
  },
  
  // 验证状态
  verificationStatus: {
    type: DataTypes.ENUM([
      'unverified',       // 未验证
      'verified',         // 已验证
      'suspicious',       // 可疑
      'flagged',          // 已标记
      'validated'         // 已验证有效
    ]),
    allowNull: false,
    defaultValue: 'unverified',
    comment: '验证状态'
  },
  
  // 处理状态
  processingStatus: {
    type: DataTypes.ENUM([
      'pending',          // 待处理
      'processing',       // 处理中
      'processed',        // 已处理
      'incorporated',     // 已整合
      'ignored',          // 已忽略
      'flagged'           // 已标记
    ]),
    allowNull: false,
    defaultValue: 'pending',
    comment: '处理状态'
  },
  
  // 处理时间
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理时间'
  },
  
  // 反馈影响
  feedbackImpact: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈影响分析',
    defaultValue: {
      preference_updates: {},
      model_adjustments: {},
      recommendation_changes: {},
      learning_contribution: null,
      system_improvements: []
    }
  },
  
  // 权重
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: '反馈权重'
  },
  
  // 是否为训练数据
  isTrainingData: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否用作训练数据'
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈标签',
    defaultValue: []
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'recommendation_feedbacks',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['recommendation_id']
    },
    {
      fields: ['book_id']
    },
    {
      fields: ['feedback_type']
    },
    {
      fields: ['feedback_value']
    },
    {
      fields: ['user_id', 'book_id']
    },
    {
      fields: ['user_id', 'feedback_type']
    },
    {
      fields: ['verification_status']
    },
    {
      fields: ['processing_status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['processed_at']
    },
    {
      fields: ['weight']
    },
    {
      fields: ['is_training_data']
    }
  ],
  comment: '推荐反馈表'
});

/**
 * 关联关系
 */
RecommendationFeedback.associate = function(models) {
  // 用户关联
  RecommendationFeedback.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // 推荐关联
  RecommendationFeedback.belongsTo(models.Recommendation, {
    foreignKey: 'recommendationId',
    as: 'recommendation',
    constraints: false
  });
  
  // 图书关联
  RecommendationFeedback.belongsTo(models.Book, {
    foreignKey: 'bookId',
    as: 'book'
  });
};

/**
 * 钩子函数
 */
RecommendationFeedback.addHook('beforeCreate', (feedback, options) => {
  // 标准化反馈值到-1到1之间
  if (feedback.feedbackValue > 1) {
    feedback.feedbackValue = 1;
  } else if (feedback.feedbackValue < -1) {
    feedback.feedbackValue = -1;
  }
  
  // 设置时间信息
  if (!feedback.temporalInfo) {
    feedback.temporalInfo = {};
  }
  feedback.temporalInfo.time_of_day = new Date().getHours();
  feedback.temporalInfo.day_of_week = new Date().getDay();
  
  // 设置反馈上下文时间戳
  if (!feedback.feedbackContext) {
    feedback.feedbackContext = {};
  }
  feedback.feedbackContext.timestamp = new Date();
});

RecommendationFeedback.addHook('afterCreate', async (feedback, options) => {
  // 更新推荐状态
  if (feedback.recommendationId) {
    const recommendation = await sequelize.models.Recommendation.findByPk(feedback.recommendationId);
    if (recommendation) {
      // 根据反馈值更新推荐状态
      if (feedback.feedbackValue > 0.5) {
        recommendation.status = 'rated';
      } else if (feedback.feedbackValue < -0.5) {
        recommendation.status = 'dismissed';
      }
      await recommendation.save();
    }
  }
});

/**
 * 静态方法
 */

// 创建显式反馈
RecommendationFeedback.createExplicitFeedback = async function(userId, bookId, rating, options = {}) {
  const feedbackValue = this.normalizeRating(rating, options.scale || 5);
  
  return await this.create({
    userId,
    bookId,
    recommendationId: options.recommendationId || null,
    feedbackType: 'explicit',
    feedbackValue,
    rawFeedbackValue: rating.toString(),
    confidence: options.confidence || 1.0,
    feedbackContent: {
      text_feedback: options.comment || null,
      selected_reasons: options.reasons || [],
      emotional_response: options.emotion || null
    },
    feedbackContext: {
      device: options.device || null,
      page_source: options.source || null,
      session_id: options.sessionId || null
    }
  });
};

// 创建隐式反馈
RecommendationFeedback.createImplicitFeedback = async function(userId, bookId, behaviorType, intensity, context = {}) {
  const feedbackValue = this.behaviorToFeedback(behaviorType, intensity);
  
  return await this.create({
    userId,
    bookId,
    recommendationId: context.recommendationId || null,
    feedbackType: 'implicit',
    feedbackValue,
    rawFeedbackValue: `${behaviorType}:${intensity}`,
    confidence: this.calculateImplicitConfidence(behaviorType, intensity),
    feedbackContext: context,
    temporalInfo: {
      interaction_duration: context.duration || null,
      feedback_delay: context.delay || null
    }
  });
};

// 获取用户反馈统计
RecommendationFeedback.getUserFeedbackStats = async function(userId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      userId,
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'feedbackType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('feedbackValue')), 'avgFeedback'],
      [sequelize.fn('AVG', sequelize.col('confidence')), 'avgConfidence']
    ],
    group: ['feedbackType'],
    raw: true
  });
  
  return this.formatFeedbackStats(stats);
};

// 获取图书反馈统计
RecommendationFeedback.getBookFeedbackStats = async function(bookId, timeRange = 90) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return await this.findAll({
    where: {
      bookId,
      feedbackType: ['explicit', 'rating'],
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedbacks'],
      [sequelize.fn('AVG', sequelize.col('feedbackValue')), 'avgRating'],
      [sequelize.fn('MIN', sequelize.col('feedbackValue')), 'minRating'],
      [sequelize.fn('MAX', sequelize.col('feedbackValue')), 'maxRating']
    ],
    raw: true
  });
};

// 获取待处理反馈
RecommendationFeedback.getPendingFeedbacks = async function(limit = 100) {
  return await this.findAll({
    where: {
      processingStatus: 'pending',
      verificationStatus: ['unverified', 'verified']
    },
    order: [['createdAt', 'ASC']],
    limit,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username']
      },
      {
        model: sequelize.models.Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'category']
      }
    ]
  });
};

// 获取反馈质量分析
RecommendationFeedback.getFeedbackQualityAnalysis = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const qualityStats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      },
      feedbackQuality: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.literal("feedback_quality->>'completeness'")), 'avgCompleteness'],
      [sequelize.fn('AVG', sequelize.literal("feedback_quality->>'consistency'")), 'avgConsistency'],
      [sequelize.fn('AVG', sequelize.literal("feedback_quality->>'specificity'")), 'avgSpecificity'],
      [sequelize.fn('AVG', sequelize.literal("feedback_quality->>'reliability'")), 'avgReliability']
    ],
    raw: true
  });
  
  return qualityStats[0] || {};
};

// 获取算法反馈对比
RecommendationFeedback.getAlgorithmFeedbackComparison = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      },
      recommendationId: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: [
      [sequelize.literal("algorithm_info->>'algorithm_type'"), 'algorithmType'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'feedbackCount'],
      [sequelize.fn('AVG', sequelize.col('feedbackValue')), 'avgFeedback'],
      [sequelize.fn('AVG', sequelize.col('confidence')), 'avgConfidence']
    ],
    group: [sequelize.literal("algorithm_info->>'algorithm_type'")],
    raw: true
  });
};

// 检测反馈异常
RecommendationFeedback.detectAnomalies = async function(userId = null, timeWindow = 60) {
  const startTime = new Date(Date.now() - timeWindow * 60 * 1000);
  const where = {
    createdAt: {
      [sequelize.Op.gte]: startTime
    }
  };
  
  if (userId) {
    where.userId = userId;
  }
  
  const recentFeedbacks = await this.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
  
  return this.analyzeAnomalies(recentFeedbacks);
};

// 批量处理反馈
RecommendationFeedback.batchProcess = async function(feedbackIds, processor) {
  const feedbacks = await this.findAll({
    where: {
      id: feedbackIds,
      processingStatus: 'pending'
    }
  });
  
  const results = [];
  
  for (const feedback of feedbacks) {
    try {
      const result = await processor(feedback);
      await feedback.update({
        processingStatus: 'processed',
        processedAt: new Date(),
        feedbackImpact: result
      });
      results.push({ id: feedback.id, success: true, result });
    } catch (error) {
      results.push({ id: feedback.id, success: false, error: error.message });
    }
  }
  
  return results;
};

/**
 * 实例方法
 */

// 标记为已处理
RecommendationFeedback.prototype.markAsProcessed = async function(impact = {}) {
  this.processingStatus = 'processed';
  this.processedAt = new Date();
  this.feedbackImpact = { ...this.feedbackImpact, ...impact };
  return await this.save();
};

// 标记为已验证
RecommendationFeedback.prototype.markAsVerified = async function() {
  this.verificationStatus = 'verified';
  return await this.save();
};

// 标记为可疑
RecommendationFeedback.prototype.markAsSuspicious = async function(reason = null) {
  this.verificationStatus = 'suspicious';
  if (reason && this.metadata) {
    this.metadata.suspiciousReason = reason;
  }
  return await this.save();
};

// 更新反馈质量
RecommendationFeedback.prototype.updateQuality = async function(qualityMetrics) {
  this.feedbackQuality = { ...this.feedbackQuality, ...qualityMetrics };
  return await this.save();
};

// 计算反馈价值
RecommendationFeedback.prototype.calculateValue = function() {
  let value = Math.abs(this.feedbackValue) * this.confidence * this.weight;
  
  // 质量调整
  if (this.feedbackQuality) {
    const qualityScore = Object.values(this.feedbackQuality)
      .filter(v => v !== null)
      .reduce((sum, v) => sum + v, 0) / 
      Object.values(this.feedbackQuality).filter(v => v !== null).length;
    
    if (!isNaN(qualityScore)) {
      value *= qualityScore;
    }
  }
  
  // 时间衰减
  const daysSinceCreation = (new Date() - new Date(this.createdAt)) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-daysSinceCreation / 30); // 30天半衰期
  value *= decayFactor;
  
  return value;
};

// 生成反馈摘要
RecommendationFeedback.prototype.getSummary = function() {
  return {
    id: this.id,
    userId: this.userId,
    bookId: this.bookId,
    type: this.feedbackType,
    value: this.feedbackValue,
    confidence: this.confidence,
    status: this.processingStatus,
    createdAt: this.createdAt,
    feedbackValue: this.calculateValue()
  };
};

/**
 * 工具方法
 */

// 标准化评分
RecommendationFeedback.normalizeRating = function(rating, scale = 5) {
  // 转换到-1到1的范围
  return ((rating - 1) / (scale - 1)) * 2 - 1;
};

// 行为转反馈值
RecommendationFeedback.behaviorToFeedback = function(behaviorType, intensity = 1.0) {
  const behaviorMapping = {
    'borrow': 0.8,
    'rate': 0.7,
    'review': 0.6,
    'bookmark': 0.5,
    'share': 0.4,
    'click': 0.3,
    'view': 0.2,
    'search': 0.1,
    'dismiss': -0.5,
    'skip': -0.2,
    'quick_exit': -0.3
  };
  
  const baseValue = behaviorMapping[behaviorType] || 0;
  return Math.max(-1, Math.min(1, baseValue * intensity));
};

// 计算隐式反馈置信度
RecommendationFeedback.calculateImplicitConfidence = function(behaviorType, intensity) {
  const confidenceMapping = {
    'borrow': 0.9,
    'rate': 0.8,
    'review': 0.8,
    'bookmark': 0.7,
    'share': 0.7,
    'click': 0.5,
    'view': 0.3,
    'search': 0.2,
    'dismiss': 0.6,
    'skip': 0.4
  };
  
  const baseConfidence = confidenceMapping[behaviorType] || 0.3;
  return Math.min(1, baseConfidence * intensity);
};

// 格式化反馈统计
RecommendationFeedback.formatFeedbackStats = function(rawStats) {
  const formatted = {
    totalFeedbacks: 0,
    byType: {},
    overallAvg: 0,
    overallConfidence: 0
  };
  
  let totalWeightedFeedback = 0;
  let totalWeightedConfidence = 0;
  let totalWeight = 0;
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    const avgFeedback = parseFloat(stat.avgFeedback || 0);
    const avgConfidence = parseFloat(stat.avgConfidence || 0);
    
    formatted.totalFeedbacks += count;
    formatted.byType[stat.feedbackType] = {
      count,
      avgFeedback,
      avgConfidence
    };
    
    totalWeightedFeedback += avgFeedback * count;
    totalWeightedConfidence += avgConfidence * count;
    totalWeight += count;
  });
  
  if (totalWeight > 0) {
    formatted.overallAvg = totalWeightedFeedback / totalWeight;
    formatted.overallConfidence = totalWeightedConfidence / totalWeight;
  }
  
  return formatted;
};

// 分析异常反馈
RecommendationFeedback.analyzeAnomalies = function(feedbacks) {
  const anomalies = [];
  
  if (feedbacks.length === 0) return anomalies;
  
  // 检查频率异常
  const userCounts = {};
  feedbacks.forEach(f => {
    userCounts[f.userId] = (userCounts[f.userId] || 0) + 1;
  });
  
  Object.entries(userCounts).forEach(([userId, count]) => {
    if (count > 20) { // 短时间内超过20个反馈
      anomalies.push({
        type: 'high_frequency',
        userId: parseInt(userId),
        count,
        severity: 'high'
      });
    }
  });
  
  // 检查极端值异常
  const extremeValues = feedbacks.filter(f => 
    Math.abs(f.feedbackValue) > 0.95 && f.confidence < 0.3
  );
  
  if (extremeValues.length > 0) {
    anomalies.push({
      type: 'extreme_values_low_confidence',
      count: extremeValues.length,
      feedbacks: extremeValues.map(f => f.id),
      severity: 'medium'
    });
  }
  
  // 检查一致性异常
  const userFeedbacks = {};
  feedbacks.forEach(f => {
    if (!userFeedbacks[f.userId]) userFeedbacks[f.userId] = [];
    userFeedbacks[f.userId].push(f.feedbackValue);
  });
  
  Object.entries(userFeedbacks).forEach(([userId, values]) => {
    if (values.length > 3) {
      const variance = this.calculateVariance(values);
      if (variance > 0.8) { // 高方差表示不一致
        anomalies.push({
          type: 'inconsistent_feedback',
          userId: parseInt(userId),
          variance,
          severity: 'low'
        });
      }
    }
  });
  
  return anomalies;
};

// 计算方差
RecommendationFeedback.calculateVariance = function(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
};

module.exports = RecommendationFeedback;