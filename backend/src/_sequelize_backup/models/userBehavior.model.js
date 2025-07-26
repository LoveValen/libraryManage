const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 用户行为模型 - 用于推荐系统的行为追踪
 */
const UserBehavior = sequelize.define('UserBehavior', {
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
  
  // 图书ID
  bookId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '图书ID'
  },
  
  // 行为类型
  behaviorType: {
    type: DataTypes.ENUM([
      'view',           // 浏览
      'search',         // 搜索
      'borrow',         // 借阅
      'return',         // 归还
      'review',         // 评论
      'rate',           // 评分
      'bookmark',       // 收藏
      'share',          // 分享
      'download',       // 下载
      'read',           // 阅读
      'click',          // 点击
      'hover',          // 悬停
      'scroll',         // 滚动
      'recommendation_click', // 点击推荐
      'recommendation_dismiss' // 忽略推荐
    ]),
    allowNull: false,
    comment: '行为类型'
  },
  
  // 行为强度/权重
  intensity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: '行为强度权重'
  },
  
  // 行为持续时间（秒）
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '行为持续时间（秒）'
  },
  
  // 上下文信息
  context: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '行为上下文信息',
    defaultValue: {
      source: null,        // 来源页面
      referrer: null,      // 引荐来源
      device: null,        // 设备类型
      platform: null,      // 平台
      location: null,      // 地理位置
      sessionId: null,     // 会话ID
      timestamp: null      // 精确时间戳
    }
  },
  
  // 搜索查询（如果是搜索行为）
  searchQuery: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '搜索查询词'
  },
  
  // 评分值（如果是评分行为）
  ratingValue: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '评分值'
  },
  
  // 推荐ID（如果是推荐相关行为）
  recommendationId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '关联的推荐ID'
  },
  
  // 推荐算法（如果是推荐相关行为）
  recommendationAlgorithm: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '推荐算法'
  },
  
  // 推荐位置
  recommendationPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '推荐在列表中的位置'
  },
  
  // 用户反馈
  feedback: {
    type: DataTypes.ENUM(['positive', 'negative', 'neutral']),
    allowNull: true,
    comment: '用户反馈'
  },
  
  // 会话信息
  sessionInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '会话信息',
    defaultValue: {
      sessionStart: null,
      sessionDuration: null,
      pageViews: 0,
      interactions: 0,
      userAgent: null
    }
  },
  
  // 实验标识（A/B测试）
  experimentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'A/B测试实验ID'
  },
  
  // 实验变体
  experimentVariant: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'A/B测试变体'
  },
  
  // IP地址
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  
  // 用户代理
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理字符串'
  },
  
  // 处理状态
  processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已被推荐引擎处理'
  },
  
  // 处理时间
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理时间'
  },
  
  // 是否为隐式反馈
  isImplicit: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否为隐式反馈'
  },
  
  // 置信度分数
  confidenceScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '行为置信度分数'
  },
  
  // 异常标记
  isAnomaly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为异常行为'
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'user_behaviors',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['book_id']
    },
    {
      fields: ['behavior_type']
    },
    {
      fields: ['user_id', 'behavior_type']
    },
    {
      fields: ['user_id', 'book_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['processed']
    },
    {
      fields: ['recommendation_id']
    },
    {
      fields: ['experiment_id']
    },
    {
      fields: ['is_anomaly']
    }
  ],
  comment: '用户行为追踪表'
});

/**
 * 关联关系
 */
UserBehavior.associate = function(models) {
  // 用户关联
  UserBehavior.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // 图书关联
  UserBehavior.belongsTo(models.Book, {
    foreignKey: 'bookId',
    as: 'book'
  });
  
  // 推荐关联
  UserBehavior.belongsTo(models.Recommendation, {
    foreignKey: 'recommendationId',
    as: 'recommendation',
    constraints: false
  });
};

/**
 * 钩子函数
 */
UserBehavior.addHook('beforeCreate', (behavior, options) => {
  // 设置默认上下文信息
  if (!behavior.context) {
    behavior.context = {};
  }
  behavior.context.timestamp = new Date();
  
  // 根据行为类型设置默认强度
  if (!behavior.intensity) {
    const intensityMap = {
      'view': 1.0,
      'search': 1.5,
      'borrow': 5.0,
      'return': 3.0,
      'review': 4.0,
      'rate': 3.5,
      'bookmark': 2.5,
      'share': 3.0,
      'download': 4.5,
      'read': 2.0,
      'click': 1.2,
      'hover': 0.5,
      'scroll': 0.3,
      'recommendation_click': 2.0,
      'recommendation_dismiss': -1.0
    };
    behavior.intensity = intensityMap[behavior.behaviorType] || 1.0;
  }
});

/**
 * 静态方法
 */

// 获取用户行为统计
UserBehavior.getUserBehaviorStats = async function(userId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      userId,
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'behaviorType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('intensity')), 'avgIntensity'],
      [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration']
    ],
    group: ['behaviorType'],
    raw: true
  });
  
  return this.formatBehaviorStats(stats);
};

// 获取图书交互统计
UserBehavior.getBookInteractionStats = async function(bookId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return await this.findAll({
    where: {
      bookId,
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'behaviorType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'uniqueUsers']
    ],
    group: ['behaviorType'],
    raw: true
  });
};

// 获取用户相似度
UserBehavior.getUserSimilarity = async function(userId1, userId2) {
  // 获取两个用户的共同行为
  const commonBehaviors = await this.findAll({
    where: {
      userId: [userId1, userId2],
      bookId: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: ['userId', 'bookId', 'behaviorType', 'intensity'],
    raw: true
  });
  
  return this.calculateCosineSimilarity(commonBehaviors, userId1, userId2);
};

// 获取热门行为
UserBehavior.getTrendingBehaviors = async function(timeRange = 7) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      },
      bookId: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: [
      'bookId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'interactionCount'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'uniqueUsers'],
      [sequelize.fn('AVG', sequelize.col('intensity')), 'avgIntensity']
    ],
    group: ['bookId'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: 100,
    raw: true
  });
};

// 获取用户偏好向量
UserBehavior.getUserPreferenceVector = async function(userId, timeRange = 90) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const behaviors = await this.findAll({
    where: {
      userId,
      bookId: {
        [sequelize.Op.ne]: null
      },
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    include: [
      {
        model: sequelize.models.Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'category', 'tags', 'isbn']
      }
    ]
  });
  
  return this.buildUserVector(behaviors);
};

// 检测异常行为
UserBehavior.detectAnomalies = async function(userId, timeWindow = 60) {
  const startTime = new Date(Date.now() - timeWindow * 60 * 1000);
  
  const recentBehaviors = await this.findAll({
    where: {
      userId,
      createdAt: {
        [sequelize.Op.gte]: startTime
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  return this.analyzeAnomalies(recentBehaviors);
};

// 获取推荐效果统计
UserBehavior.getRecommendationEffectiveness = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      behaviorType: ['recommendation_click', 'recommendation_dismiss'],
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'recommendationAlgorithm',
      'behaviorType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['recommendationAlgorithm', 'behaviorType'],
    raw: true
  });
  
  return this.calculateClickThroughRates(stats);
};

/**
 * 实例方法
 */

// 标记为已处理
UserBehavior.prototype.markAsProcessed = async function() {
  this.processed = true;
  this.processedAt = new Date();
  return await this.save();
};

// 设置异常标记
UserBehavior.prototype.markAsAnomaly = async function(reason = null) {
  this.isAnomaly = true;
  if (reason && this.metadata) {
    this.metadata.anomalyReason = reason;
  }
  return await this.save();
};

// 更新置信度分数
UserBehavior.prototype.updateConfidence = async function(score) {
  this.confidenceScore = Math.max(0, Math.min(1, score));
  return await this.save();
};

/**
 * 工具方法
 */

// 格式化行为统计
UserBehavior.formatBehaviorStats = function(rawStats) {
  const formatted = {
    totalInteractions: 0,
    behaviorBreakdown: {},
    avgIntensity: 0,
    totalDuration: 0
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    formatted.totalInteractions += count;
    formatted.behaviorBreakdown[stat.behaviorType] = {
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
};

// 计算余弦相似度
UserBehavior.calculateCosineSimilarity = function(behaviors, userId1, userId2) {
  const user1Behaviors = behaviors.filter(b => b.userId === userId1);
  const user2Behaviors = behaviors.filter(b => b.userId === userId2);
  
  // 构建共同图书的行为向量
  const commonBooks = new Set([
    ...user1Behaviors.map(b => b.bookId),
    ...user2Behaviors.map(b => b.bookId)
  ]);
  
  if (commonBooks.size === 0) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const bookId of commonBooks) {
    const user1Score = user1Behaviors
      .filter(b => b.bookId === bookId)
      .reduce((sum, b) => sum + b.intensity, 0);
    
    const user2Score = user2Behaviors
      .filter(b => b.bookId === bookId)
      .reduce((sum, b) => sum + b.intensity, 0);
    
    dotProduct += user1Score * user2Score;
    norm1 += user1Score * user1Score;
    norm2 += user2Score * user2Score;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

// 构建用户偏好向量
UserBehavior.buildUserVector = function(behaviors) {
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
    if (book.category) {
      vector.categories[book.category] = (vector.categories[book.category] || 0) + intensity;
    }
    
    // 作者偏好
    if (book.author) {
      vector.authors[book.author] = (vector.authors[book.author] || 0) + intensity;
    }
    
    // 标签偏好
    if (book.tags && Array.isArray(book.tags)) {
      book.tags.forEach(tag => {
        vector.tags[tag] = (vector.tags[tag] || 0) + intensity;
      });
    }
  });
  
  vector.avgIntensity = behaviors.length > 0 ? totalIntensity / behaviors.length : 0;
  
  return vector;
};

// 分析异常行为
UserBehavior.analyzeAnomalies = function(behaviors) {
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
    behaviorCounts[b.behaviorType] = (behaviorCounts[b.behaviorType] || 0) + 1;
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
};

// 计算点击率
UserBehavior.calculateClickThroughRates = function(stats) {
  const algorithms = {};
  
  stats.forEach(stat => {
    const algo = stat.recommendationAlgorithm || 'unknown';
    if (!algorithms[algo]) {
      algorithms[algo] = { clicks: 0, dismissals: 0, total: 0 };
    }
    
    const count = parseInt(stat.count);
    algorithms[algo].total += count;
    
    if (stat.behaviorType === 'recommendation_click') {
      algorithms[algo].clicks += count;
    } else if (stat.behaviorType === 'recommendation_dismiss') {
      algorithms[algo].dismissals += count;
    }
  });
  
  Object.keys(algorithms).forEach(algo => {
    const data = algorithms[algo];
    data.clickThroughRate = data.total > 0 ? (data.clicks / data.total) * 100 : 0;
    data.dismissalRate = data.total > 0 ? (data.dismissals / data.total) * 100 : 0;
  });
  
  return algorithms;
};

module.exports = UserBehavior;