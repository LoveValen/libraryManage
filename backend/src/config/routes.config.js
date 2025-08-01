/**
 * 路由配置 - 遵循Express.js企业级最佳实践
 */

const config = require('./index');

// 导入所有路由模块
const authRoutes = require('../routes/auth.routes');
const booksRoutes = require('../routes/books.routes');
const bookCategoriesRoutes = require('../routes/bookCategories.routes');
const usersRoutes = require('../routes/users.routes');
const borrowsRoutes = require('../routes/borrows.routes');
const reviewsRoutes = require('../routes/reviews.routes');
const pointsRoutes = require('../routes/points.routes');
const analyticsRoutes = require('../routes/analytics.routes');
const notificationsRoutes = require('../routes/notifications.routes');
const healthRoutes = require('../routes/health.routes');
const backupRoutes = require('../routes/backup.routes');
const restoreRoutes = require('../routes/restore.routes');
const adminRoutes = require('../routes/admin.routes');

/**
 * API信息端点
 */
const setupApiInfo = (app) => {
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Library Management System API',
      version: 'v1',
      timestamp: new Date().toISOString(),
      requestId: req.id,
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
        docs: config.app.environment === 'development' ? '/api/docs' : null,
      }
    });
  });
};

/**
 * 健康检查端点
 */
const setupHealthCheck = (app) => {
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: req.id,
      service: config.app.name,
      version: config.app.version,
      environment: config.app.environment,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
    });
  });
};

/**
 * 静态文件配置
 */
const setupStaticFiles = (app) => {
  const express = require('express');
  
  app.use('/uploads', express.static('public/uploads'));
  app.use('/ebooks', express.static('public/ebooks'));
  app.use('/pdf-viewer', express.static('public/pdf-viewer'));
};

/**
 * API路由配置
 */
const setupApiRoutes = (app) => {
  // API版本路由
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
};

/**
 * 配置所有路由
 */
const configureRoutes = (app) => {
  // 健康检查 (最高优先级)
  setupHealthCheck(app);
  
  // API信息端点
  setupApiInfo(app);
  
  // API路由
  setupApiRoutes(app);
  
  // 静态文件服务
  setupStaticFiles(app);
};

module.exports = {
  configureRoutes,
  setupApiInfo,
  setupHealthCheck,
  setupStaticFiles,
  setupApiRoutes,
};