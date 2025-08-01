const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const { createHttpLogger } = require('./utils/logger');
const { attachResponseMethods } = require('./utils/apiResponse');
const { 
  notFoundHandler, 
  setupErrorHandlers 
} = require('./middlewares/error.middleware');
const { 
  apiRateLimit,
  sanitizeInput,
} = require('./middlewares/validation.middleware');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const booksRoutes = require('./routes/books.routes');
const bookCategoriesRoutes = require('./routes/bookCategories.routes');
const usersRoutes = require('./routes/users.routes');
const borrowsRoutes = require('./routes/borrows.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const pointsRoutes = require('./routes/points.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const healthRoutes = require('./routes/health.routes');
const backupRoutes = require('./routes/backup.routes');
const restoreRoutes = require('./routes/restore.routes');
const adminRoutes = require('./routes/admin.routes');

/**
 * 创建Express应用
 */
const createApp = () => {
  const app = express();

  // 信任代理（用于获取真实IP）
  app.set('trust proxy', 1);

  // 基础安全中间件
  app.use(helmet({
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
  }));

  // CORS配置 - 支持Vite代理
  app.use(cors({
    origin: function (origin, callback) {
      // 开发环境允许所有localhost和127.0.0.1的请求（支持Vite代理）
      if (!origin || 
          origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'x-request-id',
    ],
  }));

  // 压缩响应
  app.use(compression());

  // 请求体解析
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // 存储原始请求体（用于webhook验证等）
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
  }));

  // HTTP请求日志
  if (config.app.environment !== 'test') {
    app.use(createHttpLogger());
  }

  // 全局API频率限制
  if (config.app.environment === 'production') {
    app.use('/api/', apiRateLimit);
  }

  // 输入清理
  app.use(sanitizeInput);

  // 附加响应方法到res对象
  app.use(attachResponseMethods);

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: config.app.name,
      version: config.app.version,
      environment: config.app.environment,
      uptime: process.uptime(),
    });
  });

  // API根路径信息
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Library Management System API',
      version: 'v1',
      endpoints: {
        auth: '/api/v1/auth',
        books: '/api/v1/books',
        bookCategories: '/api/v1/books/categories',
        users: '/api/v1/users',
        borrows: '/api/v1/borrows',
        reviews: '/api/v1/reviews',
        points: '/api/v1/points',
        analytics: '/api/v1/analytics',
        notifications: '/api/v1/notifications',
        health: '/api/v1/health',
        backup: '/api/v1/backup',
        restore: '/api/v1/restore',
        admin: '/api/v1/admin',
        systemHealth: '/health',
        docs: '/api/docs',
      },
      documentation: '/api/docs',
      timestamp: new Date().toISOString(),
    });
  });

  // API路由
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/books/categories', bookCategoriesRoutes);
  app.use('/api/v1/books', booksRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/borrows', borrowsRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/points', pointsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/backup', backupRoutes);
  app.use('/api/v1/restore', restoreRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 静态文件服务
  app.use('/uploads', express.static('public/uploads'));
  app.use('/ebooks', express.static('public/ebooks'));
  app.use('/pdf-viewer', express.static('public/pdf-viewer'));

  // API文档（开发环境）
  if (config.app.environment === 'development') {
    setupApiDocs(app);
  }

  // 404处理
  app.use(notFoundHandler);

  // 错误处理中间件链
  setupErrorHandlers(app);

  return app;
};

/**
 * 设置API文档
 */
const setupApiDocs = (app) => {
  try {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Library Management System API',
          version: '1.0.0',
          description: '图书馆管理系统API文档',
          contact: {
            name: 'Library Management Team',
            email: 'support@library.com',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.app.port}/api/v1`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: [
        './src/api/*.js',
        './src/controllers/*.js',
        // './src/models/*.js', // Removed - using Prisma now
      ],
    };

    const specs = swaggerJsdoc(options);
    
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Library Management API Docs',
    }));

    console.log(`📚 API Documentation available at: http://localhost:${config.app.port}/api/docs`);
  } catch (error) {
    console.warn('⚠️  API documentation setup failed:', error.message);
  }
};

/**
 * 优雅关闭处理
 */
const setupGracefulShutdown = (server) => {
  const { closeDatabase } = require('./utils/database'); // Using Prisma now
  const healthMonitoringService = require('./services/healthMonitoring.service');
  const backupService = require('./services/backup.service');
  const restoreService = require('./services/restore.service');

  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // 停止接受新请求
    server.close(async () => {
      console.log('📡 HTTP server closed');

      try {
        // 停止备份和恢复服务
        if (backupService.isRunning) {
          await backupService.stop();
          console.log('💾 Backup service stopped');
        }
        
        if (restoreService.isRunning) {
          await restoreService.stop();
          console.log('🔄 Restore service stopped');
        }

        // 停止健康监控服务
        if (healthMonitoringService.isRunning) {
          await healthMonitoringService.stop();
          console.log('🔍 Health monitoring service stopped');
        }

        // 关闭数据库连接
        await closeDatabase();
        console.log('💾 Database connections closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // 强制退出超时
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // 监听关闭信号
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
};

module.exports = {
  createApp,
  setupGracefulShutdown,
};
