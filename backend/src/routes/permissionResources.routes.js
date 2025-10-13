const express = require('express');
const router = express.Router();
const controller = require('../controllers/permissionResources.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { sanitizeInput } = require('../middlewares/validation.middleware');

// 输入清理
router.use(sanitizeInput);

// 当前用户可访问资源，无需额外权限
router.get('/my', authenticateToken, controller.getMyResources);

// 以下接口需具备 UI 资源管理权限
router.use(authenticateToken);
router.use(requirePermission('ui.manage'));

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
