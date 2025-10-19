import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { asyncRoutes } from '@/router/index'
import { useLocalStorage } from './useLocalStorage'

/**
 * 菜单搜索组合式函数
 * 提供菜单搜索功能，包括实时搜索、结果过滤、导航等
 */
export function useMenuSearch() {
  const router = useRouter()
  const appStore = useAppStore()
  const authStore = useAuthStore()

  // 响应式状态
  const searchKeyword = ref('')
  const searchResults = ref([])
  const isSearching = ref(false)
  const showDropdown = ref(false)
  const selectedIndex = ref(-1)

  // 使用统一的 localStorage composable
  const { value: searchHistory } = useLocalStorage('menu_search_history', [])

  // 防抖定时器
  let debounceTimer = null

  /**
   * 获取所有可搜索的菜单项
   * 根据用户权限过滤路由
   */
  const getAllMenuItems = computed(() => {
    const userRole = authStore.user?.role || 'user'
    const menuItems = []

    const extractMenuItems = (routes, parentPath = '') => {
      routes.forEach(route => {
        // 检查权限
        if (route.meta?.roles && !route.meta.roles.includes(userRole)) {
          return
        }

        // 跳过隐藏的路由
        if (route.hidden || route.meta?.hidden) {
          return
        }

        // 添加有标题的路由，但排除纯目录项（只作为父级容器的路由）
        if (route.meta?.title) {
          // 检查是否为纯目录项：有redirect属性且有children的路由通常是目录
          const isDirectoryOnly = route.redirect && route.children && route.children.length > 0

          // 只添加非目录项的路由
          if (!isDirectoryOnly) {
            const fullPath = parentPath + route.path
            menuItems.push({
              title: route.meta.title,
              path: route.path === '' ? parentPath : fullPath,
              icon: route.meta.icon,
              name: route.name,
              breadcrumb: getBreadcrumb(route, routes),
              route
            })
          }
        }

        // 递归处理子路由
        if (route.children) {
          const currentPath = route.path === '' ? parentPath : parentPath + route.path
          extractMenuItems(route.children, currentPath === '/' ? '' : currentPath)
        }
      })
    }

    extractMenuItems(asyncRoutes)
    return menuItems
  })

  /**
   * 获取面包屑路径
   */
  const getBreadcrumb = (route, allRoutes, currentPath = []) => {
    // 简单实现，可根据需要优化
    return route.meta?.title ? [route.meta.title] : []
  }

  /**
   * 执行搜索
   */
  const performSearch = (keyword) => {
    if (!keyword.trim()) {
      searchResults.value = []
      showDropdown.value = false
      return
    }

    isSearching.value = true

    try {
      const results = fuzzySearch(getAllMenuItems.value, keyword.trim())
      searchResults.value = results.slice(0, 8) // 限制结果数量
      showDropdown.value = results.length > 0
      selectedIndex.value = -1
    } catch (error) {
      console.error('搜索失败:', error)
      searchResults.value = []
      showDropdown.value = false
    } finally {
      isSearching.value = false
    }
  }

  /**
   * 模糊搜索算法
   * 支持拼音首字母、标题匹配
   */
  const fuzzySearch = (items, keyword) => {
    const searchLower = keyword.toLowerCase()
    const results = []

    items.forEach(item => {
      let score = 0
      const titleLower = item.title.toLowerCase()

      // 精确匹配（最高分）
      if (titleLower === searchLower) {
        score = 100
      }
      // 开头匹配
      else if (titleLower.startsWith(searchLower)) {
        score = 90
      }
      // 包含匹配
      else if (titleLower.includes(searchLower)) {
        score = 80
      }
      // 拼音首字母匹配（简单实现）
      else if (getPinyin(item.title).includes(searchLower)) {
        score = 70
      }
      // 路径匹配
      else if (item.path.toLowerCase().includes(searchLower)) {
        score = 60
      }

      if (score > 0) {
        results.push({
          ...item,
          score,
          highlightedTitle: highlightKeyword(item.title, keyword)
        })
      }
    })

    // 按分数排序
    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * 简单的拼音首字母获取
   * 实际项目中可以使用专门的拼音库
   */
  const getPinyin = (text) => {
    const pinyinMap = {
      '仪表板': 'ybb',
      '图书': 'ts',
      '管理': 'gl',
      '列表': 'lb',
      '新增': 'xz',
      '编辑': 'bj',
      '详情': 'xq',
      '分类': 'fl',
      '借阅': 'jy',
      '记录': 'jl',
      '逾期': 'yq',
      '统计': 'tj',
      '书评': 'sp',
      '审核': 'sh',
      '积分': 'jf',
      '系统': 'xt',
      '概览': 'gl',
      '排行榜': 'phb',
      '徽章': 'hz',
      '奖励': 'jl',
      '商城': 'sc',
      '规则': 'gz',
      '设置': 'sz',
      '用户': 'yh'
    }

    let pinyin = ''
    for (const char of text) {
      if (pinyinMap[char]) {
        pinyin += pinyinMap[char]
      } else {
        pinyin += char.toLowerCase()
      }
    }
    return pinyin
  }

  /**
   * 高亮关键词
   */
  const highlightKeyword = (text, keyword) => {
    if (!keyword) return text

    const regex = new RegExp(`(${keyword})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  /**
   * 防抖搜索
   */
  const debouncedSearch = (keyword) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      performSearch(keyword)
    }, 300)
  }

  /**
   * 处理搜索输入
   */
  const handleSearchInput = (value) => {
    searchKeyword.value = value
    if (value.trim()) {
      debouncedSearch(value)
    } else {
      clearSearch()
    }
  }

  /**
   * 清空搜索
   */
  const clearSearch = () => {
    searchKeyword.value = ''
    searchResults.value = []
    showDropdown.value = false
    selectedIndex.value = -1
    clearTimeout(debounceTimer)
  }

  /**
   * 选择搜索结果
   */
  const selectResult = (result, addToHistory = true) => {
    if (result) {
      // 导航到选中的页面
      router.push(result.path)

      // 添加到搜索历史
      if (addToHistory) {
        addToSearchHistory(result)
      }

      // 清空搜索
      clearSearch()
    }
  }

  /**
   * 添加到搜索历史
   */
  const addToSearchHistory = (result) => {
    const historyItem = {
      title: result.title,
      path: result.path,
      icon: result.icon,
      timestamp: Date.now()
    }

    // 去重
    const existingIndex = searchHistory.value.findIndex(item => item.path === result.path)
    if (existingIndex !== -1) {
      searchHistory.value.splice(existingIndex, 1)
    }

    // 添加到开头
    searchHistory.value.unshift(historyItem)

    // 限制历史记录数量
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
    // localStorage 自动同步（由 useLocalStorage 处理）
  }

  /**
   * 清空搜索历史
   */
  const clearSearchHistory = () => {
    searchHistory.value = []
    // localStorage 自动同步（由 useLocalStorage 处理）
  }

  /**
   * 键盘导航处理
   */
  const handleKeydown = (event) => {
    if (!showDropdown.value || searchResults.value.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
        break

      case 'Enter':
        event.preventDefault()
        if (selectedIndex.value >= 0) {
          selectResult(searchResults.value[selectedIndex.value])
        }
        break

      case 'Escape':
        event.preventDefault()
        clearSearch()
        break
    }
  }

  /**
   * 获取热门搜索（基于历史记录）
   */
  const getPopularSearches = computed(() => {
    return searchHistory.value.slice(0, 5)
  })

  // 监听路由变化，清空搜索
  watch(() => router.currentRoute.value.path, () => {
    clearSearch()
  })

  return {
    // 状态
    searchKeyword,
    searchResults,
    isSearching,
    showDropdown,
    selectedIndex,
    searchHistory,

    // 计算属性
    getAllMenuItems,
    getPopularSearches,

    // 方法
    handleSearchInput,
    clearSearch,
    selectResult,
    handleKeydown,
    addToSearchHistory,
    clearSearchHistory,
    performSearch
  }
}