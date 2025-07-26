const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 用户偏好模型 - 存储用户的学习偏好档案
 */
const UserPreference = sequelize.define('UserPreference', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 用户ID
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true,
    comment: '用户ID'
  },
  
  // 偏好类型
  preferenceType: {
    type: DataTypes.ENUM([
      'explicit',         // 显式偏好（用户主动设置）
      'implicit',         // 隐式偏好（从行为推断）
      'learned',          // 机器学习得出
      'hybrid'            // 混合偏好
    ]),
    allowNull: false,
    defaultValue: 'hybrid',
    comment: '偏好类型'
  },
  
  // 分类偏好
  categoryPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '分类偏好权重',
    defaultValue: {}
  },
  
  // 作者偏好
  authorPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '作者偏好权重',
    defaultValue: {}
  },
  
  // 标签偏好
  tagPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签偏好权重',
    defaultValue: {}
  },
  
  // 语言偏好
  languagePreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '语言偏好权重',
    defaultValue: {}
  },
  
  // 发布年份偏好
  publishYearPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '发布年份偏好分布',
    defaultValue: {
      preferred_decades: [],
      min_year: null,
      max_year: null,
      recency_bias: 0.5
    }
  },
  
  // 页数偏好
  pageCountPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '页数偏好范围',
    defaultValue: {
      min_pages: null,
      max_pages: null,
      preferred_range: [100, 400],
      tolerance: 0.3
    }
  },
  
  // 评分偏好
  ratingPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '评分偏好',
    defaultValue: {
      min_rating: 3.0,
      weight_by_rating: true,
      rating_threshold: 4.0,
      quality_vs_popularity: 0.7
    }
  },
  
  // 流行度偏好
  popularityPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '流行度偏好',
    defaultValue: {
      mainstream_preference: 0.5,
      niche_tolerance: 0.3,
      trending_boost: 0.2,
      classic_preference: 0.4
    }
  },
  
  // 多样性偏好
  diversityPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '多样性偏好',
    defaultValue: {
      category_diversity: 0.3,
      author_diversity: 0.3,
      novelty_seeking: 0.4,
      exploration_rate: 0.2,
      serendipity_tolerance: 0.3
    }
  },
  
  // 时间偏好
  temporalPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '时间相关偏好',
    defaultValue: {
      reading_schedule: {},
      seasonal_preferences: {},
      time_of_day_patterns: {},
      weekend_vs_weekday: {},
      preferred_reading_duration: 60
    }
  },
  
  // 上下文偏好
  contextualPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '上下文偏好',
    defaultValue: {
      device_preferences: {},
      location_preferences: {},
      mood_preferences: {},
      social_context_preferences: {},
      activity_based_preferences: {}
    }
  },
  
  // 社交偏好
  socialPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '社交偏好',
    defaultValue: {
      follow_friends: 0.3,
      popular_among_similar_users: 0.5,
      expert_recommendations: 0.4,
      community_trending: 0.3,
      social_proof_weight: 0.2
    }
  },
  
  // 负面偏好（不喜欢的内容）
  negativePreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '负面偏好',
    defaultValue: {
      disliked_categories: [],
      disliked_authors: [],
      disliked_tags: [],
      content_filters: [],
      blacklisted_keywords: []
    }
  },
  
  // 学习参数
  learningParameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '学习参数',
    defaultValue: {
      learning_rate: 0.1,
      decay_factor: 0.95,
      exploration_rate: 0.2,
      confidence_threshold: 0.7,
      adaptation_speed: 'medium',
      feedback_weight: 0.8,
      time_decay_enabled: true,
      online_learning: true
    }
  },
  
  // 个性化强度
  personalizationStrength: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.5,
    comment: '个性化强度（0-1）'
  },
  
  // 置信度分数
  confidenceScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.1,
    comment: '偏好置信度分数'
  },
  
  // 数据质量分数
  dataQualityScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '偏好数据质量分数'
  },
  
  // 最后更新来源
  lastUpdateSource: {
    type: DataTypes.ENUM([
      'explicit_feedback',    // 显式反馈
      'implicit_behavior',    // 隐式行为
      'batch_learning',       // 批量学习
      'real_time_update',     // 实时更新
      'manual_adjustment',    // 手动调整
      'model_inference'       // 模型推断
    ]),
    allowNull: true,
    comment: '最后更新来源'
  },
  
  // 用户档案
  userProfile: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '用户档案信息',
    defaultValue: {
      reading_level: 'intermediate',
      reading_speed: 'medium',
      attention_span: 'normal',
      preferred_complexity: 'medium',
      learning_style: 'visual',
      personality_traits: {},
      demographic_segment: null
    }
  },
  
  // 行为模式
  behaviorPatterns: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '行为模式分析',
    defaultValue: {
      browsing_patterns: {},
      search_patterns: {},
      reading_patterns: {},
      rating_patterns: {},
      sharing_patterns: {},
      session_patterns: {}
    }
  },
  
  // 兴趣演化
  interestEvolution: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '兴趣演化轨迹',
    defaultValue: {
      trend_direction: 'stable',
      evolution_speed: 'slow',
      interest_lifecycle: {},
      seasonal_variations: {},
      life_event_impacts: []
    }
  },
  
  // 相似用户
  similarUsers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '相似用户列表',
    defaultValue: {
      user_similarities: {},
      cluster_id: null,
      user_persona: null,
      neighborhood_size: 50
    }
  },
  
  // 推荐历史统计
  recommendationStats: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '推荐历史统计',
    defaultValue: {
      total_recommendations: 0,
      clicked_recommendations: 0,
      borrowed_from_recommendations: 0,
      average_recommendation_score: 0,
      favorite_recommendation_types: [],
      best_performing_algorithms: []
    }
  },
  
  // 反馈历史
  feedbackHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '反馈历史',
    defaultValue: {
      explicit_feedback_count: 0,
      implicit_feedback_count: 0,
      feedback_consistency: 0,
      last_feedback_date: null,
      feedback_trends: {}
    }
  },
  
  // 冷启动信息
  coldStartInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '冷启动相关信息',
    defaultValue: {
      is_cold_start: true,
      onboarding_completed: false,
      initial_preferences_set: false,
      minimum_interactions_met: false,
      fallback_strategy: 'popular_items'
    }
  },
  
  // 隐私设置
  privacySettings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '隐私设置',
    defaultValue: {
      allow_personalization: true,
      allow_behavior_tracking: true,
      allow_social_features: true,
      data_retention_period: 365,
      allow_cross_device_tracking: false
    }
  },
  
  // 实验配置
  experimentConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'A/B测试配置',
    defaultValue: {
      active_experiments: [],
      experiment_groups: {},
      opt_out_experiments: [],
      experiment_history: []
    }
  },
  
  // 最后计算时间
  lastComputedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后计算时间'
  },
  
  // 下次更新时间
  nextUpdateAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下次计划更新时间'
  },
  
  // 是否需要重新计算
  needsRecomputation: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否需要重新计算'
  },
  
  // 计算版本
  computationVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '计算版本'
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'user_preferences',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id'],
      unique: true
    },
    {
      fields: ['preference_type']
    },
    {
      fields: ['personalization_strength']
    },
    {
      fields: ['confidence_score']
    },
    {
      fields: ['needs_recomputation']
    },
    {
      fields: ['last_computed_at']
    },
    {
      fields: ['next_update_at']
    }
  ],
  comment: '用户偏好档案表'
});

/**
 * 关联关系
 */
UserPreference.associate = function(models) {
  // 用户关联
  UserPreference.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

/**
 * 钩子函数
 */
UserPreference.addHook('beforeUpdate', (preference, options) => {
  // 更新计算时间
  if (preference.changed('categoryPreferences') || 
      preference.changed('authorPreferences') || 
      preference.changed('tagPreferences')) {
    preference.lastComputedAt = new Date();
    preference.needsRecomputation = false;
    
    // 设置下次更新时间（7天后）
    const nextUpdate = new Date();
    nextUpdate.setDate(nextUpdate.getDate() + 7);
    preference.nextUpdateAt = nextUpdate;
  }
});

/**
 * 静态方法
 */

// 为用户创建或获取偏好档案
UserPreference.findOrCreateForUser = async function(userId) {
  const [preference, created] = await this.findOrCreate({
    where: { userId },
    defaults: {
      userId,
      preferenceType: 'hybrid',
      coldStartInfo: {
        is_cold_start: true,
        onboarding_completed: false,
        initial_preferences_set: false,
        minimum_interactions_met: false,
        fallback_strategy: 'popular_items'
      }
    }
  });
  
  return preference;
};

// 获取需要更新的偏好档案
UserPreference.getNeedsUpdate = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      [sequelize.Op.or]: [
        { needsRecomputation: true },
        {
          nextUpdateAt: {
            [sequelize.Op.lte]: now
          }
        }
      ]
    },
    order: [['nextUpdateAt', 'ASC']]
  });
};

// 获取冷启动用户
UserPreference.getColdStartUsers = async function() {
  return await this.findAll({
    where: {
      [sequelize.Op.or]: [
        sequelize.literal("cold_start_info->>'is_cold_start' = 'true'"),
        sequelize.literal("cold_start_info->>'minimum_interactions_met' = 'false'")
      ]
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'createdAt']
      }
    ]
  });
};

// 获取偏好档案统计
UserPreference.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      'preferenceType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('confidenceScore')), 'avgConfidence'],
      [sequelize.fn('AVG', sequelize.col('personalizationStrength')), 'avgPersonalization']
    ],
    group: ['preferenceType'],
    raw: true
  });
  
  const coldStartCount = await this.count({
    where: sequelize.literal("cold_start_info->>'is_cold_start' = 'true'")
  });
  
  return {
    byType: this.formatStatistics(stats),
    coldStartUsers: coldStartCount,
    totalUsers: await this.count()
  };
};

// 更新用户偏好
UserPreference.updateUserPreferences = async function(userId, preferences, source = 'explicit_feedback') {
  const userPreference = await this.findOrCreateForUser(userId);
  
  // 合并偏好数据
  const updates = {
    lastUpdateSource: source,
    lastComputedAt: new Date(),
    needsRecomputation: false
  };
  
  Object.keys(preferences).forEach(key => {
    if (userPreference[key] !== undefined) {
      updates[key] = { ...userPreference[key], ...preferences[key] };
    }
  });
  
  return await userPreference.update(updates);
};

/**
 * 实例方法
 */

// 更新分类偏好
UserPreference.prototype.updateCategoryPreferences = async function(categoryScores) {
  this.categoryPreferences = { ...this.categoryPreferences, ...categoryScores };
  this.lastUpdateSource = 'implicit_behavior';
  this.lastComputedAt = new Date();
  return await this.save();
};

// 更新作者偏好
UserPreference.prototype.updateAuthorPreferences = async function(authorScores) {
  this.authorPreferences = { ...this.authorPreferences, ...authorScores };
  this.lastUpdateSource = 'implicit_behavior';
  this.lastComputedAt = new Date();
  return await this.save();
};

// 添加负面偏好
UserPreference.prototype.addNegativePreference = async function(type, value) {
  if (!this.negativePreferences[type]) {
    this.negativePreferences[type] = [];
  }
  
  if (!this.negativePreferences[type].includes(value)) {
    this.negativePreferences[type].push(value);
    this.lastUpdateSource = 'explicit_feedback';
    await this.save();
  }
};

// 更新置信度分数
UserPreference.prototype.updateConfidence = async function(newScore) {
  // 使用指数移动平均更新置信度
  const alpha = 0.2;
  this.confidenceScore = (1 - alpha) * this.confidenceScore + alpha * newScore;
  return await this.save();
};

// 标记需要重新计算
UserPreference.prototype.markForRecomputation = async function() {
  this.needsRecomputation = true;
  return await this.save();
};

// 完成冷启动
UserPreference.prototype.completeColdStart = async function() {
  this.coldStartInfo = {
    ...this.coldStartInfo,
    is_cold_start: false,
    onboarding_completed: true,
    minimum_interactions_met: true
  };
  this.confidenceScore = Math.max(0.3, this.confidenceScore);
  return await this.save();
};

// 获取推荐权重
UserPreference.prototype.getRecommendationWeights = function() {
  return {
    category: this.categoryPreferences || {},
    author: this.authorPreferences || {},
    tag: this.tagPreferences || {},
    language: this.languagePreferences || {},
    personalizationStrength: this.personalizationStrength,
    confidenceScore: this.confidenceScore,
    diversityPreference: this.diversityPreferences?.exploration_rate || 0.2
  };
};

// 计算内容相似度分数
UserPreference.prototype.calculateContentScore = function(book) {
  let score = 0;
  let weightSum = 0;
  
  // 分类权重
  if (book.category && this.categoryPreferences[book.category]) {
    score += this.categoryPreferences[book.category] * 0.4;
    weightSum += 0.4;
  }
  
  // 作者权重
  if (book.author && this.authorPreferences[book.author]) {
    score += this.authorPreferences[book.author] * 0.3;
    weightSum += 0.3;
  }
  
  // 标签权重
  if (book.tags && Array.isArray(book.tags)) {
    let tagScore = 0;
    let tagWeight = 0;
    
    book.tags.forEach(tag => {
      if (this.tagPreferences[tag]) {
        tagScore += this.tagPreferences[tag];
        tagWeight += 1;
      }
    });
    
    if (tagWeight > 0) {
      score += (tagScore / tagWeight) * 0.3;
      weightSum += 0.3;
    }
  }
  
  // 负面偏好检查
  if (this.negativePreferences) {
    if (this.negativePreferences.disliked_categories?.includes(book.category)) {
      score *= 0.1; // 大幅降低分数
    }
    if (this.negativePreferences.disliked_authors?.includes(book.author)) {
      score *= 0.1;
    }
  }
  
  return weightSum > 0 ? score / weightSum : 0;
};

// 应用时间衰减
UserPreference.prototype.applyTimeDecay = async function(decayFactor = 0.99) {
  if (!this.learningParameters?.time_decay_enabled) {
    return this;
  }
  
  // 对所有偏好应用时间衰减
  Object.keys(this.categoryPreferences || {}).forEach(category => {
    this.categoryPreferences[category] *= decayFactor;
  });
  
  Object.keys(this.authorPreferences || {}).forEach(author => {
    this.authorPreferences[author] *= decayFactor;
  });
  
  Object.keys(this.tagPreferences || {}).forEach(tag => {
    this.tagPreferences[tag] *= decayFactor;
  });
  
  return await this.save();
};

// 获取用户聚类信息
UserPreference.prototype.getUserCluster = function() {
  return this.similarUsers?.cluster_id || null;
};

// 更新推荐统计
UserPreference.prototype.updateRecommendationStats = async function(action, algorithmType = null) {
  if (!this.recommendationStats) {
    this.recommendationStats = {
      total_recommendations: 0,
      clicked_recommendations: 0,
      borrowed_from_recommendations: 0,
      average_recommendation_score: 0,
      favorite_recommendation_types: [],
      best_performing_algorithms: []
    };
  }
  
  switch (action) {
    case 'recommendation_shown':
      this.recommendationStats.total_recommendations += 1;
      break;
    case 'recommendation_clicked':
      this.recommendationStats.clicked_recommendations += 1;
      break;
    case 'recommendation_borrowed':
      this.recommendationStats.borrowed_from_recommendations += 1;
      break;
  }
  
  if (algorithmType) {
    // 更新算法性能统计
    if (!this.recommendationStats.best_performing_algorithms) {
      this.recommendationStats.best_performing_algorithms = {};
    }
    
    if (!this.recommendationStats.best_performing_algorithms[algorithmType]) {
      this.recommendationStats.best_performing_algorithms[algorithmType] = {
        total: 0,
        clicked: 0,
        borrowed: 0
      };
    }
    
    const algoStats = this.recommendationStats.best_performing_algorithms[algorithmType];
    algoStats.total += 1;
    
    if (action === 'recommendation_clicked') {
      algoStats.clicked += 1;
    } else if (action === 'recommendation_borrowed') {
      algoStats.borrowed += 1;
    }
  }
  
  return await this.save();
};

/**
 * 工具方法
 */

// 格式化统计数据
UserPreference.formatStatistics = function(rawStats) {
  const formatted = {};
  
  rawStats.forEach(stat => {
    formatted[stat.preferenceType] = {
      count: parseInt(stat.count),
      avgConfidence: parseFloat(stat.avgConfidence || 0),
      avgPersonalization: parseFloat(stat.avgPersonalization || 0)
    };
  });
  
  return formatted;
};

module.exports = UserPreference;