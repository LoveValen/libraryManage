/**
 * 自定义API错误类
 * 用于创建和管理应用程序中的各种错误
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, code = null, errors = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.errors = errors;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    // 确保堆栈跟踪正确指向调用位置
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 根据状态码获取默认错误代码
   * @param {number} statusCode - HTTP状态码
   * @returns {string} 错误代码
   */
  getDefaultCode(statusCode) {
    const errorCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
    };

    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON格式的错误信息
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      errors: this.errors,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

/**
 * 业务逻辑错误（400）
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, 400, 'BAD_REQUEST', errors);
  }
}

/**
 * 未授权错误（401）
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 禁止访问错误（403）
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 资源未找到错误（404）
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 资源冲突错误（409）
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 验证错误（422）
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 422, 'VALIDATION_ERROR', errors);
  }
}

/**
 * 请求过于频繁错误（429）
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 服务器内部错误（500）
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 数据库错误
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database error', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * 外部服务错误
 */
class ExternalServiceError extends ApiError {
  constructor(message = 'External service error', service = 'unknown') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * JWT相关错误
 */
class JWTError extends ApiError {
  constructor(message = 'Token error') {
    super(message, 401, 'JWT_ERROR');
  }
}

/**
 * 微信API错误
 */
class WechatError extends ApiError {
  constructor(message = 'Wechat API error', wechatCode = null) {
    super(message, 400, 'WECHAT_ERROR');
    this.wechatCode = wechatCode;
  }
}

/**
 * 文件上传错误
 */
class FileUploadError extends ApiError {
  constructor(message = 'File upload error') {
    super(message, 400, 'FILE_UPLOAD_ERROR');
  }
}

/**
 * 业务规则错误
 */
class BusinessRuleError extends ApiError {
  constructor(message = 'Business rule violation', rule = null) {
    super(message, 422, 'BUSINESS_RULE_ERROR');
    this.rule = rule;
  }
}

/**
 * 积分系统错误
 */
class PointsError extends ApiError {
  constructor(message = 'Points system error') {
    super(message, 400, 'POINTS_ERROR');
  }
}

/**
 * 积分不足错误
 */
class InsufficientPointsError extends ApiError {
  constructor(message = 'Insufficient points') {
    super(message, 400, 'INSUFFICIENT_POINTS');
  }
}

/**
 * 借阅系统错误
 */
class BorrowError extends ApiError {
  constructor(message = 'Borrow system error') {
    super(message, 400, 'BORROW_ERROR');
  }
}

/**
 * 从常见错误创建ApiError
 * @param {Error} error - 原始错误对象
 * @returns {ApiError} API错误对象
 */
const fromError = (error) => {
  // 如果已经是ApiError，直接返回
  if (error instanceof ApiError) {
    return error;
  }

  // Prisma错误处理
  if (error.name && error.name.includes('Prisma')) {
    return handlePrismaError(error);
  }

  // Sequelize错误处理（保持向后兼容）
  if (error.name && error.name.includes('Sequelize')) {
    return handleSequelizeError(error);
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError' || 
      error.name === 'TokenExpiredError' || 
      error.name === 'NotBeforeError') {
    return new JWTError(error.message);
  }

  // Multer文件上传错误
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new FileUploadError('File size too large');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new FileUploadError('Too many files');
  }

  // 默认返回内部服务器错误
  return new InternalServerError(error.message);
};

/**
 * 处理Prisma错误
 * @param {Error} error - Prisma错误对象
 * @returns {ApiError} API错误对象
 */
const handlePrismaError = (error) => {
  // Prisma客户端已知请求错误
  if (error.name === 'PrismaClientKnownRequestError') {
    switch (error.code) {
      case 'P2000':
        return new BadRequestError('Input value too long for field');
      case 'P2001':
        return new NotFoundError('Record not found');
      case 'P2002':
        const field = error.meta?.target?.[0] || 'field';
        return new ConflictError(`${field} already exists`);
      case 'P2003':
        return new BadRequestError('Foreign key constraint violation');
      case 'P2004':
        return new BadRequestError('Constraint violation');
      case 'P2005':
        return new BadRequestError('Invalid value for field');
      case 'P2006':
        return new BadRequestError('Invalid value provided');
      case 'P2007':
        return new BadRequestError('Data validation error');
      case 'P2008':
        return new BadRequestError('Failed to parse query');
      case 'P2009':
        return new BadRequestError('Failed to validate query');
      case 'P2010':
        return new DatabaseError('Raw query failed');
      case 'P2011':
        return new BadRequestError('Null constraint violation');
      case 'P2012':
        return new BadRequestError('Missing required value');
      case 'P2013':
        return new BadRequestError('Missing required argument');
      case 'P2014':
        return new BadRequestError('Relation violation');
      case 'P2015':
        return new NotFoundError('Related record not found');
      case 'P2016':
        return new BadRequestError('Query interpretation error');
      case 'P2017':
        return new BadRequestError('Records not connected');
      case 'P2018':
        return new NotFoundError('Required connected records not found');
      case 'P2019':
        return new BadRequestError('Input error');
      case 'P2020':
        return new BadRequestError('Value out of range');
      case 'P2021':
        return new DatabaseError('Table does not exist');
      case 'P2022':
        return new DatabaseError('Column does not exist');
      case 'P2023':
        return new DatabaseError('Inconsistent column data');
      case 'P2024':
        return new DatabaseError('Connection timeout');
      case 'P2025':
        return new NotFoundError('Record not found for operation');
      case 'P2026':
        return new DatabaseError('Unsupported feature');
      case 'P2027':
        return new DatabaseError('Multiple errors on database');
      default:
        return new DatabaseError(`Database error: ${error.message}`);
    }
  }

  // Prisma客户端验证错误
  if (error.name === 'PrismaClientValidationError') {
    return new ValidationError('Validation failed', null, error.message);
  }

  // Prisma客户端初始化错误
  if (error.name === 'PrismaClientInitializationError') {
    return new DatabaseError('Database initialization error');
  }

  // Prisma客户端未知请求错误
  if (error.name === 'PrismaClientUnknownRequestError') {
    return new DatabaseError('Unknown database error');
  }

  // Prisma客户端Rust Panic错误
  if (error.name === 'PrismaClientRustPanicError') {
    return new InternalServerError('Database internal error');
  }

  // 默认Prisma错误处理
  return new DatabaseError(`Prisma error: ${error.message}`);
};

/**
 * 处理Sequelize错误
 * @param {Error} error - Sequelize错误对象
 * @returns {ApiError} API错误对象
 */
const handleSequelizeError = (error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));
      return new ValidationError('Validation failed', validationErrors);

    case 'SequelizeUniqueConstraintError':
      const field = error.errors[0]?.path || 'unknown';
      return new ConflictError(`${field} already exists`);

    case 'SequelizeForeignKeyConstraintError':
      return new BadRequestError('Foreign key constraint violation');

    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeConnectionTimedOutError':
      return new DatabaseError('Database connection error');

    case 'SequelizeDatabaseError':
      return new DatabaseError('Database operation failed');

    default:
      return new DatabaseError(`Database error: ${error.message}`);
  }
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  JWTError,
  WechatError,
  FileUploadError,
  BusinessRuleError,
  PointsError,
  InsufficientPointsError,
  BorrowError,
  fromError,
  handlePrismaError,
  handleSequelizeError,
};