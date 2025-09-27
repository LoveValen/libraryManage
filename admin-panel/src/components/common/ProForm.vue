<template>
  <div class="pro-form" :class="[`pro-form--${layout}`, className]">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="computedRules"
      :label-width="labelWidth"
      :label-position="labelPosition"
      :size="size"
      :disabled="disabled || readonly"
      :require-asterisk-position="requireAsteriskPosition"
      :hide-required-asterisk="hideRequiredAsterisk"
      :scroll-to-error="scrollToError"
      :validate-on-rule-change="false"
      @validate="handleValidate"
      v-loading="loading"
    >
      <!-- 表单分组 -->
      <template v-if="groups && groups.length > 0">
        <div
          v-for="group in groups"
          :key="group.key"
          :class="['form-group', group.className]"
        >
          <div class="group-header" v-if="group.title">
            <el-divider content-position="left">
              <span class="group-title">{{ group.title }}</span>
            </el-divider>
            <p v-if="group.description" class="group-description">
              {{ group.description }}
            </p>
          </div>
          <el-row :gutter="gutter">
            <template v-for="field in getGroupFields(group.key)" :key="field.name">
              <el-col
                v-if="shouldShowField(field)"
                :span="getFieldSpan(field)"
                :offset="field.offset || 0"
              >
                <FormFieldRender
                  :field="field"
                  :value="formData[field.name]"
                  :form-data="formData"
                  :disabled="getFieldDisabled(field)"
                  :readonly="readonly"
                  @change="handleFieldChange"
                />
              </el-col>
            </template>
          </el-row>
        </div>
      </template>

      <!-- 无分组表单 -->
      <template v-else>
        <el-row :gutter="gutter">
          <template v-for="field in sortedFields" :key="field.name">
            <el-col
              v-if="shouldShowField(field)"
              :span="getFieldSpan(field)"
              :offset="field.offset || 0"
            >
              <FormFieldRender
                :field="field"
                :value="formData[field.name]"
                :form-data="formData"
                :disabled="getFieldDisabled(field)"
                :readonly="readonly"
                @change="handleFieldChange"
              />
            </el-col>
          </template>
        </el-row>
      </template>

      <!-- 操作按钮 -->
      <div
        v-if="actions !== false"
        class="form-actions"
        :class="[
          `form-actions--${actions?.align || 'left'}`,
          { 'form-actions--fixed': actions?.fixed }
        ]"
      >
        <slot name="actions" :formData="formData" :submit="handleSubmit" :reset="handleReset">
          <!-- 自定义渲染 -->
          <component
            v-if="actions?.render"
            :is="actions.render"
            :form-data="formData"
            :actions="{ submit: handleSubmit, reset: handleReset }"
          />
          
          <!-- 默认按钮 -->
          <template v-else>
            <el-button
              v-if="actions?.submit !== false"
              :type="actions?.submit?.type || 'primary'"
              :size="actions?.submit?.size || size"
              :loading="actions?.submit?.loading || submitLoading"
              :disabled="actions?.submit?.disabled"
              :icon="actions?.submit?.icon"
              @click="handleSubmit"
            >
              {{ actions?.submit?.text || '提交' }}
            </el-button>
            
            <el-button
              v-if="actions?.reset !== false"
              :type="actions?.reset?.type || 'default'"
              :size="actions?.reset?.size || size"
              :icon="actions?.reset?.icon"
              @click="handleReset"
            >
              {{ actions?.reset?.text || '重置' }}
            </el-button>
          </template>
        </slot>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import FormFieldRender from './FormFieldRender.vue'

// Props定义
const props = defineProps({
  // 表单字段配置
  fields: {
    type: Array,
    required: true
  },

  // 表单初始值
  initialValues: {
    type: Object,
    default: () => ({})
  },

  // 表单布局
  layout: {
    type: String,
    default: 'horizontal',
    validator: value => ['horizontal', 'vertical', 'inline'].includes(value)
  },

  // 表单尺寸
  size: {
    type: String,
    default: 'default',
    validator: value => ['large', 'default', 'small'].includes(value)
  },

  // 标签宽度
  labelWidth: {
    type: [String, Number],
    default: '100px'
  },

  // 标签位置
  labelPosition: {
    type: String,
    default: 'right',
    validator: value => ['left', 'right', 'top'].includes(value)
  },

  // 必填星号位置
  requireAsteriskPosition: {
    type: String,
    default: 'left',
    validator: value => ['left', 'right'].includes(value)
  },

  // 隐藏必填星号
  hideRequiredAsterisk: {
    type: Boolean,
    default: false
  },

  // 栅格间距
  gutter: {
    type: Number,
    default: 16
  },

  // 每行列数
  columns: {
    type: Number,
    default: 2
  },

  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },

  // 是否只读
  readonly: {
    type: Boolean,
    default: false
  },

  // 操作按钮配置
  actions: {
    type: [Object, Boolean],
    default: undefined
  },

  // 分组配置
  groups: {
    type: Array,
    default: () => []
  },

  // 自动滚动到错误字段
  scrollToError: {
    type: Boolean,
    default: true
  },

  // 保留字段值
  preserve: {
    type: Boolean,
    default: true
  },

  // 自定义样式类
  className: {
    type: String,
    default: ''
  },

  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },

  // 表单模式
  mode: {
    type: String,
    default: 'create',
    validator: value => ['create', 'edit', 'view'].includes(value)
  }
})

// 事件定义
const emit = defineEmits([
  'submit',
  'values-change',
  'validate-fail',
  'field-change',
  'reset'
])

// 响应式数据
const formRef = ref()
const formData = reactive({})
const submitLoading = ref(false)
const hasInitialized = ref(false)

// 计算属性
const computedRules = computed(() => {
  const rules = {}
  props.fields.forEach(field => {
    if (field.rules) {
      rules[field.name] = field.rules
    } else if (field.required) {
      const requiredRule = {
        required: true,
        message: `请输入${field.label}`,
        trigger: getFieldTrigger(field.valueType)
      }
      
      if (field.valueType === 'select' || field.valueType === 'multipleSelect') {
        requiredRule.message = `请选择${field.label}`
      }
      
      rules[field.name] = [requiredRule]
    }
  })
  return rules
})

const sortedFields = computed(() => {
  return [...props.fields].sort((a, b) => (a.order || 0) - (b.order || 0))
})

// 方法
const getFieldTrigger = (valueType) => {
  const triggers = {
    text: 'blur',
    password: 'blur',
    textarea: 'blur',
    number: 'blur',
    select: 'change',
    multipleSelect: 'change',
    radio: 'change',
    checkbox: 'change',
    switch: 'change',
    date: 'change',
    dateTime: 'change',
    dateRange: 'change',
    dateTimeRange: 'change'
  }
  return triggers[valueType] || 'blur'
}

const shouldShowField = (field) => {
  if (typeof field.hidden === 'function') {
    return !field.hidden(formData)
  }
  if (field.when && !field.when(formData)) {
    return false
  }
  return !field.hidden
}

const getFieldDisabled = (field) => {
  if (typeof field.disabled === 'function') {
    return field.disabled(formData)
  }
  return field.disabled || props.disabled
}

const getFieldSpan = (field) => {
  if (field.span) return field.span
  return Math.floor(24 / props.columns)
}

const getGroupFields = (groupKey) => {
  return sortedFields.value.filter(field => field.group === groupKey)
}

const handleFieldChange = (fieldName, value, oldValue) => {
  const field = props.fields.find(f => f.name === fieldName)
  
  // 更新表单数据
  formData[fieldName] = value
  
  // 触发字段变化事件
  if (field?.onChange) {
    field.onChange(value, formData)
  }
  
  // 触发表单值变化事件
  emit('values-change', { [fieldName]: value }, formData)
  emit('field-change', fieldName, value, oldValue)
  
  // 处理依赖字段
  const dependentFields = props.fields.filter(f => 
    f.dependencies && f.dependencies.includes(fieldName)
  )
  
  dependentFields.forEach(field => {
    // 可以在这里处理依赖逻辑
  })
}

const handleSubmit = async () => {
  try {
    submitLoading.value = true
    
    // 表单验证
    const valid = await formRef.value.validate()
    
    if (valid) {
      const values = { ...formData }
      
      // 调用提交事件
      emit('submit', values)
      
      // 如果有actions配置的提交处理
      if (props.actions?.submit?.onClick) {
        await props.actions.submit.onClick(values)
      }
    }
  } catch (error) {
    console.error('表单提交失败:', error)
    emit('validate-fail', error)
  } finally {
    submitLoading.value = false
  }
}

const handleReset = () => {
  // 重置表单
  formRef.value?.resetFields()
  
  // 重置为初始值
  Object.keys(formData).forEach(key => {
    const field = props.fields.find(f => f.name === key)
    formData[key] = field?.initialValue !== undefined ? field.initialValue : undefined
  })
  
  emit('reset', formData)
  
  // 如果有actions配置的重置处理
  if (props.actions?.reset?.onClick) {
    props.actions.reset.onClick(formData)
  }
}

const handleValidate = (prop, isValid, message) => {
  if (!isValid) {
    console.warn(`字段 ${prop} 验证失败:`, message)
  }
}

// 表单实例方法
const submit = async () => {
  return await handleSubmit()
}

const validate = async () => {
  try {
    const valid = await formRef.value.validate()
    return valid
  } catch {
    return false
  }
}

const validateField = async (field) => {
  try {
    const valid = await formRef.value.validateField(field)
    return valid
  } catch {
    return false
  }
}

const reset = () => {
  handleReset()
}

const resetField = (field) => {
  if (Array.isArray(field)) {
    field.forEach(f => formRef.value?.resetFields([f]))
  } else {
    formRef.value?.resetFields([field])
  }
}

const clearValidate = (field) => {
  formRef.value?.clearValidate(field)
}

const getValues = () => {
  return { ...formData }
}

const setValues = (values) => {
  if (!values) return
  for (const [key, value] of Object.entries(values)) {
    if (formData[key] !== value) {
      formData[key] = value
    }
  }
}

const getFieldValue = (field) => {
  return formData[field]
}

const setFieldValue = (field, value) => {
  formData[field] = value
}

const scrollToField = (field) => {
  formRef.value?.scrollToField(field)
}

// 初始化
const initFormData = () => {
  // 清空现有数据
  Object.keys(formData).forEach(key => {
    delete formData[key]
  })
  
  // 设置初始值
  props.fields.forEach(field => {
    const initialValue = props.initialValues[field.name] !== undefined 
      ? props.initialValues[field.name] 
      : field.initialValue
    
    if (initialValue !== undefined) {
      formData[field.name] = initialValue
    }
  })

  hasInitialized.value = true
}

// 监听器

// 生命周期
// 数据监听
watch(
  () => props.fields,
  (newFields, oldFields) => {
    if (!hasInitialized.value) return
    if (!oldFields) return
    const newNames = Array.isArray(newFields) ? newFields.map(field => field?.name).join('|') : ''
    const oldNames = Array.isArray(oldFields) ? oldFields.map(field => field?.name).join('|') : ''

    if (!props.preserve && newNames !== oldNames) {
      initFormData()
    }
  },
  { deep: false }
)

watch(
  () => props.initialValues,
  newValues => {
    if (!newValues) return
    for (const [key, incoming] of Object.entries(newValues)) {
      if (formData[key] !== incoming) {
        formData[key] = incoming
      }
    }
  },
  { deep: true }
)

onMounted(() => {
  initFormData()
})

// 暴露方法
defineExpose({
  submit,
  validate,
  validateField,
  reset,
  resetField,
  clearValidate,
  getValues,
  setValues,
  getFieldValue,
  setFieldValue,
  scrollToField,
  formRef
})
</script>

<style lang="scss" scoped>
.pro-form {
  width: 100%;

  &--inline {
    :deep(.el-form) {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
  }

  .form-group {
    margin-bottom: 20px;

    .group-header {
      margin-bottom: 16px;

      .group-title {
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .group-description {
        margin: 8px 0 0 0;
        font-size: 12px;
        color: var(--el-text-color-secondary);
        line-height: 1.5;
      }
    }
  }

  .form-actions {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);

    &--left {
      text-align: left;
    }

    &--center {
      text-align: center;
    }

    &--right {
      text-align: right;
    }

    &--fixed {
      position: sticky;
      bottom: 0;
      background: var(--el-bg-color);
      z-index: 10;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      margin: 0 -20px -20px -20px;
      padding: 16px 20px;
    }

    :deep(.el-button) {
      margin-right: 12px;

      &:last-child {
        margin-right: 0;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .pro-form {
    .form-actions {
      text-align: center;
      
      :deep(.el-button) {
        margin-bottom: 12px;
        width: 100%;
        margin-right: 0;
      }
    }
  }
}
  :deep(.el-card) {
    margin-bottom: 20px;
    border-radius: 8px;

    .el-card__header {
      background: var(--el-fill-color-lighter);
      border-bottom: 1px solid var(--el-border-color-light);
      padding: 12px 20px;

      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--el-text-color-primary);

        .el-icon {
          font-size: 16px;
        }
      }
    }

    .el-card__body {
      padding: 20px;
    }
  }

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

</style>
