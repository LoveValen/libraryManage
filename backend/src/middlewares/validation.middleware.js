const rateLimit = require('express-rate-limit');
const { ValidationError } = require('../utils/apiError');
const { formatDateTime } = require('../utils/date');

/**
 * 验证中间件 - 简化版本
 * 使用流行的Joi验证模式
 */

/**
 * 通用验证中间件
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = req[target];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value,
      }));

      return next(new ValidationError('参数验证失败', errors));
    }

    req[target] = value;
    next();
  };
};

/**
 * 分页参数验证
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);

  req.pagination = {
    page: Math.max(pageNum, 1),
    limit: limitNum,
    offset: (Math.max(pageNum, 1) - 1) * limitNum,
  };

  next();
};

/**
 * ID参数验证
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = parseInt(req.params[paramName]);

    if (isNaN(id) || id <= 0) {
      return next(new ValidationError('无效的ID参数', [{
        field: paramName,
        message: 'ID必须是正整数',
        value: req.params[paramName],
      }]));
    }

    req.params[paramName] = id;
    next();
  };
};

/**
 * 通用限流中间件
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = '请求过于频繁，请稍后再试') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      statusCode: 429,
      timestamp: formatDateTime(new Date()),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * 预定义的限流中间件
 */
const apiRateLimit = createRateLimit(15 * 60 * 1000, 1000, 'API调用过于频繁');
const loginRateLimit = createRateLimit(15 * 60 * 1000, 10, '登录尝试过于频繁');
const registerRateLimit = createRateLimit(15 * 60 * 1000, 5, '注册尝试过于频繁');
const strictRateLimit = createRateLimit(15 * 60 * 1000, 5, '操作过于频繁');

/**
 * 输入清理中间件
 */
const sanitizeInput = (req, res, next) => {
  // 基础XSS防护 - 清理HTML标签
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .trim();
    }
    return value;
  };

  // 递归清理对象
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          } else {
            obj[key] = sanitizeValue(obj[key]);
          }
        }
      }
    }
    return obj;
  };

  // 清理请求体、查询参数和路由参数
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};

module.exports = {
  validate,
  validatePagination,
  validateId,
  createRateLimit,
  apiRateLimit,
  loginRateLimit,
  registerRateLimit,
  strictRateLimit,
  sanitizeInput,
};