/**
 * 路由配置 - 遵循Express.js企业级最佳实践
 */

const config = require('./index');

// 导入所有路由模块
const authRoutes = require('../routes/auth.routes');
const booksRoutes = require('../routes/books.routes');
const bookCategoriesRoutes = require('../routes/bookCategories.routes');
const bookTagsRoutes = require('../routes/bookTags.routes');
const bookLocationsRoutes = require('../routes/bookLocations.routes');
const usersRoutes = require('../routes/users.routes');
const rolesRoutes = require('../routes/roles.routes');
const permissionsRoutes = require('../routes/permissions.routes');
const permissionResourcesRoutes = require('../routes/permissionResources.routes');
const borrowsRoutes = require('../routes/borrows.routes');
const reviewsRoutes = require('../routes/reviews.routes');
const pointsRoutes = require('../routes/points.routes');
const notificationsRoutes = require('../routes/notifications.routes');
const restoreRoutes = require('../routes/restore.routes');
const adminRoutes = require('../routes/admin.routes');
const dashboardRoutes = require('../routes/dashboard.routes');
// const proxyRoutes = require('../routes/proxy.routes'); // Temporarily disabled

/**
 * API信息端点
 */
const setupApiInfo = (app) => {
  // API根路径信息
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
        bookTags: '/api/v1/book-tags',
        bookLocations: '/api/v1/book-locations',
        users: '/api/v1/users',
        borrows: '/api/v1/borrows',
        reviews: '/api/v1/reviews',
        points: '/api/v1/points',
        permissionResources: '/api/v1/permission-resources',
        notifications: '/api/v1/notifications',
        restore: '/api/v1/restore',
        admin: '/api/v1/admin',
        dashboard: '/api/v1/dashboard',
        docs: config.app.environment === 'development' ? '/api/docs' : null,
      }
    });
  });

  // API v1版本信息
  app.get('/api/v1', (req, res) => {
    res.json({
      success: true,
      message: 'Library Management System API v1.0.0',
      data: {
        version: 'v1',
        name: 'Library Management System',
        description: '企业级图书管理系统API',
        environment: config.app.environment,
        endpoints: {
          auth: '/api/v1/auth',
          books: '/api/v1/books',
          bookCategories: '/api/v1/books/categories',
          bookTags: '/api/v1/book-tags',
          bookLocations: '/api/v1/book-locations',
          users: '/api/v1/users',
          borrows: '/api/v1/borrows',
          reviews: '/api/v1/reviews',
          points: '/api/v1/points',
          permissionResources: '/api/v1/permission-resources'
        }
      },
      timestamp: new Date().toISOString()
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
  app.use('/api/v1/book-tags', bookTagsRoutes);
  app.use('/api/v1/book-locations', bookLocationsRoutes);
  app.use('/api/v1/books', booksRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/permissions', permissionsRoutes);
  app.use('/api/v1/permission-resources', permissionResourcesRoutes);
  app.use('/api/v1/borrows', borrowsRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/points', pointsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/restore', restoreRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  // app.use('/api/v1/proxy', proxyRoutes); // Temporarily disabled
};

/**
 * 配置所有路由
 */
const configureRoutes = (app) => {
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
  setupStaticFiles,
  setupApiRoutes,
};
