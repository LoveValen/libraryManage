const { DataTypes } = require('sequelize');

/**
 * 审计日志模型 - 记录系统中所有重要操作的审计信息
 */
module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    // 基本信息
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '审计日志唯一标识'
    },
    
    // 操作信息
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '操作类型 (CREATE/READ/UPDATE/DELETE/LOGIN/LOGOUT等)'
    },
    
    entity: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '操作的实体类型 (User/Book/Borrow等)'
    },
    
    entityId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '操作的实体ID'
    },
    
    // 用户信息
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '执行操作的用户ID'
    },
    
    userRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '用户角色'
    },
    
    // 操作详情
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '操作描述'
    },
    
    // 变更数据 (记录具体的变更内容)
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '变更内容详情'
    },
    
    // 操作前数据
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '操作前的数据值'
    },
    
    // 操作后数据
    newValues: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '操作后的数据值'
    },
    
    // 请求信息
    requestInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '请求相关信息',
      validate: {
        isValidRequestInfo(value) {
          if (value && typeof value !== 'object') {
            throw new Error('请求信息必须是对象格式');
          }
        }
      }
    },
    
    // 会话信息
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '会话ID'
    },
    
    // 网络信息
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP地址 (支持IPv6)'
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理信息'
    },
    
    // 地理位置信息
    location: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '地理位置信息'
    },
    
    // 结果信息
    result: {
      type: DataTypes.ENUM('success', 'failure', 'partial', 'error'),
      allowNull: false,
      defaultValue: 'success',
      comment: '操作结果'
    },
    
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '错误详情 (如果操作失败)'
    },
    
    // 风险评估
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'low',
      comment: '风险等级'
    },
    
    securityFlags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '安全标记 (suspicious_ip, unusual_time等)'
    },
    
    // 合规性信息
    complianceFlags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '合规性标记 (gdpr, hipaa等)'
    },
    
    retentionPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2555, // 7年保存期
      comment: '保留天数'
    },
    
    // 系统信息
    applicationVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '应用版本'
    },
    
    correlationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '关联ID (用于跟踪相关操作)'
    },
    
    parentLogId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '父日志ID (用于操作链跟踪)'
    },
    
    // 性能信息
    executionTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '执行时间 (毫秒)'
    },
    
    resourceUsage: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '资源使用情况'
    },
    
    // 数据保护
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已加密敏感数据'
    },
    
    checksumHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '数据完整性校验哈希'
    },
    
    // 归档状态
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '归档时间'
    },
    
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已归档'
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    paranoid: false, // 审计日志不支持软删除
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['entity']
      },
      {
        fields: ['entity_id']
      },
      {
        fields: ['risk_level']
      },
      {
        fields: ['result']
      },
      {
        fields: ['ip_address']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['correlation_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['is_archived']
      },
      {
        name: 'audit_logs_comprehensive_search',
        fields: ['user_id', 'action', 'entity', 'created_at']
      },
      {
        name: 'audit_logs_security_monitoring',
        fields: ['risk_level', 'ip_address', 'created_at']
      }
    ],
    comment: '系统审计日志表'
  });

  // 静态方法
  
  /**
   * 创建审计日志记录
   */
  AuditLog.createLog = async function(logData) {
    try {
      // 自动计算数据完整性哈希
      if (logData.changes || logData.oldValues || logData.newValues) {
        const crypto = require('crypto');
        const dataToHash = JSON.stringify({
          changes: logData.changes,
          oldValues: logData.oldValues,
          newValues: logData.newValues
        });
        logData.checksumHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
      }
      
      // 自动设置应用版本
      if (!logData.applicationVersion) {
        logData.applicationVersion = process.env.APP_VERSION || '1.0.0';
      }
      
      return await this.create(logData);
    } catch (error) {
      console.error('创建审计日志失败:', error);
      throw error;
    }
  };
  
  /**
   * 批量创建审计日志
   */
  AuditLog.createBatchLogs = async function(logDataArray) {
    try {
      const logs = logDataArray.map(logData => ({
        ...logData,
        applicationVersion: logData.applicationVersion || process.env.APP_VERSION || '1.0.0'
      }));
      
      return await this.bulkCreate(logs);
    } catch (error) {
      console.error('批量创建审计日志失败:', error);
      throw error;
    }
  };
  
  /**
   * 获取用户操作历史
   */
  AuditLog.getUserHistory = async function(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      startDate = null,
      endDate = null,
      actions = null,
      entities = null
    } = options;
    
    const whereConditions = { userId };
    
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt[sequelize.Op.gte] = startDate;
      if (endDate) whereConditions.createdAt[sequelize.Op.lte] = endDate;
    }
    
    if (actions && actions.length > 0) {
      whereConditions.action = { [sequelize.Op.in]: actions };
    }
    
    if (entities && entities.length > 0) {
      whereConditions.entity = { [sequelize.Op.in]: entities };
    }
    
    return await this.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
  };
  
  /**
   * 获取安全事件统计
   */
  AuditLog.getSecurityStats = async function(timeRange = 24) {
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const [totalLogs, highRiskLogs, failedOperations, uniqueIPs, suspiciousActivities] = await Promise.all([
      // 总日志数
      this.count({
        where: { createdAt: { [sequelize.Op.gte]: since } }
      }),
      
      // 高风险操作
      this.count({
        where: {
          createdAt: { [sequelize.Op.gte]: since },
          riskLevel: { [sequelize.Op.in]: ['high', 'critical'] }
        }
      }),
      
      // 失败操作
      this.count({
        where: {
          createdAt: { [sequelize.Op.gte]: since },
          result: { [sequelize.Op.in]: ['failure', 'error'] }
        }
      }),
      
      // 独特IP数量
      this.count({
        where: { createdAt: { [sequelize.Op.gte]: since } },
        distinct: true,
        col: 'ipAddress'
      }),
      
      // 可疑活动 (有安全标记的)
      this.count({
        where: {
          createdAt: { [sequelize.Op.gte]: since },
          securityFlags: { [sequelize.Op.ne]: [] }
        }
      })
    ]);
    
    return {
      totalLogs,
      highRiskLogs,
      failedOperations,
      uniqueIPs,
      suspiciousActivities,
      period: `${timeRange} hours`,
      calculatedAt: new Date()
    };
  };
  
  /**
   * 获取操作趋势分析
   */
  AuditLog.getOperationTrends = async function(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const trends = await this.findAll({
      where: {
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        'action',
        'result',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('createdAt')),
        'action',
        'result'
      ],
      order: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']
      ],
      raw: true
    });
    
    return this.formatTrendData(trends, days);
  };
  
  /**
   * 搜索审计日志
   */
  AuditLog.searchLogs = async function(searchParams) {
    const {
      keyword = '',
      userId = null,
      action = null,
      entity = null,
      riskLevel = null,
      result = null,
      ipAddress = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = searchParams;
    
    const whereConditions = {};
    
    // 关键词搜索
    if (keyword) {
      whereConditions[sequelize.Op.or] = [
        { description: { [sequelize.Op.iLike]: `%${keyword}%` } },
        { entity: { [sequelize.Op.iLike]: `%${keyword}%` } },
        { action: { [sequelize.Op.iLike]: `%${keyword}%` } }
      ];
    }
    
    // 具体字段过滤
    if (userId) whereConditions.userId = userId;
    if (action) whereConditions.action = action;
    if (entity) whereConditions.entity = entity;
    if (riskLevel) whereConditions.riskLevel = riskLevel;
    if (result) whereConditions.result = result;
    if (ipAddress) whereConditions.ipAddress = ipAddress;
    
    // 时间范围
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt[sequelize.Op.gte] = startDate;
      if (endDate) whereConditions.createdAt[sequelize.Op.lte] = endDate;
    }
    
    return await this.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
  };
  
  /**
   * 获取合规性报告数据
   */
  AuditLog.getComplianceReport = async function(reportType, timeRange) {
    const since = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    const baseQuery = {
      where: {
        createdAt: { [sequelize.Op.gte]: since }
      }
    };
    
    switch (reportType) {
      case 'data_access':
        return await this.getDataAccessReport(baseQuery);
      case 'admin_actions':
        return await this.getAdminActionsReport(baseQuery);
      case 'security_events':
        return await this.getSecurityEventsReport(baseQuery);
      case 'user_privacy':
        return await this.getUserPrivacyReport(baseQuery);
      default:
        throw new Error(`不支持的报告类型: ${reportType}`);
    }
  };
  
  /**
   * 清理过期日志
   */
  AuditLog.cleanupExpiredLogs = async function() {
    try {
      const expiredLogs = await this.findAll({
        where: {
          createdAt: {
            [sequelize.Op.lt]: sequelize.literal(`NOW() - INTERVAL '1 day' * retention_period`)
          },
          isArchived: false
        }
      });
      
      let archivedCount = 0;
      let deletedCount = 0;
      
      for (const log of expiredLogs) {
        if (log.retentionPeriod > 0) {
          // 归档而不是删除
          await log.update({
            isArchived: true,
            archivedAt: new Date()
          });
          archivedCount++;
        } else {
          // 永久删除
          await log.destroy({ force: true });
          deletedCount++;
        }
      }
      
      return { archivedCount, deletedCount };
    } catch (error) {
      console.error('清理过期日志失败:', error);
      throw error;
    }
  };
  
  // 实例方法
  
  /**
   * 验证数据完整性
   */
  AuditLog.prototype.verifyIntegrity = function() {
    if (!this.checksumHash) return true;
    
    const crypto = require('crypto');
    const dataToHash = JSON.stringify({
      changes: this.changes,
      oldValues: this.oldValues,
      newValues: this.newValues
    });
    const currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    return currentHash === this.checksumHash;
  };
  
  /**
   * 格式化显示
   */
  AuditLog.prototype.getDisplayInfo = function() {
    return {
      id: this.id,
      timestamp: this.createdAt,
      user: this.userId,
      action: `${this.action} ${this.entity}`,
      description: this.description,
      result: this.result,
      riskLevel: this.riskLevel,
      ipAddress: this.ipAddress
    };
  };
  
  /**
   * 获取相关日志
   */
  AuditLog.prototype.getRelatedLogs = async function() {
    const conditions = [];
    
    // 同一会话的日志
    if (this.sessionId) {
      conditions.push({ sessionId: this.sessionId });
    }
    
    // 同一关联ID的日志
    if (this.correlationId) {
      conditions.push({ correlationId: this.correlationId });
    }
    
    // 同一实体的日志
    if (this.entityId) {
      conditions.push({
        entity: this.entity,
        entityId: this.entityId
      });
    }
    
    if (conditions.length === 0) return [];
    
    return await AuditLog.findAll({
      where: {
        [sequelize.Op.or]: conditions,
        id: { [sequelize.Op.ne]: this.id }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
  };
  
  // 辅助方法
  AuditLog.formatTrendData = function(trends, days) {
    const dateRange = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }
    
    const formatted = {};
    dateRange.forEach(date => {
      formatted[date] = {
        total: 0,
        success: 0,
        failure: 0,
        actions: {}
      };
    });
    
    trends.forEach(trend => {
      const date = trend.date;
      if (formatted[date]) {
        formatted[date].total += parseInt(trend.count);
        formatted[date][trend.result] += parseInt(trend.count);
        formatted[date].actions[trend.action] = (formatted[date].actions[trend.action] || 0) + parseInt(trend.count);
      }
    });
    
    return formatted;
  };
  
  // 报告生成辅助方法
  AuditLog.getDataAccessReport = async function(baseQuery) {
    return await this.findAll({
      ...baseQuery,
      where: {
        ...baseQuery.where,
        action: { [sequelize.Op.in]: ['READ', 'EXPORT', 'DOWNLOAD'] }
      },
      attributes: [
        'userId',
        'entity',
        'entityId',
        'ipAddress',
        'createdAt',
        'description'
      ],
      order: [['createdAt', 'DESC']]
    });
  };
  
  AuditLog.getAdminActionsReport = async function(baseQuery) {
    return await this.findAll({
      ...baseQuery,
      where: {
        ...baseQuery.where,
        userRole: { [sequelize.Op.in]: ['admin', 'superadmin'] }
      },
      order: [['createdAt', 'DESC']]
    });
  };
  
  AuditLog.getSecurityEventsReport = async function(baseQuery) {
    return await this.findAll({
      ...baseQuery,
      where: {
        ...baseQuery.where,
        [sequelize.Op.or]: [
          { riskLevel: { [sequelize.Op.in]: ['high', 'critical'] } },
          { result: { [sequelize.Op.in]: ['failure', 'error'] } },
          { securityFlags: { [sequelize.Op.ne]: [] } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  };
  
  AuditLog.getUserPrivacyReport = async function(baseQuery) {
    return await this.findAll({
      ...baseQuery,
      where: {
        ...baseQuery.where,
        entity: 'User',
        action: { [sequelize.Op.in]: ['READ', 'UPDATE', 'DELETE', 'EXPORT'] }
      },
      order: [['createdAt', 'DESC']]
    });
  };

  return AuditLog;
};