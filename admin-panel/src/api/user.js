import request from './request'

/**
 * 用户相关API
 */
export const userApi = {
  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 页面大小
   * @param {string} params.keyword - 搜索关键词
   * @param {string} params.role - 角色筛选
   * @param {string} params.status - 状态筛选
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.sortBy - 排序字段
   * @param {string} params.sortOrder - 排序方向
   */
  getUsers(params = {}) {
    return request({
      url: '/users',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户详情
   * @param {string|number} id - 用户ID
   */
  getUserDetail(id) {
    return request({
      url: `/users/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.password - 密码
   * @param {string} userData.realName - 真实姓名
   * @param {string} userData.email - 邮箱
   * @param {string} userData.phone - 手机号
   * @param {string} userData.role - 角色
   * @param {string} userData.status - 状态
   * @param {string} userData.gender - 性别
   * @param {string} userData.birthday - 生日
   * @param {string} userData.studentId - 学号/工号
   * @param {string} userData.department - 院系/部门
   * @param {string} userData.bio - 个人简介
   * @param {string} userData.avatar - 头像URL
   * @param {number} userData.points - 初始积分
   * @param {Array} userData.borrowPermission - 借阅权限
   * @param {number} userData.borrowLimit - 借阅上限
   */
  createUser(userData) {
    return request({
      url: '/users',
      method: 'post',
      data: userData
    })
  },

  /**
   * 更新用户信息
   * @param {string|number} id - 用户ID
   * @param {Object} userData - 用户数据
   */
  updateUser(id, userData) {
    return request({
      url: `/users/${id}`,
      method: 'put',
      data: userData
    })
  },

  /**
   * 删除用户
   * @param {string|number} id - 用户ID
   */
  deleteUser(id) {
    return request({
      url: `/users/${id}`,
      method: 'delete'
    })
  },

  /**
   * 批量删除用户
   * @param {Array} userIds - 用户ID数组
   */
  batchDeleteUsers(userIds) {
    return request({
      url: '/users/batch',
      method: 'post',
      data: { userIds }
    })
  },

  /**
   * 重置用户密码
   * @param {string|number} id - 用户ID
   */
  resetPassword(id) {
    return request({
      url: `/users/${id}/password`,
      method: 'post'
    })
  },

  /**
   * 批量更新用户状态
   * @param {Array} userIds - 用户ID数组
   * @param {string} status - 新状态
   */
  batchUpdateStatus(userIds, status) {
    return request({
      url: '/users/batch',
      method: 'post',
      data: { userIds, status }
    })
  },

  /**
   * 导出用户数据
   * @param {Object} params - 导出参数
   */
  exportUsers(params = {}) {
    return request({
      url: '/admin/users/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  },

  /**
   * 导入用户数据
   * @param {FormData} formData - 包含文件的表单数据
   */
  importUsers(formData) {
    return request({
      url: '/admin/users/import',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 获取用户统计数据
   * @param {Object} params - 统计参数
   * @param {string} params.period - 统计期间 (day|week|month|year)
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   */
  getUserStats(params = {}) {
    return request({
      url: '/admin/users/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户角色列表
   */
  getUserRoles() {
    return request({
      url: '/admin/users/roles',
      method: 'get'
    })
  },

  /**
   * 验证用户名是否可用
   * @param {string} username - 用户名
   * @param {string|number} excludeId - 排除的用户ID（编辑时使用）
   */
  checkUsername(username, excludeId = null) {
    return request({
      url: '/admin/users/check-username',
      method: 'post',
      data: { username, excludeId }
    })
  },

  /**
   * 验证邮箱是否可用
   * @param {string} email - 邮箱
   * @param {string|number} excludeId - 排除的用户ID（编辑时使用）
   */
  checkEmail(email, excludeId = null) {
    return request({
      url: '/admin/users/check-email',
      method: 'post',
      data: { email, excludeId }
    })
  },

  /**
   * 验证手机号是否可用
   * @param {string} phone - 手机号
   * @param {string|number} excludeId - 排除的用户ID（编辑时使用）
   */
  checkPhone(phone, excludeId = null) {
    return request({
      url: '/admin/users/check-phone',
      method: 'post',
      data: { phone, excludeId }
    })
  },

  /**
   * 发送验证邮件
   * @param {string|number} id - 用户ID
   */
  sendVerificationEmail(id) {
    return request({
      url: `/admin/users/${id}/send-verification-email`,
      method: 'post'
    })
  },

  /**
   * 发送验证短信
   * @param {string|number} id - 用户ID
   */
  sendVerificationSms(id) {
    return request({
      url: `/admin/users/${id}/send-verification-sms`,
      method: 'post'
    })
  },

  /**
   * 手动验证用户邮箱
   * @param {string|number} id - 用户ID
   * @param {boolean} verified - 验证状态
   */
  updateEmailVerification(id, verified) {
    return request({
      url: `/admin/users/${id}/email-verification`,
      method: 'post',
      data: { verified }
    })
  },

  /**
   * 手动验证用户手机
   * @param {string|number} id - 用户ID
   * @param {boolean} verified - 验证状态
   */
  updatePhoneVerification(id, verified) {
    return request({
      url: `/admin/users/${id}/phone-verification`,
      method: 'post',
      data: { verified }
    })
  },

  /**
   * 获取用户活动日志
   * @param {string|number} id - 用户ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 页面大小
   * @param {string} params.type - 活动类型
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   */
  getUserActivities(id, params = {}) {
    return request({
      url: `/admin/users/${id}/activities`,
      method: 'get',
      params
    })
  },

  /**
   * 更新用户权限
   * @param {string|number} id - 用户ID
   * @param {Object} permissions - 权限数据
   * @param {Array} permissions.borrowPermission - 借阅权限
   * @param {number} permissions.borrowLimit - 借阅上限
   * @param {boolean} permissions.canComment - 是否可以评论
   * @param {boolean} permissions.canRate - 是否可以评分
   */
  updateUserPermissions(id, permissions) {
    return request({
      url: `/admin/users/${id}/permissions`,
      method: 'put',
      data: permissions
    })
  },

  /**
   * 调整用户积分
   * @param {string|number} id - 用户ID
   * @param {Object} adjustment - 积分调整数据
   * @param {number} adjustment.amount - 调整数量（正数为增加，负数为减少）
   * @param {string} adjustment.reason - 调整原因
   * @param {string} adjustment.note - 备注
   */
  adjustUserPoints(id, adjustment) {
    return request({
      url: `/admin/users/${id}/points/adjust`,
      method: 'post',
      data: adjustment
    })
  },

  /**
   * 锁定/解锁用户账户
   * @param {string|number} id - 用户ID
   * @param {boolean} locked - 是否锁定
   * @param {string} reason - 锁定原因
   * @param {string} duration - 锁定时长（如：1d, 1w, 1m）
   */
  lockUser(id, locked, reason = '', duration = '') {
    return request({
      url: `/admin/users/${id}/lock`,
      method: 'post',
      data: { locked, reason, duration }
    })
  },

  /**
   * 获取用户详细信息（包括借阅、积分等统计）
   * @param {string|number} id - 用户ID
   */
  getUserProfile(id) {
    return request({
      url: `/admin/users/${id}/profile`,
      method: 'get'
    })
  },

  /**
   * 搜索用户（用于自动完成）
   * @param {string} query - 搜索关键词
   * @param {number} limit - 返回数量限制
   */
  searchUsers(query, limit = 10) {
    return request({
      url: '/admin/users/search',
      method: 'get',
      params: { query, limit }
    })
  },

  /**
   * 获取用户标签
   */
  getUserTags() {
    return request({
      url: '/admin/users/tags',
      method: 'get'
    })
  },

  /**
   * 为用户添加标签
   * @param {string|number} id - 用户ID
   * @param {Array} tags - 标签数组
   */
  addUserTags(id, tags) {
    return request({
      url: `/admin/users/${id}/tags`,
      method: 'post',
      data: { tags }
    })
  },

  /**
   * 删除用户标签
   * @param {string|number} id - 用户ID
   * @param {Array} tags - 要删除的标签数组
   */
  removeUserTags(id, tags) {
    return request({
      url: `/admin/users/${id}/tags`,
      method: 'delete',
      data: { tags }
    })
  }
}

export default userApi
