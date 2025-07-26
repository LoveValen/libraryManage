const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * 审计日志服务 - 集中管理系统审计日志 (Prisma版本)
 */
class AuditLoggingService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.logQueue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5秒
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || null;
    this.compressionEnabled = true;
    this.retentionPolicies = new Map();
  }

  /**
   * 启动审计日志服务
   */
  async start() {
    try {
      logger.info('📋 启动审计日志服务...');
      
      // 初始化保留策略
      await this.initializeRetentionPolicies();
      
      // 启动批处理定时器
      this.startBatchProcessor();
      
      // 启动自动清理定时器
      this.startCleanupScheduler();
      
      // 设置事件监听
      this.setupEventListeners();
      
      this.isRunning = true;
      logger.info('✅ 审计日志服务启动成功');
    } catch (error) {
      logger.error('❌ 审计日志服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止审计日志服务
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      logger.info('🛑 停止审计日志服务...');
      
      // 清理定时器
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
      
      // 处理剩余的日志
      await this.flushLogQueue();
      
      this.isRunning = false;
      logger.info('✅ 审计日志服务已停止');
    } catch (error) {
      logger.error('❌ 停止审计日志服务失败:', error);
    }
  }

  /**
   * 记录审计日志 - 主要接口
   */
  async log(actionType, entity, entityId, description, options = {}) {
    try {
      const logData = {
        action: actionType,
        entity: entity,
        entity_id: entityId?.toString(),
        description: description,
        user_id: options.userId || null,
        user_role: options.userRole || null,
        changes: options.changes || {},
        old_values: options.oldValues || {},
        new_values: options.newValues || {},
        request_info: this.extractRequestInfo(options.request),
        session_id: options.sessionId || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        location: options.location || {},
        result: options.result || 'success',
        error_details: options.errorDetails || {},
        risk_level: this.calculateRiskLevel(actionType, entity, options),
        security_flags: this.analyzeSecurityFlags(options),
        compliance_flags: options.complianceFlags || [],
        correlation_id: options.correlationId || this.generateCorrelationId(),
        parent_log_id: options.parentLogId || null,
        execution_time: options.executionTime || null,
        resource_usage: options.resourceUsage || {}
      };

      // 加密敏感数据
      if (this.encryptionKey && this.shouldEncryptLog(logData)) {
        logData.changes = this.encryptSensitiveData(logData.changes);
        logData.old_values = this.encryptSensitiveData(logData.old_values);
        logData.new_values = this.encryptSensitiveData(logData.new_values);
        logData.is_encrypted = true;
      }

      // 添加到队列
      this.logQueue.push(logData);

      // 如果是高风险操作，立即处理
      if (logData.risk_level === 'high' || logData.risk_level === 'critical') {
        await this.processHighPriorityLog(logData);
      }

      // 触发事件
      this.emit('logCreated', logData);

      // 如果队列满了，立即处理
      if (this.logQueue.length >= this.batchSize) {
        await this.flushLogQueue();
      }

      return { success: true };
    } catch (error) {
      logger.error('记录审计日志失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 记录用户操作
   */
  async logUserAction(action, userId, entity, entityId, description, options = {}) {
    return await this.log(action, entity, entityId, description, {
      ...options,
      userId,
      userRole: options.userRole,
      riskLevel: this.getUserActionRiskLevel(action, entity)
    });
  }

  /**
   * 记录系统事件
   */
  async logSystemEvent(event, entity, description, options = {}) {
    return await this.log(event, entity, 'system', description, {
      ...options,
      userId: 0,
      userRole: 'system',
      systemGenerated: true
    });
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(event, severity, details, options = {}) {
    return await this.log(event, 'SecurityEvent', null, details.message || event, {
      ...options,
      severity,
      changes: details,
      riskLevel: severity === 'critical' ? 'critical' : 'high',
      securityFlags: [event, severity],
      alertRequired: severity === 'critical'
    });
  }

  /**
   * 搜索审计日志
   */
  async searchLogs(searchParams) {
    try {
      const {
        keyword = '',
        userId,
        action,
        entity,
        riskLevel,
        result,
        ipAddress,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
        includeDecrypted = false
      } = searchParams;

      const where = {};

      // 构建查询条件
      if (keyword) {
        where.OR = [
          { description: { contains: keyword } },
          { action: { contains: keyword } },
          { entity: { contains: keyword } }
        ];
      }

      if (userId) where.user_id = parseInt(userId);
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (riskLevel) where.risk_level = riskLevel;
      if (result) where.result = result;
      if (ipAddress) where.ip_address = ipAddress;

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [rows, count] = await Promise.all([
        prisma.audit_logs.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                real_name: true
              }
            }
          }
        }),
        prisma.audit_logs.count({ where })
      ]);

      // 解密数据（如果需要）
      if (includeDecrypted && this.encryptionKey) {
        for (const row of rows) {
          if (row.is_encrypted) {
            row.changes = this.decryptSensitiveData(row.changes);
            row.old_values = this.decryptSensitiveData(row.old_values);
            row.new_values = this.decryptSensitiveData(row.new_values);
          }
        }
      }

      return { rows, count };
    } catch (error) {
      logger.error('搜索审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户操作历史
   */
  async getUserHistory(userId, options) {
    try {
      const {
        limit = 20,
        offset = 0,
        startDate,
        endDate,
        actions = [],
        entities = []
      } = options;

      const where = {
        user_id: parseInt(userId)
      };

      if (actions.length > 0) {
        where.action = { in: actions };
      }

      if (entities.length > 0) {
        where.entity = { in: entities };
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [rows, count] = await Promise.all([
        prisma.audit_logs.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.audit_logs.count({ where })
      ]);

      return { rows, count };
    } catch (error) {
      logger.error('获取用户历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取安全统计信息
   */
  async getSecurityStatistics(timeRange = 24) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

      const [auditStats, securityEvents, loginAttempts] = await Promise.all([
        this.getSecurityStats(timeRange),
        this.getSecurityEventStats(timeRange),
        this.getLoginAttemptStats(timeRange)
      ]);

      return {
        audit: auditStats,
        security: securityEvents,
        authentication: loginAttempts,
        period: `${timeRange} hours`,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('获取安全统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取安全统计
   */
  async getSecurityStats(timeRange) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const stats = await prisma.audit_logs.groupBy({
      by: ['risk_level', 'result'],
      where: {
        created_at: { gte: cutoffTime }
      },
      _count: true
    });

    const formatted = {
      byRiskLevel: {},
      byResult: {},
      total: 0
    };

    stats.forEach(stat => {
      if (!formatted.byRiskLevel[stat.risk_level]) {
        formatted.byRiskLevel[stat.risk_level] = 0;
      }
      if (!formatted.byResult[stat.result]) {
        formatted.byResult[stat.result] = 0;
      }
      
      formatted.byRiskLevel[stat.risk_level] += stat._count;
      formatted.byResult[stat.result] += stat._count;
      formatted.total += stat._count;
    });

    return formatted;
  }

  /**
   * 获取安全事件统计
   */
  async getSecurityEventStats(timeRange) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const events = await prisma.security_events.groupBy({
      by: ['event_type', 'severity'],
      where: {
        created_at: { gte: cutoffTime }
      },
      _count: true
    });

    const formatted = {
      byType: {},
      bySeverity: {},
      total: 0
    };

    events.forEach(event => {
      if (!formatted.byType[event.event_type]) {
        formatted.byType[event.event_type] = 0;
      }
      if (!formatted.bySeverity[event.severity]) {
        formatted.bySeverity[event.severity] = 0;
      }
      
      formatted.byType[event.event_type] += event._count;
      formatted.bySeverity[event.severity] += event._count;
      formatted.total += event._count;
    });

    return formatted;
  }

  /**
   * 获取登录尝试统计
   */
  async getLoginAttemptStats(timeRange) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const attempts = await prisma.login_attempts.groupBy({
      by: ['success'],
      where: {
        created_at: { gte: cutoffTime }
      },
      _count: true
    });

    const formatted = {
      successful: 0,
      failed: 0,
      total: 0
    };

    attempts.forEach(attempt => {
      if (attempt.success) {
        formatted.successful = attempt._count;
      } else {
        formatted.failed = attempt._count;
      }
      formatted.total += attempt._count;
    });

    return formatted;
  }

  /**
   * 生成合规性报告
   */
  async generateComplianceReport(reportType, timeRange) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

      let where = {
        created_at: { gte: cutoffTime }
      };

      // 根据报告类型添加特定条件
      switch (reportType) {
        case 'security':
          where.OR = [
            { risk_level: { in: ['high', 'critical'] } },
            { security_flags: { not: [] } }
          ];
          break;
        case 'user_activity':
          where.user_id = { not: null };
          break;
        case 'system_changes':
          where.entity = { in: ['System', 'Configuration', 'Permission'] };
          break;
        case 'data_access':
          where.action = { in: ['read', 'export', 'download'] };
          break;
        default:
          // All logs for general compliance report
          break;
      }

      const report = await prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              real_name: true,
              role: true
            }
          }
        }
      });

      // 添加报告元数据
      const metadata = {
        reportType,
        timeRange,
        generatedAt: new Date(),
        generatedBy: 'system',
        reportId: this.generateReportId(),
        totalRecords: report.length
      };

      // 记录报告生成
      await this.logSystemEvent('compliance_report_generated', 'ComplianceReport', 
        `生成合规性报告: ${reportType}`, {
          changes: metadata,
          complianceFlags: ['compliance_report']
        });

      return {
        metadata,
        data: report
      };
    } catch (error) {
      logger.error('生成合规性报告失败:', error);
      throw error;
    }
  }

  /**
   * 数据完整性验证
   */
  async verifyDataIntegrity(logId = null) {
    try {
      let logs;
      
      if (logId) {
        const log = await prisma.audit_logs.findUnique({
          where: { id: parseInt(logId) }
        });
        logs = log ? [log] : [];
      } else {
        // 验证最近的1000条日志
        logs = await prisma.audit_logs.findMany({
          orderBy: { created_at: 'desc' },
          take: 1000
        });
      }

      const results = {
        totalChecked: logs.length,
        integrityValid: 0,
        integrityInvalid: 0,
        invalidLogs: []
      };

      for (const log of logs) {
        if (log && this.verifyLogIntegrity(log)) {
          results.integrityValid++;
        } else if (log) {
          results.integrityInvalid++;
          results.invalidLogs.push({
            id: log.id,
            createdAt: log.created_at,
            action: log.action,
            entity: log.entity
          });
        }
      }

      // 记录验证结果
      await this.logSystemEvent('integrity_verification', 'AuditLog', 
        `数据完整性验证完成`, {
          changes: results,
          riskLevel: results.integrityInvalid > 0 ? 'high' : 'low'
        });

      return results;
    } catch (error) {
      logger.error('数据完整性验证失败:', error);
      throw error;
    }
  }

  /**
   * 验证单条日志完整性
   */
  verifyLogIntegrity(log) {
    // 简单的完整性检查 - 可以扩展为更复杂的验证
    if (!log.id || !log.action || !log.entity || !log.created_at) {
      return false;
    }
    
    // 如果有校验和字段，可以在这里验证
    if (log.checksum) {
      const calculatedChecksum = this.calculateChecksum(log);
      return calculatedChecksum === log.checksum;
    }
    
    return true;
  }

  /**
   * 启动批处理器
   */
  startBatchProcessor() {
    this.batchTimer = setInterval(async () => {
      if (this.logQueue.length > 0) {
        await this.flushLogQueue();
      }
    }, this.flushInterval);
  }

  /**
   * 处理日志队列
   */
  async flushLogQueue() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const logsToProcess = this.logQueue.splice(0, this.batchSize);
      
      // 批量创建日志
      await this.createBatchLogs(logsToProcess);

      // 触发批处理完成事件
      this.emit('batchProcessed', logsToProcess);

      logger.debug(`✅ 处理了 ${logsToProcess.length} 条审计日志`);
    } catch (error) {
      logger.error('处理日志队列失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 批量创建日志
   */
  async createBatchLogs(logs) {
    try {
      // 添加时间戳
      const logsWithTimestamps = logs.map(log => ({
        ...log,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await prisma.audit_logs.createMany({
        data: logsWithTimestamps
      });
    } catch (error) {
      logger.error('批量创建日志失败:', error);
      throw error;
    }
  }

  /**
   * 创建单条日志
   */
  async createLog(logData) {
    try {
      return await prisma.audit_logs.create({
        data: {
          ...logData,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    } catch (error) {
      logger.error('创建日志失败:', error);
      throw error;
    }
  }

  /**
   * 处理高优先级日志
   */
  async processHighPriorityLog(logData) {
    try {
      // 立即创建高优先级日志
      await this.createLog(logData);
      
      // 如果需要告警
      if (logData.alertRequired) {
        this.emit('alertRequired', logData);
      }
    } catch (error) {
      logger.error('处理高优先级日志失败:', error);
    }
  }

  /**
   * 启动清理调度器
   */
  startCleanupScheduler() {
    // 每天执行一次清理
    this.cleanupTimer = setInterval(async () => {
      await this.performScheduledCleanup();
    }, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 执行计划清理
   */
  async performScheduledCleanup() {
    try {
      logger.info('🧹 开始执行审计日志清理...');
      
      const result = await this.cleanupExpiredLogs();
      
      logger.info(`✅ 清理完成，删除了 ${result.deleted} 条过期日志`);
      
      // 记录清理操作
      await this.logSystemEvent('audit_cleanup', 'AuditLog', 
        `清理了 ${result.deleted} 条过期日志`, {
          changes: result
        });
    } catch (error) {
      logger.error('执行计划清理失败:', error);
    }
  }

  /**
   * 清理过期日志
   */
  async cleanupExpiredLogs() {
    try {
      const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90');
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await prisma.audit_logs.deleteMany({
        where: {
          created_at: { lt: cutoffDate },
          // 保留高风险和关键日志
          risk_level: { notIn: ['high', 'critical'] }
        }
      });

      return {
        deleted: result.count,
        cutoffDate,
        retentionDays
      };
    } catch (error) {
      logger.error('清理过期日志失败:', error);
      throw error;
    }
  }

  /**
   * 初始化保留策略
   */
  async initializeRetentionPolicies() {
    // 设置不同类型日志的保留策略
    this.retentionPolicies.set('low', 30); // 30天
    this.retentionPolicies.set('medium', 90); // 90天
    this.retentionPolicies.set('high', 180); // 180天
    this.retentionPolicies.set('critical', 365); // 365天
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听系统关闭事件
    process.on('SIGINT', async () => {
      await this.stop();
    });

    process.on('SIGTERM', async () => {
      await this.stop();
    });
  }

  /**
   * 提取请求信息
   */
  extractRequestInfo(request) {
    if (!request) return {};

    return {
      method: request.method,
      path: request.path,
      query: request.query,
      headers: {
        'user-agent': request.get?.('user-agent'),
        'x-forwarded-for': request.get?.('x-forwarded-for'),
        'x-real-ip': request.get?.('x-real-ip')
      },
      ip: request.ip || request.connection?.remoteAddress
    };
  }

  /**
   * 计算风险等级
   */
  calculateRiskLevel(action, entity, options) {
    // 高风险操作
    const highRiskActions = ['delete', 'modify_permission', 'export_data', 'system_config'];
    const highRiskEntities = ['User', 'Permission', 'SystemConfig', 'SecuritySetting'];

    if (highRiskActions.includes(action) || highRiskEntities.includes(entity)) {
      return 'high';
    }

    // 关键操作
    if (options.result === 'failure' || options.securityFlags?.length > 0) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取用户操作风险等级
   */
  getUserActionRiskLevel(action, entity) {
    const riskMap = {
      'login': 'low',
      'logout': 'low',
      'view': 'low',
      'create': 'medium',
      'update': 'medium',
      'delete': 'high',
      'export': 'high',
      'import': 'high',
      'permission_change': 'critical',
      'system_config': 'critical'
    };

    return riskMap[action] || 'low';
  }

  /**
   * 分析安全标志
   */
  analyzeSecurityFlags(options) {
    const flags = [];

    if (options.ipChanged) flags.push('ip_changed');
    if (options.unusualTime) flags.push('unusual_time');
    if (options.failedAttempts > 3) flags.push('multiple_failures');
    if (options.suspiciousActivity) flags.push('suspicious_activity');

    return flags;
  }

  /**
   * 判断是否需要加密
   */
  shouldEncryptLog(logData) {
    const sensitiveEntities = ['User', 'Permission', 'Payment', 'PersonalData'];
    const sensitiveActions = ['create', 'update', 'view_sensitive'];

    return sensitiveEntities.includes(logData.entity) || 
           sensitiveActions.includes(logData.action);
  }

  /**
   * 加密敏感数据
   */
  encryptSensitiveData(data) {
    if (!this.encryptionKey || !data) return data;

    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('加密数据失败:', error);
      return data;
    }
  }

  /**
   * 解密敏感数据
   */
  decryptSensitiveData(data) {
    if (!this.encryptionKey || !data || typeof data !== 'string') return data;

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('解密数据失败:', error);
      return data;
    }
  }

  /**
   * 生成关联ID
   */
  generateCorrelationId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成报告ID
   */
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算校验和
   */
  calculateChecksum(log) {
    const data = `${log.action}|${log.entity}|${log.entity_id}|${log.user_id}|${log.created_at}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 获取操作趋势
   */
  async getOperationTrends(days = 7) {
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const startDate = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.audit_logs.groupBy({
        by: ['action'],
        where: {
          created_at: {
            gte: startDate,
            lt: endDate
          }
        },
        _count: true
      });
      
      const operations = {};
      stats.forEach(stat => {
        operations[stat.action] = stat._count;
      });
      
      trends.push({
        date: startDate.toISOString().split('T')[0],
        operations
      });
    }
    
    return trends.reverse();
  }
}

module.exports = new AuditLoggingService();