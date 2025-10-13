const express = require('express');
const router = express.Router();
const bookTagsController = require('../controllers/bookTags.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

/**
 * 图书标签路由
 */

// 标签列表（公开，用于筛选）
router.get('/', bookTagsController.list);
router.get('/active', bookTagsController.listActive);
router.get('/:id', bookTagsController.detail);

// 以下操作需要管理员权限
router.post('/', authenticateToken, requirePermission('bookTags.create'), bookTagsController.create);
router.put('/:id', authenticateToken, requirePermission('bookTags.update'), bookTagsController.update);
router.delete('/:id', authenticateToken, requirePermission('bookTags.delete'), bookTagsController.remove);

module.exports = router;
