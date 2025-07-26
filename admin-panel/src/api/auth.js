import { request } from './request'

/**
 * 用户登录
 * @param {Object} data - 登录数据
 * @param {string} data.identifier - 用户名或邮箱
 * @param {string} data.password - 密码
 */
export function login(data) {
  return request.post('/auth/login', data)
}

/**
 * 用户登出
 */
export function logout() {
  return request.post('/auth/logout')
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
  return request.get('/auth/me')
}

/**
 * 验证令牌
 */
export function verifyToken() {
  return request.get('/auth/verify')
}

/**
 * 刷新访问令牌
 * @param {Object} data - 刷新令牌数据
 * @param {string} data.refreshToken - 刷新令牌
 */
export function refreshToken(data) {
  return request.post('/auth/refresh', data)
}

/**
 * 修改密码
 * @param {Object} data - 密码数据
 * @param {string} data.currentPassword - 当前密码
 * @param {string} data.newPassword - 新密码
 * @param {string} data.confirmPassword - 确认新密码
 */
export function changePassword(data) {
  return request.put('/auth/password', data)
}

/**
 * 更新用户资料
 * @param {Object} data - 用户资料数据
 */
export function updateProfile(data) {
  return request.put('/auth/profile', data)
}

/**
 * 重置密码
 * @param {Object} data - 重置密码数据
 * @param {string} data.email - 邮箱地址
 */
export function resetPassword(data) {
  return request.post('/auth/reset-password', data)
}

/**
 * 注册用户（管理员功能）
 * @param {Object} data - 注册数据
 * @param {string} data.username - 用户名
 * @param {string} data.email - 邮箱
 * @param {string} data.password - 密码
 * @param {string} data.confirmPassword - 确认密码
 * @param {string} data.realName - 真实姓名
 * @param {string} data.phone - 手机号
 */
export function register(data) {
  return request.post('/auth/register', data)
}
