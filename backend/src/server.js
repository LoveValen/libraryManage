#!/usr/bin/env node

/**
 * 图书馆管理系统后端服务器
 * 系统启动入口点
 */

require('dotenv').config();

const { createApp, setupGracefulShutdown } = require('./app');
// const { initializeDatabase } = require('./models'); // Old Sequelize
const { initializeDatabase } = require('./utils/database'); // New Prisma
const config = require('./config');
const { logger } = require('./utils/logger');
// const healthMonitoringService = require('./services/healthMonitoring.service');

/**
 * 启动服务器
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting Library Management System...');
    console.log(`📦 Environment: ${config.app.environment}`);
    console.log(`🎯 Version: ${config.app.version}`);

    // 初始化数据库
    console.log('💾 Initializing database...');
    await initializeDatabase();

    // 暂时禁用健康监控服务
    console.log('⚠️ Health monitoring service disabled temporarily');

    // 创建Express应用
    const app = createApp();

    // 启动HTTP服务器
    const server = app.listen(config.app.port, config.app.host, () => {
      console.log('✅ Server started successfully!');
      console.log(`🌐 Server running on: http://${config.app.host}:${config.app.port}`);
      console.log(`📚 API Base URL: http://${config.app.host}:${config.app.port}/api/v1`);
      console.log(`🏥 Health Check: http://${config.app.host}:${config.app.port}/health`);
      
      if (config.app.environment === 'development') {
        console.log(`📖 API Docs: http://${config.app.host}:${config.app.port}/api/docs`);
      }

      console.log('🎉 Library Management System is ready to serve!');
      console.log('─'.repeat(60));
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒

    // 设置优雅关闭
    setupGracefulShutdown(server);

    // 记录启动成功
    logger.info('Server started successfully', {
      port: config.app.port,
      host: config.app.host,
      environment: config.app.environment,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

/**
 * 检查必要的环境变量
 */
const checkEnvironment = () => {
  const requiredEnvVars = [];

  if (config.app.environment === 'production') {
    requiredEnvVars.push(
      'JWT_SECRET',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME'
    );
  }

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('Please check your .env file configuration.');
    process.exit(1);
  }
};

/**
 * 检查Node.js版本
 */
const checkNodeVersion = () => {
  const requiredVersion = '16.0.0';
  const currentVersion = process.version.slice(1); // 移除'v'前缀

  const parseVersion = (version) => {
    return version.split('.').map(Number);
  };

  const [reqMajor, reqMinor, reqPatch] = parseVersion(requiredVersion);
  const [curMajor, curMinor, curPatch] = parseVersion(currentVersion);

  const isVersionValid = 
    curMajor > reqMajor ||
    (curMajor === reqMajor && curMinor > reqMinor) ||
    (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);

  if (!isVersionValid) {
    console.error(`❌ Node.js version ${requiredVersion} or higher is required.`);
    console.error(`   Current version: ${currentVersion}`);
    process.exit(1);
  }
};

/**
 * 显示启动横幅
 */
const showBanner = () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║           📚 Library Management System API 📚            ║');
  console.log('║                                                          ║');
  console.log('║                    现代图书馆管理系统                        ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
};

/**
 * 主启动函数
 */
const main = async () => {
  // 显示启动横幅
  showBanner();

  // 环境检查
  console.log('🔍 Checking environment...');
  checkNodeVersion();
  checkEnvironment();

  // 启动服务器
  await startServer();
};

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error during startup:', error);
    process.exit(1);
  });
}

module.exports = {
  startServer,
  main,
};