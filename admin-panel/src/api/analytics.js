import { request } from './request'

/**
 * 获取综合仪表板数据
 * @param {Object} params - 查询参数
 */
export function getDashboardAnalytics(params = {}) {
  return request.get('/analytics/dashboard', { params })
}

/**
 * 获取概览统计数据
 * @param {Object} params - 查询参数
 */
export function getOverviewStats(params = {}) {
  return request.get('/analytics/overview', { params })
}

/**
 * 获取趋势分析数据
 * @param {Object} params - 查询参数
 */
export function getTrendsData(params = {}) {
  return request.get('/analytics/trends', { params })
}

/**
 * 获取图书分析报告
 * @param {Object} params - 查询参数
 */
export function getBooksAnalytics(params = {}) {
  return request.get('/analytics/books', { params })
}

/**
 * 获取用户分析报告
 * @param {Object} params - 查询参数
 */
export function getUsersAnalytics(params = {}) {
  return request.get('/analytics/users', { params })
}

/**
 * 获取分类分析报告
 * @param {Object} params - 查询参数
 */
export function getCategoriesAnalytics(params = {}) {
  return request.get('/analytics/categories', { params })
}

/**
 * 获取性能指标
 * @param {Object} params - 查询参数
 */
export function getPerformanceMetrics(params = {}) {
  return request.get('/analytics/performance', { params })
}

/**
 * 获取预测性洞察
 * @param {Object} params - 查询参数
 */
export function getPredictiveInsights(params = {}) {
  return request.get('/analytics/insights', { params })
}

/**
 * 获取实时统计数据
 */
export function getRealTimeStats() {
  return request.get('/analytics/realtime')
}

/**
 * 导出分析报告
 * @param {Object} data - 导出配置
 */
export function exportAnalyticsReport(data) {
  return request.post('/analytics/export', data, {
    responseType: 'blob'
  })
}

/**
 * 执行自定义查询
 * @param {Object} data - 查询数据
 */
export function executeCustomQuery(data) {
  return request.post('/analytics/query', data)
}

/**
 * 获取热门图书统计
 * @param {Object} params - 查询参数
 */
export function getTopBooksStats(params = {}) {
  return getBooksAnalytics(params)
}

/**
 * 获取活跃用户统计
 * @param {Object} params - 查询参数
 */
export function getActiveUsersStats(params = {}) {
  return getUsersAnalytics(params)
}

/**
 * 获取借阅趋势数据
 * @param {Object} params - 查询参数
 */
export function getBorrowTrends(params = {}) {
  return getTrendsData({ ...params, metrics: 'borrows,returns' })
}

/**
 * 获取用户增长趋势
 * @param {Object} params - 查询参数
 */
export function getUserGrowthTrends(params = {}) {
  return getTrendsData({ ...params, metrics: 'registrations' })
}

/**
 * 获取分类利用率统计
 * @param {Object} params - 查询参数
 */
export function getCategoryUtilization(params = {}) {
  return getCategoriesAnalytics(params)
}

/**
 * 获取图书馆运营效率指标
 * @param {Object} params - 查询参数
 */
export function getOperationalEfficiency(params = {}) {
  return getPerformanceMetrics(params)
}

/**
 * 获取用户行为分析
 * @param {Object} params - 查询参数
 */
export function getUserBehaviorAnalysis(params = {}) {
  return getUsersAnalytics({ ...params, includeEngagement: true })
}

/**
 * 获取收藏分析数据
 * @param {Object} params - 查询参数
 */
export function getCollectionAnalysis(params = {}) {
  return getBooksAnalytics(params)
}

/**
 * 获取系统健康度指标
 */
export function getSystemHealthMetrics() {
  return getRealTimeStats()
}

/**
 * 获取预测性维护建议
 * @param {Object} params - 查询参数
 */
export function getMaintenanceRecommendations(params = {}) {
  return getPredictiveInsights(params)
}

/**
 * 获取详细的借阅模式分析
 * @param {Object} params - 查询参数
 */
export function getBorrowingPatterns(params = {}) {
  return executeCustomQuery({
    query: 'borrowing_patterns_analysis',
    parameters: params
  })
}

/**
 * 获取用户留存率分析
 * @param {Object} params - 查询参数
 */
export function getUserRetentionAnalysis(params = {}) {
  return executeCustomQuery({
    query: 'user_retention_analysis',
    parameters: params
  })
}

/**
 * 获取图书推荐效果分析
 * @param {Object} params - 查询参数
 */
export function getRecommendationEffectiveness(params = {}) {
  return executeCustomQuery({
    query: 'recommendation_effectiveness',
    parameters: params
  })
}

/**
 * 获取季节性趋势分析
 * @param {Object} params - 查询参数
 */
export function getSeasonalTrends(params = {}) {
  return getTrendsData({
    ...params,
    granularity: 'month',
    metrics: 'all'
  })
}

/**
 * 获取用户群体分析
 * @param {Object} params - 查询参数
 */
export function getUserSegmentAnalysis(params = {}) {
  return getUsersAnalytics(params)
}

/**
 * 获取图书利用率分析
 * @param {Object} params - 查询参数
 */
export function getBookUtilizationAnalysis(params = {}) {
  return getBooksAnalytics(params)
}

/**
 * 获取收入分析（罚金等）
 * @param {Object} params - 查询参数
 */
export function getRevenueAnalysis(params = {}) {
  return getPerformanceMetrics(params)
}

/**
 * 获取库存优化建议
 * @param {Object} params - 查询参数
 */
export function getInventoryOptimization(params = {}) {
  return getPredictiveInsights(params)
}

/**
 * 获取用户满意度分析
 * @param {Object} params - 查询参数
 */
export function getUserSatisfactionAnalysis(params = {}) {
  return executeCustomQuery({
    query: 'user_satisfaction_analysis',
    parameters: params
  })
}

/**
 * 获取竞争分析数据
 * @param {Object} params - 查询参数
 */
export function getCompetitiveAnalysis(params = {}) {
  return executeCustomQuery({
    query: 'competitive_analysis',
    parameters: params
  })
}

/**
 * 获取成本效益分析
 * @param {Object} params - 查询参数
 */
export function getCostBenefitAnalysis(params = {}) {
  return getPerformanceMetrics(params)
}

/**
 * 获取数据质量报告
 */
export function getDataQualityReport() {
  return executeCustomQuery({
    query: 'data_quality_report'
  })
}

/**
 * 获取自动化报告配置
 */
export function getAutomatedReportConfig() {
  return request.get('/analytics/reports/config')
}

/**
 * 更新自动化报告配置
 * @param {Object} config - 配置数据
 */
export function updateAutomatedReportConfig(config) {
  return request.put('/analytics/reports/config', config)
}

/**
 * 获取报告调度列表
 */
export function getReportSchedules() {
  return request.get('/analytics/reports/schedules')
}

/**
 * 创建报告调度
 * @param {Object} schedule - 调度配置
 */
export function createReportSchedule(schedule) {
  return request.post('/analytics/reports/schedules', schedule)
}

/**
 * 更新报告调度
 * @param {string} id - 调度ID
 * @param {Object} schedule - 调度配置
 */
export function updateReportSchedule(id, schedule) {
  return request.put(`/analytics/reports/schedules/${id}`, schedule)
}

/**
 * 删除报告调度
 * @param {string} id - 调度ID
 */
export function deleteReportSchedule(id) {
  return request.delete(`/analytics/reports/schedules/${id}`)
}

/**
 * 获取历史报告列表
 * @param {Object} params - 查询参数
 */
export function getHistoricalReports(params = {}) {
  return request.get('/analytics/reports/history', { params })
}

/**
 * 下载历史报告
 * @param {string} reportId - 报告ID
 */
export function downloadHistoricalReport(reportId) {
  return request.get(`/analytics/reports/history/${reportId}/download`, {
    responseType: 'blob'
  })
}
