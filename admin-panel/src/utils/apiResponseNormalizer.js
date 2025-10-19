/**
 * API响应标准化工具
 *
 * 功能：
 * 1. 统一处理不同格式的API响应
 * 2. 标准化分页数据结构
 * 3. 提取列表和分页信息
 *
 * @example
 * const { list, total } = normalizeApiResponse(response)
 * const pagination = normalizePagination(response)
 */

/**
 * 标准化API响应数据
 * 统一处理各种可能的响应格式
 *
 * @param {Object} response - axios响应对象或响应数据
 * @returns {Object} { list, total, pagination, payload }
 */
export function normalizeApiResponse(response) {
  // 处理空响应
  if (!response) {
    return {
      list: [],
      total: 0,
      pagination: null,
      payload: {},
    }
  }

  // 提取payload（核心数据对象）
  const payload = response?.data && typeof response.data === 'object' ? response.data : {}

  // 提取列表数据（尝试多种可能的字段名）
  const listCandidates = [
    payload.list,
    payload.items,
    payload.records,
    payload.rows,
    payload.data,
    response?.data
  ]
  const list = listCandidates.find(item => Array.isArray(item)) || []

  // 提取总数（尝试多种可能的字段名）
  const total = Number(
    payload.total ??
    payload.totalCount ??
    payload.count ??
    payload.totalRecords ??
    response?.total ??
    response?.pagination?.total ??
    list.length
  ) || 0

  // 构建标准化的分页信息
  const pagination = normalizePagination(response, list, total)

  return {
    list,
    total,
    pagination,
    payload,
  }
}

/**
 * 标准化分页信息
 *
 * @param {Object} response - 响应对象
 * @param {Array} list - 列表数据
 * @param {number} total - 总数
 * @returns {Object} { page, pageSize, total, totalPages }
 */
export function normalizePagination(response, list = [], total = 0) {
  const payload = response?.data && typeof response.data === 'object' ? response.data : {}
  const paginationObj = payload.pagination || response?.pagination || {}

  // 简化参数提取，使用 Math.max 确保有效值
  const page = Math.max(1, Number(
    paginationObj.page ??
    paginationObj.current ??
    paginationObj.currentPage ??
    payload.page ??
    response?.page
  ) || 1)

  const pageSize = Math.max(1, Number(
    paginationObj.pageSize ??
    paginationObj.limit ??
    paginationObj.size ??
    paginationObj.perPage ??
    payload.pageSize ??
    payload.limit ??
    response?.pageSize ??
    response?.limit ??
    list.length
  ) || 20)

  const totalPages = Math.max(0, Number(
    paginationObj.totalPages ??
    paginationObj.pages ??
    payload.totalPages ??
    response?.totalPages
  ) || Math.ceil(total / pageSize))

  return {
    page,
    pageSize,
    total,
    totalPages,
  }
}

/**
 * 检查响应是否成功
 *
 * @param {Object} response - 响应对象
 * @returns {boolean}
 */
export function isResponseSuccess(response) {
  if (!response) return false

  const payload = response?.data && typeof response.data === 'object' ? response.data : {}

  // 检查多种可能的成功标志
  return (
    response.status === 200 ||
    response.statusCode === 200 ||
    payload.success === true ||
    payload.status === 'success' ||
    payload.code === 0
  )
}

/**
 * 提取错误消息
 *
 * @param {Object} error - 错误对象
 * @returns {string}
 */
export function extractErrorMessage(error) {
  if (typeof error === 'string') {
    return error
  }

  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  if (error?.message) {
    return error.message
  }

  if (error?.data?.message) {
    return error.data.message
  }

  return '操作失败，请稍后重试'
}

/**
 * 构建ProTable请求函数的响应格式
 * 专门用于ProTable组件的请求处理
 *
 * @param {Object} response - API响应
 * @returns {Object} { data, total, success }
 */
export function buildProTableResponse(response) {
  const { list, total } = normalizeApiResponse(response)

  return {
    data: list,
    total,
    success: isResponseSuccess(response),
  }
}

/**
 * 处理分页参数（前端 -> 后端）
 * 将前端的分页参数转换为后端期望的格式
 *
 * @param {Object} params - 前端分页参数
 * @param {Object} options - 可选配置
 * @returns {Object} 标准化的分页参数
 */
export function normalizePaginationParams(params = {}, options = {}) {
  const {
    pageField = 'page',
    pageSizeField = 'pageSize',
    currentField = 'current',
  } = options

  const page = params[pageField] || params[currentField] || 1
  const pageSize = params[pageSizeField] || params.limit || params.size || 20

  return {
    page: Number(page),
    limit: Number(pageSize), // 后端通常使用limit
    pageSize: Number(pageSize),
  }
}
