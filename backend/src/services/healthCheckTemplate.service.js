const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * 健康检查模板服务 (Prisma版本)
 */
class HealthCheckTemplateService {
  /**
   * 创建默认健康检查模板
   */
  static async createDefaultTemplates() {
    const defaultTemplates = [
      {
        name: '数据库连接检查',
        check_type: 'database',
        description: '检查MySQL数据库连接状态和响应时间',
        enabled: true,
        interval_seconds: 300, // 5分钟 = 300秒
        timeout_seconds: 30,
        retry_count: 3,
        thresholds: {
          responseTime: { warning: 1000, critical: 3000 }
        },
        alert_rules: {
          enabled: true,
          severity: 'high',
          escalationMinutes: 30,
          notificationChannels: ['system', 'email']
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: '内存使用率检查',
        check_type: 'memory',
        description: '监控系统内存使用率',
        enabled: true,
        interval_seconds: 120, // 2分钟 = 120秒
        timeout_seconds: 10,
        retry_count: 2,
        thresholds: {
          usage: { warning: 80, critical: 95 }
        },
        alert_rules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 60,
          notificationChannels: ['system']
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'CPU使用率检查',
        check_type: 'cpu',
        description: '监控系统CPU使用率',
        enabled: true,
        interval_seconds: 120, // 2分钟 = 120秒
        timeout_seconds: 10,
        retry_count: 2,
        thresholds: {
          usage: { warning: 70, critical: 90 }
        },
        alert_rules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 60,
          notificationChannels: ['system']
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: '磁盘空间检查',
        check_type: 'disk',
        description: '监控磁盘空间使用率',
        enabled: true,
        interval_seconds: 600, // 10分钟 = 600秒
        timeout_seconds: 15,
        retry_count: 2,
        config: {
          paths: ['/']
        },
        thresholds: {
          usage: { warning: 80, critical: 95 }
        },
        alert_rules: {
          enabled: true,
          severity: 'high',
          escalationMinutes: 30,
          notificationChannels: ['system', 'email']
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'API响应时间检查',
        check_type: 'api_response',
        description: '检查关键API端点响应时间',
        enabled: true,
        interval_seconds: 300, // 5分钟 = 300秒
        timeout_seconds: 30,
        retry_count: 3,
        config: {
          endpoints: ['/api/health', '/api/v1/auth/verify']
        },
        thresholds: {
          responseTime: { warning: 2000, critical: 5000 },
          successRate: { warning: 95, critical: 80 }
        },
        alert_rules: {
          enabled: true,
          severity: 'medium',
          escalationMinutes: 30,
          notificationChannels: ['system']
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'WebSocket连接检查',
        check_type: 'websocket',
        description: '检查WebSocket服务状态',
        enabled: true,
        interval_seconds: 180, // 3分钟 = 180秒
        timeout_seconds: 20,
        retry_count: 2,
        thresholds: {
          activeConnections: { warning: 1000, critical: 1500 }
        },
        alert_rules: {
          enabled: true,
          severity: 'low',
          escalationMinutes: 60,
          notificationChannels: ['system']
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const createdTemplates = [];

    for (const templateData of defaultTemplates) {
      try {
        // 检查是否已存在同名模板
        const existingTemplate = await prisma.health_check_templates.findFirst({
          where: { name: templateData.name }
        });

        if (!existingTemplate) {
          const template = await prisma.health_check_templates.create({
            data: templateData
          });
          createdTemplates.push(template);
        }
      } catch (error) {
        logger.error(`创建默认健康检查模板失败 [${templateData.name}]:`, error);
      }
    }

    return createdTemplates;
  }

  /**
   * 获取需要执行的模板
   */
  static async getTemplatesForExecution() {
    const now = new Date();
    
    const templates = await prisma.health_check_templates.findMany({
      where: {
        enabled: true,
        OR: [
          { last_check_at: null },
          {
            last_check_at: {
              lte: new Date(now.getTime() - 60 * 1000) // 至少1分钟前执行过
            }
          }
        ]
      }
    });

    return templates.filter(template => {
      if (!template.last_check_at) {
        return true; // 从未执行过
      }
      
      const timeSinceLastExecution = now - new Date(template.last_check_at);
      const intervalMs = template.interval_seconds * 1000;
      
      return timeSinceLastExecution >= intervalMs;
    }).map(template => ({
      id: template.id,
      name: template.name,
      checkType: template.check_type,
      description: template.description,
      enabled: template.enabled,
      intervalSeconds: template.interval_seconds, 
      timeoutSeconds: template.timeout_seconds,
      retryCount: template.retry_count,
      config: template.config,
      thresholds: template.thresholds,
      alertRules: template.alert_rules,
      checkScript: template.check_script,
      lastCheckAt: template.last_check_at,
      lastCheckStatus: template.last_check_status,
      consecutiveFailures: template.consecutive_failures,
      consecutiveSuccesses: template.consecutive_successes,
      // 添加方法
      updateCheckStatus: async (status, isSuccess) => {
        const updateData = {
          last_check_at: new Date(),
          last_check_status: status,
          updated_at: new Date()
        };

        if (isSuccess) {
          updateData.consecutive_successes = { increment: 1 };
          updateData.consecutive_failures = 0;
        } else {
          updateData.consecutive_failures = { increment: 1 };
          updateData.consecutive_successes = 0;
        }

        return await prisma.health_check_templates.update({
          where: { id: template.id },
          data: updateData
        });
      },
      shouldTriggerAlert: () => {
        if (!template.alert_rules?.enabled) {
          return false;
        }
        
        // 基于连续失败次数决定是否触发告警
        const maxFailures = template.failure_threshold || 3;
        return template.consecutive_failures >= maxFailures;
      }
    }));
  }

  /**
   * 获取所有模板
   */
  static async findAll(options = {}) {
    const where = {};
    
    if (options.enabled !== undefined) {
      where.enabled = options.enabled;
    }
    
    if (options.checkType) {
      where.check_type = options.checkType;
    }

    const templates = await prisma.health_check_templates.findMany({
      where,
      orderBy: [
        { check_type: 'asc' },
        { name: 'asc' }
      ],
      include: options.includeCreator ? {
        creator: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      } : undefined
    });

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      checkType: template.check_type,
      description: template.description,
      enabled: template.enabled,
      intervalSeconds: template.interval_seconds,
      timeoutSeconds: template.timeout_seconds,
      retryCount: template.retry_count,
      config: template.config,
      thresholds: template.thresholds,
      alertRules: template.alert_rules,
      checkScript: template.check_script,
      lastCheckAt: template.last_check_at,
      lastCheckStatus: template.last_check_status,
      consecutiveFailures: template.consecutive_failures,
      consecutiveSuccesses: template.consecutive_successes,
      createdBy: template.created_by,
      creator: template.creator,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      getConfigSummary: () => ({
        id: template.id,
        name: template.name,
        checkType: template.check_type,
        description: template.description,
        enabled: template.enabled,
        intervalMinutes: template.interval_minutes,
        timeoutSeconds: template.timeout_seconds,
        lastCheckStatus: template.last_check_status,
        lastCheckAt: template.last_check_at,
        thresholds: template.thresholds,
        alertRules: template.alert_rules
      })
    }));
  }

  /**
   * 根据ID查找模板
   */
  static async findById(templateId) {
    const template = await prisma.health_check_templates.findUnique({
      where: { id: templateId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      }
    });

    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      checkType: template.check_type,
      description: template.description,
      enabled: template.enabled,
      intervalSeconds: template.interval_seconds,
      timeoutSeconds: template.timeout_seconds,
      retryCount: template.retry_count,
      config: template.config,
      thresholds: template.thresholds,
      alertRules: template.alert_rules,
      checkScript: template.check_script,
      lastCheckAt: template.last_check_at,
      lastCheckStatus: template.last_check_status,
      consecutiveFailures: template.consecutive_failures,
      consecutiveSuccesses: template.consecutive_successes,
      createdBy: template.created_by,
      creator: template.creator,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      // 添加更新方法
      update: async (updateData) => {
        return await HealthCheckTemplateService.updateTemplate(template.id, updateData);
      },
      getConfigSummary: () => ({
        id: template.id,
        name: template.name,
        checkType: template.check_type,
        description: template.description,
        enabled: template.enabled,
        intervalMinutes: template.interval_minutes,
        timeoutSeconds: template.timeout_seconds,
        lastCheckStatus: template.last_check_status,
        lastCheckAt: template.last_check_at,
        thresholds: template.thresholds,
        alertRules: template.alert_rules
      })
    };
  }

  /**
   * 更新模板
   */
  static async updateTemplate(templateId, updateData) {
    const data = {};

    // 映射字段名
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.enabled !== undefined) data.enabled = updateData.enabled;
    if (updateData.intervalSeconds !== undefined) data.interval_seconds = updateData.intervalSeconds;
    if (updateData.timeoutSeconds !== undefined) data.timeout_seconds = updateData.timeoutSeconds;
    if (updateData.retryCount !== undefined) data.retry_count = updateData.retryCount;
    if (updateData.config !== undefined) data.config = updateData.config;
    if (updateData.thresholds !== undefined) data.thresholds = updateData.thresholds;
    if (updateData.alertRules !== undefined) data.alert_rules = updateData.alertRules;
    if (updateData.checkScript !== undefined) data.check_script = updateData.checkScript;

    data.updated_at = new Date();

    return await prisma.health_check_templates.update({
      where: { id: templateId },
      data
    });
  }

  /**
   * 创建新模板
   */
  static async create(templateData) {
    const data = {
      name: templateData.name,
      check_type: templateData.checkType,
      description: templateData.description || null,
      enabled: templateData.enabled !== undefined ? templateData.enabled : true,
      interval_seconds: templateData.intervalSeconds || 300,
      timeout_seconds: templateData.timeoutSeconds || 30,
      retry_count: templateData.retryCount || 3,
      config: templateData.config || null,
      thresholds: templateData.thresholds || null,
      alert_rules: templateData.alertRules || null,
      check_script: templateData.checkScript || null,
      created_at: new Date(),
      updated_at: new Date(),
      consecutive_failures: 0,
      consecutive_successes: 0
    };

    return await prisma.health_check_templates.create({ data });
  }

  /**
   * 删除模板
   */
  static async delete(templateId) {
    return await prisma.health_check_templates.delete({
      where: { id: templateId }
    });
  }

  /**
   * 启用/禁用模板
   */
  static async toggleEnabled(templateId, enabled) {
    return await prisma.health_check_templates.update({
      where: { id: templateId },
      data: {
        enabled,
        updated_at: new Date()
      }
    });
  }

  /**
   * 获取模板统计
   */
  static async getTemplateStats() {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_templates,
        SUM(CASE WHEN enabled = true THEN 1 ELSE 0 END) as enabled_templates,
        SUM(CASE WHEN last_check_status = 'healthy' THEN 1 ELSE 0 END) as healthy_templates,
        SUM(CASE WHEN last_check_status = 'critical' THEN 1 ELSE 0 END) as critical_templates,
        SUM(CASE WHEN consecutive_failures > 0 THEN 1 ELSE 0 END) as failing_templates
      FROM health_check_templates
    `;

    const result = stats[0];
    
    return {
      totalTemplates: Number(result.total_templates || 0),
      enabledTemplates: Number(result.enabled_templates || 0),
      healthyTemplates: Number(result.healthy_templates || 0),
      criticalTemplates: Number(result.critical_templates || 0),
      failingTemplates: Number(result.failing_templates || 0)
    };
  }

  /**
   * 按类型分组模板
   */
  static async getTemplatesByType() {
    const templates = await prisma.health_check_templates.groupBy({
      by: ['check_type'],
      _count: {
        id: true
      },
      _sum: {
        consecutive_failures: true
      },
      orderBy: {
        check_type: 'asc'
      }
    });

    return templates.map(template => ({
      checkType: template.check_type,
      count: template._count.id,
      totalFailures: template._sum.consecutive_failures || 0
    }));
  }

  /**
   * 重置模板状态
   */
  static async resetTemplateStatus(templateId) {
    return await prisma.health_check_templates.update({
      where: { id: templateId },
      data: {
        last_check_status: null,
        last_check_at: null,
        consecutive_failures: 0,
        consecutive_successes: 0,
        updated_at: new Date()
      }
    });
  }
}

module.exports = HealthCheckTemplateService;