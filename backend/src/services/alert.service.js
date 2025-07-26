const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * 告警服务 (Prisma版本)
 */
class AlertService {
  /**
   * 查找或创建告警
   */
  static async findOrCreateAlert(alertData) {
    const {
      alertType,
      severity,
      title,
      description,
      source,
      metrics,
      threshold,
      suggestedActions
    } = alertData;

    // 检查是否已存在类似的活跃告警
    let alert = await prisma.alerts.findFirst({
      where: {
        alert_type: alertType,  
        title,
        status: 'active',
        ...(source ? {
          source: {
            equals: source
          }
        } : {
          source: null
        })
      }
    });

    let created = false;

    if (alert) {
      // 更新现有告警的出现次数
      alert = await prisma.alerts.update({
        where: { id: alert.id },
        data: {
          occurrence_count: { increment: 1 },
          last_occurred_at: new Date(),
          description: description || alert.description,
          metrics: metrics || alert.metrics
        }
      });
    } else {
      // 创建新告警
      alert = await prisma.alerts.create({
        data: {
          alert_type: alertType,
          severity: severity || 'medium',
          title,
          description: description || null,
          status: 'active',
          source: source || null,
          metrics: metrics || null,
          threshold: threshold || null,
          suggested_actions: suggestedActions || null,
          occurrence_count: 1,
          escalation_level: 0,
          notification_sent: false,
          first_occurred_at: new Date(),
          last_occurred_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      created = true;
    }

    return { alert, created };
  }

  /**
   * 获取活跃告警
   */
  static async getActiveAlerts(filters = {}) {
    const where = {
      status: 'active'
    };

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.alertType) {
      where.alert_type = filters.alertType;
    }

    if (filters.escalationLevel !== undefined) {
      where.escalation_level = filters.escalationLevel;
    }

    const alerts = await prisma.alerts.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ],
      include: {
        acknowledger: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        },
        resolver: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      }
    });

    return alerts.map(alert => ({
      id: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      status: alert.status,
      source: alert.source,
      metrics: alert.metrics,
      threshold: alert.threshold,
      suggestedActions: alert.suggested_actions,
      occurrenceCount: alert.occurrence_count,
      escalationLevel: alert.escalation_level,
      notificationSent: alert.notification_sent,
      firstOccurredAt: alert.first_occurred_at,
      lastOccurredAt: alert.last_occurred_at,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
      acknowledgedAt: alert.acknowledged_at,
      acknowledgedBy: alert.acknowledged_by,
      acknowledger: alert.acknowledger,
      acknowledgeNote: alert.acknowledge_note,
      resolvedAt: alert.resolved_at,
      resolvedBy: alert.resolved_by,
      resolver: alert.resolver,
      resolutionNote: alert.resolution_note,
      suppressedUntil: alert.suppressed_until,
      nextEscalationAt: alert.next_escalation_at
    }));
  }

  /**
   * 获取需要升级的告警
   */
  static async getAlertsForEscalation() {
    const now = new Date();
    
    const alerts = await prisma.alerts.findMany({
      where: {
        status: 'active',
        next_escalation_at: {
          lte: now
        },
        escalation_level: {
          lt: 3 // 最多升级3次
        }
      },
      orderBy: {
        next_escalation_at: 'asc'
      }
    });

    return alerts.map(alert => ({
      id: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      escalationLevel: alert.escalation_level,
      nextEscalationAt: alert.next_escalation_at,
      // 添加升级方法
      escalate: async () => {
        const newEscalationLevel = alert.escalation_level + 1;
        const nextEscalationMinutes = newEscalationLevel === 1 ? 60 : newEscalationLevel === 2 ? 120 : null;
        const nextEscalationAt = nextEscalationMinutes ? 
          new Date(Date.now() + nextEscalationMinutes * 60 * 1000) : null;

        return await prisma.alerts.update({
          where: { id: alert.id },
          data: {
            escalation_level: newEscalationLevel,
            next_escalation_at: nextEscalationAt,
            updated_at: new Date()
          }
        });
      }
    }));
  }

  /**
   * 确认告警
   */
  static async acknowledgeAlert(alertId, userId, note = null) {
    return await prisma.alerts.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        acknowledged_by: userId,
        acknowledge_note: note,
        updated_at: new Date()
      }
    });
  }

  /**
   * 解决告警
   */
  static async resolveAlert(alertId, userId, note = null) {
    return await prisma.alerts.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: userId,
        resolution_note: note,
        updated_at: new Date()
      }
    });
  }

  /**
   * 抑制告警
   */
  static async suppressAlert(alertId, suppressUntil) {
    return await prisma.alerts.update({
      where: { id: alertId },
      data: {
        status: 'suppressed',
        suppressed_until: suppressUntil,
        updated_at: new Date()
      }
    });
  }

  /**
   * 获取告警统计
   */
  static async getAlertStatistics(timeRange = 24) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
        SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged_alerts,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_alerts,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_alerts,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_alerts,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_alerts,
        AVG(CASE 
          WHEN resolved_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) 
          ELSE NULL 
        END) as avg_resolution_time_minutes
      FROM alerts
      WHERE created_at >= ${cutoffTime}
    `;

    const result = stats[0];
    
    return {
      totalAlerts: Number(result.total_alerts || 0),
      activeAlerts: Number(result.active_alerts || 0),
      acknowledgedAlerts: Number(result.acknowledged_alerts || 0),
      resolvedAlerts: Number(result.resolved_alerts || 0),
      severityDistribution: {
        critical: Number(result.critical_alerts || 0),
        high: Number(result.high_alerts || 0),
        medium: Number(result.medium_alerts || 0),
        low: Number(result.low_alerts || 0)
      },
      averageResolutionTime: result.avg_resolution_time_minutes ? 
        Math.round(Number(result.avg_resolution_time_minutes)) : null,
      timeRange: `${timeRange}小时`
    };
  }

  /**
   * 清理旧告警
   */
  static async cleanupOldAlerts(days = 90) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await prisma.alerts.deleteMany({
      where: {
        status: 'resolved',
        resolved_at: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * 按类型获取告警统计
   */
  static async getAlertsByType(timeRange = 24) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const stats = await prisma.$queryRaw`
      SELECT 
        alert_type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        MAX(created_at) as latest_occurrence
      FROM alerts
      WHERE created_at >= ${cutoffTime}
      GROUP BY alert_type
      ORDER BY count DESC
    `;

    return stats.map(stat => ({
      alertType: stat.alert_type,
      count: Number(stat.count),
      activeCount: Number(stat.active_count),
      latestOccurrence: stat.latest_occurrence
    }));
  }

  /**
   * 获取告警趋势
   */
  static async getAlertTrend(days = 7) {
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const trends = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as alert_date,
        COUNT(*) as alert_count,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count
      FROM alerts
      WHERE created_at >= ${cutoffTime}
      GROUP BY DATE(created_at)
      ORDER BY alert_date ASC
    `;

    return trends.map(trend => ({
      date: trend.alert_date,
      alertCount: Number(trend.alert_count),
      criticalCount: Number(trend.critical_count),
      highCount: Number(trend.high_count)
    }));
  }

  /**
   * 根据ID查找告警
   */
  static async findById(alertId) {
    const alert = await prisma.alerts.findUnique({
      where: { id: alertId },
      include: {
        acknowledger: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        },
        resolver: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      }
    });

    if (!alert) return null;

    return {
      id: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      status: alert.status,
      source: alert.source,
      metrics: alert.metrics,
      threshold: alert.threshold,
      suggestedActions: alert.suggested_actions,
      occurrenceCount: alert.occurrence_count,
      escalationLevel: alert.escalation_level,
      notificationSent: alert.notification_sent,
      firstOccurredAt: alert.first_occurred_at,
      lastOccurredAt: alert.last_occurred_at,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
      acknowledgedAt: alert.acknowledged_at,
      acknowledgedBy: alert.acknowledged_by,
      acknowledger: alert.acknowledger,
      acknowledgeNote: alert.acknowledge_note,
      resolvedAt: alert.resolved_at,
      resolvedBy: alert.resolved_by,
      resolver: alert.resolver,
      resolutionNote: alert.resolution_note,
      suppressedUntil: alert.suppressed_until,
      nextEscalationAt: alert.next_escalation_at,
      // 添加操作方法
      acknowledge: async (userId, note) => {
        return await AlertService.acknowledgeAlert(alert.id, userId, note);
      },
      resolve: async (userId, note) => {
        return await AlertService.resolveAlert(alert.id, userId, note);
      },
      suppress: async (suppressUntil) => {
        return await AlertService.suppressAlert(alert.id, suppressUntil);
      },
      getSummary: () => ({
        id: alert.id,
        alertType: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        status: alert.status,
        createdAt: alert.created_at
      })
    };
  }

  /**
   * 批量操作告警
   */
  static async bulkOperation(alertIds, operation, data = {}) {
    const results = [];
    
    for (const alertId of alertIds) {
      try {
        let result;
        switch (operation) {
          case 'acknowledge':
            result = await this.acknowledgeAlert(alertId, data.userId, data.note);
            break;
          case 'resolve':
            result = await this.resolveAlert(alertId, data.userId, data.note);
            break;
          case 'suppress':
            result = await this.suppressAlert(alertId, data.suppressUntil);
            break;
          default:
            throw new Error('无效的操作类型');
        }
        results.push({ id: alertId, success: true, result });
      } catch (error) {
        results.push({ id: alertId, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = AlertService;