const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validation.middleware');
const Joi = require('joi');

/**
 * 健康监控路由
 */

// 验证模式
const schemas = {
  acknowledgeAlert: Joi.object({
    note: Joi.string().max(500).optional()
  }),
  
  resolveAlert: Joi.object({
    note: Joi.string().max(500).optional()
  }),
  
  suppressAlert: Joi.object({
    suppressUntil: Joi.date().iso().greater('now').required()
  }),
  
  batchOperateAlerts: Joi.object({
    alertIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    operation: Joi.string().valid('acknowledge', 'resolve', 'suppress').required(),
    data: Joi.object({
      note: Joi.string().max(500).optional(),
      suppressUntil: Joi.date().iso().greater('now').optional()
    }).optional()
  }),
  
  updateHealthCheckTemplate: Joi.object({
    name: Joi.string().max(100).optional(),
    description: Joi.string().max(1000).optional(),
    enabled: Joi.boolean().optional(),
    intervalSeconds: Joi.number().integer().min(10).max(86400).optional(),
    timeoutSeconds: Joi.number().integer().min(5).max(300).optional(),
    retryCount: Joi.number().integer().min(0).max(10).optional(),
    thresholds: Joi.object().optional(),
    config: Joi.object().optional(),
    alertRules: Joi.object().optional(),
    failureThreshold: Joi.number().integer().min(1).max(10).optional(),
    successThreshold: Joi.number().integer().min(1).max(10).optional(),
    dependencies: Joi.array().items(Joi.string()).optional(),
    serviceTags: Joi.array().items(Joi.string()).optional()
  })
};

// 公共健康检查端点（无需认证）
router.get('/status', healthController.getSystemHealth);
router.get('/overview', healthController.getHealthOverview);

// 需要认证的端点
router.use(authenticateToken);

// 详细健康信息（需要管理员或图书管理员权限）
router.get('/report', 
  requireRole(['admin', 'librarian']), 
  healthController.getHealthReport
);

router.get('/metrics', 
  requireRole(['admin', 'librarian']), 
  healthController.getSystemMetrics
);

router.get('/trend/:checkType/:checkName', 
  requireRole(['admin', 'librarian']), 
  healthController.getHealthTrend
);

// 告警管理（需要管理员或图书管理员权限）
router.get('/alerts', 
  requireRole(['admin', 'librarian']), 
  healthController.getActiveAlerts
);

router.get('/alerts/statistics', 
  requireRole(['admin', 'librarian']), 
  healthController.getAlertStatistics
);

router.post('/alerts/:alertId/acknowledge', 
  requireRole(['admin', 'librarian']),
  validate(schemas.acknowledgeAlert),
  healthController.acknowledgeAlert
);

router.post('/alerts/:alertId/resolve', 
  requireRole(['admin', 'librarian']),
  validate(schemas.resolveAlert),
  healthController.resolveAlert
);

router.post('/alerts/:alertId/suppress', 
  requireRole(['admin', 'librarian']),
  validate(schemas.suppressAlert),
  healthController.suppressAlert
);

router.post('/alerts/batch', 
  requireRole(['admin', 'librarian']),
  validate(schemas.batchOperateAlerts),
  healthController.batchOperateAlerts
);

// 健康检查模板管理（需要管理员权限）
router.get('/templates', 
  requireRole(['admin']), 
  healthController.getHealthCheckTemplates
);

router.put('/templates/:templateId', 
  requireRole(['admin']),
  validate(schemas.updateHealthCheckTemplate),
  healthController.updateHealthCheckTemplate
);

router.post('/templates/:templateId/execute', 
  requireRole(['admin']),
  healthController.executeHealthCheck
);

module.exports = router;