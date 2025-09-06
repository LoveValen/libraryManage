import { VNode, Component } from 'vue'

/**
 * 值类型枚举
 */
export type ValueType = 
  | 'text'
  | 'select' 
  | 'date'
  | 'dateTime'
  | 'dateRange'
  | 'dateTimeRange'
  | 'time'
  | 'timeRange'
  | 'number'
  | 'money'
  | 'percent'
  | 'option'
  | 'textarea'
  | 'password'
  | 'switch'
  | 'rate'
  | 'slider'
  | 'image'
  | 'avatar'
  | 'code'
  | 'jsonCode'

/**
 * 对齐方式
 */
export type AlignType = 'left' | 'center' | 'right'

/**
 * 固定方式
 */
export type FixedType = 'left' | 'right' | boolean

/**
 * 排序方式
 */
export type SortOrder = 'ascend' | 'descend' | null

/**
 * 表格尺寸
 */
export type TableSize = 'large' | 'default' | 'small'

/**
 * 虚拟滚动配置
 */
export interface VirtualScrollConfig {
  /** 是否启用虚拟滚动，默认 false */
  virtualScroll: boolean
  /** 固定行高（像素），用于固定高度模式 */
  itemHeight?: number
  /** 预估行高（像素），用于动态高度模式，默认 50 */
  estimatedItemHeight?: number
  /** 预渲染的额外行数，默认 5 */
  overscan?: number
  /** 启用虚拟滚动的最小数据量阈值，默认 100 */
  threshold?: number
}

/**
 * 选项配置
 */
export interface ValueEnumItem {
  /** 选项文本 */
  label: string
  /** 选项值 */
  value: string | number | boolean
  /** 选项类型（用于标签颜色） */
  type?: 'success' | 'info' | 'warning' | 'danger' | 'primary' | 'default'
  /** 是否禁用 */
  disabled?: boolean
  /** 状态 */
  status?: string
}

/**
 * 列配置接口
 */
export interface ProTableColumn {
  /** 列唯一标识 */
  key: string
  /** 列标题 */
  title: string
  /** 数据索引 */
  dataIndex?: string
  /** 值类型 */
  valueType?: ValueType
  /** 选项配置（用于select、option等类型） */
  valueEnum?: ValueEnumItem[]
  /** 列宽 */
  width?: number | string
  /** 最小列宽 */
  minWidth?: number | string
  /** 对齐方式 */
  align?: AlignType
  /** 表头对齐方式 */
  headerAlign?: AlignType
  /** 固定列 */
  fixed?: FixedType
  /** 是否可排序 */
  sorter?: boolean | ((a: any, b: any) => number)
  /** 是否显示省略号 */
  ellipsis?: boolean
  /** 是否可搜索 */
  search?: boolean
  /** 在表格中隐藏 */
  hideInTable?: boolean
  /** 在搜索中隐藏 */
  hideInSearch?: boolean
  /** 搜索时的初始值 */
  initialValue?: any
  /** 自定义渲染函数 */
  render?: (text: any, record: any, index: number, column: ProTableColumn) => VNode | string | number
  /** 插槽名称 */
  slot?: string
  /** 表头渲染函数 */
  renderHeader?: (column: any, index: number) => VNode | string
  /** 表头插槽 */
  headerSlot?: string
  /** 表单项配置 */
  formItemProps?: Record<string, any>
  /** 字段属性 */
  fieldProps?: Record<string, any>
  /** 列样式类名 */
  className?: string
  /** 是否必填（搜索表单中） */
  required?: boolean
  /** 提示信息 */
  tooltip?: string
  /** 复制功能 */
  copyable?: boolean
  /** 禁用状态 */
  disabled?: boolean | ((record: any) => boolean)
}

/**
 * 行操作配置
 */
export interface ActionItem {
  /** 操作标识 */
  key: string
  /** 操作文本 */
  text: string
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  /** 按钮大小 */
  size?: 'large' | 'default' | 'small'
  /** 是否危险按钮 */
  danger?: boolean
  /** 是否显示分割线 */
  divider?: boolean
  /** 是否显示 */
  show?: boolean | ((record: any) => boolean)
  /** 是否禁用 */
  disabled?: boolean | ((record: any) => boolean)
  /** 点击事件 */
  onClick?: (record: any, index: number) => void
  /** 确认提示 */
  popconfirm?: {
    title: string
    okText?: string
    cancelText?: string
    onConfirm?: (record: any, index: number) => void
    onCancel?: (record: any, index: number) => void
  }
  /** 图标 */
  icon?: Component
  /** 提示信息 */
  tooltip?: string
}

/**
 * 批量操作配置
 */
export interface BatchAction {
  /** 操作标识 */
  key: string
  /** 操作文本 */
  text: string
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  /** 是否危险按钮 */
  danger?: boolean
  /** 是否禁用 */
  disabled?: boolean | ((selectedRowKeys: any[], selectedRows: any[]) => boolean)
  /** 点击事件 */
  onClick?: (selectedRowKeys: any[], selectedRows: any[]) => void
  /** 确认提示 */
  popconfirm?: {
    title: string
    okText?: string
    cancelText?: string
  }
  /** 图标 */
  icon?: Component
  /** 是否需要选中行 */
  needSelect?: boolean
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  /** 当前页码 */
  current?: number
  /** 每页条数 */
  pageSize?: number
  /** 总条数 */
  total?: number
  /** 每页条数选项 */
  pageSizes?: number[]
  /** 显示条数选择器 */
  showSizeChanger?: boolean
  /** 显示快速跳转 */
  showQuickJumper?: boolean
  /** 显示总条数 */
  showTotal?: boolean | ((total: number, range: [number, number]) => string)
  /** 页码改变回调 */
  onChange?: (page: number, pageSize: number) => void
  /** 每页条数改变回调 */
  onShowSizeChange?: (current: number, size: number) => void
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  /** 标签宽度 */
  labelWidth?: string | number
  /** 每行显示项数 */
  span?: number
  /** 默认折叠 */
  defaultCollapsed?: boolean
  /** 折叠时显示的搜索项数量 */
  collapseRender?: number
  /** 搜索按钮文本 */
  searchText?: string
  /** 重置按钮文本 */
  resetText?: string
  /** 提交时是否重置页码 */
  resetPageIndex?: boolean
  /** 自定义搜索表单 */
  filterType?: 'query' | 'light'
}

/**
 * 工具栏配置
 */
export interface ToolBarConfig {
  /** 显示新建按钮 */
  create?: boolean
  /** 新建按钮文本 */
  createText?: string
  /** 新建按钮点击事件 */
  onCreate?: () => void
  /** 显示刷新按钮 */
  reload?: boolean
  /** 显示密度设置 */
  density?: boolean
  /** 显示列设置 */
  columnSetting?: boolean
  /** 显示全屏按钮 */
  fullScreen?: boolean
  /** 自定义渲染 */
  render?: () => VNode | VNode[]
}

/**
 * 行选择配置
 */
export interface RowSelectionConfig {
  /** 选择类型 */
  type?: 'checkbox' | 'radio'
  /** 固定选择列 */
  fixed?: boolean
  /** 列宽 */
  width?: number
  /** 严格选择模式 */
  checkStrictly?: boolean | ((record: any) => boolean)
  /** 选择改变回调 */
  onChange?: (selectedRowKeys: any[], selectedRows: any[]) => void
  /** 全选改变回调 */
  onSelectAll?: (selected: boolean, selectedRows: any[], changeRows: any[]) => void
  /** 单选改变回调 */
  onSelect?: (record: any, selected: boolean, selectedRows: any[], nativeEvent: Event) => void
  /** 获取选择框属性 */
  getCheckboxProps?: (record: any) => { disabled?: boolean; name?: string }
  /** 自定义选择项 */
  selections?: Array<{
    key: string
    text: string
    onSelect?: (changeableRowKeys: any[]) => void
  }>
}

/**
 * 请求参数接口
 */
export interface RequestParams {
  /** 当前页 */
  current?: number
  /** 页大小 */
  pageSize?: number
  /** 排序字段 */
  sorter?: string
  /** 排序方向 */
  order?: SortOrder
  /** 其他搜索参数 */
  [key: string]: any
}

/**
 * 请求响应接口
 */
export interface RequestResponse<T = any> {
  /** 是否成功 */
  success?: boolean
  /** 数据列表 */
  data?: T[]
  /** 数据列表（兼容字段） */
  list?: T[]
  /** 总条数 */
  total?: number
  /** 分页信息 */
  pagination?: {
    current: number
    pageSize: number
    total: number
  }
  /** 错误信息 */
  message?: string
  /** 错误码 */
  code?: number
}

/**
 * 请求函数类型
 */
export type RequestFunction<T = any> = (params: RequestParams) => Promise<RequestResponse<T>>

/**
 * ProTable 组件属性接口
 */
export interface ProTableProps<T = any> {
  /** 数据请求函数 */
  request: RequestFunction<T>
  /** 列配置 */
  columns: ProTableColumn[]
  /** 行键 */
  rowKey?: string | ((record: T) => string)
  /** 分页配置 */
  pagination?: PaginationConfig | false
  /** 搜索配置 */
  search?: SearchConfig | false
  /** 工具栏配置 */
  toolBar?: ToolBarConfig | false
  /** 行选择配置 */
  rowSelection?: RowSelectionConfig | false
  /** 批量操作 */
  batchActions?: BatchAction[]
  /** 行操作 */
  actions?: ActionItem[]
  /** 操作列配置 */
  actionColumn?: {
    width?: number | string
    fixed?: FixedType
    title?: string
  }
  /** 表格属性 */
  stripe?: boolean
  border?: boolean
  height?: string | number
  maxHeight?: string | number
  /** 显示序号 */
  showIndex?: boolean
  /** 序号计算方法 */
  indexMethod?: (index: number) => number
  /** 空状态文本 */
  emptyText?: string
  /** 搜索标签宽度 */
  labelWidth?: string
  /** 默认搜索项数量 */
  defaultSearchCount?: number
  /** 分页布局 */
  paginationLayout?: string
  /** 自动请求 */
  autoRequest?: boolean
  /** 额外参数 */
  params?: Record<string, any>
  /** 虚拟滚动配置 */
  virtualScrollConfig?: VirtualScrollConfig
  /** 表格大小 */
  size?: TableSize
  /** 加载状态 */
  loading?: boolean
  /** 错误状态 */
  error?: boolean
  /** 手动模式（不自动请求） */
  manualRequest?: boolean
  /** 启用列宽拖拽 */
  enableColumnResize?: boolean
}

/**
 * ProTable 组件事件接口
 */
export interface ProTableEmits<T = any> {
  /** 数据加载完成 */
  load: [response: RequestResponse<T>]
  /** 请求错误 */
  requestError: [error: Error]
  /** 表格变化 */
  change: [pagination: PaginationConfig, sorter: any, filter: any]
  /** 行点击 */
  rowClick: [record: T, index: number, event: Event]
  /** 行双击 */
  rowDblClick: [record: T, index: number, event: Event]
  /** 选择变化 */
  selectionChange: [selectedRowKeys: any[], selectedRows: T[]]
  /** 新建事件 */
  create: []
}

/**
 * ProTable 组件实例方法接口
 */
export interface ProTableInstance<T = any> {
  /** 重新加载数据 */
  reload: (resetPageIndex?: boolean) => Promise<void>
  /** 刷新数据 */
  refresh: () => Promise<void>
  /** 重置搜索表单 */
  reset: () => void
  /** 清空选择 */
  clearSelection: () => void
  /** 切换行选择 */
  toggleRowSelection: (row: T, selected?: boolean) => void
  /** 获取表格数据 */
  getTableData: () => T[]
  /** 获取选中行 */
  getSelectedRows: () => T[]
  /** 获取选中行键 */
  getSelectedRowKeys: () => any[]
  /** 设置表格数据 */
  setTableData: (data: T[]) => void
  /** 获取搜索参数 */
  getSearchParams: () => Record<string, any>
  /** 设置搜索参数 */
  setSearchParams: (params: Record<string, any>) => void
  /** 快速滚动到指定索引位置（虚拟滚动） */
  scrollToIndex?: (index: number) => void
  /** 重置列宽 */
  resetColumnWidths?: () => void
  /** 清除列选择 */
  clearColumnSelection?: () => void
  /** 切换调试模式 */
  toggleDebugMode?: () => void
  /** 获取列宽状态 */
  getColumnWidths?: () => Record<string, number>
  /** 设置列宽 */
  setColumnWidth?: (columnKey: string, width: number) => void
}

/**
 * 表格状态接口
 */
export interface TableState {
  /** 加载状态 */
  loading: boolean
  /** 数据源 */
  dataSource: any[]
  /** 选中的行键 */
  selectedRowKeys: any[]
  /** 选中的行数据 */
  selectedRows: any[]
  /** 分页状态 */
  pagination: PaginationConfig
  /** 搜索参数 */
  searchParams: Record<string, any>
  /** 排序参数 */
  sorter: Record<string, any>
  /** 过滤参数 */
  filters: Record<string, any>
}

/**
 * 列配置构建器
 */
export class ProTableColumnBuilder {
  private column: ProTableColumn

  constructor(key: string, title: string) {
    this.column = { key, title }
  }

  dataIndex(dataIndex: string): this {
    this.column.dataIndex = dataIndex
    return this
  }

  valueType(valueType: ValueType): this {
    this.column.valueType = valueType
    return this
  }

  width(width: number | string): this {
    this.column.width = width
    return this
  }

  align(align: AlignType): this {
    this.column.align = align
    return this
  }

  fixed(fixed: FixedType): this {
    this.column.fixed = fixed
    return this
  }

  sorter(sorter: boolean | ((a: any, b: any) => number)): this {
    this.column.sorter = sorter
    return this
  }

  search(search: boolean): this {
    this.column.search = search
    return this
  }

  hideInTable(hide: boolean): this {
    this.column.hideInTable = hide
    return this
  }

  hideInSearch(hide: boolean): this {
    this.column.hideInSearch = hide
    return this
  }

  render(render: ProTableColumn['render']): this {
    this.column.render = render
    return this
  }

  slot(slot: string): this {
    this.column.slot = slot
    return this
  }

  valueEnum(valueEnum: ValueEnumItem[]): this {
    this.column.valueEnum = valueEnum
    return this
  }

  build(): ProTableColumn {
    return { ...this.column }
  }
}

/**
 * 快捷创建列配置的辅助函数
 */
export const createColumn = (key: string, title: string): ProTableColumnBuilder => {
  return new ProTableColumnBuilder(key, title)
}

/**
 * 常用列配置预设
 */
export const commonColumns = {
  /** 序号列 */
  index: (title = '序号'): ProTableColumn => ({
    key: 'index',
    title,
    valueType: 'index',
    width: 60,
    align: 'center',
    search: false
  }),

  /** 创建时间列 */
  createdAt: (title = '创建时间'): ProTableColumn => ({
    key: 'createdAt',
    title,
    dataIndex: 'created_at',
    valueType: 'dateTime',
    width: 160,
    sorter: true,
    search: false
  }),

  /** 更新时间列 */
  updatedAt: (title = '更新时间'): ProTableColumn => ({
    key: 'updatedAt',
    title,
    dataIndex: 'updated_at',
    valueType: 'dateTime',
    width: 160,
    sorter: true,
    search: false
  }),

  /** 状态列 */
  status: (title = '状态', valueEnum?: ValueEnumItem[]): ProTableColumn => ({
    key: 'status',
    title,
    valueType: 'option',
    width: 100,
    align: 'center',
    valueEnum: valueEnum || [
      { value: 'active', label: '启用', type: 'success' },
      { value: 'inactive', label: '禁用', type: 'danger' }
    ]
  }),

  /** 操作列 */
  actions: (title = '操作', width = 150): ProTableColumn => ({
    key: 'actions',
    title,
    width,
    fixed: 'right',
    search: false,
    slot: 'actions'
  })
}