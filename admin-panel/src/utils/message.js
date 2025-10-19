/**
 * 消息和对话框工具（合并自 message.js 和 messageHelper.js）
 *
 * 功能：
 * 1. 消息提示（带防重复机制）
 * 2. 确认对话框
 * 3. 通知
 * 4. 常见操作的快捷方法
 *
 * @example
 * // 基础消息提示
 * message.success('操作成功')
 * message.error('操作失败')
 *
 * // 快捷方法
 * showSuccess('保存成功')
 * showError('保存失败')
 *
 * // 确认对话框
 * const confirmed = await confirmDelete(1, '用户')
 * const confirmed = await confirmBatchAction('删除', 5)
 */

import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'

// ==================== 消息提示（防重复机制）====================

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

// 显示消息（防重复）
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

  // 显示消息
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

// 导出便捷方法（兼容旧版本）
export const message = {
  info: (msg, options = {}) => showMessage(msg, 'info', options),
  success: (msg, options = {}) => showMessage(msg, 'success', options),
  warning: (msg, options = {}) => showMessage(msg, 'warning', options),
  error: (msg, options = {}) => showMessage(msg, 'error', options)
}

// ==================== 消息提示（快捷方法）====================

/**
 * 成功消息提示
 */
export function showSuccess(message = '操作成功', duration = 3000) {
  ElMessage.success({ message, duration })
}

/**
 * 错误消息提示
 */
export function showError(message = '操作失败', duration = 3000) {
  ElMessage.error({ message, duration })
}

/**
 * 警告消息提示
 */
export function showWarning(message, duration = 3000) {
  ElMessage.warning({ message, duration })
}

/**
 * 信息消息提示
 */
export function showInfo(message, duration = 3000) {
  ElMessage.info({ message, duration })
}

/**
 * 加载提示
 */
export function showLoading(message = '加载中...', duration = 0) {
  return ElMessage({
    message,
    icon: 'el-icon-loading',
    duration,
  })
}

/**
 * 关闭加载提示
 */
export function hideLoading(instance) {
  if (instance && instance.close) {
    instance.close()
  }
}

// ==================== 通知 ====================

/**
 * 成功通知
 */
export function notifySuccess(message, title = '成功', options = {}) {
  ElNotification.success({
    title,
    message,
    ...options,
  })
}

/**
 * 错误通知
 */
export function notifyError(message, title = '错误', options = {}) {
  ElNotification.error({
    title,
    message,
    ...options,
  })
}

/**
 * 警告通知
 */
export function notifyWarning(message, title = '警告', options = {}) {
  ElNotification.warning({
    title,
    message,
    ...options,
  })
}

/**
 * 信息通知
 */
export function notifyInfo(message, title = '提示', options = {}) {
  ElNotification.info({
    title,
    message,
    ...options,
  })
}

// ==================== 确认对话框 ====================

/**
 * 通用确认对话框
 */
export async function confirm(message, title = '确认', options = {}) {
  const {
    type = 'warning',
    confirmButtonText = '确定',
    cancelButtonText = '取消',
    ...restOptions
  } = options

  try {
    await ElMessageBox.confirm(message, title, {
      type,
      confirmButtonText,
      cancelButtonText,
      ...restOptions,
    })
    return true
  } catch {
    return false
  }
}

/**
 * 删除确认
 */
export async function confirmDelete(count = 1, itemType = '项') {
  const message =
    count === 1
      ? `确定要删除该${itemType}吗？此操作不可撤销！`
      : `确定要删除选中的 ${count} 个${itemType}吗？此操作不可撤销！`

  return await confirm(message, '删除确认', { type: 'warning' })
}

/**
 * 批量操作确认
 */
export async function confirmBatchAction(action, count, options = {}) {
  const message = `确定要${action}选中的 ${count} 项吗？`
  const title = `${action}确认`

  return await confirm(message, title, { type: 'warning', ...options })
}

/**
 * 提交确认
 */
export async function confirmSubmit(message = '确定要提交吗？', options = {}) {
  return await confirm(message, '提交确认', { type: 'info', ...options })
}

/**
 * 重置确认
 */
export async function confirmReset(message = '确定要重置吗？', options = {}) {
  return await confirm(message, '重置确认', { type: 'warning', ...options })
}

/**
 * 导出确认
 */
export async function confirmExport(count = 0, options = {}) {
  const message = count > 0 ? `确定要导出 ${count} 条数据吗？` : '确定要导出数据吗？'

  return await confirm(message, '导出确认', { type: 'info', ...options })
}

/**
 * 提示框（Alert风格）
 */
export async function alert(message, title = '提示', options = {}) {
  return await ElMessageBox.alert(message, title, {
    confirmButtonText: '确定',
    ...options,
  })
}

/**
 * 输入框
 */
export async function prompt(message, title = '请输入', options = {}) {
  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      ...options,
    })
    return value
  } catch {
    return null
  }
}

export default message
