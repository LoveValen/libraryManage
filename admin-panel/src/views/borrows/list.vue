<template>
  <div class="borrows-container">
    <!-- 页面头部 -->
    <PageHeader
      title="借阅管理"
      description="管理图书借阅记录，处理借阅、归还、续借等操作"
      icon="DocumentCopy"
      :actions="headerActions"
      @action="handleHeaderAction"
    />

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <StatCard
          v-for="stat in statsData"
          :key="stat.key"
          :title="stat.label"
          :value="stat.value"
          :icon="stat.icon"
          :type="stat.type"
          :trend="stat.trend"
          :show-trend="true"
          :count-up="true"
          @click="handleStatCardClick(stat.key)"
          class="cursor-pointer"
        />
      </div>
    </div>

    <!-- 快速操作区域 -->
    <el-card shadow="never" class="quick-actions-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Lightning /></el-icon>
            快速操作
          </div>
        </div>
      </template>

      <div class="quick-actions">
        <el-button type="primary" :icon="Plus" @click="showBorrowDialog = true" size="large">新增借阅</el-button>
        <el-button type="success" :icon="RefreshRight" @click="showQuickReturnDialog = true" size="large">
          快速归还
        </el-button>
        <el-button type="warning" :icon="Clock" @click="showOverdueDialog = true" size="large">逾期管理</el-button>
        <el-button type="info" :icon="TrendCharts" @click="showTrendsDialog = true" size="large">借阅趋势</el-button>
      </div>
    </el-card>

    <!-- 搜索筛选区域 -->
    <SearchFilter
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 借阅记录表格 -->
    <el-card shadow="never" class="borrows-table-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><List /></el-icon>
            借阅记录 ({{ pagination.total }})
          </div>
          <div class="header-actions">
            <el-button type="primary" :icon="Refresh" @click="loadBorrows" :loading="loading">刷新</el-button>
            <el-button type="default" :icon="Download" @click="exportBorrows">导出</el-button>
          </div>
        </div>
      </template>

      <DataTable
        v-loading="loading"
        :data="borrows"
        :columns="tableColumns"
        :pagination="pagination"
        :selection="true"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
      >
        <!-- 用户信息列 -->
        <template #user="{ row }">
          <div class="user-info">
            <el-avatar :src="row.user?.avatar" :size="32" class="user-avatar">
              {{ row.user?.realName?.charAt(0) || row.user?.username?.charAt(0) }}
            </el-avatar>
            <div class="user-details">
              <div class="user-name">{{ row.user?.realName || row.user?.username }}</div>
              <div class="user-meta">{{ row.user?.email }}</div>
            </div>
          </div>
        </template>

        <!-- 图书信息列 -->
        <template #book="{ row }">
          <div class="book-info">
            <el-image
              :src="row.book?.coverImage"
              :preview-src-list="[row.book?.coverImage]"
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
              <div class="book-title">{{ row.book?.title }}</div>
              <div class="book-meta">
                作者: {{ Array.isArray(row.book?.authors) ? row.book.authors.join(', ') : row.book?.authors }}
              </div>
              <div class="book-meta">ISBN: {{ row.book?.isbn }}</div>
            </div>
          </div>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <StatusTag :value="row.status" :config="borrowStatusConfig" :show-icon="true" />
          <div v-if="row.isCurrentlyOverdue" class="overdue-info">
            <el-tag type="danger" size="small" class="mt-1">逾期 {{ row.currentOverdueDays }} 天</el-tag>
          </div>
        </template>

        <!-- 借阅时间列 -->
        <template #borrowDate="{ row }">
          <div class="date-info">
            <div>{{ formatDate(row.borrowDate) }}</div>
            <div class="date-meta">{{ formatRelativeTime(row.borrowDate) }}</div>
          </div>
        </template>

        <!-- 应还时间列 -->
        <template #dueDate="{ row }">
          <div class="date-info">
            <div :class="getDueDateClass(row)">
              {{ formatDate(row.dueDate) }}
            </div>
            <div class="date-meta">
              <span v-if="row.status === 'borrowed'" :class="getDaysRemainingClass(row)">
                {{ getDaysRemainingText(row) }}
              </span>
              <span v-else>-</span>
            </div>
          </div>
        </template>

        <!-- 归还时间列 -->
        <template #returnDate="{ row }">
          <div v-if="row.returnDate" class="date-info">
            <div>{{ formatDate(row.returnDate) }}</div>
            <div class="date-meta">{{ formatRelativeTime(row.returnDate) }}</div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>

        <!-- 续借次数列 -->
        <template #renewalCount="{ row }">
          <el-tag :type="getRenewalTagType(row.renewalCount, row.maxRenewals)" size="small">
            {{ row.renewalCount }}/{{ row.maxRenewals }}
          </el-tag>
        </template>

        <!-- 操作列 -->
        <template #actions="{ row }">
          <div class="action-buttons">
            <el-button-group>
              <el-button type="primary" :icon="View" @click="viewBorrowDetail(row)" size="small" title="查看详情" />
              <el-button
                v-if="row.status === 'borrowed' && row.canRenew"
                type="warning"
                :icon="RefreshLeft"
                @click="renewBorrow(row)"
                size="small"
                title="续借"
              />
              <el-button
                v-if="['borrowed', 'overdue'].includes(row.status)"
                type="success"
                :icon="Check"
                @click="returnBorrow(row)"
                size="small"
                title="归还"
              />
              <el-dropdown @command="command => handleRowAction(command, row)" trigger="click">
                <el-button type="default" :icon="MoreFilled" size="small" title="更多操作" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      :command="{ action: 'markLost', row }"
                      :icon="Warning"
                      v-if="['borrowed', 'overdue'].includes(row.status)"
                    >
                      标记丢失
                    </el-dropdown-item>
                    <el-dropdown-item
                      :command="{ action: 'sendReminder', row }"
                      :icon="Bell"
                      v-if="['borrowed', 'overdue'].includes(row.status)"
                    >
                      发送提醒
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'viewHistory', row }" :icon="Timer">
                      借阅历史
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </div>
        </template>
      </DataTable>
    </el-card>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedBorrows.length > 0" class="batch-toolbar">
      <div class="toolbar-content">
        <div class="selected-info">
          已选择
          <strong>{{ selectedBorrows.length }}</strong>
          条记录
        </div>
        <div class="toolbar-actions">
          <el-button @click="clearSelection">取消选择</el-button>
          <el-button type="success" :icon="Check" @click="batchReturn" :disabled="!canBatchReturn">批量归还</el-button>
          <el-button type="warning" :icon="RefreshLeft" @click="batchRenew" :disabled="!canBatchRenew">
            批量续借
          </el-button>
          <el-button type="info" :icon="Bell" @click="batchSendReminder">批量提醒</el-button>
          <el-button type="danger" :icon="Warning" @click="batchMarkLost">批量标记丢失</el-button>
        </div>
      </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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
  Reading
} from '@element-plus/icons-vue'
import { PageHeader, StatCard, SearchFilter, DataTable, StatusTag } from '@/components/common'
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

// 响应式数据
const loading = ref(false)
const borrows = ref([])
const selectedBorrows = ref([])
const showBorrowDialog = ref(false)
const showQuickReturnDialog = ref(false)
const showOverdueDialog = ref(false)
const showTrendsDialog = ref(false)

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

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计数据
const statsData = ref([
  {
    key: 'total',
    label: '总借阅量',
    value: 0,
    icon: 'DocumentCopy',
    type: 'primary',
    trend: { value: 0, isUp: true }
  },
  {
    key: 'active',
    label: '借阅中',
    value: 0,
    icon: 'Reading',
    type: 'success',
    trend: { value: 0, isUp: true }
  },
  {
    key: 'overdue',
    label: '逾期未还',
    value: 0,
    icon: 'Warning',
    type: 'danger',
    trend: { value: 0, isUp: false }
  },
  {
    key: 'today',
    label: '今日借阅',
    value: 0,
    icon: 'Calendar',
    type: 'info',
    trend: { value: 0, isUp: true }
  }
])

// 头部操作按钮
const headerActions = [
  {
    key: 'refresh',
    label: '刷新数据',
    type: 'default',
    icon: 'Refresh'
  },
  {
    key: 'export',
    label: '导出数据',
    type: 'default',
    icon: 'Download'
  }
]

// 搜索字段配置
const searchFields = [
  {
    key: 'keyword',
    type: 'input',
    label: '关键词',
    placeholder: '搜索用户姓名、图书标题、ISBN',
    inputWidth: '250px'
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '选择状态',
    options: [
      { label: '借阅中', value: 'borrowed' },
      { label: '已归还', value: 'returned' },
      { label: '逾期', value: 'overdue' },
      { label: '丢失', value: 'lost' },
      { label: '损坏', value: 'damaged' }
    ]
  },
  {
    key: 'isOverdue',
    type: 'select',
    label: '逾期状态',
    placeholder: '选择逾期状态',
    options: [
      { label: '正常', value: 'false' },
      { label: '逾期', value: 'true' }
    ]
  },
  {
    key: 'dateRange',
    type: 'daterange',
    label: '借阅时间',
    startPlaceholder: '开始日期',
    endPlaceholder: '结束日期'
  }
]

// 表格列配置
const tableColumns = [
  {
    prop: 'user',
    label: '借阅用户',
    minWidth: 200,
    slot: 'user'
  },
  {
    prop: 'book',
    label: '图书信息',
    minWidth: 250,
    slot: 'book'
  },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    slot: 'status'
  },
  {
    prop: 'borrowDate',
    label: '借阅时间',
    width: 160,
    sortable: 'custom',
    slot: 'borrowDate'
  },
  {
    prop: 'dueDate',
    label: '应还时间',
    width: 160,
    sortable: 'custom',
    slot: 'dueDate'
  },
  {
    prop: 'returnDate',
    label: '归还时间',
    width: 160,
    slot: 'returnDate'
  },
  {
    prop: 'renewalCount',
    label: '续借次数',
    width: 100,
    align: 'center',
    slot: 'renewalCount'
  },
  {
    prop: 'actions',
    label: '操作',
    width: 180,
    fixed: 'right',
    slot: 'actions'
  }
]

// 借阅状态配置
const borrowStatusConfig = {
  borrowed: { type: 'success', text: '借阅中', icon: 'Reading' },
  returned: { type: 'info', text: '已归还', icon: 'Check' },
  overdue: { type: 'danger', text: '逾期', icon: 'Warning' },
  lost: { type: 'danger', text: '丢失', icon: 'Close' },
  damaged: { type: 'warning', text: '损坏', icon: 'Warning' }
}

// 计算属性
const canBatchReturn = computed(() => {
  return selectedBorrows.value.some(borrow => ['borrowed', 'overdue'].includes(borrow.status))
})

const canBatchRenew = computed(() => {
  return selectedBorrows.value.some(borrow => borrow.status === 'borrowed' && borrow.canRenew)
})

// 方法
const loadBorrows = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      ...searchForm
    }

    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await getBorrows(params)
    borrows.value = response.data.borrows
    pagination.total = response.data.pagination.total
  } catch (error) {
    console.error('加载借阅记录失败:', error)
    ElMessage.error('加载借阅记录失败')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await getBorrowStatistics()
    const stats = response.data.statistics

    statsData.value[0].value = stats.total
    statsData.value[1].value = stats.active
    statsData.value[2].value = stats.overdue
    statsData.value[3].value = stats.todayBorrows
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const handleHeaderAction = action => {
  switch (action.key) {
    case 'refresh':
      loadBorrows()
      loadStatistics()
      break
    case 'export':
      exportBorrows()
      break
  }
}

const handleStatCardClick = key => {
  // 根据统计卡片点击设置筛选条件
  switch (key) {
    case 'active':
      searchForm.status = 'borrowed'
      break
    case 'overdue':
      searchForm.status = 'overdue'
      break
    case 'today':
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      searchForm.dateRange = [startOfDay, endOfDay]
      break
  }
  handleSearch()
}

const handleSearch = () => {
  pagination.page = 1
  loadBorrows()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    userId: '',
    bookId: '',
    isOverdue: '',
    startDate: '',
    endDate: '',
    dateRange: null,
    sortBy: 'borrow_date',
    sortOrder: 'desc'
  })
  pagination.page = 1
  loadBorrows()
}

const handleSelectionChange = selection => {
  selectedBorrows.value = selection
}

const handleSortChange = ({ prop, order }) => {
  searchForm.sortBy = prop
  searchForm.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  loadBorrows()
}

const handlePageChange = page => {
  pagination.page = page
  loadBorrows()
}

const handleSizeChange = size => {
  pagination.pageSize = size
  pagination.page = 1
  loadBorrows()
}

const clearSelection = () => {
  selectedBorrows.value = []
}

const viewBorrowDetail = borrow => {
  this.$router.push({
    name: 'BorrowDetail',
    params: { id: borrow.id }
  })
}

const returnBorrow = async borrow => {
  try {
    await ElMessageBox.confirm(`确定要归还图书"${borrow.book.title}"吗？`, '归还确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await returnBook(borrow.id, { condition: 'good' })
    ElNotification.success({
      title: '归还成功',
      message: `图书"${borrow.book.title}"已成功归还`
    })

    loadBorrows()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('归还图书失败:', error)
      ElMessage.error('归还图书失败')
    }
  }
}

const renewBorrow = async borrow => {
  try {
    await ElMessageBox.confirm(`确定要续借图书"${borrow.book.title}"吗？`, '续借确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await renewBook(borrow.id)
    ElNotification.success({
      title: '续借成功',
      message: `图书"${borrow.book.title}"已成功续借`
    })

    loadBorrows()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('续借图书失败:', error)
      ElMessage.error('续借图书失败')
    }
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

    loadBorrows()
    loadStatistics()
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
  this.$router.push({
    name: 'UserDetail',
    params: { id: borrow.userId },
    query: { tab: 'borrows' }
  })
}

const batchReturn = async () => {
  const borrowIds = selectedBorrows.value
    .filter(borrow => ['borrowed', 'overdue'].includes(borrow.status))
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    ElMessage.warning('没有可以归还的借阅记录')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要批量归还 ${borrowIds.length} 本图书吗？`, '批量归还确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

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
    loadBorrows()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量归还失败:', error)
      ElMessage.error('批量归还失败')
    }
  }
}

const batchRenew = async () => {
  const borrowIds = selectedBorrows.value
    .filter(borrow => borrow.status === 'borrowed' && borrow.canRenew)
    .map(borrow => borrow.id)

  if (borrowIds.length === 0) {
    ElMessage.warning('没有可以续借的借阅记录')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要批量续借 ${borrowIds.length} 本图书吗？`, '批量续借确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await batchProcessBorrows({
      borrowIds,
      action: 'renew'
    })

    ElNotification.success({
      title: '批量续借完成',
      message: `成功续借 ${response.data.batchResult.success} 本图书`
    })

    clearSelection()
    loadBorrows()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量续借失败:', error)
      ElMessage.error('批量续借失败')
    }
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
    ElMessage.warning('没有可以标记为丢失的借阅记录')
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
    loadBorrows()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记丢失失败:', error)
      ElMessage.error('批量标记丢失失败')
    }
  }
}

const handleBorrowSuccess = () => {
  showBorrowDialog.value = false
  loadBorrows()
  loadStatistics()
  ElMessage.success('借阅记录创建成功')
}

const handleQuickReturnSuccess = () => {
  loadBorrows()
  loadStatistics()
  ElMessage.success('快速归还成功')
}

const exportBorrows = () => {
  ElMessage.info('导出功能待实现')
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
  loadBorrows()
  loadStatistics()
})
</script>

<style lang="scss" scoped>
.borrows-container {
  padding: 20px;
}

.stats-section {
  margin-bottom: 20px;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
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
      @include text-ellipsis(2);
    }

    .book-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 2px;
      @include text-ellipsis();
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
    padding: 16px 24px;

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

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

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
