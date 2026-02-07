const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * 日志工具 - 遵循优秀源码的简洁设计
 */

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv === 'development';
const isTest = nodeEnv === 'test';

const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const logFilePath = process.env.LOG_FILE_PATH || './logs';
const logMaxSize = process.env.LOG_MAX_SIZE || '20m';
const logMaxFiles = process.env.LOG_MAX_FILES || '14d';
const logDatePattern = process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD';

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
  level: logLevel,
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), format)
    })
  ],
  silent: isTest,
});

// 生产环境默认写入文件日志（支持 LOG_TO_FILE=true 强制开启，LOG_TO_FILE=false 强制关闭）
const enableFileLogging =
  !isTest &&
  (process.env.LOG_TO_FILE === 'true' || (nodeEnv === 'production' && process.env.LOG_TO_FILE !== 'false'));

const ensureWritableDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });

  // 在某些环境（例如 Docker bind mount / 权限受限目录）下，目录存在但不可写。
  // 这里通过创建临时文件的方式做一次“真实写入”校验，避免后续日志写入触发未捕获的 error 事件导致进程退出。
  const probeFile = path.join(dirPath, `.write-test-${process.pid}-${Date.now()}`);
  fs.writeFileSync(probeFile, '', { flag: 'a' });
  fs.unlinkSync(probeFile);
};

const attachRotateFileErrorHandlers = (transport) => {
  const handleTransportError = (err) => {
    try {
      // eslint-disable-next-line no-console
      console.error('File logger error, disabling file transport:', err?.message || err);
    } catch (_) {
      // ignore
    }

    try {
      logger.remove(transport);
    } catch (_) {
      // ignore
    }
    try {
      transport.close();
    } catch (_) {
      // ignore
    }
  };

  // winston-transport 自身可能抛出 error
  transport.on('error', handleTransportError);

  // winston-daily-rotate-file 内部的 file-stream-rotator stream 也可能抛出 error。
  // 如果不监听，会触发“Unhandled 'error' event”并导致进程退出。
  if (transport.logStream?.on) {
    transport.logStream.on('error', handleTransportError);
  }
};

const addDailyRotateFileTransport = (options) => {
  const transport = new DailyRotateFile(options);
  attachRotateFileErrorHandlers(transport);
  logger.add(transport);
};

if (enableFileLogging) {
  const logDir = path.resolve(process.cwd(), logFilePath);
  try {
    ensureWritableDir(logDir);

    addDailyRotateFileTransport({
      dirname: logDir,
      filename: 'app-%DATE%.log',
      datePattern: logDatePattern,
      maxSize: logMaxSize,
      maxFiles: logMaxFiles,
      level: logLevel,
    });

    addDailyRotateFileTransport({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: logDatePattern,
      maxSize: logMaxSize,
      maxFiles: logMaxFiles,
      level: 'error',
    });
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.warn(
        `File logging disabled (cannot write to ${logDir}): ${err?.code || err?.message || err}`
      );
    } catch (_) {
      // ignore
    }
  }
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
      url: req.originalUrl || req.url,
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
    url: req?.originalUrl || req?.url,
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
      url: req.originalUrl || req.url,
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
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        requestId: req.id
      });
    });
    
    next();
  };
};

// 避免在日志输出被管道关闭时抛出未捕获异常（例如：CI/超时终止）。
logger.on('error', (err) => {
  try {
    // eslint-disable-next-line no-console
    console.error('Logger transport error:', err?.message || err);
  } catch (_) {
    // ignore
  }
});

module.exports = {
  logger,
  logError,
  logSecurityEvent,
  logBusinessOperation,
  createHttpLogger,
};
