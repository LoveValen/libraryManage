/**
 * 性能优化工具函数
 */

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout
  let args
  let context
  let timestamp
  let result

  const later = function() {
    const last = Date.now() - timestamp
    
    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last)
    } else {
      timeout = null
      if (!immediate) {
        result = func.apply(context, args)
        context = args = null
      }
    }
  }

  const debounced = function() {
    context = this
    args = arguments
    timestamp = Date.now()
    
    const callNow = immediate && !timeout
    
    if (!timeout) {
      timeout = setTimeout(later, wait)
    }
    
    if (callNow) {
      result = func.apply(context, args)
      context = args = null
    }
    
    return result
  }

  debounced.cancel = function() {
    clearTimeout(timeout)
    timeout = null
  }

  debounced.flush = function() {
    if (timeout) {
      result = func.apply(context, args)
      clearTimeout(timeout)
      timeout = null
      context = args = null
    }
    return result
  }

  return debounced
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 间隔时间（毫秒）
 * @param {Object} options - 配置选项
 * @returns {Function} 节流后的函数
 */
export function throttle(func, wait = 300, options = {}) {
  let timeout
  let context
  let args
  let result
  let previous = 0

  if (!options) options = {}

  const later = function() {
    previous = options.leading === false ? 0 : Date.now()
    timeout = null
    result = func.apply(context, args)
    if (!timeout) context = args = null
  }

  const throttled = function() {
    const now = Date.now()
    if (!previous && options.leading === false) previous = now
    
    const remaining = wait - (now - previous)
    context = this
    args = arguments
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      result = func.apply(context, args)
      if (!timeout) context = args = null
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining)
    }
    
    return result
  }

  throttled.cancel = function() {
    clearTimeout(timeout)
    previous = 0
    timeout = context = args = null
  }

  return throttled
}

/**
 * 限制并发请求数量
 * @param {number} limit - 最大并发数
 * @returns {Function} 限制器函数
 */
export function createConcurrencyLimiter(limit = 3) {
  let running = 0
  const queue = []

  const run = async (fn, resolve, reject) => {
    running++
    try {
      const result = await fn()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      running--
      if (queue.length > 0) {
        const { fn: nextFn, resolve: nextResolve, reject: nextReject } = queue.shift()
        run(nextFn, nextResolve, nextReject)
      }
    }
  }

  return function(fn) {
    return new Promise((resolve, reject) => {
      if (running < limit) {
        run(fn, resolve, reject)
      } else {
        queue.push({ fn, resolve, reject })
      }
    })
  }
}

/**
 * 缓存函数结果
 * @param {Function} func - 要缓存的函数
 * @param {number} maxSize - 最大缓存数量
 * @param {number} ttl - 缓存过期时间（毫秒）
 * @returns {Function} 缓存后的函数
 */
export function memoize(func, maxSize = 100, ttl = 5 * 60 * 1000) {
  const cache = new Map()
  
  const memoized = function() {
    const key = JSON.stringify(arguments)
    
    if (cache.has(key)) {
      const cached = cache.get(key)
      if (Date.now() - cached.timestamp < ttl) {
        return cached.value
      } else {
        cache.delete(key)
      }
    }
    
    const result = func.apply(this, arguments)
    
    // 限制缓存大小
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    cache.set(key, {
      value: result,
      timestamp: Date.now()
    })
    
    return result
  }
  
  memoized.cache = cache
  memoized.clear = () => cache.clear()
  
  return memoized
}

/**
 * 异步函数重试机制
 * @param {Function} func - 异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @param {Function} shouldRetry - 判断是否应该重试的函数
 * @returns {Function} 包装后的函数
 */
export function withRetry(func, maxRetries = 3, delay = 1000, shouldRetry = () => true) {
  return async function(...args) {
    let lastError
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await func.apply(this, args)
      } catch (error) {
        lastError = error
        
        if (i === maxRetries || !shouldRetry(error)) {
          throw error
        }
        
        // 指数退避延迟
        const retryDelay = delay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
    
    throw lastError
  }
}

/**
 * 批量处理函数
 * @param {Function} processor - 处理函数
 * @param {number} batchSize - 批次大小
 * @param {number} delay - 批次间延迟（毫秒）
 * @returns {Function} 批量处理函数
 */
export function batchProcessor(processor, batchSize = 10, delay = 100) {
  return async function(items) {
    const results = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      )
      results.push(...batchResults)
      
      // 批次间延迟
      if (i + batchSize < items.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return results
  }
}

/**
 * 虚拟滚动帮助函数
 * @param {Object} options - 配置选项
 * @returns {Object} 虚拟滚动状态和方法
 */
export function createVirtualScroll(options = {}) {
  const {
    itemHeight = 50,
    containerHeight = 400,
    buffer = 3
  } = options

  const state = {
    scrollTop: 0,
    visibleStart: 0,
    visibleEnd: 0,
    totalHeight: 0
  }

  const calculateVisible = (itemsCount) => {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    state.visibleStart = Math.max(0, Math.floor(state.scrollTop / itemHeight) - buffer)
    state.visibleEnd = Math.min(itemsCount, state.visibleStart + visibleCount + buffer * 2)
    state.totalHeight = itemsCount * itemHeight
  }

  const onScroll = (e) => {
    state.scrollTop = e.target.scrollTop
  }

  const getItemStyle = (index) => {
    return {
      position: 'absolute',
      top: `${index * itemHeight}px`,
      height: `${itemHeight}px`,
      width: '100%'
    }
  }

  const getContainerStyle = () => {
    return {
      position: 'relative',
      height: `${state.totalHeight}px`
    }
  }

  return {
    state,
    calculateVisible,
    onScroll,
    getItemStyle,
    getContainerStyle
  }
}

/**
 * 性能监控装饰器
 * @param {string} name - 监控名称
 * @param {boolean} logToConsole - 是否输出到控制台
 * @returns {Function} 装饰器函数
 */
export function measurePerformance(name, logToConsole = false) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(...args) {
      const startTime = performance.now()
      
      try {
        const result = await originalMethod.apply(this, args)
        const endTime = performance.now()
        const duration = endTime - startTime

        if (logToConsole) {
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
        }

        // 可以在这里发送性能数据到监控系统
        reportPerformance(name, duration)

        return result
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime

        if (logToConsole) {
          console.error(`[Performance] ${name} (Error): ${duration.toFixed(2)}ms`, error)
        }

        throw error
      }
    }

    return descriptor
  }
}

/**
 * 上报性能数据
 * @param {string} name - 指标名称
 * @param {number} duration - 持续时间
 * @param {Object} extra - 额外数据
 */
function reportPerformance(name, duration, extra = {}) {
  // 这里可以实现具体的性能数据上报逻辑
  // 比如发送到监控平台、存储到本地等
  
  if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
    window.performance.mark(`${name}-end`)
    
    if (window.performance.measure) {
      try {
        window.performance.measure(name, `${name}-start`, `${name}-end`)
      } catch (e) {
        // Ignore errors for missing marks
      }
    }
  }
}

/**
 * 创建性能观察器
 * @param {Array} entryTypes - 要观察的性能条目类型
 * @param {Function} callback - 回调函数
 * @returns {PerformanceObserver|null} 性能观察器实例
 */
export function createPerformanceObserver(entryTypes = ['measure', 'navigation'], callback) {
  if (typeof window === 'undefined' || !window.PerformanceObserver) {
    return null
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(callback)
    })

    observer.observe({ entryTypes })
    return observer
  } catch (error) {
    console.warn('Failed to create PerformanceObserver:', error)
    return null
  }
}

/**
 * 内存使用监控
 * @returns {Object|null} 内存使用信息
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
    return null
  }

  const memory = window.performance.memory
  return {
    used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100, // MB
    total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100, // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100  // MB
  }
}

/**
 * 检查是否为慢设备
 * @returns {boolean} 是否为慢设备
 */
export function isSlowDevice() {
  if (typeof navigator === 'undefined') return false

  // 检查网络连接
  const connection = navigator.connection
  const isSlowNetwork = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')

  // 检查硬件并发数（CPU核心数）
  const isLowConcurrency = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2

  // 检查内存限制
  const memory = getMemoryUsage()
  const isLowMemory = memory && memory.limit < 1000 // 少于1GB

  return isSlowNetwork || isLowConcurrency || isLowMemory
}

/**
 * 自适应性能优化
 * @param {Object} options - 配置选项
 * @returns {Object} 优化后的配置
 */
export function adaptivePerformance(options = {}) {
  const isSlow = isSlowDevice()

  // 慢设备配置
  const slowConfig = {
    searchDelay: 800,
    changeDelay: 300,
    scrollBuffer: 1,
    pageSize: 10,
    animationDuration: 150,
    enableComplexAnimations: false,
    enableRealTimeSearch: false
  }

  // 正常设备配置
  const normalConfig = {
    searchDelay: 300,
    changeDelay: 100,
    scrollBuffer: 3,
    pageSize: 20,
    animationDuration: 300,
    enableComplexAnimations: true,
    enableRealTimeSearch: true
  }

  const defaultConfig = isSlow ? slowConfig : normalConfig

  return {
    ...defaultConfig,
    ...options
  }
}

// 导出默认配置
export const PERFORMANCE_DEFAULTS = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  MAX_CONCURRENT_REQUESTS: 3,
  CACHE_TTL: 5 * 60 * 1000, // 5分钟
  MAX_CACHE_SIZE: 100,
  VIRTUAL_SCROLL_BUFFER: 3,
  VIRTUAL_SCROLL_ITEM_HEIGHT: 50
}

export default {
  debounce,
  throttle,
  createConcurrencyLimiter,
  memoize,
  withRetry,
  batchProcessor,
  createVirtualScroll,
  measurePerformance,
  createPerformanceObserver,
  getMemoryUsage,
  isSlowDevice,
  adaptivePerformance,
  PERFORMANCE_DEFAULTS
}