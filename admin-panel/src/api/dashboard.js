import { request } from './request'

/**
 * 获取仪表盘统计数据
 */
export function getDashboardStats() {
  return request.get('/dashboard/stats')
}

/**
 * 获取借阅趋势数据
 * @param {string} period - 时间周期 (week, month, quarter, year)
 */
export function getBorrowTrend(period = 'week') {
  return request.get('/dashboard/borrow-trend', {
    params: { period }
  })
}

/**
 * 获取图书分类统计
 */
export function getCategoryStats() {
  return request.get('/dashboard/category-stats')
}

/**
 * 获取系统通知
 * @param {number} limit - 获取数量
 */
export function getSystemNotifications(limit = 5) {
  return request.get('/dashboard/notifications', {
    params: { limit }
  })
}