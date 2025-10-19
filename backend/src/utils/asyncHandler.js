/**
 * 异步路由处理器
 * 用于包装异步路由处理函数，自动捕获错误
 */

/**
 * 包装异步函数，自动处理错误
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  asyncHandler
};