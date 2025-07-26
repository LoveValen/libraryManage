const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

/**
 * 备份存储模型
 */
const BackupStorage = sequelize.define('BackupStorage', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 存储名称
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '存储配置名称'
  },
  
  // 存储类型
  type: {
    type: DataTypes.ENUM([
      'local',        // 本地存储
      's3',           // Amazon S3
      'azure',        // Azure Blob Storage
      'gcs',          // Google Cloud Storage
      'ftp',          // FTP服务器
      'sftp',         // SFTP服务器
      'dropbox',      // Dropbox
      'onedrive',     // OneDrive
      'webdav',       // WebDAV
      'nfs',          // Network File System
      'smb',          // Server Message Block
      'custom'        // 自定义存储
    ]),
    allowNull: false,
    comment: '存储类型'
  },
  
  // 描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '存储描述'
  },
  
  // 是否启用
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用'
  },
  
  // 是否为默认存储
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为默认存储'
  },
  
  // 连接配置
  connectionConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '连接配置参数'
  },
  
  // 认证配置
  authConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '认证配置（加密存储）'
  },
  
  // 路径配置
  pathConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '路径配置',
    defaultValue: {
      basePath: '/backups',
      createDateFolders: true,
      dateFormat: 'YYYY/MM/DD',
      fileNameTemplate: '{type}_{timestamp}_{name}'
    }
  },
  
  // 存储限制
  limits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '存储限制配置',
    defaultValue: {
      maxFileSize: null,        // 最大文件大小（字节）
      maxTotalSize: null,       // 最大总大小（字节）
      maxFiles: null,           // 最大文件数量
      allowedFileTypes: [],     // 允许的文件类型
      quotaWarningThreshold: 80 // 配额警告阈值（百分比）
    }
  },
  
  // 传输配置
  transferConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '传输配置',
    defaultValue: {
      chunkSize: 8388608,       // 分块大小（8MB）
      maxRetries: 3,            // 最大重试次数
      timeout: 300,             // 超时时间（秒）
      parallelUploads: 1,       // 并行上传数
      enableResume: true,       // 启用断点续传
      compressionLevel: 6,      // 压缩级别
      enableDeduplication: false // 启用去重
    }
  },
  
  // 加密配置
  encryptionConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '加密配置',
    defaultValue: {
      enabled: false,
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000
    }
  },
  
  // 保留策略
  retentionPolicy: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '保留策略',
    defaultValue: {
      enabled: true,
      defaultRetentionDays: 30,
      maxVersions: 10,
      deleteExpiredFiles: true,
      archiveBeforeDelete: false
    }
  },
  
  // 监控配置
  monitoringConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '监控配置',
    defaultValue: {
      enableHealthCheck: true,
      healthCheckInterval: 300,
      alertOnFailure: true,
      trackUsageStats: true,
      logTransfers: true
    }
  },
  
  // 连接状态
  connectionStatus: {
    type: DataTypes.ENUM([
      'connected',      // 已连接
      'disconnected',   // 已断开
      'error',          // 错误
      'testing',        // 测试中
      'unknown'         // 未知
    ]),
    allowNull: false,
    defaultValue: 'unknown',
    comment: '连接状态'
  },
  
  // 最后连接时间
  lastConnectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后连接时间'
  },
  
  // 最后连接错误
  lastConnectionError: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '最后连接错误信息'
  },
  
  // 使用统计
  usageStats: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '使用统计信息',
    defaultValue: {
      totalFiles: 0,
      totalSize: 0,
      lastUpload: null,
      lastDownload: null,
      uploadCount: 0,
      downloadCount: 0,
      errorCount: 0
    }
  },
  
  // 性能指标
  performanceMetrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '性能指标',
    defaultValue: {
      avgUploadSpeed: 0,
      avgDownloadSpeed: 0,
      avgLatency: 0,
      successRate: 100,
      lastMeasured: null
    }
  },
  
  // 配额信息
  quotaInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '配额信息',
    defaultValue: {
      totalQuota: null,
      usedQuota: 0,
      availableQuota: null,
      lastChecked: null
    }
  },
  
  // 标签
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '存储标签',
    defaultValue: []
  },
  
  // 优先级
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '存储优先级（1-10）'
  },
  
  // 环境
  environment: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'production',
    comment: '使用环境'
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
  
  // 元数据
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'backup_storages',
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
      fields: ['connection_status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['environment']
    },
    {
      fields: ['created_by']
    }
  ],
  comment: '备份存储配置表'
});

/**
 * 关联关系
 */
BackupStorage.associate = function(models) {
  // 创建者关联
  BackupStorage.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator',
    constraints: false
  });
  
  // 更新者关联
  BackupStorage.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater',
    constraints: false
  });
};

/**
 * 钩子函数
 */
BackupStorage.addHook('beforeSave', async (storage, options) => {
  // 确保只有一个默认存储
  if (storage.isDefault && storage.changed('isDefault')) {
    await BackupStorage.update(
      { isDefault: false },
      { 
        where: { 
          isDefault: true,
          id: { [sequelize.Op.ne]: storage.id }
        }
      }
    );
  }
  
  // 加密认证配置
  if (storage.changed('authConfig') && storage.authConfig) {
    // 这里应该实现实际的加密逻辑
    // storage.authConfig = encrypt(storage.authConfig);
  }
});

BackupStorage.addHook('afterFind', (storages, options) => {
  // 解密认证配置
  const decrypt = (encrypted) => {
    // 这里应该实现实际的解密逻辑
    return encrypted;
  };
  
  if (Array.isArray(storages)) {
    storages.forEach(storage => {
      if (storage.authConfig) {
        storage.authConfig = decrypt(storage.authConfig);
      }
    });
  } else if (storages && storages.authConfig) {
    storages.authConfig = decrypt(storages.authConfig);
  }
});

/**
 * 静态方法
 */

// 获取默认存储
BackupStorage.getDefault = async function() {
  return await this.findOne({
    where: {
      isDefault: true,
      enabled: true
    }
  });
};

// 获取可用存储
BackupStorage.getAvailable = async function(type = null) {
  const where = {
    enabled: true,
    connectionStatus: ['connected', 'unknown']
  };
  
  if (type) {
    where.type = type;
  }
  
  return await this.findAll({
    where,
    order: [
      ['priority', 'DESC'],
      ['name', 'ASC']
    ]
  });
};

// 获取存储统计
BackupStorage.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      'type',
      'connectionStatus',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.literal("usage_stats->>'totalSize'")), 'totalSize'],
      [sequelize.fn('AVG', sequelize.literal("performance_metrics->>'successRate'")), 'avgSuccessRate']
    ],
    group: ['type', 'connectionStatus'],
    raw: true
  });
  
  return this.formatStatistics(stats);
};

// 格式化统计数据
BackupStorage.formatStatistics = function(rawStats) {
  const formatted = {
    byType: {},
    byStatus: {},
    totals: {
      count: 0,
      totalSize: 0,
      avgSuccessRate: 0
    }
  };
  
  rawStats.forEach(stat => {
    const count = parseInt(stat.count);
    const totalSize = parseInt(stat.totalSize || 0);
    
    formatted.byType[stat.type] = (formatted.byType[stat.type] || 0) + count;
    formatted.byStatus[stat.connectionStatus] = (formatted.byStatus[stat.connectionStatus] || 0) + count;
    
    formatted.totals.count += count;
    formatted.totals.totalSize += totalSize;
  });
  
  return formatted;
};

// 创建默认存储配置
BackupStorage.createDefaultStorages = async function() {
  const defaultStorages = [
    {
      name: 'local_primary',
      type: 'local',
      description: '本地主存储',
      isDefault: true,
      connectionConfig: {
        path: '/var/backups/library',
        createDirectories: true,
        permissions: '0755'
      },
      pathConfig: {
        basePath: '/var/backups/library',
        createDateFolders: true,
        dateFormat: 'YYYY/MM/DD',
        fileNameTemplate: '{type}_{timestamp}_{name}.{ext}'
      },
      limits: {
        maxFileSize: 10737418240, // 10GB
        maxTotalSize: 107374182400, // 100GB
        quotaWarningThreshold: 85
      },
      priority: 10,
      tags: ['local', 'primary', 'fast']
    },
    {
      name: 'local_secondary',
      type: 'local',
      description: '本地备用存储',
      enabled: false,
      connectionConfig: {
        path: '/backup/library',
        createDirectories: true,
        permissions: '0755'
      },
      priority: 8,
      tags: ['local', 'secondary', 'backup']
    }
  ];
  
  const created = [];
  for (const storageData of defaultStorages) {
    const [storage, wasCreated] = await this.findOrCreate({
      where: { name: storageData.name },
      defaults: storageData
    });
    
    if (wasCreated) {
      created.push(storage);
    }
  }
  
  return created;
};

/**
 * 实例方法
 */

// 测试连接
BackupStorage.prototype.testConnection = async function() {
  try {
    this.connectionStatus = 'testing';
    await this.save();
    
    // 根据存储类型执行相应的连接测试
    const result = await this.performConnectionTest();
    
    if (result.success) {
      this.connectionStatus = 'connected';
      this.lastConnectedAt = new Date();
      this.lastConnectionError = null;
    } else {
      this.connectionStatus = 'error';
      this.lastConnectionError = result.error;
    }
    
    await this.save();
    return result;
    
  } catch (error) {
    this.connectionStatus = 'error';
    this.lastConnectionError = error.message;
    await this.save();
    
    return {
      success: false,
      error: error.message
    };
  }
};

// 执行连接测试
BackupStorage.prototype.performConnectionTest = async function() {
  switch (this.type) {
    case 'local':
      return await this.testLocalConnection();
    case 's3':
      return await this.testS3Connection();
    case 'ftp':
      return await this.testFtpConnection();
    case 'sftp':
      return await this.testSftpConnection();
    default:
      return {
        success: false,
        error: `Connection test not implemented for type: ${this.type}`
      };
  }
};

// 测试本地连接
BackupStorage.prototype.testLocalConnection = async function() {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const testPath = this.connectionConfig.path;
    
    // 检查目录是否存在
    try {
      await fs.access(testPath);
    } catch (error) {
      if (this.connectionConfig.createDirectories) {
        await fs.mkdir(testPath, { recursive: true });
      } else {
        throw new Error(`Directory does not exist: ${testPath}`);
      }
    }
    
    // 测试写入权限
    const testFile = path.join(testPath, '.backup_test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 测试S3连接
BackupStorage.prototype.testS3Connection = async function() {
  // 实现S3连接测试
  return {
    success: false,
    error: 'S3 connection test not implemented'
  };
};

// 测试FTP连接
BackupStorage.prototype.testFtpConnection = async function() {
  // 实现FTP连接测试
  return {
    success: false,
    error: 'FTP connection test not implemented'
  };
};

// 测试SFTP连接
BackupStorage.prototype.testSftpConnection = async function() {
  // 实现SFTP连接测试
  return {
    success: false,
    error: 'SFTP connection test not implemented'
  };
};

// 更新使用统计
BackupStorage.prototype.updateUsageStats = async function(operation, size = 0) {
  const stats = this.usageStats || {};
  const now = new Date();
  
  switch (operation) {
    case 'upload':
      stats.uploadCount = (stats.uploadCount || 0) + 1;
      stats.totalFiles = (stats.totalFiles || 0) + 1;
      stats.totalSize = (stats.totalSize || 0) + size;
      stats.lastUpload = now;
      break;
      
    case 'download':
      stats.downloadCount = (stats.downloadCount || 0) + 1;
      stats.lastDownload = now;
      break;
      
    case 'error':
      stats.errorCount = (stats.errorCount || 0) + 1;
      break;
  }
  
  this.usageStats = stats;
  return await this.save();
};

// 更新性能指标
BackupStorage.prototype.updatePerformanceMetrics = async function(metrics) {
  const current = this.performanceMetrics || {};
  
  this.performanceMetrics = {
    ...current,
    ...metrics,
    lastMeasured: new Date()
  };
  
  return await this.save();
};

// 检查配额
BackupStorage.prototype.checkQuota = async function() {
  if (!this.limits.maxTotalSize) {
    return { withinQuota: true };
  }
  
  const currentSize = this.usageStats?.totalSize || 0;
  const maxSize = this.limits.maxTotalSize;
  const usagePercentage = (currentSize / maxSize) * 100;
  
  return {
    withinQuota: currentSize < maxSize,
    usagePercentage,
    currentSize,
    maxSize,
    availableSize: maxSize - currentSize,
    warningThreshold: this.limits.quotaWarningThreshold,
    needsWarning: usagePercentage >= this.limits.quotaWarningThreshold
  };
};

// 清理过期文件
BackupStorage.prototype.cleanupExpiredFiles = async function() {
  if (!this.retentionPolicy?.enabled) {
    return { cleaned: 0 };
  }
  
  // 实现具体的清理逻辑
  // 这里应该根据存储类型和保留策略清理过期文件
  
  return { cleaned: 0 };
};

// 获取存储信息
BackupStorage.prototype.getStorageInfo = async function() {
  const quota = await this.checkQuota();
  
  return {
    id: this.id,
    name: this.name,
    type: this.type,
    enabled: this.enabled,
    isDefault: this.isDefault,
    connectionStatus: this.connectionStatus,
    lastConnected: this.lastConnectedAt,
    quota,
    usageStats: this.usageStats,
    performanceMetrics: this.performanceMetrics,
    priority: this.priority,
    tags: this.tags
  };
};

// 设置为默认存储
BackupStorage.prototype.setAsDefault = async function() {
  // 清除其他默认存储
  await BackupStorage.update(
    { isDefault: false },
    { where: { isDefault: true } }
  );
  
  // 设置当前为默认
  this.isDefault = true;
  return await this.save();
};

// 克隆存储配置
BackupStorage.prototype.clone = async function(newName, userId = null) {
  const cloneData = this.toJSON();
  delete cloneData.id;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;
  delete cloneData.deletedAt;
  delete cloneData.connectionStatus;
  delete cloneData.lastConnectedAt;
  delete cloneData.lastConnectionError;
  delete cloneData.usageStats;
  delete cloneData.performanceMetrics;
  delete cloneData.quotaInfo;
  
  cloneData.name = newName;
  cloneData.isDefault = false;
  cloneData.enabled = false;
  cloneData.createdBy = userId;
  
  return await BackupStorage.create(cloneData);
};

module.exports = BackupStorage;