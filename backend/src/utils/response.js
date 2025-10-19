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
  // 简化参数提取，直接使用默认值和Math.max确保有效值
  const page = Math.max(1, Number(pagination.page || pagination.current) || 1);
  const pageSize = Math.max(1, Number(pagination.pageSize || pagination.limit || pagination.size) || 20);
  const total = Math.max(0, Number(pagination.total) || 0);
  const totalPages = pagination.totalPages || pagination.pages || Math.ceil(total / pageSize);

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

/**
 * 完整格式的成功响应（兼容旧代码中的res.json()调用）
 * @param {Object} res - Express response对象
 * @param {Object} data - 响应数据
 * @param {string} message - 提示信息
 * @param {number} statusCode - HTTP状态码
 * @param {Object} extras - 额外字段
 * @returns {Object} Express response
 */
const successJson = (res, data = null, message = '成功', statusCode = 200, extras = {}) => {
  return res.status(statusCode).json({
    success: true,
    status: 'success',
    statusCode,
    message,
    data,
    timestamp: formatDateTime(new Date()),
    ...extras,
  });
};

/**
 * 创建响应（创建成功，201状态码）
 */
const created = (res, data = null, message = '创建成功') => {
  return successJson(res, data, message, 201);
};

/**
 * 更新响应（更新成功）
 */
const updated = (res, data = null, message = '更新成功') => {
  return success(res, data, message);
};

/**
 * 删除响应（删除成功）
 */
const deleted = (res, message = '删除成功') => {
  return success(res, null, message);
};

/**
 * 无内容响应（204 No Content）
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * 未授权响应（401 Unauthorized）
 */
const unauthorized = (res, message = '未授权访问') => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 禁止访问响应（403 Forbidden）
 */
const forbidden = (res, message = '禁止访问') => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 未找到响应（404 Not Found）
 */
const notFound = (res, message = '资源未找到') => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 冲突响应（409 Conflict）
 */
const conflict = (res, message = '资源冲突') => {
  return res.status(409).json({
    success: false,
    message,
    timestamp: formatDateTime(new Date()),
  });
};

/**
 * 请求过于频繁（429 Too Many Requests）
 */
const tooManyRequests = (res, message = '请求过于频繁，请稍后再试') => {
  return res.status(429).json({
    success: false,
    message,
    timestamp: formatDateTime(new Date()),
  });
};

module.exports = {
  success,
  successWithPagination,
  successJson,
  error,
  validationError,
  created,
  updated,
  deleted,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
};