import { ref, computed, watch } from 'vue'

// 预定义主题配色方案
const themePresets = {
  blue: {
    name: '经典蓝',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  green: {
    name: '自然绿',
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0', 
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    },
    gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)'
  },
  purple: {
    name: '典雅紫',
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe', 
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    },
    gradient: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)'
  },
  orange: {
    name: '活力橙',
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c', 
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    },
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
  },
  teal: {
    name: '清新青',
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e'
    },
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
  },
  red: {
    name: '热情红',
    primary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }
}

// 当前主题
const currentTheme = ref(localStorage.getItem('theme') || 'blue')

// 主题配置
const themeConfig = computed(() => themePresets[currentTheme.value] || themePresets.blue)

// 应用主题到CSS变量
const applyTheme = (theme) => {
  const root = document.documentElement
  const config = themePresets[theme]
  
  if (!config) return
  
  // 设置主色调CSS变量
  Object.entries(config.primary).forEach(([shade, color]) => {
    root.style.setProperty(`--color-primary-${shade}`, color)
  })
  
  // 设置主要颜色变量
  root.style.setProperty('--color-primary', config.primary[500])
  root.style.setProperty('--color-primary-light', config.primary[400])
  root.style.setProperty('--color-primary-dark', config.primary[600])
  
  // 设置渐变
  root.style.setProperty('--gradient-primary', config.gradient)
  
  // 设置Element Plus主题变量
  root.style.setProperty('--el-color-primary', config.primary[500])
  root.style.setProperty('--el-color-primary-light-3', config.primary[300])
  root.style.setProperty('--el-color-primary-light-5', config.primary[200])
  root.style.setProperty('--el-color-primary-light-7', config.primary[100])
  root.style.setProperty('--el-color-primary-light-8', config.primary[50])
  root.style.setProperty('--el-color-primary-light-9', config.primary[50])
  root.style.setProperty('--el-color-primary-dark-2', config.primary[600])
}

// 更改主题
const setTheme = (theme) => {
  if (themePresets[theme]) {
    currentTheme.value = theme
    applyTheme(theme)
    localStorage.setItem('theme', theme)
    
    // 强制刷新样式
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--el-color-primary', themePresets[theme].primary[500])
    })
  }
}

// 获取所有可用主题
const getAvailableThemes = () => {
  return Object.keys(themePresets).map(key => ({
    key,
    name: themePresets[key].name,
    primary: themePresets[key].primary[500],
    gradient: themePresets[key].gradient
  }))
}

// 监听主题变化
watch(currentTheme, (newTheme) => {
  applyTheme(newTheme)
}, { immediate: true })

export function useTheme() {
  return {
    currentTheme,
    themeConfig,
    themePresets,
    setTheme,
    getAvailableThemes
  }
}