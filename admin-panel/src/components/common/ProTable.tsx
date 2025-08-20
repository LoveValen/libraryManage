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
  type TableInstance
} from 'element-plus'
import {
  Search,
  Refresh,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
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
  ValueEnumItem
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

    // 分页状态
    const paginationState = reactive({
      current: 1,
      pageSize: 20,
      total: 0,
      pageSizes: [10, 20, 50, 100]
    })

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
        
        if (response.success !== false) {
          tableData.value = response.data || response.list || []
          
          if (response.total !== undefined) {
            paginationState.total = response.total
          } else if (response.pagination) {
            Object.assign(paginationState, response.pagination)
          }

          emit('load', response)
        } else {
          throw new Error(response.message || '请求失败')
        }
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
      return props.actions.filter(action => {
        if (typeof action.show === 'function') {
          return action.show(record)
        }
        return action.show !== false
      })
    }

    // 格式化方法
    const formatDate = (date: any) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString()
    }

    const formatDateTime = (date: any) => {
      if (!date) return '-'
      return new Date(date).toLocaleString()
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

      // 自动加载数据
      if (props.autoRequest && props.request) {
        loadData()
      }
    })

    // 暴露方法
    const proTableInstance: ProTableInstance = {
      reload: loadData,
      refresh: handleRefresh,
      reset: handleReset,
      clearSelection: () => tableRef.value?.clearSelection(),
      toggleRowSelection: (row, selected) => tableRef.value?.toggleRowSelection(row, selected),
      getTableData: () => tableData.value,
      getSelectedRows: () => selectedRows.value,
      getSelectedRowKeys: () => selectedRowKeys.value,
      setTableData: (data) => { tableData.value = data },
      getSearchParams: () => ({ ...searchForm }),
      setSearchParams: (params) => Object.assign(searchForm, params)
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
                        onKeyup={(e: KeyboardEvent) => {
                          if (e.key === 'Enter') handleSearch()
                        }}
                        style={{ width: '200px' }}
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
                            key={option.value}
                            label={option.label}
                            value={option.value}
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
                {searchableColumns.value.length > props.defaultSearchCount && (
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
                    <ElTag type={getOptionType(value, column.valueEnum)}>
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
      if (!slots.actions && props.actions.length === 0) return null

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
                    <>
                      <ElButton
                        key={action.key}
                        type={action.type || 'text'}
                        size={action.size || 'small'}
                        danger={action.danger}
                        disabled={action.disabled && typeof action.disabled === 'function' ? action.disabled(scope.row) : action.disabled}
                        onClick={() => action.onClick?.(scope.row, scope.$index)}
                      >
                        {action.text}
                      </ElButton>
                      {action.divider && <ElDivider direction="vertical" />}
                    </>
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
            onSizeChange={handleSizeChange}
            onCurrentChange={handlePageChange}
          />
        </div>
      )
    }

    return () => (
      <div class="pro-table">
        {renderSearchForm()}
        {renderToolBar()}

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
            onSelectionChange={handleSelectionChange}
            onSortChange={handleSortChange}
            onRowClick={onRowClick}
            onRowDblclick={onRowDblClick}
          >
            {/* 选择列 */}
            {props.rowSelection && (
              <ElTableColumn 
                type="selection" 
                width={50} 
                fixed="left"
                selectable={
                  typeof props.rowSelection === 'object' && props.rowSelection.checkStrictly
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
      </div>
    )
  }
})