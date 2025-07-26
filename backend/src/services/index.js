const auditLoggingService = require('./auditLogging.service');
const securityMonitoringService = require('./securityMonitoring.service');
const recommendationService = require('./recommendation.service');
const behaviorTrackingService = require('./behaviorTracking.service');
const { logger } = require('../utils/logger');

/**
 * 服务管理器 - 统一管理所有后台服务的启动和停止
 */
class ServiceManager {
  constructor() {
    this.services = new Map();
    this.isRunning = false;
    this.initializationOrder = [
      'auditLogging',
      'securityMonitoring', 
      'behaviorTracking',
      'recommendation'
    ];
  }

  /**
   * 注册服务
   */
  registerServices() {
    // 注册审计日志服务
    this.services.set('auditLogging', {
      name: 'Audit Logging Service',
      service: auditLoggingService,
      dependencies: [],
      critical: true
    });

    // 注册安全监控服务
    this.services.set('securityMonitoring', {
      name: 'Security Monitoring Service',
      service: securityMonitoringService,
      dependencies: ['auditLogging'],
      critical: true
    });

    // 注册行为追踪服务
    this.services.set('behaviorTracking', {
      name: 'Behavior Tracking Service',
      service: behaviorTrackingService,
      dependencies: [],
      critical: false
    });

    // 注册推荐服务
    this.services.set('recommendation', {
      name: 'Recommendation Service',
      service: recommendationService,
      dependencies: ['behaviorTracking'],
      critical: false
    });
  }

  /**
   * 启动所有服务
   */
  async startAll() {
    if (this.isRunning) {
      logger.warn('服务管理器已在运行中');
      return;
    }

    try {
      logger.info('🚀 开始启动所有服务...');
      
      // 注册服务
      this.registerServices();

      // 按依赖顺序启动服务
      const startedServices = [];
      
      for (const serviceId of this.initializationOrder) {
        const serviceConfig = this.services.get(serviceId);
        if (!serviceConfig) {
          logger.warn(`⚠️ 未找到服务: ${serviceId}`);
          continue;
        }

        try {
          logger.info(`🔄 启动服务: ${serviceConfig.name}...`);
          
          // 检查依赖
          await this.checkDependencies(serviceConfig.dependencies, startedServices);
          
          // 启动服务
          if (serviceConfig.service.start) {
            await serviceConfig.service.start();
          }
          
          startedServices.push(serviceId);
          logger.info(`✅ 服务启动成功: ${serviceConfig.name}`);
          
        } catch (error) {
          logger.error(`❌ 服务启动失败: ${serviceConfig.name}`, error);
          
          if (serviceConfig.critical) {
            logger.error('关键服务启动失败，停止启动流程');
            await this.stopServices(startedServices);
            throw new Error(`Critical service failed to start: ${serviceConfig.name}`);
          } else {
            logger.warn(`非关键服务启动失败，继续启动其他服务: ${serviceConfig.name}`);
          }
        }
      }

      // 设置服务间事件监听
      this.setupServiceInteractions();

      // 启动服务健康监控
      this.startHealthMonitoring();

      this.isRunning = true;
      logger.info(`🎉 所有服务启动完成，成功启动 ${startedServices.length} 个服务`);
      
      return {
        success: true,
        startedServices: startedServices.length,
        totalServices: this.services.size
      };

    } catch (error) {
      logger.error('❌ 服务启动过程中发生错误:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 停止所有服务
   */
  async stopAll() {
    if (!this.isRunning) {
      logger.warn('服务管理器未在运行');
      return;
    }

    try {
      logger.info('🛑 开始停止所有服务...');
      
      // 停止健康监控
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // 按相反顺序停止服务
      const stopOrder = [...this.initializationOrder].reverse();
      const stoppedServices = [];

      for (const serviceId of stopOrder) {
        const serviceConfig = this.services.get(serviceId);
        if (!serviceConfig) continue;

        try {
          logger.info(`🔄 停止服务: ${serviceConfig.name}...`);
          
          if (serviceConfig.service.stop) {
            await serviceConfig.service.stop();
          }
          
          stoppedServices.push(serviceId);
          logger.info(`✅ 服务停止成功: ${serviceConfig.name}`);
          
        } catch (error) {
          logger.error(`❌ 服务停止失败: ${serviceConfig.name}`, error);
        }
      }

      this.isRunning = false;
      logger.info(`🎉 所有服务停止完成，成功停止 ${stoppedServices.length} 个服务`);
      
      return {
        success: true,
        stoppedServices: stoppedServices.length
      };

    } catch (error) {
      logger.error('❌ 服务停止过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 重启所有服务
   */
  async restartAll() {
    logger.info('🔄 重启所有服务...');
    await this.stopAll();
    await this.startAll();
    logger.info('✅ 所有服务重启完成');
  }

  /**
   * 检查服务依赖
   */
  async checkDependencies(dependencies, startedServices) {
    for (const dep of dependencies) {
      if (!startedServices.includes(dep)) {
        throw new Error(`Dependency not satisfied: ${dep}`);
      }
    }
  }

  /**
   * 停止指定的服务列表
   */
  async stopServices(serviceIds) {
    for (const serviceId of serviceIds.reverse()) {
      const serviceConfig = this.services.get(serviceId);
      if (serviceConfig && serviceConfig.service.stop) {
        try {
          await serviceConfig.service.stop();
          logger.info(`✅ 服务回滚停止: ${serviceConfig.name}`);
        } catch (error) {
          logger.error(`❌ 服务回滚停止失败: ${serviceConfig.name}`, error);
        }
      }
    }
  }

  /**
   * 设置服务间交互
   */
  setupServiceInteractions() {
    // 审计日志服务和安全监控服务的交互
    if (securityMonitoringService.isRunning && auditLoggingService.isRunning) {
      securityMonitoringService.on('securityEvent', async (event) => {
        try {
          await auditLoggingService.logSystemEvent(
            'security_event_detected',
            'SecurityEvent',
            `安全事件检测: ${event.eventType}`,
            {
              changes: event,
              riskLevel: event.severity === 'critical' ? 'critical' : 'high'
            }
          );
        } catch (error) {
          logger.error('记录安全事件到审计日志失败:', error);
        }
      });
    }

    // 行为追踪服务和推荐服务的交互
    if (behaviorTrackingService.isRunning && recommendationService.isRunning) {
      behaviorTrackingService.on('behaviorTracked', async (behavior) => {
        // 清理推荐缓存
        try {
          recommendationService.clearUserCache?.(behavior.userId);
        } catch (error) {
          logger.error('清理推荐缓存失败:', error);
        }
      });
    }

    // 推荐服务和审计日志服务的交互
    if (recommendationService.isRunning && auditLoggingService.isRunning) {
      recommendationService.on('recommendationGenerated', async (data) => {
        try {
          await auditLoggingService.logUserAction(
            'recommendation_generated',
            data.userId,
            'Recommendation',
            null,
            `生成推荐: ${data.algorithm}`,
            {
              changes: {
                algorithm: data.algorithm,
                count: data.recommendations.length,
                scenario: data.scenario
              }
            }
          );
        } catch (error) {
          logger.error('记录推荐生成到审计日志失败:', error);
        }
      });
    }

    logger.info('✅ 服务间交互设置完成');
  }

  /**
   * 启动健康监控
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.checkServicesHealth();
        
        // 如果有服务不健康，记录日志
        const unhealthyServices = Object.entries(healthStatus)
          .filter(([, status]) => status !== 'healthy')
          .map(([service]) => service);

        if (unhealthyServices.length > 0) {
          logger.warn(`⚠️ 发现不健康的服务: ${unhealthyServices.join(', ')}`);
          
          // 记录到审计日志
          if (auditLoggingService.isRunning) {
            await auditLoggingService.logSystemEvent(
              'service_health_warning',
              'ServiceManager',
              '服务健康检查发现问题',
              {
                changes: { unhealthyServices, healthStatus },
                riskLevel: 'medium'
              }
            );
          }
        }
      } catch (error) {
        logger.error('服务健康检查失败:', error);
      }
    }, 60000); // 每分钟检查一次

    logger.info('✅ 服务健康监控已启动');
  }

  /**
   * 检查所有服务健康状态
   */
  async checkServicesHealth() {
    const healthStatus = {};

    for (const [serviceId, serviceConfig] of this.services.entries()) {
      try {
        if (serviceConfig.service.isRunning !== undefined) {
          healthStatus[serviceId] = serviceConfig.service.isRunning ? 'healthy' : 'unhealthy';
        } else {
          healthStatus[serviceId] = 'unknown';
        }
      } catch (error) {
        healthStatus[serviceId] = 'error';
      }
    }

    return healthStatus;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    const status = {
      manager: {
        running: this.isRunning,
        servicesCount: this.services.size
      },
      services: {}
    };

    for (const [serviceId, serviceConfig] of this.services.entries()) {
      status.services[serviceId] = {
        name: serviceConfig.name,
        running: serviceConfig.service.isRunning || false,
        critical: serviceConfig.critical,
        dependencies: serviceConfig.dependencies
      };
    }

    return status;
  }

  /**
   * 优雅关闭处理
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`📡 接收到 ${signal} 信号，开始优雅关闭...`);
      
      try {
        await this.stopAll();
        logger.info('✅ 优雅关闭完成');
        process.exit(0);
      } catch (error) {
        logger.error('❌ 优雅关闭失败:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      logger.error('❌ 未捕获的异常:', error);
      try {
        await this.stopAll();
      } catch (stopError) {
        logger.error('❌ 停止服务时发生错误:', stopError);
      }
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('❌ 未处理的Promise拒绝:', reason);
      try {
        await this.stopAll();
      } catch (stopError) {
        logger.error('❌ 停止服务时发生错误:', stopError);
      }
      process.exit(1);
    });

    logger.info('✅ 优雅关闭处理器已设置');
  }
}

// 创建全局服务管理器实例
const serviceManager = new ServiceManager();

module.exports = {
  serviceManager,
  auditLoggingService,
  securityMonitoringService,
  recommendationService,
  behaviorTrackingService
};