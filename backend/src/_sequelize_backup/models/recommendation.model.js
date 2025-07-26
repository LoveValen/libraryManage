const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 推荐记录模型 - 存储生成的推荐结果
 */
const Recommendation = sequelize.define('Recommendation', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 用户ID
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '目标用户ID'
  },
  
  // 推荐的图书ID
  bookId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '推荐的图书ID'
  },
  
  // 使用的模型ID
  modelId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '生成推荐的模型ID'
  },
  
  // 推荐算法
  algorithm: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '推荐算法名称'
  },
  
  // 推荐分数
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: '推荐置信度分数'
  },
  
  // 推荐排名
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '在推荐列表中的排名'
  },
  
  // 推荐类型
  recommendationType: {
    type: DataTypes.ENUM([
      'personalized',      // 个性化推荐
      'similar_items',     // 相似物品
      'popular',          // 热门推荐
      'trending',         // 趋势推荐
      'collaborative',    // 协同推荐
      'content_based',    // 基于内容
      'cold_start',       // 冷启动
      'diversity',        // 多样性推荐
      'serendipity',      // 惊喜推荐
      'contextual',       // 上下文推荐
      'sequential',       // 序列推荐
      'cross_domain',     // 跨域推荐
      'social',           // 社交推荐
      'location_based',   // 基于位置
      'time_aware'        // 时间感知
    ]),
    allowNull: false,
    defaultValue: 'personalized',
    comment: '推荐类型'
  },
  
  // 推荐场景
  scenario: {
    type: DataTypes.ENUM([
      'homepage',         // 首页
      'book_detail',      // 图书详情页
      'user_profile',     // 用户档案
      'search_results',   // 搜索结果
      'category_browse',  // 分类浏览
      'email_campaign',   // 邮件营销
      'mobile_app',       // 移动应用
      'notification',     // 通知推送
      'after_borrow',     // 借阅后
      'after_return',     // 归还后
      'reading_list',     // 阅读清单
      'wishlist',         // 愿望清单
      'social_share'      // 社交分享
    ]),
    allowNull: false,
    comment: '推荐场景'
  },
  
  // 推荐状态
  status: {
    type: DataTypes.ENUM([
      'generated',        // 已生成
      'displayed',        // 已展示
      'clicked',          // 已点击
      'dismissed',        // 已忽略
      'borrowed',         // 已借阅
      'rated',           // 已评分
      'shared',          // 已分享
      'expired'          // 已过期
    ]),
    allowNull: false,
    defaultValue: 'generated',
    comment: '推荐状态'
  },
  
  // 推荐原因/解释
  explanation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '推荐解释',
    defaultValue: {
      primary_reason: null,
      factors: [],
      similar_books: [],
      user_preferences: [],
      confidence_level: null
    }
  },
  
  // 上下文信息
  context: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '推荐上下文信息',
    defaultValue: {
      timestamp: null,
      user_location: null,
      device_type: null,
      session_id: null,
      time_of_day: null,
      day_of_week: null,
      season: null,
      weather: null,
      user_mood: null,
      previous_activity: null
    }
  },
  
  // 个性化因子
  personalizationFactors: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '个性化因子',
    defaultValue: {
      user_preferences: {},
      reading_history: {},
      behavior_patterns: {},
      social_influences: {},
      demographic_factors: {}
    }
  },
  
  // 多样性信息
  diversityInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '多样性信息',
    defaultValue: {
      category_diversity: null,
      author_diversity: null,
      temporal_diversity: null,
      popularity_diversity: null,
      novelty_score: null
    }
  },
  
  // 实验信息
  experimentInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'A/B测试实验信息',
    defaultValue: {
      experiment_id: null,
      variant: null,
      control_group: false,
      test_parameters: {}
    }
  },
  
  // 展示次数
  displayCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '展示次数'
  },
  
  // 首次展示时间
  firstDisplayedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '首次展示时间'
  },
  
  // 最后展示时间
  lastDisplayedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后展示时间'
  },
  
  // 点击时间
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '点击时间'
  },
  
  // 用户反馈
  userFeedback: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '用户反馈',
    defaultValue: {
      relevance_rating: null,
      interest_level: null,
      satisfaction: null,
      would_recommend: null,
      feedback_text: null,
      feedback_timestamp: null
    }
  },
  
  // 实际效果
  actualOutcome: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '实际效果',
    defaultValue: {
      borrowed: false,
      borrow_date: null,
      reading_completed: false,
      rating_given: null,
      review_written: false,
      shared: false,
      recommended_to_others: false
    }
  },
  
  // 有效期
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '推荐有效期'
  },
  
  // 优先级
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '推荐优先级（1-10）'
  },
  
  // 是否为实时推荐
  isRealTime: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为实时推荐'
  },
  
  // 推荐批次ID
  batchId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '推荐批次ID'
  },
  
  // 推荐来源
  source: {
    type: DataTypes.ENUM([
      'system',           // 系统自动
      'manual',           // 手动添加
      'api',              // API调用
      'batch_job',        // 批处理任务
      'real_time',        // 实时生成
      'hybrid',           // 混合方式
      'fallback'          // 降级推荐
    ]),
    allowNull: false,
    defaultValue: 'system',
    comment: '推荐来源'
  },
  
  // 性能指标
  performanceMetrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '性能指标',
    defaultValue: {
      generation_time_ms: null,
      model_inference_time: null,
      feature_extraction_time: null,
      ranking_time: null,
      total_latency: null
    }
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '推荐标签',
    defaultValue: []
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'recommendations',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['book_id']
    },
    {
      fields: ['model_id']
    },
    {
      fields: ['user_id', 'scenario']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['score']
    },
    {
      fields: ['rank']
    },
    {
      fields: ['status']
    },
    {
      fields: ['scenario']
    },
    {
      fields: ['recommendation_type']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['batch_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['first_displayed_at']
    },
    {
      fields: ['clicked_at']
    },
    {
      fields: ['priority']
    },
    {
      unique: true,
      fields: ['user_id', 'book_id', 'scenario', 'batch_id']
    }
  ],
  comment: '推荐记录表'
});

/**
 * 关联关系
 */
Recommendation.associate = function(models) {
  // 用户关联
  Recommendation.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // 图书关联
  Recommendation.belongsTo(models.Book, {
    foreignKey: 'bookId',
    as: 'book'
  });
  
  // 模型关联
  Recommendation.belongsTo(models.RecommendationModel, {
    foreignKey: 'modelId',
    as: 'model'
  });
  
  // 用户行为关联
  Recommendation.hasMany(models.UserBehavior, {
    foreignKey: 'recommendationId',
    as: 'behaviors'
  });
};

/**
 * 钩子函数
 */
Recommendation.addHook('beforeCreate', (recommendation, options) => {
  // 设置默认有效期（30天）
  if (!recommendation.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    recommendation.expiresAt = expiryDate;
  }
  
  // 设置上下文时间戳
  if (!recommendation.context) {
    recommendation.context = {};
  }
  recommendation.context.timestamp = new Date();
});

Recommendation.addHook('beforeUpdate', (recommendation, options) => {
  // 更新状态时设置时间戳
  if (recommendation.changed('status')) {
    const now = new Date();
    
    switch (recommendation.status) {
      case 'displayed':
        if (!recommendation.firstDisplayedAt) {
          recommendation.firstDisplayedAt = now;
        }
        recommendation.lastDisplayedAt = now;
        recommendation.displayCount += 1;
        break;
        
      case 'clicked':
        recommendation.clickedAt = now;
        break;
    }
  }
});

/**
 * 静态方法
 */

// 获取用户的活跃推荐
Recommendation.getActiveRecommendations = async function(userId, scenario = null, limit = 10) {
  const where = {
    userId,
    status: ['generated', 'displayed'],
    expiresAt: {
      [sequelize.Op.gt]: new Date()
    }
  };
  
  if (scenario) {
    where.scenario = scenario;
  }
  
  return await this.findAll({
    where,
    include: [
      {
        model: sequelize.models.Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'category', 'coverImage', 'avgRating']
      }
    ],
    order: [['score', 'DESC'], ['priority', 'DESC']],
    limit
  });
};

// 获取推荐效果统计
Recommendation.getEffectivenessStats = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'algorithm',
      'scenario',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['algorithm', 'scenario', 'status'],
    raw: true
  });
  
  return this.formatEffectivenessStats(stats);
};

// 获取用户推荐历史
Recommendation.getUserRecommendationHistory = async function(userId, limit = 50) {
  return await this.findAll({
    where: { userId },
    include: [
      {
        model: sequelize.models.Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'category']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
};

// 获取点击率统计
Recommendation.getClickThroughRates = async function(groupBy = 'algorithm', timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      groupBy,
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalRecommendations'],
      [sequelize.fn('SUM', 
        sequelize.literal("CASE WHEN status IN ('clicked', 'borrowed') THEN 1 ELSE 0 END")
      ), 'clickedRecommendations']
    ],
    group: [groupBy],
    raw: true
  });
  
  return stats.map(stat => ({
    [groupBy]: stat[groupBy],
    totalRecommendations: parseInt(stat.totalRecommendations),
    clickedRecommendations: parseInt(stat.clickedRecommendations),
    clickThroughRate: stat.totalRecommendations > 0 
      ? (stat.clickedRecommendations / stat.totalRecommendations * 100).toFixed(2)
      : 0
  }));
};

// 清理过期推荐
Recommendation.cleanupExpired = async function() {
  const now = new Date();
  
  const result = await this.update(
    { status: 'expired' },
    {
      where: {
        status: ['generated', 'displayed'],
        expiresAt: {
          [sequelize.Op.lt]: now
        }
      }
    }
  );
  
  return result[0]; // 返回更新的记录数
};

// 获取多样性统计
Recommendation.getDiversityStats = async function(userId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const recommendations = await this.findAll({
    where: {
      userId,
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    include: [
      {
        model: sequelize.models.Book,
        as: 'book',
        attributes: ['category', 'author']
      }
    ]
  });
  
  return this.calculateDiversityMetrics(recommendations);
};

// 批量创建推荐
Recommendation.createBatch = async function(recommendations, batchId = null) {
  if (!batchId) {
    batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  const enrichedRecommendations = recommendations.map(rec => ({
    ...rec,
    batchId,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  return await this.bulkCreate(enrichedRecommendations, {
    ignoreDuplicates: true
  });
};

/**
 * 实例方法
 */

// 标记为已展示
Recommendation.prototype.markAsDisplayed = async function() {
  const now = new Date();
  
  if (!this.firstDisplayedAt) {
    this.firstDisplayedAt = now;
  }
  this.lastDisplayedAt = now;
  this.displayCount += 1;
  this.status = 'displayed';
  
  return await this.save();
};

// 标记为已点击
Recommendation.prototype.markAsClicked = async function() {
  this.status = 'clicked';
  this.clickedAt = new Date();
  return await this.save();
};

// 标记为已忽略
Recommendation.prototype.markAsDismissed = async function() {
  this.status = 'dismissed';
  return await this.save();
};

// 添加用户反馈
Recommendation.prototype.addUserFeedback = async function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback,
    feedback_timestamp: new Date()
  };
  return await this.save();
};

// 更新实际效果
Recommendation.prototype.updateActualOutcome = async function(outcome) {
  this.actualOutcome = {
    ...this.actualOutcome,
    ...outcome
  };
  return await this.save();
};

// 计算推荐质量分数
Recommendation.prototype.calculateQualityScore = function() {
  let score = 0;
  let factors = 0;
  
  // 基础分数权重
  score += this.score * 0.3;
  factors += 1;
  
  // 用户反馈权重
  if (this.userFeedback?.relevance_rating) {
    score += (this.userFeedback.relevance_rating / 5) * 0.25;
    factors += 1;
  }
  
  // 行为权重
  if (this.status === 'clicked') {
    score += 0.2;
  } else if (this.status === 'borrowed') {
    score += 0.4;
  } else if (this.status === 'dismissed') {
    score -= 0.1;
  }
  
  // 实际效果权重
  if (this.actualOutcome?.borrowed) {
    score += 0.3;
  }
  if (this.actualOutcome?.rating_given && this.actualOutcome.rating_given >= 4) {
    score += 0.2;
  }
  
  return Math.max(0, Math.min(1, score / factors));
};

// 生成推荐解释
Recommendation.prototype.generateExplanation = function() {
  const explanations = {
    'collaborative': '因为与您相似的用户也喜欢这本书',
    'content_based': '基于您的阅读偏好推荐',
    'popular': '这是当前的热门图书',
    'trending': '这本书最近很受欢迎',
    'similar_items': '您可能也喜欢这本相似的书',
    'personalized': '根据您的个人喜好定制推荐'
  };
  
  return explanations[this.recommendationType] || '系统为您推荐';
};

// 获取推荐摘要
Recommendation.prototype.getSummary = function() {
  return {
    id: this.id,
    bookId: this.bookId,
    score: this.score,
    rank: this.rank,
    type: this.recommendationType,
    scenario: this.scenario,
    status: this.status,
    algorithm: this.algorithm,
    createdAt: this.createdAt,
    explanation: this.generateExplanation(),
    qualityScore: this.calculateQualityScore()
  };
};

/**
 * 工具方法
 */

// 格式化效果统计
Recommendation.formatEffectivenessStats = function(rawStats) {
  const formatted = {
    byAlgorithm: {},
    byScenario: {},
    overallStats: {
      totalRecommendations: 0,
      totalClicks: 0,
      totalDismissals: 0,
      clickThroughRate: 0
    }
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    
    // 按算法分组
    if (!formatted.byAlgorithm[stat.algorithm]) {
      formatted.byAlgorithm[stat.algorithm] = { total: 0, clicked: 0, dismissed: 0 };
    }
    
    formatted.byAlgorithm[stat.algorithm].total += count;
    if (stat.status === 'clicked') {
      formatted.byAlgorithm[stat.algorithm].clicked += count;
    } else if (stat.status === 'dismissed') {
      formatted.byAlgorithm[stat.algorithm].dismissed += count;
    }
    
    // 按场景分组
    if (!formatted.byScenario[stat.scenario]) {
      formatted.byScenario[stat.scenario] = { total: 0, clicked: 0, dismissed: 0 };
    }
    
    formatted.byScenario[stat.scenario].total += count;
    if (stat.status === 'clicked') {
      formatted.byScenario[stat.scenario].clicked += count;
    } else if (stat.status === 'dismissed') {
      formatted.byScenario[stat.scenario].dismissed += count;
    }
    
    // 总体统计
    formatted.overallStats.totalRecommendations += count;
    if (stat.status === 'clicked') {
      formatted.overallStats.totalClicks += count;
    } else if (stat.status === 'dismissed') {
      formatted.overallStats.totalDismissals += count;
    }
  });
  
  // 计算点击率
  Object.keys(formatted.byAlgorithm).forEach(algo => {
    const data = formatted.byAlgorithm[algo];
    data.clickThroughRate = data.total > 0 ? (data.clicked / data.total * 100).toFixed(2) : 0;
  });
  
  Object.keys(formatted.byScenario).forEach(scenario => {
    const data = formatted.byScenario[scenario];
    data.clickThroughRate = data.total > 0 ? (data.clicked / data.total * 100).toFixed(2) : 0;
  });
  
  formatted.overallStats.clickThroughRate = formatted.overallStats.totalRecommendations > 0 
    ? (formatted.overallStats.totalClicks / formatted.overallStats.totalRecommendations * 100).toFixed(2)
    : 0;
  
  return formatted;
};

// 计算多样性指标
Recommendation.calculateDiversityMetrics = function(recommendations) {
  if (recommendations.length === 0) {
    return { categoryDiversity: 0, authorDiversity: 0, totalRecommendations: 0 };
  }
  
  const categories = new Set();
  const authors = new Set();
  
  recommendations.forEach(rec => {
    if (rec.book.category) categories.add(rec.book.category);
    if (rec.book.author) authors.add(rec.book.author);
  });
  
  return {
    totalRecommendations: recommendations.length,
    uniqueCategories: categories.size,
    uniqueAuthors: authors.size,
    categoryDiversity: categories.size / recommendations.length,
    authorDiversity: authors.size / recommendations.length,
    diversityScore: (categories.size + authors.size) / (recommendations.length * 2)
  };
};

module.exports = Recommendation;