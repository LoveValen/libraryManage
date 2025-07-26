#!/usr/bin/env node

/**
 * 图书馆管理系统服务器启动文件
 * 支持Express HTTP服务器和WebSocket实时通信
 */

const http = require('http');
const config = require('./src/config');
const { logger } = require('./src/utils/logger');
const { createApp, setupGracefulShutdown } = require('./src/app');
const { initializeDatabase } = require('./src/models');
const webSocketService = require('./src/services/websocket.service');
const { initializeNotificationTemplates } = require('./src/scripts/init-templates');

/**
 * 启动服务器
 */
async function startServer() {
  try {
    logger.info('🚀 启动图书馆管理系统服务器...');

    // 初始化数据库
    await initializeDatabase();

    // 初始化通知模板
    await initializeNotificationTemplates();

    // 创建Express应用
    const app = createApp();

    // 创建HTTP服务器
    const server = http.createServer(app);

    // 初始化WebSocket服务
    webSocketService.initialize(server);

    // 启动服务器
    const port = config.app.port || 3000;
    server.listen(port, () => {
      logger.info(`🎉 服务器启动成功！`);
      logger.info(`📍 HTTP服务器: http://localhost:${port}`);
      logger.info(`🔗 WebSocket服务器: ws://localhost:${port}/socket.io/`);
      logger.info(`📊 API文档: http://localhost:${port}/api/docs`);
      logger.info(`🏥 健康检查: http://localhost:${port}/health`);
      logger.info(`🌍 环境: ${config.app.environment}`);
      logger.info(`📝 日志级别: ${config.logging.level}`);
    });

    // 设置优雅关闭
    setupGracefulShutdown(server);

    // 处理服务器错误
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // WebSocket连接事件监听
    webSocketService.io?.on('connection', (socket) => {
      logger.debug(`WebSocket连接建立: ${socket.id} (用户: ${socket.userId})`);
    });

    return server;
  } catch (error) {
    logger.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

/**
 * 开发环境热重载支持
 */
if (config.app.environment === 'development') {
  // 监听文件变化（可选）
  process.on('SIGUSR2', () => {
    logger.info('🔄 检测到文件变化，重启服务器...');
    process.kill(process.pid, 'SIGTERM');
  });
}

/**
 * 生产环境性能监控
 */
if (config.app.environment === 'production') {
  // 性能监控
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    logger.debug('性能监控', {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()) + 's'
    });
  }, 60000); // 每分钟记录一次
}

// 启动服务器
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('启动失败:', error);
    process.exit(1);
  });
}

module.exports = { startServer };