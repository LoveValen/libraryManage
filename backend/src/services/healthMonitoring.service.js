const { logger } = require('../utils/logger');
const elasticsearchConfig = require('../config/elasticsearch.config');
const webSocketService = require('./websocket.service');
const notificationService = require('./notification.service');
const SystemHealthService = require('./systemHealth.service');
const AlertService = require('./alert.service');
const HealthCheckTemplateService = require('./healthCheckTemplate.service');
const UserService = require('./user.service');
const prisma = require('../utils/prisma');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * 系统健康监控服务
 */
class HealthMonitoringService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.alertInterval = null;
    this.activeChecks = new Map();
    this.healthCache = new Map();
    this.alertQueue = [];
    
    // 系统指标缓存
    this.metricsCache = {
      cpu: { values: [], lastUpdate: 0 },
      memory: { values: [], lastUpdate: 0 },
      disk: { values: [], lastUpdate: 0 }
    };
  }

  /**
   * 启动健康监控服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('健康监控服务已在运行');
      return;
    }

    try {
      logger.info('🚀 启动健康监控服务...');
      
      // 初始化健康检查模板
      await this.initializeHealthCheckTemplates();
      
      // 启动健康检查循环
      this.startHealthCheckLoop();
      
      // 启动告警处理循环
      this.startAlertProcessingLoop();
      
      // 启动系统指标收集
      this.startMetricsCollection();
      
      this.isRunning = true;
      logger.info('✅ 健康监控服务启动成功');
    } catch (error) {
      logger.error('❌ 健康监控服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止健康监控服务
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 停止健康监控服务...');
    
    // 清除定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
    
    // 停止所有活跃检查
    for (const [checkId, timeoutId] of this.activeChecks) {
      clearTimeout(timeoutId);
    }
    this.activeChecks.clear();
    
    this.isRunning = false;
    logger.info('✅ 健康监控服务已停止');
  }

  /**
   * 初始化健康检查模板
   */
  async initializeHealthCheckTemplates() {
    try {
      const createdTemplates = await HealthCheckTemplateService.createDefaultTemplates();
      if (createdTemplates.length > 0) {
        logger.info(`✅ 创建了 ${createdTemplates.length} 个默认健康检查模板`);
      }
    } catch (error) {
      logger.error('❌ 初始化健康检查模板失败:', error);
    }
  }

  /**
   * 启动健康检查循环
   */
  startHealthCheckLoop() {
    // 每30秒检查一次是否有需要执行的健康检查
    this.checkInterval = setInterval(async () => {
      try {
        await this.executeScheduledChecks();
      } catch (error) {
        logger.error('健康检查循环执行失败:', error);
      }
    }, 30 * 1000);
  }

  /**
   * 启动告警处理循环
   */
  startAlertProcessingLoop() {
    // 每分钟处理一次告警队列和升级
    this.alertInterval = setInterval(async () => {
      try {
        await this.processAlertQueue();
        await this.processAlertEscalations();
      } catch (error) {
        logger.error('告警处理循环执行失败:', error);
      }
    }, 60 * 1000);
  }

  /**
   * 启动系统指标收集
   */
  startMetricsCollection() {
    // 每分钟收集一次系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60 * 1000);
    
    // 立即收集一次
    this.collectSystemMetrics();
  }

  /**
   * 执行计划的健康检查
   */
  async executeScheduledChecks() {
    const templates = await HealthCheckTemplateService.getTemplatesForExecution();
    
    for (const template of templates) {
      if (!this.activeChecks.has(template.id)) {
        this.executeHealthCheck(template);
      }
    }
  }

  /**
   * 执行健康检查
   */
  async executeHealthCheck(template) {
    const checkId = `${template.checkType}_${template.name}_${Date.now()}`;
    const startTime = performance.now();
    
    try {
      // 标记检查为活跃状态
      const timeoutId = setTimeout(() => {
        this.activeChecks.delete(template.id);
      }, template.timeoutSeconds * 1000);
      
      this.activeChecks.set(template.id, timeoutId);
      
      logger.debug(`开始执行健康检查: ${template.name}`);
      
      let result;
      
      // 根据检查类型执行不同的检查方法
      switch (template.checkType) {
        case 'database':
          result = await this.checkDatabaseHealth(template);
          break;
        case 'elasticsearch':
          result = await this.checkElasticsearchHealth(template);
          break;
        case 'memory':
          result = await this.checkMemoryHealth(template);
          break;
        case 'cpu':
          result = await this.checkCPUHealth(template);
          break;
        case 'disk':
          result = await this.checkDiskHealth(template);
          break;
        case 'api_response':
          result = await this.checkAPIResponseHealth(template);
          break;
        case 'websocket':
          result = await this.checkWebSocketHealth(template);
          break;
        case 'custom':
          result = await this.executeCustomCheck(template);
          break;
        default:
          throw new Error(`未支持的检查类型: ${template.checkType}`);
      }
      
      const responseTime = Math.round(performance.now() - startTime);
      
      // 记录健康检查结果
      await this.recordHealthCheckResult(template, result, responseTime, checkId);
      
      // 检查是否需要触发告警
      await this.evaluateAlertConditions(template, result);
      
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      
      logger.error(`健康检查执行失败 [${template.name}]:`, error);
      
      // 记录失败结果
      await this.recordHealthCheckResult(template, {
        status: 'critical',
        error: error.message
      }, responseTime, checkId);
      
      // 触发告警
      await this.createAlert({
        alertType: 'health_check_failed',
        severity: 'high',
        title: `健康检查失败: ${template.name}`,
        description: `健康检查 "${template.name}" 执行失败: ${error.message}`,
        source: {
          templateId: template.id,
          checkType: template.checkType,
          checkId
        }
      });
      
    } finally {
      // 清除活跃检查标记
      this.activeChecks.delete(template.id);
    }
  }

  /**
   * 检查数据库健康状态
   */
  async checkDatabaseHealth(template) {
    try {
      const startTime = performance.now();
      
      // 测试Prisma数据库连接
      await prisma.$queryRaw`SELECT 1 as test`;
      
      const responseTime = performance.now() - startTime;
      
      // 检查响应时间阈值
      let status = 'healthy';
      if (responseTime > template.thresholds?.responseTime?.critical) {
        status = 'critical';
      } else if (responseTime > template.thresholds?.responseTime?.warning) {
        status = 'warning';
      }
      
      return {
        status,
        details: {
          connectionStatus: 'connected',
          testQuery: true,
          responseTime: Math.round(responseTime)
        },
        metrics: {
          responseTime: Math.round(responseTime),
          connectionPool: await this.getDatabaseConnectionPoolInfo()
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message,
        details: {
          connectionStatus: 'failed'
        }
      };
    }
  }

  /**
   * 检查Elasticsearch健康状态
   */
  async checkElasticsearchHealth(template) {
    try {
      const healthInfo = await elasticsearchConfig.healthCheck();
      
      if (healthInfo.status === 'connected') {
        return {
          status: 'healthy',
          details: healthInfo.cluster,
          metrics: {
            clusterHealth: healthInfo.cluster.status,
            activeShards: healthInfo.cluster.active_shards,
            relocatingShards: healthInfo.cluster.relocating_shards,
            unassignedShards: healthInfo.cluster.unassigned_shards
          }
        };
      } else {
        return {
          status: 'critical',
          error: healthInfo.message,
          details: healthInfo
        };
      }
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message,
        details: {
          service: 'elasticsearch',
          available: false
        }
      };
    }
  }

  /**
   * 检查内存健康状态
   */
  async checkMemoryHealth(template) {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usagePercentage = (usedMemory / totalMemory) * 100;
      
      // 获取进程内存信息
      const processMemory = process.memoryUsage();
      
      let status = 'healthy';
      if (usagePercentage > template.thresholds?.usage?.critical) {
        status = 'critical';
      } else if (usagePercentage > template.thresholds?.usage?.warning) {
        status = 'warning';
      }
      
      return {
        status,
        details: {
          totalMemory: Math.round(totalMemory / 1024 / 1024),
          freeMemory: Math.round(freeMemory / 1024 / 1024),
          usedMemory: Math.round(usedMemory / 1024 / 1024),
          usagePercentage: Math.round(usagePercentage * 100) / 100
        },
        metrics: {
          systemMemoryUsage: usagePercentage,
          processMemory: {
            rss: Math.round(processMemory.rss / 1024 / 1024),
            heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024),
            heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024),
            external: Math.round(processMemory.external / 1024 / 1024)
          }
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 检查CPU健康状态
   */
  async checkCPUHealth(template) {
    try {
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = os.loadavg();
      const cpuCount = os.cpus().length;
      
      let status = 'healthy';
      if (cpuUsage > template.thresholds?.usage?.critical) {
        status = 'critical';
      } else if (cpuUsage > template.thresholds?.usage?.warning) {
        status = 'warning';
      }
      
      return {
        status,
        details: {
          cpuUsage: Math.round(cpuUsage * 100) / 100,
          loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
          cpuCount
        },
        metrics: {
          cpuUsage,
          loadAverage1min: loadAverage[0],
          loadAverage5min: loadAverage[1],
          loadAverage15min: loadAverage[2],
          loadAverageRatio: loadAverage[0] / cpuCount
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 检查磁盘健康状态
   */
  async checkDiskHealth(template) {
    try {
      const paths = template.config?.paths || ['/'];
      const diskInfo = [];
      let overallStatus = 'healthy';
      
      for (const diskPath of paths) {
        try {
          const stats = await fs.promises.stat(diskPath);
          if (stats.isDirectory()) {
            const diskUsage = await this.getDiskUsage(diskPath);
            diskInfo.push(diskUsage);
            
            if (diskUsage.usagePercentage > template.thresholds?.usage?.critical) {
              overallStatus = 'critical';
            } else if (diskUsage.usagePercentage > template.thresholds?.usage?.warning && overallStatus !== 'critical') {
              overallStatus = 'warning';
            }
          }
        } catch (pathError) {
          logger.warn(`无法检查磁盘路径 ${diskPath}:`, pathError.message);
        }
      }
      
      return {
        status: overallStatus,
        details: {
          disks: diskInfo
        },
        metrics: {
          diskUsage: diskInfo.reduce((total, disk) => total + disk.usagePercentage, 0) / diskInfo.length
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 检查API响应健康状态
   */
  async checkAPIResponseHealth(template) {
    try {
      const endpoints = template.config?.endpoints || ['/api/health'];
      const results = [];
      let totalResponseTime = 0;
      let successCount = 0;
      
      for (const endpoint of endpoints) {
        try {
          const startTime = performance.now();
          
          // 这里应该实际调用API，简化为模拟
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          const responseTime = performance.now() - startTime;
          totalResponseTime += responseTime;
          successCount++;
          
          results.push({
            endpoint,
            success: true,
            responseTime: Math.round(responseTime)
          });
          
        } catch (endpointError) {
          results.push({
            endpoint,
            success: false,
            error: endpointError.message
          });
        }
      }
      
      const avgResponseTime = totalResponseTime / endpoints.length;
      const successRate = (successCount / endpoints.length) * 100;
      
      let status = 'healthy';
      if (successRate < template.thresholds?.successRate?.critical || 
          avgResponseTime > template.thresholds?.responseTime?.critical) {
        status = 'critical';
      } else if (successRate < template.thresholds?.successRate?.warning || 
                 avgResponseTime > template.thresholds?.responseTime?.warning) {
        status = 'warning';
      }
      
      return {
        status,
        details: {
          endpoints: results,
          averageResponseTime: Math.round(avgResponseTime),
          successRate: Math.round(successRate * 100) / 100
        },
        metrics: {
          responseTime: avgResponseTime,
          successRate,
          endpointCount: endpoints.length,
          successfulEndpoints: successCount
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 检查WebSocket健康状态
   */
  async checkWebSocketHealth(template) {
    try {
      const connectionCount = webSocketService.getConnectionCount();
      const connectionsByRoom = webSocketService.getConnectionsByRoom();
      
      let status = 'healthy';
      if (connectionCount > template.thresholds?.activeConnections?.critical) {
        status = 'critical';
      } else if (connectionCount > template.thresholds?.activeConnections?.warning) {
        status = 'warning';
      }
      
      return {
        status,
        details: {
          activeConnections: connectionCount,
          connectionsByRoom,
          isServiceAvailable: webSocketService.isAvailable()
        },
        metrics: {
          activeConnections: connectionCount,
          roomCount: Object.keys(connectionsByRoom).length
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 执行自定义检查
   */
  async executeCustomCheck(template) {
    try {
      if (!template.checkScript) {
        throw new Error('自定义检查缺少检查脚本');
      }
      
      // 这里应该安全地执行自定义脚本
      // 为了安全考虑，这里只是模拟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        status: 'healthy',
        details: {
          script: template.checkScript,
          executed: true
        }
      };
      
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * 记录健康检查结果
   */
  async recordHealthCheckResult(template, result, responseTime, checkId) {
    try {
      // 更新模板状态
      const isSuccess = result.status === 'healthy' || result.status === 'warning';
      await template.updateCheckStatus(result.status, isSuccess);
      
      // 记录详细的健康检查结果
      await SystemHealthService.create({
        checkType: template.checkType,
        checkName: template.name,
        status: result.status,
        responseTime,
        errorMessage: result.error || null,
        details: result.details || null,
        metrics: result.metrics || null
      });
      
      // 更新缓存
      this.healthCache.set(`${template.checkType}_${template.name}`, {
        ...result,
        responseTime,
        timestamp: new Date()
      });
      
      logger.debug(`健康检查完成: ${template.name} - ${result.status}`);
      
    } catch (error) {
      logger.error('记录健康检查结果失败:', error);
    }
  }

  /**
   * 评估告警条件
   */
  async evaluateAlertConditions(template, result) {
    if (!template.shouldTriggerAlert()) {
      return;
    }
    
    // 创建告警
    await this.createAlert({
      alertType: this.getAlertTypeForHealth(template.checkType, result.status),
      severity: template.alertRules.severity || 'medium',
      title: `${template.name} 健康状态异常`,
      description: `健康检查 "${template.name}" 状态为 ${result.status}${result.error ? ': ' + result.error : ''}`,
      source: {
        templateId: template.id,
        checkType: template.checkType,
        checkName: template.name
      },
      metrics: result.metrics,
      threshold: template.thresholds,
      suggestedActions: this.getSuggestedActions(template.checkType, result.status)
    });
  }

  /**
   * 创建告警
   */
  async createAlert(alertData) {
    try {
      const { alert, created } = await AlertService.findOrCreateAlert(alertData);
      
      if (created) {
        // 添加到告警队列进行处理
        this.alertQueue.push(alert);
        
        logger.warn(`创建告警: ${alert.title} [${alert.severity}]`);
        
        // 发送实时通知
        this.broadcastAlert(alert);
      }
      
      return alert;
      
    } catch (error) {
      logger.error('创建告警失败:', error);
      throw error;
    }
  }

  /**
   * 处理告警队列
   */
  async processAlertQueue() {
    if (this.alertQueue.length === 0) {
      return;
    }
    
    const alertsToProcess = [...this.alertQueue];
    this.alertQueue = [];
    
    for (const alert of alertsToProcess) {
      try {
        await this.processAlert(alert);
      } catch (error) {
        logger.error(`处理告警失败 [${alert.id}]:`, error);
      }
    }
  }

  /**
   * 处理单个告警
   */
  async processAlert(alert) {
    // 发送通知
    if (!alert.notificationSent && alert.alertRules?.notificationChannels) {
      await this.sendAlertNotifications(alert);
      alert.notificationSent = true;
      await alert.save();
    }
    
    // 设置升级时间
    if (alert.status === 'active' && !alert.nextEscalationAt) {
      const escalationMinutes = alert.alertRules?.escalationMinutes || 30;
      alert.nextEscalationAt = new Date(Date.now() + escalationMinutes * 60 * 1000);
      await alert.save();
    }
  }

  /**
   * 发送告警通知
   */
  async sendAlertNotifications(alert) {
    try {
      const channels = alert.alertRules?.notificationChannels || ['system'];
      
      for (const channel of channels) {
        switch (channel) {
          case 'system':
            await this.sendSystemNotification(alert);
            break;
          case 'email':
            await this.sendEmailNotification(alert);
            break;
          case 'sms':
            await this.sendSMSNotification(alert);
            break;
        }
      }
      
    } catch (error) {
      logger.error('发送告警通知失败:', error);
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(alert) {
    try {
      // 向所有管理员发送系统通知
      const admins = await UserService.findAllByRoles(['admin', 'librarian']);
      
      for (const admin of admins) {
        await notificationService.createNotificationFromTemplate(
          'system_alert',
          admin.id,
          {
            alertTitle: alert.title,
            alertType: alert.alertType,
            severity: alert.severity,
            description: alert.description,
            timestamp: new Date().toLocaleString()
          }
        );
      }
      
    } catch (error) {
      logger.error('发送系统通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(alert) {
    // 实现邮件通知逻辑
    logger.info(`发送邮件告警通知: ${alert.title}`);
  }

  /**
   * 发送短信通知
   */
  async sendSMSNotification(alert) {
    // 实现短信通知逻辑
    logger.info(`发送短信告警通知: ${alert.title}`);
  }

  /**
   * 处理告警升级
   */
  async processAlertEscalations() {
    const alertsForEscalation = await AlertService.getAlertsForEscalation();
    
    for (const alert of alertsForEscalation) {
      try {
        await alert.escalate();
        
        // 重新发送通知
        await this.sendAlertNotifications(alert);
        
        logger.warn(`告警升级: ${alert.title} [级别: ${alert.escalationLevel}]`);
        
      } catch (error) {
        logger.error(`告警升级失败 [${alert.id}]:`, error);
      }
    }
  }

  /**
   * 广播告警到WebSocket客户端
   */
  broadcastAlert(alert) {
    if (webSocketService.isAvailable()) {
      webSocketService.broadcastToRole('admin', 'system_alert', {
        alert: alert.getSummary(),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    try {
      const now = Date.now();
      
      // 收集CPU指标
      this.getCPUUsage().then(cpuUsage => {
        this.updateMetricsCache('cpu', cpuUsage, now);
      });
      
      // 收集内存指标
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      this.updateMetricsCache('memory', memoryUsage, now);
      
      // 收集磁盘指标
      this.getDiskUsage('/').then(diskInfo => {
        this.updateMetricsCache('disk', diskInfo.usagePercentage, now);
      }).catch(() => {
        // 磁盘信息收集失败，忽略
      });
      
    } catch (error) {
      logger.error('收集系统指标失败:', error);
    }
  }

  /**
   * 更新指标缓存
   */
  updateMetricsCache(type, value, timestamp) {
    const cache = this.metricsCache[type];
    cache.values.push({ value, timestamp });
    cache.lastUpdate = timestamp;
    
    // 保持最近24小时的数据
    const cutoff = timestamp - 24 * 60 * 60 * 1000;
    cache.values = cache.values.filter(item => item.timestamp >= cutoff);
  }

  /**
   * 获取CPU使用率
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.getCPUInfo();
      
      setTimeout(() => {
        const endMeasure = this.getCPUInfo();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const cpuUsage = 100 - (100 * idleDifference / totalDifference);
        resolve(cpuUsage);
      }, 1000);
    });
  }

  /**
   * 获取CPU信息
   */
  getCPUInfo() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    
    for (let cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }
    
    const total = user + nice + sys + idle + irq;
    return { idle, total };
  }

  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage(diskPath) {
    try {
      const stats = await fs.promises.stat(diskPath);
      
      // 简化的磁盘使用率计算（在实际环境中应该使用 statvfs）
      return {
        path: diskPath,
        total: 100 * 1024 * 1024 * 1024, // 100GB 模拟
        used: 30 * 1024 * 1024 * 1024,   // 30GB 模拟
        available: 70 * 1024 * 1024 * 1024, // 70GB 模拟
        usagePercentage: 30
      };
    } catch (error) {
      throw new Error(`无法获取磁盘使用情况: ${error.message}`);
    }
  }

  /**
   * 获取数据库连接池信息
   */
  async getDatabaseConnectionPoolInfo() {
    try {
      return {
        max: 29, // Prisma默认连接数
        min: 2,
        used: 1, // 简化信息，实际Prisma不暴露这些详细信息
        waiting: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取告警类型
   */
  getAlertTypeForHealth(checkType, status) {
    const typeMap = {
      'database': 'database_connection',
      'elasticsearch': 'elasticsearch_error',
      'memory': 'memory_usage_high',
      'cpu': 'cpu_usage_high',
      'disk': 'disk_space_low',
      'api_response': 'api_response_slow',
      'websocket': 'service_unavailable'
    };
    
    return typeMap[checkType] || 'health_check_failed';
  }

  /**
   * 获取建议操作
   */
  getSuggestedActions(checkType, status) {
    const actionMap = {
      'database': [
        '检查数据库服务是否运行',
        '验证数据库连接配置',
        '检查数据库连接池设置',
        '查看数据库日志'
      ],
      'elasticsearch': [
        '检查Elasticsearch服务状态',
        '验证Elasticsearch配置',
        '检查集群健康状态',
        '查看Elasticsearch日志'
      ],
      'memory': [
        '查看内存使用详情',
        '重启高内存消耗的进程',
        '清理系统缓存',
        '考虑扩展内存'
      ],
      'cpu': [
        '查看CPU使用详情',
        '识别高CPU消耗的进程',
        '优化应用程序性能',
        '考虑扩展CPU资源'
      ],
      'disk': [
        '清理临时文件',
        '删除不必要的日志文件',
        '移动大文件到其他位置',
        '扩展磁盘空间'
      ]
    };
    
    return actionMap[checkType] || ['检查系统状态', '查看相关日志'];
  }

  /**
   * 获取整体健康状态
   */
  async getOverallHealthStatus() {
    return await SystemHealthService.getOverallHealth();
  }

  /**
   * 获取健康趋势
   */
  async getHealthTrend(checkType, checkName, hours = 24) {
    return await SystemHealthService.getHealthTrend(checkType, checkName, hours);
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(checkType, checkName, hours = 24) {
    return await SystemHealthService.getPerformanceStats(checkType, checkName, hours);
  }

  /**
   * 获取告警统计
   */
  async getAlertStatistics(timeRange = 24) {
    return await AlertService.getAlertStatistics(timeRange);
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics() {
    return {
      cpu: this.metricsCache.cpu.values.slice(-60), // 最近60分钟
      memory: this.metricsCache.memory.values.slice(-60),
      disk: this.metricsCache.disk.values.slice(-60),
      lastUpdate: Math.max(
        this.metricsCache.cpu.lastUpdate,
        this.metricsCache.memory.lastUpdate,
        this.metricsCache.disk.lastUpdate
      )
    };
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData() {
    try {
      const healthDeleted = await SystemHealthService.cleanupOldRecords(30);
      const alertsDeleted = await AlertService.cleanupOldAlerts(90);
      
      logger.info(`清理完成: ${healthDeleted} 条健康记录, ${alertsDeleted} 条告警记录`);
      
    } catch (error) {
      logger.error('清理旧数据失败:', error);
    }
  }
}

// 创建单例实例
const healthMonitoringService = new HealthMonitoringService();

module.exports = healthMonitoringService;