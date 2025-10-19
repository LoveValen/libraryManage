/**
 * 日期范围处理工具
 *
 * 职责：日期范围专用功能
 * - 日期范围转API参数
 * - Element Plus DatePicker 快捷选项
 * - 日期范围验证
 * - 自定义日期范围生成
 *
 * 依赖：基础日期格式化功能来自 date.js
 *
 * @example
 * // 转换日期范围为API参数
 * const params = convertDateRangeToParams(searchForm.dateRange, 'startDate', 'endDate')
 *
 * // 获取Element Plus快捷选项
 * const shortcuts = getDateRangeShortcuts()
 *
 * // 验证日期范围
 * const { valid, message } = validateDateRange(dateRange, { maxDays: 90 })
 */

import { formatDate, formatDateTime } from './date'

/**
 * 将日期范围转换为API查询参数
 *
 * @param {Array} dateRange - 日期范围 [startDate, endDate]
 * @param {string} startField - 开始日期字段名，默认 'startDate'
 * @param {string} endField - 结束日期字段名，默认 'endDate'
 * @param {Object} options - 可选配置
 * @param {string} options.format - 日期格式化函数，默认使用formatDate
 * @param {boolean} options.includeTime - 是否包含时间，默认false
 * @returns {Object} { [startField]: string, [endField]: string }
 */
export function convertDateRangeToParams(
  dateRange,
  startField = 'startDate',
  endField = 'endDate',
  options = {}
) {
  const { format = null, includeTime = false } = options

  if (!Array.isArray(dateRange) || dateRange.length !== 2) {
    return {}
  }

  const [start, end] = dateRange
  const params = {}

  // 确定使用的格式化函数
  const formatFn = format || (includeTime ? formatDateTime : formatDate)

  // 格式化开始日期
  const startFormatted = start ? formatFn(start) : null
  if (startFormatted) {
    params[startField] = startFormatted
  }

  // 格式化结束日期
  const endFormatted = end ? formatFn(end) : null
  if (endFormatted) {
    params[endField] = endFormatted
  }

  return params
}

/**
 * 应用日期范围到查询参数（修改参数对象）
 *
 * @param {Object} params - 查询参数对象
 * @param {string} dateRangeField - 日期范围字段名，默认 'dateRange'
 * @param {string} startField - 开始日期字段名，默认 'startDate'
 * @param {string} endField - 结束日期字段名，默认 'endDate'
 * @param {Object} options - 可选配置
 */
export function applyDateRangeToParams(
  params,
  dateRangeField = 'dateRange',
  startField = 'startDate',
  endField = 'endDate',
  options = {}
) {
  if (!params || !params[dateRangeField]) {
    return params
  }

  const dateParams = convertDateRangeToParams(
    params[dateRangeField],
    startField,
    endField,
    options
  )

  // 将转换后的参数合并到原参数对象
  Object.assign(params, dateParams)

  // 删除原dateRange字段
  delete params[dateRangeField]

  return params
}

/**
 * 获取Element Plus DatePicker的快捷选项
 *
 * @returns {Array} shortcuts配置数组
 */
export function getDateRangeShortcuts() {
  return [
    {
      text: '最近一周',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
        return [start, end]
      },
    },
    {
      text: '最近一个月',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
        return [start, end]
      },
    },
    {
      text: '最近三个月',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
        return [start, end]
      },
    },
    {
      text: '最近半年',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 180)
        return [start, end]
      },
    },
    {
      text: '最近一年',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 365)
        return [start, end]
      },
    },
    {
      text: '今天',
      value: () => {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setHours(23, 59, 59, 999)
        return [start, end]
      },
    },
    {
      text: '昨天',
      value: () => {
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24)
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setTime(end.getTime() - 3600 * 1000 * 24)
        end.setHours(23, 59, 59, 999)
        return [start, end]
      },
    },
    {
      text: '本周',
      value: () => {
        const end = new Date()
        const start = new Date()
        const day = start.getDay() || 7
        start.setTime(start.getTime() - 3600 * 1000 * 24 * (day - 1))
        start.setHours(0, 0, 0, 0)
        return [start, end]
      },
    },
    {
      text: '本月',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        return [start, end]
      },
    },
    {
      text: '本年',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setMonth(0)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        return [start, end]
      },
    },
  ]
}

/**
 * 创建自定义日期范围
 *
 * @param {number} days - 天数
 * @param {boolean} includeToday - 是否包含今天，默认true
 * @returns {Array} [startDate, endDate]
 */
export function createDateRange(days, includeToday = true) {
  const end = new Date()
  const start = new Date()

  if (includeToday) {
    start.setTime(start.getTime() - 3600 * 1000 * 24 * (days - 1))
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else {
    start.setTime(start.getTime() - 3600 * 1000 * 24 * days)
    end.setTime(end.getTime() - 3600 * 1000 * 24)
  }

  return [start, end]
}

/**
 * 获取日期范围的天数
 *
 * @param {Array} dateRange - 日期范围 [startDate, endDate]
 * @returns {number} 天数
 */
export function getDateRangeDays(dateRange) {
  if (!Array.isArray(dateRange) || dateRange.length !== 2) {
    return 0
  }

  const [start, end] = dateRange
  if (!start || !end) {
    return 0
  }

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return Math.ceil((endTime - startTime) / (1000 * 3600 * 24)) + 1
}

/**
 * 验证日期范围
 *
 * @param {Array} dateRange - 日期范围
 * @param {Object} options - 验证选项
 * @param {number} options.maxDays - 最大天数限制
 * @param {boolean} options.allowFuture - 是否允许未来日期，默认false
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateDateRange(dateRange, options = {}) {
  const { maxDays = null, allowFuture = false } = options

  if (!Array.isArray(dateRange) || dateRange.length !== 2) {
    return { valid: false, message: '请选择日期范围' }
  }

  const [start, end] = dateRange
  if (!start || !end) {
    return { valid: false, message: '日期范围不完整' }
  }

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  if (startTime > endTime) {
    return { valid: false, message: '开始日期不能晚于结束日期' }
  }

  if (!allowFuture && endTime > Date.now()) {
    return { valid: false, message: '不能选择未来日期' }
  }

  if (maxDays) {
    const days = getDateRangeDays(dateRange)
    if (days > maxDays) {
      return { valid: false, message: `日期范围不能超过${maxDays}天` }
    }
  }

  return { valid: true, message: '' }
}
