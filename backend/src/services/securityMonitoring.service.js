const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');

/**
 * Security Monitoring Service - Prisma Implementation
 */
class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.securityRules = new Map();
    this.alertThresholds = new Map();
  }

  async start() {
    try {
      logger.info('🔒 启动安全监控服务...');
      this.isRunning = true;
      this.initializeSecurityRules();
      logger.info('✅ 安全监控服务启动成功');
    } catch (error) {
      logger.error('❌ 安全监控服务启动失败:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) return;
    try {
      logger.info('🛑 停止安全监控服务...');
      this.isRunning = false;
      logger.info('✅ 安全监控服务已停止');
    } catch (error) {
      logger.error('❌ 停止安全监控服务失败:', error);
    }
  }

  initializeSecurityRules() {
    // Initialize basic security monitoring rules
    this.securityRules.set('failed_login_attempts', {
      threshold: 5,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      action: 'alert'
    });
    
    this.securityRules.set('suspicious_activity', {
      threshold: 10,
      timeWindow: 60 * 60 * 1000, // 1 hour
      action: 'block'
    });
  }

  async logSecurityEvent(eventType, severity, details) {
    try {
      const event = await prisma.security_events.create({
        data: {
          eventType: eventType,
          severity,
          details,
          createdAt: new Date()
        }
      });

      // Emit security event for other services to handle
      this.emit('securityEvent', {
        eventType,
        severity,
        details,
        eventId: event.id
      });

      return event;
    } catch (error) {
      logger.error('记录安全事件失败:', error);
      throw error;
    }
  }
}

module.exports = new SecurityMonitoringService();