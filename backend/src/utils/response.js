/**
 * 统一API响应工具 - 遵循优秀源码的简洁设计
 */

const { formatDateTime } = require('./date');

/**
 * 成功响应
 */
const success = (res, data = null, message = '成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 分页响应
 */
const successWithPagination = (res, data, pagination, message = '获取成功') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || 0,
      pages: Math.ceil((pagination.total || 0) / (pagination.limit || 20)),
    },
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 错误响应
 */
const error = (res, message = '服务器错误', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 验证错误响应
 */
const validationError = (res, errors, message = '参数验证失败') => {
  return res.status(400).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: formatDateTime(new Date()),
  });
};

module.exports = {
  success,
  successWithPagination, 
  error,
  validationError,
};