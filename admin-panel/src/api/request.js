import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import NProgress from 'nprogress'

// 配置是否在API请求时显示进度条 (设置为 false 禁用API请求进度条)
const ENABLE_API_PROGRESS = false

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 开始进度条（可选）
    if (ENABLE_API_PROGRESS) {
      NProgress.start()
    }

    const authStore = useAuthStore()

    // 添加认证token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId()

    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    // 打印请求信息（开发环境）
    if (import.meta.env.DEV) {
      console.log(`🚀 [${config.method?.toUpperCase()}] ${config.url}`, {
        params: config.params,
        data: config.data
      })
    }

    return config
  },
  error => {
    if (ENABLE_API_PROGRESS) {
      NProgress.done()
    }
    console.error('请求配置错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 结束进度条（可选）
    if (ENABLE_API_PROGRESS) {
      NProgress.done()
    }

    const { data, config } = response

    // 打印响应信息（开发环境）
    if (import.meta.env.DEV) {
      console.log(`✅ [${config.method?.toUpperCase()}] ${config.url}`, data)
    }

    // 检查业务状态码
    if (data.success === false) {
      const errorMessage = data.message || '请求失败'

      // 特殊错误码处理
      if (data.code === 'VALIDATION_ERROR') {
        handleValidationError(data.errors)
      } else {
        showErrorMessage(errorMessage)
      }

      return Promise.reject(new Error(errorMessage))
    }

    return data
  },
  async error => {
    // 结束进度条（可选）
    if (ENABLE_API_PROGRESS) {
      NProgress.done()
    }

    const { response, config } = error

    // 打印错误信息（开发环境）
    if (import.meta.env.DEV) {
      console.error(`❌ [${config?.method?.toUpperCase()}] ${config?.url}`, error)
    }

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          await handle401Error(data)
          break

        case 403:
          handle403Error(data)
          break

        case 404:
          handle404Error(data)
          break

        case 422:
          handleValidationError(data.errors)
          break

        case 429:
          handle429Error(data)
          break

        case 500:
          handle500Error(data)
          break

        default:
          handleDefaultError(data || {})
      }
    } else if (error.code === 'ECONNABORTED') {
      showErrorMessage('请求超时，请稍后重试')
    } else if (error.message === 'Network Error') {
      showErrorMessage('网络连接失败，请检查网络设置')
    } else {
      showErrorMessage('请求失败，请稍后重试')
    }

    return Promise.reject(error)
  }
)

// 401错误处理 - 未授权
async function handle401Error(data) {
  const authStore = useAuthStore()
  const message = data.message || '登录已过期，请重新登录'

  // 如果有刷新令牌，尝试刷新
  if (authStore.refreshToken && !isRefreshing) {
    try {
      isRefreshing = true
      await authStore.refreshAccessToken()
      isRefreshing = false

      // 重新发送失败的请求
      return service.request(error.config)
    } catch (refreshError) {
      isRefreshing = false
      // 刷新失败，跳转到登录页
      authStore.logout()
      router.push('/login')
      showErrorMessage(message)
    }
  } else {
    // 没有刷新令牌，直接跳转登录页
    authStore.logout()
    router.push('/login')
    showErrorMessage(message)
  }
}

// 403错误处理 - 权限不足
function handle403Error(data) {
  const message = data.message || '权限不足，无法访问该资源'
  showErrorMessage(message)

  // 可以选择跳转到403页面
  // router.push('/403')
}

// 404错误处理 - 资源不存在
function handle404Error(data) {
  const message = data.message || '请求的资源不存在'
  showErrorMessage(message)
}

// 422错误处理 - 数据验证失败
function handleValidationError(errors) {
  if (Array.isArray(errors) && errors.length > 0) {
    const errorMessages = errors.map(err => err.message).join('；')
    showErrorMessage(`数据验证失败：${errorMessages}`)
  } else {
    showErrorMessage('数据验证失败')
  }
}

// 429错误处理 - 请求频率限制
function handle429Error(data) {
  const message = data.message || '请求过于频繁，请稍后再试'
  showErrorMessage(message, 'warning')
}

// 500错误处理 - 服务器内部错误
function handle500Error(data) {
  const message = data.message || '服务器内部错误，请联系管理员'

  ElMessageBox.alert('服务器出现了一些问题，请稍后重试或联系技术支持。', '系统错误', {
    confirmButtonText: '确定',
    type: 'error'
  })
}

// 默认错误处理
function handleDefaultError(data) {
  const message = data.message || '请求失败，请稍后重试'
  showErrorMessage(message)
}

// 生成请求ID
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 防止重复刷新token
let isRefreshing = false

// 页面加载时清理过期缓存
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    errorTimeCache.clear()
    errorMessageCache.clear()
  })
}

// 错误提示防重复机制
const errorMessageCache = new Set()
const errorTimeCache = new Map()
const ERROR_CACHE_DURATION = 3000 // 3秒内不重复显示相同错误
const NETWORK_ERROR_CACHE_DURATION = 8000 // 网络错误显示间隔更长，避免重复弹窗

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
function getErrorType(message, errorCode) {
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
function showErrorMessage(message, type = 'error') {
  if (!message) return

  const now = Date.now()
  const errorType = getErrorType(message)

  // 为相同类型的错误创建通用缓存键，防止多层重复
  const genericCacheKey = `${type}:${errorType}`
  const specificCacheKey = `${type}:${errorType}:${message}`

  // 根据错误类型设置不同的缓存时间
  const cacheDuration = errorType === ERROR_TYPES.NETWORK ? NETWORK_ERROR_CACHE_DURATION : ERROR_CACHE_DURATION

  // 检查通用错误类型是否在缓存时间内（防止同类错误多次显示）
  if (errorTimeCache.has(genericCacheKey)) {
    const lastShowTime = errorTimeCache.get(genericCacheKey)
    if (now - lastShowTime < cacheDuration) {
      return // 跳过重复显示
    }
  }

  // 检查具体错误消息是否重复
  if (errorTimeCache.has(specificCacheKey)) {
    const lastShowTime = errorTimeCache.get(specificCacheKey)
    if (now - lastShowTime < cacheDuration) {
      return // 跳过重复显示
    }
  }

  // 显示消息并更新缓存
  if (type === 'error') {
    ElMessage.error({
      message,
      duration: errorType === ERROR_TYPES.NETWORK ? 4000 : 3000,
      showClose: true,
      grouping: true // 启用Element Plus的消息分组功能
    })
  } else if (type === 'warning') {
    ElMessage.warning({
      message,
      duration: 3000,
      showClose: true,
      grouping: true
    })
  } else {
    ElMessage({
      message,
      duration: 3000,
      showClose: true,
      grouping: true
    })
  }

  // 同时缓存通用类型和具体消息
  errorTimeCache.set(genericCacheKey, now)
  errorTimeCache.set(specificCacheKey, now)

  // 清理过期缓存
  setTimeout(() => {
    errorTimeCache.delete(genericCacheKey)
    errorTimeCache.delete(specificCacheKey)
  }, cacheDuration)
}

// 导出常用的请求方法
export const request = {
  get: (url, config = {}) => service.get(url, config),
  post: (url, data = {}, config = {}) => service.post(url, data, config),
  put: (url, data = {}, config = {}) => service.put(url, data, config),
  delete: (url, config = {}) => service.delete(url, config),
  patch: (url, data = {}, config = {}) => service.patch(url, data, config),
  upload: (url, formData, config = {}) => {
    return service.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers
      }
    })
  },
  download: async (url, filename, config = {}) => {
    try {
      const response = await service.get(url, {
        ...config,
        responseType: 'blob'
      })

      // 创建下载链接
      const blob = new Blob([response])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.click()

      // 清理
      window.URL.revokeObjectURL(downloadUrl)
      link.remove()

      return response
    } catch (error) {
      console.error('文件下载失败:', error)
      throw error
    }
  }
}

export default service
