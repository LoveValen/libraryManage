import { request } from './request'

/**
 * 获取图书列表
 * @param {Object} params - 查询参数
 */
export function getBooks(params = {}) {
  return request.get('/books', { params })
}

/**
 * 获取图书详情
 * @param {number} id - 图书ID
 */
export function getBookById(id) {
  return request.get(`/books/${id}`)
}

/**
 * 创建图书
 * @param {Object} data - 图书数据
 */
export function createBook(data) {
  return request.post('/books', data)
}

/**
 * 更新图书信息
 * @param {number} id - 图书ID
 * @param {Object} data - 更新数据
 */
export function updateBook(id, data) {
  return request.put(`/books/${id}`, data)
}

/**
 * 删除图书
 * @param {number} id - 图书ID
 */
export function deleteBook(id) {
  return request.delete(`/books/${id}`)
}

/**
 * 搜索图书
 * @param {Object} params - 搜索参数
 */
export function searchBooks(params) {
  return request.get('/books/search', { params })
}

/**
 * 获取图书分类
 */
export function getBookCategories() {
  return request.get('/books/categories')
}

/**
 * 创建图书分类
 * @param {Object} data - 分类数据
 */
export function createBookCategory(data) {
  return request.post('/books/categories', data)
}

/**
 * 更新图书分类
 * @param {string} name - 分类名称
 * @param {Object} data - 更新数据
 */
export function updateBookCategory(name, data) {
  return request.put(`/books/categories/${encodeURIComponent(name)}`, data)
}

/**
 * 删除图书分类
 * @param {string} name - 分类名称
 */
export function deleteBookCategory(name) {
  return request.delete(`/books/categories/${encodeURIComponent(name)}`)
}

/**
 * 更新图书库存
 * @param {number} id - 图书ID
 * @param {Object} data - 库存数据
 * @param {number} data.totalStock - 总库存
 * @param {number} data.availableStock - 可用库存
 */
export function updateBookStock(id, data) {
  return request.patch(`/books/${id}/stock`, data)
}

/**
 * 获取热门图书
 * @param {Object} params - 查询参数
 */
export function getPopularBooks(params = {}) {
  return request.get('/books/popular', { params })
}

/**
 * 获取最新图书
 * @param {Object} params - 查询参数
 */
export function getRecentBooks(params = {}) {
  return request.get('/books/recent', { params })
}

/**
 * 下载图书导入模板
 */
export function downloadImportTemplate() {
  return request.get('/books/import/template', {
    responseType: 'blob'
  })
}

/**
 * 上传导入文件并预览
 * @param {FormData} formData - 包含文件的表单数据
 */
export function uploadImportFile(formData) {
  return request.post('/books/import/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 验证导入数据
 * @param {string} fileId - 文件ID
 */
export function validateImportData(fileId) {
  return request.post('/books/import/validate', { fileId })
}

/**
 * 执行图书数据导入
 * @param {Object} importData - 导入配置数据
 */
export function importBooks(importData) {
  return request.post('/books/import', importData)
}

/**
 * 获取导入历史记录
 * @param {Object} params - 查询参数
 */
export function getImportHistory(params = {}) {
  return request.get('/books/import/history', { params })
}

/**
 * 获取导入任务状态
 * @param {string} taskId - 任务ID
 */
export function getImportTaskStatus(taskId) {
  return request.get(`/books/import/status/${taskId}`)
}

/**
 * 获取图书统计信息
 * @param {Object} params - 查询参数
 */
export function getBookStatistics(params = {}) {
  return request.get('/books/statistics', { params })
}

/**
 * 从ISBN获取图书信息
 * @param {string} isbn - ISBN号
 */
export function getBookByISBN(isbn) {
  return request.get(`/books/isbn/${isbn}`)
}
