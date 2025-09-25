<template>
  <el-card
    :shadow="shadow"
    :body-style="bodyStyle"
    class="form-card"
    :class="[`form-card--${size}`, { 'form-card--collapsible': collapsible }]"
  >
    <!-- 卡片头部 -->
    <template #header v-if="title || icon || $slots.header || collapsible">
      <div class="form-card-header">
        <div class="header-left">
          <div class="header-title">
            <el-icon v-if="icon" class="title-icon">
              <component :is="icon" />
            </el-icon>
            <span class="title-text">{{ title }}</span>
            <el-tag v-if="required" type="danger" size="small" class="required-tag">必填</el-tag>
          </div>
          <div v-if="description" class="header-description">{{ description }}</div>
        </div>

        <div class="header-right">
          <slot name="header-actions" />

          <el-button v-if="collapsible" link size="small" @click="toggleCollapse" class="collapse-btn">
            <el-icon>
              <component :is="collapsed ? 'ArrowDown' : 'ArrowUp'" />
            </el-icon>
          </el-button>
        </div>

        <!-- 自定义头部内容 -->
        <slot name="header" />
      </div>
    </template>

    <!-- 卡片内容 -->
    <el-collapse-transition>
      <div v-show="!collapsed" class="form-card-content">
        <!-- 表单内容 -->
        <el-form
          v-if="!customForm"
          ref="formRef"
          :model="formData"
          :rules="rules"
          :label-width="labelWidth"
          :label-position="labelPosition"
          :inline="inline"
          :size="formSize"
          :disabled="disabled"
          :validate-on-rule-change="validateOnRuleChange"
          :hide-required-asterisk="hideRequiredAsterisk"
          :show-message="showMessage"
          :inline-message="inlineMessage"
          :status-icon="statusIcon"
          class="form-content"
        >
          <!-- 动态表单项 -->
          <template v-for="field in fields" :key="field.prop">
            <el-form-item
              :prop="field.prop"
              :label="field.label"
              :label-width="field.labelWidth"
              :required="field.required"
              :rules="field.rules"
              :error="field.error"
              :show-message="field.showMessage !== false"
              :inline-message="field.inlineMessage"
              :size="field.size"
              :class="field.className"
              :style="field.style"
            >
              <!-- 输入框 -->
              <el-input
                v-if="field.type === 'input'"
                v-model="formData[field.prop]"
                :type="field.inputType || 'text'"
                :placeholder="field.placeholder"
                :clearable="field.clearable !== false"
                :show-password="field.showPassword"
                :disabled="field.disabled"
                :readonly="field.readonly"
                :maxlength="field.maxlength"
                :minlength="field.minlength"
                :show-word-limit="field.showWordLimit"
                :prefix-icon="field.prefixIcon"
                :suffix-icon="field.suffixIcon"
                :rows="field.rows"
                :autosize="field.autosize"
                :autocomplete="field.autocomplete"
                :name="field.name"
                :resize="field.resize"
                :autofocus="field.autofocus"
                :form="field.form"
                :tabindex="field.tabindex"
                :validate-event="field.validateEvent !== false"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
                @change="handleFieldEvent('change', field, $event)"
                @input="handleFieldEvent('input', field, $event)"
                @clear="handleFieldEvent('clear', field, $event)"
              />

              <!-- 数字输入框 -->
              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="formData[field.prop]"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :step-strictly="field.stepStrictly"
                :precision="field.precision"
                :size="field.size"
                :disabled="field.disabled"
                :controls="field.controls !== false"
                :controls-position="field.controlsPosition"
                :name="field.name"
                :placeholder="field.placeholder"
                :id="field.id"
                @change="handleFieldEvent('change', field, $event)"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
              />

              <!-- 选择器 -->
              <el-select
                v-else-if="field.type === 'select'"
                v-model="formData[field.prop]"
                :multiple="field.multiple"
                :disabled="field.disabled"
                :value-key="field.valueKey"
                :size="field.size"
                :clearable="field.clearable !== false"
                :collapse-tags="field.collapseTags"
                :collapse-tags-tooltip="field.collapseTagsTooltip"
                :multiple-limit="field.multipleLimit"
                :name="field.name"
                :autocomplete="field.autocomplete"
                :placeholder="field.placeholder"
                :filterable="field.filterable"
                :allow-create="field.allowCreate"
                :filter-method="field.filterMethod"
                :remote="field.remote"
                :remote-method="field.remoteMethod"
                :loading="field.loading"
                :loading-text="field.loadingText"
                :no-match-text="field.noMatchText"
                :no-data-text="field.noDataText"
                :popper-class="field.popperClass"
                :reserve-keyword="field.reserveKeyword"
                :default-first-option="field.defaultFirstOption"
                :popper-append-to-body="field.popperAppendToBody"
                :automatic-dropdown="field.automaticDropdown"
                @change="handleFieldEvent('change', field, $event)"
                @visible-change="handleFieldEvent('visible-change', field, $event)"
                @remove-tag="handleFieldEvent('remove-tag', field, $event)"
                @clear="handleFieldEvent('clear', field, $event)"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
              >
                <el-option
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                  :disabled="option.disabled"
                />
              </el-select>

              <!-- 级联选择器 -->
              <el-cascader
                v-else-if="field.type === 'cascader'"
                v-model="formData[field.prop]"
                :options="field.options"
                :props="field.props"
                :size="field.size"
                :placeholder="field.placeholder"
                :disabled="field.disabled"
                :clearable="field.clearable !== false"
                :show-all-levels="field.showAllLevels !== false"
                :collapse-tags="field.collapseTags"
                :separator="field.separator"
                :filterable="field.filterable"
                :debounce="field.debounce"
                :before-filter="field.beforeFilter"
                :popper-class="field.popperClass"
                @change="handleFieldEvent('change', field, $event)"
                @expand-change="handleFieldEvent('expand-change', field, $event)"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
                @visible-change="handleFieldEvent('visible-change', field, $event)"
              />

              <!-- 日期选择器 -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="formData[field.prop]"
                :type="field.dateType || 'date'"
                :placeholder="field.placeholder"
                :start-placeholder="field.startPlaceholder"
                :end-placeholder="field.endPlaceholder"
                :format="field.format"
                :value-format="field.valueFormat"
                :disabled="field.disabled"
                :clearable="field.clearable !== false"
                :size="field.size"
                :editable="field.editable !== false"
                :align="field.align"
                :popper-class="field.popperClass"
                :range-separator="field.rangeSeparator"
                :default-value="field.defaultValue"
                :default-time="field.defaultTime"
                :name="field.name"
                :unlink-panels="field.unlinkPanels"
                :prefix-icon="field.prefixIcon"
                :clear-icon="field.clearIcon"
                :shortcuts="field.shortcuts"
                :disabled-date="field.disabledDate"
                @change="handleFieldEvent('change', field, $event)"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
              />

              <!-- 时间选择器 -->
              <el-time-picker
                v-else-if="field.type === 'time'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
                :clearable="field.clearable !== false"
                :size="field.size"
                :placeholder="field.placeholder"
                :start-placeholder="field.startPlaceholder"
                :end-placeholder="field.endPlaceholder"
                :is-range="field.isRange"
                :arrow-control="field.arrowControl"
                :align="field.align"
                :popper-class="field.popperClass"
                :range-separator="field.rangeSeparator"
                :format="field.format"
                :value-format="field.valueFormat"
                :default-value="field.defaultValue"
                :name="field.name"
                :prefix-icon="field.prefixIcon"
                :clear-icon="field.clearIcon"
                :disabled-hours="field.disabledHours"
                :disabled-minutes="field.disabledMinutes"
                :disabled-seconds="field.disabledSeconds"
                @change="handleFieldEvent('change', field, $event)"
                @blur="handleFieldEvent('blur', field, $event)"
                @focus="handleFieldEvent('focus', field, $event)"
              />

              <!-- 开关 -->
              <el-switch
                v-else-if="field.type === 'switch'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
                :width="field.width"
                :active-icon="field.activeIcon"
                :inactive-icon="field.inactiveIcon"
                :active-text="field.activeText"
                :inactive-text="field.inactiveText"
                :active-value="field.activeValue"
                :inactive-value="field.inactiveValue"
                :active-color="field.activeColor"
                :inactive-color="field.inactiveColor"
                :border-color="field.borderColor"
                :name="field.name"
                :validate-event="field.validateEvent !== false"
                :before-change="field.beforeChange"
                @change="handleFieldEvent('change', field, $event)"
              />

              <!-- 单选框组 -->
              <el-radio-group
                v-else-if="field.type === 'radio'"
                v-model="formData[field.prop]"
                :size="field.size"
                :disabled="field.disabled"
                :text-color="field.textColor"
                :fill="field.fill"
                @change="handleFieldEvent('change', field, $event)"
              >
                <el-radio
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.value"
                  :disabled="option.disabled"
                  :border="field.border"
                  :size="field.size"
                  :name="field.name"
                >
                  {{ option.label }}
                </el-radio>
              </el-radio-group>

              <!-- 复选框组 -->
              <el-checkbox-group
                v-else-if="field.type === 'checkbox'"
                v-model="formData[field.prop]"
                :size="field.size"
                :disabled="field.disabled"
                :min="field.min"
                :max="field.max"
                :text-color="field.textColor"
                :fill="field.fill"
                @change="handleFieldEvent('change', field, $event)"
              >
                <el-checkbox
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.value"
                  :true-label="option.trueLabel"
                  :false-label="option.falseLabel"
                  :disabled="option.disabled"
                  :border="field.border"
                  :size="field.size"
                  :name="field.name"
                  :checked="option.checked"
                  :indeterminate="option.indeterminate"
                >
                  {{ option.label }}
                </el-checkbox>
              </el-checkbox-group>

              <!-- 滑块 -->
              <el-slider
                v-else-if="field.type === 'slider'"
                v-model="formData[field.prop]"
                :min="field.min"
                :max="field.max"
                :disabled="field.disabled"
                :step="field.step"
                :show-input="field.showInput"
                :show-input-controls="field.showInputControls"
                :input-size="field.inputSize"
                :show-stops="field.showStops"
                :show-tooltip="field.showTooltip !== false"
                :format-tooltip="field.formatTooltip"
                :range="field.range"
                :vertical="field.vertical"
                :height="field.height"
                :label="field.label"
                :debounce="field.debounce"
                :tooltip-class="field.tooltipClass"
                :marks="field.marks"
                @change="handleFieldEvent('change', field, $event)"
                @input="handleFieldEvent('input', field, $event)"
              />

              <!-- 评分 -->
              <el-rate
                v-else-if="field.type === 'rate'"
                v-model="formData[field.prop]"
                :max="field.max"
                :disabled="field.disabled"
                :allow-half="field.allowHalf"
                :low-threshold="field.lowThreshold"
                :high-threshold="field.highThreshold"
                :colors="field.colors"
                :void-color="field.voidColor"
                :disabled-void-color="field.disabledVoidColor"
                :icon-classes="field.iconClasses"
                :void-icon-class="field.voidIconClass"
                :disabled-void-icon-class="field.disabledVoidIconClass"
                :show-text="field.showText"
                :show-score="field.showScore"
                :text-color="field.textColor"
                :texts="field.texts"
                :score-template="field.scoreTemplate"
                @change="handleFieldEvent('change', field, $event)"
              />

              <!-- 文件上传 -->
              <FileUpload
                v-else-if="field.type === 'upload'"
                v-model="formData[field.prop]"
                v-bind="field.uploadProps"
                @success="handleFieldEvent('upload-success', field, $event)"
                @error="handleFieldEvent('upload-error', field, $event)"
                @progress="handleFieldEvent('upload-progress', field, $event)"
                @change="handleFieldEvent('upload-change', field, $event)"
                @remove="handleFieldEvent('upload-remove', field, $event)"
              />

              <!-- 自定义字段 -->
              <slot
                v-else-if="field.type === 'slot'"
                :name="field.slot"
                :field="field"
                :value="formData[field.prop]"
                :setValue="value => (formData[field.prop] = value)"
              />

              <!-- 字段帮助文本 -->
              <div v-if="field.help" class="field-help">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
                <span class="help-text">{{ field.help }}</span>
              </div>

              <!-- 字段额外内容 -->
              <div v-if="field.extra" class="field-extra">
                {{ field.extra }}
              </div>
            </el-form-item>
          </template>

          <!-- 自定义表单项插槽 -->
          <slot name="form-items" :form-data="formData" />
        </el-form>

        <!-- 自定义表单 -->
        <div v-else class="custom-form">
          <slot :form-data="formData" />
        </div>

        <!-- 底部操作按钮 -->
        <div v-if="showActions" class="form-actions">
          <slot name="actions" :form-data="formData" :validate="validate" :reset="resetForm">
            <el-button v-if="showCancel" @click="handleCancel" :size="actionSize" :disabled="loading">
              {{ cancelText }}
            </el-button>

            <el-button v-if="showReset" @click="resetForm" :size="actionSize" :disabled="loading">
              {{ resetText }}
            </el-button>

            <el-button v-if="showSubmit" type="primary" @click="handleSubmit" :loading="loading" :size="actionSize">
              {{ submitText }}
            </el-button>
          </slot>
        </div>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import FileUpload from './FileUpload.vue'

// Props 定义
const props = defineProps({
  // 卡片基本属性
  title: String,
  description: String,
  icon: String,
  required: Boolean,
  shadow: {
    type: String,
    default: 'hover'
  },
  bodyStyle: Object,
  size: {
    type: String,
    default: 'default',
    validator: value => ['large', 'default', 'small'].includes(value)
  },

  // 折叠功能
  collapsible: Boolean,
  defaultCollapsed: Boolean,

  // 表单配置
  modelValue: {
    type: Object,
    default: () => ({})
  },
  fields: {
    type: Array,
    default: () => []
  },
  rules: Object,
  customForm: Boolean,

  // Element Plus Form 属性
  labelWidth: {
    type: String,
    default: '120px'
  },
  labelPosition: {
    type: String,
    default: 'right'
  },
  inline: Boolean,
  formSize: String,
  disabled: Boolean,
  validateOnRuleChange: {
    type: Boolean,
    default: true
  },
  hideRequiredAsterisk: Boolean,
  showMessage: {
    type: Boolean,
    default: true
  },
  inlineMessage: Boolean,
  statusIcon: Boolean,

  // 操作按钮
  showActions: {
    type: Boolean,
    default: true
  },
  showSubmit: {
    type: Boolean,
    default: true
  },
  showReset: {
    type: Boolean,
    default: true
  },
  showCancel: Boolean,
  submitText: {
    type: String,
    default: '提交'
  },
  resetText: {
    type: String,
    default: '重置'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  actionSize: {
    type: String,
    default: 'default'
  },
  loading: Boolean
})

// 事件定义
const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'reset', 'field-change', 'validate', 'collapse'])

// 响应式数据
const formRef = ref()
const collapsed = ref(props.defaultCollapsed || false)
const formData = reactive({ ...props.modelValue })

// 计算属性
const computedSize = computed(() => {
  const sizeMap = {
    large: 'large',
    default: 'default',
    small: 'small'
  }
  return sizeMap[props.size] || 'default'
})

// 方法
const validate = callback => {
  if (!formRef.value) {
    return Promise.resolve(true)
  }

  return new Promise(resolve => {
    formRef.value.validate((valid, fields) => {
      emit('validate', valid, fields)
      if (callback) callback(valid, fields)
      resolve(valid)
    })
  })
}

const validateField = (prop, callback) => {
  if (!formRef.value) return
  formRef.value.validateField(prop, callback)
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }

  // 重置为默认值
  Object.keys(formData).forEach(key => {
    const field = props.fields.find(f => f.prop === key)
    if (field && field.defaultValue !== undefined) {
      formData[key] = field.defaultValue
    } else {
      delete formData[key]
    }
  })

  emit('reset')
}

const clearValidate = props => {
  if (!formRef.value) return
  formRef.value.clearValidate(props)
}

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  emit('collapse', collapsed.value)
}

const handleSubmit = async () => {
  try {
    const valid = await validate()
    if (valid) {
      emit('submit', { ...formData })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleFieldEvent = (event, field, value) => {
  emit('field-change', {
    event,
    field: field.prop,
    value,
    fieldConfig: field
  })

  // 触发表单数据更新
  emit('update:modelValue', { ...formData })
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
  newValue => {
    emit('update:modelValue', { ...newValue })
  },
  { deep: true }
)

// 暴露方法
defineExpose({
  validate,
  validateField,
  resetForm,
  clearValidate,
  toggleCollapse,
  formRef,
  formData
})
</script>

<style lang="scss" scoped>
.form-card {
  &--large {
    .form-content {
      :deep(.el-form-item) {
        margin-bottom: 20px;
      }
    }

    .form-actions {
      padding: 20px 0;
    }
  }

  &--default {
    .form-content {
      :deep(.el-form-item) {
        margin-bottom: 20px;
      }
    }

    .form-actions {
      padding: 20px 0;
    }
  }

  &--small {
    .form-content {
      :deep(.el-form-item) {
        margin-bottom: 16px;
      }
    }

    .form-actions {
      padding: 16px 0;
    }
  }

  .form-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;

    .header-left {
      flex: 1;

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;

        .title-icon {
          font-size: 18px;
          color: var(--el-color-primary);
        }

        .title-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }

        .required-tag {
          margin-left: 8px;
        }
      }

      .header-description {
        color: var(--el-text-color-secondary);
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .collapse-btn {
        padding: 4px;

        .el-icon {
          font-size: 14px;
        }
      }
    }
  }

  .form-card-content {
    .form-content {
      :deep(.el-form-item__label) {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }

      .field-help {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        font-size: 12px;
        color: var(--el-text-color-secondary);

        .help-icon {
          font-size: 14px;
          color: var(--el-color-info);
        }

        .help-text {
          line-height: 1.4;
        }
      }

      .field-extra {
        margin-top: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        line-height: 1.4;
      }
    }

    .custom-form {
      min-height: 100px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--el-border-color-lighter);
      margin-top: 20px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .form-card {
    .form-card-header {
      flex-direction: column;
      gap: 12px;

      .header-right {
        width: 100%;
        justify-content: flex-end;
      }
    }

    .form-card-content {
      .form-actions {
        flex-direction: column-reverse;

        .el-button {
          width: 100%;
        }
      }
    }
  }
}
</style>
