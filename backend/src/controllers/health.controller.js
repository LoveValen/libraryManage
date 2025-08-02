const healthMonitoringService = require('../services/healthMonitoring.service');
const SystemHealthService = require('../services/systemHealth.service');
const AlertService = require('../services/alert.service');
const HealthCheckTemplateService = require('../services/healthCheckTemplate.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * 健康监控控制器
 */
class HealthController {
  // 验证模式常量
  static ACKNOWLEDGE_ALERT_SCHEMA = Joi.object({
    note: Joi.string().max(500).optional()
  });

  static RESOLVE_ALERT_SCHEMA = Joi.object({
    note: Joi.string().max(500).optional()
  });

  static SUPPRESS_ALERT_SCHEMA = Joi.object({
    suppressUntil: Joi.date().min('now').required()
  });

  static BATCH_ALERT_SCHEMA = Joi.object({
    alertIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
    operation: Joi.string().valid('acknowledge', 'resolve', 'suppress').required(),
    data: Joi.object({
      note: Joi.string().max(500).optional(),
      suppressUntil: Joi.date().min('now').optional()
    }).optional()
  });

  /**
   * 解析整数参数
   * @private
   */
  _parseIntParam(value, defaultValue = null) {
    return value ? parseInt(value) : defaultValue;
  }

  /**
   * 检查管理员权限
   * @private
   */
  _checkAdminPermission(user) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以执行此操作');
    }
  }
  /**
   * 获取系统整体健康状态
   */
  getSystemHealth = asyncHandler(async (req, res) => {
    const overallHealth = await healthMonitoringService.getOverallHealthStatus();
    const latestChecks = await SystemHealthService.getLatestHealthStatus();
    
    const healthData = {
      overall: overallHealth,
      checks: latestChecks.map(check => ({
        type: check.checkType,
        name: check.checkName,
        status: check.status,
        responseTime: check.responseTime,
        lastCheck: check.checkedAt,
        error: check.errorMessage,
        details: check.details
      })),
      timestamp: new Date().toISOString()
    };
    
    success(res, healthData, '获取系统健康状态成功');
  });

  /**
   * 获取详细健康检查报告
   */
  getHealthReport = asyncHandler(async (req, res) => {
    const { timeRange = 24 } = req.query;
    
    const [overallHealth, systemMetrics, alertStats] = await Promise.all([
      healthMonitoringService.getOverallHealthStatus(),
      healthMonitoringService.getSystemMetrics(),
      healthMonitoringService.getAlertStatistics(timeRange)
    ]);
    
    const report = {
      summary: {
        overallStatus: overallHealth.overallStatus,
        totalChecks: overallHealth.totalChecks,
        statusDistribution: overallHealth.statusCounts,
        lastUpdated: overallHealth.lastUpdated
      },
      systemMetrics: {
        cpu: systemMetrics.cpu.slice(-12),
        memory: systemMetrics.memory.slice(-12),
        disk: systemMetrics.disk.slice(-12),
        lastUpdate: new Date(systemMetrics.lastUpdate).toISOString()
      },
      alerts: alertStats,
      recommendations: await this.generateHealthRecommendations(overallHealth),
      timestamp: new Date().toISOString()
    };
    
    success(res, report, '获取健康报告成功');
  });

  /**
   * 获取特定健康检查的历史趋势
   */
  async getHealthTrend(req, res) {
    try {
      const { checkType, checkName } = req.params;
      const { hours = 24 } = req.query;
      
      if (!checkType || !checkName) {
        throw new BadRequestError('检查类型和名称不能为空');
      }
      
      const [trend, stats] = await Promise.all([
        healthMonitoringService.getHealthTrend(checkType, checkName, parseInt(hours)),
        healthMonitoringService.getPerformanceStats(checkType, checkName, parseInt(hours))
      ]);
      
      res.apiSuccess({
        checkType,
        checkName,
        timeRange: `${hours}小时`,
        trend: trend.map(item => ({
          status: item.status,
          responseTime: item.responseTime,
          metrics: item.metrics,
          timestamp: item.checkedAt
        })),
        statistics: stats,
        dataPoints: trend.length
      });
    } catch (error) {
      logger.error('获取健康趋势失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 获取系统性能指标
   */
  async getSystemMetrics(req, res) {
    try {
      const { period = '1h' } = req.query;
      
      const metrics = healthMonitoringService.getSystemMetrics();
      
      // 根据期间过滤数据
      let dataPoints;
      switch (period) {
        case '1h':
          dataPoints = -60; // 最近60分钟
          break;
        case '6h':
          dataPoints = -360; // 最近6小时
          break;
        case '24h':
          dataPoints = -1440; // 最近24小时
          break;
        default:
          dataPoints = -60;
      }
      
      const filteredMetrics = {
        cpu: metrics.cpu.slice(dataPoints),
        memory: metrics.memory.slice(dataPoints),
        disk: metrics.disk.slice(dataPoints),
        period,
        lastUpdate: new Date(metrics.lastUpdate).toISOString(),
        summary: HealthController.prototype.calculateMetricsSummary.call(this, metrics, dataPoints)
      };
      
      res.apiSuccess(filteredMetrics);
    } catch (error) {
      logger.error('获取系统指标失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 获取活跃告警列表
   */
  async getActiveAlerts(req, res) {
    try {
      const { severity, alertType, page = 1, limit = 20 } = req.query;
      
      const filters = {};
      if (severity) filters.severity = severity;
      if (alertType) filters.alertType = alertType;
      
      const alerts = await AlertService.getActiveAlerts(filters);
      
      // 分页处理
      const offset = (page - 1) * limit;
      const paginatedAlerts = alerts.slice(offset, offset + limit);
      
      const alertsData = paginatedAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        status: alert.status,
        createdAt: alert.createdAt,
        acknowledgedBy: alert.acknowledger ? {
          id: alert.acknowledger.id,
          name: alert.acknowledger.real_name || alert.acknowledger.username
        } : null,
        acknowledgedAt: alert.acknowledgedAt,
        escalationLevel: alert.escalationLevel,
        occurrenceCount: alert.occurrenceCount,
        source: alert.source,
        suggestedActions: alert.suggestedActions
      }));
      
      res.apiSuccess({
        alerts: alertsData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: alerts.length,
          pages: Math.ceil(alerts.length / limit)
        },
        summary: {
          totalActive: alerts.length,
          bySeverity: HealthController.prototype.groupAlertsBySeverity.call(this, alerts),
          byType: HealthController.prototype.groupAlertsByType.call(this, alerts)
        }
      });
    } catch (error) {
      logger.error('获取活跃告警失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 获取告警统计信息
   */
  async getAlertStatistics(req, res) {
    try {
      const { timeRange = 24 } = req.query;
      
      const stats = await healthMonitoringService.getAlertStatistics(parseInt(timeRange));
      
      res.apiSuccess({
        timeRange: `${timeRange}小时`,
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('获取告警统计失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { note } = req.body;
      const userId = req.user.id;
      
      const alert = await AlertService.findById(parseInt(alertId));
      if (!alert) {
        throw new NotFoundError('告警不存在');
      }
      
      if (alert.status !== 'active') {
        throw new BadRequestError('只能确认活跃状态的告警');
      }
      
      await alert.acknowledge(userId, note);
      
      logger.info(`告警已确认: ${alert.title} [用户: ${req.user.username}]`);
      
      res.apiSuccess({
        message: '告警已确认',
        alert: {
          id: alert.id,
          status: alert.status,
          acknowledgedAt: alert.acknowledgedAt,
          acknowledgeNote: alert.acknowledgeNote
        }
      });
    } catch (error) {
      logger.error('确认告警失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { note } = req.body;
      const userId = req.user.id;
      
      const alert = await AlertService.findById(parseInt(alertId));
      if (!alert) {
        throw new NotFoundError('告警不存在');
      }
      
      if (alert.status === 'resolved') {
        throw new BadRequestError('告警已解决');
      }
      
      await alert.resolve(userId, note);
      
      logger.info(`告警已解决: ${alert.title} [用户: ${req.user.username}]`);
      
      res.apiSuccess({
        message: '告警已解决',
        alert: {
          id: alert.id,
          status: alert.status,
          resolvedAt: alert.resolvedAt,
          resolutionNote: alert.resolutionNote
        }
      });
    } catch (error) {
      logger.error('解决告警失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 抑制告警
   */
  async suppressAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { suppressUntil } = req.body;
      
      if (!suppressUntil) {
        throw new BadRequestError('抑制结束时间不能为空');
      }
      
      const alert = await AlertService.findById(parseInt(alertId));
      if (!alert) {
        throw new NotFoundError('告警不存在');
      }
      
      await alert.suppress(new Date(suppressUntil));
      
      logger.info(`告警已抑制: ${alert.title} [到: ${suppressUntil}]`);
      
      res.apiSuccess({
        message: '告警已抑制',
        alert: {
          id: alert.id,
          status: alert.status,
          suppressedUntil: alert.suppressedUntil
        }
      });
    } catch (error) {
      logger.error('抑制告警失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 批量操作告警
   */
  async batchOperateAlerts(req, res) {
    try {
      const { alertIds, operation, data = {} } = req.body;
      const userId = req.user.id;
      
      if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
        throw new BadRequestError('告警ID列表不能为空');
      }
      
      if (!['acknowledge', 'resolve', 'suppress'].includes(operation)) {
        throw new BadRequestError('无效的操作类型');
      }
      
      const alertResults = await Promise.all(
        alertIds.map(alertId => AlertService.findById(parseInt(alertId)))
      );
      
      const alerts = alertResults.filter(alert => alert !== null);
      
      if (alerts.length !== alertIds.length) {
        throw new BadRequestError('部分告警不存在');
      }
      
      const results = [];
      
      for (const alert of alerts) {
        try {
          switch (operation) {
            case 'acknowledge':
              if (alert.status === 'active') {
                await alert.acknowledge(userId, data.note);
                results.push({ id: alert.id, success: true });
              } else {
                results.push({ id: alert.id, success: false, reason: '状态不允许确认' });
              }
              break;
              
            case 'resolve':
              if (alert.status !== 'resolved') {
                await alert.resolve(userId, data.note);
                results.push({ id: alert.id, success: true });
              } else {
                results.push({ id: alert.id, success: false, reason: '告警已解决' });
              }
              break;
              
            case 'suppress':
              if (data.suppressUntil) {
                await alert.suppress(new Date(data.suppressUntil));
                results.push({ id: alert.id, success: true });
              } else {
                results.push({ id: alert.id, success: false, reason: '缺少抑制时间' });
              }
              break;
          }
        } catch (error) {
          results.push({ id: alert.id, success: false, reason: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      logger.info(`批量${operation}告警完成: ${successCount}/${alertIds.length} 成功`);
      
      res.apiSuccess({
        message: `批量操作完成: ${successCount}/${alertIds.length} 成功`,
        results,
        summary: {
          total: alertIds.length,
          success: successCount,
          failed: alertIds.length - successCount
        }
      });
    } catch (error) {
      logger.error('批量操作告警失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 获取健康检查模板
   */
  async getHealthCheckTemplates(req, res) {
    try {
      const { enabled } = req.query;
      
      const options = {};
      if (enabled !== undefined) {
        options.enabled = enabled === 'true';
      }
      
      const templates = await HealthCheckTemplateService.findAll(options);
      
      const templatesData = templates.map(template => template.getConfigSummary());
      
      res.apiSuccess({
        templates: templatesData,
        summary: {
          total: templates.length,
          enabled: templates.filter(t => t.enabled).length,
          byType: HealthController.prototype.groupTemplatesByType.call(this, templates)
        }
      });
    } catch (error) {
      logger.error('获取健康检查模板失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 更新健康检查模板
   */
  async updateHealthCheckTemplate(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以修改健康检查模板');
      }
      
      const { templateId } = req.params;
      const updateData = req.body;
      
      const template = await HealthCheckTemplateService.findById(parseInt(templateId));
      if (!template) {
        throw new NotFoundError('健康检查模板不存在');
      }
      
      await template.update(updateData);
      
      logger.info(`健康检查模板已更新: ${template.name} [用户: ${req.user.username}]`);
      
      res.apiSuccess({
        message: '健康检查模板已更新',
        template: template.getConfigSummary()
      });
    } catch (error) {
      logger.error('更新健康检查模板失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 手动执行健康检查
   */
  async executeHealthCheck(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以手动执行健康检查');
      }
      
      const { templateId } = req.params;
      
      const template = await HealthCheckTemplateService.findById(parseInt(templateId));
      if (!template) {
        throw new NotFoundError('健康检查模板不存在');
      }
      
      // 异步执行检查，立即返回响应
      healthMonitoringService.executeHealthCheck(template).catch(error => {
        logger.error(`手动健康检查执行失败 [${template.name}]:`, error);
      });
      
      logger.info(`手动执行健康检查: ${template.name} [用户: ${req.user.username}]`);
      
      res.apiSuccess({
        message: '健康检查已开始执行',
        template: {
          id: template.id,
          name: template.name,
          type: template.checkType
        }
      });
    } catch (error) {
      logger.error('手动执行健康检查失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  /**
   * 获取健康监控概览
   */
  async getHealthOverview(req, res) {
    try {
      const [overallHealth, activeAlerts, systemMetrics] = await Promise.all([
        healthMonitoringService.getOverallHealthStatus(),
        AlertService.getActiveAlerts(),
        healthMonitoringService.getSystemMetrics()
      ]);
      
      const currentMetrics = {
        cpu: systemMetrics.cpu.slice(-1)[0]?.value || 0,
        memory: systemMetrics.memory.slice(-1)[0]?.value || 0,
        disk: systemMetrics.disk.slice(-1)[0]?.value || 0
      };
      
      // Calculate health score inline to avoid this binding issues
      const { statusCounts, totalChecks } = overallHealth;
      let healthScore = 100;
      if (totalChecks > 0) {
        const weights = { healthy: 100, warning: 70, critical: 20, unknown: 50 };
        const totalScore = Object.entries(statusCounts).reduce((sum, [status, count]) => {
          return sum + (weights[status] || 0) * count;
        }, 0);
        healthScore = Math.round(totalScore / totalChecks);
      }

      const overview = {
        systemStatus: overallHealth.overallStatus,
        healthScore,
        activeAlertsCount: activeAlerts.length,
        criticalAlertsCount: activeAlerts.filter(a => a.severity === 'critical').length,
        systemMetrics: currentMetrics,
        checksStatus: {
          total: overallHealth.totalChecks,
          healthy: overallHealth.statusCounts.healthy,
          warning: overallHealth.statusCounts.warning,
          critical: overallHealth.statusCounts.critical,
          unknown: overallHealth.statusCounts.unknown
        },
        lastUpdated: new Date(overallHealth.lastUpdated).toISOString(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      res.apiSuccess(overview);
    } catch (error) {
      logger.error('获取健康监控概览失败:', error);
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          error?.toString() || 
                          'Internal server error';
      res.apiError(errorMessage, 500);
    }
  }

  // 辅助方法

  /**
   * 生成健康建议
   */
  async generateHealthRecommendations(overallHealth) {
    const recommendations = [];
    
    if (overallHealth.statusCounts.critical > 0) {
      recommendations.push({
        priority: 'high',
        type: 'critical_issues',
        message: `发现 ${overallHealth.statusCounts.critical} 个严重健康问题，需要立即处理`,
        action: '查看活跃告警并采取相应措施'
      });
    }
    
    if (overallHealth.statusCounts.warning > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'warning_issues',
        message: `发现 ${overallHealth.statusCounts.warning} 个警告级别问题，建议及时关注`,
        action: '检查相关服务状态并优化配置'
      });
    }
    
    if (overallHealth.statusCounts.unknown > 0) {
      recommendations.push({
        priority: 'low',
        type: 'unknown_status',
        message: `有 ${overallHealth.statusCounts.unknown} 个检查状态未知，可能需要配置调整`,
        action: '检查健康检查配置和网络连接'
      });
    }
    
    return recommendations;
  }

  /**
   * 计算指标摘要
   */
  calculateMetricsSummary(metrics, dataPoints) {
    const calculateStats = (values) => {
      if (values.length === 0) return { avg: 0, min: 0, max: 0 };
      
      const nums = values.map(v => v.value);
      return {
        avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums)
      };
    };
    
    return {
      cpu: calculateStats(metrics.cpu.slice(dataPoints)),
      memory: calculateStats(metrics.memory.slice(dataPoints)),
      disk: calculateStats(metrics.disk.slice(dataPoints))
    };
  }

  /**
   * 按严重程度分组告警
   */
  groupAlertsBySeverity(alerts) {
    const groups = { low: 0, medium: 0, high: 0, critical: 0 };
    alerts.forEach(alert => {
      groups[alert.severity] = (groups[alert.severity] || 0) + 1;
    });
    return groups;
  }

  /**
   * 按类型分组告警
   */
  groupAlertsByType(alerts) {
    const groups = {};
    alerts.forEach(alert => {
      groups[alert.alertType] = (groups[alert.alertType] || 0) + 1;
    });
    return groups;
  }

  /**
   * 按类型分组模板
   */
  groupTemplatesByType(templates) {
    const groups = {};
    templates.forEach(template => {
      groups[template.checkType] = (groups[template.checkType] || 0) + 1;
    });
    return groups;
  }

  /**
   * 计算健康分数
   */
  calculateHealthScore(overallHealth) {
    const { statusCounts, totalChecks } = overallHealth;
    
    if (totalChecks === 0) return 100;
    
    const weights = { healthy: 100, warning: 70, critical: 20, unknown: 50 };
    const totalScore = Object.entries(statusCounts).reduce((sum, [status, count]) => {
      return sum + (weights[status] || 0) * count;
    }, 0);
    
    return Math.round(totalScore / totalChecks);
  }
}

module.exports = new HealthController();