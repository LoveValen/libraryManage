const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 健康检查模板模型
 */
const HealthCheckTemplate = sequelize.define('HealthCheckTemplate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 检查名称
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '检查模板名称'
  },
  
  // 检查类型
  checkType: {
    type: DataTypes.ENUM([
      'database',      // 数据库连接
      'elasticsearch', // 搜索服务
      'memory',        // 内存使用
      'cpu',          // CPU使用
      'disk',         // 磁盘空间
      'redis',        // Redis连接
      'api_response', // API响应时间
      'websocket',    // WebSocket连接
      'external_api', // 外部API调用
      'custom'        // 自定义检查
    ]),
    allowNull: false,
    comment: '健康检查类型'
  },
  
  // 描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '检查描述'
  },
  
  // 是否启用
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用此检查'
  },
  
  // 检查间隔（秒）
  intervalSeconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    comment: '检查间隔时间（秒）'
  },
  
  // 超时时间（秒）
  timeoutSeconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    comment: '检查超时时间（秒）'
  },
  
  // 重试次数
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: '检查失败时的重试次数'
  },
  
  // 告警阈值配置
  thresholds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '告警阈值配置',
    defaultValue: {
      responseTime: {
        warning: 1000,   // 响应时间警告阈值（毫秒）
        critical: 5000   // 响应时间严重阈值（毫秒）
      },
      successRate: {
        warning: 95,     // 成功率警告阈值（百分比）
        critical: 90     // 成功率严重阈值（百分比）
      }
    }
  },
  
  // 检查配置参数
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '检查特定配置参数'
  },
  
  // 告警规则
  alertRules: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '告警规则配置',
    defaultValue: {
      enabled: true,
      severity: 'medium',
      escalationMinutes: 30,
      suppressDuplicates: true,
      notificationChannels: ['email', 'system']
    }
  },
  
  // 执行脚本或查询
  checkScript: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '自定义检查脚本或SQL查询'
  },
  
  // 期望的结果
  expectedResult: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '期望的检查结果'
  },
  
  // 连续失败次数触发告警
  failureThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: '连续失败次数触发告警'
  },
  
  // 连续成功次数恢复正常
  successThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: '连续成功次数恢复正常'
  },
  
  // 依赖的其他检查
  dependencies: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '依赖的其他健康检查',
    defaultValue: []
  },
  
  // 检查环境标签
  environment: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'production',
    comment: '检查环境（production, staging, development）'
  },
  
  // 服务标签
  serviceTags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '服务标签',
    defaultValue: []
  },
  
  // 最后检查时间
  lastCheckAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后检查时间'
  },
  
  // 最后检查状态
  lastCheckStatus: {
    type: DataTypes.ENUM(['healthy', 'warning', 'critical', 'unknown']),
    allowNull: true,
    comment: '最后检查状态'
  },
  
  // 连续失败次数
  consecutiveFailures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '连续失败次数'
  },
  
  // 连续成功次数
  consecutiveSuccesses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '连续成功次数'
  }
}, {
  tableName: 'health_check_templates',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['check_type']
    },
    {
      fields: ['enabled']
    },
    {
      fields: ['environment']
    },
    {
      fields: ['last_check_at']
    },
    {
      fields: ['last_check_status']
    }
  ],
  comment: '健康检查模板配置表'
});

/**
 * 静态方法
 */

// 获取启用的检查模板
HealthCheckTemplate.getEnabledTemplates = async function(checkType = null) {
  const where = { enabled: true };
  
  if (checkType) {
    where.checkType = checkType;
  }
  
  return await this.findAll({
    where,
    order: [['checkType', 'ASC'], ['name', 'ASC']]
  });
};

// 获取需要执行的检查
HealthCheckTemplate.getTemplatesForExecution = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      enabled: true,
      [sequelize.Op.or]: [
        { lastCheckAt: null },
        sequelize.literal(`last_check_at + INTERVAL interval_seconds SECOND <= NOW()`)
      ]
    },
    order: [['lastCheckAt', 'ASC']]
  });
};

// 创建默认检查模板
HealthCheckTemplate.createDefaultTemplates = async function() {
  const defaultTemplates = [
    {
      name: 'database_connection',
      checkType: 'database',
      description: '数据库连接健康检查',
      intervalSeconds: 30,
      timeoutSeconds: 10,
      thresholds: {
        responseTime: { warning: 500, critical: 2000 },
        successRate: { warning: 98, critical: 95 }
      },
      alertRules: {
        enabled: true,
        severity: 'critical',
        escalationMinutes: 15,
        suppressDuplicates: true,
        notificationChannels: ['email', 'system', 'sms']
      }
    },
    {
      name: 'elasticsearch_health',
      checkType: 'elasticsearch',
      description: 'Elasticsearch服务健康检查',
      intervalSeconds: 60,
      timeoutSeconds: 15,
      thresholds: {
        responseTime: { warning: 1000, critical: 3000 },
        successRate: { warning: 95, critical: 90 }
      }
    },
    {
      name: 'system_memory',
      checkType: 'memory',
      description: '系统内存使用率检查',
      intervalSeconds: 120,
      timeoutSeconds: 5,
      thresholds: {
        usage: { warning: 80, critical: 90 }
      },
      config: {
        checkProcess: true,
        includeBuffers: false
      }
    },
    {
      name: 'system_cpu',
      checkType: 'cpu',
      description: '系统CPU使用率检查',
      intervalSeconds: 120,
      timeoutSeconds: 5,
      thresholds: {
        usage: { warning: 80, critical: 95 }
      },
      config: {
        averageMinutes: 5
      }
    },
    {
      name: 'disk_space',
      checkType: 'disk',
      description: '磁盘空间使用检查',
      intervalSeconds: 300,
      timeoutSeconds: 10,
      thresholds: {
        usage: { warning: 80, critical: 90 }
      },
      config: {
        paths: ['/']
      }
    },
    {
      name: 'api_response_time',
      checkType: 'api_response',
      description: 'API响应时间检查',
      intervalSeconds: 180,
      timeoutSeconds: 30,
      thresholds: {
        responseTime: { warning: 2000, critical: 5000 },
        successRate: { warning: 95, critical: 90 }
      },
      config: {
        endpoints: ['/api/health', '/api/books', '/api/users']
      }
    },
    {
      name: 'websocket_connections',
      checkType: 'websocket',
      description: 'WebSocket连接状态检查',
      intervalSeconds: 180,
      timeoutSeconds: 15,
      thresholds: {
        activeConnections: { warning: 1000, critical: 1500 }
      }
    }
  ];
  
  const createdTemplates = [];
  
  for (const template of defaultTemplates) {
    const [created, wasCreated] = await this.findOrCreate({
      where: { name: template.name },
      defaults: template
    });
    
    if (wasCreated) {
      createdTemplates.push(created);
    }
  }
  
  return createdTemplates;
};

/**
 * 实例方法
 */

// 更新检查状态
HealthCheckTemplate.prototype.updateCheckStatus = async function(status, isSuccess = null) {
  this.lastCheckAt = new Date();
  this.lastCheckStatus = status;
  
  if (isSuccess !== null) {
    if (isSuccess) {
      this.consecutiveSuccesses += 1;
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures += 1;
      this.consecutiveSuccesses = 0;
    }
  }
  
  return await this.save();
};

// 检查是否应该触发告警
HealthCheckTemplate.prototype.shouldTriggerAlert = function() {
  return this.alertRules?.enabled && 
         this.consecutiveFailures >= this.failureThreshold;
};

// 检查是否应该恢复正常
HealthCheckTemplate.prototype.shouldRecover = function() {
  return this.consecutiveSuccesses >= this.successThreshold;
};

// 获取下次检查时间
HealthCheckTemplate.prototype.getNextCheckTime = function() {
  if (!this.lastCheckAt) {
    return new Date();
  }
  
  return new Date(this.lastCheckAt.getTime() + this.intervalSeconds * 1000);
};

// 验证阈值配置
HealthCheckTemplate.prototype.validateThresholds = function() {
  if (!this.thresholds) return true;
  
  // 检查警告阈值是否小于严重阈值
  for (const [metric, thresholds] of Object.entries(this.thresholds)) {
    if (thresholds.warning && thresholds.critical) {
      if (metric === 'usage' || metric === 'responseTime') {
        // 使用率和响应时间：警告值应该小于严重值
        if (thresholds.warning >= thresholds.critical) {
          return false;
        }
      } else if (metric === 'successRate') {
        // 成功率：警告值应该大于严重值
        if (thresholds.warning <= thresholds.critical) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// 获取检查配置摘要
HealthCheckTemplate.prototype.getConfigSummary = function() {
  return {
    name: this.name,
    type: this.checkType,
    enabled: this.enabled,
    interval: this.intervalSeconds,
    timeout: this.timeoutSeconds,
    lastCheck: this.lastCheckAt,
    status: this.lastCheckStatus,
    failures: this.consecutiveFailures,
    successes: this.consecutiveSuccesses,
    alertsEnabled: this.alertRules?.enabled || false
  };
};

// 克隆模板
HealthCheckTemplate.prototype.clone = async function(newName) {
  const cloneData = this.toJSON();
  delete cloneData.id;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;
  delete cloneData.deletedAt;
  delete cloneData.lastCheckAt;
  delete cloneData.lastCheckStatus;
  delete cloneData.consecutiveFailures;
  delete cloneData.consecutiveSuccesses;
  
  cloneData.name = newName;
  
  return await HealthCheckTemplate.create(cloneData);
};

/**
 * 钩子函数
 */
HealthCheckTemplate.addHook('beforeSave', (template, options) => {
  // 验证阈值配置
  if (!template.validateThresholds()) {
    throw new Error('Invalid threshold configuration');
  }
  
  // 确保间隔时间合理
  if (template.intervalSeconds < 10) {
    template.intervalSeconds = 10;
  }
  
  // 确保超时时间合理
  if (template.timeoutSeconds >= template.intervalSeconds) {
    template.timeoutSeconds = Math.max(5, Math.floor(template.intervalSeconds / 2));
  }
});

module.exports = HealthCheckTemplate;