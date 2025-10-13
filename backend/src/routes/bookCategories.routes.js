const express = require('express');
const router = express.Router();
const bookCategoriesController = require('../controllers/bookCategories.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { validateId, validate } = require('../middlewares/validation.middleware');
const { categorySchemas } = require('../utils/validation');

/**
 * 图书分类路由
 */

// 获取分类树（公开接口）
router.get(
  '/tree',
  bookCategoriesController.getCategoryTree
);

// 获取分类列表（公开接口）
router.get(
  '/',
  bookCategoriesController.getAllCategories
);

// 创建分类（需要管理员权限）
router.post(
  '/',
  authenticateToken,
  requirePermission('bookCategories.create'),
  validate(categorySchemas.createCategory),
  bookCategoriesController.createCategory
);


// 更新分类（需要管理员权限）
router.put(
  '/:identifier',
  authenticateToken,
  requirePermission('bookCategories.update'),
  validate(categorySchemas.updateCategory),
  bookCategoriesController.updateCategory
);

// 删除分类（需要管理员权限）
router.delete(
  '/:identifier',
  authenticateToken,
  requirePermission('bookCategories.delete'),
  bookCategoriesController.deleteCategory
);

// 获取单个分类详情（公开接口）- 支持ID或名称
router.get(
  '/:identifier',
  bookCategoriesController.getCategoryByIdOrName
);

module.exports = router;
