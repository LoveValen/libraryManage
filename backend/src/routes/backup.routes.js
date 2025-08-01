const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backup.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { strictRateLimit, createRateLimit } = require('../middlewares/validation.middleware');

/**
 * 备份管理路由
 */

// 应用认证中间件到所有备份路由
router.use(authenticateToken);

// 备份任务相关路由
router.post('/jobs', 
  requireRole(['admin', 'librarian']),
  createRateLimit({ maxRequests: 20, windowMs: 60 * 1000 }), // 20 requests per minute
  backupController.createBackupJob
);

router.get('/jobs', 
  requireRole(['admin', 'librarian']),
  backupController.getBackupJobs
);

router.get('/jobs/active', 
  requireRole(['admin', 'librarian']),
  backupController.getActiveJobs
);

router.get('/jobs/statistics', 
  requireRole(['admin', 'librarian']),
  backupController.getBackupStatistics
);

router.get('/jobs/:id', 
  requireRole(['admin', 'librarian']),
  backupController.getBackupJobById
);

router.post('/jobs/:id/execute', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 10, windowMs: 60 * 1000 }), // 10 requests per minute
  backupController.executeBackupJob
);

router.post('/jobs/:id/cancel', 
  requireRole(['admin']),
  backupController.cancelBackupJob
);

router.post('/jobs/:id/verify', 
  requireRole(['admin', 'librarian']),
  backupController.verifyBackup
);

router.delete('/jobs/:id', 
  requireRole(['admin']),
  backupController.deleteBackupJob
);

// 备份调度相关路由
router.post('/schedules', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 10, windowMs: 60 * 1000 }), // 10 requests per minute
  backupController.createBackupSchedule
);

router.get('/schedules', 
  requireRole(['admin', 'librarian']),
  backupController.getBackupSchedules
);

router.put('/schedules/:id', 
  requireRole(['admin']),
  backupController.updateBackupSchedule
);

router.delete('/schedules/:id', 
  requireRole(['admin']),
  backupController.deleteBackupSchedule
);

// 存储配置相关路由
router.get('/storages', 
  requireRole(['admin', 'librarian']),
  backupController.getStorageConfigs
);

router.post('/storages/:id/test-connection', 
  requireRole(['admin']),
  backupController.testStorageConnection
);

// 系统维护相关路由
router.post('/cleanup/expired', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  backupController.cleanupExpiredBackups
);

module.exports = router;