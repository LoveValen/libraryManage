const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保日志目录存在
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // 添加堆栈信息（错误时）
    if (stack) {
      log += `\n${stack}`;
    }
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 创建日志传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    level: config.app.environment === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }),

  // 错误日志文件（每日轮转）
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: config.logging.datePattern,
    level: 'error',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: logFormat,
  }),

  // 组合日志文件（每日轮转）
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: config.logging.datePattern,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: logFormat,
  }),
];

// 开发环境下添加调试日志文件
if (config.app.environment === 'development') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'debug-%DATE%.log'),
      datePattern: config.logging.datePattern,
      level: 'debug',
      maxSize: config.logging.maxSize,
      maxFiles: '7d', // 调试日志只保留7天
      format: logFormat,
    })
  );
}

// 创建Winston Logger实例
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
  // 处理未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
});

// 生产环境下不退出进程
if (config.app.environment === 'production') {
  logger.exitOnError = false;
}

// 创建HTTP请求日志中间件
const createHttpLogger = () => {
  const morgan = require('morgan');
  
  // 自定义Morgan格式
  const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';
  
  return morgan(morganFormat, {
    stream: {
      write: (message) => {
        logger.info(message.trim(), { service: 'http' });
      },
    },
    skip: (req, res) => {
      // 跳过健康检查请求
      return req.url === '/health' || req.url === '/ping';
    },
  });
};

// 错误日志记录函数
const logError = (error, req = null, additionalInfo = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...additionalInfo,
  };

  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // 如果有用户信息，添加用户ID
    if (req.user) {
      errorInfo.userId = req.user.id;
    }
  }

  logger.error('Application Error', errorInfo);
};

// 业务操作日志记录
const logBusinessOperation = (operation, userId, details = {}) => {
  logger.info('Business Operation', {
    operation,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// 安全事件日志记录
const logSecurityEvent = (event, req, details = {}) => {
  logger.warn('Security Event', {
    event,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// 数据库操作日志记录
const logDatabaseOperation = (operation, table, recordId = null, details = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    recordId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

module.exports = {
  logger,
  createHttpLogger,
  logError,
  logBusinessOperation,
  logSecurityEvent,
  logDatabaseOperation,
};