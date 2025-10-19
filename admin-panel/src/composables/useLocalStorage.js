import { ref, watch } from 'vue'

/**
 * LocalStorage 通用 Composable
 * @param {string} key - localStorage 键名
 * @param {*} defaultValue - 默认值
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式数据和方法
 */
export function useLocalStorage(key, defaultValue = null, options = {}) {
  const {
    serializer = JSON,
    listenToStorageChanges = true
  } = options

  // 从 localStorage 读取初始值
  const readValue = () => {
    try {
      const item = localStorage.getItem(key)
      return item ? serializer.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  }

  const storedValue = ref(readValue())

  // 写入 localStorage
  const setValue = (value) => {
    try {
      storedValue.value = value
      localStorage.setItem(key, serializer.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  // 删除 localStorage 项
  const removeValue = () => {
    try {
      storedValue.value = defaultValue
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }

  // 监听值变化，自动同步到 localStorage
  watch(storedValue, (newValue) => {
    try {
      localStorage.setItem(key, serializer.stringify(newValue))
    } catch (error) {
      console.error(`Error syncing localStorage key "${key}":`, error)
    }
  }, { deep: true })

  // 监听 storage 事件（跨标签页同步）
  if (listenToStorageChanges && typeof window !== 'undefined') {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          storedValue.value = serializer.parse(e.newValue)
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
  }

  return {
    value: storedValue,
    setValue,
    removeValue
  }
}

/**
 * 深拷贝工具函数
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 深拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }

  if (obj instanceof Object) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
    )
  }

  return obj
}
