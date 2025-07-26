const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 备份任务模型
 */
const BackupJob = sequelize.define('BackupJob', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
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
  
  // 备份状态
  status: {
    type: DataTypes.ENUM([
      'pending',    // 等待中
      'running',    // 执行中
      'completed',  // 已完成
      'failed',     // 失败
      'cancelled',  // 已取消
      'expired'     // 已过期
    ]),
    allowNull: false,
    defaultValue: 'pending',
    comment: '备份状态'
  },
  
  // 备份名称
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '备份名称'
  },
  
  // 备份描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备份描述'
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
  
  // 备份文件路径
  filePath: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备份文件路径'
  },
  
  // 备份文件大小（字节）
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '备份文件大小（字节）'
  },
  
  // 备份文件数量
  fileCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '备份文件数量'
  },
  
  // 压缩后大小（字节）
  compressedSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '压缩后大小（字节）'
  },
  
  // 压缩比率（百分比）
  compressionRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '压缩比率（百分比）'
  },
  
  // 是否加密
  encrypted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否加密'
  },
  
  // 加密算法
  encryptionAlgorithm: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '加密算法'
  },
  
  // 校验和（用于完整性验证）
  checksum: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: '文件校验和'
  },
  
  // 校验和算法
  checksumAlgorithm: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'sha256',
    comment: '校验和算法'
  },
  
  // 存储后端
  storageBackend: {
    type: DataTypes.ENUM([
      'local',      // 本地存储
      's3',         // Amazon S3
      'ftp',        // FTP服务器
      'sftp',       // SFTP服务器
      'azure',      // Azure Blob Storage
      'gcs',        // Google Cloud Storage
      'dropbox',    // Dropbox
      'custom'      // 自定义存储
    ]),
    allowNull: false,
    defaultValue: 'local',
    comment: '存储后端'
  },
  
  // 存储配置
  storageConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '存储配置信息'
  },
  
  // 存储路径
  storagePath: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '存储路径'
  },
  
  // 备份配置
  backupConfig: {
    type: DataTypes.JSON,
    allowNull: true,
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
      splitSize: null,
      retentionDays: 30
    }
  },
  
  // 备份范围
  backupScope: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '备份范围定义',
    defaultValue: {
      databases: ['main'],
      tables: [],
      directories: ['uploads', 'ebooks'],
      excludePaths: ['temp', 'cache', 'logs']
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
  
  // 备份统计信息
  statistics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '备份统计信息',
    defaultValue: {
      totalFiles: 0,
      totalSize: 0,
      processedFiles: 0,
      processedSize: 0,
      skippedFiles: 0,
      failedFiles: 0,
      transferRate: 0
    }
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
  
  // 触发方式
  trigger: {
    type: DataTypes.ENUM([
      'manual',      // 手动触发
      'scheduled',   // 定时任务
      'api',         // API调用
      'event',       // 事件触发
      'auto'         // 自动备份
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
  
  // 备份调度ID（如果是定时任务）
  scheduleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '关联的备份调度ID'
  },
  
  // 父备份ID（用于增量备份）
  parentBackupId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '父备份ID（增量备份基础）'
  },
  
  // 过期时间
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '备份过期时间'
  },
  
  // 是否已验证
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已验证完整性'
  },
  
  // 验证时间
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '验证时间'
  },
  
  // 验证结果
  verificationResult: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '验证结果详情'
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '备份标签',
    defaultValue: []
  },
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'backup_jobs',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['backup_type']
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
      fields: ['storage_backend']
    },
    {
      fields: ['triggered_by']
    },
    {
      fields: ['schedule_id']
    },
    {
      fields: ['parent_backup_id']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['verified']
    }
  ],
  comment: '备份任务记录表'
});

/**
 * 关联关系
 */
BackupJob.associate = function(models) {
  // 触发者关联
  BackupJob.belongsTo(models.User, {
    foreignKey: 'triggeredBy',
    as: 'triggeredByUser',
    constraints: false
  });
  
  // 备份调度关联
  BackupJob.belongsTo(models.BackupSchedule, {
    foreignKey: 'scheduleId',
    as: 'schedule',
    constraints: false
  });
  
  // 父备份关联（增量备份）
  BackupJob.belongsTo(BackupJob, {
    foreignKey: 'parentBackupId',
    as: 'parentBackup'
  });
  
  // 子备份关联
  BackupJob.hasMany(BackupJob, {
    foreignKey: 'parentBackupId',
    as: 'childBackups'
  });
  
  // 恢复操作关联
  BackupJob.hasMany(models.RestoreOperation, {
    foreignKey: 'backupJobId',
    as: 'restoreOperations'
  });
};

/**
 * 钩子函数
 */
BackupJob.addHook('beforeUpdate', (job, options) => {
  // 自动更新持续时间
  if (job.changed('completedAt') && job.startedAt && job.completedAt) {
    const duration = Math.floor((new Date(job.completedAt) - new Date(job.startedAt)) / 1000);
    job.duration = duration;
  }
  
  // 自动计算压缩比率
  if (job.changed('compressedSize') && job.fileSize && job.compressedSize) {
    const ratio = ((job.fileSize - job.compressedSize) / job.fileSize) * 100;
    job.compressionRatio = Math.round(ratio * 100) / 100;
  }
  
  // 自动设置过期时间
  if (job.changed('completedAt') && job.completedAt && job.backupConfig?.retentionDays) {
    const expiryDate = new Date(job.completedAt);
    expiryDate.setDate(expiryDate.getDate() + job.backupConfig.retentionDays);
    job.expiresAt = expiryDate;
  }
});

/**
 * 静态方法
 */

// 获取活跃备份任务
BackupJob.getActiveJobs = async function() {
  return await this.findAll({
    where: {
      status: ['pending', 'running']
    },
    order: [['scheduledAt', 'ASC']]
  });
};

// 获取备份统计
BackupJob.getStatistics = async function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'status',
      'backupType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize'],
      [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
    ],
    group: ['status', 'backupType'],
    raw: true
  });
  
  return this.formatStatistics(stats);
};

// 获取过期备份
BackupJob.getExpiredBackups = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      status: 'completed',
      expiresAt: {
        [sequelize.Op.lt]: now
      }
    },
    order: [['expiresAt', 'ASC']]
  });
};

// 清理过期备份
BackupJob.cleanupExpiredBackups = async function() {
  const expiredBackups = await this.getExpiredBackups();
  let cleanedCount = 0;
  
  for (const backup of expiredBackups) {
    try {
      await backup.cleanup();
      await backup.update({ status: 'expired' });
      cleanedCount++;
    } catch (error) {
      console.error(`清理过期备份失败 [${backup.id}]:`, error);
    }
  }
  
  return cleanedCount;
};

// 获取存储使用情况
BackupJob.getStorageUsage = async function() {
  const usage = await this.findAll({
    where: {
      status: 'completed'
    },
    attributes: [
      'storageBackend',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize'],
      [sequelize.fn('SUM', sequelize.col('compressedSize')), 'compressedSize']
    ],
    group: ['storageBackend'],
    raw: true
  });
  
  return usage.map(item => ({
    backend: item.storageBackend,
    count: parseInt(item.count),
    totalSize: parseInt(item.totalSize || 0),
    compressedSize: parseInt(item.compressedSize || 0),
    compressionRatio: item.totalSize > 0 
      ? Math.round(((item.totalSize - item.compressedSize) / item.totalSize) * 100)
      : 0
  }));
};

// 格式化统计数据
BackupJob.formatStatistics = function(rawStats) {
  const formatted = {
    byStatus: {},
    byType: {},
    totals: {
      count: 0,
      totalSize: 0,
      avgDuration: 0
    }
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    const totalSize = parseInt(stat.totalSize || 0);
    const avgDuration = parseFloat(stat.avgDuration || 0);
    
    formatted.byStatus[stat.status] = (formatted.byStatus[stat.status] || 0) + count;
    formatted.byType[stat.backupType] = (formatted.byType[stat.backupType] || 0) + count;
    
    formatted.totals.count += count;
    formatted.totals.totalSize += totalSize;
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

// 开始备份
BackupJob.prototype.start = async function() {
  this.status = 'running';
  this.startedAt = new Date();
  this.progress = 0;
  this.currentOperation = 'Initializing backup...';
  return await this.save();
};

// 完成备份
BackupJob.prototype.complete = async function(result = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress = 100;
  this.currentOperation = 'Backup completed';
  
  if (result.filePath) this.filePath = result.filePath;
  if (result.fileSize) this.fileSize = result.fileSize;
  if (result.fileCount) this.fileCount = result.fileCount;
  if (result.compressedSize) this.compressedSize = result.compressedSize;
  if (result.checksum) this.checksum = result.checksum;
  if (result.statistics) this.statistics = { ...this.statistics, ...result.statistics };
  
  return await this.save();
};

// 标记失败
BackupJob.prototype.fail = async function(error) {
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

// 取消备份
BackupJob.prototype.cancel = async function() {
  if (this.status === 'pending' || this.status === 'running') {
    this.status = 'cancelled';
    this.completedAt = new Date();
    this.currentOperation = 'Backup cancelled';
    return await this.save();
  }
  throw new Error('Cannot cancel backup in current status');
};

// 更新进度
BackupJob.prototype.updateProgress = async function(progress, operation = null) {
  this.progress = Math.min(100, Math.max(0, progress));
  if (operation) {
    this.currentOperation = operation;
  }
  return await this.save();
};

// 验证备份完整性
BackupJob.prototype.verify = async function() {
  if (this.status !== 'completed') {
    throw new Error('Can only verify completed backups');
  }
  
  // 这里应该实现实际的验证逻辑
  this.verified = true;
  this.verifiedAt = new Date();
  this.verificationResult = {
    checksumValid: true,
    filesCount: this.fileCount,
    timestamp: new Date().toISOString()
  };
  
  return await this.save();
};

// 清理备份文件
BackupJob.prototype.cleanup = async function() {
  // 这里应该实现实际的文件清理逻辑
  return true;
};

// 获取备份摘要
BackupJob.prototype.getSummary = function() {
  return {
    id: this.id,
    name: this.name,
    type: this.backupType,
    status: this.status,
    size: this.fileSize,
    compressedSize: this.compressedSize,
    compressionRatio: this.compressionRatio,
    duration: this.duration,
    progress: this.progress,
    scheduled: this.scheduledAt,
    started: this.startedAt,
    completed: this.completedAt,
    expires: this.expiresAt,
    verified: this.verified,
    storage: this.storageBackend,
    encrypted: this.encrypted
  };
};

module.exports = BackupJob;