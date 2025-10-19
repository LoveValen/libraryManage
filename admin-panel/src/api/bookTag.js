import request from './request'

/**
 * 图书标签相关 API
 */
export const bookTagApi = {
  /**
   * 获取标签列表
   */
  getTags(params = {}) {
    return request({
      url: '/book-tags',
      method: 'get',
      params
    })
  },

  /**
   * 获取可用标签
   */
  getActiveTags() {
    return request({
      url: '/book-tags/active',
      method: 'get'
    })
  },

  /**
   * 创建标签
   */
  createTag(data) {
    return request({
      url: '/book-tags',
      method: 'post',
      data
    })
  },

  /**
   * 更新标签
   */
  updateTag(id, data) {
    return request({
      url: `/book-tags/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除标签
   */
  deleteTag(id) {
    return request({
      url: `/book-tags/${id}`,
      method: 'delete'
    })
  }
}

export default bookTagApi
