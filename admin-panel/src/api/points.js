import { request } from './request'

/**
 * 积分系统相关API
 */
export const pointsApi = {
  getUserPointsHistory: (params = {}) => {
    const { userId, ...otherParams } = params
    if (userId) {
      return request.get(`/points/users/${userId}/history`, { params: otherParams })
    }
    return request.get('/points/my/history', { params: otherParams })
  }
}

/**
 * 获取积分交易记录
 * @param {Object} params - 查询参数
 */
export function getPointsTransactions(params = {}) {
  return request.get('/points/transactions', { params })
}

/**
 * 获取积分排行榜
 * @param {Object} params - 查询参数
 */
export function getPointsLeaderboard(params = {}) {
  return request.get('/points/leaderboard', { params })
}

/**
 * 获取徽章系统
 * @param {Object} params - 查询参数
 */
export function getBadges(params = {}) {
  return request.get('/points/badges', { params })
}

/**
 * 获取积分规则
 */
export function getPointsRules() {
  return request.get('/points/rules')
}

/**
 * 获取奖励商城
 * @param {Object} params - 查询参数
 */
export function getRewards(params = {}) {
  return request.get('/points/rewards', { params })
}

/**
 * 获取用户积分信息
 * @param {number} userId - 用户ID
 */
export function getUserPoints(userId) {
  return request.get(`/points/users/${userId}`)
}

/**
 * 获取用户积分记录
 * @param {Object} params - 查询参数
 */
export function getUserPointsHistory(params = {}) {
  const { userId, ...otherParams } = params
  if (userId) {
    return request.get(`/points/users/${userId}/history`, { params: otherParams })
  }
  return request.get('/points/my/history', { params: otherParams })
}

/**
 * 获取积分历史记录 (别名)
 * @param {Object} params - 查询参数
 */
export function getPointsHistory(params = {}) {
  const { userId, ...otherParams } = params
  if (userId) {
    return request.get(`/points/users/${userId}/history`, { params: otherParams })
  }
  return request.get('/points/my/history', { params: otherParams })
}

/**
 * 管理员调整积分
 * @param {Object} data - 调整数据
 * @param {number} data.userId - 用户ID
 * @param {number} data.pointsChange - 积分变化
 * @param {string} data.reason - 调整原因
 * @param {string} data.transactionType - 交易类型
 */
export function adjustPoints(data) {
  return request.post('/points/admin/adjust', data)
}

/**
 * 获取积分统计
 * @param {Object} params - 查询参数
 */
export function getPointsStatistics(params = {}) {
  return request.get('/points/statistics', { params })
}

/**
 * 创建奖励
 * @param {Object} data - 奖励数据
 * @param {string} data.name - 奖励名称
 * @param {string} data.description - 奖励描述
 * @param {string} data.type - 奖励类型
 * @param {string} data.category - 奖励分类
 * @param {number} data.pointsCost - 积分成本
 * @param {number} data.stock - 库存数量
 * @param {boolean} data.isAvailable - 是否可用
 */
export function createReward(data) {
  return request.post('/points/rewards', data)
}

/**
 * 更新奖励
 * @param {number} id - 奖励ID
 * @param {Object} data - 更新数据
 */
export function updateReward(id, data) {
  return request.put(`/points/rewards/${id}`, data)
}

/**
 * 删除奖励
 * @param {number} id - 奖励ID
 */
export function deleteReward(id) {
  return request.delete(`/points/rewards/${id}`)
}

/**
 * 获取兑换记录
 * @param {Object} params - 查询参数
 */
export function getRedemptions(params = {}) {
  return request.get('/points/redemptions', { params })
}

/**
 * 处理兑换
 * @param {number} id - 兑换ID
 * @param {Object} data - 处理数据
 * @param {string} data.status - 新状态
 * @param {string} data.notes - 处理备注
 */
export function processRedemption(id, data) {
  return request.put(`/points/redemptions/${id}`, data)
}

/**
 * 创建徽章
 * @param {Object} data - 徽章数据
 * @param {string} data.name - 徽章名称
 * @param {string} data.description - 徽章描述
 * @param {string} data.icon - 徽章图标
 * @param {string} data.category - 徽章分类
 * @param {string} data.rarity - 稀有度
 * @param {number} data.pointsReward - 积分奖励
 * @param {Object} data.condition - 获得条件
 */
export function createBadge(data) {
  return request.post('/points/badges', data)
}

/**
 * 更新徽章
 * @param {number} id - 徽章ID
 * @param {Object} data - 更新数据
 */
export function updateBadge(id, data) {
  return request.put(`/points/badges/${id}`, data)
}

/**
 * 删除徽章
 * @param {number} id - 徽章ID
 */
export function deleteBadge(id) {
  return request.delete(`/points/badges/${id}`)
}

/**
 * 获取用户徽章
 * @param {number} userId - 用户ID
 * @param {Object} params - 查询参数
 */
export function getUserBadges(userId, params = {}) {
  return request.get(`/points/users/${userId}/badges`, { params })
}

/**
 * 手动授予徽章
 * @param {Object} data - 授予数据
 * @param {number} data.userId - 用户ID
 * @param {number} data.badgeId - 徽章ID
 * @param {string} data.reason - 授予原因
 */
export function awardBadge(data) {
  return request.post('/points/badges/award', data)
}

/**
 * 撤销徽章
 * @param {number} userBadgeId - 用户徽章ID
 * @param {Object} data - 撤销数据
 * @param {string} data.reason - 撤销原因
 */
export function revokeBadge(userBadgeId, data) {
  return request.delete(`/points/user-badges/${userBadgeId}`, { data })
}

/**
 * 更新积分规则
 * @param {Object} data - 规则数据
 */
export function updatePointsRules(data) {
  return request.put('/points/rules', data)
}

/**
 * 批量调整积分
 * @param {Object} data - 批量调整数据
 * @param {Array} data.users - 用户列表
 * @param {number} data.pointsChange - 积分变化
 * @param {string} data.reason - 调整原因
 */
export function batchAdjustPoints(data) {
  return request.post('/points/admin/batch-adjust', data)
}

/**
 * 导出积分数据
 * @param {Object} params - 导出参数
 */
export function exportPointsData(params = {}) {
  return request.download('/points/export', 'points.xlsx', { params })
}

/**
 * 获取积分趋势
 * @param {Object} params - 查询参数
 */
export function getPointsTrend(params = {}) {
  return request.get('/points/trend', { params })
}

/**
 * 获取等级分布
 * @param {Object} params - 查询参数
 */
export function getLevelDistribution(params = {}) {
  return request.get('/points/level-distribution', { params })
}

/**
 * 重新计算排名
 */
export function recalculateRanking() {
  return request.post('/points/admin/recalculate-ranking')
}

/**
 * 检查并授予徽章
 * @param {number} userId - 用户ID（可选，不提供则检查所有用户）
 */
export function checkAndAwardBadges(userId = null) {
  const url = userId ? `/points/admin/check-badges/${userId}` : '/points/admin/check-badges'
  return request.post(url)
}
