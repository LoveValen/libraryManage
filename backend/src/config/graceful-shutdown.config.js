/**
 * 优雅关闭配置 - 遵循Express.js企业级最佳实践
 */

const { closeDatabase } = require('../utils/database');
const { logger } = require('../utils/logger');

/**
 * 优雅关闭处理器
 */
class GracefulShutdownHandler {
  constructor(server) {
    this.server = server;
    this.isShuttingDown = false;
    this.shutdownTimeout = 15000; // 15秒超时
    this.connections = new Set();
    
    // 跟踪活跃连接
    this.trackConnections();
    
    // 设置信号监听
    this.setupSignalHandlers();
    
    // 设置未捕获异常处理
    this.setupExceptionHandlers();
  }
  
  /**
   * 跟踪活跃连接
   */
  trackConnections() {
    this.server.on('connection', (connection) => {
      this.connections.add(connection);
      
      connection.on('close', () => {
        this.connections.delete(connection);
      });
    });
  }
  
  /**
   * 设置信号处理器
   */
  setupSignalHandlers() {
    // 优雅关闭信号
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    
    // Windows平台支持
    if (process.platform === 'win32') {
      process.on('SIGBREAK', () => this.gracefulShutdown('SIGBREAK'));
    }
  }
  
  /**
   * 设置异常处理器
   */
  setupExceptionHandlers() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
      this.emergencyShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
      this.emergencyShutdown('unhandledRejection');
    });
  }
  
  /**
   * 优雅关闭流程
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }
    
    this.isShuttingDown = true;
    
    console.log(`\n🛑 收到 ${signal} 信号，开始优雅关闭...`);
    logger.info('Graceful shutdown initiated', { signal, pid: process.pid });
    
    // 设置强制退出超时
    const forceExitTimer = setTimeout(() => {
      console.error('⏰ 强制退出：优雅关闭超时');
      logger.error('Forced exit: graceful shutdown timeout');
      process.exit(1);
    }, this.shutdownTimeout);
    
    try {
      // 1. 停止接受新连接
      await this.closeServer();
      
      // 2. 关闭现有连接
      await this.closeConnections();
      
      // 3. 停止后台服务
      await this.stopBackgroundServices();
      
      // 4. 关闭数据库连接
      await this.closeDatabaseConnections();
      
      // 5. 清理资源
      await this.cleanup();
      
      clearTimeout(forceExitTimer);
      console.log('✅ 优雅关闭完成');
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
      
    } catch (error) {
      clearTimeout(forceExitTimer);
      console.error('❌ 优雅关闭过程中出错:', error.message);
      logger.error('Error during graceful shutdown', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }
  
  /**
   * 紧急关闭
   */
  async emergencyShutdown(reason) {
    console.error(`💥 紧急关闭: ${reason}`);
    logger.error('Emergency shutdown triggered', { reason });
    
    try {
      // 快速关闭关键资源
      await Promise.race([
        this.closeDatabaseConnections(),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } catch (error) {
      logger.error('Error during emergency shutdown', { error: error.message });
    }
    
    process.exit(1);
  }
  
  /**
   * 关闭HTTP服务器
   */
  async closeServer() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('📡 HTTP服务器已关闭');
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }
  
  /**
   * 关闭活跃连接
   */
  async closeConnections() {
    if (this.connections.size === 0) {
      return;
    }
    
    console.log(`🔌 关闭 ${this.connections.size} 个活跃连接...`);
    
    for (const connection of this.connections) {
      connection.destroy();
    }
    
    this.connections.clear();
    logger.info('All connections closed');
  }
  
  /**
   * 停止后台服务
   */
  async stopBackgroundServices() {
    try {
      // 尝试停止健康监控服务
      const healthMonitoringService = require('../services/healthMonitoring.service');
      if (healthMonitoringService && healthMonitoringService.isRunning) {
        await healthMonitoringService.stop();
        console.log('🔍 健康监控服务已停止');
      }
      
      // 备份服务已删除
      // const backupService = require('../services/backup.service');
      // if (backupService && backupService.isRunning) {
      //   await backupService.stop();
      //   console.log('💾 备份服务已停止');
      // }
      
      // 尝试停止恢复服务
      const restoreService = require('../services/restore.service');
      if (restoreService && restoreService.isRunning) {
        await restoreService.stop();
        console.log('🔄 恢复服务已停止');
      }
      
    } catch (error) {
      logger.warn('Error stopping background services', { error: error.message });
    }
  }
  
  /**
   * 关闭数据库连接
   */
  async closeDatabaseConnections() {
    try {
      await closeDatabase();
      console.log('💾 数据库连接已关闭');
      logger.info('Database connections closed');
    } catch (error) {
      console.error('❌ 关闭数据库连接时出错:', error.message);
      logger.error('Error closing database connections', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 清理资源
   */
  async cleanup() {
    // 清理临时文件、缓存等
    try {
      // 这里可以添加其他清理逻辑
      logger.info('Resource cleanup completed');
    } catch (error) {
      logger.warn('Error during cleanup', { error: error.message });
    }
  }
}

/**
 * 设置优雅关闭
 */
const setupGracefulShutdown = (server) => {
  new GracefulShutdownHandler(server);
  
  logger.info('Graceful shutdown handlers configured', {
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version
  });
};

module.exports = {
  setupGracefulShutdown,
  GracefulShutdownHandler,
};