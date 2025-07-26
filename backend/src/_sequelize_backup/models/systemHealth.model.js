const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 系统健康状态模型
 */
const SystemHealth = sequelize.define('SystemHealth', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
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
  
  // 检查名称
  checkName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '检查项目名称'
  },
  
  // 状态
  status: {
    type: DataTypes.ENUM(['healthy', 'warning', 'critical', 'unknown']),
    allowNull: false,
    defaultValue: 'unknown',
    comment: '健康状态'
  },
  
  // 响应时间（毫秒）
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '响应时间（毫秒）'
  },
  
  // 错误信息
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  
  // 详细信息（JSON格式）
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '详细健康信息'
  },
  
  // 指标数据
  metrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '性能指标数据'
  },
  
  // 检查时间戳
  checkedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '检查时间'
  }
}, {
  tableName: 'system_health',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['check_type', 'check_name']
    },
    {
      fields: ['status']
    },
    {
      fields: ['checked_at']
    },
    {
      fields: ['check_type', 'checked_at']
    }
  ],
  comment: '系统健康状态记录表'
});

/**
 * 模型方法
 */

// 获取最新健康状态
SystemHealth.getLatestHealthStatus = async function() {
  const latestChecks = await this.findAll({
    attributes: [
      'checkType',
      'checkName',
      'status',
      'responseTime',
      'errorMessage',
      'details',
      'metrics',
      'checkedAt'
    ],
    where: sequelize.literal(`
      (check_type, check_name, checked_at) IN (
        SELECT check_type, check_name, MAX(checked_at)
        FROM system_health
        GROUP BY check_type, check_name
      )
    `),
    order: [['checkType', 'ASC'], ['checkName', 'ASC']]
  });

  return latestChecks;
};

// 获取系统整体健康状态
SystemHealth.getOverallHealth = async function() {
  const latestChecks = await this.getLatestHealthStatus();
  
  const statusCounts = {
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0
  };
  
  latestChecks.forEach(check => {
    statusCounts[check.status]++;
  });
  
  let overallStatus = 'healthy';
  if (statusCounts.critical > 0) {
    overallStatus = 'critical';
  } else if (statusCounts.warning > 0) {
    overallStatus = 'warning';
  } else if (statusCounts.unknown > 0) {
    overallStatus = 'unknown';
  }
  
  return {
    overallStatus,
    statusCounts,
    totalChecks: latestChecks.length,
    lastUpdated: latestChecks.length > 0 
      ? Math.max(...latestChecks.map(c => new Date(c.checkedAt).getTime()))
      : null
  };
};

// 获取健康趋势
SystemHealth.getHealthTrend = async function(checkType, checkName, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const trend = await this.findAll({
    where: {
      checkType,
      checkName,
      checkedAt: {
        [sequelize.Op.gte]: startTime
      }
    },
    order: [['checkedAt', 'ASC']],
    attributes: ['status', 'responseTime', 'metrics', 'checkedAt']
  });
  
  return trend;
};

// 获取性能统计
SystemHealth.getPerformanceStats = async function(checkType, checkName, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      checkType,
      checkName,
      checkedAt: {
        [sequelize.Op.gte]: startTime
      },
      responseTime: {
        [sequelize.Op.ne]: null
      }
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('responseTime')), 'avgResponseTime'],
      [sequelize.fn('MIN', sequelize.col('responseTime')), 'minResponseTime'],
      [sequelize.fn('MAX', sequelize.col('responseTime')), 'maxResponseTime'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalChecks'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'healthy' THEN 1 END")), 'healthyCount'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'warning' THEN 1 END")), 'warningCount'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'critical' THEN 1 END")), 'criticalCount']
    ],
    raw: true
  });
  
  const result = stats[0];
  if (result.totalChecks > 0) {
    result.uptime = ((result.healthyCount + result.warningCount) / result.totalChecks * 100).toFixed(2);
    result.avgResponseTime = parseFloat(result.avgResponseTime || 0).toFixed(2);
  }
  
  return result;
};

// 清理旧记录
SystemHealth.cleanupOldRecords = async function(daysToKeep = 30) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const deletedCount = await this.destroy({
    where: {
      checkedAt: {
        [sequelize.Op.lt]: cutoffDate
      }
    }
  });
  
  return deletedCount;
};

/**
 * 实例方法
 */

// 判断是否需要告警
SystemHealth.prototype.needsAlert = function() {
  return this.status === 'critical' || this.status === 'warning';
};

// 获取严重程度分数
SystemHealth.prototype.getSeverityScore = function() {
  const scores = {
    'healthy': 0,
    'unknown': 1,
    'warning': 2,
    'critical': 3
  };
  return scores[this.status] || 0;
};

// 格式化健康报告
SystemHealth.prototype.formatHealthReport = function() {
  return {
    type: this.checkType,
    name: this.checkName,
    status: this.status,
    responseTime: this.responseTime,
    uptime: this.details?.uptime || null,
    lastChecked: this.checkedAt,
    error: this.errorMessage,
    metrics: this.metrics
  };
};

module.exports = SystemHealth;