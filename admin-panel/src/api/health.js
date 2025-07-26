import request from '@/utils/request'

/**
 * 健康监控 API
 */

/**
 * 获取系统整体健康状态
 */
export function getSystemHealth() {
  return request({
    url: '/api/health/status',
    method: 'GET'
  })
}

/**
 * 获取健康监控概览
 */
export function getHealthOverview() {
  return request({
    url: '/api/health/overview',
    method: 'GET'
  })
}

/**
 * 获取详细健康报告
 */
export function getHealthReport(params = {}) {
  return request({
    url: '/api/health/report',
    method: 'GET',
    params
  })
}

/**
 * 获取系统性能指标
 */
export function getSystemMetrics(params = {}) {
  return request({
    url: '/api/health/metrics',
    method: 'GET',
    params
  })
}

/**
 * 获取特定健康检查的历史趋势
 */
export function getHealthTrend(checkType, checkName, params = {}) {
  return request({
    url: `/api/health/trend/${checkType}/${checkName}`,
    method: 'GET',
    params
  })
}

/**
 * 获取活跃告警列表
 */
export function getActiveAlerts(params = {}) {
  return request({
    url: '/api/health/alerts',
    method: 'GET',
    params
  })
}

/**
 * 获取告警统计信息
 */
export function getAlertStatistics(params = {}) {
  return request({
    url: '/api/health/alerts/statistics',
    method: 'GET',
    params
  })
}

/**
 * 确认告警
 */
export function acknowledgeAlert(alertId, data = {}) {
  return request({
    url: `/api/health/alerts/${alertId}/acknowledge`,
    method: 'POST',
    data
  })
}

/**
 * 解决告警
 */
export function resolveAlert(alertId, data = {}) {
  return request({
    url: `/api/health/alerts/${alertId}/resolve`,
    method: 'POST',
    data
  })
}

/**
 * 抑制告警
 */
export function suppressAlert(alertId, data = {}) {
  return request({
    url: `/api/health/alerts/${alertId}/suppress`,
    method: 'POST',
    data
  })
}

/**
 * 批量操作告警
 */
export function batchOperateAlerts(data = {}) {
  return request({
    url: '/api/health/alerts/batch',
    method: 'POST',
    data
  })
}

/**
 * 获取健康检查模板
 */
export function getHealthCheckTemplates(params = {}) {
  return request({
    url: '/api/health/templates',
    method: 'GET',
    params
  })
}

/**
 * 更新健康检查模板
 */
export function updateHealthCheckTemplate(templateId, data = {}) {
  return request({
    url: `/api/health/templates/${templateId}`,
    method: 'PUT',
    data
  })
}

/**
 * 手动执行健康检查
 */
export function executeHealthCheck(templateId) {
  return request({
    url: `/api/health/templates/${templateId}/execute`,
    method: 'POST'
  })
}

/**
 * 获取告警详情
 */
export function getAlertDetail(alertId) {
  return request({
    url: `/api/health/alerts/${alertId}`,
    method: 'GET'
  })
}

/**
 * 获取健康检查详情
 */
export function getHealthCheckDetail(checkType, checkName, params = {}) {
  return request({
    url: `/api/health/checks/${checkType}/${checkName}`,
    method: 'GET',
    params
  })
}

/**
 * 创建自定义健康检查模板
 */
export function createHealthCheckTemplate(data = {}) {
  return request({
    url: '/api/health/templates',
    method: 'POST',
    data
  })
}

/**
 * 删除健康检查模板
 */
export function deleteHealthCheckTemplate(templateId) {
  return request({
    url: `/api/health/templates/${templateId}`,
    method: 'DELETE'
  })
}

/**
 * 启用/禁用健康检查模板
 */
export function toggleHealthCheckTemplate(templateId, enabled) {
  return request({
    url: `/api/health/templates/${templateId}/toggle`,
    method: 'PATCH',
    data: { enabled }
  })
}

/**
 * 获取系统健康历史记录
 */
export function getHealthHistory(params = {}) {
  return request({
    url: '/api/health/history',
    method: 'GET',
    params
  })
}

/**
 * 导出健康报告
 */
export function exportHealthReport(params = {}) {
  return request({
    url: '/api/health/export',
    method: 'GET',
    params,
    responseType: 'blob'
  })
}

/**
 * 获取告警历史记录
 */
export function getAlertHistory(params = {}) {
  return request({
    url: '/api/health/alerts/history',
    method: 'GET',
    params
  })
}

/**
 * 获取性能基准数据
 */
export function getPerformanceBaseline(params = {}) {
  return request({
    url: '/api/health/baseline',
    method: 'GET',
    params
  })
}

/**
 * 设置性能基准
 */
export function setPerformanceBaseline(data = {}) {
  return request({
    url: '/api/health/baseline',
    method: 'POST',
    data
  })
}

/**
 * 获取系统容量规划建议
 */
export function getCapacityPlanningRecommendations(params = {}) {
  return request({
    url: '/api/health/recommendations/capacity',
    method: 'GET',
    params
  })
}

/**
 * 获取性能优化建议
 */
export function getPerformanceOptimizationRecommendations(params = {}) {
  return request({
    url: '/api/health/recommendations/performance',
    method: 'GET',
    params
  })
}

/**
 * 测试告警通知渠道
 */
export function testAlertNotificationChannel(channel, data = {}) {
  return request({
    url: `/api/health/test-notification/${channel}`,
    method: 'POST',
    data
  })
}

/**
 * 获取系统依赖关系图
 */
export function getSystemDependencyGraph() {
  return request({
    url: '/api/health/dependency-graph',
    method: 'GET'
  })
}

/**
 * 强制刷新所有健康检查
 */
export function forceRefreshHealthChecks() {
  return request({
    url: '/api/health/refresh',
    method: 'POST'
  })
}

/**
 * 获取健康检查调度状态
 */
export function getHealthCheckScheduleStatus() {
  return request({
    url: '/api/health/schedule/status',
    method: 'GET'
  })
}

/**
 * 启动/停止健康检查调度
 */
export function toggleHealthCheckSchedule(enabled) {
  return request({
    url: '/api/health/schedule/toggle',
    method: 'POST',
    data: { enabled }
  })
}
