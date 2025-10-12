const express = require('express');
const usersController = require('../controllers/users.controller');
const booksController = require('../controllers/books.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { 
  sanitizeInput,
} = require('../middlewares/validation.middleware');

const router = express.Router();

/**
 * 管理员路由
 * /api/v1/admin/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容
router.use(authenticateToken); // 所有管理员路由都需要认证
router.use(requireRole(['admin', 'librarian'])); // 需要管理员或图书馆员权限

/**
 * @route   GET /api/v1/admin/users
 * @desc    获取管理员用户列表 (兼容前端参数格式)
 * @access  Private (Admin/Librarian)
 */
router.get('/users', usersController.getAdminUserList);
/**
 * @route   GET /api/v1/admin/users/search
 * @desc    搜索用户（用于借阅弹窗的远程搜索）
 * @access  Private (Admin/Librarian)
 */
router.get('/users/search', usersController.adminSearchUsers);

/**
 * @route   GET /api/v1/admin/books
 * @desc    获取管理员图书列表 (兼容前端参数格式)
 * @access  Private (Admin/Librarian)
 */
router.get('/books', booksController.getAdminBookList);

/**
 * @route   GET /api/v1/admin/categories
 * @desc    获取图书分类列表
 * @access  Private (Admin/Librarian)
 */
router.get('/categories', booksController.getCategories);

module.exports = router;