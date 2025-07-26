<template>
  <div class="data-table">
    <!-- 表格工具栏 -->
    <div class="table-toolbar" v-if="showToolbar">
      <div class="toolbar-left">
        <el-checkbox v-if="selectable" v-model="selectAll" :indeterminate="isIndeterminate" @change="handleSelectAll">
          全选
        </el-checkbox>

        <slot name="toolbar-left" :selected="selectedRows">
          <template v-if="batchActions.length > 0">
            <el-button
              v-for="action in batchActions"
              :key="action.key"
              :type="action.type || 'primary'"
              :disabled="selectedRows.length === 0"
              @click="handleBatchAction(action)"
              size="small"
            >
              <el-icon v-if="action.icon">
                <component :is="action.icon" />
              </el-icon>
              {{ action.label }}
            </el-button>
          </template>
        </slot>
      </div>

      <div class="toolbar-right">
        <slot name="toolbar-right">
          <el-tooltip content="刷新数据">
            <el-button icon="Refresh" @click="handleRefresh" :loading="loading" />
          </el-tooltip>

          <el-tooltip content="列设置" v-if="columnSettings">
            <el-button icon="Setting" @click="showColumnDialog = true" />
          </el-tooltip>

          <el-tooltip content="导出数据" v-if="exportable">
            <el-button icon="Download" @click="handleExport" />
          </el-tooltip>
        </slot>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="data"
      :stripe="stripe"
      :border="border"
      :height="height"
      :max-height="maxHeight"
      :size="size"
      :row-key="rowKey"
      :default-expand-all="defaultExpandAll"
      :tree-props="treeProps"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
      @row-dblclick="handleRowDblClick"
      v-bind="$attrs"
    >
      <!-- 选择列 -->
      <el-table-column v-if="selectable" type="selection" width="50" fixed="left" :selectable="selectableFunction" />

      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        label="序号"
        type="index"
        width="60"
        :fixed="indexFixed ? 'left' : false"
        :index="indexMethod"
      />

      <!-- 动态列 -->
      <template v-for="column in visibleColumns" :key="column.prop || column.key">
        <el-table-column
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          :sortable="column.sortable"
          :show-overflow-tooltip="column.showOverflowTooltip !== false"
          :align="column.align || 'left'"
          :header-align="column.headerAlign || column.align || 'left'"
          :formatter="column.formatter"
          :class-name="column.className"
        >
          <template #default="scope" v-if="column.slot || column.render">
            <!-- 插槽渲染 -->
            <slot
              v-if="column.slot"
              :name="column.slot"
              :row="scope.row"
              :column="scope.column"
              :$index="scope.$index"
            />

            <!-- 渲染函数 -->
            <component
              v-else-if="column.render"
              :is="column.render"
              :row="scope.row"
              :column="scope.column"
              :index="scope.$index"
            />
          </template>

          <template #header="scope" v-if="column.headerSlot">
            <slot :name="column.headerSlot" :column="scope.column" :$index="scope.$index" />
          </template>
        </el-table-column>
      </template>

      <!-- 操作列 -->
      <el-table-column
        v-if="actions.length > 0 || $slots.actions"
        label="操作"
        :width="actionWidth"
        :fixed="actionFixed ? 'right' : false"
        class-name="action-column"
      >
        <template #default="scope">
          <slot name="actions" :row="scope.row" :index="scope.$index">
            <div class="action-buttons">
              <template v-for="action in getRowActions(scope.row)" :key="action.key">
                <!-- 按钮类型操作 -->
                <el-button
                  v-if="action.type === 'button'"
                  :type="action.buttonType || 'primary'"
                  :size="action.size || 'small'"
                  :link="action.link"
                  :disabled="action.disabled && action.disabled(scope.row)"
                  @click="handleAction(action, scope.row, scope.$index)"
                >
                  <el-icon v-if="action.icon">
                    <component :is="action.icon" />
                  </el-icon>
                  {{ action.label }}
                </el-button>

                <!-- 下拉菜单类型操作 -->
                <el-dropdown
                  v-else-if="action.type === 'dropdown'"
                  @command="command => handleDropdownAction(command, scope.row, scope.$index)"
                >
                  <el-button :size="action.size || 'small'">
                    {{ action.label }}
                    <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="item in action.items"
                        :key="item.key"
                        :command="item.key"
                        :disabled="item.disabled && item.disabled(scope.row)"
                        :divided="item.divided"
                      >
                        <el-icon v-if="item.icon">
                          <component :is="item.icon" />
                        </el-icon>
                        {{ item.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </div>
          </slot>
        </template>
      </el-table-column>

      <!-- 空数据插槽 -->
      <template #empty>
        <slot name="empty">
          <el-empty :description="emptyText" />
        </slot>
      </template>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper" v-if="pagination && data.length > 0">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        :layout="paginationLayout"
        :background="paginationBackground"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 列设置对话框 -->
    <el-dialog v-if="columnSettings" v-model="showColumnDialog" title="列设置" width="400px">
      <el-checkbox-group v-model="visibleColumnKeys">
        <div class="column-settings">
          <el-checkbox
            v-for="column in columns"
            :key="column.prop || column.key"
            :label="column.prop || column.key"
            :disabled="column.required"
          >
            {{ column.label }}
          </el-checkbox>
        </div>
      </el-checkbox-group>

      <template #footer>
        <el-button @click="showColumnDialog = false">取消</el-button>
        <el-button type="primary" @click="applyColumnSettings">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

// Props 定义
const props = defineProps({
  // 数据相关
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },

  // 列配置
  columns: {
    type: Array,
    default: () => []
  },

  // 表格样式
  stripe: {
    type: Boolean,
    default: true
  },
  border: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'default'
  },
  height: [String, Number],
  maxHeight: [String, Number],

  // 选择功能
  selectable: {
    type: Boolean,
    default: false
  },
  selectableFunction: Function,
  rowKey: String,

  // 序号列
  showIndex: {
    type: Boolean,
    default: false
  },
  indexFixed: {
    type: Boolean,
    default: false
  },
  indexMethod: Function,

  // 操作列
  actions: {
    type: Array,
    default: () => []
  },
  actionWidth: {
    type: [String, Number],
    default: 200
  },
  actionFixed: {
    type: Boolean,
    default: true
  },

  // 批量操作
  batchActions: {
    type: Array,
    default: () => []
  },

  // 工具栏
  showToolbar: {
    type: Boolean,
    default: true
  },
  columnSettings: {
    type: Boolean,
    default: true
  },
  exportable: {
    type: Boolean,
    default: false
  },

  // 分页
  pagination: {
    type: Boolean,
    default: true
  },
  total: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 20
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  paginationLayout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper'
  },
  paginationBackground: {
    type: Boolean,
    default: true
  },

  // 树形数据
  defaultExpandAll: {
    type: Boolean,
    default: false
  },
  treeProps: Object,

  // 其他
  emptyText: {
    type: String,
    default: '暂无数据'
  }
})

// 事件定义
const emit = defineEmits([
  'selection-change',
  'sort-change',
  'row-click',
  'row-dblclick',
  'page-change',
  'size-change',
  'refresh',
  'export',
  'action',
  'batch-action',
  'update:current-page',
  'update:page-size'
])

// 响应式数据
const tableRef = ref()
const selectedRows = ref([])
const selectAll = ref(false)
const isIndeterminate = ref(false)
const showColumnDialog = ref(false)
const visibleColumnKeys = ref([])

// 计算属性
const visibleColumns = computed(() => {
  if (!props.columnSettings) return props.columns
  return props.columns.filter(column => {
    const key = column.prop || column.key
    return visibleColumnKeys.value.includes(key)
  })
})

const getRowActions = row => {
  return props.actions.filter(action => {
    if (action.show && typeof action.show === 'function') {
      return action.show(row)
    }
    return true
  })
}

// 方法
const handleSelectionChange = selection => {
  selectedRows.value = selection
  const selectedCount = selection.length
  const totalCount = props.data.length

  selectAll.value = selectedCount === totalCount && totalCount > 0
  isIndeterminate.value = selectedCount > 0 && selectedCount < totalCount

  emit('selection-change', selection)
}

const handleSelectAll = checked => {
  if (checked) {
    tableRef.value.toggleAllSelection()
  } else {
    tableRef.value.clearSelection()
  }
}

const handleSortChange = sortInfo => {
  emit('sort-change', sortInfo)
}

const handleRowClick = (row, column, event) => {
  emit('row-click', row, column, event)
}

const handleRowDblClick = (row, column, event) => {
  emit('row-dblclick', row, column, event)
}

const handlePageChange = page => {
  emit('update:current-page', page)
  emit('page-change', page)
}

const handleSizeChange = size => {
  emit('update:page-size', size)
  emit('size-change', size)
}

const handleRefresh = () => {
  emit('refresh')
}

const handleExport = () => {
  emit('export')
}

const handleAction = (action, row, index) => {
  emit('action', { action: action.key, row, index })
}

const handleDropdownAction = (command, row, index) => {
  emit('action', { action: command, row, index })
}

const handleBatchAction = action => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要操作的数据')
    return
  }
  emit('batch-action', { action: action.key, rows: selectedRows.value })
}

const applyColumnSettings = () => {
  showColumnDialog.value = false
  ElMessage.success('列设置已保存')
}

// 公开方法
const clearSelection = () => {
  tableRef.value?.clearSelection()
}

const toggleRowSelection = (row, selected) => {
  tableRef.value?.toggleRowSelection(row, selected)
}

const toggleAllSelection = () => {
  tableRef.value?.toggleAllSelection()
}

const setCurrentRow = row => {
  tableRef.value?.setCurrentRow(row)
}

const sort = (prop, order) => {
  tableRef.value?.sort(prop, order)
}

const scrollTo = options => {
  tableRef.value?.scrollTo(options)
}

// 监听器
watch(
  () => props.columns,
  newColumns => {
    visibleColumnKeys.value = newColumns.filter(column => !column.hidden).map(column => column.prop || column.key)
  },
  { immediate: true }
)

// 暴露方法
defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  setCurrentRow,
  sort,
  scrollTo,
  tableRef
})
</script>

<style lang="scss" scoped>
.data-table {
  .table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-light);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toolbar-right {
      display: flex;
      gap: 8px;
    }
  }

  :deep(.el-table) {
    border-radius: 8px;

    .action-column {
      .action-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
    }
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-light);
  }

  .column-settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .data-table {
    .table-toolbar {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
        justify-content: space-between;
      }
    }

    .pagination-wrapper {
      :deep(.el-pagination) {
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
      }
    }

    .column-settings {
      grid-template-columns: 1fr;
    }
  }
}
</style>
