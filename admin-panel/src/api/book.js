import request from './request'

/**
 * 图书相关API
 */
export const bookApi = {
  /**
   * 获取图书列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 页面大小
   * @param {string} params.keyword - 搜索关键词
   * @param {string} params.category - 分类筛选
   * @param {string} params.status - 状态筛选
   * @param {string} params.location - 位置筛选
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.sortBy - 排序字段
   * @param {string} params.sortOrder - 排序方向
   */
  getBooks(params = {}) {
    return request({
      url: '/books',
      method: 'get',
      params
    })
  },

  /**
   * 获取图书详情
   * @param {string|number} id - 图书ID
   */
  getBookDetail(id) {
    return request({
      url: `/books/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建图书
   * @param {Object} bookData - 图书数据
   * @param {string} bookData.title - 书名
   * @param {string} bookData.author - 作者
   * @param {string} bookData.isbn - ISBN
   * @param {string} bookData.publisher - 出版社
   * @param {string} bookData.publishDate - 出版日期
   * @param {number} bookData.categoryId - 分类ID
   * @param {string} bookData.description - 描述
   * @param {string} bookData.cover - 封面URL
   * @param {string} bookData.language - 语言
   * @param {number} bookData.pages - 页数
   * @param {string} bookData.format - 版本格式
   * @param {number} bookData.edition - 版次
   * @param {string} bookData.location - 位置
   * @param {number} bookData.stock - 库存数量
   * @param {string} bookData.status - 状态
   * @param {Array} bookData.tags - 标签
   * @param {number} bookData.price - 价格
   */
  createBook(bookData) {
    return request({
      url: '/books',
      method: 'post',
      data: bookData
    })
  },

  /**
   * 更新图书信息
   * @param {string|number} id - 图书ID
   * @param {Object} bookData - 图书数据
   */
  updateBook(id, bookData) {
    return request({
      url: `/books/${id}`,
      method: 'put',
      data: bookData
    })
  },

  /**
   * 删除图书
   * @param {string|number} id - 图书ID
   */
  deleteBook(id) {
    return request({
      url: `/books/${id}`,
      method: 'delete'
    })
  },

  /**
   * 批量删除图书
   * @param {Array} bookIds - 图书ID数组
   */
  batchDeleteBooks(bookIds) {
    return request({
      url: '/books/batch-delete',
      method: 'post',
      data: { bookIds }
    })
  },

  /**
   * 批量更新图书状态
   * @param {Array} bookIds - 图书ID数组
   * @param {string} status - 新状态
   */
  batchUpdateStatus(bookIds, status) {
    return request({
      url: '/books/batch-status',
      method: 'post',
      data: { bookIds, status }
    })
  },

  /**
   * 批量更新图书位置
   * @param {Array} bookIds - 图书ID数组
   * @param {string} location - 新位置
   */
  batchUpdateLocation(bookIds, location) {
    return request({
      url: '/books/batch-location',
      method: 'post',
      data: { bookIds, location }
    })
  },

  /**
   * 复制图书
   * @param {string|number} id - 图书ID
   * @param {Object} options - 复制选项
   * @param {number} options.count - 复制数量
   * @param {string} options.location - 新位置
   */
  duplicateBook(id, options = {}) {
    return request({
      url: `/books/${id}/duplicate`,
      method: 'post',
      data: options
    })
  },

  /**
   * 导出图书数据
   * @param {Object} params - 导出参数
   */
  exportBooks(params = {}) {
    return request({
      url: '/books/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  },


  /**
   * 获取图书统计数据
   * @param {Object} params - 统计参数
   * @param {string} params.period - 统计期间 (day|week|month|year)
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   */
  getBookStats(params = {}) {
    return request({
      url: '/books/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取图书分类列表
   */
  getCategories() {
    return request({
      url: '/books/categories',
      method: 'get'
    })
  },

  /**
   * 创建图书分类
   * @param {Object} categoryData - 分类数据
   * @param {string} categoryData.name - 分类名称
   * @param {string} categoryData.description - 分类描述
   * @param {string} categoryData.color - 分类颜色
   * @param {number} categoryData.parentId - 父分类ID
   * @param {number} categoryData.sort - 排序
   */
  createCategory(categoryData) {
    return request({
      url: '/books/categories',
      method: 'post',
      data: categoryData
    })
  },

  /**
   * 更新图书分类
   * @param {string|number} id - 分类ID
   * @param {Object} categoryData - 分类数据
   */
  updateCategory(id, categoryData) {
    return request({
      url: `/books/categories/${id}`,
      method: 'put',
      data: categoryData
    })
  },

  /**
   * 删除图书分类
   * @param {string|number} id - 分类ID
   */
  deleteCategory(id) {
    return request({
      url: `/books/categories/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取分类树结构
   */
  getCategoryTree() {
    return request({
      url: '/books/categories/tree',
      method: 'get'
    })
  },

  /**
   * 检查ISBN是否已存在
   * @param {string} isbn - ISBN
   * @param {string|number} excludeId - 排除的图书ID（编辑时使用）
   */
  checkISBN(isbn, excludeId = null) {
    return request({
      url: '/books/check-isbn',
      method: 'post',
      data: { isbn, excludeId }
    })
  },

  /**
   * 搜索图书（用于自动完成）
   * @param {string} query - 搜索关键词
   * @param {number} limit - 返回数量限制
   */
  searchBooks(query, limit = 10) {
    return request({
      url: '/books/search',
      method: 'get',
      params: { query, limit }
    })
  },

  /**
   * 获取图书标签
   */
  getBookTags() {
    return request({
      url: '/book-tags/active',
      method: 'get'
    })
  },

  /**
   * 为图书添加标签
   * @param {string|number} id - 图书ID
   * @param {Array} tags - 标签数组
   */
  addBookTags(id, tags) {
    return request({
      url: `/books/${id}/tags`,
      method: 'post',
      data: { tags }
    })
  },

  /**
   * 删除图书标签
   * @param {string|number} id - 图书ID
   * @param {Array} tags - 要删除的标签数组
   */
  removeBookTags(id, tags) {
    return request({
      url: `/books/${id}/tags`,
      method: 'delete',
      data: { tags }
    })
  },

  /**
   * 获取图书评论
   * @param {string|number} id - 图书ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 页面大小
   */
  getBookReviews(id, params = {}) {
    return request({
      url: `/books/${id}/reviews`,
      method: 'get',
      params
    })
  },

  /**
   * 删除图书评论
   * @param {string|number} bookId - 图书ID
   * @param {string|number} reviewId - 评论ID
   */
  deleteBookReview(bookId, reviewId) {
    return request({
      url: `/books/${bookId}/reviews/${reviewId}`,
      method: 'delete'
    })
  },

  /**
   * 获取图书借阅记录
   * @param {string|number} id - 图书ID
   * @param {Object} params - 查询参数
   */
  getBookBorrowHistory(id, params = {}) {
    return request({
      url: `/books/${id}/borrows`,
      method: 'get',
      params
    })
  },

  /**
   * 获取热门图书
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 返回数量
   * @param {string} params.period - 时间段
   * @param {string} params.type - 类型 (borrow|view|rating)
   */
  getPopularBooks(params = {}) {
    return request({
      url: '/books/popular',
      method: 'get',
      params
    })
  },

  /**
   * 获取推荐图书
   * @param {Object} params - 查询参数
   * @param {number} params.userId - 用户ID（可选）
   * @param {number} params.limit - 返回数量
   * @param {string} params.type - 推荐类型
   */
  getRecommendedBooks(params = {}) {
    return request({
      url: '/books/recommended',
      method: 'get',
      params
    })
  },

  /**
   * 获取图书位置列表
   */
  getBookLocations() {
    return request({
      url: '/book-locations/active',
      method: 'get'
    })
  },

  /**
   * 更新图书封面
   * @param {string|number} id - 图书ID
   * @param {FormData} formData - 包含封面文件的表单数据
   */
  updateBookCover(id, formData) {
    return request({
      url: `/books/${id}/cover`,
      method: 'put',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 生成图书二维码
   * @param {string|number} id - 图书ID
   * @param {Object} options - 二维码选项
   * @param {string} options.size - 尺寸
   * @param {string} options.format - 格式
   */
  generateBookQRCode(id, options = {}) {
    return request({
      url: `/books/${id}/qrcode`,
      method: 'get',
      params: options,
      responseType: 'blob'
    })
  },

  /**
   * 批量导入图书封面
   * @param {FormData} formData - 包含文件的表单数据
   */
  batchImportCovers(formData) {
    return request({
      url: '/books/batch-covers',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 获取图书库存变动记录
   * @param {string|number} id - 图书ID
   * @param {Object} params - 查询参数
   */
  getBookStockHistory(id, params = {}) {
    return request({
      url: `/books/${id}/stock-history`,
      method: 'get',
      params
    })
  },

  /**
   * 调整图书库存
   * @param {string|number} id - 图书ID
   * @param {Object} data - 调整数据
   * @param {number} data.change - 变动数量（正数增加，负数减少）
   * @param {string} data.reason - 调整原因
   * @param {string} data.note - 备注
   */
  adjustBookStock(id, data) {
    return request({
      url: `/books/${id}/stock/adjust`,
      method: 'post',
      data
    })
  },

  /**
   * 批量调整图书库存
   * @param {Object} data - 批量调整数据
   * @param {Array} data.books - 图书列表 [{ id, change, reason }]
   * @param {string} data.note - 批量备注
   */
  batchAdjustStock(data) {
    return request({
      url: '/books/batch-stock-adjust',
      method: 'post',
      data
    })
  },

  /**
   * 获取图书趋势数据
   * @param {Object} params - 查询参数
   * @param {string} params.period - 时间段
   * @param {string} params.metric - 指标类型
   */
  getBookTrends(params = {}) {
    return request({
      url: '/books/trends',
      method: 'get',
      params
    })
  },

  /**
   * 获取分类统计
   * @param {Object} params - 查询参数
   */
  getCategoryStats(params = {}) {
    return request({
      url: '/categories/stats',
      method: 'get',
      params
    })
  },

  /**
   * 重新索引图书搜索
   */
  reindexBooks() {
    return request({
      url: '/books/reindex',
      method: 'post'
    })
  },

  /**
   * 获取图书操作日志
   * @param {string|number} id - 图书ID
   * @param {Object} params - 查询参数
   */
  getBookLogs(id, params = {}) {
    return request({
      url: `/books/${id}/logs`,
      method: 'get',
      params
    })
  }
}

export default bookApi
