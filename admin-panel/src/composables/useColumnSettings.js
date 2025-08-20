import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 列设置通用 Composable
 * @param {string} pageKey - 页面标识符，用于localStorage键名
 * @param {Array} defaultVisibleColumns - 默认可见列
 * @param {Array} defaultColumnOptions - 默认列选项配置
 * @returns {Object} 列设置相关的响应式数据和方法
 */
export function useColumnSettings(pageKey, defaultVisibleColumns = [], defaultColumnOptions = []) {
  // localStorage 键名
  const VISIBLE_COLUMNS_KEY = `${pageKey}TableColumns`
  const COLUMN_OPTIONS_KEY = `${pageKey}TableColumnOptions`

  // 从localStorage读取或使用默认值
  const getInitialVisibleColumns = () => {
    const saved = localStorage.getItem(VISIBLE_COLUMNS_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(`Failed to parse saved columns for ${pageKey}:`, e)
      }
    }
    return [...defaultVisibleColumns]
  }

  const getInitialColumnOptions = () => {
    const saved = localStorage.getItem(COLUMN_OPTIONS_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(`Failed to parse saved column options for ${pageKey}:`, e)
      }
    }
    return JSON.parse(JSON.stringify(defaultColumnOptions))
  }

  // 响应式数据
  const visibleColumns = ref(getInitialVisibleColumns())
  const columnOptions = ref(getInitialColumnOptions())
  const tempVisibleColumns = ref([...visibleColumns.value])
  const tempColumnOptions = ref(JSON.parse(JSON.stringify(columnOptions.value)))
  const showColumnSettings = ref(false)
  const draggedIndex = ref(null)

  // 计算属性：过滤后的表格列配置
  const filteredColumns = computed(() => {
    if (!columnOptions.value || !visibleColumns.value) return []
    
    const columnsMap = {}
    // 这里需要外部传入所有列配置映射
    return columnOptions.value
      .filter(opt => visibleColumns.value.includes(opt.value))
      .map(opt => columnsMap[opt.value])
      .filter(Boolean)
  })

  // 列设置对话框打开
  const handleColumnSettingsOpen = () => {
    tempVisibleColumns.value = [...visibleColumns.value]
    tempColumnOptions.value = JSON.parse(JSON.stringify(columnOptions.value))
  }

  // 列设置对话框关闭
  const handleColumnSettingsClose = () => {
    showColumnSettings.value = false
    // 重置临时变量
    tempVisibleColumns.value = [...visibleColumns.value]
    tempColumnOptions.value = JSON.parse(JSON.stringify(columnOptions.value))
  }

  // 应用列设置
  const applyColumnSettings = (onApply) => {
    // 更新实际的列设置
    visibleColumns.value = [...tempVisibleColumns.value]
    columnOptions.value = JSON.parse(JSON.stringify(tempColumnOptions.value))

    // 保存到localStorage
    localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumns.value))
    localStorage.setItem(COLUMN_OPTIONS_KEY, JSON.stringify(columnOptions.value))

    // 关闭对话框
    showColumnSettings.value = false

    // 执行回调（如刷新表格）
    if (typeof onApply === 'function') {
      nextTick(() => {
        onApply()
      })
    }

    ElMessage.success('列设置已应用')
  }

  // 处理组件事件的应用设置
  const handleApplyFromComponent = (data) => {
    tempVisibleColumns.value = [...data.visibleColumns]
    tempColumnOptions.value = JSON.parse(JSON.stringify(data.columnOptions))
    applyColumnSettings()
  }

  // 重置列设置
  const resetColumnSettings = () => {
    tempColumnOptions.value = JSON.parse(JSON.stringify(defaultColumnOptions))
    tempVisibleColumns.value = [...defaultVisibleColumns]
    ElMessage.success('已重置为默认设置')
  }

  // 拖拽开始
  const handleDragStart = (index) => {
    draggedIndex.value = index
  }

  // 拖拽经过
  const handleDragOver = (index) => {
    // 防止默认行为
  }

  // 拖拽放下
  const handleDrop = (targetIndex) => {
    if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
    
    const draggedItem = tempColumnOptions.value[draggedIndex.value]
    
    // 移除拖拽的元素
    tempColumnOptions.value.splice(draggedIndex.value, 1)
    
    // 在目标位置插入
    if (draggedIndex.value < targetIndex) {
      tempColumnOptions.value.splice(targetIndex - 1, 0, draggedItem)
    } else {
      tempColumnOptions.value.splice(targetIndex, 0, draggedItem)
    }
    
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
    
    // 创建新数组避免响应性问题
    const newOptions = [...tempColumnOptions.value]
    const temp = newOptions[index]
    newOptions[index] = newOptions[newIndex]
    newOptions[newIndex] = temp
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
    filteredColumns,

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
    handleDragOver,
    handleDrop,
    handleDragEnd
  }
}
