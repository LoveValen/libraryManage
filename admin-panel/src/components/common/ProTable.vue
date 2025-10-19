<template>
  <div class="pro-table">
    <!-- 查询表单 -->
    <div class="pro-table-search" v-if="search !== false">
      <el-card shadow="never" class="search-card">
        <el-form
          ref="searchFormRef"
          :model="searchForm"
          :inline="true"
          :label-width="labelWidth"
          class="search-form"
        >
          <!-- 动态渲染搜索项 -->
          <template v-for="column in searchableColumns" :key="column.key">
            <!-- 输入框 -->
            <el-form-item 
              v-if="column.valueType === 'text' || !column.valueType"
              :label="column.title"
              :prop="column.key"
            >
              <el-input
                v-model="searchForm[column.key]"
                :placeholder="`请输入${column.title}`"
                clearable
                @keyup.enter="handleSearch"
                style="width: 200px"
              />
            </el-form-item>

            <!-- 选择器 -->
            <el-form-item 
              v-else-if="column.valueType === 'select'"
              :label="column.title"
              :prop="column.key"
            >
              <el-select
                v-model="searchForm[column.key]"
                :placeholder="`请选择${column.title}`"
                clearable
                style="width: 200px"
              >
                <el-option
                  v-for="option in column.valueEnum || []"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>

            <!-- 日期选择 -->
            <el-form-item 
              v-else-if="column.valueType === 'date'"
              :label="column.title"
              :prop="column.key"
            >
              <el-date-picker
                v-model="searchForm[column.key]"
                type="date"
                :placeholder="`请选择${column.title}`"
                style="width: 200px"
              />
            </el-form-item>

            <!-- 日期范围 -->
            <el-form-item 
              v-else-if="column.valueType === 'dateRange'"
              :label="column.title"
              :prop="column.key"
            >
              <el-date-picker
                v-model="searchForm[column.key]"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 280px"
              />
            </el-form-item>
          </template>

          <!-- 操作按钮 -->
          <el-form-item class="search-actions">
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
            <el-button 
              v-if="searchableColumns.length > defaultSearchCount"
              link 
              @click="toggleSearchExpanded"
            >
              {{ searchExpanded ? '收起' : '展开' }}
              <el-icon>
                <component :is="searchExpanded ? 'ArrowUp' : 'ArrowDown'" />
              </el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 表格工具栏 -->
    <div class="pro-table-toolbar" v-if="toolBar !== false">
      <div class="toolbar-left">
        <!-- 批量操作 -->
        <div class="batch-actions" v-if="batchActions.length > 0">
          <el-alert 
            v-if="selectedRowKeys.length > 0"
            :title="`已选择 ${selectedRowKeys.length} 项`" 
            type="info" 
            show-icon 
          />
          <slot name="batchActions" :selectedRowKeys="selectedRowKeys" :selectedRows="selectedRows">
            <el-button
              v-for="action in batchActions"
              :key="action.key"
              :type="action.type"
              :danger="action.danger"
              :disabled="selectedRowKeys.length === 0"
              @click="action.onClick?.(selectedRowKeys, selectedRows)"
            >
              {{ action.text }}
            </el-button>
          </slot>
        </div>
      </div>
      
      <!-- 工具栏右侧 -->
      <div class="toolbar-right">
        <slot name="toolBarRender" />
        <slot name="extra" />
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="pro-table-content">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        :size="density"
        :row-key="rowKey"
        :stripe="stripe"
        :border="border"
        :height="height"
        :max-height="maxHeight"
        table-layout="fixed"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        @row-click="onRowClick"
        @row-dblclick="onRowDblClick"
        v-bind="$attrs"
      >
        <!-- 选择列 -->
        <el-table-column 
          v-if="rowSelection"
          type="selection" 
          width="50" 
          fixed="left"
          :selectable="rowSelection.checkStrictly"
          align="center"
          header-align="center"
        />

        <!-- 序号列 -->
        <el-table-column 
          v-if="showIndex"
          label="序号" 
          type="index" 
          width="60"
          :index="indexMethod"
          align="center"
          header-align="center"
        />

        <!-- 动态列 -->
        <template v-for="column in visibleColumns" :key="column.key">
          <el-table-column
            :prop="column.dataIndex || column.key"
            :label="column.title"
            :width="column.width"
            :min-width="column.minWidth || (!column.width ? 120 : undefined)"
            :fixed="column.fixed"
            :sortable="column.sorter ? 'custom' : false"
            :show-overflow-tooltip="column.ellipsis !== false"
            :align="column.align || 'center'"
            :header-align="column.headerAlign || column.align || 'center'"
          >
            <!-- 自定义表头 -->
            <template v-if="column.renderHeader || column.headerSlot" #header="scope">
              <slot 
                v-if="column.headerSlot" 
                :name="column.headerSlot" 
                :column="scope.column" 
                :index="scope.$index"
              />
              <component 
                v-else-if="column.renderHeader"
                :is="column.renderHeader"
                :column="scope.column"
                :index="scope.$index"
              />
              <span v-else>{{ column.title }}</span>
            </template>

            <!-- 自定义单元格内容 -->
            <template #default="scope">
              <!-- 插槽渲染 -->
              <slot 
                v-if="column.slot" 
                :name="column.slot"
                :text="scope.row[column.dataIndex || column.key]"
                :record="scope.row"
                :index="scope.$index"
                :column="column"
              />
              
              <!-- 自定义渲染函数 -->
              <component
                v-else-if="column.render"
                :is="column.render"
                :text="scope.row[column.dataIndex || column.key]"
                :record="scope.row"
                :index="scope.$index"
                :column="column"
              />

              <!-- 值类型渲染 -->
              <template v-else>
                <!-- 状态标签 -->
                <el-tag 
                  v-if="column.valueType === 'option' && column.valueEnum"
                  :type="getOptionType(scope.row[column.dataIndex || column.key], column.valueEnum)"
                >
                  {{ getOptionText(scope.row[column.dataIndex || column.key], column.valueEnum) }}
                </el-tag>

                <!-- 日期格式化 -->
                <span v-else-if="column.valueType === 'date'">
                  {{ formatDate(scope.row[column.dataIndex || column.key]) }}
                </span>

                <!-- 日期时间格式化 -->
                <span v-else-if="column.valueType === 'dateTime'">
                  {{ formatDateTime(scope.row[column.dataIndex || column.key]) }}
                </span>

                <!-- 金额格式化 -->
                <span v-else-if="column.valueType === 'money'">
                  ¥{{ formatMoney(scope.row[column.dataIndex || column.key]) }}
                </span>

                <!-- 百分比 -->
                <span v-else-if="column.valueType === 'percent'">
                  {{ (scope.row[column.dataIndex || column.key] * 100).toFixed(2) }}%
                </span>

                <!-- 默认文本 -->
                <span v-else>
                  {{ scope.row[column.dataIndex || column.key] || '-' }}
                </span>
              </template>
            </template>
          </el-table-column>
        </template>

        <!-- 操作列 -->
        <el-table-column 
          v-if="$slots.actions || actions.length > 0"
          label="操作"
          :width="actionColumn?.width || 150"
          :fixed="actionColumn?.fixed || 'right'"
          :align="actionColumn?.align || 'center'"
          :header-align="actionColumn?.headerAlign || actionColumn?.align || 'center'"
        >
          <template #default="scope">
            <slot name="actions" :record="scope.row" :index="scope.$index">
              <div class="table-actions">
                <template v-for="action in getRowActions(scope.row)" :key="action.key">
                  <el-button
                    :type="action.type || 'text'"
                    :size="action.size || 'small'"
                    :danger="action.danger"
                    :disabled="action.disabled && action.disabled(scope.row)"
                    @click="action.onClick?.(scope.row, scope.$index)"
                  >
                    {{ action.text }}
                  </el-button>
                  <el-divider direction="vertical" v-if="action.divider" />
                </template>
              </div>
            </slot>
          </template>
        </el-table-column>

        <!-- 空状态 -->
        <template #empty>
          <el-empty :description="emptyText" />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pro-table-pagination" v-if="pagination !== false">
        <el-pagination
          v-model:current-page="paginationState.current"
          v-model:page-size="paginationState.pageSize"
          :total="paginationState.total"
          :page-sizes="paginationState.pageSizes"
          :layout="paginationLayout"
          :background="true"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '@/utils/date'

// Props定义
const props = defineProps({
  // 数据请求
  request: {
    type: Function,
    required: true
  },
  
  // 列配置
  columns: {
    type: Array,
    required: true
  },

  // 行键
  rowKey: {
    type: [String, Function],
    default: 'id'
  },

  // 分页配置
  pagination: {
    type: [Object, Boolean],
    default: () => ({
      current: 1,
      pageSize: 20,
      total: 0,
      pageSizes: [10, 20, 50, 100],
      showSizeChanger: true,
      showQuickJumper: true
    })
  },

  // 搜索配置
  search: {
    type: [Object, Boolean],
    default: true
  },

  // 工具栏配置
  toolBar: {
    type: [Object, Boolean],
    default: true
  },

  // 行选择配置
  rowSelection: {
    type: [Object, Boolean],
    default: false
  },

  // 批量操作
  batchActions: {
    type: Array,
    default: () => []
  },

  // 行操作
  actions: {
    type: Array,
    default: () => []
  },

  // 操作列配置
  actionColumn: {
    type: Object,
    default: () => ({ width: 150, fixed: 'right' })
  },

  // 表格配置
  stripe: {
    type: Boolean,
    default: true
  },
  border: {
    type: Boolean,
    default: true
  },
  height: [String, Number],
  maxHeight: [String, Number],
  
  // 显示序号
  showIndex: {
    type: Boolean,
    default: false
  },

  // 序号方法
  indexMethod: Function,

  // 空状态文本
  emptyText: {
    type: String,
    default: '暂无数据'
  },

  // 标签宽度
  labelWidth: {
    type: String,
    default: '80px'
  },

  // 默认搜索项数量
  defaultSearchCount: {
    type: Number,
    default: 3
  },

  // 分页布局
  paginationLayout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper'
  },

  // 自动请求
  autoRequest: {
    type: Boolean,
    default: true
  },

  // 参数
  params: {
    type: Object,
    default: () => ({})
  }
})

// 事件定义
const emit = defineEmits([
  'load',
  'requestError',
  'change',
  'row-click',
  'row-dblclick',
  'selection-change',
  'create'
])

// 响应式数据
const tableRef = ref()
const searchFormRef = ref()
const loading = ref(false)
const tableData = ref([])
const searchForm = reactive({})
const selectedRowKeys = ref([])
const selectedRows = ref([])
const searchExpanded = ref(false)
const density = ref('default')

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

    const params = {
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
          : Array.isArray(response?.records)
            ? response.records
            : []
    tableData.value = resolvedData

    const totalValue = response.total ?? response?.data?.total ?? response?.data?.totalCount ?? response?.data?.count
    if (typeof totalValue === 'number') {
      paginationState.total = totalValue
    } else if (response.pagination) {
      paginationState.total = response.pagination.total ?? paginationState.total
    }

    if (typeof response.page === 'number') {
      paginationState.current = response.page
    } else if (typeof response?.data?.page === 'number') {
      paginationState.current = response.data.page
    } else if (response.pagination) {
      if (typeof response.pagination.page === 'number') {
        paginationState.current = response.pagination.page
      } else if (typeof response.pagination.current === 'number') {
        paginationState.current = response.pagination.current
      }
    }

    if (typeof response.pageSize === 'number') {
      paginationState.pageSize = response.pageSize
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
  } catch (error) {
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

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
  selectedRowKeys.value = selection.map(row => 
    typeof props.rowKey === 'function' ? props.rowKey(row) : row[props.rowKey]
  )
  emit('selection-change', selectedRowKeys.value, selectedRows.value)
}

const handleSortChange = ({ prop, order }) => {
  const params = {
    sorter: prop,
    order: order === 'ascending' ? 'ascend' : 'descend'
  }
  Object.assign(searchForm, params)
  loadData()
}

const handlePageChange = (page) => {
  paginationState.current = page
  loadData()
}

const handleSizeChange = (size) => {
  paginationState.pageSize = size
  paginationState.current = 1
  loadData()
}


const onRowClick = (row, column, event) => {
  emit('row-click', row, column, event)
}

const onRowDblClick = (row, column, event) => {
  emit('row-dblclick', row, column, event)
}

const getRowActions = (record) => {
  return props.actions.filter(action => {
    if (typeof action.show === 'function') {
      return action.show(record)
    }
    return action.show !== false
  })
}


// 格式化方法
const formatDate = (date) => {
  const formatted = formatDateUtil(date)
  return formatted || '-'
}

const formatDateTime = (date) => {
  const formatted = formatDateTimeUtil(date)
  return formatted || '-'
}

const formatMoney = (amount) => {
  if (amount === null || amount === undefined) return '0.00'
  return Number(amount).toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

const getOptionText = (value, valueEnum) => {
  const option = valueEnum.find(item => item.value === value)
  return option?.label || value || '-'
}

const getOptionType = (value, valueEnum) => {
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
defineExpose({
  reload: loadData,
  refresh: handleRefresh,
  reset: handleReset,
  clearSelection: () => tableRef.value?.clearSelection(),
  toggleRowSelection: (row, selected) => tableRef.value?.toggleRowSelection(row, selected),
  getTableData: () => tableData.value,
  getSelectedRows: () => selectedRows.value,
  getSelectedRowKeys: () => selectedRowKeys.value
})
</script>

<style lang="scss" scoped>
.pro-table {
  .search-card {
    margin-bottom: 16px;
    border: 1px solid var(--el-border-color-light);
    
    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .search-form {
    :deep(.el-form-item) {
      margin-bottom: 16px;
      margin-right: 16px;
    }

    .search-actions {
      margin-left: auto;
    }
  }

  .pro-table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0 16px 0 !important;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;

      .table-title h3 {
        margin: 0;
        font-weight: 500;
      }

      .batch-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    .toolbar-right {
      display: flex;
      gap: 4px;
    }
  }

  .pro-table-content {
    background: var(--el-bg-color);
    border-radius: 6px;
    overflow: hidden;
    
    :deep(.el-table) {
      width: 100%;
      table-layout: fixed;
      
      .el-table__header-wrapper,
      .el-table__body-wrapper {
        width: 100% !important;
      }
      
      .el-table__header,
      .el-table__body {
        width: 100% !important;
      }
      
      // 确保列占满整个表格宽度
      .el-table__cell {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center !important;
        color: var(--el-text-color-primary) !important;
        font-size: 14px !important;
        
        .cell {
          text-align: center !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          color: var(--el-text-color-primary) !important;
          font-size: 14px !important;
        }
      }
      
      // 表格头部文字居中
      .el-table__header-wrapper {
        .el-table__cell {
          text-align: center !important;
          
          .cell {
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
        }
      }
      
      // 表格内容居中
      .el-table__body-wrapper {
        .el-table__cell {
          text-align: center !important;
          
          .cell {
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
        }
      }
      
      // 强制所有表格头部居中
      thead {
        th {
          text-align: center !important;
          
          .cell {
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            
            // 排序图标样式调整
            .caret-wrapper {
              margin-left: 4px !important;
              position: relative !important;
              top: 0 !important;
            }
          }
        }
      }
      
      // 强制所有表格内容居中
      tbody {
        td {
          text-align: center !important;
          
          .cell {
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
        }
      }
      
      // 对于没有设置宽度的列，让其自动占满剩余空间
      .el-table__body .el-table-column--selection {
        width: 50px;
      }
    }
  }

  // 操作列按钮居中显示 - 针对Element Plus动态生成的精确类名
  :deep(td.el-table-fixed-column--right.is-first-column.el-table__cell),
  :deep(td[class*="el-table_"][class*="_column_"].el-table-fixed-column--right.is-first-column.el-table__cell) {
    text-align: center !important;
  }
  
  :deep(td.el-table-fixed-column--right.is-first-column.el-table__cell .cell),
  :deep(td[class*="el-table_"][class*="_column_"].el-table-fixed-column--right.is-first-column.el-table__cell .cell) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    width: 100% !important;
  }
  
  :deep(td.el-table-fixed-column--right.is-first-column.el-table__cell .table-actions),
  :deep(td[class*="el-table_"][class*="_column_"].el-table-fixed-column--right.is-first-column.el-table__cell .table-actions) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    gap: 8px !important;
  }

  // 使用最高优先级覆盖Element Plus样式 - 通过内联样式级别的优先级
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td:last-child),
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td.el-table-fixed-column--right:last-child),
  :deep(.el-table__body tr td:last-child),
  :deep(.el-table__body tr td.el-table-fixed-column--right:last-child),
  :deep(.el-table__body tr td.el-table-fixed-column--right.el-table__cell:last-child),
  :deep(.el-table__body tr td[class*="el-table_"][class*="_column_"]:last-child) {
    text-align: center !important;
  }
  
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td:last-child .cell),
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td.el-table-fixed-column--right:last-child .cell),
  :deep(.el-table__body tr td:last-child .cell),
  :deep(.el-table__body tr td.el-table-fixed-column--right:last-child .cell),
  :deep(.el-table__body tr td.el-table-fixed-column--right.el-table__cell:last-child .cell),
  :deep(.el-table__body tr td[class*="el-table_"][class*="_column_"]:last-child .cell) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    width: 100% !important;
  }
  
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td:last-child .table-actions),
  :deep(.el-table .el-table__body-wrapper .el-table__body tr td.el-table-fixed-column--right:last-child .table-actions),
  :deep(.el-table__body tr td:last-child .table-actions),
  :deep(.el-table__body tr td.el-table-fixed-column--right:last-child .table-actions),
  :deep(.el-table__body tr td.el-table-fixed-column--right.el-table__cell:last-child .table-actions),
  :deep(.el-table__body tr td[class*="el-table_"][class*="_column_"]:last-child .table-actions) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    gap: 8px !important;
  }

  .pro-table :deep(.table-actions) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    
    .el-button {
      padding: 2px 4px !important;
      min-width: auto !important;
      margin: 0 2px !important;
    }
    
    .el-button.el-button--text {
      padding: 0 !important;
      margin: 0 2px !important;
      font-size: 13px !important;
    }
    
    .el-button + .el-button {
      margin-left: 6px !important;
    }
  }

  .pro-table-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 20px;
    background: var(--el-fill-color-blank);
    border-top: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-primary);

    :deep(.el-pagination) {
      --el-pagination-text-color: var(--el-text-color-primary);
      --el-pagination-bg-color: var(--el-fill-color-blank);
      --el-pagination-button-color: var(--el-text-color-regular);
      --el-pagination-button-bg-color: var(--el-fill-color);
      --el-pagination-button-hover-color: var(--el-color-primary);
      --el-pagination-button-hover-bg-color: var(--el-color-primary-light-9);
    }

    :deep(.el-pagination .el-pager li.is-active) {
      color: #ffffff !important;
      background-color: var(--el-color-primary) !important;
    }

    :deep(.el-pagination .el-pager li:hover:not(.is-active)) {
      color: var(--el-color-primary) !important;
      background-color: var(--el-color-primary-light-9) !important;
    }
  }

  .column-settings {
    .column-item {
      padding: 8px 0;
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:last-child {
        border-bottom: none;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .pro-table {
    .pro-table-toolbar {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
        justify-content: space-between;
      }
    }

    .search-form {
      :deep(.el-form-item) {
        width: 100%;
        margin-right: 0;
      }
    }

    .pro-table-pagination {
      justify-content: center;
    }
  }
}
</style>