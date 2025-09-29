import { reactive, ref, toRaw } from 'vue'

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
      const result = typeof transform === 'function'
        ? transform(response)
        : {
            list: response?.data ?? [],
            total: response?.pagination?.total ?? 0
          }

      const list = Array.isArray(result?.list) ? result.list : []
      const total = Number(result?.total ?? 0)

      dataSource.value = list
      pagination.current = nextPage
      pagination.pageSize = nextSize
      pagination.total = Number.isNaN(total) ? 0 : total

      if (typeof onSuccess === 'function') {
        onSuccess({ list, total: pagination.total, params })
      }

      return {
        success: true,
        data: list,
        total: pagination.total
      }
    } catch (error) {
      console.error('useTableRequest 请求失败:', error)
      lastError.value = error
      return {
        success: false,
        data: [],
        total: 0,
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
