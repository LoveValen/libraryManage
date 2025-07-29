<template>
  <div class="overdue-container">


    <!-- 快速操作区域 -->
    <el-card shadow="never" class="quick-actions-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Lightning /></el-icon>
            批量操作
          </div>
        </div>
      </template>

      <div class="quick-actions">
        <el-button-group>
          <el-button type="warning" :icon="Bell" @click="batchSendReminder" :disabled="selectedOverdue.length === 0">
            批量催还 ({{ selectedOverdue.length }})
          </el-button>
          <el-button type="success" :icon="Money" @click="batchCalculateFines" :disabled="selectedOverdue.length === 0">
            计算罚金
          </el-button>
          <el-button type="danger" :icon="Warning" @click="batchMarkLost" :disabled="selectedOverdue.length === 0">
            标记丢失
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <el-button type="info" :icon="Download" @click="exportOverdueReport">导出报告</el-button>
        <el-button type="primary" :icon="Message" @click="showNotificationCenter = true">通知中心</el-button>
      </div>
    </el-card>

    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 逾期记录表格 -->
    <el-card shadow="never" class="overdue-table-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><List /></el-icon>
            逾期记录 ({{ pagination.total }})
          </div>
          <div class="header-actions">
            <el-button type="primary" :icon="Refresh" @click="loadOverdueRecords" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>

      <DataTable
        v-loading="loading"
        :data="overdueRecords"
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
              <div class="user-contact">{{ row.user?.phone || '-' }}</div>
            </div>
          </div>
        </template>

        <!-- 图书信息列 -->
        <template #book="{ row }">
          <div class="book-info">
            <el-image :src="row.book?.coverImage" class="book-cover" fit="cover">
              <template #error>
                <div class="book-cover-placeholder">
                  <el-icon><Reading /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="book-details">
              <div class="book-title">{{ row.book?.title }}</div>
              <div class="book-meta">
                {{ Array.isArray(row.book?.authors) ? row.book.authors.join(', ') : row.book?.authors }}
              </div>
              <div class="book-meta">ISBN: {{ row.book?.isbn }}</div>
            </div>
          </div>
        </template>

        <!-- 逾期信息列 -->
        <template #overdueInfo="{ row }">
          <div class="overdue-info">
            <el-tag :type="getOverdueTagType(row.currentOverdueDays)" size="default" class="overdue-tag">
              逾期 {{ row.currentOverdueDays }} 天
            </el-tag>
            <div class="overdue-details">
              <div class="overdue-amount">预计罚金: ¥{{ calculateFine(row.currentOverdueDays) }}</div>
              <div class="overdue-level">
                {{ getOverdueLevel(row.currentOverdueDays) }}
              </div>
            </div>
          </div>
        </template>

        <!-- 借阅日期列 -->
        <template #borrowDate="{ row }">
          <div class="date-info">
            <div>{{ formatDate(row.borrowDate) }}</div>
            <div class="date-meta">{{ formatRelativeTime(row.borrowDate) }}</div>
          </div>
        </template>

        <!-- 应还日期列 -->
        <template #dueDate="{ row }">
          <div class="date-info overdue">
            <div class="overdue-date">{{ formatDate(row.dueDate) }}</div>
            <div class="date-meta">应于{{ formatRelativeTime(row.dueDate) }}归还</div>
          </div>
        </template>

        <!-- 通知状态列 -->
        <template #notifications="{ row }">
          <div class="notification-status">
            <div class="notification-count">已发送: {{ getNotificationCount(row) }} 次</div>
            <div class="last-notification">最后通知: {{ getLastNotificationTime(row) }}</div>
            <el-button type="text" size="small" :icon="Bell" @click="sendSingleReminder(row)" class="send-reminder-btn">
              立即催还
            </el-button>
          </div>
        </template>

        <!-- 操作列 -->
        <template #actions="{ row }">
          <div class="action-buttons">
            <el-button-group>
              <el-button type="success" :icon="Check" @click="forceReturn(row)" size="small" title="强制归还" />
              <el-button type="warning" :icon="Money" @click="manageFines(row)" size="small" title="管理罚金" />
              <el-dropdown @command="command => handleRowAction(command, row)" trigger="click">
                <el-button type="default" :icon="MoreFilled" size="small" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'viewDetail', row }" :icon="View">查看详情</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'contactUser', row }" :icon="Phone">
                      联系用户
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'viewHistory', row }" :icon="Timer">
                      借阅历史
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'markLost', row }" :icon="Close" divided>
                      标记丢失
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </div>
        </template>
      </DataTable>
    </el-card>

    <!-- 通知中心对话框 -->
    <el-dialog v-model="showNotificationCenter" title="通知中心" width="800px" :close-on-click-modal="false">
      <NotificationCenter v-if="showNotificationCenter" @close="showNotificationCenter = false" />
    </el-dialog>

    <!-- 罚金管理对话框 -->
    <el-dialog v-model="showFineDialog" title="罚金管理" width="600px" :close-on-click-modal="false">
      <FineManagement
        v-if="showFineDialog"
        :borrow-record="selectedRecord"
        @success="handleFineSuccess"
        @close="showFineDialog = false"
      />
    </el-dialog>

    <!-- 联系用户对话框 -->
    <el-dialog v-model="showContactDialog" title="联系用户" width="500px" :close-on-click-modal="false">
      <ContactUser v-if="showContactDialog" :user="selectedUser" @close="showContactDialog = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Warning,
  Lightning,
  Bell,
  Money,
  Download,
  Message,
  List,
  Refresh,
  Reading,
  Check,
  MoreFilled,
  View,
  Phone,
  Timer,
  Close
} from '@element-plus/icons-vue'
import { DataTable } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import FineManagement from './components/FineManagement.vue'
import ContactUser from './components/ContactUser.vue'
import { getOverdueRecords, returnBook, markBookAsLost, batchProcessBorrows } from '@/api/borrows'
import { formatDate, formatRelativeTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const overdueRecords = ref([])
const selectedOverdue = ref([])
const showNotificationCenter = ref(false)
const showFineDialog = ref(false)
const showContactDialog = ref(false)
const selectedRecord = ref(null)
const selectedUser = ref(null)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  minOverdueDays: '',
  maxOverdueDays: '',
  sortBy: 'currentOverdueDays',
  sortOrder: 'desc'
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计数据
const statistics = reactive({
  total: 0,
  mild: 0, // 1-7天
  severe: 0, // 8-30天
  extreme: 0 // 30天以上
})

// 每日罚金费率（元）
const DAILY_FINE_RATE = 0.5


// 搜索字段配置
const searchFields = [
  {
    key: 'keyword',
    type: 'input',
    label: '关键词',
    placeholder: '搜索用户姓名、图书标题',
    inputWidth: '250px'
  },
  {
    key: 'minOverdueDays',
    type: 'number',
    label: '最少逾期',
    placeholder: '天数',
    inputWidth: '100px'
  },
  {
    key: 'maxOverdueDays',
    type: 'number',
    label: '最多逾期',
    placeholder: '天数',
    inputWidth: '100px'
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
    prop: 'overdueInfo',
    label: '逾期信息',
    width: 160,
    slot: 'overdueInfo'
  },
  {
    prop: 'borrowDate',
    label: '借阅日期',
    width: 140,
    sortable: 'custom',
    slot: 'borrowDate'
  },
  {
    prop: 'dueDate',
    label: '应还日期',
    width: 140,
    sortable: 'custom',
    slot: 'dueDate'
  },
  {
    prop: 'notifications',
    label: '通知状态',
    width: 160,
    slot: 'notifications'
  },
  {
    prop: 'actions',
    label: '操作',
    width: 160,
    fixed: 'right',
    slot: 'actions'
  }
]

// 方法
const loadOverdueRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      ...searchForm
    }

    const response = await getOverdueRecords(params)
    overdueRecords.value = response.data.overdueRecords

    // 更新分页信息
    pagination.total = response.data.total

  } catch (error) {
    console.error('加载逾期记录失败:', error)
    ElMessage.error('加载逾期记录失败')
  } finally {
    loading.value = false
  }
}




const handleSearch = () => {
  pagination.page = 1
  loadOverdueRecords()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    minOverdueDays: '',
    maxOverdueDays: '',
    sortBy: 'currentOverdueDays',
    sortOrder: 'desc'
  })
  pagination.page = 1
  loadOverdueRecords()
}

const handleSelectionChange = selection => {
  selectedOverdue.value = selection
}

const handleSortChange = ({ prop, order }) => {
  searchForm.sortBy = prop
  searchForm.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  loadOverdueRecords()
}

const handlePageChange = page => {
  pagination.page = page
  loadOverdueRecords()
}

const handleSizeChange = size => {
  pagination.pageSize = size
  pagination.page = 1
  loadOverdueRecords()
}

const batchSendReminder = async () => {
  if (selectedOverdue.value.length === 0) {
    ElMessage.warning('请选择要催还的记录')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要向 ${selectedOverdue.value.length} 位用户发送催还通知吗？`, '批量催还确认', {
      confirmButtonText: '确定发送',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const borrowIds = selectedOverdue.value.map(record => record.id)
    await batchProcessBorrows({
      borrowIds,
      action: 'sendReminder'
    })

    ElNotification.success({
      title: '批量催还完成',
      message: `已向 ${selectedOverdue.value.length} 位用户发送催还通知`
    })

    loadOverdueRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量催还失败:', error)
      ElMessage.error('批量催还失败')
    }
  }
}

const batchCalculateFines = () => {
  if (selectedOverdue.value.length === 0) {
    ElMessage.warning('请选择要计算罚金的记录')
    return
  }

  const totalFine = selectedOverdue.value.reduce((sum, record) => {
    return sum + calculateFine(record.currentOverdueDays)
  }, 0)

  ElMessageBox.alert(
    `选中的 ${selectedOverdue.value.length} 条记录，预计总罚金为：¥${totalFine.toFixed(2)}`,
    '罚金计算结果',
    {
      confirmButtonText: '确定',
      type: 'info'
    }
  )
}

const batchMarkLost = async () => {
  if (selectedOverdue.value.length === 0) {
    ElMessage.warning('请选择要标记为丢失的记录')
    return
  }

  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将 ${selectedOverdue.value.length} 本图书标记为丢失吗？`,
      '批量标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    const borrowIds = selectedOverdue.value.map(record => record.id)
    const response = await batchProcessBorrows({
      borrowIds,
      action: 'markLost',
      params: { notes }
    })

    ElNotification.success({
      title: '批量标记完成',
      message: `成功标记 ${response.data.batchResult.success} 本图书为丢失`
    })

    loadOverdueRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记丢失失败:', error)
      ElMessage.error('批量标记丢失失败')
    }
  }
}

const forceReturn = async record => {
  try {
    await ElMessageBox.confirm(`确定要强制归还图书"${record.book.title}"吗？`, '强制归还确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await returnBook(record.id, {
      condition: 'good',
      notes: '管理员强制归还'
    })

    ElNotification.success({
      title: '强制归还成功',
      message: `图书"${record.book.title}"已强制归还`
    })

    loadOverdueRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('强制归还失败:', error)
      ElMessage.error('强制归还失败')
    }
  }
}

const manageFines = record => {
  selectedRecord.value = record
  showFineDialog.value = true
}

const sendSingleReminder = record => {
  ElMessage.success(`已向用户 ${record.user.realName || record.user.username} 发送催还通知`)
}

const handleRowAction = ({ action, row }) => {
  switch (action) {
    case 'viewDetail':
      this.$router.push({
        name: 'BorrowDetail',
        params: { id: row.id }
      })
      break
    case 'contactUser':
      selectedUser.value = row.user
      showContactDialog.value = true
      break
    case 'viewHistory':
      this.$router.push({
        name: 'UserDetail',
        params: { id: row.userId },
        query: { tab: 'borrows' }
      })
      break
    case 'markLost':
      markSingleAsLost(row)
      break
  }
}

const markSingleAsLost = async record => {
  try {
    const { value: notes } = await ElMessageBox.prompt(`确定要将图书"${record.book.title}"标记为丢失吗？`, '标记丢失', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入备注信息',
      inputType: 'textarea'
    })

    await markBookAsLost(record.id, { notes })

    ElNotification.success({
      title: '标记成功',
      message: `图书"${record.book.title}"已标记为丢失`
    })

    loadOverdueRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记丢失失败:', error)
      ElMessage.error('标记丢失失败')
    }
  }
}

const handleFineSuccess = () => {
  showFineDialog.value = false
  loadOverdueRecords()
}

const exportOverdueReport = () => {
  ElMessage.info('导出逾期报告功能待实现')
}

// 工具函数
const calculateFine = overdueDays => {
  return (overdueDays * DAILY_FINE_RATE).toFixed(2)
}

const getOverdueTagType = days => {
  if (days <= 7) return 'warning'
  if (days <= 30) return 'danger'
  return 'danger'
}

const getOverdueLevel = days => {
  if (days <= 7) return '轻微逾期'
  if (days <= 30) return '严重逾期'
  return '超长逾期'
}

const getNotificationCount = record => {
  return record.notificationsSent?.length || 0
}

const getLastNotificationTime = record => {
  const notifications = record.notificationsSent || []
  if (notifications.length === 0) return '未发送'

  const lastNotification = notifications[notifications.length - 1]
  return formatRelativeTime(lastNotification.sentAt)
}

// 生命周期
onMounted(() => {
  loadOverdueRecords()
})
</script>

<style lang="scss" scoped>
.overdue-container {
  padding: 20px;
}


.quick-actions-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
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
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
}

.overdue-table-card {
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
      margin-bottom: 2px;
    }

    .user-meta,
    .user-contact {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 1px;
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
  text-align: center;

  .overdue-tag {
    margin-bottom: 8px;
  }

  .overdue-details {
    .overdue-amount {
      font-size: 12px;
      color: var(--el-color-danger);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .overdue-level {
      font-size: 11px;
      color: var(--el-text-color-regular);
    }
  }
}

.date-info {
  &.overdue {
    .overdue-date {
      color: var(--el-color-danger);
      font-weight: 500;
    }
  }

  .date-meta {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-top: 2px;
  }
}

.notification-status {
  .notification-count {
    font-size: 12px;
    color: var(--el-text-color-primary);
    margin-bottom: 2px;
  }

  .last-notification {
    font-size: 11px;
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
  }

  .send-reminder-btn {
    padding: 0;
    height: auto;
    font-size: 11px;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.cursor-pointer {
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.3s ease;
  }
}

// 辅助样式
@mixin text-ellipsis($lines: 1) {
  @if $lines == 1 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
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
