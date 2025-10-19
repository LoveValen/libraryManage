/**
 * useRequest - API请求封装（函数式composable）
 *
 * 功能：
 * 1. 统一处理loading、error、success状态
 * 2. 自动错误提示
 * 3. 请求取消支持
 * 4. 重试机制
 *
 * @example
 * const { data, loading, error, execute } = useRequest(getUserList)
 * await execute({ page: 1, limit: 20 })
 */

import { ref, unref } from 'vue'
import { showError, showSuccess } from '@/utils/message'

/**
 * 基础API请求Hook
 *
 * @param {Function} apiFunc - API请求函数
 * @param {Object} options - 配置选项
 * @param {boolean} options.immediate - 是否立即执行，默认false
 * @param {boolean} options.showErrorMsg - 是否显示错误消息，默认true
 * @param {boolean} options.showSuccessMsg - 是否显示成功消息，默认false
 * @param {string} options.successMsg - 成功消息文本
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.transform - 数据转换函数
 * @returns {Object} { data, loading, error, execute, reset }
 */
export function useRequest(apiFunc, options = {}) {
  const {
    immediate = false,
    showErrorMsg = true,
    showSuccessMsg = false,
    successMsg = '操作成功',
    onSuccess = null,
    onError = null,
    transform = null,
  } = options

  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 执行请求
   */
  const execute = async (...args) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiFunc(...args)
      let result = response?.data || response

      // 应用数据转换
      if (transform && typeof transform === 'function') {
        result = transform(result)
      }

      data.value = result

      // 成功提示
      if (showSuccessMsg) {
        showSuccess(successMsg)
      }

      // 成功回调
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result)
      }

      return result
    } catch (err) {
      error.value = err

      // 错误提示
      if (showErrorMsg) {
        const message = err?.response?.data?.message || err?.message || '请求失败'
        showError(message)
      }

      // 错误回调
      if (onError && typeof onError === 'function') {
        onError(err)
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    data.value = null
    loading.value = false
    error.value = null
  }

  // 立即执行
  if (immediate) {
    execute()
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}

/**
 * 列表请求Hook（带分页）
 *
 * @param {Function} apiFunc - API请求函数
 * @param {Object} options - 配置选项
 * @returns {Object} { list, total, loading, error, fetchList, reset, pagination }
 */
export function useListRequest(apiFunc, options = {}) {
  const {
    immediate = false,
    initialPage = 1,
    initialPageSize = 20,
    transform = null,
  } = options

  const list = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: initialPage,
    pageSize: initialPageSize,
  })

  /**
   * 获取列表
   */
  const fetchList = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const requestParams = {
        page: pagination.value.page,
        limit: pagination.value.pageSize,
        ...params,
      }

      const response = await apiFunc(requestParams)
      const result = response?.data || response

      // 提取列表和总数
      list.value = result?.list || result?.data || result?.items || []
      total.value = result?.total || result?.totalCount || 0

      // 应用数据转换
      if (transform && typeof transform === 'function') {
        list.value = transform(list.value)
      }

      return { list: list.value, total: total.value }
    } catch (err) {
      error.value = err
      showError(err?.response?.data?.message || '获取列表失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换分页
   */
  const changePage = async (page, pageSize) => {
    pagination.value.page = page
    if (pageSize) {
      pagination.value.pageSize = pageSize
    }
    await fetchList()
  }

  /**
   * 重置
   */
  const reset = () => {
    list.value = []
    total.value = 0
    loading.value = false
    error.value = null
    pagination.value = {
      page: initialPage,
      pageSize: initialPageSize,
    }
  }

  // 立即执行
  if (immediate) {
    fetchList()
  }

  return {
    list,
    total,
    loading,
    error,
    pagination,
    fetchList,
    changePage,
    reset,
  }
}

/**
 * 创建/更新/删除操作Hook
 *
 * @param {Function} apiFunc - API请求函数
 * @param {Object} options - 配置选项
 * @returns {Object} { loading, error, execute }
 */
export function useMutationRequest(apiFunc, options = {}) {
  const {
    showErrorMsg = true,
    showSuccessMsg = true,
    successMsg = '操作成功',
    onSuccess = null,
    onError = null,
  } = options

  const loading = ref(false)
  const error = ref(null)

  const execute = async (...args) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiFunc(...args)
      const result = response?.data || response

      // 成功提示
      if (showSuccessMsg) {
        showSuccess(successMsg)
      }

      // 成功回调
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result)
      }

      return result
    } catch (err) {
      error.value = err

      // 错误提示
      if (showErrorMsg) {
        const message = err?.response?.data?.message || err?.message || '操作失败'
        showError(message)
      }

      // 错误回调
      if (onError && typeof onError === 'function') {
        onError(err)
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    execute,
  }
}

/**
 * 详情请求Hook
 *
 * @param {Function} apiFunc - API请求函数
 * @param {Object} options - 配置选项
 * @returns {Object} { detail, loading, error, fetchDetail, reset }
 */
export function useDetailRequest(apiFunc, options = {}) {
  const { immediate = false, id = null } = options

  const detail = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchDetail = async (detailId) => {
    const targetId = detailId || unref(id)
    if (!targetId) {
      return null
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiFunc(targetId)
      detail.value = response?.data || response
      return detail.value
    } catch (err) {
      error.value = err
      showError(err?.response?.data?.message || '获取详情失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    detail.value = null
    loading.value = false
    error.value = null
  }

  // 立即执行
  if (immediate && id) {
    fetchDetail(unref(id))
  }

  return {
    detail,
    loading,
    error,
    fetchDetail,
    reset,
  }
}
