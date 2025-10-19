import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 统一的 localStorage 工具函数
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key)
      return value !== null ? JSON.parse(value) : defaultValue
    } catch {
      return defaultValue
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error)
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove ${key} from localStorage:`, error)
    }
  }
}

export const useAppStore = defineStore(
  'app',
  () => {
    // State
    const sidebarCollapsed = ref(false)
    const sidebarOpened = ref(true)
    const device = ref('desktop') // desktop, tablet, mobile
    const language = ref('zh-CN')
    const theme = ref('light') // light, dark
    const routesGenerated = ref(false)
    const routes = ref([])
    const visitedViews = ref([])
    const cachedViews = ref([])
    const loading = ref(false)
    const systemInfo = ref({})

    // Settings state
    const themeColor = ref('#409EFF')
    const fixedHeader = ref(true)
    const showTagsView = ref(true)
    const showSidebarLogo = ref(true)
    const pageAnimation = ref(true)
    const grayMode = ref(false)
    const colorWeakMode = ref(false)

    // Getters
    const isMobile = computed(() => device.value === 'mobile')
    const isTablet = computed(() => device.value === 'tablet')
    const isDesktop = computed(() => device.value === 'desktop')
    const sidebarWidth = computed(() => {
      if (sidebarCollapsed.value) {
        return '64px'
      }
      return '200px'
    })

    // Actions

    /**
     * 切换侧边栏状态
     */
    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
      sidebarOpened.value = !sidebarCollapsed.value
    }

    /**
     * 关闭侧边栏
     */
    const closeSidebar = () => {
      sidebarCollapsed.value = true
      sidebarOpened.value = false
    }

    /**
     * 打开侧边栏
     */
    const openSidebar = () => {
      sidebarCollapsed.value = false
      sidebarOpened.value = true
    }

    /**
     * 设置设备类型
     * @param {string} deviceType - 设备类型
     */
    const setDevice = deviceType => {
      device.value = deviceType

      // 移动设备默认收起侧边栏
      if (deviceType === 'mobile') {
        closeSidebar()
      } else {
        openSidebar()
      }
    }

    /**
     * 设置语言
     * @param {string} lang - 语言代码
     */
    const setLanguage = lang => {
      language.value = lang
      storage.set('admin_language', lang)
    }

    /**
     * 设置主题
     * @param {string} newTheme - 主题名称
     */
    const setTheme = newTheme => {
      theme.value = newTheme
      storage.set('admin_theme', newTheme)

      // 更新HTML根元素的主题类
      const html = document.documentElement
      html.setAttribute('data-theme', newTheme)
      html.classList.toggle('dark', newTheme === 'dark')
    }

    /**
     * 切换主题
     */
    const toggleTheme = () => {
      const newTheme = theme.value === 'light' ? 'dark' : 'light'
      setTheme(newTheme)
    }

    /**
     * 设置路由生成状态
     * @param {boolean} generated - 是否已生成
     */
    const setRoutesGenerated = generated => {
      routesGenerated.value = generated
    }

    /**
     * 设置路由列表
     * @param {Array} routeList - 路由列表
     */
    const setRoutes = routeList => {
      routes.value = routeList
    }

    /**
     * 添加访问过的视图
     * @param {Object} view - 视图对象
     */
    const addVisitedView = view => {
      if (visitedViews.value.some(v => v.path === view.path)) return

      visitedViews.value.push({
        name: view.name,
        path: view.path,
        title: view.meta?.title || 'No Title',
        affix: view.meta?.affix || false
      })
    }

    /**
     * 添加缓存视图
     * @param {Object} view - 视图对象
     */
    const addCachedView = view => {
      if (cachedViews.value.includes(view.name)) return
      if (!view.meta.noCache) {
        cachedViews.value.push(view.name)
      }
    }

    /**
     * 删除访问过的视图
     * @param {Object} view - 视图对象
     */
    const delVisitedView = view => {
      const index = visitedViews.value.findIndex(v => v.path === view.path)
      if (index > -1) {
        visitedViews.value.splice(index, 1)
      }
    }

    /**
     * 删除缓存视图
     * @param {Object} view - 视图对象
     */
    const delCachedView = view => {
      const index = cachedViews.value.indexOf(view.name)
      if (index > -1) {
        cachedViews.value.splice(index, 1)
      }
    }

    /**
     * 删除其他访问过的视图
     * @param {Object} activeView - 当前活动视图
     */
    const delOthersVisitedViews = activeView => {
      visitedViews.value = visitedViews.value.filter(v => {
        return v.affix || v.path === activeView.path
      })
    }

    /**
     * 删除其他缓存视图
     * @param {Object} activeView - 当前活动视图
     */
    const delOthersCachedViews = activeView => {
      const index = cachedViews.value.indexOf(activeView.name)
      if (index > -1) {
        cachedViews.value = [activeView.name]
      } else {
        cachedViews.value = []
      }
    }

    /**
     * 删除所有访问过的视图
     */
    const delAllVisitedViews = () => {
      // 保留固定的标签页
      visitedViews.value = visitedViews.value.filter(v => v.affix)
    }

    /**
     * 删除所有缓存视图
     */
    const delAllCachedViews = () => {
      cachedViews.value = []
    }

    /**
     * 更新访问过的视图
     * @param {Object} view - 视图对象
     */
    const updateVisitedView = view => {
      const index = visitedViews.value.findIndex(v => v.path === view.path)
      if (index > -1) {
        visitedViews.value[index] = {
          ...visitedViews.value[index],
          title: view.meta.title || visitedViews.value[index].title
        }
      }
    }

    /**
     * 删除右侧标签页
     * @param {Object} activeView - 当前活动视图
     */
    const delRightTags = activeView => {
      const index = visitedViews.value.findIndex(v => v.path === activeView.path)
      if (index === -1) return

      visitedViews.value = visitedViews.value.filter((v, i) => {
        if (i <= index) return true
        return v.affix
      })

      cachedViews.value = cachedViews.value.filter(name => {
        const viewIndex = visitedViews.value.findIndex(v => v.name === name)
        return viewIndex !== -1
      })
    }

    /**
     * 删除左侧标签页
     * @param {Object} activeView - 当前活动视图
     */
    const delLeftTags = activeView => {
      const index = visitedViews.value.findIndex(v => v.path === activeView.path)
      if (index === -1) return

      visitedViews.value = visitedViews.value.filter((v, i) => {
        if (i >= index) return true
        return v.affix
      })

      cachedViews.value = cachedViews.value.filter(name => {
        const viewIndex = visitedViews.value.findIndex(v => v.name === name)
        return viewIndex !== -1
      })
    }

    /**
     * 设置加载状态
     * @param {boolean} isLoading - 是否加载中
     */
    const setLoading = isLoading => {
      loading.value = isLoading
    }

    /**
     * 设置系统信息
     * @param {Object} info - 系统信息
     */
    const setSystemInfo = info => {
      systemInfo.value = info
    }

    /**
     * 应用初始化
     */
    const initialize = async () => {
      // 从localStorage恢复设置 - 使用统一的storage工具
      const savedLanguage = storage.get('admin_language')
      const savedTheme = storage.get('admin_theme')
      const savedSidebarState = storage.get('admin_sidebar_collapsed')
      const savedThemeColor = storage.get('admin_theme_color')
      const savedFixedHeader = storage.get('admin_fixed_header')
      const savedShowTagsView = storage.get('admin_show_tags_view')
      const savedShowSidebarLogo = storage.get('admin_show_sidebar_logo')
      const savedPageAnimation = storage.get('admin_page_animation')
      const savedGrayMode = storage.get('admin_gray_mode')
      const savedColorWeakMode = storage.get('admin_color_weak_mode')

      if (savedLanguage) language.value = savedLanguage
      if (savedTheme) setTheme(savedTheme)
      if (savedSidebarState !== null) {
        sidebarCollapsed.value = savedSidebarState
        sidebarOpened.value = !savedSidebarState
      }
      if (savedThemeColor) themeColor.value = savedThemeColor
      if (savedFixedHeader !== null) fixedHeader.value = savedFixedHeader
      if (savedShowTagsView !== null) showTagsView.value = savedShowTagsView
      if (savedShowSidebarLogo !== null) showSidebarLogo.value = savedShowSidebarLogo
      if (savedPageAnimation !== null) pageAnimation.value = savedPageAnimation
      if (savedGrayMode !== null) grayMode.value = savedGrayMode
      if (savedColorWeakMode !== null) colorWeakMode.value = savedColorWeakMode

      // 检测设备类型
      detectDevice()

      // 监听窗口大小变化
      window.addEventListener('resize', handleResize)
    }

    /**
     * 检测设备类型
     */
    const detectDevice = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDevice('mobile')
      } else if (width < 992) {
        setDevice('tablet')
      } else {
        setDevice('desktop')
      }
    }

    /**
     * 处理窗口大小变化
     */
    const handleResize = () => {
      detectDevice()
    }


    /**
     * 设置主题色
     * @param {string} color - 主题色
     */
    const setThemeColor = color => {
      themeColor.value = color
      storage.set('admin_theme_color', color)
    }

    /**
     * 设置固定头部
     * @param {boolean} fixed - 是否固定
     */
    const setFixedHeader = fixed => {
      fixedHeader.value = fixed
      storage.set('admin_fixed_header', fixed)
    }

    /**
     * 设置标签页显示
     * @param {boolean} show - 是否显示
     */
    const setTagsView = show => {
      showTagsView.value = show
      storage.set('admin_show_tags_view', show)
    }

    /**
     * 设置侧边栏Logo显示
     * @param {boolean} show - 是否显示
     */
    const setSidebarLogo = show => {
      showSidebarLogo.value = show
      storage.set('admin_show_sidebar_logo', show)
    }

    /**
     * 设置页面动画
     * @param {boolean} enabled - 是否启用
     */
    const setPageAnimation = enabled => {
      pageAnimation.value = enabled
      storage.set('admin_page_animation', enabled)
    }

    /**
     * 设置灰色模式
     * @param {boolean} enabled - 是否启用
     */
    const setGrayMode = enabled => {
      grayMode.value = enabled
      storage.set('admin_gray_mode', enabled)
    }

    /**
     * 设置色弱模式
     * @param {boolean} enabled - 是否启用
     */
    const setColorWeakMode = enabled => {
      colorWeakMode.value = enabled
      storage.set('admin_color_weak_mode', enabled)
    }

    /**
     * 重置所有设置
     */
    const resetSettings = () => {
      // 重置设置状态
      themeColor.value = '#409EFF'
      fixedHeader.value = true
      showTagsView.value = true
      showSidebarLogo.value = true
      pageAnimation.value = true
      grayMode.value = false
      colorWeakMode.value = false

      // 重置主题和语言
      setTheme('light')
      setLanguage('zh-CN')

      // 清除localStorage中的设置
      const settingsKeys = [
        'admin_theme_color',
        'admin_fixed_header',
        'admin_show_tags_view',
        'admin_show_sidebar_logo',
        'admin_page_animation',
        'admin_gray_mode',
        'admin_color_weak_mode'
      ]
      settingsKeys.forEach(key => storage.remove(key))
    }

    /**
     * 重置应用状态
     */
    const reset = () => {
      routesGenerated.value = false
      routes.value = []
      visitedViews.value = []
      cachedViews.value = []
      systemInfo.value = {}
    }

    return {
      // State
      sidebarCollapsed,
      sidebarOpened,
      device,
      language,
      theme,
      routesGenerated,
      routes,
      visitedViews,
      cachedViews,
      loading,
      systemInfo,

      // Settings state
      themeColor,
      fixedHeader,
      showTagsView,
      showSidebarLogo,
      pageAnimation,
      grayMode,
      colorWeakMode,

      // Getters
      isMobile,
      isTablet,
      isDesktop,
      sidebarWidth,

      // Actions
      toggleSidebar,
      closeSidebar,
      openSidebar,
      setDevice,
      setLanguage,
      setTheme,
      toggleTheme,
      setRoutesGenerated,
      setRoutes,
      addVisitedView,
      addCachedView,
      delVisitedView,
      delCachedView,
      delOthersVisitedViews,
      delOthersCachedViews,
      delAllVisitedViews,
      delAllCachedViews,
      delRightTags,
      delLeftTags,
      updateVisitedView,
      setLoading,
      setSystemInfo,

      // Settings actions
      setThemeColor,
      setFixedHeader,
      setTagsView,
      setSidebarLogo,
      setPageAnimation,
      setGrayMode,
      setColorWeakMode,
      resetSettings,

      initialize,
      detectDevice,
      handleResize,
      reset
    }
  },
  {
    persist: {
      key: 'admin_app',
      storage: localStorage,
      paths: [
        'sidebarCollapsed',
        'language',
        'theme',
        'themeColor',
        'fixedHeader',
        'showTagsView',
        'showSidebarLogo',
        'pageAnimation',
        'grayMode',
        'colorWeakMode'
      ]
    }
  }
)
