import { request } from './request'

/**
 * 获取用户通知列表
 * @param {Object} params - 查询参数
 */
export function getUserNotifications(params = {}) {
  return request.get('/notifications', { params })
}

/**
 * 获取未读通知计数
 */
export function getUnreadCount() {
  return request.get('/notifications/unread-count')
}

/**
 * 获取通知详情
 * @param {number} id - 通知ID
 */
export function getNotificationDetail(id) {
  return request.get(`/notifications/${id}`)
}

/**
 * 标记通知为已读
 * @param {number} id - 通知ID
 */
export function markAsRead(id) {
  return request.patch(`/notifications/${id}/read`)
}

/**
 * 标记所有通知为已读
 * @param {string} type - 可选，通知类型
 */
export function markAllAsRead(type) {
  return request.patch('/notifications/mark-all-read', { type })
}

/**
 * 删除通知
 * @param {number} id - 通知ID
 */
export function deleteNotification(id) {
  return request.delete(`/notifications/${id}`)
}

// 管理员API
/**
 * 获取管理员通知列表
 * @param {Object} params - 查询参数
 */
export function getAdminNotifications(params = {}) {
  return request.get('/notifications/admin/list', { params })
}

/**
 * 创建通知
 * @param {Object} data - 通知数据
 */
export function createNotification(data) {
  return request.post('/notifications/admin/create', data)
}

/**
 * 发送系统通知
 * @param {Object} data - 系统通知数据
 */
export function sendSystemNotification(data) {
  return request.post('/notifications/admin/system', data)
}

/**
 * 批量创建通知
 * @param {Array} notifications - 通知列表
 */
export function createBulkNotifications(notifications) {
  return request.post('/notifications/admin/bulk', { notifications })
}

/**
 * 获取通知统计
 * @param {Object} params - 查询参数
 */
export function getNotificationStats(params = {}) {
  return request.get('/notifications/admin/statistics', { params })
}

/**
 * 获取WebSocket连接统计
 */
export function getWebSocketStats() {
  return request.get('/notifications/admin/websocket-stats')
}

/**
 * 强制断开用户连接
 * @param {number} userId - 用户ID
 * @param {string} reason - 断开原因
 */
export function disconnectUser(userId, reason) {
  return request.post(`/notifications/admin/disconnect-user/${userId}`, { reason })
}

/**
 * 重新发送失败的通知
 * @param {number} id - 通知ID
 */
export function resendFailedNotification(id) {
  return request.post(`/notifications/admin/${id}/resend`)
}

// 通知模板API
/**
 * 获取通知模板列表
 * @param {Object} params - 查询参数
 */
export function getNotificationTemplates(params = {}) {
  return request.get('/notifications/templates', { params })
}

/**
 * 创建通知模板
 * @param {Object} data - 模板数据
 */
export function createNotificationTemplate(data) {
  return request.post('/notifications/templates', data)
}

/**
 * 更新通知模板
 * @param {number} id - 模板ID
 * @param {Object} data - 更新数据
 */
export function updateNotificationTemplate(id, data) {
  return request.put(`/notifications/templates/${id}`, data)
}

/**
 * 删除通知模板
 * @param {number} id - 模板ID
 */
export function deleteNotificationTemplate(id) {
  return request.delete(`/notifications/templates/${id}`)
}

/**
 * 测试通知模板
 * @param {Object} data - 测试数据
 */
export function testNotificationTemplate(data) {
  return request.post('/notifications/templates/test', data)
}
