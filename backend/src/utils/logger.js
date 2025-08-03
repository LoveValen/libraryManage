const winston = require('winston');
const path = require('path');

/**
 * 日志工具 - 遵循优秀源码的简洁设计
 */

const isDev = process.env.NODE_ENV === 'development';

// 简洁的日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// 创建日志实例
const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), format)
    })
  ],
  silent: process.env.NODE_ENV === 'test',
});

// 生产环境添加文件日志
if (!isDev && !process.env.NODE_ENV === 'test') {
  logger.add(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'app.log'),
    level: 'info'
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error'
  }));
}

/**
 * 错误日志记录
 */
const logError = (error, req = null, meta = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...meta
  };

  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id
    };
  }

  logger.error('应用错误', errorInfo);
};

/**
 * 安全事件日志
 */
const logSecurityEvent = (event, req, details = {}) => {
  logger.warn('安全事件', {
    event,
    ip: req?.ip,
    url: req?.url,
    userId: req?.user?.id,
    ...details
  });
};

/**
 * 业务操作日志
 * 支持两种调用方式：
 * 1. logBusinessOperation(operation, userId, details)
 * 2. logBusinessOperation({operation, userId, targetUserId, details})
 */
const logBusinessOperation = (operationOrData, userId, details = {}) => {
  let logData;
  
  if (typeof operationOrData === 'string') {
    // 方式1: logBusinessOperation('USER_LOGIN', user.id, {...})
    logData = {
      operation: operationOrData,
      userId: userId,
      ...details
    };
  } else {
    // 方式2: logBusinessOperation({operation: 'user_created', userId: ..., ...})
    logData = operationOrData;
  }
  
  logger.info('业务操作', {
    operation: logData.operation,
    userId: logData.userId,
    targetUserId: logData.targetUserId,
    details: logData.details || logData,
    timestamp: new Date().toISOString()
  });
};

/**
 * HTTP请求日志中间件
 */
const createHttpLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    // 记录请求开始
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });
    
    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? 'error' : 'info';
      
      logger[logLevel]('HTTP Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        requestId: req.id
      });
    });
    
    next();
  };
};

module.exports = {
  logger,
  logError,
  logSecurityEvent,
  logBusinessOperation,
  createHttpLogger,
};