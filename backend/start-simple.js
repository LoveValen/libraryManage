#!/usr/bin/env node

/**
 * 简化启动脚本 - 跳过数据库连接
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./src/config');

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║           📚 Library Management System API 📚            ║');
console.log('║                  (简化启动模式)                           ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

const app = express();

// 基础中间件
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Library Management System API is running',
    timestamp: new Date().toISOString(),
    environment: config.app.environment,
    version: config.app.version
  });
});

// API基础路由
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Library Management System API',
    version: config.app.version,
    documentation: '/api/docs',
    health: '/health'
  });
});

// 测试路由
app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.app.environment === 'development' ? err.message : undefined
  });
});

// 启动服务器
const server = app.listen(config.app.port, () => {
  console.log('✅ 服务器启动成功!');
  console.log(`🌐 服务器运行在: http://localhost:${config.app.port}`);
  console.log(`📚 API基础URL: http://localhost:${config.app.port}/api/v1`);
  console.log(`🏥 健康检查: http://localhost:${config.app.port}/health`);
  console.log(`🧪 测试接口: http://localhost:${config.app.port}/api/v1/test`);
  console.log('');
  console.log('⚠️  注意: 当前为简化模式，数据库功能暂未启用');
  console.log('─'.repeat(60));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;