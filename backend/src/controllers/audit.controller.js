const auditLoggingService = require('../services/auditLogging.service');
const securityMonitoringService = require('../services/securityMonitoring.service');
const { logger } = require('../utils/logger');
const { formatResponse } = require('../utils/response');
const Joi = require('joi');

/**
 * 审计控制器 - 提供审计日志和安全监控的API接口
 */
class AuditController {
  /**
   * 搜索审计日志
   */
  async searchAuditLogs(req, res) {
    try {
      const schema = Joi.object({
        keyword: Joi.string().allow('').max(200).default(''),
        userId: Joi.number().integer().positive().optional(),
        action: Joi.string().max(100).optional(),
        entity: Joi.string().max(100).optional(),
        riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
        result: Joi.string().valid('success', 'failure', 'partial', 'error').optional(),
        ipAddress: Joi.string().ip().optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0),
        includeDecrypted: Joi.boolean().default(false)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查
      if (value.includeDecrypted && req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '没有权限查看解密数据'));
      }

      const results = await auditLoggingService.searchLogs(value);

      // 记录审计日志查询
      await auditLoggingService.logUserAction('search', req.user.id, 'AuditLog', null, 
        '搜索审计日志', {
          request: req,
          changes: { searchParams: value }
        });

      res.json(formatResponse(true, '搜索审计日志成功', {
        logs: results.rows,
        pagination: {
          total: results.count,
          limit: value.limit,
          offset: value.offset,
          pages: Math.ceil(results.count / value.limit)
        }
      }));
    } catch (error) {
      logger.error('搜索审计日志失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取用户操作历史
   */
  async getUserHistory(req, res) {
    try {
      const { userId } = req.params;
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        actions: Joi.array().items(Joi.string()).optional(),
        entities: Joi.array().items(Joi.string()).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查：只能查看自己的历史或管理员可以查看所有人的
      if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '没有权限查看该用户历史'));
      }

      const results = await auditLoggingService.getUserHistory(parseInt(userId), value);

      res.json(formatResponse(true, '获取用户历史成功', {
        history: results.rows,
        pagination: {
          total: results.count,
          limit: value.limit,
          offset: value.offset,
          pages: Math.ceil(results.count / value.limit)
        }
      }));
    } catch (error) {
      logger.error('获取用户历史失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取安全统计
   */
  async getSecurityStatistics(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(168).default(24) // 最大7天
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const statistics = await auditLoggingService.getSecurityStatistics(value.timeRange);

      res.json(formatResponse(true, '获取安全统计成功', statistics));
    } catch (error) {
      logger.error('获取安全统计失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 生成合规性报告
   */
  async generateComplianceReport(req, res) {
    try {
      const schema = Joi.object({
        reportType: Joi.string().valid('data_access', 'admin_actions', 'security_events', 'user_privacy').required(),
        timeRange: Joi.number().integer().min(1).max(365).default(30),
        format: Joi.string().valid('json', 'csv', 'pdf').default('json')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查
      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '没有权限生成合规性报告'));
      }

      const report = await auditLoggingService.generateComplianceReport(
        value.reportType, 
        value.timeRange
      );

      // 根据格式返回不同的响应
      if (value.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${value.reportType}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(this.convertToCSV(report.data));
      } else if (value.format === 'pdf') {
        // 生成PDF报告 (需要集成PDF生成库)
        res.status(501).json(formatResponse(false, 'PDF格式暂不支持'));
      } else {
        res.json(formatResponse(true, '生成合规性报告成功', report));
      }
    } catch (error) {
      logger.error('生成合规性报告失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 验证数据完整性
   */
  async verifyDataIntegrity(req, res) {
    try {
      const schema = Joi.object({
        logId: Joi.string().uuid().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查
      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '没有权限执行数据完整性验证'));
      }

      const results = await auditLoggingService.verifyDataIntegrity(value.logId);

      const status = results.integrityInvalid === 0 ? 'success' : 'warning';
      const message = results.integrityInvalid === 0 ? 
        '数据完整性验证通过' : 
        `发现 ${results.integrityInvalid} 条数据完整性问题`;

      res.json(formatResponse(status === 'success', message, results));
    } catch (error) {
      logger.error('验证数据完整性失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取安全事件列表
   */
  async getSecurityEvents(req, res) {
    try {
      const schema = Joi.object({
        eventType: Joi.string().optional(),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
        status: Joi.string().valid('new', 'investigating', 'confirmed', 'false_positive', 'resolved', 'closed').optional(),
        assignedTo: Joi.number().integer().positive().optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const results = await securityMonitoringService.searchEvents(value);

      res.json(formatResponse(true, '获取安全事件成功', {
        events: results.rows,
        pagination: {
          total: results.count,
          limit: value.limit,
          offset: value.offset,
          pages: Math.ceil(results.count / value.limit)
        }
      }));
    } catch (error) {
      logger.error('获取安全事件失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取高优先级安全事件
   */
  async getHighPriorityEvents(req, res) {
    try {
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(50).default(20)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const events = await securityMonitoringService.getHighPriorityEvents(value.limit);

      res.json(formatResponse(true, '获取高优先级事件成功', {
        events,
        count: events.length
      }));
    } catch (error) {
      logger.error('获取高优先级事件失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 处理安全事件
   */
  async handleSecurityEvent(req, res) {
    try {
      const { eventId } = req.params;
      const schema = Joi.object({
        action: Joi.string().valid('acknowledge', 'resolve', 'false_positive', 'escalate').required(),
        note: Joi.string().max(1000).optional(),
        newSeverity: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const event = await securityMonitoringService.findByPk(eventId);
      if (!event) {
        return res.status(404).json(formatResponse(false, '安全事件不存在'));
      }

      // 权限检查
      if (req.user.role !== 'admin' && req.user.role !== 'security_analyst') {
        return res.status(403).json(formatResponse(false, '没有权限处理安全事件'));
      }

      let result;
      switch (value.action) {
        case 'acknowledge':
          result = await event.acknowledge(req.user.id);
          break;
        case 'resolve':
          result = await event.resolve(value.note || '事件已解决');
          break;
        case 'false_positive':
          result = await event.markAsFalsePositive(value.note || '标记为误报');
          break;
        case 'escalate':
          if (!value.newSeverity) {
            return res.status(400).json(formatResponse(false, '升级事件需要指定新的严重程度'));
          }
          result = await event.escalate(value.newSeverity, value.note || '事件升级');
          break;
      }

      // 记录处理操作
      await auditLoggingService.logUserAction('security_event_handled', req.user.id, 
        'SecurityEvent', eventId, `处理安全事件: ${value.action}`, {
          request: req,
          changes: { action: value.action, note: value.note, newSeverity: value.newSeverity }
        });

      res.json(formatResponse(true, '安全事件处理成功', result));
    } catch (error) {
      logger.error('处理安全事件失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取登录尝试记录
   */
  async getLoginAttempts(req, res) {
    try {
      const schema = Joi.object({
        username: Joi.string().max(100).optional(),
        ipAddress: Joi.string().ip().optional(),
        success: Joi.boolean().optional(),
        isSuspicious: Joi.boolean().optional(),
        threatDetected: Joi.boolean().optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const results = await securityMonitoringService.searchAttempts(value);

      res.json(formatResponse(true, '获取登录尝试记录成功', {
        attempts: results.rows,
        pagination: {
          total: results.count,
          limit: value.limit,
          offset: value.offset,
          pages: Math.ceil(results.count / value.limit)
        }
      }));
    } catch (error) {
      logger.error('获取登录尝试记录失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取可疑IP列表
   */
  async getSuspiciousIPs(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(168).default(24),
        limit: Joi.number().integer().min(1).max(100).default(50)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const suspiciousIPs = await securityMonitoringService.getSuspiciousIPs(value.timeRange, value.limit);

      res.json(formatResponse(true, '获取可疑IP列表成功', {
        suspiciousIPs,
        timeRange: value.timeRange,
        count: suspiciousIPs.length
      }));
    } catch (error) {
      logger.error('获取可疑IP列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取威胁情报
   */
  async getThreatIntelligence(req, res) {
    try {
      // 权限检查
      if (req.user.role !== 'admin' && req.user.role !== 'security_analyst') {
        return res.status(403).json(formatResponse(false, '没有权限查看威胁情报'));
      }

      const intelligence = await securityMonitoringService.getThreatIntelligence();

      res.json(formatResponse(true, '获取威胁情报成功', intelligence));
    } catch (error) {
      logger.error('获取威胁情报失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取安全仪表板数据
   */
  async getSecurityDashboard(req, res) {
    try {
      const schema = Joi.object({
        timeRange: Joi.number().integer().min(1).max(168).default(24)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const [securityStats, highPriorityEvents, suspiciousIPs, threatTrends] = await Promise.all([
        auditLoggingService.getSecurityStatistics(value.timeRange),
        securityMonitoringService.getHighPriorityEvents(10),
        securityMonitoringService.getSuspiciousIPs(value.timeRange, 10),
        securityMonitoringService.getThreatTrends(7)
      ]);

      const dashboard = {
        timeRange: value.timeRange,
        statistics: securityStats,
        highPriorityEvents,
        suspiciousIPs,
        threatTrends,
        lastUpdated: new Date()
      };

      res.json(formatResponse(true, '获取安全仪表板成功', dashboard));
    } catch (error) {
      logger.error('获取安全仪表板失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 手动创建安全事件
   */
  async createSecurityEvent(req, res) {
    try {
      const schema = Joi.object({
        eventType: Joi.string().valid(
          'authentication_failure', 'authorization_failure', 'suspicious_login',
          'account_lockout', 'privilege_escalation', 'data_access_violation',
          'brute_force_attack', 'sql_injection_attempt', 'xss_attempt',
          'csrf_attempt', 'malicious_file_upload', 'suspicious_user_agent',
          'rate_limit_exceeded', 'geo_location_anomaly', 'unusual_access_pattern',
          'data_exfiltration', 'configuration_change', 'system_intrusion',
          'malware_detected', 'security_policy_violation', 'other'
        ).required(),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        title: Joi.string().min(10).max(200).required(),
        description: Joi.string().min(20).max(2000).required(),
        sourceIp: Joi.string().ip().optional(),
        userId: Joi.number().integer().positive().optional(),
        affectedSystems: Joi.array().items(Joi.string()).optional(),
        threatIndicators: Joi.array().items(Joi.object()).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查
      if (req.user.role !== 'admin' && req.user.role !== 'security_analyst') {
        return res.status(403).json(formatResponse(false, '没有权限创建安全事件'));
      }

      const eventData = {
        ...value,
        detectionMethod: 'manual',
        assignedTo: req.user.id
      };

      const securityEvent = await securityMonitoringService.createEvent(eventData);

      // 记录创建操作
      await auditLoggingService.logUserAction('create', req.user.id, 'SecurityEvent', 
        securityEvent.id, '手动创建安全事件', {
          request: req,
          changes: eventData
        });

      res.status(201).json(formatResponse(true, '安全事件创建成功', securityEvent));
    } catch (error) {
      logger.error('创建安全事件失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取操作趋势分析
   */
  async getOperationTrends(req, res) {
    try {
      const schema = Joi.object({
        days: Joi.number().integer().min(1).max(90).default(7),
        groupBy: Joi.string().valid('action', 'entity', 'user', 'result').default('action')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const trends = await auditLoggingService.getOperationTrends(value.days);

      res.json(formatResponse(true, '获取操作趋势成功', {
        trends,
        days: value.days,
        groupBy: value.groupBy
      }));
    } catch (error) {
      logger.error('获取操作趋势失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 导出审计数据
   */
  async exportAuditData(req, res) {
    try {
      const schema = Joi.object({
        format: Joi.string().valid('csv', 'json').default('csv'),
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().required(),
        entities: Joi.array().items(Joi.string()).optional(),
        actions: Joi.array().items(Joi.string()).optional(),
        maxRecords: Joi.number().integer().min(1).max(10000).default(5000)
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      // 权限检查
      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '没有权限导出审计数据'));
      }

      const searchParams = {
        startDate: value.startDate,
        endDate: value.endDate,
        entities: value.entities,
        actions: value.actions,
        limit: value.maxRecords,
        offset: 0
      };

      const results = await auditLoggingService.searchLogs(searchParams);

      // 记录导出操作
      await auditLoggingService.logDataExport(req.user.id, 'AuditLog', value.format, 
        results.count, {
          request: req,
          exportedFields: ['id', 'action', 'entity', 'description', 'createdAt']
        });

      if (value.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(this.convertToCSV(results.rows));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(results.rows);
      }
    } catch (error) {
      logger.error('导出审计数据失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 工具方法：转换为CSV格式
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

module.exports = new AuditController();