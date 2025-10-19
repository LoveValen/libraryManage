<template>
  <div class="borrows-container">

    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 借阅记录表格 -->
    <div class="table-section">
      <el-card shadow="never" class="table-card">
        <!-- 数据表格 -->
        <ProTable
          ref="proTableRef"
          :request="requestBorrows"
          :columns="borrowTableColumns"
          :row-selection="{ type: 'checkbox' }"
          :search="false"
          :toolBar="borrowToolBarConfig"
          :action-column="{ width: 200, fixed: 'right', align: 'center' }"
          :params="borrowSearchParams"
          :max-height="finalTableHeight"
          row-key="id"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <!-- 工具栏插槽 -->
          <template #toolBarRender="{ selectedRowKeys, selectedRows }">
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <!-- 左侧操作按钮 -->
              <div style="display: flex; gap: 8px;">
                <!-- 新增借阅按钮 -->
                <el-button type="primary" @click="showBorrowDialog = true">
                  新增借阅
                </el-button>
                
                <!-- 批量操作按钮（始终显示，无选中项时禁用） -->
                <el-button 
                  type="success" 
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleBatchReturnFromTable(selectedRows)"
                >
                  批量归还
                </el-button>
                <el-button 
                  type="warning" 
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleBatchRenewFromTable(selectedRows)"
                >
                  批量续借
                </el-button>
                
                <!-- 常规工具栏按钮 -->
                <el-button type="info" :icon="TrendCharts" @click="showTrendsDialog = true">
                  借阅趋势
                </el-button>
                <el-button type="warning" :icon="Warning" @click="showOverdueDialog = true">
                  逾期管理
                </el-button>
                <el-button type="success" :icon="Download" @click="exportBorrows">
                  导出数据
                </el-button>
              </div>
              
              <!-- 右侧工具按钮 -->
              <div style="display: flex; gap: 8px;">
                <el-tooltip content="刷新数据" placement="top">
                  <el-button :icon="Refresh" @click="handleRefresh" :loading="loading" />
                </el-tooltip>
                <el-tooltip content="列设置" placement="top">
                  <el-button :icon="Setting" @click="openColumnSettings" />
                </el-tooltip>
              </div>
            </div>
          </template>
          <!-- 用户信息插槽 -->
          <template #user="{ record }">
            <div class="user-info">
              <el-avatar :src="record.user?.avatar" :size="32" class="user-avatar">
                {{ record.user?.realName?.charAt(0) || record.user?.username?.charAt(0) }}
              </el-avatar>
              <div class="user-details">
                <div class="user-name">{{ record.user?.realName || record.user?.username }}</div>
                <div class="user-meta">{{ record.user?.email }}</div>
              </div>
            </div>
          </template>

          <!-- 图书信息插槽 -->
          <template #book="{ record }">
            <div class="book-info">
              <el-image
                :src="record.book?.coverImage"
                :preview-src-list="[record.book?.coverImage]"
                class="book-cover"
                fit="cover"
              >
                <template #error>
                  <div class="book-cover-placeholder">
                    <el-icon><Reading /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="book-details">
                <div class="book-title">{{ record.book?.title }}</div>
                <div class="book-meta">
                  作者: {{ Array.isArray(record.book?.authors) ? record.book.authors.join(', ') : record.book?.authors }}
                </div>
                <div class="book-meta">ISBN: {{ record.book?.isbn }}</div>
              </div>
            </div>
          </template>

          <!-- 状态插槽 -->
          <template #status="{ record }">
            <StatusTag :status="record.status" :status-map="borrowStatusConfig" :show-icon="true" />
            <div v-if="record.isCurrentlyOverdue" class="overdue-info">
              <el-tag type="danger" size="small" class="mt-1">逾期 {{ record.currentOverdueDays }} 天</el-tag>
            </div>
          </template>

          <!-- 借阅时间插槽 -->
          <template #borrowDate="{ record }">
            <div class="date-info">
              <div>{{ formatDate(record.borrowDate) }}</div>
              <div class="date-meta">{{ formatRelativeTime(record.borrowDate) }}</div>
            </div>
          </template>

          <!-- 应还时间插槽 -->
          <template #dueDate="{ record }">
            <div class="date-info">
              <div :class="getDueDateClass(record)">
                {{ formatDate(record.dueDate) }}
              </div>
              <div class="date-meta">
                <span v-if="record.status === 'borrowed'" :class="getDaysRemainingClass(record)">
                  {{ getDaysRemainingText(record) }}
                </span>
                <span v-else>-</span>
              </div>
            </div>
          </template>

          <!-- 归还时间插槽 -->
          <template #returnDate="{ record }">
            <div v-if="record.returnDate" class="date-info">
              <div>{{ formatDate(record.returnDate) }}</div>
              <div class="date-meta">{{ formatRelativeTime(record.returnDate) }}</div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>

          <!-- 续借次数插槽 -->
          <template #renewal="{ record }">
            <el-tag :type="getRenewalTagType(record.renewalCount, record.maxRenewals)" size="small">
              {{ record.renewalCount }}/{{ record.maxRenewals }}
            </el-tag>
          </template>

          <!-- 操作插槽 -->
          <template #actions="{ record }">
            <div class="row-actions">
              <el-button 
                v-if="record.status === 'borrowed'" 
                type="text" 
                size="small" 
                @click="handleQuickReturn(record)"
              >
                归还
              </el-button>
              <el-button 
                v-if="record.status === 'borrowed' && record.renewalCount < record.maxRenewals" 
                type="text" 
                size="small" 
                @click="handleRenew(record)"
              >
                续借
              </el-button>
              <el-button 
                v-if="record.isCurrentlyOverdue" 
                type="text" 
                size="small" 
                @click="handleSendReminder(record)"
              >
                催还
              </el-button>
              <el-dropdown @command="(cmd) => handleMoreActions(cmd, record)">
                <el-button size="small" type="text">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="detail">查看详情</el-dropdown-item>
                    <el-dropdown-item command="history">借阅历史</el-dropdown-item>
                    <el-dropdown-item v-if="record.status === 'borrowed'" command="markLost">标记丢失</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </ProTable>
      </el-card>
    </div>

    <!-- 新增借阅对话框 -->
    <el-dialog v-model="showBorrowDialog" title="新增借阅" width="600px" :close-on-click-modal="false">
      <BorrowForm v-if="showBorrowDialog" @success="handleBorrowSuccess" @cancel="showBorrowDialog = false" />
    </el-dialog>

    <!-- 快速归还对话框 -->
    <QuickReturnDialog v-model="showQuickReturnDialog" @success="handleQuickReturnSuccess" />

    <!-- 逾期管理对话框 -->
    <OverdueDialog v-model="showOverdueDialog" />

    <!-- 借阅趋势对话框 -->
    <TrendsDialog v-model="showTrendsDialog" />
    
    <!-- 列设置对话框 -->
    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  DocumentCopy,
  Plus,
  RefreshRight,
  Clock,
  TrendCharts,
  List,
  Refresh,
  Download,
  Lightning,
  View,
  RefreshLeft,
  Check,
  MoreFilled,
  Warning,
  Bell,
  Timer,
  Reading,
  Setting,
  ArrowDown,
  ArrowUp,
  Rank
} from '@element-plus/icons-vue'
import { StatusTag, ProTable, ColumnSettings } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import BorrowForm from './components/BorrowForm.vue'
import QuickReturnDialog from './components/QuickReturnDialog.vue'
import OverdueDialog from './components/OverdueDialog.vue'
import TrendsDialog from './components/TrendsDialog.vue'
import {
  getBorrows,
  getBorrowStatistics,
  returnBook,
  renewBook,
  markBookAsLost,
  batchProcessBorrows
} from '@/api/borrows'
import { formatDate, formatRelativeTime } from '@/utils/date'
import { applyDateRangeToParams } from '@/utils/dateRangeHelper'
import { extractListResponse } from '@/utils/apiResponse'
import { showSuccess, showError, confirmDelete, confirmBatchAction } from '@/utils/message'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

// 响应式数据
const router = useRouter()
const loading = ref(false)
const selectedBorrows = ref([])
const selectedRecord = ref(null)
const showBorrowDialog = ref(false)
const showQuickReturnDialog = ref(false)
const showOverdueDialog = ref(false)
const showTrendsDialog = ref(false)
const proTableRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  userId: '',
  bookId: '',
  isOverdue: '',
  startDate: '',
  endDate: '',
  sortBy: 'borrow_date',
  sortOrder: 'desc'
})


// 所有可用的列配置
const allBorrowTableColumns = [
  {
    key: 'user',
    title: '借阅用户',
    slot: 'user',
    minWidth: 180,
    align: 'center'
  },
  {
    key: 'book',
    title: '图书信息',
    slot: 'book',
    minWidth: 220,
    align: 'center'
  },
  {
    key: 'status',
    title: '状态',
    slot: 'status',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'borrowDate',
    title: '借阅时间',
    slot: 'borrowDate',
    minWidth: 140,
    sorter: true,
    align: 'center'
  },
  {
    key: 'dueDate',
    title: '应还时间',
    slot: 'dueDate',
    minWidth: 140,
    sorter: true,
    align: 'center'
  },
  {
    key: 'returnDate',
    title: '归还时间',
    slot: 'returnDate',
    minWidth: 140,
    sorter: true,
    align: 'center'
  },
  {
    key: 'renewalCount',
    title: '续借次数',
    slot: 'renewal',
    minWidth: 90,
    align: 'center'
  },
  {
    key: 'actions',
    title: '操作',
    slot: 'actions',
    minWidth: 180,
    fixed: 'right'
  }
]

// 搜索参数
const borrowSearchParams = ref({})

// 默认列设置配置
const defaultVisibleColumns = [
  'user',
  'book',
  'status',
  'borrowDate',
  'dueDate',
  'returnDate'
]

const defaultColumnOptions = [
  { label: '借阅用户', value: 'user', required: true },
  { label: '图书信息', value: 'book', required: true },
  { label: '状态', value: 'status' },
  { label: '借阅时间', value: 'borrowDate' },
  { label: '应还时间', value: 'dueDate' },
  { label: '归还时间', value: 'returnDate' },
  { label: '续借次数', value: 'renewalCount' },
  { label: '操作', value: 'actions', required: true }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('borrow', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 180, // 搜索区域 + 工具栏
  footerOffset: 80   // 分页区域
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

// 动态过滤的表格列配置（计算属性）
const borrowTableColumns = computed(() => {
  return allBorrowTableColumns.filter(column =>
    visibleColumns.value.includes(column.key)
  )
})



// 搜索字段配置（基于 ProForm 设计）
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入用户姓名、图书标题或ISBN搜索',
    clearable: true
  },
  {
    name: 'status',
    valueType: 'select',
    label: '借阅状态',
    placeholder: '选择借阅状态',
    options: [
      { label: '借阅中', value: 'borrowed' },
      { label: '已归还', value: 'returned' },
      { label: '逾期未还', value: 'overdue' },
      { label: '图书丢失', value: 'lost' },
      { label: '图书损坏', value: 'damaged' }
    ]
  },
  {
    name: 'isOverdue',
    valueType: 'select',
    label: '逾期状态',
    placeholder: '选择逾期状态',
    options: [
      { label: '正常借阅', value: 'false' },
      { label: '已经逾期', value: 'true' }
    ]
  },
  {
    name: 'dateRange',
    valueType: 'dateRange',
    label: '借阅时间',
    placeholder: ['开始日期', '结束日期']
  }
]


// 借阅状态配置 
const borrowStatusConfig = {
  borrowed: { text: '借阅中', type: 'success', icon: 'Reading' },
  returned: { text: '已归还', type: 'info', icon: 'Check' },
  overdue: { text: '逾期', type: 'danger', icon: 'Warning' },
  lost: { text: '丢失', type: 'danger', icon: 'Close' },
  damaged: { text: '损坏', type: 'warning', icon: 'Warning' }
}

// 计算属性
const canBatchReturn = computed(() => {
  return selectedBorrows.value.some(borrow => ['borrowed', 'overdue'].includes(borrow.status))
})

const canBatchRenew = computed(() => {
  return selectedBorrows.value.some(borrow => borrow.status === 'borrowed' && borrow.canRenew)
})

const canBatchReturnCount = computed(() => {
  return selectedBorrows.value.filter(borrow => ['borrowed', 'overdue'].includes(borrow.status)).length
})

const canBatchRenewCount = computed(() => {
  return selectedBorrows.value.filter(borrow => borrow.status === 'borrowed' && borrow.canRenew).length
})

// 数据加载方法
const loadData = () => {
  proTableRef.value?.refresh()
}

// ProTable数据请求函数
const requestBorrows = async (params) => {
  try {
    loading.value = true

    const requestParams = {
      page: params.current || 1,
      limit: params.pageSize || 20,
      sortBy: params.sorter || 'borrow_date',
      sortOrder: params.order === 'ascend' ? 'asc' : 'desc',
      ...borrowSearchParams.value
    }

    const response = await getBorrows(requestParams)
    const meta = extractListResponse(response)
    const list = Array.isArray(meta.list) ? meta.list : []
    const total = typeof meta.total === 'number' ? meta.total : list.length
    const currentPage = typeof meta.page === 'number' && Number.isFinite(meta.page) ? meta.page : requestParams.page
    const size = typeof meta.pageSize === 'number' && Number.isFinite(meta.pageSize) ? meta.pageSize : requestParams.limit

    return {
      success: true,
      data: list,
      total,
      current: currentPage,
      pageSize: size
    }
  } catch (error) {
    console.error('获取借阅记录失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  } finally {
    loading.value = false
  }
}




const handleSearch = (searchData) => {
  const params = { ...searchData }
  applyDateRangeToParams(params)
  borrowSearchParams.value = params
  proTableRef.value?.refresh()
}

const handleReset = () => {
  // Clear search form data
  Object.keys(searchForm).forEach(key => {
    if (key === 'dateRange') {
      searchForm[key] = []
    } else if (key === 'sortBy') {
      searchForm[key] = 'borrow_date'
    } else if (key === 'sortOrder') {
      searchForm[key] = 'desc'
    } else {
      searchForm[key] = ''
    }
  })
  // Clear search params
  borrowSearchParams.value = {}
  // Refresh ProTable
  proTableRef.value?.refresh()
}

const handleSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedBorrows.value = selectedRows
}


const clearSelection = () => {
  selectedBorrows.value = []
  proTableRef.value?.clearSelection()
}

// 行操作方法
const handleQuickReturn = (record) => {
  selectedRecord.value = record
  showQuickReturnDialog.value = true
}

const handleRenew = async (record) => {
  try {
    const confirmed = await confirmDelete(1, '图书', `确定要为用户续借图书"${record.book.title}"吗？`)
    if (!confirmed) return

    await renewBook(record.id)
    showSuccess('续借成功')
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('续借失败:', error)
    showError(error.message || '续借失败')
  }
}

const handleSendReminder = async (record) => {
  try {
    // 这里应该调用发送催还通知的API
    showSuccess(`已向用户 ${record.user.realName || record.user.username} 发送催还通知`)
  } catch (error) {
    console.error('发送催还通知失败:', error)
    showError(error.message || '发送催还通知失败')
  }
}

const handleMoreActions = (command, record) => {
  switch (command) {
    case 'detail':
      viewBorrowDetail(record)
      break
    case 'history':
      router.push(`/borrows/history/${record.userId}`)
      break
    case 'markLost':
      markBorrowAsLost(record)
      break
  }
}

const viewBorrowDetail = borrow => {
  router.push({
    name: 'BorrowDetail',
    params: { id: borrow.id }
  })
}

const returnBorrow = async borrow => {
  try {
    const confirmed = await confirmDelete(1, '图书', `确定要归还图书"${borrow.book.title}"吗？`)
    if (!confirmed) return

    await returnBook(borrow.id, { condition: 'good' })
    ElNotification.success({
      title: '归还成功',
      message: `图书"${borrow.book.title}"已成功归还`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    console.error('归还图书失败:', error)
    showError(error.message || '归还图书失败')
  }
}

const renewBorrow = async borrow => {
  try {
    const confirmed = await confirmDelete(1, '图书', `确定要续借图书"${borrow.book.title}"吗？`)
    if (!confirmed) return

    await renewBook(borrow.id)
    ElNotification.success({
      title: '续借成功',
      message: `图书"${borrow.book.title}"已成功续借`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    console.error('续借图书失败:', error)
    showError(error.message || '续借图书失败')
  }
}

const handleRowAction = ({ action, row }) => {
  switch (action) {
    case 'markLost':
      markBorrowAsLost(row)
      break
    case 'sendReminder':
      sendReminder(row)
      break
    case 'viewHistory':
      viewUserHistory(row)
      break
  }
}

const markBorrowAsLost = async borrow => {
  try {
    const { value: notes } = await ElMessageBox.prompt(`确定要将图书"${borrow.book.title}"标记为丢失吗？`, '标记丢失', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入备注信息',
      inputType: 'textarea'
    })

    await markBookAsLost(borrow.id, { notes })
    ElNotification.success({
      title: '标记成功',
      message: `图书"${borrow.book.title}"已标记为丢失`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记丢失失败:', error)
      ElMessage.error('标记丢失失败')
    }
  }
}

const sendReminder = borrow => {
  ElMessage.info('发送提醒功能待实现')
}

const viewUserHistory = borrow => {
  router.push({
    name: 'SystemUserDetail',
    params: { id: borrow.userId },
    query: { tab: 'borrows' }
  })
}

const batchReturn = async () => {
  const borrowIds = selectedBorrows.value
    .filter(borrow => ['borrowed', 'overdue'].includes(borrow.status))
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以归还的借阅记录')
    return
  }

  try {
    const confirmed = await confirmBatchAction(borrowIds.length, '批量归还', '本图书')
    if (!confirmed) return

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'return',
      params: { condition: 'good' }
    })

    ElNotification.success({
      title: '批量归还完成',
      message: `成功归还 ${response.data.batchResult.success} 本图书`
    })

    clearSelection()
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量归还失败:', error)
    showError(error.message || '批量归还失败')
  }
}

// ProTable批量操作处理函数
const handleBatchReturnFromTable = async (selectedRows) => {
  const borrowIds = selectedRows
    .filter(borrow => ['borrowed', 'overdue'].includes(borrow.status))
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以归还的借阅记录')
    return
  }

  try {
    const confirmed = await confirmBatchAction(borrowIds.length, '批量归还', '本图书')
    if (!confirmed) return

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'return',
      params: { condition: 'good' }
    })

    ElNotification.success({
      title: '批量归还完成',
      message: `成功归还 ${response.data.batchResult.success} 本图书`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量归还失败:', error)
    showError(error.message || '批量归还失败')
  }
}

const handleBatchRenewFromTable = async (selectedRows) => {
  const borrowIds = selectedRows
    .filter(borrow => borrow.status === 'borrowed' && borrow.canRenew)
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以续借的借阅记录')
    return
  }

  try {
    const confirmed = await confirmBatchAction(borrowIds.length, '批量续借', '本图书')
    if (!confirmed) return

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'renew'
    })

    ElNotification.success({
      title: '批量续借完成',
      message: `成功续借 ${response.data.batchResult.success} 本图书`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量续借失败:', error)
    showError(error.message || '批量续借失败')
  }
}

const handleBatchReminderFromTable = (selectedRows) => {
  showSuccess(`已向 ${selectedRows.length} 位用户发送催还通知`)
  // 实际应该调用API发送提醒
}

const handleBatchMarkLostFromTable = async (selectedRows) => {
  const borrowIds = selectedRows
    .filter(borrow => ['borrowed', 'overdue'].includes(borrow.status))
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以标记为丢失的借阅记录')
    return
  }

  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将 ${borrowIds.length} 本图书标记为丢失吗？`,
      '批量标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'markLost',
      params: { notes }
    })

    ElNotification.success({
      title: '批量标记完成',
      message: `成功标记 ${response.data.batchResult.success} 本图书为丢失`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记丢失失败:', error)
      showError(error.message || '批量标记丢失失败')
    }
  }
}

const batchRenew = async () => {
  const borrowIds = selectedBorrows.value
    .filter(borrow => borrow.status === 'borrowed' && borrow.canRenew)
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以续借的借阅记录')
    return
  }

  try {
    const confirmed = await confirmBatchAction(borrowIds.length, '批量续借', '本图书')
    if (!confirmed) return

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'renew'
    })

    ElNotification.success({
      title: '批量续借完成',
      message: `成功续借 ${response.data.batchResult.success} 本图书`
    })

    clearSelection()
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量续借失败:', error)
    showError(error.message || '批量续借失败')
  }
}

const batchSendReminder = () => {
  ElMessage.info('批量发送提醒功能待实现')
}

const batchMarkLost = async () => {
  const borrowIds = selectedBorrows.value
    .filter(borrow => ['borrowed', 'overdue'].includes(borrow.status))
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    showError('没有可以标记为丢失的借阅记录')
    return
  }

  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将 ${borrowIds.length} 本图书标记为丢失吗？`,
      '批量标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'markLost',
      params: { notes }
    })

    ElNotification.success({
      title: '批量标记完成',
      message: `成功标记 ${response.data.batchResult.success} 本图书为丢失`
    })

    clearSelection()
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记丢失失败:', error)
      showError(error.message || '批量标记丢失失败')
    }
  }
}

const handleBorrowSuccess = () => {
  showBorrowDialog.value = false
  proTableRef.value?.refresh()
  showSuccess('借阅记录创建成功')
}

const handleQuickReturnSuccess = () => {
  proTableRef.value?.refresh()
  showSuccess('快速归还成功')
}

const exportBorrows = () => {
  ElMessage.info('导出功能待实现')
}

const handleRefresh = () => {
  proTableRef.value?.refresh()
}

// 列设置应用回调 - 添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
}

// 工具函数
const getDueDateClass = borrow => {
  if (borrow.status !== 'borrowed') return ''

  const daysRemaining = borrow.daysRemaining
  if (daysRemaining <= 0) return 'text-danger'
  if (daysRemaining <= 3) return 'text-warning'
  return ''
}

const getDaysRemainingClass = borrow => {
  const daysRemaining = borrow.daysRemaining
  if (daysRemaining <= 0) return 'text-danger'
  if (daysRemaining <= 3) return 'text-warning'
  return 'text-success'
}

const getDaysRemainingText = borrow => {
  const daysRemaining = borrow.daysRemaining
  if (daysRemaining <= 0) {
    return `逾期 ${Math.abs(daysRemaining)} 天`
  } else {
    return `还有 ${daysRemaining} 天`
  }
}

const getRenewalTagType = (renewalCount, maxRenewals) => {
  const ratio = renewalCount / maxRenewals
  if (ratio >= 1) return 'danger'
  if (ratio >= 0.7) return 'warning'
  return 'success'
}

// 生命周期
onMounted(() => {
  // ProTable 会自动加载数据，无需手动调用
})
</script>

<style lang="scss" scoped>
.borrows-container {
}


.quick-actions-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.borrows-table-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .user-avatar {
    flex-shrink: 0;
  }

  .user-details {
    .user-name {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .user-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-top: 2px;
    }
  }
}

.book-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .book-cover {
    width: 40px;
    height: 56px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .book-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    color: var(--el-text-color-placeholder);
  }

  .book-details {
    .book-title {
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .book-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.overdue-info {
  margin-top: 4px;
}

.date-info {
  .date-meta {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-top: 2px;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.batch-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;

  .toolbar-content {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 20px;

    .selected-info {
      color: var(--el-text-color-primary);
      font-weight: 500;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.text-danger {
  color: var(--el-color-danger);
}

.text-warning {
  color: var(--el-color-warning);
}

.text-success {
  color: var(--el-color-success);
}

.text-muted {
  color: var(--el-text-color-placeholder);
}

.cursor-pointer {
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.3s ease;
  }
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    .selection-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--el-color-primary);
      font-weight: 500;
      animation: slideIn 0.3s ease;

      .el-icon {
        font-size: 16px;
      }
    }

    .batch-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;

      &.show {
        opacity: 1;
        transform: translateX(0);
      }

      .action-badge {
        .el-badge__content {
          background-color: var(--el-color-warning);
          border: none;
        }
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

// 列设置对话框样式
.column-settings-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.column-settings-list {
  display: flex;
  flex-direction: column;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.2s;
  cursor: move;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.is-disabled {
    cursor: default;
    background: #fafafa;
  }
  
  &[draggable="true"]:active {
    background: #ecf5ff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    z-index: 10;
    position: relative;
  }
}

.drag-handle {
  margin-right: 12px;
  color: #c0c4cc;
  cursor: move;
  font-size: 14px;
  
  &:hover {
    color: #909399;
  }
}

.drag-handle-placeholder {
  width: 26px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;
  
  .el-button {
    padding: 4px;
    background: transparent;
    border-color: #dcdfe6;
    
    &:hover:not(:disabled) {
      background: #f5f7fa;
      border-color: #c0c4cc;
      color: #409eff;
    }
    
    &:disabled {
      opacity: 0.4;
    }
  }
}

@media (max-width: 768px) {

  .quick-actions {
    justify-content: center;
  }

  .user-info,
  .book-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
