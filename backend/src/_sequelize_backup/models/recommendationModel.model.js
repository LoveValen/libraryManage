const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 推荐模型配置 - 管理不同的推荐算法和模型
 */
const RecommendationModel = sequelize.define('RecommendationModel', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 模型名称
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    comment: '模型名称'
  },
  
  // 模型类型
  type: {
    type: DataTypes.ENUM([
      'collaborative_filtering',    // 协同过滤
      'content_based',             // 基于内容
      'matrix_factorization',      // 矩阵分解
      'deep_learning',             // 深度学习
      'hybrid',                    // 混合模型
      'knowledge_based',           // 基于知识
      'demographic',               // 基于人口统计
      'contextual',               // 上下文感知
      'sequential',               // 序列推荐
      'multi_armed_bandit',       // 多臂老虎机
      'reinforcement_learning',    // 强化学习
      'neural_collaborative',      // 神经协同过滤
      'autoencoders',             // 自编码器
      'factorization_machines',    // 分解机
      'wide_and_deep'             // Wide & Deep
    ]),
    allowNull: false,
    comment: '模型类型'
  },
  
  // 算法描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '算法描述'
  },
  
  // 模型版本
  version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '1.0.0',
    comment: '模型版本'
  },
  
  // 是否启用
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用'
  },
  
  // 是否为默认模型
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为默认模型'
  },
  
  // 模型配置参数
  config: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '模型配置参数',
    defaultValue: {
      // 通用参数
      maxRecommendations: 10,
      minConfidence: 0.1,
      diversityFactor: 0.3,
      popularityBoost: 0.1,
      noveltyWeight: 0.2,
      
      // 协同过滤参数
      neighborhoodSize: 50,
      similarityMetric: 'cosine',
      userBasedCF: true,
      itemBasedCF: true,
      
      // 内容过滤参数
      featureWeights: {},
      textSimilarity: 'tfidf',
      semanticEmbedding: false,
      
      // 矩阵分解参数
      factors: 50,
      regularization: 0.01,
      learningRate: 0.01,
      iterations: 100,
      
      // 深度学习参数
      hiddenLayers: [128, 64, 32],
      activationFunction: 'relu',
      optimizer: 'adam',
      batchSize: 256,
      epochs: 50,
      dropout: 0.2,
      
      // 混合模型权重
      algorithmWeights: {},
      
      // 实时学习参数
      onlineLearning: false,
      adaptationRate: 0.1,
      forgettingFactor: 0.95
    }
  },
  
  // 超参数
  hyperparameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模型超参数配置'
  },
  
  // 特征配置
  featureConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '特征工程配置',
    defaultValue: {
      userFeatures: [
        'age', 'gender', 'location', 'registrationDate',
        'totalBorrows', 'avgRating', 'favoriteCategories'
      ],
      itemFeatures: [
        'category', 'author', 'publishYear', 'pageCount',
        'avgRating', 'totalBorrows', 'tags', 'language'
      ],
      contextFeatures: [
        'timeOfDay', 'dayOfWeek', 'season', 'device',
        'location', 'weather', 'sessionLength'
      ],
      interactionFeatures: [
        'rating', 'borrowDuration', 'readingProgress',
        'reviewLength', 'shareCount', 'bookmarkTime'
      ]
    }
  },
  
  // 训练状态
  trainingStatus: {
    type: DataTypes.ENUM([
      'not_trained',    // 未训练
      'training',       // 训练中
      'trained',        // 已训练
      'updating',       // 更新中
      'failed',         // 训练失败
      'deprecated'      // 已废弃
    ]),
    allowNull: false,
    defaultValue: 'not_trained',
    comment: '训练状态'
  },
  
  // 最后训练时间
  lastTrainedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后训练时间'
  },
  
  // 下次计划训练时间
  nextTrainingAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下次计划训练时间'
  },
  
  // 训练数据大小
  trainingDataSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '训练数据大小'
  },
  
  // 模型文件路径
  modelPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '模型文件存储路径'
  },
  
  // 模型大小（字节）
  modelSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '模型文件大小'
  },
  
  // 性能指标
  performanceMetrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模型性能指标',
    defaultValue: {
      accuracy: null,
      precision: null,
      recall: null,
      f1Score: null,
      auc: null,
      rmse: null,
      mae: null,
      ndcg: null,
      hitRate: null,
      coverage: null,
      diversity: null,
      novelty: null,
      serendipity: null,
      clickThroughRate: null,
      conversionRate: null,
      userSatisfaction: null
    }
  },
  
  // A/B测试配置
  abTestConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'A/B测试配置',
    defaultValue: {
      enabled: false,
      trafficSplit: 0.5,
      experimentId: null,
      controlModel: null,
      testDuration: 7,
      successMetrics: ['clickThroughRate', 'conversionRate'],
      minimumSampleSize: 1000
    }
  },
  
  // 部署配置
  deploymentConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '部署配置',
    defaultValue: {
      environment: 'production',
      instances: 1,
      memoryLimit: '2GB',
      cpuLimit: '1000m',
      autoscaling: false,
      maxReplicas: 3,
      targetCPU: 70,
      healthCheck: true,
      gracefulShutdown: 30
    }
  },
  
  // 监控配置
  monitoringConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '监控配置',
    defaultValue: {
      enabled: true,
      metricsCollection: true,
      alerting: true,
      performanceThresholds: {
        responseTime: 500,
        errorRate: 0.01,
        throughput: 100
      },
      healthCheckInterval: 60,
      logLevel: 'info'
    }
  },
  
  // 数据版本
  dataVersion: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '训练数据版本'
  },
  
  // 依赖模型
  dependencies: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '依赖的其他模型',
    defaultValue: []
  },
  
  // 模型权重（用于集成学习）
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: '模型权重'
  },
  
  // 优先级
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '模型优先级（1-10）'
  },
  
  // 适用场景
  applicableScenarios: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '适用场景',
    defaultValue: [
      'homepage',
      'bookDetail',
      'userProfile',
      'search',
      'category',
      'email',
      'mobile'
    ]
  },
  
  // 目标用户群体
  targetUserSegments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '目标用户群体',
    defaultValue: ['all']
  },
  
  // 创建者ID
  createdBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '创建者用户ID'
  },
  
  // 更新者ID
  updatedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '更新者用户ID'
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模型标签',
    defaultValue: []
  },
  
  // 备注
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'recommendation_models',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['enabled']
    },
    {
      fields: ['is_default']
    },
    {
      fields: ['training_status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['version']
    },
    {
      fields: ['last_trained_at']
    },
    {
      fields: ['created_by']
    }
  ],
  comment: '推荐模型配置表'
});

/**
 * 关联关系
 */
RecommendationModel.associate = function(models) {
  // 创建者关联
  RecommendationModel.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator',
    constraints: false
  });
  
  // 更新者关联
  RecommendationModel.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater',
    constraints: false
  });
  
  // 推荐关联
  RecommendationModel.hasMany(models.Recommendation, {
    foreignKey: 'modelId',
    as: 'recommendations'
  });
};

/**
 * 钩子函数
 */
RecommendationModel.addHook('beforeSave', async (model, options) => {
  // 确保只有一个默认模型
  if (model.isDefault && model.changed('isDefault')) {
    await RecommendationModel.update(
      { isDefault: false },
      { 
        where: { 
          isDefault: true,
          id: { [sequelize.Op.ne]: model.id }
        }
      }
    );
  }
  
  // 设置下次训练时间
  if (model.changed('lastTrainedAt') && model.lastTrainedAt) {
    const nextTraining = new Date(model.lastTrainedAt);
    // 默认每周重训练一次
    nextTraining.setDate(nextTraining.getDate() + 7);
    model.nextTrainingAt = nextTraining;
  }
});

/**
 * 静态方法
 */

// 获取默认模型
RecommendationModel.getDefault = async function() {
  return await this.findOne({
    where: {
      isDefault: true,
      enabled: true,
      trainingStatus: 'trained'
    }
  });
};

// 获取可用模型
RecommendationModel.getAvailable = async function(scenario = null) {
  const where = {
    enabled: true,
    trainingStatus: 'trained'
  };
  
  if (scenario) {
    where.applicableScenarios = {
      [sequelize.Op.contains]: [scenario]
    };
  }
  
  return await this.findAll({
    where,
    order: [['priority', 'DESC'], ['lastTrainedAt', 'DESC']]
  });
};

// 获取需要训练的模型
RecommendationModel.getModelsForTraining = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      enabled: true,
      [sequelize.Op.or]: [
        { trainingStatus: 'not_trained' },
        {
          trainingStatus: 'trained',
          nextTrainingAt: {
            [sequelize.Op.lte]: now
          }
        }
      ]
    },
    order: [['priority', 'DESC']]
  });
};

// 获取模型统计
RecommendationModel.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      'type',
      'trainingStatus',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('weight')), 'avgWeight']
    ],
    group: ['type', 'trainingStatus'],
    raw: true
  });
  
  return this.formatStatistics(stats);
};

// 获取性能对比
RecommendationModel.getPerformanceComparison = async function(metrics = ['accuracy', 'precision', 'recall']) {
  const models = await this.findAll({
    where: {
      trainingStatus: 'trained',
      performanceMetrics: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: ['id', 'name', 'type', 'performanceMetrics', 'lastTrainedAt']
  });
  
  return models.map(model => {
    const comparison = {
      id: model.id,
      name: model.name,
      type: model.type,
      lastTrainedAt: model.lastTrainedAt
    };
    
    metrics.forEach(metric => {
      comparison[metric] = model.performanceMetrics?.[metric] || null;
    });
    
    return comparison;
  });
};

// 创建默认模型
RecommendationModel.createDefaultModels = async function() {
  const defaultModels = [
    {
      name: 'collaborative_filter_default',
      type: 'collaborative_filtering',
      description: '基于用户协同过滤的默认推荐模型',
      isDefault: true,
      config: {
        maxRecommendations: 10,
        neighborhoodSize: 50,
        similarityMetric: 'cosine',
        userBasedCF: true,
        itemBasedCF: true,
        minConfidence: 0.1
      },
      priority: 8,
      applicableScenarios: ['homepage', 'userProfile']
    },
    {
      name: 'content_based_default',
      type: 'content_based',
      description: '基于内容的推荐模型',
      config: {
        maxRecommendations: 10,
        textSimilarity: 'tfidf',
        featureWeights: {
          category: 0.3,
          author: 0.3,
          tags: 0.4
        }
      },
      priority: 7,
      applicableScenarios: ['bookDetail', 'category']
    },
    {
      name: 'hybrid_model',
      type: 'hybrid',
      description: '混合推荐模型',
      config: {
        maxRecommendations: 10,
        algorithmWeights: {
          collaborative: 0.6,
          content: 0.4
        }
      },
      priority: 9,
      applicableScenarios: ['homepage', 'search', 'email']
    },
    {
      name: 'trending_popular',
      type: 'knowledge_based',
      description: '基于流行度和趋势的推荐',
      config: {
        maxRecommendations: 10,
        timeWindow: 30,
        popularityThreshold: 0.1
      },
      priority: 6,
      applicableScenarios: ['homepage', 'mobile']
    }
  ];
  
  const created = [];
  for (const modelData of defaultModels) {
    const [model, wasCreated] = await this.findOrCreate({
      where: { name: modelData.name },
      defaults: modelData
    });
    
    if (wasCreated) {
      created.push(model);
    }
  }
  
  return created;
};

/**
 * 实例方法
 */

// 开始训练
RecommendationModel.prototype.startTraining = async function() {
  this.trainingStatus = 'training';
  this.lastTrainedAt = new Date();
  return await this.save();
};

// 训练完成
RecommendationModel.prototype.completeTraining = async function(metrics = {}, modelPath = null) {
  this.trainingStatus = 'trained';
  this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  if (modelPath) {
    this.modelPath = modelPath;
  }
  return await this.save();
};

// 训练失败
RecommendationModel.prototype.failTraining = async function(error) {
  this.trainingStatus = 'failed';
  if (!this.metadata) this.metadata = {};
  this.metadata.lastTrainingError = {
    message: error.message,
    timestamp: new Date(),
    stack: error.stack
  };
  return await this.save();
};

// 更新性能指标
RecommendationModel.prototype.updatePerformance = async function(metrics) {
  this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  return await this.save();
};

// 设置为默认模型
RecommendationModel.prototype.setAsDefault = async function() {
  // 清除其他默认模型
  await RecommendationModel.update(
    { isDefault: false },
    { where: { isDefault: true } }
  );
  
  this.isDefault = true;
  return await this.save();
};

// 克隆模型配置
RecommendationModel.prototype.clone = async function(newName, userId = null) {
  const cloneData = this.toJSON();
  delete cloneData.id;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;
  delete cloneData.deletedAt;
  delete cloneData.lastTrainedAt;
  delete cloneData.nextTrainingAt;
  delete cloneData.performanceMetrics;
  delete cloneData.modelPath;
  delete cloneData.modelSize;
  
  cloneData.name = newName;
  cloneData.isDefault = false;
  cloneData.trainingStatus = 'not_trained';
  cloneData.version = '1.0.0';
  cloneData.createdBy = userId;
  
  return await RecommendationModel.create(cloneData);
};

// 获取模型摘要
RecommendationModel.prototype.getSummary = function() {
  return {
    id: this.id,
    name: this.name,
    type: this.type,
    version: this.version,
    enabled: this.enabled,
    isDefault: this.isDefault,
    trainingStatus: this.trainingStatus,
    lastTrainedAt: this.lastTrainedAt,
    priority: this.priority,
    performanceMetrics: this.performanceMetrics,
    applicableScenarios: this.applicableScenarios
  };
};

// 验证配置
RecommendationModel.prototype.validateConfig = function() {
  const errors = [];
  
  if (!this.config) {
    errors.push('Model config is required');
    return errors;
  }
  
  // 验证通用参数
  if (this.config.maxRecommendations <= 0) {
    errors.push('maxRecommendations must be positive');
  }
  
  // 根据模型类型验证特定参数
  switch (this.type) {
    case 'collaborative_filtering':
      if (!this.config.similarityMetric) {
        errors.push('similarityMetric is required for collaborative filtering');
      }
      break;
      
    case 'matrix_factorization':
      if (this.config.factors <= 0) {
        errors.push('factors must be positive for matrix factorization');
      }
      break;
      
    case 'deep_learning':
      if (!Array.isArray(this.config.hiddenLayers)) {
        errors.push('hiddenLayers must be an array for deep learning models');
      }
      break;
  }
  
  return errors;
};

/**
 * 工具方法
 */

// 格式化统计数据
RecommendationModel.formatStatistics = function(rawStats) {
  const formatted = {
    byType: {},
    byStatus: {},
    totals: {
      count: 0,
      avgWeight: 0
    }
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    
    formatted.byType[stat.type] = (formatted.byType[stat.type] || 0) + count;
    formatted.byStatus[stat.trainingStatus] = (formatted.byStatus[stat.trainingStatus] || 0) + count;
    formatted.totals.count += count;
  });
  
  if (formatted.totals.count > 0) {
    formatted.totals.avgWeight = rawStats.reduce((sum, stat) => {
      return sum + (parseFloat(stat.avgWeight || 0) * parseInt(stat.count));
    }, 0) / formatted.totals.count;
  }
  
  return formatted;
};

module.exports = RecommendationModel;