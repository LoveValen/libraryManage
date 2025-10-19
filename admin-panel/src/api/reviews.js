import { request } from './request'

/**
 * 获取书评列表
 * @param {Object} params - 查询参数
 */
export function getReviews(params = {}) {
  return request.get('/reviews', { params })
}

/**
 * 获取书评详情
 * @param {number} id - 书评ID
 */
export function getReviewById(id) {
  return request.get(`/reviews/${id}`)
}

/**
 * 创建书评
 * @param {Object} data - 书评数据
 * @param {number} data.bookId - 图书ID
 * @param {number} data.rating - 评分
 * @param {string} data.title - 书评标题
 * @param {string} data.content - 书评内容
 * @param {boolean} data.isAnonymous - 是否匿名
 * @param {boolean} data.isSpoiler - 是否包含剧透
 */
export function createReview(data) {
  return request.post('/reviews', data)
}

/**
 * 更新书评
 * @param {number} id - 书评ID
 * @param {Object} data - 更新数据
 */
export function updateReview(id, data) {
  return request.put(`/reviews/${id}`, data)
}

/**
 * 删除书评
 * @param {number} id - 书评ID
 */
export function deleteReview(id) {
  return request.delete(`/reviews/${id}`)
}

/**
 * 获取图书的书评
 * @param {number} bookId - 图书ID
 * @param {Object} params - 查询参数
 */
export function getBookReviews(bookId, params = {}) {
  return request.get(`/reviews/book/${bookId}`, { params })
}

/**
 * 点赞书评
 * @param {number} id - 书评ID
 */
export function likeReview(id) {
  return request.post(`/reviews/${id}/like`)
}

/**
 * 标记书评为有用
 * @param {number} id - 书评ID
 */
export function markReviewHelpful(id) {
  return request.post(`/reviews/${id}/helpful`)
}

/**
 * 审核书评
 * @param {number} id - 书评ID
 * @param {Object} data - 审核数据
 * @param {string} data.action - 审核操作（approve/reject/hide）
 * @param {string} data.reason - 审核原因
 */
export function moderateReview(id, data) {
  return request.put(`/reviews/${id}/moderate`, data)
}

/**
 * 获取精选书评
 * @param {Object} params - 查询参数
 */
export function getFeaturedReviews(params = {}) {
  return request.get('/reviews/featured', { params })
}

/**
 * 批量审核书评
 * @param {Object} data - 批量审核数据
 * @param {Array} data.reviewIds - 书评ID列表
 * @param {string} data.action - 审核操作
 * @param {string} data.reason - 审核原因
 */
export function batchModerateReviews(data) {
  return request.post('/reviews/batch-moderate', data)
}

/**
 * 获取待审核书评
 * @param {Object} params - 查询参数
 */
export function getPendingReviews(params = {}) {
  return request.get('/reviews/pending', { params })
}

/**
 * 获取书评统计
 * @param {Object} params - 查询参数
 */
export function getReviewStatistics(params = {}) {
  return request.get('/reviews/statistics', { params })
}

/**
 * 导出书评数据
 * @param {Object} params - 导出参数
 */
export function exportReviews(params = {}) {
  return request.download('/reviews/export', 'reviews.xlsx', { params })
}

/**
 * 获取用户书评
 * @param {number} userId - 用户ID
 * @param {Object} params - 查询参数
 */
export function getUserReviews(userId, params = {}) {
  return request.get(`/reviews/user/${userId}`, { params })
}

/**
 * 举报书评
 * @param {number} id - 书评ID
 * @param {Object} data - 举报数据
 * @param {string} data.reason - 举报原因
 * @param {string} data.description - 举报描述
 */
export function reportReview(id, data) {
  return request.post(`/reviews/${id}/report`, data)
}

/**
 * 获取举报列表
 * @param {Object} params - 查询参数
 */
export function getReports(params = {}) {
  return request.get('/reviews/reports', { params })
}

/**
 * 处理举报
 * @param {number} id - 举报ID
 * @param {Object} data - 处理数据
 * @param {string} data.action - 处理动作
 * @param {string} data.reason - 处理原因
 */
export function processReport(id, data) {
  return request.put(`/reviews/reports/${id}`, data)
}

/**
 * 获取热门书评
 * @param {Object} params - 查询参数
 */
export function getPopularReviews(params = {}) {
  return request.get('/reviews/popular', { params })
}

/**
 * 设置精选书评
 * @param {number} id - 书评ID
 * @param {Object} data - 设置数据
 * @param {boolean} data.featured - 是否精选
 * @param {string} data.reason - 精选原因
 */
export function setFeaturedReview(id, data) {
  return request.put(`/reviews/${id}/featured`, data)
}
