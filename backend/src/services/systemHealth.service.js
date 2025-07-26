const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * 系统健康状态服务 (Prisma版本)
 */
class SystemHealthService {
  /**
   * 创建健康检查记录
   */
  static async create(healthData) {
    return await prisma.system_health.create({
      data: {
        check_type: healthData.checkType,
        check_name: healthData.checkName,
        status: healthData.status,
        response_time: healthData.responseTime,
        error_message: healthData.errorMessage || null,
        details: healthData.details || null,
        metrics: healthData.metrics || null,
        checked_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * 获取最新健康状态
   */
  static async getLatestHealthStatus() {
    const latestChecks = await prisma.$queryRaw`
      SELECT DISTINCT 
        h1.check_type,
        h1.check_name,
        h1.status,
        h1.response_time,
        h1.error_message,
        h1.details,
        h1.metrics,
        h1.checked_at
      FROM system_health h1
      INNER JOIN (
        SELECT check_type, check_name, MAX(checked_at) as max_checked_at
        FROM system_health
        WHERE checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY check_type, check_name
      ) h2 ON h1.check_type = h2.check_type 
         AND h1.check_name = h2.check_name 
         AND h1.checked_at = h2.max_checked_at
      ORDER BY h1.checked_at DESC
    `;

    return latestChecks.map(check => ({
      checkType: check.check_type,
      checkName: check.check_name,
      status: check.status,
      responseTime: Number(check.response_time || 0),
      errorMessage: check.error_message,
      details: check.details,
      metrics: check.metrics,
      checkedAt: check.checked_at
    }));
  }

  /**
   * 获取整体健康状态
   */
  static async getOverallHealth() {
    const latestChecks = await this.getLatestHealthStatus();
    
    const statusCounts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0
    };

    let lastUpdated = null;

    latestChecks.forEach(check => {
      statusCounts[check.status] = (statusCounts[check.status] || 0) + 1;
      if (!lastUpdated || check.checkedAt > lastUpdated) {
        lastUpdated = check.checkedAt;
      }
    });

    // 确定整体状态
    let overallStatus = 'healthy';
    if (statusCounts.critical > 0) {
      overallStatus = 'critical';
    } else if (statusCounts.warning > 0) {
      overallStatus = 'warning';
    } else if (statusCounts.unknown > 0 && statusCounts.healthy === 0) {
      overallStatus = 'unknown';
    }

    return {
      overallStatus,
      totalChecks: latestChecks.length,
      statusCounts,
      lastUpdated: lastUpdated || new Date()
    };
  }

  /**
   * 获取健康趋势
   */
  static async getHealthTrend(checkType, checkName, hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const trends = await prisma.system_health.findMany({
      where: {
        check_type: checkType,
        check_name: checkName,
        checked_at: {
          gte: cutoffTime
        }
      },
      orderBy: {
        checked_at: 'asc'
      },
      select: {
        status: true,
        response_time: true,
        metrics: true,
        checked_at: true
      }
    });

    return trends.map(trend => ({
      status: trend.status,
      responseTime: Number(trend.response_time || 0),
      metrics: trend.metrics,
      checkedAt: trend.checked_at
    }));
  }

  /**
   * 获取性能统计
   */
  static async getPerformanceStats(checkType, checkName, hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_checks,
        AVG(response_time) as avg_response_time,
        MIN(response_time) as min_response_time,
        MAX(response_time) as max_response_time,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown_count
      FROM system_health
      WHERE check_type = ${checkType}
        AND check_name = ${checkName}
        AND checked_at >= ${cutoffTime}
    `;

    const result = stats[0];
    if (!result || Number(result.total_checks) === 0) {
      return {
        totalChecks: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        uptime: 0,
        statusDistribution: {
          healthy: 0,
          warning: 0,
          critical: 0,
          unknown: 0
        }
      };
    }

    const totalChecks = Number(result.total_checks);
    const healthyCount = Number(result.healthy_count);

    return {
      totalChecks,
      averageResponseTime: Math.round(Number(result.avg_response_time || 0)),
      minResponseTime: Number(result.min_response_time || 0),
      maxResponseTime: Number(result.max_response_time || 0),
      uptime: totalChecks > 0 ? Math.round((healthyCount / totalChecks) * 100) : 0,
      statusDistribution: {
        healthy: Number(result.healthy_count),
        warning: Number(result.warning_count),
        critical: Number(result.critical_count),
        unknown: Number(result.unknown_count)
      }
    };
  }

  /**
   * 清理旧记录
   */
  static async cleanupOldRecords(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await prisma.system_health.deleteMany({
      where: {
        checked_at: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * 获取检查类型统计
   */
  static async getCheckTypeStats(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await prisma.$queryRaw`
      SELECT 
        check_type,
        COUNT(*) as total_checks,
        AVG(response_time) as avg_response_time,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM system_health
      WHERE checked_at >= ${cutoffTime}
      GROUP BY check_type
      ORDER BY total_checks DESC
    `;

    return stats.map(stat => ({
      checkType: stat.check_type,
      totalChecks: Number(stat.total_checks),
      averageResponseTime: Math.round(Number(stat.avg_response_time || 0)),
      healthyCount: Number(stat.healthy_count),
      criticalCount: Number(stat.critical_count),
      healthRate: Number(stat.total_checks) > 0 
        ? Math.round((Number(stat.healthy_count) / Number(stat.total_checks)) * 100) 
        : 0
    }));
  }

  /**
   * 获取最近错误
   */
  static async getRecentErrors(limit = 20) {
    const errors = await prisma.system_health.findMany({
      where: {
        OR: [
          { status: 'critical' },
          { status: 'warning' }
        ],
        error_message: {
          not: null
        }
      },
      orderBy: {
        checked_at: 'desc'
      },
      take: limit,
      select: {
        check_type: true,
        check_name: true,
        status: true,
        error_message: true,
        checked_at: true
      }
    });

    return errors.map(error => ({
      checkType: error.check_type,
      checkName: error.check_name,
      status: error.status,
      errorMessage: error.error_message,
      checkedAt: error.checked_at
    }));
  }

  /**
   * 批量插入健康检查记录
   */
  static async createMany(healthDataArray) {
    const data = healthDataArray.map(healthData => ({
      check_type: healthData.checkType,
      check_name: healthData.checkName,
      status: healthData.status,
      response_time: healthData.responseTime,
      error_message: healthData.errorMessage || null,
      details: healthData.details || null,
      metrics: healthData.metrics || null,
      checked_at: healthData.checkedAt || new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }));

    return await prisma.system_health.createMany({
      data,
      skipDuplicates: true
    });
  }
}

module.exports = SystemHealthService;