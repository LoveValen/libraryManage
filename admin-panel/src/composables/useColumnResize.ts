import { ref, reactive, nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface ColumnResizeOptions {
  minWidth?: number
  maxWidth?: number
  onResize?: (columnKey: string, width: number) => void
  onResizeEnd?: (columnWidths: Record<string, number>) => void
}

export interface ColumnResizeState {
  isDragging: boolean
  dragColumnKey: string | null
  dragStartX: number
  dragStartWidth: number
  columnWidths: Record<string, number>
  selectedColumns: Set<string>
  isMultiSelectMode: boolean
  debugMode: boolean
}

export function useColumnResize(options: ColumnResizeOptions = {}) {
  const {
    minWidth = 80,
    maxWidth = 600,
    onResize,
    onResizeEnd
  } = options

  // 状态管理
  const state = reactive<ColumnResizeState>({
    isDragging: false,
    dragColumnKey: null,
    dragStartX: 0,
    dragStartWidth: 0,
    columnWidths: {},
    selectedColumns: new Set(),
    isMultiSelectMode: false,
    debugMode: false
  })

  // 拖拽相关的引用
  const resizeLineRef = ref<HTMLElement | null>(null)
  const tableContainerRef = ref<HTMLElement | null>(null)

  // 日志输出（调试用）
  const log = (message: string, ...args: any[]) => {
    if (state.debugMode) {
      console.log(`[ColumnResize] ${message}`, ...args)
    }
  }

  // 初始化列宽
  const initializeColumnWidths = (columns: any[], containerWidth: number) => {
    log('初始化列宽', { columns, containerWidth })
    
    const flexColumns: string[] = []
    let fixedTotalWidth = 0
    
    columns.forEach(col => {
      const key = col.key || col.dataKey
      if (col.width) {
        state.columnWidths[key] = col.width
        fixedTotalWidth += col.width
      } else {
        flexColumns.push(key)
      }
    })
    
    // 为弹性列分配剩余宽度
    if (flexColumns.length > 0) {
      const remainingWidth = Math.max(0, containerWidth - fixedTotalWidth)
      const flexWidth = Math.max(minWidth, remainingWidth / flexColumns.length)
      flexColumns.forEach(key => {
        state.columnWidths[key] = flexWidth
      })
    }
    
    log('列宽初始化完成', state.columnWidths)
    return state.columnWidths
  }

  // 开始拖拽
  const startResize = (e: MouseEvent, columnKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    log('开始拖拽', { columnKey, clientX: e.clientX })
    
    state.isDragging = true
    state.dragColumnKey = columnKey
    state.dragStartX = e.clientX
    state.dragStartWidth = state.columnWidths[columnKey] || minWidth
    
    // 添加全局拖拽样式
    document.body.classList.add('column-resizing')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    // 显示拖拽线
    showResizeLine(e.clientX)
    
    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove, true)
    document.addEventListener('mouseup', handleMouseUp, true)
  }

  // 处理拖拽移动
  const handleMouseMove = (e: MouseEvent) => {
    if (!state.isDragging || !state.dragColumnKey) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const deltaX = e.clientX - state.dragStartX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, state.dragStartWidth + deltaX))
    
    log('拖拽中', { 
      columnKey: state.dragColumnKey, 
      deltaX, 
      newWidth,
      isMultiSelect: state.isMultiSelectMode 
    })
    
    if (state.isMultiSelectMode && state.selectedColumns.has(state.dragColumnKey)) {
      // 多列同时调整
      const ratio = newWidth / state.dragStartWidth
      state.selectedColumns.forEach(key => {
        const originalWidth = state.columnWidths[key] || minWidth
        state.columnWidths[key] = Math.max(minWidth, Math.min(maxWidth, originalWidth * ratio))
      })
    } else {
      // 单列调整
      state.columnWidths[state.dragColumnKey] = newWidth
    }
    
    // 更新拖拽线位置
    updateResizeLine(e.clientX)
    
    // 触发回调
    if (onResize) {
      onResize(state.dragColumnKey, newWidth)
    }
  }

  // 结束拖拽
  const handleMouseUp = (e: MouseEvent) => {
    if (!state.isDragging) return
    
    e.preventDefault()
    e.stopPropagation()
    
    log('结束拖拽', { 
      columnKey: state.dragColumnKey,
      finalWidths: { ...state.columnWidths }
    })
    
    // 清理状态
    state.isDragging = false
    state.dragColumnKey = null
    
    // 恢复样式
    document.body.classList.remove('column-resizing')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // 隐藏拖拽线
    hideResizeLine()
    
    // 移除事件监听
    document.removeEventListener('mousemove', handleMouseMove, true)
    document.removeEventListener('mouseup', handleMouseUp, true)
    
    // 触发回调
    if (onResizeEnd) {
      onResizeEnd({ ...state.columnWidths })
    }
  }

  // 显示拖拽线
  const showResizeLine = (x: number) => {
    if (!resizeLineRef.value) {
      resizeLineRef.value = document.createElement('div')
      resizeLineRef.value.className = 'column-resize-line'
      resizeLineRef.value.style.cssText = `
        position: fixed;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: var(--el-color-primary);
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 0 4px rgba(64, 158, 255, 0.5);
      `
      document.body.appendChild(resizeLineRef.value)
    }
    resizeLineRef.value.style.left = `${x}px`
    resizeLineRef.value.style.display = 'block'
  }

  // 更新拖拽线位置
  const updateResizeLine = (x: number) => {
    if (resizeLineRef.value) {
      resizeLineRef.value.style.left = `${x}px`
    }
  }

  // 隐藏拖拽线
  const hideResizeLine = () => {
    if (resizeLineRef.value) {
      resizeLineRef.value.style.display = 'none'
    }
  }

  // 双击自动调整列宽
  const autoResizeColumn = (columnKey: string, content: string[]) => {
    log('自动调整列宽', { columnKey, contentSamples: content.slice(0, 5) })
    
    // 创建临时元素测量文本宽度
    const measurer = document.createElement('div')
    measurer.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: nowrap;
      font-family: inherit;
      font-size: 14px;
      padding: 0 12px;
    `
    document.body.appendChild(measurer)
    
    let maxWidth = minWidth
    content.forEach(text => {
      measurer.textContent = text
      maxWidth = Math.max(maxWidth, measurer.offsetWidth + 24) // 加上padding
    })
    
    document.body.removeChild(measurer)
    
    const finalWidth = Math.min(maxWidth, maxWidth)
    state.columnWidths[columnKey] = finalWidth
    
    log('自动调整完成', { columnKey, finalWidth })
    
    if (onResize) {
      onResize(columnKey, finalWidth)
    }
    
    return finalWidth
  }

  // 重置所有列宽
  const resetColumnWidths = () => {
    log('重置所有列宽')
    state.columnWidths = {}
    state.selectedColumns.clear()
    state.isMultiSelectMode = false
    ElMessage.success('列宽已重置')
  }

  // 切换列选择
  const toggleColumnSelection = (columnKey: string, event?: MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Ctrl/Cmd + 点击：切换选择
      if (state.selectedColumns.has(columnKey)) {
        state.selectedColumns.delete(columnKey)
      } else {
        state.selectedColumns.add(columnKey)
      }
    } else if (event?.shiftKey && state.selectedColumns.size > 0) {
      // Shift + 点击：范围选择
      // 这里需要知道列的顺序，暂时跳过
      state.selectedColumns.clear()
      state.selectedColumns.add(columnKey)
    } else {
      // 普通点击：单选
      state.selectedColumns.clear()
      state.selectedColumns.add(columnKey)
    }
    
    state.isMultiSelectMode = state.selectedColumns.size > 1
    
    log('列选择状态', {
      selected: Array.from(state.selectedColumns),
      isMultiSelect: state.isMultiSelectMode
    })
  }

  // 获取列宽状态
  const getColumnWidths = () => ({ ...state.columnWidths })

  // 设置单个列宽
  const setColumnWidth = (columnKey: string, width: number) => {
    state.columnWidths[columnKey] = Math.max(minWidth, Math.min(maxWidth, width))
    if (onResize) {
      onResize(columnKey, state.columnWidths[columnKey])
    }
  }

  // 切换调试模式
  const toggleDebugMode = () => {
    state.debugMode = !state.debugMode
    ElMessage.info(`调试模式已${state.debugMode ? '开启' : '关闭'}`)
    
    if (state.debugMode) {
      console.log('[ColumnResize] 当前状态:', {
        columnWidths: state.columnWidths,
        selectedColumns: Array.from(state.selectedColumns),
        isMultiSelectMode: state.isMultiSelectMode
      })
    }
  }

  // 清理函数
  const cleanup = () => {
    if (resizeLineRef.value && resizeLineRef.value.parentNode) {
      resizeLineRef.value.parentNode.removeChild(resizeLineRef.value)
    }
    document.removeEventListener('mousemove', handleMouseMove, true)
    document.removeEventListener('mouseup', handleMouseUp, true)
  }

  return {
    state,
    initializeColumnWidths,
    startResize,
    autoResizeColumn,
    resetColumnWidths,
    toggleColumnSelection,
    getColumnWidths,
    setColumnWidth,
    toggleDebugMode,
    cleanup
  }
}