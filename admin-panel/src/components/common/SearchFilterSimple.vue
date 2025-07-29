<template>
  <div class="bg-white rounded-lg mb-5">
    <div class="search-filter-container">
      <el-form 
        :model="formData"
        class="search-form"
        :inline="true"
        :show-message="false"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" :class="{ 'mb-4': !shouldShowButtonsInGrid || hasMoreFields }">
          <div 
            v-for="field in safeFields" 
            :key="field.key" 
            class="form-field"
          >
            <el-form-item class="mb-0">
              <!-- Input field -->
              <el-input
                v-if="field.type === 'input'"
                v-model="formData[field.key]"
                :placeholder="field.label + (field.placeholder ? ' - ' + field.placeholder : '')"
                :clearable="field.clearable"
                class="w-full"
                size="default"
                @keyup.enter="handleSearch"
              />
              
              <!-- Select field -->
              <el-select
                v-else-if="field.type === 'select'"
                v-model="formData[field.key]"
                :placeholder="field.label"
                :clearable="true"
                class="w-full"
                size="default"
              >
                <el-option
                  v-for="option in field.options"
                  v-if="option && option.value !== undefined && option.value !== null"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <!-- Date field -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="formData[field.key]"
                :type="field.dateType || 'date'"
                :placeholder="field.label"
                :start-placeholder="Array.isArray(field.placeholder) ? field.placeholder[0] : '开始时间'"
                :end-placeholder="Array.isArray(field.placeholder) ? field.placeholder[1] : '结束时间'"
                class="w-full"
                size="default"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
              
              <!-- Unknown field type -->
              <div v-else class="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-200">
                未知字段类型: {{ field.type }}
              </div>
            </el-form-item>
          </div>
          
          <!-- Action buttons - placed in grid to align properly -->
          <div 
            v-if="shouldShowButtonsInGrid"
            :class="buttonGridClass"
            class="form-field flex items-end"
          >
            <div class="flex items-center space-x-3 w-full justify-end">
              <el-button 
                @click="handleReset"
                class="px-4"
              >
                <el-icon class="mr-1"><Refresh /></el-icon>
                重置
              </el-button>
              <el-button 
                type="primary" 
                @click="handleSearch"
                :loading="loading"
                class="px-4"
              >
                <el-icon class="mr-1"><Search /></el-icon>
                搜索
              </el-button>
            </div>
          </div>
        </div>

        <!-- More fields section (when collapsed) -->
        <div 
          v-if="hasMoreFields && collapsed" 
          class="text-center py-2"
        >
          <el-button 
            text 
            type="primary" 
            @click="toggleCollapse"
            class="text-sm"
          >
            <el-icon class="mr-1"><ArrowDown /></el-icon>
            展开更多筛选条件 ({{ hiddenFieldsCount }} 项)
          </el-button>
        </div>

        <!-- Action buttons - shown when not in grid -->
        <div 
          v-if="!shouldShowButtonsInGrid"
          class="flex items-center justify-between pt-2 border-t border-gray-100"
        >
          <div v-if="collapsible && !collapsed" class="flex items-center">
            <el-button 
              text 
              type="info" 
              @click="toggleCollapse"
              class="text-sm"
            >
              <el-icon class="mr-1"><CaretTop /></el-icon>
              收起
            </el-button>
          </div>
          
          <div class="flex items-center space-x-3 ml-auto">
            <el-button 
              @click="handleReset"
              class="px-4"
            >
              <el-icon class="mr-1"><Refresh /></el-icon>
              重置
            </el-button>
            <el-button 
              type="primary" 
              @click="handleSearch"
              :loading="loading"
              class="px-4 "
            >
              <el-icon class="mr-1"><Search /></el-icon>
              搜索
            </el-button>
          </div>
        </div>
        
        <!-- Collapse button when buttons are in grid -->
        <div 
          v-if="shouldShowButtonsInGrid && collapsible && !collapsed"
          class="flex items-center pt-2 border-t border-gray-100"
        >
          <el-button 
            text 
            type="info" 
            @click="toggleCollapse"
            class="text-sm"
          >
            <el-icon class="mr-1"><CaretTop /></el-icon>
            收起
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

// Props
const props = defineProps({
  fields: {
    type: Array,
    default: () => [],
    validator: (fields) => fields.every(field => field.key && field.type)
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  collapsible: { 
    type: Boolean, 
    default: true 
  },
  defaultCollapsed: { 
    type: Boolean, 
    default: true 
  },
  collapsedRows: { 
    type: Number, 
    default: 1 
  }
})

// Events
const emit = defineEmits(['search', 'reset', 'update:modelValue'])

// Reactive data
const collapsed = ref(props.defaultCollapsed)
const formData = reactive({ ...props.modelValue })

// Computed
const collapsedFieldCount = computed(() => {
  const fieldsPerRow = 5 // 每行显示的字段数
  return fieldsPerRow * props.collapsedRows
})

const visibleFields = computed(() => {
  if (!props.fields || props.fields.length === 0) {
    return []
  }
  
  if (!props.collapsible || !collapsed.value) {
    return props.fields
  }
  
  return props.fields.slice(0, collapsedFieldCount.value)
})

// 确保字段选项始终有效
const safeFields = computed(() => {
  return visibleFields.value.map(field => {
    if (field.type === 'select' && field.options) {
      return {
        ...field,
        options: Array.isArray(field.options) 
          ? field.options.filter(option => option && option.value !== undefined && option.value !== null)
          : []
      }
    }
    return field
  })
})

const hasMoreFields = computed(() => {
  return props.collapsible && props.fields.length > collapsedFieldCount.value
})

const hiddenFieldsCount = computed(() => {
  if (!hasMoreFields.value) return 0
  return props.fields.length - collapsedFieldCount.value
})

// 计算是否应该在网格中显示按钮
const shouldShowButtonsInGrid = computed(() => {
  const fieldCount = visibleFields.value.length
  const fieldsPerRow = getFieldsPerRow()
  const lastRowFieldCount = fieldCount % fieldsPerRow
  
  // 如果最后一行有空位，则在网格中显示按钮
  return lastRowFieldCount > 0 && lastRowFieldCount < fieldsPerRow
})

// 按钮网格类名
const buttonGridClass = computed(() => {
  const fieldCount = visibleFields.value.length
  const fieldsPerRow = getFieldsPerRow()
  const lastRowFieldCount = fieldCount % fieldsPerRow
  const emptySlots = fieldsPerRow - lastRowFieldCount
  
  // 计算需要跨越的列数，使按钮显示在右侧
  return `col-span-${emptySlots}`
})

// 获取当前屏幕尺寸对应的每行字段数
const getFieldsPerRow = () => {
  // 这里使用默认的xl尺寸，实际使用中可以根据响应式断点动态计算
  // 为了简化，这里使用最大的列数
  return 5
}

// Watch for external model value changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      Object.assign(formData, newValue)
    }
  },
  { deep: true, immediate: true }
)

// Methods
const handleSearch = () => {
  // Clean up empty values
  const cleanData = Object.keys(formData).reduce((acc, key) => {
    const value = formData[key]
    if (value !== '' && value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
  
  emit('search', cleanData)
  emit('update:modelValue', cleanData)
}

const handleReset = () => {
  // Reset all form fields
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
  
  const emptyData = {}
  emit('reset', emptyData)
  emit('update:modelValue', emptyData)
}

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped lang="scss">
.search-filter-container {
  // Container without padding
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 0;
  }
  
  :deep(.el-input__wrapper) {
    border-radius: 6px;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #d1d5db;
    }
    
    &.is-focus {
      border-color: #3b82f6;
    }
  }
  
  :deep(.el-select) {
    width: 100%;
    
    .el-input__wrapper {
      border-radius: 6px;
    }
  }
  
  :deep(.el-date-editor) {
    width: 100%;
    
    .el-input__wrapper {
      border-radius: 6px;
    }
  }
  
  :deep(.el-button) {
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
}

// Responsive adjustments
@media (max-width: 768px) {
  .search-form {
    :deep(.el-form-item__label) {
      font-size: 13px;
    }
  }
}
</style>