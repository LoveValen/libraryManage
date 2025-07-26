const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const healthMonitoringService = require('../services/healthMonitoring.service');
const { initHealthNotificationTemplates } = require('./initHealthNotificationTemplates');

/**
 * 初始化健康监控系统
 */
async function initHealthMonitoring() {
  try {
    logger.info('🚀 开始初始化健康监控系统...');

    // 1. 确保数据库表已创建
    await ensureDatabaseTables();

    // 2. 初始化健康检查模板
    await initializeDefaultHealthCheckTemplates();

    // 3. 初始化健康监控通知模板
    await initHealthNotificationTemplates();

    // 4. 清理旧数据
    await cleanupOldData();

    // 5. 启动健康监控服务
    await startHealthMonitoringService();

    logger.info('✅ 健康监控系统初始化完成');
    return true;

  } catch (error) {
    logger.error('❌ 健康监控系统初始化失败:', error);
    throw error;
  }
}

/**
 * 确保数据库表已创建
 */
async function ensureDatabaseTables() {
  try {
    logger.info('🔄 检查健康监控数据库表...');

    // 同步健康监控相关的模型
    await models.SystemHealth.sync({ alter: true });
    await models.Alert.sync({ alter: true });
    await models.HealthCheckTemplate.sync({ alter: true });

    logger.info('✅ 健康监控数据库表检查完成');
  } catch (error) {
    logger.error('❌ 健康监控数据库表检查失败:', error);
    throw error;
  }
}

/**
 * 初始化默认健康检查模板
 */
async function initializeDefaultHealthCheckTemplates() {
  try {
    logger.info('🔄 初始化默认健康检查模板...');

    const defaultTemplates = [
      {
        name: 'database_connection',
        checkType: 'database',
        description: '数据库连接健康检查',
        enabled: true,
        intervalSeconds: 30,
        timeoutSeconds: 10,
        retryCount: 3,
        failureThreshold: 3,
        successThreshold: 2,
        thresholds: {
          responseTime: { 
            warning: 500, 
            critical: 2000 
          },
          successRate: { 
            warning: 98, 
            critical: 95 
          }
        },
        alertRules: {
          enabled: true,
          severity: 'critical',
          escalationMinutes: 15,
          suppressDuplicates: true,
          notificationChannels: ['system', 'email']
        },
        config: {
          testQuery: 'SELECT 1',
          checkConnectionPool: true
        },
        environment: 'production',
        serviceTags: ['database', 'core']
      },
      {
        name: 'elasticsearch_health',
        checkType: 'elasticsearch',
        description: 'Elasticsearch服务健康检查',
        enabled: true,
        intervalSeconds: 60,
        timeoutSeconds: 15,
        retryCount: 3,
        failureThreshold: 2,
        successThreshold: 1,
        thresholds: {
          responseTime: { 
            warning: 1000, 
            critical: 3000 
          },
          clusterHealth: {
            warning: 'yellow',
            critical: 'red'
          }
        },
        alertRules: {
          enabled: true,
          severity: 'high',
          escalationMinutes: 30,
          suppressDuplicates: true,
          notificationChannels: ['system', 'email']
        },
        config: {
          checkClusterHealth: true,
          checkIndices: true
        },
        environment: 'production',
        serviceTags: ['elasticsearch', 'search']
      },
      {
        name: 'system_memory',
        checkType: 'memory',
        description: '系统内存使用率检查',
        enabled: true,
        intervalSeconds: 120,
        timeoutSeconds: 5,
        retryCount: 2,
        failureThreshold: 3,
        successThreshold: 2,
        thresholds: {
          usage: { 
            warning: 80, 
            critical: 90 
          }
        },
        alertRules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 60,
          suppressDuplicates: true,
          notificationChannels: ['system']
        },
        config: {
          checkProcess: true,
          includeBuffers: false
        },
        environment: 'production',
        serviceTags: ['system', 'performance']
      },
      {
        name: 'system_cpu',
        checkType: 'cpu',
        description: '系统CPU使用率检查',
        enabled: true,
        intervalSeconds: 120,
        timeoutSeconds: 5,
        retryCount: 2,
        failureThreshold: 3,
        successThreshold: 2,
        thresholds: {
          usage: { 
            warning: 80, 
            critical: 95 
          }
        },
        alertRules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 60,
          suppressDuplicates: true,
          notificationChannels: ['system']
        },
        config: {
          averageMinutes: 5,
          includeLoadAverage: true
        },
        environment: 'production',
        serviceTags: ['system', 'performance']
      },
      {
        name: 'disk_space',
        checkType: 'disk',
        description: '磁盘空间使用检查',
        enabled: true,
        intervalSeconds: 300,
        timeoutSeconds: 10,
        retryCount: 2,
        failureThreshold: 2,
        successThreshold: 1,
        thresholds: {
          usage: { 
            warning: 80, 
            critical: 90 
          }
        },
        alertRules: {
          enabled: true,
          severity: 'high',
          escalationMinutes: 120,
          suppressDuplicates: true,
          notificationChannels: ['system', 'email']
        },
        config: {
          paths: ['/'],
          includeInodes: true
        },
        environment: 'production',
        serviceTags: ['system', 'storage']
      },
      {
        name: 'api_response_time',
        checkType: 'api_response',
        description: 'API响应时间检查',
        enabled: true,
        intervalSeconds: 180,
        timeoutSeconds: 30,
        retryCount: 3,
        failureThreshold: 3,
        successThreshold: 2,
        thresholds: {
          responseTime: { 
            warning: 2000, 
            critical: 5000 
          },
          successRate: { 
            warning: 95, 
            critical: 90 
          }
        },
        alertRules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 45,
          suppressDuplicates: true,
          notificationChannels: ['system']
        },
        config: {
          endpoints: ['/api/health', '/api/books', '/api/users'],
          expectedStatusCodes: [200],
          followRedirects: false
        },
        environment: 'production',
        serviceTags: ['api', 'performance']
      },
      {
        name: 'websocket_connections',
        checkType: 'websocket',
        description: 'WebSocket连接状态检查',
        enabled: true,
        intervalSeconds: 180,
        timeoutSeconds: 15,
        retryCount: 2,
        failureThreshold: 3,
        successThreshold: 2,
        thresholds: {
          activeConnections: { 
            warning: 1000, 
            critical: 1500 
          },
          connectionRate: {
            warning: 100,
            critical: 200
          }
        },
        alertRules: {
          enabled: true,
          severity: 'low',
          escalationMinutes: 90,
          suppressDuplicates: true,
          notificationChannels: ['system']
        },
        config: {
          checkConnectionCount: true,
          checkRoomDistribution: true
        },
        environment: 'production',
        serviceTags: ['websocket', 'realtime']
      }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const templateData of defaultTemplates) {
      try {
        const [template, created] = await models.HealthCheckTemplate.findOrCreate({
          where: { name: templateData.name },
          defaults: templateData
        });

        if (created) {
          createdCount++;
          logger.info(`✅ 创建健康检查模板: ${template.name}`);
        } else {
          // 更新现有模板的配置（保留用户自定义的设置）
          const updatedFields = {};
          if (template.description !== templateData.description) {
            updatedFields.description = templateData.description;
          }
          if (template.config && templateData.config) {
            updatedFields.config = { ...template.config, ...templateData.config };
          }
          
          if (Object.keys(updatedFields).length > 0) {
            await template.update(updatedFields);
            updatedCount++;
            logger.info(`🔄 更新健康检查模板: ${template.name}`);
          } else {
            logger.debug(`⏭️ 健康检查模板已存在且无需更新: ${template.name}`);
          }
        }
      } catch (error) {
        logger.error(`❌ 处理健康检查模板失败 [${templateData.name}]:`, error);
      }
    }

    logger.info(`✅ 健康检查模板初始化完成: 创建 ${createdCount} 个，更新 ${updatedCount} 个`);
    return { created: createdCount, updated: updatedCount };

  } catch (error) {
    logger.error('❌ 初始化健康检查模板失败:', error);
    throw error;
  }
}

/**
 * 清理旧数据
 */
async function cleanupOldData() {
  try {
    logger.info('🔄 清理健康监控旧数据...');

    // 清理30天前的健康检查记录
    const healthDeleted = await models.SystemHealth.cleanupOldRecords(30);
    
    // 清理90天前的已解决告警
    const alertsDeleted = await models.Alert.cleanupOldAlerts(90);

    logger.info(`✅ 数据清理完成: 健康记录 ${healthDeleted} 条，告警记录 ${alertsDeleted} 条`);

  } catch (error) {
    logger.error('❌ 清理旧数据失败:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

/**
 * 启动健康监控服务
 */
async function startHealthMonitoringService() {
  try {
    if (process.env.NODE_ENV === 'test') {
      logger.info('⏭️ 测试环境，跳过启动健康监控服务');
      return;
    }

    logger.info('🔄 启动健康监控服务...');
    
    await healthMonitoringService.start();
    
    // 设置进程退出时的清理
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信号，正在关闭健康监控服务...`);
      try {
        await healthMonitoringService.stop();
        logger.info('✅ 健康监控服务已关闭');
        process.exit(0);
      } catch (error) {
        logger.error('❌ 关闭健康监控服务失败:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ 启动健康监控服务失败:', error);
    throw error;
  }
}

/**
 * 获取健康监控系统状态
 */
async function getHealthMonitoringStatus() {
  try {
    const [
      overallHealth,
      activeAlerts,
      enabledTemplates,
      systemMetrics
    ] = await Promise.all([
      healthMonitoringService.getOverallHealthStatus(),
      models.Alert.getActiveAlerts(),
      models.HealthCheckTemplate.getEnabledTemplates(),
      healthMonitoringService.getSystemMetrics()
    ]);

    return {
      serviceRunning: healthMonitoringService.isRunning,
      overallHealth,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: activeAlerts.filter(a => a.severity === 'critical').length,
      enabledChecksCount: enabledTemplates.length,
      systemMetrics: {
        cpu: systemMetrics.cpu.slice(-1)[0]?.value || 0,
        memory: systemMetrics.memory.slice(-1)[0]?.value || 0,
        disk: systemMetrics.disk.slice(-1)[0]?.value || 0
      },
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    logger.error('获取健康监控状态失败:', error);
    return {
      serviceRunning: false,
      error: error.message
    };
  }
}

/**
 * 重启健康监控服务
 */
async function restartHealthMonitoringService() {
  try {
    logger.info('🔄 重启健康监控服务...');
    
    await healthMonitoringService.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    await healthMonitoringService.start();
    
    logger.info('✅ 健康监控服务重启完成');
    return true;
  } catch (error) {
    logger.error('❌ 重启健康监控服务失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { initializeDatabase } = require('../models');
  
  (async () => {
    try {
      // 初始化数据库
      await initializeDatabase();
      
      // 初始化健康监控系统
      await initHealthMonitoring();
      
      // 显示状态
      const status = await getHealthMonitoringStatus();
      logger.info('健康监控系统状态:', status);
      
      logger.info('🎉 健康监控系统初始化脚本执行完成');
      
      // 如果是独立运行，保持进程运行
      if (process.argv.includes('--daemon')) {
        logger.info('🔄 以守护进程模式运行...');
        // 进程将保持运行，直到收到退出信号
      } else {
        // 正常退出
        process.exit(0);
      }
      
    } catch (error) {
      logger.error('健康监控系统初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  initHealthMonitoring,
  getHealthMonitoringStatus,
  restartHealthMonitoringService,
  ensureDatabaseTables,
  initializeDefaultHealthCheckTemplates,
  cleanupOldData,
  startHealthMonitoringService
};