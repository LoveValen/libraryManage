const express = require('express');
const router = express.Router();
const restoreController = require('../controllers/restore.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { strictRateLimit, createRateLimit } = require('../middlewares/validation.middleware');

/**
 * 恢复管理路由
 */

// 应用认证中间件到所有恢复路由
router.use(authenticateToken);

// 恢复操作相关路由
router.post('/operations', 
  requireRole(['admin', 'librarian']),
  createRateLimit({ maxRequests: 10, windowMs: 60 * 1000 }), // 10 requests per minute
  restoreController.createRestoreOperation
);

router.get('/operations', 
  requireRole(['admin', 'librarian']),
  restoreController.getRestoreOperations
);

router.get('/operations/active', 
  requireRole(['admin', 'librarian']),
  restoreController.getActiveOperations
);

router.get('/operations/pending-approvals', 
  requireRole(['admin']),
  restoreController.getPendingApprovals
);

router.get('/operations/statistics', 
  requireRole(['admin', 'librarian']),
  restoreController.getRestoreStatistics
);

router.get('/operations/:id', 
  requireRole(['admin', 'librarian']),
  restoreController.getRestoreOperationById
);

router.get('/operations/:id/logs', 
  requireRole(['admin', 'librarian']),
  restoreController.getRestoreOperationLogs
);

router.post('/operations/:id/execute', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  restoreController.executeRestoreOperation
);

router.post('/operations/:id/approve', 
  requireRole(['admin']),
  restoreController.approveRestoreOperation
);

router.post('/operations/:id/reject', 
  requireRole(['admin']),
  restoreController.rejectRestoreOperation
);

router.post('/operations/:id/cancel', 
  requireRole(['admin', 'librarian']),
  restoreController.cancelRestoreOperation
);

router.post('/operations/:id/rollback', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 3, windowMs: 60 * 1000 }), // 3 requests per minute
  restoreController.rollbackRestoreOperation
);

router.post('/operations/:id/verify', 
  requireRole(['admin', 'librarian']),
  restoreController.verifyRestoreOperation
);

router.post('/operations/:id/test', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  restoreController.testRestore
);

router.post('/operations/:id/precheck', 
  requireRole(['admin', 'librarian']),
  restoreController.preCheckRestoreOperation
);

router.delete('/operations/:id', 
  requireRole(['admin', 'librarian']),
  restoreController.deleteRestoreOperation
);

// 批量操作路由
router.post('/operations/batch', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  restoreController.batchOperateRestoreOperations
);

// 系统维护相关路由
router.post('/cleanup/test-restores', 
  requireRole(['admin']),
  createRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  restoreController.cleanupTestRestores
);

module.exports = router;