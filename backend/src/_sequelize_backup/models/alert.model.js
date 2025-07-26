const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 系统告警模型
 */
const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 告警类型
  alertType: {
    type: DataTypes.ENUM([
      'health_check_failed',    // 健康检查失败
      'performance_degraded',   // 性能下降
      'resource_usage_high',    // 资源使用率高
      'service_unavailable',    // 服务不可用
      'database_connection',    // 数据库连接问题
      'elasticsearch_error',    // 搜索服务错误
      'disk_space_low',        // 磁盘空间不足
      'memory_usage_high',     // 内存使用率高
      'cpu_usage_high',        // CPU使用率高
      'api_response_slow',     // API响应慢
      'security_incident',     // 安全事件
      'backup_failed',         // 备份失败
      'custom'                 // 自定义告警
    ]),
    allowNull: false,
    comment: '告警类型'
  },
  
  // 告警级别
  severity: {
    type: DataTypes.ENUM(['low', 'medium', 'high', 'critical']),
    allowNull: false,
    defaultValue: 'medium',
    comment: '告警严重程度'
  },
  
  // 告警标题
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '告警标题'
  },
  
  // 告警描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '告警详细描述'
  },
  
  // 告警状态
  status: {
    type: DataTypes.ENUM(['active', 'acknowledged', 'resolved', 'suppressed']),
    allowNull: false,
    defaultValue: 'active',
    comment: '告警状态'
  },
  
  // 来源信息
  source: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '告警来源信息'
  },
  
  // 相关指标数据
  metrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '相关指标数据'
  },
  
  // 阈值信息
  threshold: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '阈值配置信息'
  },
  
  // 影响范围
  affectedServices: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '受影响的服务列表'
  },
  
  // 建议操作
  suggestedActions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '建议的处理操作'
  },
  
  // 确认者ID
  acknowledgedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '确认告警的用户ID'
  },
  
  // 确认时间
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '告警确认时间'
  },
  
  // 确认备注
  acknowledgeNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '确认备注'
  },
  
  // 解决者ID
  resolvedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '解决告警的用户ID'
  },
  
  // 解决时间
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '告警解决时间'
  },
  
  // 解决备注
  resolutionNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '解决备注'
  },
  
  // 抑制时间（自动解除抑制的时间）
  suppressedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '抑制到指定时间'
  },
  
  // 通知发送状态
  notificationSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已发送通知'
  },
  
  // 升级状态
  escalationLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '升级级别'
  },
  
  // 下次升级时间
  nextEscalationAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下次升级时间'
  },
  
  // 告警次数（相同告警的累计次数）
  occurrenceCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '告警发生次数'
  },
  
  // 首次发生时间
  firstOccurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '首次发生时间'
  },
  
  // 最后发生时间
  lastOccurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '最后发生时间'
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['alert_type', 'status']
    },
    {
      fields: ['severity', 'status']
    },
    {
      fields: ['status', 'created_at']
    },
    {
      fields: ['acknowledged_by']
    },
    {
      fields: ['resolved_by']
    },
    {
      fields: ['first_occurred_at']
    },
    {
      fields: ['next_escalation_at']
    }
  ],
  comment: '系统告警记录表'
});

/**
 * 关联关系
 */
Alert.associate = function(models) {
  // 确认者关联
  Alert.belongsTo(models.User, {
    foreignKey: 'acknowledgedBy',
    as: 'acknowledger',
    constraints: false
  });
  
  // 解决者关联
  Alert.belongsTo(models.User, {
    foreignKey: 'resolvedBy',
    as: 'resolver',
    constraints: false
  });
};

/**
 * 钩子函数
 */
Alert.addHook('beforeUpdate', (alert, options) => {
  // 更新状态时自动设置时间戳
  if (alert.changed('status')) {
    const now = new Date();
    
    if (alert.status === 'acknowledged' && !alert.acknowledgedAt) {
      alert.acknowledgedAt = now;
    }
    
    if (alert.status === 'resolved' && !alert.resolvedAt) {
      alert.resolvedAt = now;
    }
  }
});

/**
 * 静态方法
 */

// 获取活跃告警
Alert.getActiveAlerts = async function(filters = {}) {
  const where = {
    status: ['active', 'acknowledged']
  };
  
  if (filters.severity) {
    where.severity = filters.severity;
  }
  
  if (filters.alertType) {
    where.alertType = filters.alertType;
  }
  
  return await this.findAll({
    where,
    order: [
      ['severity', 'DESC'],
      ['createdAt', 'DESC']
    ],
    include: [
      { model: sequelize.models.User, as: 'acknowledger', attributes: ['id', 'username', 'realName'] },
      { model: sequelize.models.User, as: 'resolver', attributes: ['id', 'username', 'realName'] }
    ]
  });
};

// 获取告警统计
Alert.getAlertStatistics = async function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startTime
      }
    },
    attributes: [
      'severity',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['severity', 'status'],
    raw: true
  });
  
  // 格式化统计结果
  const result = {
    total: 0,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byStatus: { active: 0, acknowledged: 0, resolved: 0, suppressed: 0 }
  };
  
  stats.forEach(stat => {
    const count = parseInt(stat.count);
    result.total += count;
    result.bySeverity[stat.severity] += count;
    result.byStatus[stat.status] += count;
  });
  
  return result;
};

// 获取需要升级的告警
Alert.getAlertsForEscalation = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      status: ['active', 'acknowledged'],
      nextEscalationAt: {
        [sequelize.Op.lte]: now
      }
    },
    order: [['nextEscalationAt', 'ASC']]
  });
};

// 清理旧告警
Alert.cleanupOldAlerts = async function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const deletedCount = await this.destroy({
    where: {
      status: 'resolved',
      resolvedAt: {
        [sequelize.Op.lt]: cutoffDate
      }
    },
    force: true
  });
  
  return deletedCount;
};

// 查找或创建告警（避免重复告警）
Alert.findOrCreateAlert = async function(alertData) {
  const { alertType, source, title } = alertData;
  
  // 查找最近1小时内的相同告警
  const recentAlert = await this.findOne({
    where: {
      alertType,
      title,
      status: ['active', 'acknowledged'],
      createdAt: {
        [sequelize.Op.gte]: new Date(Date.now() - 60 * 60 * 1000)
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  if (recentAlert) {
    // 更新现有告警
    recentAlert.occurrenceCount += 1;
    recentAlert.lastOccurredAt = new Date();
    if (alertData.metrics) {
      recentAlert.metrics = alertData.metrics;
    }
    await recentAlert.save();
    return { alert: recentAlert, created: false };
  } else {
    // 创建新告警
    const alert = await this.create(alertData);
    return { alert, created: true };
  }
};

/**
 * 实例方法
 */

// 确认告警
Alert.prototype.acknowledge = async function(userId, note = null) {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  this.acknowledgeNote = note;
  return await this.save();
};

// 解决告警
Alert.prototype.resolve = async function(userId, note = null) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNote = note;
  return await this.save();
};

// 抑制告警
Alert.prototype.suppress = async function(suppressUntil) {
  this.status = 'suppressed';
  this.suppressedUntil = suppressUntil;
  return await this.save();
};

// 升级告警
Alert.prototype.escalate = async function() {
  this.escalationLevel += 1;
  
  // 设置下次升级时间（升级间隔会逐渐增加）
  const escalationIntervals = [30, 60, 120, 240]; // 分钟
  const intervalMinutes = escalationIntervals[Math.min(this.escalationLevel, escalationIntervals.length - 1)];
  this.nextEscalationAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
  
  return await this.save();
};

// 检查是否需要升级
Alert.prototype.needsEscalation = function() {
  return this.status === 'active' && 
         this.nextEscalationAt && 
         new Date() >= this.nextEscalationAt;
};

// 获取告警严重程度分数
Alert.prototype.getSeverityScore = function() {
  const scores = { low: 1, medium: 2, high: 3, critical: 4 };
  return scores[this.severity] || 0;
};

// 格式化告警摘要
Alert.prototype.getSummary = function() {
  return {
    id: this.id,
    type: this.alertType,
    severity: this.severity,
    title: this.title,
    status: this.status,
    occurrenceCount: this.occurrenceCount,
    firstOccurred: this.firstOccurredAt,
    lastOccurred: this.lastOccurredAt,
    duration: this.resolvedAt 
      ? new Date(this.resolvedAt) - new Date(this.firstOccurredAt)
      : new Date() - new Date(this.firstOccurredAt)
  };
};

module.exports = Alert;