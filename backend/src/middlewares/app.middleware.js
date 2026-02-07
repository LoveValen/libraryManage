/**
 * 应用中间件配置 - 遵循Express.js企业级最佳实践
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { createHttpLogger } = require('../utils/logger');
const { attachResponseMethods } = require('../utils/apiResponse');
const { apiRateLimit, sanitizeInput } = require('./validation.middleware');

/**
 * 请求追踪中间件 - 企业级功能
 */
const requestTracing = () => {
  return (req, res, next) => {
    // 生成请求ID
    req.id = req.get('x-request-id') || uuidv4();
    
    // 设置请求ID响应头
    res.set('x-request-id', req.id);
    
    // 请求开始时间
    req.startTime = Date.now();
    
    next();
  };
};

/**
 * 安全中间件配置
 */
const securityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.app.environment === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false
  });
};

/**
 * CORS中间件配置 - 简化版
 */
const corsMiddleware = () => {
  const allowedOrigins = Array.isArray(config.cors?.origin)
    ? config.cors.origin
    : typeof config.cors?.origin === 'string'
      ? [config.cors.origin]
      : [];

  const allowedOriginPatterns = allowedOrigins
    .map((origin) => (typeof origin === 'string' ? origin.trim() : ''))
    .filter(Boolean);

  const allowAllLocalhost = process.env.CORS_ALLOW_ALL_LOCALHOST === 'true';

  const wildcardToRegExp = (pattern) => {
    const escaped = pattern
      .split('*')
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${escaped}$`, 'i');
  };

  const isOriginInAllowList = (origin) => {
    for (const pattern of allowedOriginPatterns) {
      if (pattern === '*') return true;
      if (pattern === origin) return true;
      if (!pattern.includes('*')) continue;

      try {
        if (wildcardToRegExp(pattern).test(origin)) return true;
      } catch (_) {
        // ignore invalid pattern
      }
    }

    return false;
  };

  const isAllowed = (origin) => {
    if (!origin) return true;
    if (allowAllLocalhost) {
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      } catch (_) {
        // ignore
      }
    }
    return isOriginInAllowList(origin);
  };

  return cors({
    origin: (origin, callback) => {
      if (isAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: config.cors?.credentials ?? true,
    optionsSuccessStatus: config.cors?.optionsSuccessStatus ?? 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
      'Authorization', 'X-API-Key', 'x-request-id'
    ],
  });
};

/**
 * 请求体解析中间件
 */
const bodyParsingMiddleware = () => {
  return [
    express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    }),
    express.urlencoded({ extended: true, limit: '10mb' })
  ];
};

/**
 * 应用性能监控中间件
 */
const performanceMiddleware = () => {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // 转换为毫秒
      
      // 记录慢请求 (>1000ms)
      if (duration > 1000) {
        console.warn(`⚠️  慢请求检测: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
      }
      
      // 将性能数据添加到请求对象，供日志记录使用
      req.performanceData = {
        duration: duration.toFixed(2),
        requestId: req.id
      };
    });
    
    next();
  };
};

/**
 * 配置所有应用中间件
 */
const configureAppMiddleware = (app) => {
  // 信任代理
  app.set('trust proxy', 1);
  
  // 请求追踪 (最先执行)
  app.use(requestTracing());
  
  // 性能监控
  app.use(performanceMiddleware());
  
  // 安全中间件
  app.use(securityMiddleware());
  
  // CORS配置
  app.use(corsMiddleware());
  
  // 压缩响应
  app.use(compression());
  
  // 请求体解析
  app.use(bodyParsingMiddleware());
  
  // HTTP请求日志 (非测试环境)
  if (config.app.environment !== 'test') {
    app.use(createHttpLogger());
  }
  
  // 生产环境速率限制
  if (config.app.environment === 'production') {
    app.use('/api/', apiRateLimit);
  }
  
  // 输入清理
  app.use(sanitizeInput);
  
  // 响应方法扩展
  app.use(attachResponseMethods);
};

module.exports = {
  configureAppMiddleware,
  requestTracing,
  securityMiddleware,
  corsMiddleware,
  bodyParsingMiddleware,
  performanceMiddleware,
};
