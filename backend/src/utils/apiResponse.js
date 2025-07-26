/**
 * 统一API响应格式化工具
 * 确保所有API响应都有一致的结构
 */

/**
 * 成功响应格式
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP状态码
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    status: 'success',
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * 分页数据响应格式
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据数组
 * @param {Object} pagination - 分页信息
 * @param {string} message - 成功消息
 */
const successWithPagination = (res, data, pagination, message = 'Success') => {
  const response = {
    success: true,
    status: 'success',
    statusCode: 200,
    message,
    data,
    pagination: {
      currentPage: pagination.currentPage || 1,
      pageSize: pagination.pageSize || data.length,
      totalItems: pagination.totalItems || data.length,
      totalPages: pagination.totalPages || 1,
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(response);
};

/**
 * 错误响应格式
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {*} errors - 详细错误信息
 * @param {string} code - 错误代码
 */
const error = (res, message = 'Internal Server Error', statusCode = 500, errors = null, code = null) => {
  const response = {
    success: false,
    status: 'error',
    statusCode,
    message,
    code: code || getDefaultErrorCode(statusCode),
    errors,
    timestamp: new Date().toISOString(),
  };

  // 开发环境下可以包含更多调试信息
  if (process.env.NODE_ENV === 'development' && errors && errors.stack) {
    response.stack = errors.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * 验证错误响应格式
 * @param {Object} res - Express响应对象
 * @param {Array|Object} validationErrors - 验证错误详情
 * @param {string} message - 错误消息
 */
const validationError = (res, validationErrors, message = 'Validation failed') => {
  const response = {
    success: false,
    status: 'error',
    statusCode: 400,
    message,
    code: 'VALIDATION_ERROR',
    errors: Array.isArray(validationErrors) ? validationErrors : [validationErrors],
    timestamp: new Date().toISOString(),
  };

  return res.status(400).json(response);
};

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401, null, 'UNAUTHORIZED');
};

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403, null, 'FORBIDDEN');
};

/**
 * 资源未找到响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404, null, 'NOT_FOUND');
};

/**
 * 冲突响应（资源已存在等）
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const conflict = (res, message = 'Resource conflict') => {
  return error(res, message, 409, null, 'CONFLICT');
};

/**
 * 请求过于频繁响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const tooManyRequests = (res, message = 'Too many requests') => {
  return error(res, message, 429, null, 'RATE_LIMIT_EXCEEDED');
};

/**
 * 服务器内部错误响应
 * @param {Object} res - Express响应对象
 * @param {Error} err - 错误对象
 * @param {string} message - 自定义错误消息
 */
const internalServerError = (res, err = null, message = 'Internal server error') => {
  return error(res, message, 500, err, 'INTERNAL_SERVER_ERROR');
};

/**
 * 创建响应处理中间件
 * 将响应方法添加到res对象上
 */
const attachResponseMethods = (req, res, next) => {
  res.apiSuccess = (data, message, statusCode) => success(res, data, message, statusCode);
  res.apiSuccessWithPagination = (data, pagination, message) => successWithPagination(res, data, pagination, message);
  res.apiError = (message, statusCode, errors, code) => error(res, message, statusCode, errors, code);
  res.apiValidationError = (validationErrors, message) => validationError(res, validationErrors, message);
  res.apiUnauthorized = (message) => unauthorized(res, message);
  res.apiForbidden = (message) => forbidden(res, message);
  res.apiNotFound = (message) => notFound(res, message);
  res.apiConflict = (message) => conflict(res, message);
  res.apiTooManyRequests = (message) => tooManyRequests(res, message);
  res.apiInternalServerError = (err, message) => internalServerError(res, err, message);
  
  next();
};

/**
 * 根据HTTP状态码获取默认错误代码
 * @param {number} statusCode - HTTP状态码
 * @returns {string} 错误代码
 */
const getDefaultErrorCode = (statusCode) => {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };

  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
};

/**
 * 将Sequelize查询结果转换为分页格式
 * @param {Object} result - Sequelize分页查询结果 (findAndCountAll)
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 */
const formatPaginationFromSequelize = (result, page, limit) => {
  const totalItems = result.count;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = parseInt(page);
  
  return {
    currentPage,
    pageSize: limit,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

/**
 * 从Prisma的查询结果格式化分页信息
 * @param {Array} data - Prisma查询数据结果
 * @param {number} totalCount - 总记录数（通过单独的count查询获得）
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 */
const formatPaginationFromPrisma = (data, totalCount, page, limit) => {
  const totalItems = totalCount;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = parseInt(page);
  
  return {
    data,
    pagination: {
      currentPage,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    }
  };
};

/**
 * 通用分页格式化函数
 * @param {Array|Object} result - 查询结果（Prisma数组或Sequelize对象）
 * @param {number} totalCount - 总记录数（仅用于Prisma）
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 */
const formatPagination = (result, totalCount, page, limit) => {
  // 如果result是数组，认为是Prisma结果
  if (Array.isArray(result)) {
    return formatPaginationFromPrisma(result, totalCount, page, limit);
  }
  
  // 如果result有count属性，认为是Sequelize结果
  if (result && typeof result.count === 'number') {
    return formatPaginationFromSequelize(result, page, limit);
  }
  
  // 默认处理为Prisma格式
  return formatPaginationFromPrisma(result || [], totalCount || 0, page, limit);
};

module.exports = {
  success,
  successWithPagination,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalServerError,
  attachResponseMethods,
  formatPaginationFromSequelize,
  formatPaginationFromPrisma,
  formatPagination,
};