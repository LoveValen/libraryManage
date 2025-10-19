/**
 * 自定义错误类体系（函数式封装 + 类定义）
 *
 * 功能：
 * 1. 统一的错误处理
 * 2. 语义化的错误类型
 * 3. 便于错误追踪
 *
 * @example
 * throw new BusinessError('业务逻辑错误');
 * throw new NotFoundError('用户未找到');
 */

const { HTTP_STATUS, ERROR_CODES } = require('./constants');

/**
 * 基础应用错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // 标记为可预期的错误
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 业务逻辑错误（400）
 */
class BusinessError extends AppError {
  constructor(message = '业务逻辑错误', code = ERROR_CODES.VALIDATION_ERROR) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }
}

/**
 * 验证错误（400）
 */
class ValidationError extends AppError {
  constructor(message = '参数验证失败', errors = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    this.errors = errors;
  }
}

/**
 * 未授权错误（401）
 */
class UnauthorizedError extends AppError {
  constructor(message = '未授权访问', code = ERROR_CODES.ACCESS_DENIED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * 禁止访问错误（403）
 */
class ForbiddenError extends AppError {
  constructor(message = '禁止访问', code = ERROR_CODES.ACCESS_DENIED) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * 资源未找到错误（404）
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到', resourceType = null) {
    const code = resourceType ? `${resourceType.toUpperCase()}_NOT_FOUND` : ERROR_CODES.USER_NOT_FOUND;
    super(message, HTTP_STATUS.NOT_FOUND, code);
    this.resourceType = resourceType;
  }
}

/**
 * 冲突错误（409）
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

/**
 * 数据库错误（500）
 */
class DatabaseError extends AppError {
  constructor(message = '数据库操作失败', originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
    this.originalError = originalError;
  }
}

/**
 * 限流错误（429）
 */
class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
}

/**
 * 创建特定资源的未找到错误
 */
function createNotFoundError(resourceType, identifier = null) {
  const message = identifier
    ? `${resourceType} #${identifier} 未找到`
    : `${resourceType}未找到`;
  return new NotFoundError(message, resourceType);
}

/**
 * 创建用户未找到错误
 */
function userNotFound(userId = null) {
  return createNotFoundError('用户', userId);
}

/**
 * 创建图书未找到错误
 */
function bookNotFound(bookId = null) {
  return createNotFoundError('图书', bookId);
}

/**
 * 创建借阅记录未找到错误
 */
function borrowNotFound(borrowId = null) {
  return createNotFoundError('借阅记录', borrowId);
}

/**
 * 判断错误是否为可操作的应用错误
 */
function isOperationalError(error) {
  return error instanceof AppError && error.isOperational;
}

/**
 * 从Prisma错误转换为应用错误
 */
function fromPrismaError(error) {
  // P2002: 唯一约束冲突
  if (error.code === 'P2002') {
    return new ConflictError('数据已存在，请检查唯一性约束');
  }

  // P2025: 记录未找到
  if (error.code === 'P2025') {
    return new NotFoundError('记录未找到');
  }

  // P2003: 外键约束失败
  if (error.code === 'P2003') {
    return new BusinessError('关联数据不存在');
  }

  // 其他数据库错误
  return new DatabaseError('数据库操作失败', error);
}

/**
 * 错误处理辅助函数
 */
function handleError(error, defaultMessage = '操作失败') {
  // 如果已经是应用错误，直接返回
  if (error instanceof AppError) {
    return error;
  }

  // Prisma错误
  if (error.code && error.code.startsWith('P')) {
    return fromPrismaError(error);
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('无效的访问令牌');
  }

  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('访问令牌已过期');
  }

  // 其他未知错误
  return new AppError(defaultMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

module.exports = {
  // 错误类
  AppError,
  BusinessError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  RateLimitError,

  // 工厂函数
  createNotFoundError,
  userNotFound,
  bookNotFound,
  borrowNotFound,

  // 辅助函数
  isOperationalError,
  fromPrismaError,
  handleError,
};
