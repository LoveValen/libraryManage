/**
/**
 * 日期时间格式化工具
 * 统一后端响应的日期与日期时间格式
 */

const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd'
const DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd hh:mm:ss'

const padZero = (value) => String(value).padStart(2, '0')

const normalizeDate = (input) => {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

function formatDate(value, format = DEFAULT_DATE_FORMAT) {
  const date = normalizeDate(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())

  let output = format
  output = output.replace(/YYYY|yyyy/g, year)
  output = output.replace(/MM/g, month)
  output = output.replace(/DD|dd/g, day)

  return output
}

function formatDateTime(value, format = DEFAULT_DATETIME_FORMAT) {
  const date = normalizeDate(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())
  const hour = padZero(date.getHours())
  const minute = padZero(date.getMinutes())
  const second = padZero(date.getSeconds())

  let output = format
  output = output.replace(/YYYY|yyyy/g, year)
  output = output.replace(/MM/g, month)
  output = output.replace(/DD|dd/g, day)
  output = output.replace(/HH|hh/g, hour)
  output = output.replace(/mm/g, minute)
  output = output.replace(/ss/g, second)

  return output
}

module.exports = {
  formatDate,
  formatDateTime,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATETIME_FORMAT
}
