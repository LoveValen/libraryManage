// 通用接口响应解析工具，负责从多层嵌套数据中提取列表及分页信息
const MAX_DEPTH = 6
const LIST_KEY_CANDIDATES = ['list', 'items', 'records', 'rows', 'data', 'result', 'results', 'content']
const TOTAL_KEY_CANDIDATES = ['total', 'totalCount', 'count', 'totalElements', 'totalRecords', 'recordsTotal']
const TOTAL_PAGE_KEY_CANDIDATES = ['totalPages', 'pages']
const PAGE_KEY_CANDIDATES = ['page', 'current', 'pageNumber', 'pageIndex']
const PAGE_SIZE_KEY_CANDIDATES = ['pageSize', 'limit', 'size', 'perPage']
const PAYLOAD_KEY_CANDIDATES = ['data', 'result', 'payload', 'response', 'records']

const isObject = (value) => value !== null && typeof value === 'object'

const resolveListFromPayload = (payload, depth = 0) => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (!isObject(payload) || depth > MAX_DEPTH) {
    return []
  }

  for (const key of LIST_KEY_CANDIDATES) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const candidate = resolveListFromPayload(payload[key], depth + 1)
      if (candidate.length) {
        return candidate
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length) {
      return value
    }
    if (isObject(value)) {
      const candidate = resolveListFromPayload(value, depth + 1)
      if (candidate.length) {
        return candidate
      }
    }
  }

  return []
}

const toFiniteNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

const resolveNumericValue = (payload, keyCandidates, depth = 0) => {
  if (!isObject(payload) || depth > MAX_DEPTH) {
    return undefined
  }

  for (const key of keyCandidates) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const raw = payload[key]
      const resolved = toFiniteNumber(raw)
      if (resolved !== undefined) {
        return resolved
      }
      if (isObject(raw)) {
        const nested = resolveNumericValue(raw, keyCandidates, depth + 1)
        if (nested !== undefined) {
          return nested
        }
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (isObject(value)) {
      const nested = resolveNumericValue(value, keyCandidates, depth + 1)
      if (nested !== undefined) {
        return nested
      }
    }
  }

  return undefined
}

const normalizeListMeta = (payload) => {
  if (Array.isArray(payload)) {
    return {
      list: payload,
      total: payload.length,
      page: undefined,
      pageSize: undefined,
      totalPages: undefined
    }
  }
  if (!isObject(payload)) {
    return {
      list: [],
      total: undefined,
      page: undefined,
      pageSize: undefined,
      totalPages: undefined
    }
  }

  const list = resolveListFromPayload(payload)
  const total = resolveNumericValue(payload, TOTAL_KEY_CANDIDATES)
  const page = resolveNumericValue(payload, PAGE_KEY_CANDIDATES)
  const pageSize = resolveNumericValue(payload, PAGE_SIZE_KEY_CANDIDATES)
  const totalPages = resolveNumericValue(payload, TOTAL_PAGE_KEY_CANDIDATES)

  return { list, total, page, pageSize, totalPages }
}

const mergeMeta = (target, source) => {
  if (source.list.length && !target.list.length) {
    target.list = source.list
  }
  if (source.total !== undefined && target.total === undefined) {
    target.total = source.total
  }
  if (source.page !== undefined && target.page === undefined) {
    target.page = source.page
  }
  if (source.pageSize !== undefined && target.pageSize === undefined) {
    target.pageSize = source.pageSize
  }
  if (source.totalPages !== undefined && target.totalPages === undefined) {
    target.totalPages = source.totalPages
  }
}

export const extractListResponse = (response) => {
  if (Array.isArray(response)) {
    return {
      list: response,
      total: response.length,
      page: undefined,
      pageSize: undefined,
      totalPages: undefined
    }
  }

  const mergedMeta = {
    list: [],
    total: undefined,
    page: undefined,
    pageSize: undefined,
    totalPages: undefined
  }

  if (isObject(response)) {
    mergeMeta(mergedMeta, normalizeListMeta(response))

    for (const key of PAYLOAD_KEY_CANDIDATES) {
      if (isObject(response[key])) {
        mergeMeta(mergedMeta, normalizeListMeta(response[key]))
      }
    }

    if (!mergedMeta.list.length) {
      if (Array.isArray(response.data)) {
        mergedMeta.list = response.data
      } else if (Array.isArray(response.list)) {
        mergedMeta.list = response.list
      }
    }

    if (mergedMeta.total === undefined) {
      mergedMeta.total = resolveNumericValue(response, TOTAL_KEY_CANDIDATES)
    }
    if (mergedMeta.page === undefined) {
      mergedMeta.page = resolveNumericValue(response, PAGE_KEY_CANDIDATES)
    }
    if (mergedMeta.pageSize === undefined) {
      mergedMeta.pageSize = resolveNumericValue(response, PAGE_SIZE_KEY_CANDIDATES)
    }
    if (mergedMeta.totalPages === undefined) {
      mergedMeta.totalPages = resolveNumericValue(response, TOTAL_PAGE_KEY_CANDIDATES)
    }
  }

  if (!mergedMeta.list.length) {
    mergedMeta.list = []
  }
  if (mergedMeta.total === undefined) {
    mergedMeta.total = mergedMeta.list.length
  }

  return mergedMeta
}

export const apiResponseUtils = {
  extractListResponse
}

export default apiResponseUtils
