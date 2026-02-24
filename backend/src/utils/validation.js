const Joi = require('joi');
const { BadRequestError } = require('./apiError');

/**
 * 验证工具 - 遵循优秀源码的简洁设计
 */

/**
 * 常用验证规则
 */
const common = {
  id: Joi.number().integer().positive(),
  email: Joi.string().email().trim().lowercase(),
  password: Joi.string().min(6).max(50),
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

/**
 * 核心验证规则
 */
const schemas = {
  // 用户相关
  login: Joi.object({
    // 兼容前端字段：identifier 或 username
    identifier: Joi.alternatives().try(common.email, common.username),
    username: Joi.alternatives().try(common.email, common.username),
    password: common.password.required(),
  }).or('identifier', 'username'),

  register: Joi.object({
    username: common.username.required(),
    email: common.email.required(),
    password: common.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),

  updateProfile: Joi.object({
    real_name: Joi.string().max(50).optional(),
    phone: Joi.string().optional(),
    bio: Joi.string().max(500).optional(),
  }),

  changePassword: Joi.object({
    currentPassword: common.password.required(),
    newPassword: common.password.required(),
  }),

  // 通用查询
  pagination: Joi.object({
    page: common.page,
    limit: common.limit,
    search: Joi.string().allow('').optional(),
  }),

  id: Joi.object({
    id: common.id.required(),
  }),

  // 用户列表查询
  getUserList: Joi.object({
    page: common.page,
    limit: common.limit,
    size: common.limit, // 兼容前端size参数
    search: Joi.string().allow('').optional(),
    keyword: Joi.string().allow('').optional(), // 兼容前端keyword参数
    role: Joi.string().valid('admin', 'librarian', 'patron').allow('').optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').allow('').optional(),
    sortBy: Joi.string().allow('').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').allow('').optional(),
  }),
};

// 兼容性schemas - 为现有路由提供支持
const bookSchemas = {
  createBook: Joi.object().unknown(true), // 允许任意字段
  updateBook: Joi.object().unknown(true),
  getBookList: Joi.object().unknown(true),
  adminGetBookList: Joi.object().unknown(true),
};

const categorySchemas = {
  createCategory: Joi.object().unknown(true),
  updateCategory: Joi.object().unknown(true),
};

const borrowSchemas = {
  getBorrowList: Joi.object().unknown(true),
  borrowBook: Joi.object().unknown(true),
  returnBook: Joi.object().unknown(true),
  renewBook: Joi.object().unknown(true),
};


const notificationSchemas = {
  createNotification: Joi.object().unknown(true),
  createBulkNotifications: Joi.object().unknown(true),
  createFromTemplate: Joi.object().unknown(true),
  processPending: Joi.object().unknown(true),
  broadcastMessage: Joi.object().unknown(true),
};

/**
 * 验证函数
 */
const validateRequest = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, ''),
      value: detail.context?.value,
    }));

    const validationError = new BadRequestError('参数验证失败');
    validationError.errors = details;
    throw validationError;
  }
  
  return value;
};

module.exports = {
  common,
  schemas,
  validateRequest,
  // 兼容性导出
  bookSchemas,
  categorySchemas,
  borrowSchemas,
  notificationSchemas,
  // 别名导出
  userSchemas: schemas,
};
