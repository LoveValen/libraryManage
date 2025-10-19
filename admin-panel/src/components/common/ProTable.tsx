import {
  defineComponent,
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref
} from 'vue'
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElButton,
  ElIcon,
  ElTable,
  ElTableColumn,
  ElTag,
  ElDivider,
  ElEmpty,
  ElPagination,
  ElAlert,
  ElMessage,
  ElCheckbox,
  // @ts-ignore element-plus v2 提供 TableV2 组件
  ElTableV2,
  type TableInstance
} from 'element-plus'
import {
  Search,
  Refresh,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '@/utils/date'
import type {
  ProTableColumn,
  ActionItem,
  BatchAction,
  PaginationConfig,
  SearchConfig,
  ToolBarConfig,
  RowSelectionConfig,
  RequestFunction,
  RequestParams,
  RequestResponse,
  ProTableInstance,
  ValueEnumItem,
  VirtualScrollConfig
} from './ProTable.types'

export interface ProTableProps<T = any> {
  request: RequestFunction<T>
  columns: ProTableColumn[]
  rowKey?: string | ((record: T) => string)
  pagination?: PaginationConfig | false
  search?: SearchConfig | false
  toolBar?: ToolBarConfig | false
  rowSelection?: RowSelectionConfig | false
  batchActions?: BatchAction[]
  actions?: ActionItem[]
  actionColumn?: {
    width?: number | string
    fixed?: 'left' | 'right' | boolean
    title?: string
  }
  stripe?: boolean
  border?: boolean
  height?: string | number
  maxHeight?: string | number
  showIndex?: boolean
  indexMethod?: (index: number) => number
  emptyText?: string
  labelWidth?: string
  defaultSearchCount?: number
  paginationLayout?: string
  autoRequest?: boolean
  params?: Record<string, any>
  // 虚拟滚动配置
  virtualScrollConfig?: VirtualScrollConfig
  // 启用列宽拖拽调整
  enableColumnResize?: boolean
  // 调试模式
  debugMode?: boolean
}

export interface ProTableEmits<T = any> {
  (e: 'load', response: RequestResponse<T>): void
  (e: 'requestError', error: Error): void
  (e: 'change', pagination: PaginationConfig, sorter: any, filter: any): void
  (e: 'row-click', record: T, index: number, event: Event): void
  (e: 'row-dblclick', record: T, index: number, event: Event): void
  (e: 'selection-change', selectedRowKeys: any[], selectedRows: T[]): void
  (e: 'create'): void
}

export default defineComponent({
  name: 'ProTable',
  props: {
    request: {
      type: Function as PropType<RequestFunction>,
      required: true
    },
    columns: {
      type: Array as PropType<ProTableColumn[]>,
      required: true
    },
    rowKey: {
      type: [String, Function] as PropType<string | ((record: any) => string)>,
      default: 'id'
    },
    pagination: {
      type: [Object, Boolean] as PropType<PaginationConfig | false>,
      default: () => ({
        current: 1,
        pageSize: 20,
        total: 0,
        pageSizes: [10, 20, 50, 100],
        showSizeChanger: true,
        showQuickJumper: true
      })
    },
    search: {
      type: [Object, Boolean] as PropType<SearchConfig | false>,
      default: true
    },
    toolBar: {
      type: [Object, Boolean] as PropType<ToolBarConfig | false>,
      default: true
    },
    rowSelection: {
      type: [Object, Boolean] as PropType<RowSelectionConfig | false>,
      default: false
    },
    batchActions: {
      type: Array as PropType<BatchAction[]>,
      default: () => []
    },
    actions: {
      type: Array as PropType<ActionItem[]>,
      default: () => []
    },
    actionColumn: {
      type: Object as PropType<{ width?: number | string; fixed?: 'left' | 'right' | boolean; title?: string }>,
      default: () => ({ width: 150, fixed: 'right' })
    },
    stripe: {
      type: Boolean,
      default: true
    },
    border: {
      type: Boolean,
      default: true
    },
    height: [String, Number] as PropType<string | number>,
    maxHeight: [String, Number] as PropType<string | number>,
    showIndex: {
      type: Boolean,
      default: false
    },
    indexMethod: Function as PropType<(index: number) => number>,
    emptyText: {
      type: String,
      default: '暂无数据'
    },
    labelWidth: {
      type: String,
      default: '80px'
    },
    defaultSearchCount: {
      type: Number,
      default: 3
    },
    paginationLayout: {
      type: String,
      default: 'total, sizes, prev, pager, next, jumper'
    },
    autoRequest: {
      type: Boolean,
      default: true
    },
    params: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    virtualScrollConfig: {
      type: Object as PropType<VirtualScrollConfig>,
      default: undefined
    },
    enableColumnResize: {
      type: Boolean,
      default: true
    },
    debugMode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'load',
    'requestError',
    'change',
    'row-click',
    'row-dblclick',
    'selection-change',
    'create'
  ] as const,
  setup(props: ProTableProps, { emit, slots, expose }: any) {
    const tableRef: Ref<TableInstance | undefined> = ref()
    const searchFormRef = ref()
    const loading = ref(false)
    const tableData = ref<any[]>([])
    const searchForm = reactive<Record<string, any>>({})
    const selectedRowKeys = ref<any[]>([])
    const selectedRows = ref<any[]>([])
    const searchExpanded = ref(false)
    const density = ref<'large' | 'default' | 'small'>('default')
    const debugModeLocal = ref(props.debugMode || false)

    // 分页状态
    const paginationState = reactive({
      current: 1,
      pageSize: 20,
      total: 0,
      pageSizes: [10, 20, 50, 100]
    })

    // 虚拟滚动配置与状态
    const virtualCfg = computed(() => ({
      virtualScroll: false,
      estimatedItemHeight: 50,
      overscan: 5,
      threshold: 100,
      ...(props.virtualScrollConfig || {})
    }))
    const useVirtual = computed(() => !!virtualCfg.value.virtualScroll && tableData.value.length >= (virtualCfg.value.threshold || 100))
    const v2Ref = ref<any>()
    const activeIndex = ref(0)
    const savedScrollTop = ref(0)

    // 计算属性
    const searchableColumns = computed(() => {
      const searchColumns = props.columns.filter(col => col.search !== false && col.hideInSearch !== true)
      if (!searchExpanded.value) {
        return searchColumns.slice(0, props.defaultSearchCount)
      }
      return searchColumns
    })

    const visibleColumns = computed(() => {
      return props.columns.filter(col => col.hideInTable !== true)
    })


    // 将 ProTableColumn 转换为 TableV2 所需列定义
    // 列宽计算辅助函数
    const parseWidth = (width: number | string | undefined, defaultWidth: number = 120): number => {
      if (typeof width === 'number') return width
      if (typeof width === 'string') {
        const parsed = parseInt(width, 10)
        return isNaN(parsed) ? defaultWidth : parsed
      }
      return defaultWidth
    }

    const v2Columns = computed(() => {
      return visibleColumns.value.map((col) => {
        const key = col.dataIndex || col.key

        // 列宽处理逻辑：
        // 1. 优先使用动态设置的列宽（拖拽后的宽度）
        // 2. 如果没有动态宽度，使用配置的 width
        // 3. 如果没有 width 但有 minWidth，使用 minWidth 作为初始宽度
        // 4. 如果都没有，则为 undefined，由动态计算分配
        let columnWidth: number | undefined = undefined

        // 首先检查是否有动态设置的列宽（拖拽后的宽度）
        if (columnWidths.value[key]) {
          columnWidth = columnWidths.value[key]
        } else if (col.width) {
          columnWidth = parseWidth(col.width, 120)
          // 初始化动态列宽，便于后续拖拽
          columnWidths.value[key] = columnWidth
        } else if (col.minWidth) {
          columnWidth = parseWidth(col.minWidth, 120)
          // 初始化动态列宽，便于后续拖拽
          columnWidths.value[key] = columnWidth
        }
        // 如果都没有设置，保持 undefined，让动态计算来分配

        return {
          key,
          dataKey: key,
          title: col.title,
          width: columnWidth,
          minWidth: col.minWidth ? parseWidth(col.minWidth, 80) : undefined,
          align: col.align || 'left',
          fixed: col.fixed === true ? 'left' : (col.fixed || undefined),
          class: [
            col.ellipsis !== false ? 'ellipsis-cell' : '',
            `text-${col.align || 'left'}` // 添加对齐样式类
          ].filter(Boolean).join(' '),
          cellRenderer: ({ rowData, rowIndex }: any) => {
            // 插槽优先
            if (col.slot && slots[col.slot]) {
              return slots[col.slot]({
                text: rowData[key],
                record: rowData,
                index: rowIndex,
                column: col
              })
            }
            // 自定义渲染
            if (col.render) {
              return col.render(rowData[key], rowData, rowIndex, col)
            }
            // 值类型渲染
            const value = rowData[key]
            const cellContent = (() => {
              switch (col.valueType) {
                case 'option':
                  return col.valueEnum ? (
                    <ElTag type={(getOptionType(value, col.valueEnum) as any) || undefined}>
                      {getOptionText(value, col.valueEnum)}
                    </ElTag>
                  ) : value
                case 'date':
                  return formatDate(value)
                case 'dateTime':
                  return formatDateTime(value)
                case 'money':
                  return `¥${formatMoney(value)}`
                case 'percent':
                  return `${(value * 100).toFixed(2)}%`
                default:
                  return value ?? '-'
              }
            })()

            // 获取对齐方式
            const alignment = col.align || 'left'

            // 创建对齐样式
            const alignmentStyle = {
              textAlign: alignment,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start'
            }

            // 如果启用了 ellipsis，包装在带有 title 的 span 中
            if (col.ellipsis !== false && typeof cellContent === 'string') {
              return (
                <div class={`cell-content text-${alignment}`} style={alignmentStyle}>
                  <span
                    class="ellipsis-cell"
                    title={cellContent}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%'
                    }}
                  >
                    {cellContent}
                  </span>
                </div>
              )
            }

            // 包装内容以应用对齐样式
            return (
              <div class={`cell-content text-${alignment}`} style={alignmentStyle}>
                {cellContent}
              </div>
            )
          }
        }
      })
    })

    // 快速滚动到索引
    const scrollToIndex = (index: number) => {
      if (!useVirtual.value) return
      // ElTableV2 提供的 API：scrollToRow 或 scrollTo
      // @ts-ignore
      v2Ref.value?.scrollToRow?.(index)
    }

    // 选择与行键
    const getRowKeyVal = (row: any) => (typeof props.rowKey === 'function' ? (props.rowKey as any)(row) : row[props.rowKey as string])
    const isRowSelected = (row: any) => selectedRowKeys.value.includes(getRowKeyVal(row))
    const setRowSelected = (row: any, selected: boolean) => {
      const key = getRowKeyVal(row)
      const idx = selectedRowKeys.value.indexOf(key)
      if (selected && idx === -1) {
        selectedRowKeys.value.push(key)
        selectedRows.value.push(row)
      } else if (!selected && idx !== -1) {
        selectedRowKeys.value.splice(idx, 1)
        const rIdx = selectedRows.value.findIndex(r => getRowKeyVal(r) === key)
        if (rIdx !== -1) selectedRows.value.splice(rIdx, 1)
      }
      emit('selection-change', selectedRowKeys.value, selectedRows.value)
    }
    const toggleSelectAll = (checked: boolean) => {
      if (!tableData.value?.length) return
      if (checked) {
        selectedRows.value = [...tableData.value]
        selectedRowKeys.value = tableData.value.map(getRowKeyVal)
      } else {
        selectedRows.value = []
        selectedRowKeys.value = []
      }
      emit('selection-change', selectedRowKeys.value, selectedRows.value)
    }

    // 初始化列宽状态
    const initializeColumnWidths = () => {
      if (!containerRef.value) return

      const containerWidth = containerRef.value.clientWidth
      if (containerWidth <= 0) return

      // 计算固定宽度的特殊列
      let specialColumnsWidth = 0

      // 选择列宽度
      if (props.rowSelection) {
        specialColumnsWidth += typeof props.rowSelection === 'object' && props.rowSelection.width
          ? parseWidth(props.rowSelection.width, 50)
          : 50
      }

      // 序号列宽度
      if (props.showIndex) {
        const maxIndex = tableData.value.length + (paginationState.current - 1) * paginationState.pageSize
        specialColumnsWidth += maxIndex > 999 ? 80 : maxIndex > 99 ? 70 : 60
      }

      // 操作列宽度
      if (slots.actions || (props.actions && props.actions.length > 0)) {
        const actionCount = props.actions?.length || 1
        const defaultActionWidth = Math.max(120, actionCount * 60)
        specialColumnsWidth += props.actionColumn?.width
          ? parseWidth(props.actionColumn.width, defaultActionWidth)
          : defaultActionWidth
      }

      // 计算业务列可用的总宽度
      const availableWidthForBusinessColumns = Math.max(200, containerWidth - specialColumnsWidth)

      // 分离有固定宽度和无固定宽度的业务列
      const fixedWidthColumns: any[] = []
      const flexColumns: any[] = []
      let fixedBusinessWidth = 0

      v2Columns.value.forEach(col => {
        const existingWidth = columnWidths.value[col.key]
        if (existingWidth) {
          // 使用已存在的宽度
          fixedWidthColumns.push(col)
          fixedBusinessWidth += existingWidth
        } else if (col.width) {
          // 使用配置的固定宽度
          fixedWidthColumns.push(col)
          fixedBusinessWidth += col.width
          columnWidths.value[col.key] = col.width
        } else {
          // 弹性列
          flexColumns.push(col)
        }
      })

      // 计算弹性列的宽度
      const remainingWidth = Math.max(0, availableWidthForBusinessColumns - fixedBusinessWidth)

      if (flexColumns.length > 0) {
        const flexColumnWidth = Math.max(100, remainingWidth / flexColumns.length)
        flexColumns.forEach(col => {
          if (!columnWidths.value[col.key]) {
            columnWidths.value[col.key] = flexColumnWidth
          }
        })
      }

      // 确保总宽度等于容器宽度
      redistributeToFillContainer()
    }

    // 重新分配列宽以完全填充容器
    const redistributeToFillContainer = () => {
      if (!containerRef.value) return

      const containerWidth = containerRef.value.clientWidth
      if (containerWidth <= 0) return

      // 计算特殊列宽度
      let specialColumnsWidth = 0
      if (props.rowSelection) {
        specialColumnsWidth += typeof props.rowSelection === 'object' && props.rowSelection.width
          ? parseWidth(props.rowSelection.width, 50)
          : 50
      }
      if (props.showIndex) {
        const maxIndex = tableData.value.length + (paginationState.current - 1) * paginationState.pageSize
        specialColumnsWidth += maxIndex > 999 ? 80 : maxIndex > 99 ? 70 : 60
      }
      if (slots.actions || (props.actions && props.actions.length > 0)) {
        const actionCount = props.actions?.length || 1
        const defaultActionWidth = Math.max(120, actionCount * 60)
        specialColumnsWidth += props.actionColumn?.width
          ? parseWidth(props.actionColumn.width, defaultActionWidth)
          : defaultActionWidth
      }

      const availableWidth = containerWidth - specialColumnsWidth

      // 计算当前业务列总宽度
      let currentTotalWidth = 0
      v2Columns.value.forEach(col => {
        currentTotalWidth += columnWidths.value[col.key] || col.width || 120
      })

      // 如果总宽度不等于可用宽度，按比例调整
      if (currentTotalWidth !== availableWidth && currentTotalWidth > 0) {
        const scale = availableWidth / currentTotalWidth
        v2Columns.value.forEach(col => {
          const currentWidth = columnWidths.value[col.key] || col.width || 120
          columnWidths.value[col.key] = Math.max(80, currentWidth * scale)
        })
      }
    }

    // 计算动态列宽 - 使用已存储的列宽状态
    const calculateDynamicColumnWidths = () => {
      return v2Columns.value.map(col => ({
        ...col,
        width: columnWidths.value[col.key] || col.width || 120
      }))
    }

    // TableV2 列（含选择/序号/操作列）
    const v2AllColumns = computed(() => {
      const cols: any[] = []
      const dynamicColumns = calculateDynamicColumnWidths()

      // 选择列 - 与传统表格保持一致的宽度
      if (props.rowSelection) {
        const selectionWidth = typeof props.rowSelection === 'object' && props.rowSelection.width
          ? parseWidth(props.rowSelection.width, 50)
          : 50

        cols.push({
          key: '__selection__',
          dataKey: '__selection__',
          width: selectionWidth,
          title: '',
          fixed: 'left',
          cellRenderer: ({ rowData }: any) => (
            <ElCheckbox
              modelValue={isRowSelected(rowData)}
              onChange={(val: any) => setRowSelected(rowData, !!val)}
            />
          ),
          headerRenderer: () => (
            <ElCheckbox
              modelValue={selectedRowKeys.value.length > 0 && selectedRowKeys.value.length === tableData.value.length}
              indeterminate={selectedRowKeys.value.length > 0 && selectedRowKeys.value.length < tableData.value.length}
              onChange={(val: any) => toggleSelectAll(!!val)}
            />
          )
        })
      }

      // 序号列 - 根据数据量动态调整宽度
      if (props.showIndex) {
        const maxIndex = tableData.value.length + (paginationState.current - 1) * paginationState.pageSize
        const indexWidth = maxIndex > 999 ? 80 : maxIndex > 99 ? 70 : 60

        cols.push({
          key: '__index__',
          dataKey: '__index__',
          width: indexWidth,
          title: '序号',
          fixed: props.rowSelection ? 'left' : undefined,
          cellRenderer: ({ rowIndex }: any) => (props.indexMethod ? props.indexMethod(rowIndex) : rowIndex + 1)
        })
      }

      // 合并业务列，并给支持 sorter 的列添加 headerRenderer
      const business = dynamicColumns.map((c: any) => ({
        ...c,
        width: columnWidths.value[c.key] || c.width,
        headerRenderer: () => {
          const sortable = !!visibleColumns.value.find(col => (col.dataIndex || col.key) === c.dataKey)?.sorter
          const isSelected = selectedColumns.value.has(c.key)

          return (
            <div
              class={`resizable-header ${isSelected ? 'column-selected' : ''}`}
              style={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isSelected ? 'var(--el-color-primary-light-9)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--el-color-primary)' : 'none'
              }}
              onClick={(e: MouseEvent) => {
                e.stopPropagation()
                toggleColumnSelection(c.key, e)
              }}
            >
              {/* 多选指示器 */}
              {isSelected && (
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background-color: var(--el-color-primary);"></div>
              )}

              {/* 列标题内容 */}
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  paddingLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: c.align === 'center' ? 'center' : c.align === 'right' ? 'flex-end' : 'flex-start',
                  textAlign: c.align || 'left'
                }}
              >
                {sortable ? (
                  <span
                    style="cursor: pointer; user-select: none;"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      const currentProp = c.dataKey
                      const currentOrder = (searchForm.order as any) || null
                      const isAsc = currentOrder === 'ascend' && searchForm.sorter === currentProp
                      const isDesc = currentOrder === 'descend' && searchForm.sorter === currentProp
                      const nextOrder = isAsc ? 'descend' : (isDesc ? null : 'ascend')
                      const order = nextOrder
                      const payload = { prop: currentProp, order: order === 'ascend' ? 'ascending' : (order === 'descend' ? 'descending' : null) } as any
                      if (!order) {
                        delete searchForm.sorter
                        delete (searchForm as any).order
                        loadData()
                      } else {
                        handleSortChange(payload)
                      }
                    }}
                  >
                    {c.title}
                    <span style="margin-left:6px; font-size:12px; opacity:0.7;">
                      {(() => {
                        const currentProp = c.dataKey
                        const currentOrder = (searchForm.order as any) || null
                        const isAsc = currentOrder === 'ascend' && searchForm.sorter === currentProp
                        const isDesc = currentOrder === 'descend' && searchForm.sorter === currentProp
                        return isAsc ? '↑' : isDesc ? '↓' : '↕'
                      })()}
                    </span>
                  </span>
                ) : (
                  <span>{c.title}</span>
                )}
              </div>

              {/* 虚拟表格专用拖拽手柄 - 使用鼠标事件 */}
              {props.enableColumnResize !== false && (
                <div
                  class="drag-line"
                  data-column-key={c.key}
                  style={{
                    position: 'absolute',
                    right: '0px',
                    top: '0px',
                    bottom: '0px',
                    width: '8px',
                    cursor: 'ew-resize',
                    backgroundColor: props.debugMode ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 123, 255, 0.1)',
                    zIndex: 9999,
                    userSelect: 'none',
                    border: '1px solid rgba(64, 158, 255, 0.5)'
                  }}
                  onMousedown={(e: MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    
                    console.log('[ProTable拖拽] 鼠标按下事件触发 - 列:', c.key, '位置:', e.clientX, e.clientY)
                    
                    // 记录拖拽开始状态
                    isDragging.value = true
                    dragColumnKey.value = c.key
                    dragStartX.value = e.clientX
                    dragStartWidth.value = columnWidths.value[c.key] || c.width || 120
                    
                    console.log('[ProTable拖拽] 拖拽开始 - 列:', c.key, '初始宽度:', dragStartWidth.value)
                    
                    // 添加全局样式
                    document.body.classList.add('column-resizing')
                    document.body.style.cursor = 'ew-resize'
                    document.body.style.userSelect = 'none'
                    
                    // 创建拖拽指示线
                    const dragIndicator = document.createElement('div')
                    dragIndicator.id = 'drag-indicator-line'
                    dragIndicator.style.cssText = `
                      position: fixed;
                      top: 0;
                      bottom: 0;
                      width: 2px;
                      background: var(--el-color-primary);
                      z-index: 10000;
                      pointer-events: none;
                      left: ${e.clientX}px;
                      box-shadow: 0 0 6px rgba(64, 158, 255, 0.6);
                    `
                    document.body.appendChild(dragIndicator)
                    
                    // 全局鼠标移动处理
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      if (!isDragging.value || !dragColumnKey.value) return
                      
                      const deltaX = moveEvent.clientX - dragStartX.value
                      const newWidth = Math.max(60, dragStartWidth.value + deltaX)
                      
                      // 更新指示线位置
                      const indicator = document.getElementById('drag-indicator-line')
                      if (indicator) {
                        indicator.style.left = moveEvent.clientX + 'px'
                      }
                      
                      if (props.debugMode) {
                        console.log('[ProTable拖拽] 移动中:', dragColumnKey.value, '位移:', deltaX, '新宽度:', newWidth)
                      }
                    }
                    
                    // 全局鼠标释放处理
                    const handleMouseUp = (upEvent: MouseEvent) => {
                      if (!isDragging.value || !dragColumnKey.value) return
                      
                      const deltaX = upEvent.clientX - dragStartX.value
                      const newWidth = Math.max(60, dragStartWidth.value + deltaX)
                      const columnKey = dragColumnKey.value
                      
                      console.log('[ProTable拖拽] 拖拽结束 - 列:', columnKey, '最终宽度:', newWidth)
                      
                      // 更新列宽
                      columnWidths.value[columnKey] = newWidth
                      
                      // 清理状态
                      isDragging.value = false
                      dragColumnKey.value = null
                      
                      // 清理样式
                      document.body.classList.remove('column-resizing')
                      document.body.style.cursor = ''
                      document.body.style.userSelect = ''
                      
                      // 移除指示线
                      const indicator = document.getElementById('drag-indicator-line')
                      if (indicator) {
                        indicator.remove()
                      }
                      
                      // 移除事件监听
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                      
                      // 强制重新渲染表格
                      tableRenderKey.value++
                      
                      // 验证更新
                      nextTick(() => {
                        console.log('[ProTable拖拽] 更新完成 - 新列宽:', columnWidths.value[columnKey])
                      })
                    }
                    
                    // 添加全局事件监听
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}
                  onDblclick={(e: MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    
                    // 双击自动调整宽度
                    const autoWidth = calculateOptimalColumnWidth(c.key)
                    columnWidths.value[c.key] = autoWidth
                    tableRenderKey.value++
                    
                    console.log('[虚拟表格拖拽] 双击自动调整:', c.key, '新宽度:', autoWidth)
                  }}
                />
              )}
            </div>
          )
        }
      }))

      cols.push(...business)

      // 操作列 - 根据操作数量动态调整宽度
      if (slots.actions || (props.actions && props.actions.length > 0)) {
        const actionCount = props.actions?.length || 1
        const defaultActionWidth = Math.max(120, actionCount * 60) // 每个操作按钮约60px
        const actionWidth = props.actionColumn?.width
          ? parseWidth(props.actionColumn.width, defaultActionWidth)
          : defaultActionWidth

        cols.push({
          key: '__actions__',
          dataKey: '__actions__',
          width: actionWidth,
          title: props.actionColumn?.title || '操作',
          fixed: props.actionColumn?.fixed || 'right',
          cellRenderer: ({ rowData, rowIndex }: any) => (
            slots.actions ?
              slots.actions({ record: rowData, index: rowIndex }) :
              <div class="table-actions">
                {/* 使用 span 容器以避免 Fragment 依赖 */}
                {getRowActions(rowData).map(action => (
                  <span>
                    <ElButton
                      key={action.key}
                      type={action.type || (action.danger ? 'danger' : 'text')}
                      size={action.size || 'small'}
                      disabled={action.disabled && typeof action.disabled === 'function' ? action.disabled(rowData) : action.disabled}
                      onClick={() => action.onClick?.(rowData, rowIndex)}
                    >
                      {action.text}
                    </ElButton>
                    {action.divider && <ElDivider direction="vertical" />}
                  </span>
                ))}
              </div>
          )
        })
      }

      return cols
    })

    // 尺寸与键盘导航
    const containerRef = ref<HTMLElement | null>(null)
    const tableWidth = ref(0)
    const tableHeight = computed(() => {
      const h = (props.maxHeight ?? props.height ?? 400) as any
      if (typeof h === 'number') return h
      const n = parseInt(String(h), 10)
      return isNaN(n) ? 400 : n
    })

    // 列宽拖拽相关状态
    const isDragging = ref(false)
    const dragColumnKey = ref<string | null>(null)
    const dragStartX = ref(0)
    const dragStartWidth = ref(0)
    const columnWidths = ref<Record<string, number>>({})
    const tableRenderKey = ref(0) // 用于强制重新渲染表格
    
    // 初始化默认列宽
    const initializeDefaultColumnWidths = () => {
      v2Columns.value.forEach(col => {
        if (!columnWidths.value[col.key]) {
          columnWidths.value[col.key] = parseWidth(col.width, 120)
        }
      })
    }

    // 多列选择和拖拽状态
    const selectedColumns = ref<Set<string>>(new Set())
    const isMultiSelectMode = ref(false)
    const multiDragStartWidths = ref<Record<string, number>>({})

    // 计算表格总宽度 - 考虑列宽总和
    const calculateTableWidth = () => {
      if (!containerRef.value) return 1000

      // 直接使用容器的客户端宽度
      const containerWidth = containerRef.value.clientWidth

      // 如果容器宽度为0，使用默认值
      if (containerWidth <= 0) return 1000

      // 计算所有列的总宽度
      let totalColumnsWidth = 0
      v2AllColumns.value.forEach(col => {
        totalColumnsWidth += col.width || 120
      })

      // 使用容器宽度和列宽总和的较大值，确保表格完全填充容器且不会过窄
      return Math.max(containerWidth, totalColumnsWidth)
    }

    const updateWidth = () => {
      // 使用 nextTick 确保 DOM 更新完成后再计算宽度
      nextTick(() => {
        // 初始化或重新分配列宽
        initializeColumnWidths()

        const newWidth = calculateTableWidth()
        if (newWidth !== tableWidth.value && newWidth > 0) {
          tableWidth.value = newWidth
        }
      })
    }

    // 列宽拖拽处理函数
    const handleColumnResize = (columnKey: string, newWidth: number) => {
      const minWidth = 80 // 最小列宽
      const finalWidth = Math.max(minWidth, newWidth)

      // 更新列宽状态
      columnWidths.value[columnKey] = finalWidth

      // 重新分配其他列的宽度以保持总宽度不变
      redistributeColumnWidths(columnKey, finalWidth)
    }

    // 重新分配列宽以保持总宽度不变
    const redistributeColumnWidths = (resizedColumnKey: string, newWidth: number) => {
      if (!containerRef.value) return

      const containerWidth = containerRef.value.clientWidth

      // 计算特殊列宽度
      let specialColumnsWidth = 0
      if (props.rowSelection) {
        specialColumnsWidth += typeof props.rowSelection === 'object' && props.rowSelection.width
          ? parseWidth(props.rowSelection.width, 50)
          : 50
      }
      if (props.showIndex) {
        const maxIndex = tableData.value.length + (paginationState.current - 1) * paginationState.pageSize
        specialColumnsWidth += maxIndex > 999 ? 80 : maxIndex > 99 ? 70 : 60
      }
      if (slots.actions || (props.actions && props.actions.length > 0)) {
        const actionCount = props.actions?.length || 1
        const defaultActionWidth = Math.max(120, actionCount * 60)
        specialColumnsWidth += props.actionColumn?.width
          ? parseWidth(props.actionColumn.width, defaultActionWidth)
          : defaultActionWidth
      }

      const availableWidth = containerWidth - specialColumnsWidth

      // 计算其他业务列的总宽度
      let otherColumnsWidth = 0
      const otherColumns: any[] = []

      v2Columns.value.forEach(col => {
        if (col.key !== resizedColumnKey) {
          const currentWidth = columnWidths.value[col.key] || col.width || 120
          otherColumnsWidth += currentWidth
          otherColumns.push({ ...col, currentWidth })
        }
      })

      // 计算需要调整的宽度差值
      const targetOtherWidth = availableWidth - newWidth
      const widthDiff = targetOtherWidth - otherColumnsWidth

      // 如果有其他列且需要调整
      if (otherColumns.length > 0 && Math.abs(widthDiff) > 1) {
        // 按比例分配宽度差值
        const totalCurrentWidth = otherColumnsWidth
        if (totalCurrentWidth > 0) {
          otherColumns.forEach(col => {
            const proportion = col.currentWidth / totalCurrentWidth
            const adjustment = widthDiff * proportion
            const newColumnWidth = Math.max(80, col.currentWidth + adjustment)
            columnWidths.value[col.key] = newColumnWidth
          })
        }
      }
    }

    // 计算列的最适宽度
    const calculateOptimalColumnWidth = (columnKey: string): number => {
      // 简单的启发式算法：基于列标题和内容估算最适宽度
      const column = visibleColumns.value.find(col => (col.dataIndex || col.key) === columnKey)
      if (!column) return 120

      // 基于标题长度估算
      const titleWidth = (column.title?.length || 0) * 12 + 40 // 每个字符约12px + padding

      // 基于数据类型估算
      let contentWidth = 120
      switch (column.valueType) {
        case 'text':
          contentWidth = 150
          break
        case 'date':
          contentWidth = 120
          break
        case 'money':
          contentWidth = 100
          break
        case 'option':
          contentWidth = 100
          break
        default:
          contentWidth = 120
      }

      // 返回标题宽度和内容宽度的较大值，但不超过300px
      return Math.min(300, Math.max(titleWidth, contentWidth, 80))
    }

    // 多列选择相关函数
    const toggleColumnSelection = (columnKey: string, event?: MouseEvent) => {
      if (event?.ctrlKey || event?.metaKey) {
        // Ctrl/Cmd + 点击：切换选择状态
        if (selectedColumns.value.has(columnKey)) {
          selectedColumns.value.delete(columnKey)
        } else {
          selectedColumns.value.add(columnKey)
        }
        isMultiSelectMode.value = selectedColumns.value.size > 1
      } else if (event?.shiftKey && selectedColumns.value.size > 0) {
        // Shift + 点击：范围选择
        const allColumnKeys = v2Columns.value.map(col => col.key)
        const lastSelected = Array.from(selectedColumns.value).pop()
        if (lastSelected) {
          const startIndex = allColumnKeys.indexOf(lastSelected)
          const endIndex = allColumnKeys.indexOf(columnKey)
          const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)]

          selectedColumns.value.clear()
          for (let i = min; i <= max; i++) {
            selectedColumns.value.add(allColumnKeys[i])
          }
          isMultiSelectMode.value = selectedColumns.value.size > 1
        }
      } else {
        // 普通点击：单选
        selectedColumns.value.clear()
        selectedColumns.value.add(columnKey)
        isMultiSelectMode.value = false
      }
    }

    // 多列拖拽处理
    const handleMultiColumnResize = (deltaX: number) => {
      if (!isMultiSelectMode.value || selectedColumns.value.size === 0) return

      // 为每个选中的列按比例调整宽度
      selectedColumns.value.forEach(columnKey => {
        const startWidth = multiDragStartWidths.value[columnKey] || columnWidths.value[columnKey] || 120
        const newWidth = Math.max(80, startWidth + deltaX)
        columnWidths.value[columnKey] = newWidth
      })

      // 重新分配其他列的宽度
      redistributeMultiColumnWidths()
    }

    // 重新分配多列调整后的宽度
    const redistributeMultiColumnWidths = () => {
      if (!containerRef.value) return

      const containerWidth = containerRef.value.clientWidth

      // 计算特殊列宽度
      let specialColumnsWidth = 0
      if (props.rowSelection) {
        specialColumnsWidth += typeof props.rowSelection === 'object' && props.rowSelection.width
          ? parseWidth(props.rowSelection.width, 50)
          : 50
      }
      if (props.showIndex) {
        const maxIndex = tableData.value.length + (paginationState.current - 1) * paginationState.pageSize
        specialColumnsWidth += maxIndex > 999 ? 80 : maxIndex > 99 ? 70 : 60
      }
      if (slots.actions || (props.actions && props.actions.length > 0)) {
        const actionCount = props.actions?.length || 1
        const defaultActionWidth = Math.max(120, actionCount * 60)
        specialColumnsWidth += props.actionColumn?.width
          ? parseWidth(props.actionColumn.width, defaultActionWidth)
          : defaultActionWidth
      }

      const availableWidth = containerWidth - specialColumnsWidth

      // 计算选中列和未选中列的总宽度
      let selectedColumnsWidth = 0
      let unselectedColumnsWidth = 0
      const unselectedColumns: string[] = []

      v2Columns.value.forEach(col => {
        const currentWidth = columnWidths.value[col.key] || col.width || 120
        if (selectedColumns.value.has(col.key)) {
          selectedColumnsWidth += currentWidth
        } else {
          unselectedColumnsWidth += currentWidth
          unselectedColumns.push(col.key)
        }
      })

      // 计算未选中列需要调整的总宽度
      const targetUnselectedWidth = availableWidth - selectedColumnsWidth
      const widthDiff = targetUnselectedWidth - unselectedColumnsWidth

      // 按比例调整未选中列的宽度
      if (unselectedColumns.length > 0 && Math.abs(widthDiff) > 1) {
        const totalCurrentWidth = unselectedColumnsWidth
        if (totalCurrentWidth > 0) {
          unselectedColumns.forEach(columnKey => {
            const currentWidth = columnWidths.value[columnKey] || 120
            const proportion = currentWidth / totalCurrentWidth
            const adjustment = widthDiff * proportion
            const newWidth = Math.max(80, currentWidth + adjustment)
            columnWidths.value[columnKey] = newWidth
          })
        }
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      // 多列选择快捷键
      if (e.key === 'Escape') {
        // ESC 键清除所有选择
        selectedColumns.value.clear()
        isMultiSelectMode.value = false
        e.preventDefault()
        return
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
          // Ctrl+A 全选所有列
          e.preventDefault()
          selectedColumns.value.clear()
          v2Columns.value.forEach(col => {
            selectedColumns.value.add(col.key)
          })
          isMultiSelectMode.value = selectedColumns.value.size > 1
          return
        }
      }

      if (!useVirtual.value) return
      const len = tableData.value.length
      if (!len) return
      if (e.key === 'ArrowDown') {
        activeIndex.value = Math.min(len - 1, activeIndex.value + 1)
        scrollToIndex(activeIndex.value)
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        activeIndex.value = Math.max(0, activeIndex.value - 1)
        scrollToIndex(activeIndex.value)
        e.preventDefault()
      }
    }


    // 方法
    const loadData = async (resetPage = false) => {
      if (!props.request) return

      loading.value = true

      try {
        if (resetPage) {
          paginationState.current = 1
        }

        const params: RequestParams = {
          ...props.params,
          ...searchForm,
          current: paginationState.current,
          pageSize: paginationState.pageSize
        }

        const response = await props.request(params)

        if (response.success === false) {
          throw new Error(response.message || '请求失败')
        }

        const resolvedData = Array.isArray(response?.data?.list)
          ? response.data.list
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.list)
              ? response.list
              : Array.isArray((response as any)?.records)
                ? (response as any).records
                : []
        tableData.value = resolvedData as any[]

        const totalValue = (response as any).total ?? response?.data?.total ?? response?.data?.totalCount ?? response?.data?.count
        if (typeof totalValue === 'number') {
          paginationState.total = totalValue
        } else if (response.pagination) {
          paginationState.total = response.pagination.total ?? paginationState.total
        }

        if (typeof (response as any).page === 'number') {
          paginationState.current = (response as any).page
        } else if (typeof response?.data?.page === 'number') {
          paginationState.current = response.data.page
        } else if (response.pagination) {
          if (typeof response.pagination.page === 'number') {
            paginationState.current = response.pagination.page
          } else if (typeof response.pagination.current === 'number') {
            paginationState.current = response.pagination.current
          }
        }

        if (typeof (response as any).pageSize === 'number') {
          paginationState.pageSize = (response as any).pageSize
        } else if (typeof response?.data?.pageSize === 'number') {
          paginationState.pageSize = response.data.pageSize
        } else if (response.pagination) {
          if (typeof response.pagination.limit === 'number') {
            paginationState.pageSize = response.pagination.limit
          } else if (typeof response.pagination.pageSize === 'number') {
            paginationState.pageSize = response.pagination.pageSize
          }
        }

        emit('load', response)
      } catch (error: any) {
        console.error('表格数据加载失败:', error)
        ElMessage.error(error.message || '数据加载失败')
        emit('requestError', error)
      } finally {
        loading.value = false
      }
    }

    const handleSearch = () => {
      loadData(true)
    }

    const handleReset = () => {
      if (searchFormRef.value) {
        searchFormRef.value.resetFields()
      }
      Object.keys(searchForm).forEach(key => {
        searchForm[key] = undefined
      })
      loadData(true)
    }

    const handleRefresh = () => {
      loadData()
    }

    const handleCreate = () => {
      emit('create')
    }

    const toggleSearchExpanded = () => {
      searchExpanded.value = !searchExpanded.value
    }

    const handleSelectionChange = (selection: any[]) => {
      selectedRows.value = selection
      selectedRowKeys.value = selection.map(row =>
        typeof props.rowKey === 'function' ? props.rowKey(row) : row[props.rowKey as string]
      )
      emit('selection-change', selectedRowKeys.value, selectedRows.value)
    }

    const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
      const params = {
        sorter: prop,
        order: order === 'ascending' ? 'ascend' : 'descend'
      }
      Object.assign(searchForm, params)
      loadData()
    }

    const handlePageChange = (page: number) => {
      paginationState.current = page
      loadData()
    }

    const handleSizeChange = (size: number) => {
      paginationState.pageSize = size
      paginationState.current = 1
      loadData()
    }

    const onRowClick = (row: any, column: any, event: Event) => {
      emit('row-click', row, column, event)
    }

    const onRowDblClick = (row: any, column: any, event: Event) => {
      emit('row-dblclick', row, column, event)
    }

    const getRowActions = (record: any) => {
      const actions = props.actions || []
      return actions.filter(action => {
        if (typeof action.show === 'function') {
          return action.show(record)
        }
        return action.show !== false
      })
    }

    // 格式化方法
    const formatDate = (date: any) => {
      const formatted = formatDateUtil(date)
      return formatted || '-'
    }

    const formatDateTime = (date: any) => {
      const formatted = formatDateTimeUtil(date)
      return formatted || '-'
    }

    const formatMoney = (amount: any) => {
      if (amount === null || amount === undefined) return '0.00'
      return Number(amount).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const getOptionText = (value: any, valueEnum?: ValueEnumItem[]) => {
      if (!valueEnum) return value || '-'
      const option = valueEnum.find(item => item.value === value)
      return option?.label || value || '-'
    }

    const getOptionType = (value: any, valueEnum?: ValueEnumItem[]) => {
      if (!valueEnum) return 'default'
      const option = valueEnum.find(item => item.value === value)
      return option?.type || 'default'
    }

    // 监听器
    watch(() => props.params, () => {
      if (props.autoRequest) {
        loadData(true)
      }
    }, { deep: true })

    // 监听虚拟滚动配置变化，重新计算宽度
    watch(() => props.virtualScrollConfig, () => {
      nextTick(() => {
        updateWidth()
      })
    }, { deep: true })

    // 监听列配置变化，重新计算宽度
    watch(() => props.columns, () => {
      nextTick(() => {
        updateWidth()
      })
    }, { deep: true })

    // 监听虚拟滚动模式切换，重新计算宽度
    watch(() => useVirtual.value, () => {
      nextTick(() => {
        updateWidth()
      })
    })

    // 初始化
    onMounted(() => {
      // 初始化搜索表单
      props.columns.forEach(column => {
        if (column.search !== false && column.hideInSearch !== true) {
          searchForm[column.key] = column.initialValue
        }
      })

      // 初始化分页
      if (props.pagination && typeof props.pagination === 'object') {
        Object.assign(paginationState, props.pagination)
      }

      // 初始化列宽
      initializeDefaultColumnWidths()

      // 初始化表格宽度 - 延迟执行确保容器已渲染
      setTimeout(() => {
        updateWidth()

        // 监听窗口大小变化
        const resizeObserver = new ResizeObserver(() => {
          updateWidth()
        })

        if (containerRef.value) {
          resizeObserver.observe(containerRef.value)
        }

        // 清理监听器
        onUnmounted(() => {
          resizeObserver.disconnect()
        })
      }, 100)

      // 自动加载数据
      if (props.autoRequest && typeof props.request === 'function') {
        loadData()
      }
    })

    // 重置列宽
    const resetColumnWidths = () => {
      columnWidths.value = {}
      selectedColumns.value.clear()
      isMultiSelectMode.value = false
      initializeColumnWidths()
      tableRenderKey.value++
      console.log('列宽已重置')
    }

    // 清除列选择
    const clearColumnSelection = () => {
      selectedColumns.value.clear()
      isMultiSelectMode.value = false
      tableRenderKey.value++
      console.log('列选择已清除')
    }

    // 切换调试模式
    const toggleDebugMode = () => {
      debugModeLocal.value = !debugModeLocal.value
      console.log('调试模式:', debugModeLocal.value ? '开启' : '关闭')
    }

    // 获取当前列宽状态
    const getColumnWidths = () => {
      return { ...columnWidths.value }
    }

    // 设置列宽
    const setColumnWidth = (columnKey: string, width: number) => {
      columnWidths.value[columnKey] = Math.max(80, width)
      tableRenderKey.value++
    }

    // 暴露方法
    const proTableInstance: ProTableInstance = {
      reload: loadData,
      refresh: async () => { handleRefresh(); },
      reset: handleReset,
      clearSelection: () => tableRef.value?.clearSelection(),
      toggleRowSelection: (row, selected) => tableRef.value?.toggleRowSelection(row, selected),
      getTableData: () => tableData.value,
      getSelectedRows: () => selectedRows.value,
      getSelectedRowKeys: () => selectedRowKeys.value,
      setTableData: (data) => { tableData.value = data },
      getSearchParams: () => ({ ...searchForm }),
      setSearchParams: (params) => Object.assign(searchForm, params),
      scrollToIndex,
      // 列宽相关方法
      resetColumnWidths,
      clearColumnSelection,
      toggleDebugMode,
      getColumnWidths,
      setColumnWidth
    }

    expose(proTableInstance)

    // 渲染搜索表单
    const renderSearchForm = () => {
      if (props.search === false) return null

      return (
        <div class="pro-table-search">
          <ElCard shadow="never" class="search-card">
            <ElForm
              ref={searchFormRef}
              model={searchForm}
              inline={true}
              labelWidth={props.labelWidth}
              class="search-form"
            >
              {searchableColumns.value.map(column => {
                if (column.valueType === 'text' || !column.valueType) {
                  return (
                    <ElFormItem
                      key={column.key}
                      label={column.title}
                      prop={column.key}
                    >
                      <ElInput
                        v-model={searchForm[column.key]}
                        placeholder={`请输入${column.title}`}
                        clearable={true}
                        style={{ width: '200px' }}
                        onKeydown={(e: any) => {
                          if (e.key === 'Enter') handleSearch()
                        }}
                      />
                    </ElFormItem>
                  )
                } else if (column.valueType === 'select') {
                  return (
                    <ElFormItem
                      key={column.key}
                      label={column.title}
                      prop={column.key}
                    >
                      <ElSelect
                        v-model={searchForm[column.key]}
                        placeholder={`请选择${column.title}`}
                        clearable={true}
                        style={{ width: '200px' }}
                      >
                        {column.valueEnum?.map(option => (
                          <ElOption
                            key={String(option.value)}
                            label={option.label}
                            value={option.value as any}
                          />
                        ))}
                      </ElSelect>
                    </ElFormItem>
                  )
                } else if (column.valueType === 'date') {
                  return (
                    <ElFormItem
                      key={column.key}
                      label={column.title}
                      prop={column.key}
                    >
                      <ElDatePicker
                        v-model={searchForm[column.key]}
                        type="date"
                        placeholder={`请选择${column.title}`}
                        style={{ width: '200px' }}
                      />
                    </ElFormItem>
                  )
                } else if (column.valueType === 'dateRange') {
                  return (
                    <ElFormItem
                      key={column.key}
                      label={column.title}
                      prop={column.key}
                    >
                      <ElDatePicker
                        v-model={searchForm[column.key]}
                        type="daterange"
                        rangeSeparator="至"
                        startPlaceholder="开始日期"
                        endPlaceholder="结束日期"
                        style={{ width: '280px' }}
                      />
                    </ElFormItem>
                  )
                }
                return null
              })}

              <ElFormItem class="search-actions">
                <ElButton type="primary" onClick={handleSearch} loading={loading.value}>
                  <ElIcon><Search /></ElIcon>
                  查询
                </ElButton>
                <ElButton onClick={handleReset}>
                  <ElIcon><Refresh /></ElIcon>
                  重置
                </ElButton>
                {searchableColumns.value.length > (props.defaultSearchCount || 3) && (
                  <ElButton
                    link
                    onClick={toggleSearchExpanded}
                  >
                    {searchExpanded.value ? '收起' : '展开'}
                    <ElIcon>
                      {searchExpanded.value ? <ArrowUp /> : <ArrowDown />}
                    </ElIcon>
                  </ElButton>
                )}
              </ElFormItem>
            </ElForm>
          </ElCard>
        </div>
      )
    }

    // 渲染工具栏
    const renderToolBar = () => {
      if (props.toolBar === false) return null

      return (
        <div class="pro-table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px 0' }}>
          <div class="toolbar-content" style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
            {slots.toolBarRender && slots.toolBarRender({
              selectedRowKeys: selectedRowKeys.value,
              selectedRows: selectedRows.value
            })}
          </div>
        </div>
      )
    }

    // 渲染表格列
    const renderTableColumns = () => {
      return visibleColumns.value.map(column => (
        <ElTableColumn
          key={column.key}
          prop={column.dataIndex || column.key}
          label={column.title}
          width={column.width}
          minWidth={column.minWidth || (!column.width ? 120 : undefined)}
          fixed={column.fixed}
          sortable={column.sorter ? 'custom' : false}
          showOverflowTooltip={column.ellipsis !== false}
          align={column.align || 'left'}
          headerAlign={column.headerAlign || column.align || 'left'}
        >
          {{
            header: column.renderHeader || column.headerSlot ?
              (scope: any) => {
                if (column.headerSlot && slots[column.headerSlot]) {
                  return slots[column.headerSlot](scope)
                }
                if (column.renderHeader) {
                  return column.renderHeader(scope.column, scope.$index)
                }
                return column.title
              } : undefined,
            default: (scope: any) => {
              if (column.slot && slots[column.slot]) {
                return slots[column.slot]({
                  text: scope.row[column.dataIndex || column.key],
                  record: scope.row,
                  index: scope.$index,
                  column
                })
              }

              if (column.render) {
                return column.render(
                  scope.row[column.dataIndex || column.key],
                  scope.row,
                  scope.$index,
                  column
                )
              }

              // 值类型渲染
              const value = scope.row[column.dataIndex || column.key]
              switch (column.valueType) {
                case 'option':
                  return column.valueEnum ? (
                    <ElTag type={(getOptionType(value, column.valueEnum) === 'default' ? undefined : (getOptionType(value, column.valueEnum) as any))}>
                      {getOptionText(value, column.valueEnum)}
                    </ElTag>
                  ) : value

                case 'date':
                  return <span>{formatDate(value)}</span>

                case 'dateTime':
                  return <span>{formatDateTime(value)}</span>

                case 'money':
                  return <span>¥{formatMoney(value)}</span>

                case 'percent':
                  return <span>{(value * 100).toFixed(2)}%</span>

                default:
                  return <span>{value || '-'}</span>
              }
            }
          }}
        </ElTableColumn>
      ))
    }

    // 渲染操作列
    const renderActionColumn = () => {
      if (!slots.actions && (!props.actions || props.actions.length === 0)) return null

      return (
        <ElTableColumn
          label="操作"
          align="center"
          width={props.actionColumn?.width || 150}
          fixed={props.actionColumn?.fixed || 'right'}
        >
          {{
            default: (scope: any) => (
              slots.actions ?
                slots.actions({ record: scope.row, index: scope.$index }) :
                <div class="table-actions">
                  {getRowActions(scope.row).map(action => (
                    <span>
                      <ElButton
                        key={action.key}
                        type={action.type || (action.danger ? 'danger' : 'text')}
                        size={action.size || 'small'}
                        disabled={action.disabled && typeof action.disabled === 'function' ? action.disabled(scope.row) : action.disabled}
                        onClick={() => action.onClick?.(scope.row, scope.$index)}
                      >
                        {action.text}
                      </ElButton>
                      {action.divider && <ElDivider direction="vertical" />}
                    </span>
                  ))}
                </div>
            )
          }}
        </ElTableColumn>
      )
    }

    // 渲染分页
    const renderPagination = () => {
      if (props.pagination === false) return null

      return (
        <div class="pro-table-pagination" style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px', borderTop: '1px solid var(--el-border-color-lighter)' }}>
          <ElPagination
            v-model:current-page={paginationState.current}
            v-model:page-size={paginationState.pageSize}
            total={paginationState.total}
            pageSizes={paginationState.pageSizes}
            layout={props.paginationLayout}
            background={true}
            onSize-change={handleSizeChange as any}
            onCurrent-change={handlePageChange as any}
          />
        </div>
      )
    }

    return () => (
      <div class={`pro-table ${debugModeLocal.value ? 'debug-mode' : ''}`}>
        {renderSearchForm()}
        {renderToolBar()}

        {useVirtual.value ? (
          <div class="pro-table-content" ref={containerRef} tabindex={0} onKeydown={(e: any) => handleKeydown(e)}>
            <ElTableV2
              key={`table-${tableRenderKey.value}`}
              ref={v2Ref}
              columns={v2AllColumns.value}
              data={tableData.value}
              width={tableWidth.value || 1000}
              height={tableHeight.value}
              rowHeight={virtualCfg.value.itemHeight || undefined}
              estimatedRowHeight={virtualCfg.value.estimatedItemHeight}
              // @ts-ignore Element Plus TableV2 v2 prop name
              overscanCount={virtualCfg.value.overscan}
              rowKey={props.rowKey as any}
            />
            {renderPagination()}
          </div>
        ) : (
          <div class="pro-table-content">
            <ElTable
              ref={tableRef}
              v-loading={loading.value}
              data={tableData.value}
              size={density.value}
              rowKey={props.rowKey}
              stripe={props.stripe}
              border={props.border}
              height={props.height}
              maxHeight={props.maxHeight}
              tableLayout="fixed"
              scrollbarAlwaysOn={true}
              onSelection-change={handleSelectionChange as any}
              onSort-change={handleSortChange as any}
              onRow-click={onRowClick as any}
              onRow-dblclick={onRowDblClick as any}
            >
              {/* 选择列 */}
              {props.rowSelection && (
                <ElTableColumn
                  type="selection"
                  width={50}
                  fixed="left"
                  selectable={
                    typeof props.rowSelection === 'object' && typeof props.rowSelection.checkStrictly === 'function'
                      ? props.rowSelection.checkStrictly
                      : undefined
                  }
                />
              )}

              {/* 序号列 */}
              {props.showIndex && (
                <ElTableColumn
                  label="序号"
                  type="index"
                  width={60}
                  index={props.indexMethod}
                />
              )}

              {/* 动态列 */}
              {renderTableColumns()}

              {/* 操作列 */}
              {renderActionColumn()}

              {{
                empty: () => (
                  <ElEmpty description={props.emptyText} />
                )
              }}
            </ElTable>

            {renderPagination()}
          </div>
        )}
      </div>
    )
  }
})