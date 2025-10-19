/**
 * useDialog - 对话框管理composable（函数式封装）
 *
 * 功能：
 * 1. 对话框显示/隐藏
 * 2. 对话框数据管理
 * 3. 对话框操作封装
 * 4. 多种对话框模式
 *
 * @example
 * const { visible, open, close, dialogData } = useDialog()
 *
 * const handleEdit = (row) => {
 *   open(row)
 * }
 */

import { ref, computed } from 'vue'

/**
 * 基础对话框Hook
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.onOpen - 打开时的回调
 * @param {Function} options.onClose - 关闭时的回调
 * @returns {Object}
 */
export function useDialog(options = {}) {
  const { onOpen = null, onClose = null } = options

  const visible = ref(false)
  const dialogData = ref(null)

  /**
   * 打开对话框
   */
  const open = (data = null) => {
    dialogData.value = data
    visible.value = true

    if (onOpen && typeof onOpen === 'function') {
      onOpen(data)
    }
  }

  /**
   * 关闭对话框
   */
  const close = () => {
    visible.value = false

    if (onClose && typeof onClose === 'function') {
      onClose(dialogData.value)
    }

    // 延迟清空数据，避免关闭动画时数据闪烁
    setTimeout(() => {
      dialogData.value = null
    }, 300)
  }

  /**
   * 切换对话框状态
   */
  const toggle = () => {
    if (visible.value) {
      close()
    } else {
      open()
    }
  }

  return {
    visible,
    dialogData,
    open,
    close,
    toggle,
  }
}

/**
 * 表单对话框Hook
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.onSubmit - 提交函数
 * @param {Function} options.onSuccess - 成功回调
 * @returns {Object}
 */
export function useFormDialog(options = {}) {
  const { onSubmit, onSuccess = null } = options

  const dialog = useDialog()
  const loading = ref(false)
  const mode = ref('create') // 'create' | 'edit' | 'view'

  const isCreate = computed(() => mode.value === 'create')
  const isEdit = computed(() => mode.value === 'edit')
  const isView = computed(() => mode.value === 'view')

  const dialogTitle = computed(() => {
    const titles = {
      create: '新增',
      edit: '编辑',
      view: '查看',
    }
    return titles[mode.value] || '对话框'
  })

  /**
   * 打开创建对话框
   */
  const openCreate = () => {
    mode.value = 'create'
    dialog.open(null)
  }

  /**
   * 打开编辑对话框
   */
  const openEdit = (data) => {
    mode.value = 'edit'
    dialog.open(data)
  }

  /**
   * 打开查看对话框
   */
  const openView = (data) => {
    mode.value = 'view'
    dialog.open(data)
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (formData) => {
    if (!onSubmit) {
      dialog.close()
      return
    }

    loading.value = true

    try {
      const result = await onSubmit(formData, mode.value, dialog.dialogData)

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result, mode.value)
      }

      dialog.close()
      return result
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    ...dialog,
    loading,
    mode,
    isCreate,
    isEdit,
    isView,
    dialogTitle,
    openCreate,
    openEdit,
    openView,
    handleSubmit,
  }
}

/**
 * 详情对话框Hook
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.fetchDetail - 获取详情函数
 * @returns {Object}
 */
export function useDetailDialog(options = {}) {
  const { fetchDetail } = options

  const dialog = useDialog()
  const detail = ref(null)
  const loading = ref(false)

  /**
   * 打开详情对话框
   */
  const openDetail = async (id) => {
    dialog.open({ id })
    detail.value = null

    if (!fetchDetail) {
      return
    }

    loading.value = true

    try {
      const data = await fetchDetail(id)
      detail.value = data
      return data
    } catch (error) {
      console.error('获取详情失败:', error)
      dialog.close()
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 关闭详情对话框
   */
  const closeDetail = () => {
    dialog.close()
    setTimeout(() => {
      detail.value = null
    }, 300)
  }

  return {
    ...dialog,
    detail,
    loading,
    openDetail,
    closeDetail,
  }
}

/**
 * 确认对话框Hook（基于ElMessageBox的状态管理）
 *
 * @returns {Object}
 */
export function useConfirmDialog() {
  const pending = ref(false)
  const lastAction = ref(null)

  /**
   * 执行确认操作
   */
  const confirm = async (action, confirmFn, options = {}) => {
    pending.value = true
    lastAction.value = action

    try {
      const confirmed = await confirmFn()
      if (confirmed) {
        return true
      }
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    lastAction,
    confirm,
  }
}

/**
 * 多步骤对话框Hook
 *
 * @param {number} totalSteps - 总步骤数
 * @returns {Object}
 */
export function useStepDialog(totalSteps = 3) {
  const dialog = useDialog()
  const currentStep = ref(1)

  const isFirstStep = computed(() => currentStep.value === 1)
  const isLastStep = computed(() => currentStep.value === totalSteps)

  const progress = computed(() => {
    return ((currentStep.value - 1) / (totalSteps - 1)) * 100
  })

  /**
   * 下一步
   */
  const nextStep = () => {
    if (currentStep.value < totalSteps) {
      currentStep.value++
    }
  }

  /**
   * 上一步
   */
  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  /**
   * 跳转到指定步骤
   */
  const goToStep = (step) => {
    if (step >= 1 && step <= totalSteps) {
      currentStep.value = step
    }
  }

  /**
   * 重置步骤
   */
  const resetSteps = () => {
    currentStep.value = 1
  }

  /**
   * 打开对话框（重置步骤）
   */
  const openWithSteps = (data = null) => {
    resetSteps()
    dialog.open(data)
  }

  return {
    ...dialog,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    goToStep,
    resetSteps,
    open: openWithSteps,
  }
}

/**
 * 抽屉对话框Hook
 *
 * @param {Object} options - 配置选项
 * @param {string} options.direction - 抽屉方向 'rtl' | 'ltr' | 'ttb' | 'btt'
 * @returns {Object}
 */
export function useDrawer(options = {}) {
  const { direction = 'rtl', ...restOptions } = options

  const drawer = useDialog(restOptions)
  const drawerDirection = ref(direction)

  return {
    ...drawer,
    direction: drawerDirection,
  }
}
