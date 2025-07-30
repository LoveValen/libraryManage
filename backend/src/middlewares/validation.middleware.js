const rateLimit = require('express-rate-limit');
const { ValidationError } = require('../utils/apiError');
const { logSecurityEvent } = require('../utils/logger');
const config = require('../config');

/**
 * 通用验证中间件工厂
 * 使用Joi schema验证请求数据
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = req[target];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有验证错误
      stripUnknown: true, // 移除未知字段
      convert: true, // 类型转换
      allowUnknown: false, // 不允许未知字段
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''), // 移除引号
        value: detail.context?.value,
        type: detail.type,
      }));

      const error = new ValidationError('Validation failed', validationErrors);
      return next(error);
    }

    // 将验证并清理后的数据替换原始数据
    req[target] = value;
    next();
  };
};

/**
 * 多目标验证中间件
 * 同时验证多个请求数据源
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [target, schema] of Object.entries(schemas)) {
      if (schema && req[target]) {
        const { error, value } = schema.validate(req[target], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          const targetErrors = error.details.map(detail => ({
            field: `${target}.${detail.path.join('.')}`,
            message: detail.message.replace(/"/g, ''),
            value: detail.context?.value,
            type: detail.type,
          }));
          errors.push(...targetErrors);
        } else {
          req[target] = value;
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
};

/**
 * 文件验证中间件
 * 验证上传的文件
 */
const validateFile = (options = {}) => {
  const {
    required = false,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    fieldName = 'file',
  } = options;

  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName];

    // 检查文件是否必需
    if (required && !file) {
      throw new ValidationError('File is required', [{
        field: fieldName,
        message: 'File is required',
        type: 'required',
      }]);
    }

    // 如果没有文件且不是必需的，继续
    if (!file) {
      return next();
    }

    const errors = [];

    // 验证文件大小
    if (file.size > maxSize) {
      errors.push({
        field: fieldName,
        message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
        type: 'file.size',
        value: file.size,
      });
    }

    // 验证文件类型
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: fieldName,
        message: `File type must be one of: ${allowedTypes.join(', ')}`,
        type: 'file.type',
        value: file.mimetype,
      });
    }

    // 验证文件名
    if (file.originalname && !/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
      errors.push({
        field: fieldName,
        message: 'Invalid file name. Only alphanumeric characters, dots, hyphens and underscores are allowed',
        type: 'file.name',
        value: file.originalname,
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('File validation failed', errors);
    }

    next();
  };
};

/**
 * 多文件验证中间件
 */
const validateFiles = (options = {}) => {
  const {
    maxCount = 5,
    maxSize = 10 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    fieldName = 'files',
  } = options;

  return (req, res, next) => {
    const files = req.files?.[fieldName] || req.files || [];

    if (!Array.isArray(files)) {
      return next();
    }

    const errors = [];

    // 验证文件数量
    if (files.length > maxCount) {
      errors.push({
        field: fieldName,
        message: `Maximum ${maxCount} files allowed`,
        type: 'files.count',
        value: files.length,
      });
    }

    // 验证每个文件
    files.forEach((file, index) => {
      const filePrefix = `${fieldName}[${index}]`;

      if (file.size > maxSize) {
        errors.push({
          field: filePrefix,
          message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
          type: 'file.size',
          value: file.size,
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push({
          field: filePrefix,
          message: `File type must be one of: ${allowedTypes.join(', ')}`,
          type: 'file.type',
          value: file.mimetype,
        });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('Files validation failed', errors);
    }

    next();
  };
};

/**
 * 分页参数验证中间件
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  const errors = [];

  // 验证页码
  const pageNum = parseInt(page);
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push({
      field: 'page',
      message: 'Page must be a positive integer',
      type: 'number.positive',
      value: page,
    });
  }

  // 验证每页数量
  const limitNum = parseInt(limit);
  // 管理员可以请求更多数据，最多1000条
  const maxLimit = req.user && req.user.role === 'admin' ? 1000 : 100;
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) {
    errors.push({
      field: 'limit',
      message: `Limit must be between 1 and ${maxLimit}`,
      type: 'number.range',
      value: limit,
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Pagination validation failed', errors);
  }

  // 设置验证后的值
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  };

  next();
};

/**
 * ID参数验证中间件
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const numId = parseInt(id);

    if (isNaN(numId) || numId <= 0) {
      throw new ValidationError(`Invalid ${paramName}`, [{
        field: paramName,
        message: `${paramName} must be a positive integer`,
        type: 'number.positive',
        value: id,
      }]);
    }

    // 将字符串ID转换为数字
    req.params[paramName] = numId;
    next();
  };
};

/**
 * 请求频率限制中间件
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    message = config.rateLimit.message,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
  } = options;

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      status: 'error',
      statusCode: 429,
      message: message.error,
      code: message.code,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || ((req) => {
      return req.ip;
    }),
    handler: (req, res) => {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', req, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
      });

      res.status(429).json({
        success: false,
        status: 'error',
        statusCode: 429,
        message: message.error,
        code: message.code,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

/**
 * 严格的API速率限制（用于敏感操作）
 */
const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 5, // 最多5次请求
  message: {
    error: 'Too many attempts, please try again later',
    code: 'RATE_LIMIT_STRICT',
  },
});

/**
 * 登录速率限制
 */
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 10, // 最多10次登录尝试
  message: {
    error: 'Too many login attempts, please try again later',
    code: 'LOGIN_RATE_LIMIT',
  },
  skipSuccessfulRequests: true, // 成功的登录不计入限制
  keyGenerator: (req) => {
    // 按IP和用户名组合限制
    const identifier = req.body?.identifier || req.body?.username || req.body?.email;
    return `${req.ip}:${identifier}`;
  },
});

/**
 * 注册速率限制
 */
const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  maxRequests: 3, // 最多3次注册尝试
  message: {
    error: 'Too many registration attempts, please try again later',
    code: 'REGISTER_RATE_LIMIT',
  },
});

/**
 * API调用速率限制
 */
const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 1000, // 最多1000次API调用
  message: {
    error: 'API rate limit exceeded, please try again later',
    code: 'API_RATE_LIMIT',
  },
});

/**
 * 内容验证中间件（防止XSS）
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // 移除潜在的脚本标签和HTML
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  // 清理请求体
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // 清理查询参数
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validate,
  validateMultiple,
  validateFile,
  validateFiles,
  validatePagination,
  validateId,
  createRateLimit,
  strictRateLimit,
  loginRateLimit,
  registerRateLimit,
  apiRateLimit,
  sanitizeInput,
};