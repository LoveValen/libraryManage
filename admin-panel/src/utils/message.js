import { ElMessage } from 'element-plus'

// 错误提示防重复机制
const errorTimeCache = new Map()
const ERROR_CACHE_DURATION = 3000 // 3秒内不重复显示相同错误
const NETWORK_ERROR_CACHE_DURATION = 5000 // 网络错误显示间隔更长

// 错误类型分类
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  SERVER: 'server',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  DEFAULT: 'default'
}

// 获取错误类型
function getErrorType(message) {
  if (message.includes('网络') || message.includes('Network')) return ERROR_TYPES.NETWORK
  if (message.includes('登录') || message.includes('授权')) return ERROR_TYPES.AUTH
  if (message.includes('验证')) return ERROR_TYPES.VALIDATION
  if (message.includes('服务器')) return ERROR_TYPES.SERVER
  if (message.includes('权限')) return ERROR_TYPES.PERMISSION
  if (message.includes('不存在')) return ERROR_TYPES.NOT_FOUND
  if (message.includes('频繁')) return ERROR_TYPES.RATE_LIMIT
  if (message.includes('超时')) return ERROR_TYPES.TIMEOUT
  return ERROR_TYPES.DEFAULT
}

// 显示错误消息（防重复）
function showMessage(message, type = 'info', options = {}) {
  if (!message) return

  const now = Date.now()
  const errorType = getErrorType(message)
  const cacheKey = `${type}:${errorType}:${message}`

  // 根据错误类型设置不同的缓存时间
  const cacheDuration = (type === 'error' && errorType === ERROR_TYPES.NETWORK)
    ? NETWORK_ERROR_CACHE_DURATION
    : ERROR_CACHE_DURATION

  // 检查是否在缓存时间内（只对error类型启用防重复）
  if (type === 'error' && errorTimeCache.has(cacheKey)) {
    const lastShowTime = errorTimeCache.get(cacheKey)
    if (now - lastShowTime < cacheDuration) {
      return // 跳过重复显示
    }
  }

  // 默认配置
  const defaultOptions = {
    duration: type === 'error' && errorType === ERROR_TYPES.NETWORK ? 4000 : 3000,
    showClose: true,
    ...options
  }

  // 显示消息并更新缓存
  if (type === 'error') {
    ElMessage.error({ message, ...defaultOptions })
  } else if (type === 'warning') {
    ElMessage.warning({ message, ...defaultOptions })
  } else if (type === 'success') {
    ElMessage.success({ message, ...defaultOptions })
  } else {
    ElMessage({ message, ...defaultOptions })
  }

  // 更新缓存（只对error类型）
  if (type === 'error') {
    errorTimeCache.set(cacheKey, now)

    // 清理过期缓存
    setTimeout(() => {
      errorTimeCache.delete(cacheKey)
    }, cacheDuration)
  }
}

// 导出便捷方法
export const message = {
  info: (msg, options = {}) => showMessage(msg, 'info', options),
  success: (msg, options = {}) => showMessage(msg, 'success', options),
  warning: (msg, options = {}) => showMessage(msg, 'warning', options),
  error: (msg, options = {}) => showMessage(msg, 'error', options)
}

export default message