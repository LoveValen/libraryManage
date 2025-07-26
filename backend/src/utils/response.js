/**
 * 响应格式化工具
 * 重新导出apiResponse功能，并添加兼容性函数
 */

const apiResponse = require('./apiResponse');

/**
 * 格式化响应 - 兼容性函数
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 消息
 * @param {number} statusCode - 状态码
 */
const formatResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return apiResponse.success(res, data, message, statusCode);
};

/**
 * API响应类 - 兼容性类
 */
class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return apiResponse.success(res, data, message, statusCode);
  }

  static error(res, message = 'Error', statusCode = 500, errors = null, code = null) {
    return apiResponse.error(res, message, statusCode, errors, code);
  }

  static successWithPagination(res, data = [], pagination = {}, message = 'Success') {
    return apiResponse.successWithPagination(res, data, pagination, message);
  }

  static validationError(res, validationErrors = [], message = 'Validation failed') {
    return apiResponse.validationError(res, validationErrors, message);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return apiResponse.unauthorized(res, message);
  }

  static forbidden(res, message = 'Forbidden') {
    return apiResponse.forbidden(res, message);
  }

  static notFound(res, message = 'Not found') {
    return apiResponse.notFound(res, message);
  }

  static conflict(res, message = 'Conflict') {
    return apiResponse.conflict(res, message);
  }
}

// 重新导出apiResponse的所有功能
module.exports = {
  ...apiResponse,
  formatResponse,
  ApiResponse,
};