const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth.middleware');
const { 
  validate, 
  loginRateLimit, 
  registerRateLimit, 
  strictRateLimit,
  sanitizeInput,
} = require('../middlewares/validation.middleware');
const { schemas } = require('../utils/validation');

const router = express.Router();

/**
 * 认证路由
 * /api/v1/auth/*
 */

// 应用通用中间件
router.use(sanitizeInput); // 清理输入内容

/**
 * @route   POST /api/v1/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register',
  registerRateLimit, // 注册频率限制
  validate(schemas.register),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login',
  loginRateLimit, // 登录频率限制
  validate(schemas.login),
  authController.login
);


/**
 * @route   POST /api/v1/auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh',
  validate(require('joi').object({
    refreshToken: require('joi').string().required(),
  })),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    重置密码（忘记密码）
 * @access  Public
 */
router.post('/reset-password',
  strictRateLimit, // 严格的频率限制
  validate(require('joi').object({
    email: require('joi').string().email().required(),
  })),
  authController.resetPassword
);

// 以下路由需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authController.getCurrentUser);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    验证令牌有效性
 * @access  Private
 */
router.get('/verify', authController.verifyToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   PUT /api/v1/auth/password
 * @desc    修改密码
 * @access  Private
 */
router.put('/password',
  strictRateLimit, // 严格的频率限制
  validate(schemas.id),
  authController.changePassword
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    更新用户资料
 * @access  Private
 */
router.put('/profile',
  validate(schemas.id),
  authController.updateProfile
);

module.exports = router;