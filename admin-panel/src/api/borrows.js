import { request } from './request'

/**
 * 获取借阅记录列表
 * @param {Object} params - 查询参数
 */
export function getBorrows(params = {}) {
  return request.get('/borrows', { params })
}

/**
 * 获取借阅记录详情
 * @param {number} id - 借阅ID
 */
export function getBorrowById(id) {
  return request.get(`/borrows/${id}`)
}

/**
 * 创建借阅记录
 * @param {Object} data - 借阅数据
 */
export function createBorrow(data) {
  return request.post('/borrows', data)
}

/**
 * 归还图书
 * @param {number} id - 借阅ID
 * @param {Object} data - 归还数据
 */
export function returnBook(id, data = {}) {
  return request.put(`/borrows/${id}/return`, data)
}

/**
 * 续借图书
 * @param {number} id - 借阅ID
 * @param {Object} data - 续借数据
 */
export function renewBook(id, data = {}) {
  return request.put(`/borrows/${id}/renew`, data)
}

/**
 * 标记图书为丢失
 * @param {number} id - 借阅ID
 * @param {Object} data - 丢失数据
 */
export function markBookAsLost(id, data = {}) {
  return request.put(`/borrows/${id}/lost`, data)
}

/**
 * 检查借阅限制
 * @param {Object} params - 检查参数
 */
export function checkBorrowLimits(params) {
  return request.get('/borrows/check-limits', { params })
}

/**
 * 检查借阅权限（用于借阅弹窗）
 * 说明：适配后端 GET /borrows/limits/:userId 接口
 * @param {Object} params
 * @param {number} params.userId - 用户ID
 * @param {number} [params.bookId] - 图书ID（可选，仅用于前端提示）
 */
export function checkBorrowPermission({ userId, bookId }) {
  return request.get(`/borrows/limits/${userId}`, { params: { bookId } })
}

/**
 * 获取借阅详情
 * @param {number} id - 借阅ID
 */
export function getBorrowDetail(id) {
  return request.get(`/borrows/${id}/detail`)
}

/**
 * 获取借阅历史
 * @param {Object} params - 查询参数
 */
export function getBorrowHistory(params) {
  return request.get('/borrows/history', { params })
}

/**
 * 获取图书借阅历史
 * @param {number} bookId - 图书ID
 */
export function getBookBorrowHistory(bookId) {
  return request.get(`/borrows/book/${bookId}/history`)
}

/**
 * 发送借阅提醒
 * @param {number} id - 借阅ID
 */
export function sendBorrowReminder(id) {
  return request.post(`/borrows/${id}/reminder`)
}

/**
 * 批量操作
 * @param {Object} data - 批量操作数据
 */
export function batchBorrowOperation(data) {
  return request.post('/borrows/batch', data)
}

/**
 * 获取逾期借阅
 * @param {Object} params - 查询参数
 */
export function getOverdueBorrows(params) {
  return request.get('/borrows/overdue', { params })
}

/**
 * 获取即将到期的借阅记录
 * @param {Object} params - 查询参数
 */
export function getDueSoonRecords(params = {}) {
  return request.get('/borrows/due-soon', { params })
}

/**
 * 获取借阅统计信息
 * @param {Object} params - 查询参数
 */
export function getBorrowStatistics(params = {}) {
  return request.get('/borrows/statistics', { params })
}

/**
 * 获取用户借阅历史
 * @param {number} userId - 用户ID
 * @param {Object} params - 查询参数
 */
export function getUserBorrowHistory(userId, params = {}) {
  return request.get(`/borrows/user/${userId}`, { params })
}

/**
 * 快速借阅
 * @param {Object} data - 借阅数据
 */
export function quickBorrow(data) {
  return request.post('/borrows/quick-borrow', data)
}

/**
 * 快速归还
 * @param {Object} data - 归还数据
 */
export function quickReturn(data) {
  return request.post('/borrows/quick-return', data)
}

/**
 * 获取借阅趋势数据
 * @param {Object} params - 查询参数
 */
export function getBorrowTrends(params = {}) {
  return request.get('/borrows/trends', { params })
}

/**
 * 批量处理借阅记录
 * @param {Object} data - 批量操作数据
 */
export function batchProcessBorrows(data) {
  return request.post('/borrows/batch', data)
}

/**
 * 获取逾期记录
 * @param {Object} params - 查询参数
 */
export function getOverdueRecords(params = {}) {
  return request.get('/borrows/overdue-records', { params })
}

/**
 * 借阅API对象
 */
export const borrowApi = {
  getBorrows,
  getBorrowById,
  createBorrow,
  returnBook,
  renewBook,
  markBookAsLost,
  checkBorrowLimits,
  checkBorrowPermission,
  getBorrowDetail,
  getBorrowHistory,
  getBookBorrowHistory,
  sendBorrowReminder,
  batchBorrowOperation,
  getOverdueBorrows,
  getDueSoonRecords,
  getBorrowStatistics,
  getUserBorrowHistory,
  quickBorrow,
  quickReturn,
  getBorrowTrends,
  batchProcessBorrows,
  getOverdueRecords
}
