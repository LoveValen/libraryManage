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
 * 分页成功响应
 * 统一格式：data中返回核心数据，分页信息在同级
 * @param {Object} res - Express response对象
 * @param {Array|Object} data - 核心数据（通常是列表数组）
 * @param {Object} pagination - 分页信息对象 {page, pageSize, total, totalPages}
 * @param {string} message - 提示信息
 * @param {number} statusCode - HTTP状态码
 */
const successWithPagination = (
  res,
  data,
  pagination = {},
  message = '成功',
  statusCode = 200
) => {
  const rawPage = Number(pagination.page ?? pagination.current ?? 1);
  const rawPageSize = Number(pagination.pageSize ?? pagination.limit ?? pagination.size ?? 20);
  const rawTotal = Number(pagination.total ?? 0);
  const computedTotalPages = pagination.totalPages ?? pagination.pages ?? null;
  const rawTotalPages = computedTotalPages !== null 
    ? Number(computedTotalPages) 
    : (Number.isFinite(rawPageSize) && rawPageSize > 0 
        ? Math.ceil((Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : 0) / rawPageSize) 
        : 0);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : 20;
  const total = Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : 0;
  const totalPages = Number.isFinite(rawTotalPages) && rawTotalPages >= 0 
    ? rawTotalPages 
    : (pageSize > 0 ? Math.ceil(total / pageSize) : 0);

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    page,
    pageSize,
    total,
    totalPages,
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