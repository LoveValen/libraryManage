import { request } from './request'

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 */
export function getUsers(params = {}) {
  return request.get('/users', { params })
}

/**
 * 获取用户详情
 * @param {number} id - 用户ID
 */
export function getUserById(id) {
  return request.get(`/users/${id}`)
}

/**
 * 创建用户
 * @param {Object} data - 用户数据
 */
export function createUser(data) {
  return request.post('/users', data)
}

/**
 * 更新用户信息
 * @param {number} id - 用户ID
 * @param {Object} data - 更新数据
 */
export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

/**
 * 删除用户
 * @param {number} id - 用户ID
 */
export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}

/**
 * 更新用户状态
 * @param {number} id - 用户ID
 * @param {Object} data - 状态数据
 * @param {string} data.status - 新状态
 * @param {string} data.reason - 状态变更原因
 * @param {string} data.expiresAt - 状态过期时间
 */
export function updateUserStatus(id, data) {
  return request.put(`/users/${id}/status`, data)
}

/**
 * 更改用户角色
 * @param {number} id - 用户ID
 * @param {Object} data - 角色数据
 * @param {string} data.role - 新角色
 * @param {string} data.reason - 角色变更原因
 */
export function updateUserRole(id, data) {
  return request.put(`/users/${id}/role`, data)
}

/**
 * 获取用户借阅记录
 * @param {number} id - 用户ID
 * @param {Object} params - 查询参数
 */
export function getUserBorrows(id, params = {}) {
  return request.get(`/users/${id}/borrows`, { params })
}

/**
 * 获取用户积分详情
 * @param {number} id - 用户ID
 * @param {Object} params - 查询参数
 */
export function getUserPoints(id, params = {}) {
  return request.get(`/users/${id}/points`, { params })
}

/**
 * 重置用户密码
 * @param {number} id - 用户ID
 * @param {Object} data - 重置数据
 * @param {string} data.newPassword - 新密码（可选，不提供则系统生成）
 * @param {boolean} data.notifyUser - 是否通知用户
 * @param {string} data.reason - 重置原因
 */
export function resetUserPassword(id, data) {
  return request.post(`/users/${id}/reset-password`, data)
}

/**
 * 获取用户统计信息
 * @param {Object} params - 查询参数
 */
export function getUserStatistics(params = {}) {
  return request.get('/users/statistics', { params })
}

/**
 * 批量操作用户
 * @param {Object} data - 批量操作数据
 * @param {Array} data.userIds - 用户ID列表
 * @param {string} data.action - 操作类型
 * @param {Object} data.params - 操作参数
 */
export function batchUpdateUsers(data) {
  return request.post('/users/batch', data)
}

/**
 * 搜索用户
 * @param {Object} params - 搜索参数
 * @param {string} params.q - 搜索关键词
 */
export function searchUsers(params) {
  return request.get('/users/search', { params })
}

/**
 * 导出用户数据
 * @param {Object} params - 导出参数
 */
export function exportUsers(params = {}) {
  return request.download('/users/export', 'users.xlsx', { params })
}

/**
 * 导入用户数据
 * @param {FormData} formData - 表单数据
 */
export function importUsers(formData) {
  return request.upload('/users/import', formData)
}
