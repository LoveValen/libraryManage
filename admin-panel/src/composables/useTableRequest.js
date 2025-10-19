import { reactive, ref, toRaw } from 'vue'

import { extractListResponse } from '@/utils/apiResponse'

const pickFirstNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return undefined
}

const pickFirstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

/**
 * 通用表格请求组合式函数，参考 Ant Design Pro useFetchData 思路
 * @param {Function} fetcher 实际请求函数，需返回 Promise
 * @param {Object} options 配置项
 * @returns {Object} 表格数据与操作方法
 */
export function useTableRequest(fetcher, options = {}) {
  const {
    defaultSearch = {},
    defaultPage = 1,
    defaultPageSize = 10,
    defaultSorter = {},
    formatParams,
    transform,
    onSuccess,
    immediate = true,
    manual = false
  } = options

  const searchForm = reactive({ ...defaultSearch })
  const loading = ref(false)
  const dataSource = ref([])
  const pagination = reactive({
    current: defaultPage,
    pageSize: defaultPageSize,
    total: 0
  })
  const sorter = reactive({
    field: defaultSorter.field,
    order: defaultSorter.order
  })
  const lastError = ref(null)

  const cloneSearch = () => ({
    ...JSON.parse(JSON.stringify(toRaw(searchForm)))
  })

  const buildParams = (page, pageSize, activeSorter) => {
    const rawSearch = cloneSearch()

    if (typeof formatParams === 'function') {
      return formatParams({
        search: rawSearch,
        page,
        pageSize,
        sorter: activeSorter
      })
    }

    const params = {
      page,
      size: pageSize,
      ...rawSearch
    }

    if (activeSorter?.field) {
      params.sortBy = activeSorter.field
      params.sortOrder = activeSorter.order && String(activeSorter.order).includes('asc') ? 'asc' : 'desc'
    }

    return params
  }

  const request = async ({ current, pageSize, sorter: incomingSorter } = {}) => {
    const nextPage = current ?? pagination.current
    const nextSize = pageSize ?? pagination.pageSize

    if (incomingSorter) {
      sorter.field = incomingSorter.field
      sorter.order = incomingSorter.order
    }

    const params = buildParams(nextPage, nextSize, incomingSorter ?? sorter)

    loading.value = true
    lastError.value = null

    try {
      const response = await fetcher(params)
      const rawPayload = response && typeof response === 'object' && response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
        ? response.data
        : {}
      const payloadMeta = extractListResponse(rawPayload)
      const responseMeta = extractListResponse(response)

      const derivedList = payloadMeta.list.length
        ? payloadMeta.list
        : (responseMeta.list.length ? responseMeta.list : [])
      const normalizedList = Array.isArray(derivedList) ? derivedList : []

      const normalizedTotal = pickFirstNumber(
        payloadMeta.total,
        responseMeta.total,
        response?.total,
        response?.pagination?.total,
        normalizedList.length
      ) ?? normalizedList.length

      const normalizedPage = pickFirstNumber(
        payloadMeta.page,
        responseMeta.page,
        response?.page,
        response?.pagination?.page,
        response?.pagination?.current,
        nextPage
      ) ?? nextPage

      const normalizedPageSize = pickFirstNumber(
        payloadMeta.pageSize,
        responseMeta.pageSize,
        response?.pageSize,
        response?.pagination?.pageSize,
        response?.pagination?.limit,
        nextSize
      ) ?? nextSize

      const normalizedTotalPages = pickFirstNumber(
        payloadMeta.totalPages,
        responseMeta.totalPages,
        response?.totalPages,
        response?.pagination?.totalPages,
        response?.pagination?.pages
      ) ?? (normalizedPageSize > 0 ? Math.ceil(normalizedTotal / normalizedPageSize) : 0)

      const normalizedResponse = {
        ...response,
        data: {
          ...rawPayload,
          list: normalizedList,
          total: normalizedTotal,
          page: normalizedPage,
          pageSize: normalizedPageSize,
          totalPages: normalizedTotalPages
        }
      }

      const result = typeof transform === 'function'
        ? transform(normalizedResponse)
        : {
            list: normalizedResponse.data.list,
            total: normalizedResponse.data.total,
            page: normalizedResponse.data.page,
            pageSize: normalizedResponse.data.pageSize,
            totalPages: normalizedResponse.data.totalPages
          }

      const list = Array.isArray(result?.list) ? result.list : normalizedResponse.data.list
      const total = Number(result?.total ?? normalizedResponse.data.total ?? 0)
      const pageForState = Number(result?.page ?? normalizedResponse.data.page ?? nextPage)
      const pageSizeForState = Number(result?.pageSize ?? normalizedResponse.data.pageSize ?? nextSize)
      const totalPagesForState = Number(result?.totalPages ?? normalizedResponse.data.totalPages ?? (Number.isNaN(total) || Number.isNaN(pageSizeForState) || pageSizeForState <= 0 ? 0 : Math.ceil(total / pageSizeForState)))

      dataSource.value = Array.isArray(list) ? list : []
      pagination.current = Number.isNaN(pageForState) ? nextPage : pageForState
      pagination.pageSize = Number.isNaN(pageSizeForState) ? nextSize : pageSizeForState
      pagination.total = Number.isNaN(total) ? 0 : total

      if (typeof onSuccess === 'function') {
        onSuccess({ list: dataSource.value, total: pagination.total, params })
      }

      return {
        success: true,
        data: dataSource.value,
        total: pagination.total,
        page: pagination.current,
        pageSize: pagination.pageSize,
        totalPages: Number.isNaN(totalPagesForState)
          ? (pagination.pageSize > 0 ? Math.ceil(pagination.total / pagination.pageSize) : 0)
          : totalPagesForState
      }
    } catch (error) {
      console.error('useTableRequest 请求失败:', error)
      lastError.value = error
      return {
        success: false,
        data: [],
        total: 0,
        page: pagination.current,
        pageSize: pagination.pageSize,
        totalPages: 0,
        message: error?.message || '请求失败'
      }
    } finally {
      loading.value = false
    }
  }

  const reload = (extra = {}) => {
    const nextSorter = extra.sorter ?? sorter
    return request({
      current: extra.page ?? pagination.current,
      pageSize: extra.pageSize ?? pagination.pageSize,
      sorter: nextSorter
    })
  }

  const handleSearch = (values = {}) => {
    Object.assign(searchForm, values)
    return reload({ page: defaultPage })
  }

  const handleReset = () => {
    Object.keys(searchForm).forEach(key => {
      searchForm[key] = Object.prototype.hasOwnProperty.call(defaultSearch, key) ? defaultSearch[key] : undefined
    })
    sorter.field = defaultSorter.field
    sorter.order = defaultSorter.order
    return reload({ page: defaultPage })
  }

  if (immediate && !manual) {
    request({ current: pagination.current, pageSize: pagination.pageSize })
  }

  return {
    searchForm,
    loading,
    dataSource,
    pagination,
    sorter,
    lastError,
    request,
    reload,
    handleSearch,
    handleReset
  }
}
