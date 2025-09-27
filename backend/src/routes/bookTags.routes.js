const express = require('express');
const router = express.Router();
const bookTagsController = require('../controllers/bookTags.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * 图书标签路由
 */

// 标签列表（公开，用于筛选）
router.get('/', bookTagsController.list);
router.get('/active', bookTagsController.listActive);
router.get('/:id', bookTagsController.detail);

// 以下操作需要管理员权限
router.post('/', authenticate, authorize(['admin']), bookTagsController.create);
router.put('/:id', authenticate, authorize(['admin']), bookTagsController.update);
router.delete('/:id', authenticate, authorize(['admin']), bookTagsController.remove);

module.exports = router;
