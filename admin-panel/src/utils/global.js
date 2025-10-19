import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import { formatDate as basicFormatDate, formatDateTime as basicFormatDateTime, formatTime as basicFormatTime } from './date'
import { debounce as performanceDebounce, throttle as performanceThrottle } from './performance'

// 扩展dayjs插件
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('zh-cn')

/**
 * 设置全局属性
 * @param {Object} app - Vue应用实例
 */
export function setupGlobalProperties(app) {
  // 全局日期时间处理
  app.config.globalProperties.$dayjs = dayjs

  // 全局格式化函数
  app.config.globalProperties.$formatDate = formatDate
  app.config.globalProperties.$formatDateTime = formatDateTime
  app.config.globalProperties.$formatTime = formatTime
  app.config.globalProperties.$formatRelativeTime = formatRelativeTime
  app.config.globalProperties.$formatNumber = formatNumber
  app.config.globalProperties.$formatCurrency = formatCurrency
  app.config.globalProperties.$formatFileSize = formatFileSize

  // 全局工具函数
  app.config.globalProperties.$copy = copyToClipboard
  app.config.globalProperties.$download = downloadFile
  app.config.globalProperties.$debounce = performanceDebounce
  app.config.globalProperties.$throttle = performanceThrottle
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @param {string} format - 格式
 */
export function formatDate(date, format = 'yyyy-MM-dd') {
  if (!date) return '-'
  const result = basicFormatDate(date, format)
  return result || '-'
}

/**
 * 格式化日期时间
 * @param {string|Date} date - 日期时间
 * @param {string} format - 格式
 */
export function formatDateTime(date, format = 'yyyy-MM-dd hh:mm:ss') {
  if (!date) return '-'
  const result = basicFormatDateTime(date, format)
  return result || '-'
}

/**
 * 格式化时间
 * @param {string|Date} date - 时间
 * @param {string} format - 格式
 */
export function formatTime(date, format = 'HH:mm:ss') {
  if (!date) return '-'
  const result = basicFormatTime(date, format)
  return result || '-'
}

/**
 * 格式化相对时间
 * @param {string|Date} date - 日期
 */
export function formatRelativeTime(date) {
  if (!date) return '-'
  return dayjs(date).fromNow()
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 */
export function formatNumber(num, decimals = 0) {
  if (typeof num !== 'number') return '-'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * 格式化货币
 * @param {number} amount - 金额
 * @param {string} currency - 货币符号
 */
export function formatCurrency(amount, currency = '¥') {
  if (typeof amount !== 'number') return '-'
  return `${currency}${formatNumber(amount, 2)}`
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 复制到剪贴板
 * @param {string} text - 要复制的文本
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    return true
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

/**
 * 下载文件
 * @param {string} url - 文件URL
 * @param {string} filename - 文件名
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 防抖函数（从 performance.js 导入更强大的实现）
 * @deprecated 直接从 @/utils/performance 导入
 */
export const debounce = performanceDebounce

/**
 * 节流函数（从 performance.js 导入更强大的实现）
 * @deprecated 直接从 @/utils/performance 导入
 */
export const throttle = performanceThrottle

/**
 * 生成随机ID
 * @param {number} length - ID长度
 */
export function generateId(length = 8) {
  return Math.random().toString(36).substr(2, length)
}

/**
 * 深拷贝
 * @param {any} obj - 要拷贝的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 获取对象属性值（支持嵌套）
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径
 * @param {any} defaultValue - 默认值
 */
export function get(obj, path, defaultValue = undefined) {
  const keys = path.split('.')
  let result = obj

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue
    }
    result = result[key]
  }

  return result === undefined ? defaultValue : result
}

/**
 * 设置对象属性值（支持嵌套）
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径
 * @param {any} value - 值
 */
export function set(obj, path, value) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
  return obj
}

/**
 * 判断是否为空值
 * @param {any} value - 值
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 移除对象中的空值
 * @param {Object} obj - 对象
 */
export function removeEmpty(obj) {
  const result = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !isEmpty(obj[key])) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {string} key - 去重键（对象数组）
 */
export function unique(arr, key = null) {
  if (!Array.isArray(arr)) return []

  if (key) {
    const seen = new Set()
    return arr.filter(item => {
      const value = get(item, key)
      if (seen.has(value)) {
        return false
      }
      seen.add(value)
      return true
    })
  }

  return [...new Set(arr)]
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {string|Function} key - 分组键或函数
 */
export function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {}

  return arr.reduce((groups, item) => {
    const group = typeof key === 'function' ? key(item) : get(item, key)
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {})
}

/**
 * 树形数据转换为扁平数组
 * @param {Array} tree - 树形数据
 * @param {string} childrenKey - 子节点键名
 */
export function treeToFlat(tree, childrenKey = 'children') {
  const result = []

  function traverse(nodes, parent = null) {
    nodes.forEach(node => {
      const item = { ...node }
      delete item[childrenKey]

      if (parent) {
        item.parentId = parent.id
      }

      result.push(item)

      if (node[childrenKey] && Array.isArray(node[childrenKey])) {
        traverse(node[childrenKey], node)
      }
    })
  }

  traverse(tree)
  return result
}

/**
 * 扁平数组转换为树形数据
 * @param {Array} flat - 扁平数组
 * @param {string} idKey - ID键名
 * @param {string} parentKey - 父ID键名
 * @param {string} childrenKey - 子节点键名
 */
export function flatToTree(flat, idKey = 'id', parentKey = 'parentId', childrenKey = 'children') {
  const tree = []
  const map = {}

  // 创建映射
  flat.forEach(item => {
    map[item[idKey]] = { ...item, [childrenKey]: [] }
  })

  // 构建树形结构
  flat.forEach(item => {
    const node = map[item[idKey]]
    const parentId = item[parentKey]

    if (parentId && map[parentId]) {
      map[parentId][childrenKey].push(node)
    } else {
      tree.push(node)
    }
  })

  return tree
}
