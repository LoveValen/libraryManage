const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 恢复操作模型
 */
const RestoreOperation = sequelize.define('RestoreOperation', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 关联的备份任务ID
  backupJobId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '关联的备份任务ID'
  },
  
  // 恢复类型
  restoreType: {
    type: DataTypes.ENUM([
      'full',           // 完整恢复
      'database_only',  // 仅数据库
      'files_only',     // 仅文件
      'selective',      // 选择性恢复
      'point_in_time',  // 时间点恢复
      'partial'         // 部分恢复
    ]),
    allowNull: false,
    defaultValue: 'full',
    comment: '恢复类型'
  },
  
  // 恢复状态
  status: {
    type: DataTypes.ENUM([
      'pending',       // 等待中
      'preparing',     // 准备中
      'running',       // 执行中
      'completed',     // 已完成
      'failed',        // 失败
      'cancelled',     // 已取消
      'rolled_back'    // 已回滚
    ]),
    allowNull: false,
    defaultValue: 'pending',
    comment: '恢复状态'
  },
  
  // 恢复名称
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '恢复操作名称'
  },
  
  // 恢复描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '恢复描述'
  },
  
  // 目标时间点（用于时间点恢复）
  targetTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '目标恢复时间点'
  },
  
  // 计划执行时间
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '计划执行时间'
  },
  
  // 实际开始时间
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '实际开始时间'
  },
  
  // 完成时间
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  
  // 执行持续时间（秒）
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '执行持续时间（秒）'
  },
  
  // 恢复配置
  restoreConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '恢复配置参数',
    defaultValue: {
      overwriteExisting: false,
      restoreDatabases: true,
      restoreFiles: true,
      restorePermissions: true,
      verifyAfterRestore: true,
      createBackupBeforeRestore: true,
      stopServicesBeforeRestore: false
    }
  },
  
  // 恢复范围
  restoreScope: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恢复范围定义',
    defaultValue: {
      databases: [],
      tables: [],
      directories: [],
      files: [],
      excludePaths: []
    }
  },
  
  // 目标路径配置
  targetPaths: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '目标路径配置',
    defaultValue: {
      databasePath: null,
      filesPath: null,
      uploadsPath: null,
      ebooksPath: null
    }
  },
  
  // 预检查结果
  preCheckResults: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恢复前检查结果'
  },
  
  // 恢复前备份ID（如果创建了恢复前备份）
  preRestoreBackupId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '恢复前备份ID'
  },
  
  // 进度百分比
  progress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: '进度百分比（0-100）'
  },
  
  // 当前操作
  currentOperation: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '当前执行的操作'
  },
  
  // 恢复统计信息
  statistics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恢复统计信息',
    defaultValue: {
      totalFiles: 0,
      totalSize: 0,
      processedFiles: 0,
      processedSize: 0,
      skippedFiles: 0,
      failedFiles: 0,
      restoredTables: 0,
      transferRate: 0
    }
  },
  
  // 错误信息
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  
  // 错误详情
  errorDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '详细错误信息'
  },
  
  // 警告信息
  warnings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '警告信息列表'
  },
  
  // 验证结果
  verificationResult: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恢复后验证结果'
  },
  
  // 回滚信息
  rollbackInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '回滚操作信息'
  },
  
  // 触发方式
  trigger: {
    type: DataTypes.ENUM([
      'manual',      // 手动触发
      'scheduled',   // 定时任务
      'api',         // API调用
      'emergency',   // 紧急恢复
      'test'         // 测试恢复
    ]),
    allowNull: false,
    defaultValue: 'manual',
    comment: '触发方式'
  },
  
  // 触发者ID
  triggeredBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '触发者用户ID'
  },
  
  // 审批者ID
  approvedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '审批者用户ID'
  },
  
  // 审批时间
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '审批时间'
  },
  
  // 审批备注
  approvalNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '审批备注'
  },
  
  // 优先级
  priority: {
    type: DataTypes.ENUM(['low', 'normal', 'high', 'critical']),
    allowNull: false,
    defaultValue: 'normal',
    comment: '恢复优先级'
  },
  
  // 环境标识
  environment: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'production',
    comment: '目标环境'
  },
  
  // 是否为测试恢复
  isTestRestore: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为测试恢复'
  },
  
  // 自动清理时间
  autoCleanupAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '自动清理时间（用于测试恢复）'
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恢复标签',
    defaultValue: []
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  },
  
  // 执行日志
  executionLog: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '执行日志'
  }
}, {
  tableName: 'restore_operations',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['backup_job_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['restore_type']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['started_at']
    },
    {
      fields: ['completed_at']
    },
    {
      fields: ['triggered_by']
    },
    {
      fields: ['approved_by']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['environment']
    },
    {
      fields: ['is_test_restore']
    },
    {
      fields: ['auto_cleanup_at']
    }
  ],
  comment: '恢复操作记录表'
});

/**
 * 关联关系
 */
RestoreOperation.associate = function(models) {
  // 备份任务关联
  RestoreOperation.belongsTo(models.BackupJob, {
    foreignKey: 'backupJobId',
    as: 'backupJob'
  });
  
  // 恢复前备份关联
  RestoreOperation.belongsTo(models.BackupJob, {
    foreignKey: 'preRestoreBackupId',
    as: 'preRestoreBackup',
    constraints: false
  });
  
  // 触发者关联
  RestoreOperation.belongsTo(models.User, {
    foreignKey: 'triggeredBy',
    as: 'triggeredByUser',
    constraints: false
  });
  
  // 审批者关联
  RestoreOperation.belongsTo(models.User, {
    foreignKey: 'approvedBy',
    as: 'approvedByUser',
    constraints: false
  });
};

/**
 * 钩子函数
 */
RestoreOperation.addHook('beforeUpdate', (operation, options) => {
  // 自动更新持续时间
  if (operation.changed('completedAt') && operation.startedAt && operation.completedAt) {
    const duration = Math.floor((new Date(operation.completedAt) - new Date(operation.startedAt)) / 1000);
    operation.duration = duration;
  }
  
  // 自动设置测试恢复的清理时间
  if (operation.changed('isTestRestore') && operation.isTestRestore && !operation.autoCleanupAt) {
    const cleanupTime = new Date();
    cleanupTime.setHours(cleanupTime.getHours() + 24); // 24小时后自动清理
    operation.autoCleanupAt = cleanupTime;
  }
});

/**
 * 静态方法
 */

// 获取活跃恢复操作
RestoreOperation.getActiveOperations = async function() {
  return await this.findAll({
    where: {
      status: ['pending', 'preparing', 'running']
    },
    order: [
      ['priority', 'DESC'],
      ['scheduledAt', 'ASC']
    ],
    include: [
      {
        model: sequelize.models.BackupJob,
        as: 'backupJob',
        attributes: ['id', 'name', 'backupType', 'fileSize']
      },
      {
        model: sequelize.models.User,
        as: 'triggeredByUser',
        attributes: ['id', 'username', 'realName']
      }
    ]
  });
};

// 获取等待审批的恢复操作
RestoreOperation.getPendingApprovals = async function() {
  return await this.findAll({
    where: {
      status: 'pending',
      approvedBy: null,
      priority: ['high', 'critical']
    },
    order: [
      ['priority', 'DESC'],
      ['createdAt', 'ASC']
    ],
    include: [
      {
        model: sequelize.models.BackupJob,
        as: 'backupJob'
      },
      {
        model: sequelize.models.User,
        as: 'triggeredByUser',
        attributes: ['id', 'username', 'realName']
      }
    ]
  });
};

// 获取需要自动清理的测试恢复
RestoreOperation.getTestRestoresForCleanup = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      isTestRestore: true,
      status: 'completed',
      autoCleanupAt: {
        [sequelize.Op.lte]: now
      }
    },
    order: [['autoCleanupAt', 'ASC']]
  });
};

// 获取恢复统计
RestoreOperation.getStatistics = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'status',
      'restoreType',
      'priority',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
    ],
    group: ['status', 'restoreType', 'priority'],
    raw: true
  });
  
  return this.formatStatistics(stats);
};

// 格式化统计数据
RestoreOperation.formatStatistics = function(rawStats) {
  const formatted = {
    byStatus: {},
    byType: {},
    byPriority: {},
    totals: {
      count: 0,
      avgDuration: 0
    }
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    const avgDuration = parseFloat(stat.avgDuration || 0);
    
    formatted.byStatus[stat.status] = (formatted.byStatus[stat.status] || 0) + count;
    formatted.byType[stat.restoreType] = (formatted.byType[stat.restoreType] || 0) + count;
    formatted.byPriority[stat.priority] = (formatted.byPriority[stat.priority] || 0) + count;
    
    formatted.totals.count += count;
  });
  
  if (formatted.totals.count > 0) {
    formatted.totals.avgDuration = Math.round(
      rawStats.reduce((sum, stat) => sum + (parseFloat(stat.avgDuration || 0) * parseInt(stat.count)), 0) / 
      formatted.totals.count
    );
  }
  
  return formatted;
};

/**
 * 实例方法
 */

// 开始恢复操作
RestoreOperation.prototype.start = async function() {
  this.status = 'running';
  this.startedAt = new Date();
  this.progress = 0;
  this.currentOperation = 'Initializing restore...';
  return await this.save();
};

// 完成恢复操作
RestoreOperation.prototype.complete = async function(result = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress = 100;
  this.currentOperation = 'Restore completed';
  
  if (result.statistics) {
    this.statistics = { ...this.statistics, ...result.statistics };
  }
  
  if (result.verificationResult) {
    this.verificationResult = result.verificationResult;
  }
  
  return await this.save();
};

// 标记失败
RestoreOperation.prototype.fail = async function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = error.message || 'Unknown error';
  this.errorDetails = {
    stack: error.stack,
    timestamp: new Date().toISOString(),
    operation: this.currentOperation
  };
  return await this.save();
};

// 取消恢复操作
RestoreOperation.prototype.cancel = async function() {
  if (['pending', 'preparing', 'running'].includes(this.status)) {
    this.status = 'cancelled';
    this.completedAt = new Date();
    this.currentOperation = 'Restore cancelled';
    return await this.save();
  }
  throw new Error('Cannot cancel restore in current status');
};

// 更新进度
RestoreOperation.prototype.updateProgress = async function(progress, operation = null) {
  this.progress = Math.min(100, Math.max(0, progress));
  if (operation) {
    this.currentOperation = operation;
  }
  return await this.save();
};

// 审批恢复操作
RestoreOperation.prototype.approve = async function(userId, note = null) {
  if (this.status !== 'pending') {
    throw new Error('Can only approve pending restore operations');
  }
  
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNote = note;
  this.status = 'preparing';
  
  return await this.save();
};

// 拒绝恢复操作
RestoreOperation.prototype.reject = async function(userId, reason) {
  if (this.status !== 'pending') {
    throw new Error('Can only reject pending restore operations');
  }
  
  this.status = 'cancelled';
  this.completedAt = new Date();
  this.errorMessage = `Rejected by user ${userId}: ${reason}`;
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNote = reason;
  
  return await this.save();
};

// 执行预检查
RestoreOperation.prototype.preCheck = async function() {
  const checks = {
    canRestore: true,
    warnings: [],
    errors: []
  };
  
  // 检查备份文件是否存在
  // 检查目标路径是否可写
  // 检查磁盘空间是否足够
  // 检查服务是否需要停止
  // 检查权限
  
  this.preCheckResults = checks;
  await this.save();
  
  return checks;
};

// 执行回滚
RestoreOperation.prototype.rollback = async function() {
  if (this.status !== 'completed' && this.status !== 'failed') {
    throw new Error('Can only rollback completed or failed restore operations');
  }
  
  if (!this.preRestoreBackupId) {
    throw new Error('No pre-restore backup available for rollback');
  }
  
  // 创建回滚恢复操作
  const rollbackOperation = await RestoreOperation.create({
    backupJobId: this.preRestoreBackupId,
    restoreType: 'full',
    name: `Rollback: ${this.name}`,
    description: `Rollback of restore operation ${this.id}`,
    trigger: 'manual',
    triggeredBy: this.triggeredBy,
    priority: 'high',
    restoreConfig: {
      ...this.restoreConfig,
      overwriteExisting: true,
      createBackupBeforeRestore: false
    },
    tags: [...(this.tags || []), 'rollback']
  });
  
  this.status = 'rolled_back';
  this.rollbackInfo = {
    rollbackOperationId: rollbackOperation.id,
    rollbackAt: new Date(),
    rollbackReason: 'Manual rollback'
  };
  
  await this.save();
  
  return rollbackOperation;
};

// 验证恢复结果
RestoreOperation.prototype.verify = async function() {
  if (this.status !== 'completed') {
    throw new Error('Can only verify completed restore operations');
  }
  
  const verificationResult = {
    verified: true,
    timestamp: new Date(),
    checks: []
  };
  
  // 实现具体的验证逻辑
  // 验证数据库连接
  // 验证文件完整性
  // 验证服务状态
  
  this.verificationResult = verificationResult;
  await this.save();
  
  return verificationResult;
};

// 清理测试恢复
RestoreOperation.prototype.cleanup = async function() {
  if (!this.isTestRestore) {
    throw new Error('Can only cleanup test restore operations');
  }
  
  if (this.status !== 'completed') {
    throw new Error('Can only cleanup completed test restore operations');
  }
  
  // 实现具体的清理逻辑
  // 删除恢复的测试数据
  // 清理临时文件
  
  await this.destroy();
  return true;
};

// 获取恢复摘要
RestoreOperation.prototype.getSummary = function() {
  return {
    id: this.id,
    name: this.name,
    type: this.restoreType,
    status: this.status,
    progress: this.progress,
    priority: this.priority,
    duration: this.duration,
    scheduled: this.scheduledAt,
    started: this.startedAt,
    completed: this.completedAt,
    triggeredBy: this.triggeredBy,
    approvedBy: this.approvedBy,
    isTest: this.isTestRestore,
    backupJob: this.backupJobId,
    environment: this.environment
  };
};

// 添加执行日志
RestoreOperation.prototype.addLog = async function(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  this.executionLog = (this.executionLog || '') + logEntry;
  
  // 限制日志大小，保留最后10000字符
  if (this.executionLog.length > 10000) {
    this.executionLog = this.executionLog.slice(-10000);
  }
  
  return await this.save();
};

module.exports = RestoreOperation;