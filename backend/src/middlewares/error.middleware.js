const { ApiError, fromError, ValidationError } = require('../utils/apiError');
const { logError } = require('../utils/logger');
const config = require('../config');
const { formatDateTime } = require('../utils/date');

/**
 * 统一错误处理中间件 - 使用流行的错误处理模式
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // 转换为标准API错误
  const apiError = fromError(err);
  
  // 记录错误
  logError(apiError, req, {
    user: req.user?.id || null,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 构建响应
  const response = {
    success: false,
    message: apiError.message,
    statusCode: apiError.statusCode,
    timestamp: formatDateTime(new Date()),
  };

  // 生产环境隐藏敏感信息
  if (config.app.environment === 'production' && apiError.statusCode >= 500) {
    response.message = '服务器内部错误';
  }

  // 开发环境添加调试信息
  if (config.app.environment === 'development') {
    response.stack = err.stack;
    response.details = err.message;
  }

  // 添加验证错误详情
  if (apiError.errors && Array.isArray(apiError.errors)) {
    response.errors = apiError.errors;
  }

  res.status(apiError.statusCode).json(response);
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    `路由未找到: ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * 异步处理器包装器 - 自动捕获异步错误
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 设置错误处理中间件链
 */
const setupErrorHandlers = (app) => {
  // 1. 统一错误处理中间件（必须最后设置）
  app.use(errorHandler);
  
  // 2. 全局未捕获异常处理
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    logError(error, null, { source: 'uncaughtException' });
    
    // 优雅退出
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    logError(new Error(reason), null, { source: 'unhandledRejection' });
    
    // 优雅退出
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupErrorHandlers,
};