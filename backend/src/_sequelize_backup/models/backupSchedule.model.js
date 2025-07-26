const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 备份调度模型
 */
const BackupSchedule = sequelize.define('BackupSchedule', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 调度名称
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    comment: '调度名称'
  },
  
  // 描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '调度描述'
  },
  
  // 是否启用
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用调度'
  },
  
  // 备份类型
  backupType: {
    type: DataTypes.ENUM([
      'full',         // 完整备份
      'incremental',  // 增量备份
      'differential', // 差异备份
      'database_only', // 仅数据库
      'files_only',   // 仅文件
      'custom'        // 自定义
    ]),
    allowNull: false,
    defaultValue: 'full',
    comment: '备份类型'
  },
  
  // Cron表达式
  cronExpression: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Cron调度表达式'
  },
  
  // 时区
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Asia/Shanghai',
    comment: '时区设置'
  },
  
  // 备份配置
  backupConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '备份配置参数',
    defaultValue: {
      includeDatabases: true,
      includeFiles: true,
      includeUploads: true,
      includeEbooks: true,
      excludePatterns: [],
      compression: true,
      compressionLevel: 6,
      encryption: false,
      retentionDays: 30,
      maxBackupsToKeep: 10
    }
  },
  
  // 存储配置
  storageConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '存储配置',
    defaultValue: {
      backend: 'local',
      path: '/backups',
      encryption: false,
      compression: true
    }
  },
  
  // 通知配置
  notificationConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '通知配置',
    defaultValue: {
      onSuccess: true,
      onFailure: true,
      onWarning: false,
      channels: ['email'],
      recipients: []
    }
  },
  
  // 重试配置
  retryConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '重试配置',
    defaultValue: {
      enabled: true,
      maxRetries: 3,
      retryInterval: 300, // 秒
      backoffMultiplier: 2
    }
  },
  
  // 优先级
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '执行优先级（1-10，数字越大优先级越高）'
  },
  
  // 超时时间（秒）
  timeout: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3600,
    comment: '超时时间（秒）'
  },
  
  // 并发限制
  concurrencyLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '最大并发备份数'
  },
  
  // 下次执行时间
  nextRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下次执行时间'
  },
  
  // 上次执行时间
  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '上次执行时间'
  },
  
  // 上次执行状态
  lastRunStatus: {
    type: DataTypes.ENUM([
      'success',    // 成功
      'failed',     // 失败
      'timeout',    // 超时
      'cancelled',  // 取消
      'skipped'     // 跳过
    ]),
    allowNull: true,
    comment: '上次执行状态'
  },
  
  // 上次执行结果
  lastRunResult: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '上次执行结果详情'
  },
  
  // 执行次数
  runCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '总执行次数'
  },
  
  // 成功次数
  successCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '成功执行次数'
  },
  
  // 失败次数
  failureCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '失败执行次数'
  },
  
  // 连续失败次数
  consecutiveFailures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '连续失败次数'
  },
  
  // 平均执行时间（秒）
  avgDuration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '平均执行时间（秒）'
  },
  
  // 上次错误信息
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '上次错误信息'
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
  
  // 调度环境
  environment: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'production',
    comment: '调度环境'
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '调度标签',
    defaultValue: []
  },
  
  // 条件配置
  conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '执行条件配置',
    defaultValue: {
      requireDiskSpace: '10GB',
      requireMemory: '1GB',
      skipIfBackupExists: false,
      onlyIfDataChanged: false
    }
  },
  
  // 钩子配置
  hooks: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '钩子脚本配置',
    defaultValue: {
      preBackup: null,
      postBackup: null,
      onSuccess: null,
      onFailure: null
    }
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'backup_schedules',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['enabled']
    },
    {
      fields: ['next_run_at']
    },
    {
      fields: ['last_run_at']
    },
    {
      fields: ['cron_expression']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['environment']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['consecutive_failures']
    }
  ],
  comment: '备份调度配置表'
});

/**
 * 关联关系
 */
BackupSchedule.associate = function(models) {
  // 创建者关联
  BackupSchedule.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator',
    constraints: false
  });
  
  // 更新者关联
  BackupSchedule.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater',
    constraints: false
  });
  
  // 备份任务关联
  BackupSchedule.hasMany(models.BackupJob, {
    foreignKey: 'scheduleId',
    as: 'backupJobs'
  });
};

/**
 * 钩子函数
 */
BackupSchedule.addHook('beforeSave', async (schedule, options) => {
  // 验证Cron表达式
  if (schedule.changed('cronExpression')) {
    const cron = require('node-cron');
    if (!cron.validate(schedule.cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    // 计算下次执行时间
    schedule.nextRunAt = schedule.calculateNextRun();
  }
  
  // 计算平均执行时间
  if (schedule.changed('runCount') && schedule.runCount > 0) {
    // 这里应该从相关的备份任务中计算实际的平均时间
    // 简化处理，实际项目中应该查询相关的备份任务
  }
});

/**
 * 静态方法
 */

// 获取需要执行的调度
BackupSchedule.getDueSchedules = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      enabled: true,
      nextRunAt: {
        [sequelize.Op.lte]: now
      }
    },
    order: [
      ['priority', 'DESC'],
      ['nextRunAt', 'ASC']
    ]
  });
};

// 获取启用的调度
BackupSchedule.getEnabledSchedules = async function() {
  return await this.findAll({
    where: { enabled: true },
    order: [['priority', 'DESC'], ['name', 'ASC']]
  });
};

// 获取调度统计
BackupSchedule.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN enabled = true THEN 1 END")), 'enabled'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN consecutive_failures > 0 THEN 1 END")), 'failing'],
      [sequelize.fn('AVG', sequelize.col('successCount')), 'avgSuccessCount'],
      [sequelize.fn('AVG', sequelize.col('failureCount')), 'avgFailureCount']
    ],
    raw: true
  });
  
  const result = stats[0];
  return {
    total: parseInt(result.total),
    enabled: parseInt(result.enabled),
    disabled: parseInt(result.total) - parseInt(result.enabled),
    failing: parseInt(result.failing),
    avgSuccessRate: result.avgSuccessCount > 0 
      ? (result.avgSuccessCount / (result.avgSuccessCount + result.avgFailureCount)) * 100 
      : 0
  };
};

// 创建默认调度
BackupSchedule.createDefaultSchedules = async function() {
  const defaultSchedules = [
    {
      name: 'daily_full_backup',
      description: '每日完整备份',
      cronExpression: '0 2 * * *', // 每天凌晨2点
      backupType: 'full',
      backupConfig: {
        includeDatabases: true,
        includeFiles: true,
        includeUploads: true,
        includeEbooks: true,
        compression: true,
        compressionLevel: 6,
        encryption: false,
        retentionDays: 7,
        maxBackupsToKeep: 7
      },
      priority: 8,
      tags: ['daily', 'full', 'production']
    },
    {
      name: 'weekly_full_backup',
      description: '每周完整备份（长期保存）',
      cronExpression: '0 1 * * 0', // 每周日凌晨1点
      backupType: 'full',
      backupConfig: {
        includeDatabases: true,
        includeFiles: true,
        includeUploads: true,
        includeEbooks: true,
        compression: true,
        compressionLevel: 9,
        encryption: true,
        retentionDays: 90,
        maxBackupsToKeep: 12
      },
      priority: 9,
      tags: ['weekly', 'full', 'long-term']
    },
    {
      name: 'hourly_database_backup',
      description: '每小时数据库备份',
      cronExpression: '0 * * * *', // 每小时整点
      backupType: 'database_only',
      backupConfig: {
        includeDatabases: true,
        includeFiles: false,
        compression: true,
        compressionLevel: 6,
        retentionDays: 3,
        maxBackupsToKeep: 72
      },
      priority: 6,
      tags: ['hourly', 'database', 'quick']
    },
    {
      name: 'monthly_archive_backup',
      description: '每月归档备份',
      cronExpression: '0 0 1 * *', // 每月1号凌晨
      backupType: 'full',
      backupConfig: {
        includeDatabases: true,
        includeFiles: true,
        includeUploads: true,
        includeEbooks: true,
        compression: true,
        compressionLevel: 9,
        encryption: true,
        retentionDays: 365,
        maxBackupsToKeep: 12
      },
      priority: 10,
      tags: ['monthly', 'archive', 'long-term']
    }
  ];
  
  const created = [];
  for (const scheduleData of defaultSchedules) {
    const [schedule, wasCreated] = await this.findOrCreate({
      where: { name: scheduleData.name },
      defaults: scheduleData
    });
    
    if (wasCreated) {
      created.push(schedule);
    }
  }
  
  return created;
};

/**
 * 实例方法
 */

// 计算下次执行时间
BackupSchedule.prototype.calculateNextRun = function() {
  const cron = require('node-cron');
  
  if (!cron.validate(this.cronExpression)) {
    throw new Error('Invalid cron expression');
  }
  
  // 简化计算，实际应该使用cron库计算准确时间
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 临时：加1天
  return next;
};

// 更新执行结果
BackupSchedule.prototype.updateRunResult = async function(status, result = {}) {
  this.lastRunAt = new Date();
  this.lastRunStatus = status;
  this.lastRunResult = result;
  this.runCount += 1;
  
  if (status === 'success') {
    this.successCount += 1;
    this.consecutiveFailures = 0;
    this.lastError = null;
  } else {
    this.failureCount += 1;
    this.consecutiveFailures += 1;
    if (result.error) {
      this.lastError = result.error;
    }
  }
  
  // 计算下次执行时间
  this.nextRunAt = this.calculateNextRun();
  
  return await this.save();
};

// 启用调度
BackupSchedule.prototype.enable = async function() {
  this.enabled = true;
  this.nextRunAt = this.calculateNextRun();
  return await this.save();
};

// 禁用调度
BackupSchedule.prototype.disable = async function() {
  this.enabled = false;
  this.nextRunAt = null;
  return await this.save();
};

// 立即执行一次
BackupSchedule.prototype.runNow = async function(userId = null) {
  if (!this.enabled) {
    throw new Error('Cannot run disabled schedule');
  }
  
  const BackupJob = require('./backupJob.model');
  
  const job = await BackupJob.create({
    name: `${this.name}_manual_${Date.now()}`,
    description: `手动执行调度: ${this.name}`,
    backupType: this.backupType,
    scheduledAt: new Date(),
    trigger: 'manual',
    triggeredBy: userId,
    scheduleId: this.id,
    backupConfig: this.backupConfig,
    storageConfig: this.storageConfig
  });
  
  return job;
};

// 检查执行条件
BackupSchedule.prototype.checkConditions = async function() {
  if (!this.conditions) {
    return { canRun: true };
  }
  
  const checks = {
    canRun: true,
    reasons: []
  };
  
  // 检查磁盘空间
  if (this.conditions.requireDiskSpace) {
    // 这里应该实现实际的磁盘空间检查
    // 简化处理
  }
  
  // 检查内存
  if (this.conditions.requireMemory) {
    // 这里应该实现实际的内存检查
  }
  
  // 检查是否已存在备份
  if (this.conditions.skipIfBackupExists) {
    const BackupJob = require('./backupJob.model');
    const existingBackup = await BackupJob.findOne({
      where: {
        scheduleId: this.id,
        status: 'completed',
        createdAt: {
          [sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (existingBackup) {
      checks.canRun = false;
      checks.reasons.push('Recent backup already exists');
    }
  }
  
  return checks;
};

// 获取最近的备份任务
BackupSchedule.prototype.getRecentJobs = async function(limit = 10) {
  const BackupJob = require('./backupJob.model');
  
  return await BackupJob.findAll({
    where: { scheduleId: this.id },
    order: [['createdAt', 'DESC']],
    limit,
    include: [
      {
        model: sequelize.models.User,
        as: 'triggeredByUser',
        attributes: ['id', 'username', 'realName']
      }
    ]
  });
};

// 获取成功率
BackupSchedule.prototype.getSuccessRate = function() {
  if (this.runCount === 0) return 0;
  return Math.round((this.successCount / this.runCount) * 100);
};

// 是否健康
BackupSchedule.prototype.isHealthy = function() {
  const successRate = this.getSuccessRate();
  return successRate >= 80 && this.consecutiveFailures < 3;
};

// 获取调度摘要
BackupSchedule.prototype.getSummary = function() {
  return {
    id: this.id,
    name: this.name,
    description: this.description,
    enabled: this.enabled,
    type: this.backupType,
    cron: this.cronExpression,
    nextRun: this.nextRunAt,
    lastRun: this.lastRunAt,
    lastStatus: this.lastRunStatus,
    runCount: this.runCount,
    successRate: this.getSuccessRate(),
    consecutiveFailures: this.consecutiveFailures,
    isHealthy: this.isHealthy(),
    priority: this.priority,
    tags: this.tags
  };
};

// 克隆调度
BackupSchedule.prototype.clone = async function(newName, userId = null) {
  const cloneData = this.toJSON();
  delete cloneData.id;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;
  delete cloneData.deletedAt;
  delete cloneData.runCount;
  delete cloneData.successCount;
  delete cloneData.failureCount;
  delete cloneData.consecutiveFailures;
  delete cloneData.lastRunAt;
  delete cloneData.lastRunStatus;
  delete cloneData.lastRunResult;
  delete cloneData.lastError;
  delete cloneData.avgDuration;
  
  cloneData.name = newName;
  cloneData.enabled = false; // 默认禁用克隆的调度
  cloneData.createdBy = userId;
  cloneData.nextRunAt = null;
  
  return await BackupSchedule.create(cloneData);
};

module.exports = BackupSchedule;