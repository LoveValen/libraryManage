<template>
  <el-card shadow="never" class="search-filter">
    <el-form :model="formData" :inline="inline" :label-width="labelWidth" :size="size" class="search-form">
      <template v-for="field in fields" :key="field.key">
        <!-- 文本输入框 -->
        <el-form-item v-if="field.type === 'input'" :label="field.label" :style="{ width: field.width || 'auto' }">
          <el-input
            v-model="formData[field.key]"
            :placeholder="field.placeholder"
            :clearable="field.clearable !== false"
            :style="{ width: field.inputWidth || '200px' }"
            @keyup.enter="handleSearch"
            @clear="field.clearTrigger && handleSearch()"
          >
            <template v-if="field.prefix" #prefix>
              <el-icon>
                <component :is="field.prefix" />
              </el-icon>
            </template>
            <template v-if="field.suffix" #suffix>
              <el-icon>
                <component :is="field.suffix" />
              </el-icon>
            </template>
            <template v-if="field.prepend" #prepend>
              {{ field.prepend }}
            </template>
            <template v-if="field.append" #append>
              {{ field.append }}
            </template>
          </el-input>
        </el-form-item>

        <!-- 选择器 -->
        <el-form-item
          v-else-if="field.type === 'select'"
          :label="field.label"
          :style="{ width: field.width || 'auto' }"
        >
          <el-select
            v-model="formData[field.key]"
            :placeholder="field.placeholder"
            :clearable="field.clearable !== false"
            :multiple="field.multiple"
            :filterable="field.filterable"
            :remote="field.remote"
            :remote-method="field.remoteMethod"
            :loading="field.loading"
            :style="{ width: field.inputWidth || '140px' }"
            @change="field.changeTrigger && handleSearch()"
            @clear="field.clearTrigger && handleSearch()"
          >
            <el-option
              v-for="option in field.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
              :disabled="option.disabled"
            />
          </el-select>
        </el-form-item>

        <!-- 日期选择器 -->
        <el-form-item v-else-if="field.type === 'date'" :label="field.label" :style="{ width: field.width || 'auto' }">
          <el-date-picker
            v-model="formData[field.key]"
            :type="field.dateType || 'date'"
            :placeholder="field.placeholder"
            :start-placeholder="field.startPlaceholder"
            :end-placeholder="field.endPlaceholder"
            :range-separator="field.rangeSeparator || '至'"
            :format="field.format || 'YYYY-MM-DD'"
            :value-format="field.valueFormat || 'YYYY-MM-DD'"
            :clearable="field.clearable !== false"
            :style="{ width: field.inputWidth || '240px' }"
            @change="field.changeTrigger && handleSearch()"
            @clear="field.clearTrigger && handleSearch()"
          />
        </el-form-item>

        <!-- 级联选择器 -->
        <el-form-item
          v-else-if="field.type === 'cascader'"
          :label="field.label"
          :style="{ width: field.width || 'auto' }"
        >
          <el-cascader
            v-model="formData[field.key]"
            :options="field.options"
            :props="field.props"
            :placeholder="field.placeholder"
            :clearable="field.clearable !== false"
            :filterable="field.filterable"
            :show-all-levels="field.showAllLevels !== false"
            :style="{ width: field.inputWidth || '200px' }"
            @change="field.changeTrigger && handleSearch()"
            @clear="field.clearTrigger && handleSearch()"
          />
        </el-form-item>

        <!-- 数字输入框 -->
        <el-form-item
          v-else-if="field.type === 'number'"
          :label="field.label"
          :style="{ width: field.width || 'auto' }"
        >
          <el-input-number
            v-model="formData[field.key]"
            :placeholder="field.placeholder"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            :precision="field.precision"
            :controls="field.controls !== false"
            :style="{ width: field.inputWidth || '140px' }"
            @change="field.changeTrigger && handleSearch()"
          />
        </el-form-item>

        <!-- 开关 -->
        <el-form-item
          v-else-if="field.type === 'switch'"
          :label="field.label"
          :style="{ width: field.width || 'auto' }"
        >
          <el-switch
            v-model="formData[field.key]"
            :active-text="field.activeText"
            :inactive-text="field.inactiveText"
            :active-value="field.activeValue"
            :inactive-value="field.inactiveValue"
            @change="field.changeTrigger && handleSearch()"
          />
        </el-form-item>

        <!-- 单选按钮组 -->
        <el-form-item v-else-if="field.type === 'radio'" :label="field.label" :style="{ width: field.width || 'auto' }">
          <el-radio-group
            v-model="formData[field.key]"
            :size="field.size || size"
            @change="field.changeTrigger && handleSearch()"
          >
            <el-radio
              v-for="option in field.options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 复选框组 -->
        <el-form-item
          v-else-if="field.type === 'checkbox'"
          :label="field.label"
          :style="{ width: field.width || 'auto' }"
        >
          <el-checkbox-group
            v-model="formData[field.key]"
            :size="field.size || size"
            @change="field.changeTrigger && handleSearch()"
          >
            <el-checkbox
              v-for="option in field.options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 自定义插槽 -->
        <el-form-item v-else-if="field.type === 'slot'" :label="field.label" :style="{ width: field.width || 'auto' }">
          <slot :name="field.slot" :field="field" :value="formData[field.key]" />
        </el-form-item>
      </template>

      <!-- 操作按钮 -->
      <el-form-item>
        <el-button type="primary" @click="handleSearch" :loading="searching" :icon="searchIcon">
          {{ searchText }}
        </el-button>

        <el-button @click="handleReset" :icon="resetIcon">
          {{ resetText }}
        </el-button>

        <!-- 高级搜索切换 -->
        <el-button v-if="showAdvanced" :type="advanced ? 'primary' : 'default'" @click="toggleAdvanced" link>
          {{ advanced ? '收起' : '展开' }}
          <el-icon class="ml-1">
            <component :is="advanced ? 'ArrowUp' : 'ArrowDown'" />
          </el-icon>
        </el-button>

        <!-- 自定义操作按钮 -->
        <slot name="actions" :formData="formData" />
      </el-form-item>
    </el-form>

    <!-- 快速筛选标签 -->
    <div v-if="quickFilters.length > 0" class="quick-filters">
      <span class="quick-filter-label">快速筛选：</span>
      <el-tag
        v-for="filter in quickFilters"
        :key="filter.key"
        :type="filter.active ? 'primary' : ''"
        :effect="filter.active ? 'dark' : 'plain'"
        class="quick-filter-tag"
        @click="handleQuickFilter(filter)"
      >
        {{ filter.label }}
      </el-tag>
    </div>

    <!-- 活动筛选条件显示 -->
    <div v-if="showActiveFilters && activeFilters.length > 0" class="active-filters">
      <span class="active-filter-label">当前筛选：</span>
      <el-tag
        v-for="filter in activeFilters"
        :key="filter.key"
        type="info"
        size="small"
        closable
        class="active-filter-tag"
        @close="removeFilter(filter.key)"
      >
        {{ filter.label }}：{{ filter.value }}
      </el-tag>
      <el-button type="primary" link size="small" @click="clearAllFilters">清空全部</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// Props 定义
const props = defineProps({
  // 表单配置
  fields: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },

  // 表单样式
  inline: {
    type: Boolean,
    default: true
  },
  labelWidth: {
    type: String,
    default: '80px'
  },
  size: {
    type: String,
    default: 'default'
  },

  // 按钮配置
  searchText: {
    type: String,
    default: '搜索'
  },
  resetText: {
    type: String,
    default: '重置'
  },
  searchIcon: {
    type: String,
    default: 'Search'
  },
  resetIcon: {
    type: String,
    default: 'Refresh'
  },
  searching: {
    type: Boolean,
    default: false
  },

  // 高级搜索
  showAdvanced: {
    type: Boolean,
    default: false
  },

  // 快速筛选
  quickFilters: {
    type: Array,
    default: () => []
  },

  // 活动筛选条件
  showActiveFilters: {
    type: Boolean,
    default: true
  },

  // 自动搜索
  autoSearch: {
    type: Boolean,
    default: false
  },
  autoSearchDelay: {
    type: Number,
    default: 500
  },

  // 持久化
  persist: {
    type: Boolean,
    default: false
  },
  persistKey: {
    type: String,
    default: 'search-filter'
  }
})

// 事件定义
const emit = defineEmits(['search', 'reset', 'change', 'update:modelValue'])

// 响应式数据
const formData = reactive({ ...props.modelValue })
const advanced = ref(false)
const searchTimer = ref(null)

// 计算属性
const visibleFields = computed(() => {
  if (!props.showAdvanced) return props.fields
  return props.fields.filter(field => advanced.value || !field.advanced)
})

const activeFilters = computed(() => {
  const filters = []
  props.fields.forEach(field => {
    const value = formData[field.key]
    if (value !== undefined && value !== null && value !== '') {
      // 数组类型检查
      if (Array.isArray(value) && value.length === 0) return

      let displayValue = value

      // 处理选择器的显示值
      if (field.type === 'select' && field.options) {
        if (Array.isArray(value)) {
          displayValue = value
            .map(v => {
              const option = field.options.find(opt => opt.value === v)
              return option ? option.label : v
            })
            .join(', ')
        } else {
          const option = field.options.find(opt => opt.value === value)
          displayValue = option ? option.label : value
        }
      }

      // 处理日期范围
      if (field.type === 'date' && Array.isArray(value)) {
        displayValue = `${value[0]} 至 ${value[1]}`
      }

      filters.push({
        key: field.key,
        label: field.label,
        value: displayValue
      })
    }
  })
  return filters
})

// 方法
const handleSearch = () => {
  emit('update:modelValue', { ...formData })
  emit('search', { ...formData })

  if (props.persist) {
    localStorage.setItem(props.persistKey, JSON.stringify(formData))
  }
}

const handleReset = () => {
  // 重置表单数据
  Object.keys(formData).forEach(key => {
    const field = props.fields.find(f => f.key === key)
    if (field?.defaultValue !== undefined) {
      formData[key] = field.defaultValue
    } else {
      delete formData[key]
    }
  })

  // 重置快速筛选
  props.quickFilters.forEach(filter => {
    filter.active = false
  })

  emit('update:modelValue', { ...formData })
  emit('reset', { ...formData })

  // 自动搜索
  if (props.autoSearch) {
    handleSearch()
  }

  if (props.persist) {
    localStorage.removeItem(props.persistKey)
  }
}

const toggleAdvanced = () => {
  advanced.value = !advanced.value
}

const handleQuickFilter = filter => {
  // 重置其他快速筛选
  props.quickFilters.forEach(f => {
    f.active = f.key === filter.key ? !f.active : false
  })

  // 应用筛选条件
  if (filter.active) {
    Object.assign(formData, filter.params)
  } else {
    // 清除筛选条件
    Object.keys(filter.params).forEach(key => {
      delete formData[key]
    })
  }

  if (props.autoSearch) {
    handleSearch()
  }
}

const removeFilter = key => {
  const field = props.fields.find(f => f.key === key)
  if (field?.defaultValue !== undefined) {
    formData[key] = field.defaultValue
  } else {
    delete formData[key]
  }

  if (props.autoSearch) {
    handleSearch()
  }
}

const clearAllFilters = () => {
  handleReset()
}

const autoSearchHandler = () => {
  if (!props.autoSearch) return

  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
  }

  searchTimer.value = setTimeout(() => {
    handleSearch()
  }, props.autoSearchDelay)
}

// 加载持久化数据
const loadPersistedData = () => {
  if (!props.persist) return

  try {
    const saved = localStorage.getItem(props.persistKey)
    if (saved) {
      const data = JSON.parse(saved)
      Object.assign(formData, data)
    }
  } catch (error) {
    console.warn('加载搜索条件失败:', error)
  }
}

// 监听器
watch(
  () => props.modelValue,
  newValue => {
    Object.assign(formData, newValue)
  },
  { deep: true }
)

watch(
  formData,
  () => {
    emit('change', { ...formData })
    if (props.autoSearch) {
      autoSearchHandler()
    }
  },
  { deep: true }
)

// 初始化
loadPersistedData()

// 暴露方法
defineExpose({
  search: handleSearch,
  reset: handleReset,
  getFormData: () => ({ ...formData }),
  setFormData: data => Object.assign(formData, data)
})
</script>

<style lang="scss" scoped>
.search-filter {
  margin-bottom: 16px;

  :deep(.el-card__body) {
    padding: 20px;
  }

  .search-form {
    .el-form-item {
      margin-bottom: 16px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }
  }

  .quick-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);

    .quick-filter-label {
      color: var(--el-text-color-secondary);
      font-size: 14px;
      white-space: nowrap;
    }

    .quick-filter-tag {
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-1px);
      }
    }
  }

  .active-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);

    .active-filter-label {
      color: var(--el-text-color-secondary);
      font-size: 13px;
      white-space: nowrap;
    }

    .active-filter-tag {
      max-width: 200px;

      :deep(.el-tag__content) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .search-filter {
    .search-form {
      .el-form-item {
        margin-bottom: 16px;

        :deep(.el-form-item__content) {
          flex-wrap: wrap;
          gap: 8px;
        }
      }
    }

    .quick-filters,
    .active-filters {
      .quick-filter-label,
      .active-filter-label {
        width: 100%;
        margin-bottom: 8px;
      }
    }
  }
}
</style>
