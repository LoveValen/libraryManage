/**
 * API错误类 - 遵循优秀源码的简洁设计
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 常用错误类型
 */
class BadRequestError extends ApiError {
  constructor(message = '请求参数错误') {
    super(message, 400);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = '未授权访问') {
    super(message, 401);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = '禁止访问') {
    super(message, 403);
  }
}

class NotFoundError extends ApiError {
  constructor(message = '资源不存在') {
    super(message, 404);
  }
}

class ConflictError extends ApiError {
  constructor(message = '资源冲突') {
    super(message, 409);
  }
}

class ValidationError extends ApiError {
  constructor(message = '验证失败', errors = null) {
    super(message, 422, errors);
  }
}

class InsufficientPointsError extends ApiError {
  constructor(message = '积分余额不足') {
    super(message, 400);
  }
}

/**
 * 错误转换函数
 */
const fromError = (error) => {
  if (error instanceof ApiError) {
    return error;
  }

  // Body parser (express.json / body-parser) 错误
  // - entity.parse.failed: JSON 解析失败
  // - entity.too.large: 请求体过大
  if (error?.type === 'entity.parse.failed') {
    return new BadRequestError('请求体 JSON 格式错误');
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError('请求体过大', 413);
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('无效的登录凭证');
  }
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('登录凭证已过期');
  }

  // Joi验证错误
  if (error.isJoi) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    return new ValidationError('参数验证失败', validationErrors);
  }

  // Prisma错误简单处理
  if (error.code === 'P2002') {
    return new ConflictError('数据已存在');
  }
  if (error.code === 'P2025') {
    return new NotFoundError('记录不存在');
  }

  // 默认错误
  return new ApiError(error.message || '服务器内部错误', 500);
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InsufficientPointsError,
  fromError,
};
