<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :top="top"
    :modal="modal"
    :modal-class="modalClass"
    :append-to-body="appendToBody"
    :lock-scroll="lockScroll"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :before-close="handleBeforeClose"
    :center="center"
    :align-center="alignCenter"
    :destroy-on-close="destroyOnClose"
    class="confirm-dialog"
    :class="[`confirm-dialog--${type}`, { 'confirm-dialog--loading': loading }]"
  >
    <!-- 内容区域 -->
    <div class="confirm-content">
      <!-- 图标 -->
      <div class="confirm-icon" :class="`confirm-icon--${type}`">
        <el-icon :size="iconSize">
          <component :is="computedIcon" />
        </el-icon>
      </div>

      <!-- 文本内容 -->
      <div class="confirm-text">
        <!-- 主要消息 -->
        <div class="confirm-message">{{ message }}</div>

        <!-- 详细描述 -->
        <div v-if="description" class="confirm-description">{{ description }}</div>

        <!-- 自定义内容插槽 -->
        <div v-if="$slots.default" class="confirm-custom">
          <slot />
        </div>

        <!-- 输入框（用于二次确认） -->
        <div v-if="showInput" class="confirm-input">
          <el-input
            v-model="inputValue"
            :placeholder="inputPlaceholder"
            :type="inputType"
            :validate-event="false"
            @keyup.enter="handleConfirm"
          />
          <div v-if="inputError" class="input-error">{{ inputError }}</div>
        </div>

        <!-- 风险提示 -->
        <div v-if="dangerText" class="confirm-danger">
          <el-icon><Warning /></el-icon>
          <span>{{ dangerText }}</span>
        </div>

        <!-- 额外信息 -->
        <div v-if="extraInfo" class="confirm-extra">{{ extraInfo }}</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="confirm-footer">
        <!-- 自定义按钮 -->
        <slot name="footer" :confirm="handleConfirm" :cancel="handleCancel">
          <el-button @click="handleCancel" :size="buttonSize" :disabled="loading">
            {{ cancelText }}
          </el-button>

          <el-button
            :type="confirmButtonType"
            @click="handleConfirm"
            :loading="loading"
            :size="buttonSize"
            :disabled="confirmDisabled"
          >
            {{ confirmText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

// Props 定义
const props = defineProps({
  // 显示控制
  modelValue: {
    type: Boolean,
    default: false
  },

  // 对话框配置
  title: {
    type: String,
    default: '确认操作'
  },
  width: {
    type: [String, Number],
    default: '400px'
  },
  top: {
    type: String,
    default: '15vh'
  },
  modal: {
    type: Boolean,
    default: true
  },
  modalClass: String,
  appendToBody: {
    type: Boolean,
    default: false
  },
  lockScroll: {
    type: Boolean,
    default: true
  },
  closeOnClickModal: {
    type: Boolean,
    default: false
  },
  closeOnPressEscape: {
    type: Boolean,
    default: true
  },
  showClose: {
    type: Boolean,
    default: true
  },
  center: {
    type: Boolean,
    default: false
  },
  alignCenter: {
    type: Boolean,
    default: true
  },
  destroyOnClose: {
    type: Boolean,
    default: false
  },

  // 内容配置
  type: {
    type: String,
    default: 'warning',
    validator: value => ['info', 'success', 'warning', 'error'].includes(value)
  },
  message: {
    type: String,
    required: true
  },
  description: String,
  dangerText: String,
  extraInfo: String,

  // 图标配置
  icon: String,
  iconSize: {
    type: Number,
    default: 48
  },

  // 按钮配置
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmButtonType: String, // 如果不提供则根据type自动确定
  buttonSize: {
    type: String,
    default: 'default'
  },

  // 输入确认
  showInput: {
    type: Boolean,
    default: false
  },
  inputPlaceholder: {
    type: String,
    default: '请输入'
  },
  inputType: {
    type: String,
    default: 'text'
  },
  inputRequired: {
    type: Boolean,
    default: false
  },
  inputValidator: Function,
  inputExpectedValue: String, // 期望的输入值（用于二次确认）

  // 状态
  loading: {
    type: Boolean,
    default: false
  },

  // 行为配置
  preventClose: {
    type: Boolean,
    default: false
  },
  autoClose: {
    type: Boolean,
    default: true
  },

  // 倒计时
  countdown: {
    type: Number,
    default: 0
  },
  countdownText: {
    type: String,
    default: '秒后自动关闭'
  }
})

// 事件定义
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close', 'open', 'opened', 'closed'])

// 响应式数据
const visible = ref(props.modelValue)
const inputValue = ref('')
const inputError = ref('')
const countdownTimer = ref(null)
const remainingTime = ref(0)

// 计算属性
const computedIcon = computed(() => {
  if (props.icon) return props.icon

  const iconMap = {
    info: 'InfoFilled',
    success: 'CircleCheckFilled',
    warning: 'WarningFilled',
    error: 'CircleCloseFilled'
  }

  return iconMap[props.type] || 'QuestionFilled'
})

const computedConfirmButtonType = computed(() => {
  if (props.confirmButtonType) return props.confirmButtonType

  const typeMap = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    error: 'danger'
  }

  return typeMap[props.type] || 'primary'
})

const confirmDisabled = computed(() => {
  if (props.loading) return true

  if (props.showInput) {
    if (props.inputRequired && !inputValue.value.trim()) return true
    if (props.inputExpectedValue && inputValue.value !== props.inputExpectedValue) return true
    if (inputError.value) return true
  }

  return false
})

// 方法
const validateInput = () => {
  inputError.value = ''

  if (props.inputRequired && !inputValue.value.trim()) {
    inputError.value = '此字段为必填项'
    return false
  }

  if (props.inputExpectedValue && inputValue.value !== props.inputExpectedValue) {
    inputError.value = '输入内容不匹配'
    return false
  }

  if (props.inputValidator) {
    const result = props.inputValidator(inputValue.value)
    if (typeof result === 'string') {
      inputError.value = result
      return false
    }
    if (result === false) {
      inputError.value = '输入内容无效'
      return false
    }
  }

  return true
}

const handleConfirm = async () => {
  if (props.showInput && !validateInput()) {
    return
  }

  const data = props.showInput ? { inputValue: inputValue.value } : undefined

  try {
    await emit('confirm', data)

    if (props.autoClose && !props.preventClose) {
      handleClose()
    }
  } catch (error) {
    // 确认操作失败，不关闭对话框
    console.error('确认操作失败:', error)
  }
}

const handleCancel = () => {
  emit('cancel')

  if (!props.preventClose) {
    handleClose()
  }
}

const handleClose = () => {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

const handleBeforeClose = done => {
  if (props.preventClose) {
    return
  }

  done()
}

const startCountdown = () => {
  if (props.countdown <= 0) return

  remainingTime.value = props.countdown

  countdownTimer.value = setInterval(() => {
    remainingTime.value--

    if (remainingTime.value <= 0) {
      clearInterval(countdownTimer.value)
      handleClose()
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
}

// 公开方法
const open = () => {
  visible.value = true
}

const close = () => {
  handleClose()
}

const confirm = () => {
  handleConfirm()
}

const cancel = () => {
  handleCancel()
}

// 监听器
watch(
  () => props.modelValue,
  newValue => {
    visible.value = newValue

    if (newValue) {
      emit('open')
      nextTick(() => {
        emit('opened')
        if (props.countdown > 0) {
          startCountdown()
        }
      })
    } else {
      emit('closed')
      stopCountdown()
      // 重置输入
      inputValue.value = ''
      inputError.value = ''
    }
  }
)

watch(visible, newValue => {
  emit('update:modelValue', newValue)
})

watch(
  () => props.showInput,
  () => {
    inputValue.value = ''
    inputError.value = ''
  }
)

watch(inputValue, () => {
  inputError.value = ''
})

// 暴露方法
defineExpose({
  open,
  close,
  confirm,
  cancel
})
</script>

<style lang="scss" scoped>
.confirm-dialog {
  :deep(.el-dialog) {
    border-radius: 8px;

    .el-dialog__header {
      padding: 20px 20px 0;

      .el-dialog__title {
        font-weight: 600;
        font-size: 18px;
      }
    }

    .el-dialog__body {
      padding: 20px;
    }

    .el-dialog__footer {
      padding: 0 20px 20px;
    }
  }

  &--loading {
    :deep(.el-dialog) {
      pointer-events: none;
    }
  }

  .confirm-content {
    display: flex;
    gap: 16px;
    align-items: flex-start;

    .confirm-icon {
      flex-shrink: 0;

      &--info {
        color: var(--el-color-primary);
      }

      &--success {
        color: var(--el-color-success);
      }

      &--warning {
        color: var(--el-color-warning);
      }

      &--error {
        color: var(--el-color-danger);
      }
    }

    .confirm-text {
      flex: 1;
      min-width: 0;

      .confirm-message {
        font-size: 16px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        line-height: 1.5;
        margin-bottom: 8px;
      }

      .confirm-description {
        font-size: 14px;
        color: var(--el-text-color-regular);
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .confirm-custom {
        margin: 12px 0;
      }

      .confirm-input {
        margin: 16px 0;

        .input-error {
          color: var(--el-color-danger);
          font-size: 12px;
          margin-top: 4px;
        }
      }

      .confirm-danger {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--el-color-danger-light-9);
        border: 1px solid var(--el-color-danger-light-7);
        border-radius: 6px;
        color: var(--el-color-danger);
        font-size: 14px;
        margin: 12px 0;

        .el-icon {
          font-size: 16px;
        }
      }

      .confirm-extra {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--el-border-color-lighter);
      }
    }
  }

  .confirm-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 不同类型的样式变体
.confirm-dialog--info {
  :deep(.el-dialog__header) {
    border-bottom: 3px solid var(--el-color-primary);
  }
}

.confirm-dialog--success {
  :deep(.el-dialog__header) {
    border-bottom: 3px solid var(--el-color-success);
  }
}

.confirm-dialog--warning {
  :deep(.el-dialog__header) {
    border-bottom: 3px solid var(--el-color-warning);
  }
}

.confirm-dialog--error {
  :deep(.el-dialog__header) {
    border-bottom: 3px solid var(--el-color-danger);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .confirm-dialog {
    :deep(.el-dialog) {
      width: 90% !important;
      margin: 5vh auto;

      .el-dialog__body {
        padding: 16px;
      }
    }

    .confirm-content {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;

      .confirm-text {
        .confirm-message {
          font-size: 15px;
        }

        .confirm-description {
          font-size: 13px;
        }
      }
    }

    .confirm-footer {
      flex-direction: column-reverse;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
