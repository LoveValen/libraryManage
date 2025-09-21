import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
    
    // Animation settings
    const enableTransitions = ref(true)
    const transitionSpeed = ref('normal') // fast, normal, slow
    const transitionType = ref('fade-slide') // fade-slide, fade, slide-up, zoom

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
      localStorage.setItem('admin_language', lang)
    }

    /**
     * 设置主题
     * @param {string} newTheme - 主题名称
     */
    const setTheme = newTheme => {
      theme.value = newTheme
      localStorage.setItem('admin_theme', newTheme)

      // 更新HTML根元素的主题类
      const html = document.documentElement
      html.setAttribute('data-theme', newTheme)

      if (newTheme === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
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
      // 从localStorage恢复设置
      const savedLanguage = localStorage.getItem('admin_language')
      const savedTheme = localStorage.getItem('admin_theme')
      const savedSidebarState = localStorage.getItem('admin_sidebar_collapsed')
      const savedThemeColor = localStorage.getItem('admin_theme_color')
      const savedFixedHeader = localStorage.getItem('admin_fixed_header')
      const savedShowTagsView = localStorage.getItem('admin_show_tags_view')
      const savedShowSidebarLogo = localStorage.getItem('admin_show_sidebar_logo')
      const savedPageAnimation = localStorage.getItem('admin_page_animation')
      const savedGrayMode = localStorage.getItem('admin_gray_mode')
      const savedColorWeakMode = localStorage.getItem('admin_color_weak_mode')

      if (savedLanguage) {
        language.value = savedLanguage
      }

      if (savedTheme) {
        setTheme(savedTheme)
      }

      if (savedSidebarState) {
        sidebarCollapsed.value = JSON.parse(savedSidebarState)
        sidebarOpened.value = !sidebarCollapsed.value
      }

      if (savedThemeColor) {
        themeColor.value = savedThemeColor
      }

      if (savedFixedHeader !== null) {
        fixedHeader.value = JSON.parse(savedFixedHeader)
      }

      if (savedShowTagsView !== null) {
        showTagsView.value = JSON.parse(savedShowTagsView)
      }

      if (savedShowSidebarLogo !== null) {
        showSidebarLogo.value = JSON.parse(savedShowSidebarLogo)
      }

      if (savedPageAnimation !== null) {
        pageAnimation.value = JSON.parse(savedPageAnimation)
      }

      if (savedGrayMode !== null) {
        grayMode.value = JSON.parse(savedGrayMode)
      }

      if (savedColorWeakMode !== null) {
        colorWeakMode.value = JSON.parse(savedColorWeakMode)
      }

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
      localStorage.setItem('admin_theme_color', color)
    }

    /**
     * 设置固定头部
     * @param {boolean} fixed - 是否固定
     */
    const setFixedHeader = fixed => {
      fixedHeader.value = fixed
      localStorage.setItem('admin_fixed_header', fixed)
    }

    /**
     * 设置标签页显示
     * @param {boolean} show - 是否显示
     */
    const setTagsView = show => {
      showTagsView.value = show
      localStorage.setItem('admin_show_tags_view', show)
    }

    /**
     * 设置侧边栏Logo显示
     * @param {boolean} show - 是否显示
     */
    const setSidebarLogo = show => {
      showSidebarLogo.value = show
      localStorage.setItem('admin_show_sidebar_logo', show)
    }

    /**
     * 设置页面动画
     * @param {boolean} enabled - 是否启用
     */
    const setPageAnimation = enabled => {
      pageAnimation.value = enabled
      localStorage.setItem('admin_page_animation', enabled)
    }

    /**
     * 设置灰色模式
     * @param {boolean} enabled - 是否启用
     */
    const setGrayMode = enabled => {
      grayMode.value = enabled
      localStorage.setItem('admin_gray_mode', enabled)
    }

    /**
     * 设置色弱模式
     * @param {boolean} enabled - 是否启用
     */
    const setColorWeakMode = enabled => {
      colorWeakMode.value = enabled
      localStorage.setItem('admin_color_weak_mode', enabled)
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
      localStorage.removeItem('admin_theme_color')
      localStorage.removeItem('admin_fixed_header')
      localStorage.removeItem('admin_show_tags_view')
      localStorage.removeItem('admin_show_sidebar_logo')
      localStorage.removeItem('admin_page_animation')
      localStorage.removeItem('admin_gray_mode')
      localStorage.removeItem('admin_color_weak_mode')
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
      
      // Animation settings
      enableTransitions,
      transitionSpeed,
      transitionType,

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
