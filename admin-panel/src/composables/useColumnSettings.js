import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useLocalStorage, deepClone } from './useLocalStorage'

/**
 * 列设置通用 Composable
 * @param {string} pageKey - 页面标识符,用于localStorage键名
 * @param {Array} defaultVisibleColumns - 默认可见列
 * @param {Array} defaultColumnOptions - 默认列选项配置
 * @returns {Object} 列设置相关的响应式数据和方法
 */
export function useColumnSettings(pageKey, defaultVisibleColumns = [], defaultColumnOptions = []) {
  // 使用统一的 localStorage composable
  const { value: visibleColumns } = useLocalStorage(
    `${pageKey}TableColumns`,
    [...defaultVisibleColumns]
  )
  const { value: columnOptions } = useLocalStorage(
    `${pageKey}TableColumnOptions`,
    deepClone(defaultColumnOptions)
  )

  // 临时编辑数据
  const tempVisibleColumns = ref([...visibleColumns.value])
  const tempColumnOptions = ref(deepClone(columnOptions.value))
  const showColumnSettings = ref(false)
  const draggedIndex = ref(null)

  // 列设置对话框打开
  const handleColumnSettingsOpen = () => {
    tempVisibleColumns.value = [...visibleColumns.value]
    tempColumnOptions.value = deepClone(columnOptions.value)
  }

  // 列设置对话框关闭
  const handleColumnSettingsClose = () => {
    showColumnSettings.value = false
    tempVisibleColumns.value = [...visibleColumns.value]
    tempColumnOptions.value = deepClone(columnOptions.value)
  }

  // 应用列设置
  const applyColumnSettings = (onApply) => {
    visibleColumns.value = [...tempVisibleColumns.value]
    columnOptions.value = deepClone(tempColumnOptions.value)
    showColumnSettings.value = false

    if (typeof onApply === 'function') {
      nextTick(() => onApply())
    }

    ElMessage.success('列设置已应用')
  }

  // 处理组件事件的应用设置
  const handleApplyFromComponent = (data) => {
    tempVisibleColumns.value = [...data.visibleColumns]
    tempColumnOptions.value = deepClone(data.columnOptions)
    applyColumnSettings()
  }

  // 重置列设置
  const resetColumnSettings = () => {
    tempColumnOptions.value = deepClone(defaultColumnOptions)
    tempVisibleColumns.value = [...defaultVisibleColumns]
    ElMessage.success('已重置为默认设置')
  }

  // 拖拽开始
  const handleDragStart = (index) => {
    draggedIndex.value = index
  }

  // 拖拽放下
  const handleDrop = (targetIndex) => {
    if (draggedIndex.value === null || draggedIndex.value === targetIndex) return

    const draggedItem = tempColumnOptions.value[draggedIndex.value]
    tempColumnOptions.value.splice(draggedIndex.value, 1)

    const insertIndex = draggedIndex.value < targetIndex ? targetIndex - 1 : targetIndex
    tempColumnOptions.value.splice(insertIndex, 0, draggedItem)

    draggedIndex.value = null
  }

  // 拖拽结束
  const handleDragEnd = () => {
    draggedIndex.value = null
  }

  // 移动列（上下按钮）
  const moveColumn = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= tempColumnOptions.value.length) return

    const newOptions = [...tempColumnOptions.value]
    ;[newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]]
    tempColumnOptions.value = newOptions
  }

  // 打开列设置对话框
  const openColumnSettings = () => {
    handleColumnSettingsOpen()
    showColumnSettings.value = true
  }

  return {
    // 响应式数据
    visibleColumns,
    columnOptions,
    tempVisibleColumns,
    tempColumnOptions,
    showColumnSettings,
    draggedIndex,

    // 方法
    handleColumnSettingsOpen,
    handleColumnSettingsClose,
    applyColumnSettings,
    handleApplyFromComponent,
    resetColumnSettings,
    moveColumn,
    openColumnSettings,

    // 拖拽相关方法
    handleDragStart,
    handleDragOver: () => {}, // 保留接口兼容性
    handleDrop,
    handleDragEnd
  }
}
