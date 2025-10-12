const express = require('express');
const usersController = require('../controllers/users.controller');
const reviewsController = require('../controllers/reviews.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');
const { 
  validate, 
  validateId,
  validatePagination,
  sanitizeInput,
} = require('../middlewares/validation.middleware');
const { schemas } = require('../utils/validation');

const router = express.Router();

/**
 * 用户路由
 * /api/v1/users/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容
router.use(authenticateToken); // 所有用户路由都需要认证

/**
 * 当前用户相关路由
 */

/**
 * @route   GET /api/v1/users/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', usersController.getCurrentUser);

/**
 * @route   PUT /api/v1/users/me
 * @desc    更新当前用户信息
 * @access  Private
 */
router.put('/me',
  validate(schemas.updateProfile),
  usersController.updateCurrentUser
);

/**
 * @route   PUT /api/v1/users/me/password
 * @desc    修改当前用户密码
 * @access  Private
 */
router.put('/me/password',
  validate(schemas.changePassword),
  usersController.changeCurrentUserPassword
);

/**
 * @route   GET /api/v1/users/me/borrows
 * @desc    获取当前用户借阅历史
 * @access  Private
 */
router.get('/me/borrows',
  usersController.getCurrentUserBorrowHistory
);

/**
 * @route   GET /api/v1/users/me/reviews
 * @desc    获取当前用户的评价列表
 * @access  Private
 */
router.get('/me/reviews',
  reviewsController.getMyReviews
);

/**
 * 公共用户路由（需要认证但不需要特殊权限）
 */

/**
 * @route   GET /api/v1/users/search
 * @desc    搜索用户
 * @access  Private
 */
router.get('/search',
  usersController.searchUsers
);

/**
 * @route   GET /api/v1/users/statistics
 * @desc    获取用户统计信息
 * @access  Private (Admin/Librarian)
 */
router.get('/statistics',
  requireRole(['admin', 'librarian']),
  requirePermission('users.read'),
  usersController.getUserStatistics
);

/**
 * @route   GET /api/v1/users
 * @desc    获取用户列表
 * @access  Private (Admin/Librarian)
 */
router.get('/',
  requireRole(['admin', 'librarian']),
  requirePermission('users.read'),
  validate(schemas.getUserList, 'query'),
  usersController.getUserList
);

/**
 * @route   POST /api/v1/users
 * @desc    创建用户
 * @access  Private (Admin/Librarian)
 */
router.post('/',
  requireRole(['admin', 'librarian']),
  requirePermission('users.update'),
  validate(schemas.register),
  usersController.createUser
);

/**
 * @route   POST /api/v1/users/batch
 * @desc    批量操作用户
 * @access  Private (Admin)
 */
router.post('/batch',
  requireRole(['admin']),
  requirePermission('users.update'),
  validate(require('joi').object({
    userIds: require('joi').array().items(require('joi').number().integer().positive()).min(1).required(),
    action: require('joi').string().valid('activate', 'suspend', 'deactivate', 'delete', 'changeRole').required(),
    params: require('joi').object({
      role: require('joi').string().valid('admin', 'librarian', 'patron'),
    }).optional(),
  })),
  usersController.batchUpdateUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    获取用户详情
 * @access  Private (Admin/Librarian or Self)
 */
router.get('/:id',
  validateId(),
  usersController.getUserById
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    更新用户信息
 * @access  Private (Admin/Librarian or Self)
 */
router.put('/:id',
  validateId(),
  validate(schemas.updateProfile),
  usersController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    删除用户
 * @access  Private (Admin)
 */
router.delete('/:id',
  requireRole(['admin']),
  requirePermission('users.update'),
  validateId(),
  usersController.deleteUser
);

/**
 * @route   PUT /api/v1/users/:id/password
 * @desc    修改用户密码
 * @access  Private (Admin or Self)
 */
router.put('/:id/password',
  validateId(),
  validate(require('joi').object({
    currentPassword: require('joi').string().when('$isAdmin', {
      is: false,
      then: require('joi').required(),
      otherwise: require('joi').optional(),
    }),
    newPassword: require('joi').string()
      .min(6)
      .max(128)
      .required(),
  })),
  usersController.changePassword
);

/**
 * @route   GET /api/v1/users/:id/borrows
 * @desc    获取用户借阅历史
 * @access  Private (Admin/Librarian or Self)
 */
router.get('/:id/borrows',
  validateId(),
  usersController.getUserBorrowHistory
);

/**
 * @route   GET /api/v1/users/:userId/reviews
 * @desc    获取用户的评价列表
 * @access  Private (Admin/Librarian or Self)
 */
router.get('/:userId/reviews',
  validateId('userId'),
  reviewsController.getUserReviews
);

/**
 * @route   PUT /api/v1/users/:id/activate
 * @desc    激活用户
 * @access  Private (Admin)
 */
router.put('/:id/activate',
  requireRole(['admin']),
  requirePermission('users.update'),
  validateId(),
  usersController.activateUser
);

/**
 * @route   PUT /api/v1/users/:id/suspend
 * @desc    暂停用户
 * @access  Private (Admin)
 */
router.put('/:id/suspend',
  requireRole(['admin']),
  requirePermission('users.update'),
  validateId(),
  usersController.suspendUser
);

module.exports = router;