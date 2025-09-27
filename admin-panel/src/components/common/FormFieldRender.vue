<template>
  <el-form-item
    :label="field.label"
    :prop="field.name"
    :required="field.required"
    :label-width="field.labelWidth"
    :rules="field.rules"
    :class="[field.className]"
    :style="field.style"
    v-bind="field.formItemProps"
  >
    <!-- 提示信息 -->
    <template #label v-if="field.tooltip">
      <span>{{ field.label }}</span>
      <el-tooltip :content="field.tooltip" placement="top">
        <el-icon class="field-tooltip"><QuestionFilled /></el-icon>
      </el-tooltip>
    </template>

    <!-- 自定义渲染表单项 -->
    <component
      v-if="field.renderFormItem"
      :is="field.renderFormItem"
      :field="field"
      :form-data="formData"
    />

    <!-- 自定义渲染内容 -->
    <component
      v-else-if="field.render"
      :is="field.render"
      :value="value"
      :form-data="formData"
    />

    <!-- 文本输入框 -->
    <el-input
      v-else-if="!field.valueType || field.valueType === 'text'"
      :model-value="value"
      :placeholder="field.placeholder || `请输入${field.label}`"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="field.maxLength"
      :minlength="field.minLength"
      :show-word-limit="!!field.maxLength"
      :clearable="true"
      v-bind="field.fieldProps"
      @input="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 密码输入框 -->
    <el-input
      v-else-if="field.valueType === 'password'"
      type="password"
      :model-value="value"
      :placeholder="field.placeholder || `请输入${field.label}`"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="field.maxLength"
      :minlength="field.minLength"
      :clearable="true"
      show-password
      v-bind="field.fieldProps"
      @input="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 文本域 -->
    <el-input
      v-else-if="field.valueType === 'textarea'"
      type="textarea"
      :model-value="value"
      :placeholder="field.placeholder || `请输入${field.label}`"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="field.maxLength"
      :minlength="field.minLength"
      :show-word-limit="!!field.maxLength"
      :autosize="{ minRows: 3, maxRows: 6 }"
      v-bind="field.fieldProps"
      @input="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 数字输入框 -->
    <InputNumber
      v-else-if="field.valueType === 'number'"
      :model-value="value"
      :placeholder="field.placeholder || `请输入${field.label}`"
      :disabled="disabled"
      :min="field.min"
      :max="field.max"
      :step="field.step || 1"
      :precision="field.fieldProps?.precision || 0"
      :controls="field.fieldProps?.controls || false"
      :unit="field.fieldProps?.unit || ''"
      :thousands="field.fieldProps?.thousands || false"
      :text-align="field.fieldProps?.textAlign || 'left'"
      :size="field.fieldProps?.size || 'default'"
      :status="field.fieldProps?.status || ''"
      style="width: 100%"
      @update:modelValue="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 选择器 -->
    <el-select
      v-else-if="field.valueType === 'select'"
      :model-value="value"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :filterable="field.filterable !== false"
      :allow-create="field.allowCreate"
      :remote="!!field.fieldProps?.remote"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    >
      <el-option
        v-for="option in fieldOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled"
      />
    </el-select>

    <!-- 多选选择器 -->
    <el-select
      v-else-if="field.valueType === 'multipleSelect'"
      :model-value="value"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :filterable="field.filterable !== false"
      :collapse-tags="true"
      :collapse-tags-tooltip="true"
      multiple
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    >
      <el-option
        v-for="option in fieldOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled"
      />
    </el-select>

    <!-- 单选框组 -->
    <el-radio-group
      v-else-if="field.valueType === 'radio'"
      :model-value="value"
      :disabled="disabled"
      v-bind="field.fieldProps"
      @change="handleChange"
    >
      <el-radio
        v-for="option in fieldOptions"
        :key="option.value"
        :label="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-radio>
    </el-radio-group>

    <!-- 复选框组 -->
    <el-checkbox-group
      v-else-if="field.valueType === 'checkbox'"
      :model-value="value"
      :disabled="disabled"
      v-bind="field.fieldProps"
      @change="handleChange"
    >
      <el-checkbox
        v-for="option in fieldOptions"
        :key="option.value"
        :label="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-checkbox>
    </el-checkbox-group>

    <!-- 开关 -->
    <el-switch
      v-else-if="field.valueType === 'switch'"
      :model-value="value"
      :disabled="disabled"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 滑块 -->
    <el-slider
      v-else-if="field.valueType === 'slider'"
      :model-value="value"
      :disabled="disabled"
      :min="field.min || 0"
      :max="field.max || 100"
      :step="field.step || 1"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 评分 -->
    <el-rate
      v-else-if="field.valueType === 'rate'"
      :model-value="value"
      :disabled="disabled"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 日期选择器 -->
    <el-date-picker
      v-else-if="field.valueType === 'date'"
      :model-value="value"
      type="date"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :editable="false"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 日期时间选择器 -->
    <el-date-picker
      v-else-if="field.valueType === 'dateTime'"
      :model-value="value"
      type="datetime"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :editable="false"
      format="YYYY-MM-DD HH:mm:ss"
      value-format="YYYY-MM-DD HH:mm:ss"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 日期范围选择器 -->
    <el-date-picker
      v-else-if="field.valueType === 'dateRange'"
      :model-value="value"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      :disabled="disabled"
      :clearable="true"
      :editable="false"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 时间选择器 -->
    <el-time-picker
      v-else-if="field.valueType === 'time'"
      :model-value="value"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :editable="false"
      format="HH:mm:ss"
      value-format="HH:mm:ss"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />

    <!-- 颜色选择器 -->
    <el-color-picker
      v-else-if="field.valueType === 'colorPicker'"
      :model-value="value"
      :disabled="disabled"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 树形选择器 -->
    <el-tree-select
      v-else-if="field.valueType === 'treeSelect'"
      :model-value="value"
      :data="treeSelectData"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :filterable="field.filterable !== false"
      :check-strictly="true"
      node-key="value"
      :props="{
        label: 'label',
        value: 'value',
        children: 'children'
      }"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 级联选择器 -->
    <el-cascader
      v-else-if="field.valueType === 'cascader'"
      :model-value="value"
      :options="fieldOptions"
      :placeholder="field.placeholder || `请选择${field.label}`"
      :disabled="disabled"
      :clearable="true"
      :filterable="field.filterable !== false"
      :props="{
        label: 'label',
        value: 'value',
        children: 'children'
      }"
      style="width: 100%"
      v-bind="field.fieldProps"
      @change="handleChange"
    />

    <!-- 文件上传 -->
    <el-upload
      v-else-if="field.valueType === 'upload' || field.valueType === 'uploadFile'"
      :file-list="fileList"
      :action="field.fieldProps?.action || '/api/upload'"
      :accept="field.accept"
      :multiple="field.fieldProps?.multiple || false"
      :limit="field.fieldProps?.limit || 1"
      :disabled="disabled"
      :show-file-list="true"
      :auto-upload="field.fieldProps?.autoUpload !== false"
      v-bind="field.fieldProps"
      @change="handleUploadChange"
    >
      <el-button type="primary" :disabled="disabled">
        <el-icon><Upload /></el-icon>
        选择文件
      </el-button>
      <template #tip>
        <div class="el-upload__tip" v-if="field.fieldProps?.tip">
          {{ field.fieldProps.tip }}
        </div>
      </template>
    </el-upload>

    <!-- 图片上传 -->
    <el-upload
      v-else-if="field.valueType === 'uploadImage'"
      :file-list="fileList"
      :action="field.fieldProps?.action || '/api/upload/image'"
      :accept="field.accept || 'image/*'"
      :multiple="field.fieldProps?.multiple || false"
      :limit="field.fieldProps?.limit || 1"
      :disabled="disabled"
      list-type="picture-card"
      :auto-upload="field.fieldProps?.autoUpload !== false"
      v-bind="field.fieldProps"
      @change="handleUploadChange"
    >
      <el-icon><Plus /></el-icon>
      <template #tip>
        <div class="el-upload__tip" v-if="field.fieldProps?.tip">
          {{ field.fieldProps.tip }}
        </div>
      </template>
    </el-upload>

    <!-- 默认文本显示（用于不支持的类型） -->
    <span v-else class="field-text">
      {{ value || '-' }}
    </span>

    <!-- 额外信息 -->
    <div v-if="field.extra" class="field-extra">
      <component v-if="typeof field.extra === 'object'" :is="field.extra" />
      <span v-else>{{ field.extra }}</span>
    </div>
  </el-form-item>
</template>

<script setup>
import { ref, computed, watch, unref } from 'vue'
import { QuestionFilled, Upload, Plus } from '@element-plus/icons-vue'
import InputNumber from '../InputNumber.vue'

// Props定义
const props = defineProps({
  field: {
    type: Object,
    required: true
  },
  value: {
    type: [String, Number, Boolean, Array, Object, Date],
    default: undefined
  },
  formData: {
    type: Object,
    default: () => ({})
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

// 事件定义
const emit = defineEmits(['change', 'blur', 'focus'])

// 响应式数据
const fieldOptions = ref([])
const fileList = ref([])
const treeSelectData = computed(() => {
  if (props.field.valueType !== 'treeSelect') {
    return fieldOptions.value
  }

  if (Array.isArray(fieldOptions.value) && fieldOptions.value.length) {
    return fieldOptions.value
  }

  const directOptions = unref(props.field.options)
  if (Array.isArray(directOptions) && directOptions.length) {
    return directOptions
  }

  const fieldPropData = unref(props.field.fieldProps?.data)
  if (Array.isArray(fieldPropData) && fieldPropData.length) {
    return fieldPropData
  }

  return []
})

// 计算属性
const finalDisabled = computed(() => {
  return props.disabled || props.readonly
})

// 方法
const handleChange = (val) => {
  emit('change', props.field.name, val, props.value)
}

const handleBlur = (event) => {
  emit('blur', props.field.name, event)
}

const handleFocus = (event) => {
  emit('focus', props.field.name, event)
}

const handleUploadChange = (file, fileList) => {
  // 处理文件上传变化
  const urls = fileList.map(file => file.response?.url || file.url).filter(Boolean)
  
  if (props.field.fieldProps?.multiple) {
    handleChange(urls)
  } else {
    handleChange(urls[0] || '')
  }
}

// 加载选项数据
const loadOptions = async () => {
  if (!props.field.options) {
    fieldOptions.value = []
    return
  }

  try {
    if (typeof props.field.options === 'function') {
      fieldOptions.value = await props.field.options()
    } else {
      const resolvedOptions = unref(props.field.options)
      fieldOptions.value = resolvedOptions ?? []
    }
  } catch (error) {
    console.error('加载选项数据失败:', error)
    fieldOptions.value = []
  }
}

// 初始化文件列表
const initFileList = () => {
  if (props.field.valueType === 'upload' || props.field.valueType === 'uploadFile' || props.field.valueType === 'uploadImage') {
    if (props.value) {
      if (Array.isArray(props.value)) {
        fileList.value = props.value.map((url, index) => ({
          name: `file-${index}`,
          url,
          status: 'success'
        }))
      } else if (typeof props.value === 'string') {
        fileList.value = [{
          name: 'file',
          url: props.value,
          status: 'success'
        }]
      }
    } else {
      fileList.value = []
    }
  }
}

// 监听器
watch(
  () => unref(props.field.options),
  () => {
    loadOptions()
  },
  { immediate: true, deep: true }
)
watch(() => props.value, initFileList, { immediate: true })
</script>

<style lang="scss" scoped>
.field-tooltip {
  margin-left: 4px;
  color: var(--el-color-info);
  cursor: help;
}

.field-extra {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.field-text {
  color: var(--el-text-color-regular);
}

:deep(.el-form-item__label) {
  display: flex;
  align-items: center;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 100px;
  height: 100px;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
}
</style>
