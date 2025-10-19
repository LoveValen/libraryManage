import { ref, computed, reactive } from 'vue'
import { debounce, throttle } from '@/utils/performance'
import { formatDate as formatDateUtil } from '@/utils/date'

/**
 * 搜索过滤器组合式函数
 * @param {Object} formData - 表单数据对象
 * @param {Array} fields - 字段配置数组
 * @param {Object} options - 配置选项
 */
export function useSearchFilter(formData, fields, options = {}) {
  const {
    searchDelay = 300,
    changeDelay = 100,
    validationRules = {},
    transformers = {}
  } = options

  // 响应式状态
  const isSearching = ref(false)
  const errors = reactive({})
  const searchHistory = ref([])
  const suggestions = ref([])

  // 计算属性
  const activeFiltersCount = computed(() => {
    return Object.keys(formData).filter(key => {
      const value = formData[key]
      return value !== undefined && value !== null && value !== '' && 
             !(Array.isArray(value) && value.length === 0)
    }).length
  })

  const hasErrors = computed(() => {
    return Object.keys(errors).length > 0
  })

  const canReset = computed(() => {
    return activeFiltersCount.value > 0
  })

  // 核心功能函数
  
  /**
   * 获取字段的显示值
   * @param {Object} field - 字段配置
   * @param {*} value - 字段值
   * @returns {string} 显示值
   */
  const getFieldDisplayValue = (field, value) => {
    if (value === undefined || value === null || value === '') {
      return ''
    }

    // 自定义转换器
    if (transformers[field.key]) {
      return transformers[field.key](value, field)
    }

    // 选择器类型
    if (field.type === 'select' && field.options) {
      if (Array.isArray(value)) {
        return value
          .map(v => {
            const option = field.options.find(opt => opt.value === v)
            return option ? option.label : v
          })
          .join(', ')
      } else {
        const option = field.options.find(opt => opt.value === value)
        return option ? option.label : value
      }
    }

    // 级联选择器
    if (field.type === 'cascader' && Array.isArray(value)) {
      return value.join(' / ')
    }

    // 日期类型
    if (field.type === 'date') {
      if (Array.isArray(value)) {
        return `${formatDate(value[0])} 至 ${formatDate(value[1])}`
      } else {
        return formatDate(value)
      }
    }

    // 时间类型
    if (field.type === 'time') {
      if (Array.isArray(value)) {
        return `${value[0]} 至 ${value[1]}`
      } else {
        return value
      }
    }

    // 范围类型
    if (field.type === 'range' && Array.isArray(value)) {
      return `${value[0]} ~ ${value[1]}`
    }

    // 数组类型
    if (Array.isArray(value)) {
      return value.join(', ')
    }

    // 布尔类型
    if (typeof value === 'boolean') {
      return value ? '是' : '否'
    }

    // 默认返回字符串形式
    return String(value)
  }

  /**
   * 表单验证
   * @returns {Promise<boolean>} 验证结果
   */
  const validateForm = async () => {
    // 清除之前的错误
    Object.keys(errors).forEach(key => delete errors[key])

    let isValid = true

    for (const field of fields) {
      const value = formData[field.key]

      // 必填验证
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.key] = `${field.label}不能为空`
        isValid = false
        continue
      }

      // 自定义验证规则
      if (validationRules[field.key]) {
        const rule = validationRules[field.key]
        try {
          const result = await rule(value, formData)
          if (result !== true) {
            errors[field.key] = result
            isValid = false
          }
        } catch (error) {
          errors[field.key] = error.message
          isValid = false
        }
      }

      // 字段级验证
      if (field.validator && typeof field.validator === 'function') {
        try {
          const result = await field.validator(value, formData)
          if (result !== true) {
            errors[field.key] = result
            isValid = false
          }
        } catch (error) {
          errors[field.key] = error.message
          isValid = false
        }
      }

      // 内置验证规则
      if (value !== undefined && value !== null && value !== '') {
        // 字符串长度验证
        if (field.minLength && String(value).length < field.minLength) {
          errors[field.key] = `${field.label}至少需要${field.minLength}个字符`
          isValid = false
        }
        if (field.maxLength && String(value).length > field.maxLength) {
          errors[field.key] = `${field.label}不能超过${field.maxLength}个字符`
          isValid = false
        }

        // 数值范围验证
        if (field.type === 'number') {
          const numValue = Number(value)
          if (field.min !== undefined && numValue < field.min) {
            errors[field.key] = `${field.label}不能小于${field.min}`
            isValid = false
          }
          if (field.max !== undefined && numValue > field.max) {
            errors[field.key] = `${field.label}不能大于${field.max}`
            isValid = false
          }
        }

        // 正则表达式验证
        if (field.pattern && !field.pattern.test(String(value))) {
          errors[field.key] = field.patternMessage || `${field.label}格式不正确`
          isValid = false
        }
      }
    }

    return isValid
  }

  /**
   * 重置表单
   */
  const resetForm = () => {
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        formData[field.key] = field.defaultValue
      } else {
        delete formData[field.key]
      }
    })

    // 清除错误
    Object.keys(errors).forEach(key => delete errors[key])
  }

  /**
   * 导出表单数据
   * @returns {Object} 表单数据副本
   */
  const exportFormData = () => {
    const data = {}
    Object.keys(formData).forEach(key => {
      const value = formData[key]
      if (value !== undefined && value !== null && value !== '' && 
          !(Array.isArray(value) && value.length === 0)) {
        data[key] = value
      }
    })
    return data
  }

  /**
   * 导入表单数据
   * @param {Object} data - 要导入的数据
   */
  const importFormData = (data) => {
    // 先重置表单
    resetForm()
    
    // 然后设置新数据
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        formData[key] = data[key]
      }
    })

    // 清除错误
    Object.keys(errors).forEach(key => delete errors[key])
  }

  /**
   * 获取字段错误信息
   * @param {string} fieldKey - 字段键
   * @returns {string} 错误信息
   */
  const getFieldError = (fieldKey) => {
    return errors[fieldKey] || ''
  }

  /**
   * 设置字段错误信息
   * @param {string} fieldKey - 字段键
   * @param {string} error - 错误信息
   */
  const setFieldError = (fieldKey, error) => {
    if (error) {
      errors[fieldKey] = error
    } else {
      delete errors[fieldKey]
    }
  }

  /**
   * 清除字段错误
   * @param {string} fieldKey - 字段键
   */
  const clearFieldError = (fieldKey) => {
    delete errors[fieldKey]
  }

  /**
   * 添加搜索历史
   * @param {Object} searchData - 搜索数据
   */
  const addSearchHistory = (searchData) => {
    const historyItem = {
      id: Date.now(),
      data: { ...searchData },
      timestamp: new Date().toISOString(),
      label: generateSearchLabel(searchData)
    }

    // 避免重复
    const exists = searchHistory.value.find(item => 
      JSON.stringify(item.data) === JSON.stringify(searchData)
    )

    if (!exists) {
      searchHistory.value.unshift(historyItem)
      
      // 限制历史记录数量
      if (searchHistory.value.length > 20) {
        searchHistory.value = searchHistory.value.slice(0, 20)
      }
    }
  }

  /**
   * 生成搜索标签（简化版本）
   * @param {Object} searchData - 搜索数据
   * @returns {string} 搜索标签
   */
  const generateSearchLabel = (searchData) => {
    const labels = Object.keys(searchData)
      .map(key => {
        const field = fields.find(f => f.key === key)
        if (!field) return null

        const displayValue = getFieldDisplayValue(field, searchData[key])
        if (!displayValue) return null

        const shortValue = displayValue.length > 10
          ? displayValue.substring(0, 10) + '...'
          : displayValue
        return `${field.label}:${shortValue}`
      })
      .filter(Boolean)

    return labels.join(', ') || '空搜索'
  }

  /**
   * 清除搜索历史
   */
  const clearSearchHistory = () => {
    searchHistory.value = []
  }

  /**
   * 从历史记录应用搜索
   * @param {Object} historyItem - 历史记录项
   */
  const applySearchHistory = (historyItem) => {
    importFormData(historyItem.data)
  }

  /**
   * 生成搜索建议
   * @param {string} keyword - 关键词
   * @returns {Array} 建议列表
   */
  const generateSuggestions = (keyword) => {
    if (!keyword || keyword.length < 2) {
      suggestions.value = []
      return
    }

    const newSuggestions = []

    // 从历史记录生成建议
    searchHistory.value.forEach(item => {
      if (item.label.toLowerCase().includes(keyword.toLowerCase())) {
        newSuggestions.push({
          key: `history_${item.id}`,
          label: item.label,
          type: 'history',
          data: item.data
        })
      }
    })

    suggestions.value = newSuggestions.slice(0, 10)
  }

  // 防抖和节流函数
  const debouncedSearch = debounce(() => {
    isSearching.value = true
    // 这里会被具体的搜索逻辑覆盖
    setTimeout(() => {
      isSearching.value = false
    }, 100)
  }, searchDelay)

  const throttledChange = throttle(() => {
    // 节流的变更事件
  }, changeDelay)

  // 工具函数
  const formatDate = (date) => {
    try {
      const formatted = formatDateUtil(date)
      return formatted || ''
    } catch {
      return String(date)
    }
  }


  // 返回组合式函数的接口
  return {
    // 状态
    isSearching,
    errors,
    searchHistory,
    suggestions,
    
    // 计算属性
    activeFiltersCount,
    hasErrors,
    canReset,
    
    // 核心方法
    getFieldDisplayValue,
    validateForm,
    resetForm,
    exportFormData,
    importFormData,
    
    // 错误处理
    getFieldError,
    setFieldError,
    clearFieldError,
    
    // 搜索历史
    addSearchHistory,
    clearSearchHistory,
    applySearchHistory,
    
    // 搜索建议
    generateSuggestions,
    
    // 防抖节流
    debouncedSearch,
    throttledChange,

    // 工具方法
    formatDate,
    generateSearchLabel
  }
}

/**
 * 搜索过滤器预设配置
 */
export const SEARCH_FILTER_PRESETS = {
  // 常用字段类型
  FIELD_TYPES: {
    INPUT: 'input',
    SELECT: 'select',
    DATE: 'date',
    TIME: 'time',
    NUMBER: 'number',
    CASCADER: 'cascader',
    SWITCH: 'switch',
    RADIO: 'radio',
    CHECKBOX: 'checkbox',
    SLIDER: 'slider',
    RATE: 'rate',
    COLOR: 'color',
    RANGE: 'range',
    TAGS: 'tags',
    SLOT: 'slot'
  },

  // 常用日期快捷方式
  DATE_SHORTCUTS: [
    {
      text: '今天',
      value: () => {
        const now = new Date()
        return [now, now]
      }
    },
    {
      text: '昨天',
      value: () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return [yesterday, yesterday]
      }
    },
    {
      text: '最近7天',
      value: () => {
        const now = new Date()
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return [sevenDaysAgo, now]
      }
    },
    {
      text: '最近30天',
      value: () => {
        const now = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return [thirtyDaysAgo, now]
      }
    },
    {
      text: '本月',
      value: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return [firstDay, now]
      }
    },
    {
      text: '上月',
      value: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        return [firstDay, lastDay]
      }
    }
  ],

  // 常用验证规则
  VALIDATION_RULES: {
    required: (value) => {
      if (value === undefined || value === null || value === '') {
        return '此字段为必填项'
      }
      return true
    },
    
    email: (value) => {
      if (!value) return true
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailReg.test(value) || '请输入有效的邮箱地址'
    },
    
    phone: (value) => {
      if (!value) return true
      const phoneReg = /^1[3-9]\d{9}$/
      return phoneReg.test(value) || '请输入有效的手机号码'
    },
    
    url: (value) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        return '请输入有效的URL地址'
      }
    },
    
    minLength: (min) => (value) => {
      if (!value) return true
      return String(value).length >= min || `至少需要${min}个字符`
    },
    
    maxLength: (max) => (value) => {
      if (!value) return true
      return String(value).length <= max || `不能超过${max}个字符`
    },
    
    range: (min, max) => (value) => {
      if (value === undefined || value === null) return true
      const num = Number(value)
      return (num >= min && num <= max) || `数值必须在${min}-${max}之间`
    }
  }
}

export default useSearchFilter