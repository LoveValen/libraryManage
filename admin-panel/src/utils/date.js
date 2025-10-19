/**
 * 日期时间工具函数
 *
 * 职责：基础日期时间操作
 * - 格式化日期/时间
 * - 相对时间计算
 * - 日期比较和判断
 * - 日期运算（加减天/月/年）
 *
 * 注意：日期范围相关功能请使用 dateRangeHelper.js
 */

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式化字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'yyyy-MM-dd') {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  let formatted = format
  formatted = formatted.replace(/YYYY|yyyy/g, year)
  formatted = formatted.replace(/MM/g, month)
  formatted = formatted.replace(/DD|dd/g, day)

  return formatted
}

/**
 * 格式化日期时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式化字符串
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date, format = 'yyyy-MM-dd hh:mm:ss') {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  let formatted = format
  formatted = formatted.replace(/YYYY|yyyy/g, year)
  formatted = formatted.replace(/MM/g, month)
  formatted = formatted.replace(/DD|dd/g, day)
  formatted = formatted.replace(/HH|hh/g, hour)
  formatted = formatted.replace(/mm/g, minute)
  formatted = formatted.replace(/ss/g, second)

  return formatted
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式化字符串
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(date, format = 'HH:mm:ss') {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  let formatted = format
  formatted = formatted.replace(/HH|hh/g, hour)
  formatted = formatted.replace(/mm/g, minute)
  formatted = formatted.replace(/ss/g, second)

  return formatted
}

/**
 * 格式化相对时间
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const diff = now - d
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else if (months < 12) {
    return `${months}个月前`
  } else {
    return `${years}年前`
  }
}

/**
 * 格式化相对时间 (别名)
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间字符串
 */
export function formatTimeAgo(date) {
  return formatRelativeTime(date)
}

/**
 * 格式化持续时间
 * @param {number} duration - 持续时间（毫秒）
 * @returns {string} 持续时间字符串
 */
export function formatDuration(duration) {
  if (!duration || duration < 0) return '0秒'

  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天${hours % 24}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

/**
 * 获取日期范围
 * @param {string} range - 范围类型 (today|yesterday|week|month|quarter|year)
 * @returns {Array} [开始日期, 结束日期]
 */
export function getDateRange(range) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'today':
      return [today, new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)]

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return [yesterday, new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)]
    }

    case 'week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      return [weekStart, weekEnd]
    }

    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
      return [monthStart, monthEnd]
    }

    case 'quarter': {
      const quarter = Math.floor(today.getMonth() / 3)
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1)
      const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999)
      return [quarterStart, quarterEnd]
    }

    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1)
      const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
      return [yearStart, yearEnd]
    }

    default:
      return [today, today]
  }
}

/**
 * 判断是否为同一天
 * @param {Date|string|number} date1 - 日期1
 * @param {Date|string|number} date2 - 日期2
 * @returns {boolean} 是否为同一天
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)

  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

/**
 * 判断是否为今天
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否为今天
 */
export function isToday(date) {
  return isSameDay(date, new Date())
}

/**
 * 判断是否为昨天
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否为昨天
 */
export function isYesterday(date) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

/**
 * 判断是否为本周
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否为本周
 */
export function isThisWeek(date) {
  const d = new Date(date)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return d >= startOfWeek && d <= endOfWeek
}

/**
 * 判断是否为本月
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否为本月
 */
export function isThisMonth(date) {
  const d = new Date(date)
  const now = new Date()

  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/**
 * 判断是否为本年
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否为本年
 */
export function isThisYear(date) {
  const d = new Date(date)
  const now = new Date()

  return d.getFullYear() === now.getFullYear()
}

/**
 * 添加天数
 * @param {Date|string|number} date - 日期
 * @param {number} days - 天数
 * @returns {Date} 新日期
 */
export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 添加月份
 * @param {Date|string|number} date - 日期
 * @param {number} months - 月份
 * @returns {Date} 新日期
 */
export function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * 添加年份
 * @param {Date|string|number} date - 日期
 * @param {number} years - 年份
 * @returns {Date} 新日期
 */
export function addYears(date, years) {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

/**
 * 获取两个日期之间的天数差
 * @param {Date|string|number} date1 - 日期1
 * @param {Date|string|number} date2 - 日期2
 * @returns {number} 天数差
 */
export function getDaysDiff(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2 - d1)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 获取月份的天数
 * @param {number} year - 年份
 * @param {number} month - 月份（0-11）
 * @returns {number} 天数
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 判断是否为闰年
 * @param {number} year - 年份
 * @returns {boolean} 是否为闰年
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 获取星期几的中文名称
 * @param {Date|string|number} date - 日期
 * @returns {string} 星期几
 */
export function getWeekday(date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const d = new Date(date)
  return weekdays[d.getDay()]
}

/**
 * 获取月份的中文名称
 * @param {number} month - 月份（0-11）
 * @returns {string} 月份名称
 */
export function getMonthName(month) {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return months[month]
}

/**
 * 解析日期字符串
 * @param {string} dateString - 日期字符串
 * @param {string} format - 格式
 * @returns {Date|null} 解析后的日期
 */
export function parseDate(dateString, format = 'yyyy-MM-dd') {
  if (!dateString) return null

  try {
    const normalizedFormat = format.toUpperCase()

    if (normalizedFormat === 'YYYY-MM-DD') {
      const parts = dateString.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const day = parseInt(parts[2])
        return new Date(year, month, day)
      }
    }

    return new Date(dateString)
  } catch (error) {
    console.error('日期解析失败:', error)
    return null
  }
}

/**
 * 验证日期格式
 * @param {string} dateString - 日期字符串
 * @param {string} format - 格式
 * @returns {boolean} 是否有效
 */
export function isValidDate(dateString, format = 'yyyy-MM-dd') {
  const date = parseDate(dateString, format)
  return date !== null && !isNaN(date.getTime())
}

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatTimeAgo,
  formatDuration,
  getDateRange,
  isSameDay,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  addDays,
  addMonths,
  addYears,
  getDaysDiff,
  getDaysInMonth,
  isLeapYear,
  getWeekday,
  getMonthName,
  parseDate,
  isValidDate
}
