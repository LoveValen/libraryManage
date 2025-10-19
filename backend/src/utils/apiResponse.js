/**
 * API响应格式化工具 - 遵循优秀源码的简洁设计
 * 注意：推荐使用 response.js 作为主要响应工具
 */

const { formatDateTime } = require('./date');

/**
 * 核心分页格式化函数
 */
const formatPagination = (data, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = parseInt(page);
  
  return {
    data,
    pagination: {
      currentPage,
      pageSize: parseInt(limit),
      totalItems: totalCount,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    }
  };
};

/**
 * 响应方法中间件 - 为 res 对象添加快捷方法
 */
const attachResponseMethods = (req, res, next) => {
  // 成功响应
  res.apiSuccess = (data = null, message = '成功') => {
    return res.json({ success: true, message, data, timestamp: formatDateTime(new Date()) });
  };

  // 分页响应
  res.apiSuccessWithPagination = (data, totalCount, page, limit, message = '成功') => {
    const result = formatPagination(data, totalCount, page, limit);
    return res.json({ success: true, message, ...result, timestamp: formatDateTime(new Date()) });
  };

  // 错误响应
  res.apiError = (message = '请求失败', statusCode = 400) => {
    return res.status(statusCode).json({ 
      success: false, 
      message, 
      timestamp: formatDateTime(new Date()) 
    });
  };

  next();
};

module.exports = {
  formatPagination,
  attachResponseMethods,
};