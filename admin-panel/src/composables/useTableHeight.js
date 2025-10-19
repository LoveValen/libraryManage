import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 表格高度管理 Composable
 * 用于计算和管理 ProTable 的最佳高度，实现内部滚动
 * @param {Object} options - 配置选项
 * @param {number} options.minHeight - 最小高度 (px)
 * @param {number} options.maxHeightRatio - 最大高度占视口的比例 (0-1)
 * @param {number} options.headerOffset - 页面头部偏移量 (px)
 * @param {number} options.footerOffset - 页面底部偏移量 (px)
 * @param {boolean} options.enableResize - 是否启用窗口大小变化监听
 * @returns {Object} 表格高度相关的响应式数据和方法
 */
export function useTableHeight(options = {}) {
  const {
    minHeight = 400,
    maxHeightRatio = 0.65, // 最大占视口65%
    headerOffset = 200,    // 页面头部、搜索区域等占用空间
    footerOffset = 100,    // 分页、底部空间等占用空间
    enableResize = true
  } = options

  // 响应式数据
  const windowHeight = ref(window.innerHeight)
  const tableHeight = ref(minHeight)

  // 计算表格最大高度
  const maxTableHeight = computed(() => {
    return Math.floor(windowHeight.value * maxHeightRatio)
  })

  // 计算表格可用高度
  const availableHeight = computed(() => {
    return windowHeight.value - headerOffset - footerOffset
  })

  // 计算最终表格高度
  const finalTableHeight = computed(() => {
    const calculated = Math.min(maxTableHeight.value, availableHeight.value)
    return Math.max(calculated, minHeight)
  })

  // 窗口大小变化处理
  const handleResize = () => {
    windowHeight.value = window.innerHeight
    tableHeight.value = finalTableHeight.value
  }

  // 手动更新表格高度
  const updateTableHeight = () => {
    tableHeight.value = finalTableHeight.value
  }

  // 获取响应式表格高度配置
  const getTableHeightConfig = () => {
    return {
      height: undefined, // 不设置固定高度
      maxHeight: finalTableHeight.value
    }
  }

  // 获取不同屏幕尺寸的高度配置
  const getResponsiveTableHeight = () => {
    const width = window.innerWidth
    
    if (width < 768) {
      // 移动端：更小的高度比例
      return Math.min(
        Math.floor(windowHeight.value * 0.5), // 50%
        availableHeight.value - 50
      )
    } else if (width < 1024) {
      // 平板端：中等高度比例
      return Math.min(
        Math.floor(windowHeight.value * 0.6), // 60%
        availableHeight.value - 30
      )
    } else {
      // 桌面端：标准高度比例
      return finalTableHeight.value
    }
  }

  // 生命周期管理
  onMounted(() => {
    updateTableHeight()
    
    if (enableResize) {
      window.addEventListener('resize', handleResize)
    }
  })

  onUnmounted(() => {
    if (enableResize) {
      window.removeEventListener('resize', handleResize)
    }
  })

  return {
    // 响应式数据
    windowHeight,
    tableHeight,
    maxTableHeight,
    availableHeight,
    finalTableHeight,

    // 方法
    updateTableHeight,
    getTableHeightConfig,
    getResponsiveTableHeight,
    handleResize
  }
}

/**
 * 预设的表格高度配置
 */
export const TABLE_HEIGHT_PRESETS = {
  // 标准列表页面
  standard: {
    minHeight: 400,
    maxHeightRatio: 0.65,
    headerOffset: 200,
    footerOffset: 100
  },
  
  // 紧凑型页面
  compact: {
    minHeight: 350,
    maxHeightRatio: 0.7,
    headerOffset: 150,
    footerOffset: 80
  },
  
  // 全屏型页面
  fullscreen: {
    minHeight: 500,
    maxHeightRatio: 0.8,
    headerOffset: 120,
    footerOffset: 60
  },
  
  // 移动端优化
  mobile: {
    minHeight: 300,
    maxHeightRatio: 0.5,
    headerOffset: 120,
    footerOffset: 80
  }
}

/**
 * 获取预设配置的便捷方法
 * @param {string} preset - 预设名称
 * @param {Object} overrides - 覆盖配置
 * @returns {Object} 配置对象
 */
export function getTableHeightPreset(preset = 'standard', overrides = {}) {
  const baseConfig = TABLE_HEIGHT_PRESETS[preset] || TABLE_HEIGHT_PRESETS.standard
  return { ...baseConfig, ...overrides }
}
