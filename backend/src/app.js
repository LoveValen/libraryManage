/**
 * Express应用配置 - 遵循企业级最佳实践
 * 关注点分离：只负责应用实例创建和组装
 */

const express = require('express');
const { configureAppMiddleware } = require('./middlewares/app.middleware');
const { configureRoutes } = require('./config/routes.config');
const { setupApiDocs } = require('./config/swagger.config');
const { notFoundHandler, setupErrorHandlers } = require('./middlewares/error.middleware');
const config = require('./config');

/**
 * 创建Express应用实例 - 工厂模式
 */
const createApp = () => {
  const app = express();

  // 1. 配置应用中间件 (安全、解析、日志等)
  configureAppMiddleware(app);

  // 2. 配置路由 (API路由、静态文件、健康检查)
  configureRoutes(app);

  // 3. 配置API文档 (仅开发环境)
  if (config.app.environment === 'development') {
    setupApiDocs(app);
  }

  // 4. 404处理
  app.use(notFoundHandler);

  // 5. 错误处理中间件链 (必须最后配置)
  setupErrorHandlers(app);

  return app;
};


/**
 * 导出应用工厂函数
 */
module.exports = {
  createApp,
};
