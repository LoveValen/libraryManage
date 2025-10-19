/**
 * LocalStorage 键名常量
 * 集中管理所有localStorage键名，避免硬编码
 */

export const APP_PREFIX = 'admin'

export const STORAGE_KEYS = {
  // 认证相关
  TOKEN: `${APP_PREFIX}_token`,
  REFRESH_TOKEN: `${APP_PREFIX}_refresh_token`,

  // 用户偏好设置
  LANGUAGE: `${APP_PREFIX}_language`,
  THEME: `${APP_PREFIX}_theme`,
  THEME_COLOR: `${APP_PREFIX}_theme_color`,

  // 布局设置
  SIDEBAR_COLLAPSED: `${APP_PREFIX}_sidebar_collapsed`,
  FIXED_HEADER: `${APP_PREFIX}_fixed_header`,
  SHOW_TAGS_VIEW: `${APP_PREFIX}_show_tags_view`,
  SHOW_SIDEBAR_LOGO: `${APP_PREFIX}_show_sidebar_logo`,

  // 动画和主题
  PAGE_ANIMATION: `${APP_PREFIX}_page_animation`,
  GRAY_MODE: `${APP_PREFIX}_gray_mode`,
  COLOR_WEAK_MODE: `${APP_PREFIX}_color_weak_mode`,

  // Pinia 持久化
  APP_STORE: `${APP_PREFIX}_app`,
  AUTH_STORE: `${APP_PREFIX}_auth`,
  NOTIFICATION_STORE: `${APP_PREFIX}_notification`,
}

/**
 * 通用localStorage工具函数
 */
export const storage = {
  /**
   * 获取值
   * @param {string} key - 键名（可直接使用STORAGE_KEYS中的值）
   * @param {any} defaultValue - 默认值
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key)
      return value !== null ? JSON.parse(value) : defaultValue
    } catch (error) {
      console.warn(`Failed to parse localStorage key "${key}":`, error)
      return defaultValue
    }
  },

  /**
   * 设置值
   * @param {string} key - 键名
   * @param {any} value - 值
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to set localStorage key "${key}":`, error)
    }
  },

  /**
   * 获取字符串值（不进行JSON解析）
   * @param {string} key - 键名
   * @param {string} defaultValue - 默认值
   * @returns {string}
   */
  getString(key, defaultValue = '') {
    return localStorage.getItem(key) || defaultValue
  },

  /**
   * 设置字符串值（不进行JSON序列化）
   * @param {string} key - 键名
   * @param {string} value - 值
   */
  setString(key, value) {
    localStorage.setItem(key, value)
  },

  /**
   * 移除值
   * @param {string} key - 键名
   */
  remove(key) {
    localStorage.removeItem(key)
  },

  /**
   * 清空所有值
   */
  clear() {
    localStorage.clear()
  },

  /**
   * 批量移除指定前缀的键
   * @param {string} prefix - 键名前缀
   */
  clearByPrefix(prefix = APP_PREFIX) {
    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => localStorage.removeItem(key))
  },
}
