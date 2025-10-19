/**
 * useForm - 表单处理composable（函数式封装）
 *
 * 功能：
 * 1. 表单状态管理
 * 2. 表单验证
 * 3. 提交处理
 * 4. 重置功能
 *
 * @example
 * const { formData, formRef, loading, handleSubmit, resetForm } = useForm({
 *   initialData: { username: '', email: '' },
 *   onSubmit: createUser,
 *   onSuccess: () => { ... },
 * })
 */

import { ref, reactive, unref, nextTick } from 'vue'
import { showSuccess, showError } from '@/utils/message'

/**
 * 表单Hook
 *
 * @param {Object} options - 配置选项
 * @param {Object} options.initialData - 初始表单数据
 * @param {Function} options.onSubmit - 提交函数
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {boolean} options.showSuccessMsg - 是否显示成功消息
 * @param {string} options.successMsg - 成功消息文本
 * @param {boolean} options.resetAfterSubmit - 提交成功后是否重置表单
 * @returns {Object}
 */
export function useForm(options = {}) {
  const {
    initialData = {},
    onSubmit,
    onSuccess = null,
    onError = null,
    showSuccessMsg = true,
    successMsg = '操作成功',
    resetAfterSubmit = false,
  } = options

  const formRef = ref(null)
  const formData = reactive({ ...initialData })
  const loading = ref(false)
  const errors = ref({})

  /**
   * 验证表单
   */
  const validate = async () => {
    if (!formRef.value) {
      return true
    }

    try {
      await formRef.value.validate()
      errors.value = {}
      return true
    } catch (error) {
      // Element Plus 验证失败会抛出错误
      if (error && typeof error === 'object') {
        errors.value = error
      }
      return false
    }
  }

  /**
   * 验证指定字段
   */
  const validateField = async (field) => {
    if (!formRef.value) {
      return true
    }

    try {
      await formRef.value.validateField(field)
      if (errors.value[field]) {
        delete errors.value[field]
      }
      return true
    } catch (error) {
      errors.value[field] = error
      return false
    }
  }

  /**
   * 清除验证
   */
  const clearValidate = (fields = null) => {
    if (!formRef.value) {
      return
    }

    formRef.value.clearValidate(fields)

    if (fields) {
      const fieldArray = Array.isArray(fields) ? fields : [fields]
      fieldArray.forEach(field => {
        if (errors.value[field]) {
          delete errors.value[field]
        }
      })
    } else {
      errors.value = {}
    }
  }

  /**
   * 重置表单
   */
  const resetForm = () => {
    if (formRef.value) {
      formRef.value.resetFields()
    }

    // 重置为初始数据
    Object.keys(formData).forEach(key => {
      delete formData[key]
    })
    Object.assign(formData, { ...initialData })

    errors.value = {}
  }

  /**
   * 设置表单数据
   */
  const setFormData = (data) => {
    Object.keys(formData).forEach(key => {
      delete formData[key]
    })
    Object.assign(formData, data)
  }

  /**
   * 更新表单字段
   */
  const updateField = (field, value) => {
    formData[field] = value
  }

  /**
   * 批量更新表单字段
   */
  const updateFields = (fields) => {
    Object.assign(formData, fields)
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (customData = null) => {
    // 验证表单
    const isValid = await validate()
    if (!isValid) {
      showError('请检查表单填写是否正确')
      return false
    }

    loading.value = true

    try {
      const submitData = customData || unref(formData)
      const result = await onSubmit(submitData)

      // 成功提示
      if (showSuccessMsg) {
        showSuccess(successMsg)
      }

      // 成功回调
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result)
      }

      // 重置表单
      if (resetAfterSubmit) {
        await nextTick()
        resetForm()
      }

      return result
    } catch (error) {
      // 错误提示
      const message = error?.response?.data?.message || error?.message || '操作失败'
      showError(message)

      // 错误回调
      if (onError && typeof onError === 'function') {
        onError(error)
      }

      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取表单数据（去除响应式）
   */
  const getFormData = () => {
    return JSON.parse(JSON.stringify(formData))
  }

  /**
   * 检查表单是否有变化
   */
  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialData)
  }

  return {
    formRef,
    formData,
    loading,
    errors,
    validate,
    validateField,
    clearValidate,
    resetForm,
    setFormData,
    updateField,
    updateFields,
    handleSubmit,
    getFormData,
    hasChanges,
  }
}

/**
 * 编辑表单Hook（带加载详情功能）
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.fetchDetail - 获取详情的函数
 * @param {Function} options.onSubmit - 提交函数
 * @param {Object} options.initialData - 初始数据
 * @returns {Object}
 */
export function useEditForm(options = {}) {
  const { fetchDetail, onSubmit, initialData = {}, ...restOptions } = options

  const formHook = useForm({
    initialData,
    onSubmit,
    ...restOptions,
  })

  const loadingDetail = ref(false)

  /**
   * 加载详情
   */
  const loadDetail = async (id) => {
    if (!id || !fetchDetail) {
      return
    }

    loadingDetail.value = true

    try {
      const detail = await fetchDetail(id)
      formHook.setFormData(detail)
      return detail
    } catch (error) {
      showError(error?.response?.data?.message || '加载详情失败')
      throw error
    } finally {
      loadingDetail.value = false
    }
  }

  return {
    ...formHook,
    loadingDetail,
    loadDetail,
  }
}

/**
 * 搜索表单Hook
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.onSearch - 搜索函数
 * @param {Object} options.initialData - 初始搜索条件
 * @returns {Object}
 */
export function useSearchForm(options = {}) {
  const { onSearch, initialData = {}, ...restOptions } = options

  const searchData = reactive({ ...initialData })
  const searching = ref(false)

  /**
   * 搜索
   */
  const handleSearch = async () => {
    searching.value = true

    try {
      const result = await onSearch(searchData)
      return result
    } catch (error) {
      showError(error?.response?.data?.message || '搜索失败')
      throw error
    } finally {
      searching.value = false
    }
  }

  /**
   * 重置搜索
   */
  const resetSearch = () => {
    Object.keys(searchData).forEach(key => {
      delete searchData[key]
    })
    Object.assign(searchData, { ...initialData })
  }

  /**
   * 更新搜索条件
   */
  const updateSearch = (field, value) => {
    searchData[field] = value
  }

  return {
    searchData,
    searching,
    handleSearch,
    resetSearch,
    updateSearch,
  }
}
