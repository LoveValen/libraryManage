<template>
  <div 
    class="system-number-input" 
    :class="{
      'is-disabled': disabled,
      [`size-${size}`]: size !== 'default',
      [`is-${status}`]: status
    }"
  >
    <div class="number-input-wrapper" :class="{ 'has-controls': controls }">
      <!-- 减少按钮 -->
      <button
        v-if="controls"
        class="number-btn decrease-btn"
        :class="{ 'is-disabled': !canDecrease }"
        :disabled="!canDecrease || disabled"
        @click="decrease"
        @mousedown="startPress('decrease')"
        @mouseup="stopPress"
        @mouseleave="stopPress"
      >
        <el-icon><Minus /></el-icon>
      </button>

      <!-- 数字输入框 -->
      <el-input
        ref="inputRef"
        v-model="displayValue"
        class="number-input"
        :class="`text-${textAlign}`"
        :disabled="disabled"
        :placeholder="placeholder"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown="handleKeydown"
      />

      <!-- 增加按钮 -->
      <button
        v-if="controls"
        class="number-btn increase-btn"
        :class="{ 'is-disabled': !canIncrease }"
        :disabled="!canIncrease || disabled"
        @click="increase"
        @mousedown="startPress('increase')"
        @mouseup="stopPress"
        @mouseleave="stopPress"
      >
        <el-icon><Plus /></el-icon>
      </button>
    </div>

    <!-- 单位显示 -->
    <span v-if="unit" class="number-unit">{{ unit }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0
  },
  min: {
    type: Number,
    default: -Infinity
  },
  max: {
    type: Number,
    default: Infinity
  },
  step: {
    type: Number,
    default: 1
  },
  precision: {
    type: Number,
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: ''
  },
  controls: {
    type: Boolean,
    default: false
  },
  // 是否允许长按快速变化
  fastChange: {
    type: Boolean,
    default: true
  },
  // 组件尺寸
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['large', 'default', 'small'].includes(value)
  },
  // 状态类型
  status: {
    type: String,
    default: '',
    validator: (value) => ['', 'error', 'success', 'warning'].includes(value)
  },
  // 是否显示千分位分隔符
  thousands: {
    type: Boolean,
    default: false
  },
  // 文本对齐方式
  textAlign: {
    type: String,
    default: 'left',
    validator: (value) => ['left', 'center', 'right'].includes(value)
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus'])

// 响应式数据
const inputRef = ref()
const isFocused = ref(false)
const pressTimer = ref(null)
const fastTimer = ref(null)

// 内部数值
const numericValue = computed({
  get() {
    const val = parseFloat(props.modelValue)
    return isNaN(val) ? 0 : val
  },
  set(val) {
    emit('update:modelValue', val)
    emit('change', val)
  }
})

// 显示值（格式化后的字符串）
const displayValue = computed({
  get() {
    if (isFocused.value) {
      // 聚焦时显示原始值
      return String(numericValue.value)
    }
    // 非聚焦时显示格式化值
    return formatNumber(numericValue.value)
  },
  set(val) {
    const num = parseFloat(val)
    if (!isNaN(num)) {
      numericValue.value = constrainValue(num)
    }
  }
})

// 计算属性
const canDecrease = computed(() => {
  return numericValue.value > props.min
})

const canIncrease = computed(() => {
  return numericValue.value < props.max
})

// 方法
const formatNumber = (num) => {
  let formatted = props.precision > 0 
    ? num.toFixed(props.precision) 
    : Math.round(num).toString()
  
  // 添加千分位分隔符
  if (props.thousands) {
    const parts = formatted.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    formatted = parts.join('.')
  }
  
  return formatted
}

const constrainValue = (val) => {
  if (val < props.min) return props.min
  if (val > props.max) return props.max
  
  if (props.precision > 0) {
    return parseFloat(val.toFixed(props.precision))
  }
  return Math.round(val)
}

const increase = () => {
  if (canIncrease.value && !props.disabled) {
    const newVal = numericValue.value + props.step
    numericValue.value = constrainValue(newVal)
  }
}

const decrease = () => {
  if (canDecrease.value && !props.disabled) {
    const newVal = numericValue.value - props.step
    numericValue.value = constrainValue(newVal)
  }
}

const handleInput = (val) => {
  // 移除千分位分隔符，只允许数字、小数点、负号
  const cleanVal = val.replace(/,/g, '').replace(/[^\d.-]/g, '')
  
  if (cleanVal !== val) {
    nextTick(() => {
      inputRef.value.$el.querySelector('input').value = cleanVal
    })
  }
  
  const num = parseFloat(cleanVal)
  if (!isNaN(num)) {
    numericValue.value = num
  }
}

const handleBlur = (e) => {
  isFocused.value = false
  // 失焦时约束值到范围内
  numericValue.value = constrainValue(numericValue.value)
  emit('blur', e)
}

const handleFocus = (e) => {
  isFocused.value = true
  emit('focus', e)
}

const handleKeydown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    increase()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    decrease()
  } else if (e.key === 'Enter') {
    inputRef.value.blur()
  }
}

// 长按处理
const startPress = (type) => {
  if (!props.fastChange || props.disabled) return
  
  const action = type === 'increase' ? increase : decrease
  
  // 初始延迟
  pressTimer.value = setTimeout(() => {
    // 快速重复
    fastTimer.value = setInterval(action, 100)
  }, 500)
}

const stopPress = () => {
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
  if (fastTimer.value) {
    clearInterval(fastTimer.value)
    fastTimer.value = null
  }
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  const num = parseFloat(newVal)
  if (!isNaN(num)) {
    numericValue.value = constrainValue(num)
  }
}, { immediate: true })

// 清理定时器
const cleanup = () => {
  stopPress()
}

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select()
})
</script>

<style lang="scss" scoped>
.system-number-input {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .number-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    background: var(--el-bg-color);
    transition: all 0.3s ease;
    overflow: hidden;

    &:hover {
      border-color: var(--el-color-primary-light-7);
    }

    &:focus-within {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
    }

    .number-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--el-fill-color-light);
      color: var(--el-text-color-regular);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
      user-select: none;

      &:hover:not(.is-disabled) {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &:active:not(.is-disabled) {
        background: var(--el-color-primary-light-8);
        transform: scale(0.95);
      }

      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.5;
        background: var(--el-fill-color-lighter);
      }

      .el-icon {
        font-size: 14px;
      }
    }

    &.has-controls {
      .decrease-btn {
        border-right: 1px solid var(--el-border-color-lighter);
      }

      .increase-btn {
        border-left: 1px solid var(--el-border-color-lighter);
      }
    }

    &:not(.has-controls) {
      .number-input {
        :deep(.el-input__wrapper) {
          border-radius: 6px;
        }
      }
    }

    .number-input {
      flex: 1;
      border: none;
      
      :deep(.el-input__wrapper) {
        border: none;
        box-shadow: none;
        padding: 0 12px;
        background: transparent;

        .el-input__inner {
          text-align: left;
          font-weight: 500;
          color: var(--el-text-color-primary);

          &::placeholder {
            color: var(--el-text-color-placeholder);
            font-weight: normal;
          }
        }

        &.text-center .el-input__inner {
          text-align: center;
        }

        &.text-right .el-input__inner {
          text-align: right;
        }
      }
    }
  }

  .number-unit {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
    user-select: none;
  }
}

// 不同尺寸的样式
.system-number-input {
  &.size-large {
    .number-input-wrapper {
      .number-btn {
        width: 36px;
        height: 36px;
      }
      
      .number-input {
        :deep(.el-input__wrapper) {
          padding: 0 16px;
          font-size: 16px;
        }
      }
    }
    
    .number-unit {
      font-size: 14px;
    }
  }

  &.size-small {
    .number-input-wrapper {
      .number-btn {
        width: 28px;
        height: 28px;

        .el-icon {
          font-size: 12px;
        }
      }
      
      .number-input {
        :deep(.el-input__wrapper) {
          padding: 0 8px;
          font-size: 13px;
        }
      }
    }
    
    .number-unit {
      font-size: 12px;
    }
  }
}

// 错误状态样式
.system-number-input {
  &.is-error {
    .number-input-wrapper {
      border-color: var(--el-color-danger);
      
      &:focus-within {
        border-color: var(--el-color-danger);
        box-shadow: 0 0 0 2px var(--el-color-danger-light-8);
      }
    }
  }
}

// 成功状态样式
.system-number-input {
  &.is-success {
    .number-input-wrapper {
      border-color: var(--el-color-success);
      
      &:focus-within {
        border-color: var(--el-color-success);
        box-shadow: 0 0 0 2px var(--el-color-success-light-8);
      }
    }
  }
}

// 动画效果
@keyframes buttonPress {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.number-btn:active:not(.is-disabled) {
  animation: buttonPress 0.1s ease;
}
</style>