#!/usr/bin/env node

/**
 * 图书馆管理系统服务器 - 遵循Express.js企业级最佳实践
 * 职责：服务器启动、生命周期管理、环境检查
 */

require('dotenv').config();

const { createApp } = require('./app');
const { setupGracefulShutdown } = require('./config/graceful-shutdown.config');
const { initializeDatabase } = require('./utils/database');
const config = require('./config');
const { logger } = require('./utils/logger');

/**
 * 启动服务器 - 企业级启动流程
 */
const startServer = async () => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 启动图书馆管理系统...');
    console.log(`📦 环境: ${config.app.environment}`);
    console.log(`🎯 版本: ${config.app.version}`);
    console.log(`🏠 主机: ${config.app.host}:${config.app.port}`);
    console.log(`🐛 调试模式: ${config.app.environment === 'development' ? '开启' : '关闭'}`);

    // 1. 数据库初始化
    console.log('💾 初始化数据库连接...');
    await initializeDatabase();
    console.log('✅ 数据库连接成功');

    // 2. 创建Express应用
    console.log('⚙️  创建Express应用...');
    const app = createApp();
    console.log('✅ Express应用创建成功');

    // 3. 启动HTTP服务器
    const server = await new Promise((resolve, reject) => {
      const srv = app.listen(config.app.port, config.app.host, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(srv);
        }
      });

      srv.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`端口 ${config.app.port} 已被占用`));
        } else {
          reject(error);
        }
      });
    });

    // 4. 服务器配置优化
    server.timeout = 30000; // 30秒超时
    server.keepAliveTimeout = 65000; // Keep-alive超时
    server.headersTimeout = 66000; // 头部超时

    // 5. 设置优雅关闭
    setupGracefulShutdown(server);

    // 6. 启动成功日志
    const startupTime = Date.now() - startTime;
    
    console.log('\n🎉 系统启动成功！');
    console.log('─'.repeat(60));
    console.log(`🌐 服务器地址: http://${config.app.host}:${config.app.port}`);
    console.log(`📚 API基础URL: http://${config.app.host}:${config.app.port}/api/v1`);
    console.log(`🏥 健康检查: http://${config.app.host}:${config.app.port}/health`);
    
    if (config.app.environment === 'development') {
      console.log(`📖 API文档: http://${config.app.host}:${config.app.port}/api/docs`);
    }
    
    console.log(`⚡ 启动耗时: ${startupTime}ms`);
    console.log(`🔧 进程ID: ${process.pid}`);
    console.log(`💾 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('─'.repeat(60));
    console.log('📚 图书馆管理系统已就绪！');

    // 7. 结构化日志记录
    logger.info('Server started successfully', {
      port: config.app.port,
      host: config.app.host,
      environment: config.app.environment,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      startupTime,
      memoryUsage: process.memoryUsage(),
    });

    return server;

  } catch (error) {
    console.error('\n❌ 服务器启动失败:', error.message);
    
    // 特定错误处理
    if (error.code === 'EADDRINUSE') {
      console.error(`💡 解决方案: 请检查端口 ${config.app.port} 是否被其他进程占用`);
      console.error('   Windows: netstat -ano | findstr :' + config.app.port);
      console.error('   Linux/Mac: lsof -i :' + config.app.port);
    }
    
    logger.error('Server startup failed', { 
      error: error.message, 
      stack: error.stack,
      code: error.code 
    });
    
    process.exit(1);
  }
};

/**
 * 环境检查 - 企业级环境验证
 */
const checkEnvironment = () => {
  console.log('🔍 验证环境配置...');
  
  // 必需的环境变量
  const requiredEnvVars = [];
  const recommendedEnvVars = [];

  if (config.app.environment === 'production') {
    requiredEnvVars.push(
      'JWT_SECRET',
      'DB_HOST', 
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME'
    );
    
    recommendedEnvVars.push(
      'REDIS_URL',
      'SMTP_HOST',
      'SENTRY_DSN'
    );
  }

  // 检查必需变量
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('\n❌ 缺少必需的环境变量:');
    missingVars.forEach(varName => {
      console.error(`   ❌ ${varName}`);
    });
    console.error('\n💡 请检查 .env 文件配置');
    process.exit(1);
  }

  // 检查推荐变量
  const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);
  if (missingRecommended.length > 0 && config.app.environment === 'production') {
    console.warn('\n⚠️  缺少推荐的环境变量:');
    missingRecommended.forEach(varName => {
      console.warn(`   ⚠️  ${varName}`);
    });
  }

  console.log(`✅ 环境检查通过 (${config.app.environment})`);
};

/**
 * Node.js版本检查 - 企业级版本验证
 */
const checkNodeVersion = () => {
  const requiredVersion = '16.0.0';
  const recommendedVersion = '18.0.0';
  const currentVersion = process.version.slice(1);

  console.log(`🔍 检查Node.js版本... (当前: v${currentVersion})`);

  const parseVersion = (version) => {
    return version.split('.').map(Number);
  };

  const compareVersions = (current, required) => {
    const [curMajor, curMinor, curPatch] = parseVersion(current);
    const [reqMajor, reqMinor, reqPatch] = parseVersion(required);

    if (curMajor > reqMajor) return 1;
    if (curMajor < reqMajor) return -1;
    if (curMinor > reqMinor) return 1;
    if (curMinor < reqMinor) return -1;
    if (curPatch > reqPatch) return 1;
    if (curPatch < reqPatch) return -1;
    return 0;
  };

  // 检查最低版本要求
  if (compareVersions(currentVersion, requiredVersion) < 0) {
    console.error(`\n❌ Node.js版本过低！`);
    console.error(`   要求版本: v${requiredVersion}+`);
    console.error(`   当前版本: v${currentVersion}`);
    console.error(`   建议版本: v${recommendedVersion}+`);
    console.error('\n💡 请升级Node.js版本');
    process.exit(1);
  }

  // 检查推荐版本
  if (compareVersions(currentVersion, recommendedVersion) < 0) {
    console.warn(`⚠️  建议升级到Node.js v${recommendedVersion}+以获得更好的性能`);
  }

  console.log(`✅ Node.js版本检查通过 (v${currentVersion})`);
};

/**
 * 系统启动横幅 - 企业级展示
 */
const showBanner = () => {
  const banner = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          📚 Library Management System API 📚             ║
║                                                          ║
║                 现代图书馆管理系统 v${config.app.version || '1.0.0'}                   ║
║                                                          ║
║    🚀 企业级 • 🔒 安全 • ⚡ 高性能 • 🛡️ 可靠              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;
  
  console.log(banner);
  console.log(`🌍 环境: ${config.app.environment.toUpperCase()}`);
  console.log(`🐛 调试: ${config.app.environment === 'development' ? 'ON' : 'OFF'}`);
  console.log(`⚡ Node.js: ${process.version}`);
  console.log(`🏠 平台: ${process.platform} ${process.arch}`);
  console.log('');
};

/**
 * 主启动函数 - 企业级启动流程
 */
const main = async () => {
  try {
    // 1. 显示启动横幅
    showBanner();

    // 2. 系统环境检查
    console.log('🔍 开始系统检查...');
    checkNodeVersion();
    checkEnvironment();
    
    // 3. 系统资源检查
    checkSystemResources();
    
    // 4. 启动服务器
    console.log('🎯 所有检查通过，启动服务器...\n');
    const server = await startServer();
    
    // 5. 启动后的健康检查
    await performHealthCheck();
    
    return server;
    
  } catch (error) {
    console.error('\n💥 系统启动失败:', error.message);
    logger.error('System startup failed', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    process.exit(1);
  }
};

/**
 * 系统资源检查
 */
const checkSystemResources = () => {
  console.log('🔍 检查系统资源...');
  
  const memoryUsage = process.memoryUsage();
  const freeMemory = require('os').freemem();
  const totalMemory = require('os').totalmem();
  
  // 内存检查
  const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const freeMemoryMB = Math.round(freeMemory / 1024 / 1024);
  const totalMemoryMB = Math.round(totalMemory / 1024 / 1024);
  
  console.log(`📊 内存使用: ${usedMemoryMB}MB (系统可用: ${freeMemoryMB}MB/${totalMemoryMB}MB)`);
  
  // 检查可用内存
  if (freeMemoryMB < 256) {
    console.warn('⚠️  系统可用内存较低，可能影响性能');
  }
  
  // CPU核心检查
  const cpuCount = require('os').cpus().length;
  console.log(`🔢 CPU核心数: ${cpuCount}`);
  
  console.log('✅ 系统资源检查完成');
};

/**
 * 启动后健康检查
 */
const performHealthCheck = async () => {
  try {
    console.log('🔍 执行启动后健康检查...');
    
    const http = require('http');
    const url = `http://${config.app.host}:${config.app.port}/health`;
    
    await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ 健康检查通过');
          resolve();
        } else {
          reject(new Error(`健康检查失败: HTTP ${res.statusCode}`));
        }
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('健康检查超时'));
      });
    });
    
  } catch (error) {
    console.warn('⚠️  启动后健康检查失败:', error.message);
  }
};

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error during startup:', error);
    process.exit(1);
  });
}

/**
 * 导出模块函数
 */
module.exports = {
  main,
  startServer,
  checkEnvironment,
  checkNodeVersion,
  checkSystemResources,
  performHealthCheck,
}; 
 

