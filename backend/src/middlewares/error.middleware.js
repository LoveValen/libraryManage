const { ApiError, fromError } = require('../utils/apiError');
const { logError } = require('../utils/logger');
const config = require('../config');

/**
 * 全局错误处理中间件
 * 捕获并处理应用中的所有错误
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应已经发送，交给Express默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 将错误转换为ApiError
  const apiError = fromError(err);

  // 记录错误日志
  logError(apiError, req, {
    originalError: err,
    stack: apiError.stack,
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    } : null,
  });

  // 构建错误响应
  const errorResponse = {
    success: false,
    status: 'error',
    statusCode: apiError.statusCode,
    message: apiError.message,
    code: apiError.code,
    timestamp: new Date().toISOString(),
  };

  // 在开发环境下包含更多调试信息
  if (config.app.environment === 'development') {
    errorResponse.stack = apiError.stack;
    errorResponse.originalError = err.message;
    
    if (apiError.errors) {
      errorResponse.errors = apiError.errors;
    }
  }

  // 在生产环境下，对内部服务器错误使用通用消息
  if (config.app.environment === 'production' && apiError.statusCode >= 500) {
    errorResponse.message = 'Internal server error';
    delete errorResponse.stack;
    delete errorResponse.originalError;
  }

  // 如果有详细错误信息，添加到响应中
  if (apiError.errors && config.app.environment !== 'production') {
    errorResponse.errors = apiError.errors;
  }

  // 发送错误响应
  res.status(apiError.statusCode).json(errorResponse);
};

/**
 * 404错误处理中间件
 * 处理未找到的路由
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );

  next(error);
};

/**
 * 异步路由错误包装器
 * 自动捕获异步路由处理器中的错误
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 数据库错误处理器
 * 专门处理Prisma和Sequelize数据库错误
 */
const handleDatabaseError = (err, req, res, next) => {
  // 检查是否是数据库相关错误
  const isDatabaseError = err.name && (
    err.name.includes('Prisma') || 
    err.name.includes('Sequelize')
  );
  
  if (!isDatabaseError) {
    return next(err);
  }

  logError(err, req, {
    type: 'database_error',
    errorCode: err.code,
    sql: err.sql,
    parameters: err.parameters,
    meta: err.meta,
  });

  // 转换为ApiError并传递给错误处理器
  const apiError = fromError(err);
  next(apiError);
};

/**
 * 验证错误处理器
 * 专门处理请求验证错误
 */
const handleValidationError = (err, req, res, next) => {
  // 如果不是验证错误，传递给下一个中间件
  if (err.name !== 'ValidationError' && !err.isJoi) {
    return next(err);
  }

  logError(err, req, {
    type: 'validation_error',
    validationDetails: err.details || err.errors,
  });

  // Joi验证错误
  if (err.isJoi) {
    const validationErrors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    return res.status(400).json({
      success: false,
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize验证错误
  if (err.name === 'SequelizeValidationError') {
    const validationErrors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
    });
  }

  next(err);
};

/**
 * JWT错误处理器
 * 专门处理JWT相关错误
 */
const handleJWTError = (err, req, res, next) => {
  const jwtErrors = [
    'JsonWebTokenError',
    'TokenExpiredError',
    'NotBeforeError',
  ];

  if (!jwtErrors.includes(err.name)) {
    return next(err);
  }

  logError(err, req, {
    type: 'jwt_error',
    token: req.headers.authorization?.slice(7), // 移除 'Bearer ' 前缀
  });

  let message = 'Invalid token';
  let code = 'JWT_ERROR';

  switch (err.name) {
    case 'TokenExpiredError':
      message = 'Token has expired';
      code = 'TOKEN_EXPIRED';
      break;
    case 'JsonWebTokenError':
      message = 'Invalid token';
      code = 'INVALID_TOKEN';
      break;
    case 'NotBeforeError':
      message = 'Token not yet valid';
      code = 'TOKEN_NOT_ACTIVE';
      break;
  }

  return res.status(401).json({
    success: false,
    status: 'error',
    statusCode: 401,
    message,
    code,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 文件上传错误处理器
 * 专门处理multer文件上传错误
 */
const handleUploadError = (err, req, res, next) => {
  if (!err.code || !err.code.startsWith('LIMIT_')) {
    return next(err);
  }

  logError(err, req, {
    type: 'upload_error',
    field: err.field,
    storageErrors: err.storageErrors,
  });

  let message = 'File upload error';
  let code = 'UPLOAD_ERROR';

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size too large';
      code = 'FILE_TOO_LARGE';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      code = 'TOO_MANY_FILES';
      break;
    case 'LIMIT_FIELD_KEY':
      message = 'Field name too long';
      code = 'FIELD_NAME_TOO_LONG';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = 'Field value too long';
      code = 'FIELD_VALUE_TOO_LONG';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = 'Too many fields';
      code = 'TOO_MANY_FIELDS';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      code = 'UNEXPECTED_FILE';
      break;
  }

  return res.status(400).json({
    success: false,
    status: 'error',
    statusCode: 400,
    message,
    code,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 业务逻辑错误处理器
 * 处理自定义的业务逻辑错误
 */
const handleBusinessError = (err, req, res, next) => {
  // 如果不是ApiError实例，传递给下一个中间件
  if (!(err instanceof ApiError)) {
    return next(err);
  }

  logError(err, req, {
    type: 'business_error',
    isOperational: err.isOperational,
  });

  return res.status(err.statusCode).json({
    success: false,
    status: 'error',
    statusCode: err.statusCode,
    message: err.message,
    code: err.code,
    errors: err.errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 生产环境错误处理器
 * 在生产环境下隐藏敏感信息
 */
const productionErrorHandler = (err, req, res, next) => {
  if (config.app.environment !== 'production') {
    return next(err);
  }

  // 对于5xx错误，使用通用消息
  if (err.statusCode >= 500) {
    return res.status(500).json({
      success: false,
      status: 'error',
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }

  next(err);
};

/**
 * 开发环境错误处理器
 * 在开发环境下提供详细的错误信息
 */
const developmentErrorHandler = (err, req, res, next) => {
  if (config.app.environment !== 'development') {
    return next(err);
  }

  // 在开发环境下，提供完整的错误信息
  console.error('🚨 Development Error Details:');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('Request:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(err);
};

/**
 * 错误处理中间件链
 * 按顺序应用各种错误处理器
 */
const setupErrorHandlers = (app) => {
  // 应用顺序很重要：从特定到通用
  app.use(handleJWTError);
  app.use(handleUploadError);
  app.use(handleValidationError);
  app.use(handleDatabaseError);
  app.use(handleBusinessError);
  app.use(developmentErrorHandler);
  app.use(productionErrorHandler);
  app.use(errorHandler);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  handleValidationError,
  handleJWTError,
  handleUploadError,
  handleBusinessError,
  productionErrorHandler,
  developmentErrorHandler,
  setupErrorHandlers,
};