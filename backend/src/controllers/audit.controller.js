const auditLoggingService = require('../services/auditLogging.service');
const securityMonitoringService = require('../services/securityMonitoring.service');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');
const Joi = require('joi');

/**
 * 转换为CSV格式
 */
function convertToCSV(data) {
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

/**
 * 搜索审计日志
 */
const searchAuditLogs = asyncHandler(async (req, res) => {
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
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // 权限检查
  if (value.includeDecrypted && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '没有权限查看解密数据' });
  }

  const results = await auditLoggingService.searchLogs(value);

  // 记录审计日志查询
  await auditLoggingService.logUserAction('search', req.user.id, 'AuditLog', null,
    '搜索审计日志', {
      request: req,
      changes: { searchParams: value }
    });

  success(res, {
    logs: results.rows,
    pagination: {
      total: results.count,
      limit: value.limit,
      offset: value.offset,
      pages: Math.ceil(results.count / value.limit)
    }
  }, '搜索审计日志成功');
});

/**
 * 获取用户操作历史
 */
const getUserHistory = asyncHandler(async (req, res) => {
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
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // 权限检查：只能查看自己的历史或管理员可以查看所有人的
  if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '没有权限查看该用户历史' });
  }

  const results = await auditLoggingService.getUserHistory(parseInt(userId), value);

  success(res, {
    history: results.rows,
    pagination: {
      total: results.count,
      limit: value.limit,
      offset: value.offset,
      pages: Math.ceil(results.count / value.limit)
    }
  }, '获取用户历史成功');
});

/**
 * 获取安全统计
 */
const getSecurityStatistics = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    timeRange: Joi.number().integer().min(1).max(168).default(24) // 最大7天
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const statistics = await auditLoggingService.getSecurityStatistics(value.timeRange);

  success(res, statistics, '获取安全统计成功');
});

/**
 * 生成合规性报告
 */
const generateComplianceReport = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    reportType: Joi.string().valid('data_access', 'admin_actions', 'security_events', 'user_privacy').required(),
    timeRange: Joi.number().integer().min(1).max(365).default(30),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // 权限检查
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '没有权限生成合规性报告' });
  }

  const report = await auditLoggingService.generateComplianceReport(
    value.reportType,
    value.timeRange
  );

  // 根据格式返回不同的响应
  if (value.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${value.reportType}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(convertToCSV(report.data));
  } else if (value.format === 'pdf') {
    // 生成PDF报告 (需要集成PDF生成库)
    res.status(501).json({ success: false, message: 'PDF格式暂不支持' });
  } else {
    success(res, report, '生成合规性报告成功');
  }
});

/**
 * 验证数据完整性
 */
const verifyDataIntegrity = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    logId: Joi.string().uuid().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // 权限检查
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '没有权限执行数据完整性验证' });
  }

  const results = await auditLoggingService.verifyDataIntegrity(value.logId);

  const status = results.integrityInvalid === 0 ? 'success' : 'warning';
  const message = results.integrityInvalid === 0 ?
    '数据完整性验证通过' :
    `发现 ${results.integrityInvalid} 条数据完整性问题`;

  res.json({ success: status === 'success', message, data: results });
});

/**
 * 获取安全事件列表
 */
const getSecurityEvents = asyncHandler(async (req, res) => {
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
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const results = await securityMonitoringService.searchEvents(value);

  success(res, {
    events: results.rows,
    pagination: {
      total: results.count,
      limit: value.limit,
      offset: value.offset,
      pages: Math.ceil(results.count / value.limit)
    }
  }, '获取安全事件成功');
});

/**
 * 获取高优先级安全事件
 */
const getHighPriorityEvents = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const events = await securityMonitoringService.getHighPriorityEvents(value.limit);

  success(res, { events, count: events.length }, '获取高优先级事件成功');
});

/**
 * 获取操作趋势分析
 */
const getOperationTrends = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    days: Joi.number().integer().min(1).max(90).default(7),
    groupBy: Joi.string().valid('action', 'entity', 'user', 'result').default('action')
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const trends = await auditLoggingService.getOperationTrends(value.days);

  success(res, { trends, days: value.days, groupBy: value.groupBy }, '获取操作趋势成功');
});

/**
 * 导出审计数据
 */
const exportAuditData = asyncHandler(async (req, res) => {
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
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // 权限检查
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '没有权限导出审计数据' });
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
    res.send(convertToCSV(results.rows));
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(results.rows);
  }
});

module.exports = {
  searchAuditLogs,
  getUserHistory,
  getSecurityStatistics,
  generateComplianceReport,
  verifyDataIntegrity,
  getSecurityEvents,
  getHighPriorityEvents,
  getOperationTrends,
  exportAuditData
};
