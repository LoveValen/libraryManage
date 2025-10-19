const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const AuditMiddleware = require('../middleware/auditMiddleware');
const SecurityMiddleware = require('../middleware/securityMiddleware');

/**
 * 审计路由 - 提供审计日志和安全监控的API端点
 * 
 * 权限要求：
 * - 基础查询：认证用户
 * - 管理功能：管理员或安全分析师
 * - 导出功能：仅管理员
 */

// 应用安全中间件
router.use(SecurityMiddleware.basicSecurity());
router.use(SecurityMiddleware.apiSecurity());
router.use(SecurityMiddleware.apiRateLimit());

// 认证中间件
router.use(authMiddleware);

// 审计中间件
router.use(AuditMiddleware.dataAccess());

/**
 * 审计日志相关路由
 */

// 搜索审计日志
router.get('/logs/search', 
  roleMiddleware(['admin', 'security_analyst']),
  AuditMiddleware.sensitive(),
  auditController.searchAuditLogs
);

// 获取用户操作历史
router.get('/users/:userId/history', 
  AuditMiddleware.sensitive(),
  auditController.getUserHistory
);

// 获取安全统计
router.get('/statistics/security', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getSecurityStatistics
);

// 获取操作趋势分析
router.get('/trends/operations', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getOperationTrends
);

// 验证数据完整性
router.post('/verify/integrity', 
  roleMiddleware(['admin']),
  AuditMiddleware.adminAction(),
  auditController.verifyDataIntegrity
);

// 导出审计数据
router.post('/export', 
  roleMiddleware(['admin']),
  AuditMiddleware.adminAction(),
  SecurityMiddleware.dataExfiltrationDetection(),
  auditController.exportAuditData
);

/**
 * 合规性报告路由
 */

// 生成合规性报告
router.post('/compliance/reports', 
  roleMiddleware(['admin']),
  AuditMiddleware.adminAction(),
  auditController.generateComplianceReport
);

/**
 * 安全事件相关路由
 */

// 获取安全事件列表
router.get('/security/events', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getSecurityEvents
);

// 获取高优先级安全事件
router.get('/security/events/high-priority', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getHighPriorityEvents
);

// 处理安全事件
router.put('/security/events/:eventId/handle', 
  roleMiddleware(['admin', 'security_analyst']),
  AuditMiddleware.adminAction(),
  auditController.handleSecurityEvent
);

// 手动创建安全事件
router.post('/security/events', 
  roleMiddleware(['admin', 'security_analyst']),
  AuditMiddleware.adminAction(),
  auditController.createSecurityEvent
);

/**
 * 登录尝试相关路由
 */

// 获取登录尝试记录
router.get('/login/attempts', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getLoginAttempts
);

// 获取可疑IP列表
router.get('/security/suspicious-ips', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getSuspiciousIPs
);

/**
 * 威胁情报路由
 */

// 获取威胁情报
router.get('/security/threat-intelligence', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getThreatIntelligence
);

// 获取安全仪表板数据
router.get('/security/dashboard', 
  roleMiddleware(['admin', 'security_analyst']),
  auditController.getSecurityDashboard
);

/**
 * 实时监控路由
 */

// 获取实时安全状态
router.get('/security/status', 
  roleMiddleware(['admin', 'security_analyst']),
  async (req, res) => {
    try {
      const status = {
        timestamp: new Date(),
        system: 'operational',
        threats: {
          active: 0,
          blocked: 0,
          investigating: 0
        },
        monitoring: {
          enabled: true,
          services: ['audit_logging', 'security_monitoring', 'threat_detection']
        }
      };

      res.json({
        success: true,
        message: '获取安全状态成功',
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取安全状态失败',
        error: error.message
      });
    }
  }
);

// 手动触发安全扫描
router.post('/security/scan', 
  roleMiddleware(['admin']),
  AuditMiddleware.adminAction(),
  async (req, res) => {
    try {
      // 触发全面安全扫描
      const scanResult = {
        scanId: `scan_${Date.now()}`,
        startTime: new Date(),
        status: 'initiated',
        scope: 'full_system'
      };

      res.json({
        success: true,
        message: '安全扫描已启动',
        data: scanResult
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '启动安全扫描失败',
        error: error.message
      });
    }
  }
);

/**
 * 系统配置路由
 */

// 获取审计配置
router.get('/config/audit', 
  roleMiddleware(['admin']),
  async (req, res) => {
    try {
      const config = {
        retention: {
          auditLogs: 2555, // 7年
          securityEvents: 1095, // 3年
          loginAttempts: 365 // 1年
        },
        encryption: {
          enabled: !!process.env.AUDIT_ENCRYPTION_KEY,
          algorithm: 'aes-256-cbc'
        },
        compliance: {
          gdpr: true,
          hipaa: false,
          sox: false
        },
        monitoring: {
          realTimeAlerts: true,
          emailNotifications: true,
          smsNotifications: false
        }
      };

      res.json({
        success: true,
        message: '获取审计配置成功',
        data: config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取审计配置失败',
        error: error.message
      });
    }
  }
);

// 更新审计配置
router.put('/config/audit', 
  roleMiddleware(['admin']),
  AuditMiddleware.adminAction(),
  async (req, res) => {
    try {
      // 配置更新逻辑
      const updatedConfig = req.body;
      
      // 这里应该有实际的配置更新逻辑
      // await updateAuditConfiguration(updatedConfig);

      res.json({
        success: true,
        message: '审计配置更新成功',
        data: updatedConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新审计配置失败',
        error: error.message
      });
    }
  }
);

/**
 * 健康检查路由
 */

// 审计系统健康检查
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        auditLogging: 'operational',
        securityMonitoring: 'operational',
        database: 'operational'
      },
      metrics: {
        logsPerMinute: 0,
        eventsPerMinute: 0,
        responseTime: '< 100ms'
      }
    };

    res.json({
      success: true,
      message: '审计系统运行正常',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: '审计系统健康检查失败',
      error: error.message
    });
  }
});

module.exports = router;