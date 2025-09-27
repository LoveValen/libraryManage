import request from './request'

/**
 * 图书存放位置相关 API
 */
export const bookLocationApi = {
  /**
   * 获取位置列表
   */
  getLocations(params = {}) {
    return request({
      url: '/book-locations',
      method: 'get',
      params
    })
  },

  /**
   * 获取所有可用位置
   */
  getActiveLocations() {
    return request({
      url: '/book-locations/active',
      method: 'get'
    })
  },

  /**
   * 创建位置
   */
  createLocation(data) {
    return request({
      url: '/book-locations',
      method: 'post',
      data
    })
  },

  /**
   * 更新位置
   */
  updateLocation(id, data) {
    return request({
      url: `/book-locations/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除位置
   */
  deleteLocation(id) {
    return request({
      url: `/book-locations/${id}`,
      method: 'delete'
    })
  }
}

export default bookLocationApi
