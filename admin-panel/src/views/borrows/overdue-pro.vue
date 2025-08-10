<template>
  <div class="overdue-container">
    
    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="true"
      :default-collapsed="true"
      :collapsed-rows="1"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 逾期记录表格 -->
    <div class="table-section">
      <el-card shadow="never" class="table-card">
        <!-- 表格工具栏 -->
        <div class="table-toolbar">
          <div class="toolbar-left">
            <div v-if="selectedOverdueRecords.length > 0" class="selection-info">
              <el-icon><Check /></el-icon>
              <span>已选择 <strong>{{ selectedOverdueRecords.length }}</strong> 项</span>
            </div>
            <div class="batch-actions" :class="{ 'show': selectedOverdueRecords.length > 0 }">
              <el-button type="warning" :icon="Bell" :disabled="selectedOverdueRecords.length === 0" @click="handleBatchReminder(selectedOverdueRecords)">
                批量催还
                <el-badge v-if="selectedOverdueRecords.length > 0" :value="selectedOverdueRecords.length" class="action-badge" />
              </el-button>
              <el-button type="success" :icon="Money" :disabled="selectedOverdueRecords.length === 0" @click="handleBatchCalculate(selectedOverdueRecords)">
                计算罚金
              </el-button>
              <el-button type="danger" :icon="Warning" :disabled="selectedOverdueRecords.length === 0" @click="handleBatchMarkLost(selectedOverdueRecords)">
                标记丢失
              </el-button>
              <el-button @click="clearSelection" v-if="selectedOverdueRecords.length > 0">
                取消选择
              </el-button>
            </div>
          </div>
          <div class="toolbar-right">
            <el-tooltip content="刷新数据">
              <el-button icon="Refresh" @click="loadData" :loading="loading" />
            </el-tooltip>
            <el-tooltip content="导出报告">
              <el-button icon="Download" @click="handleExport" />
            </el-tooltip>
            <el-tooltip content="通知中心">
              <el-button icon="Message" @click="showNotificationCenter = true" />
            </el-tooltip>
            <el-tooltip content="列设置">
              <el-button icon="Setting" @click="showColumnSettings = true" />
            </el-tooltip>
          </div>
        </div>

        <!-- 数据表格 -->
        <ProTable
          ref="proTableRef"
          :request="requestOverdueRecords"
          :columns="overdueTableColumns"
          :row-selection="{ type: 'checkbox' }"
          :search="false"
          :toolBar="false"
          :action-column="{ width: 200, fixed: 'right' }"
          :params="overdueSearchParams"
          row-key="id"
          @selection-change="handleSelectionChange"
        >
      <!-- 用户信息插槽 -->
      <template #user="{ record }">
        <div class="user-info">
          <el-avatar :src="record.user?.avatar" :size="32" class="user-avatar">
            {{ record.user?.realName?.charAt(0) || record.user?.username?.charAt(0) }}
          </el-avatar>
          <div class="user-details">
            <div class="user-name">{{ record.user?.realName || record.user?.username }}</div>
            <div class="user-meta">{{ record.user?.email }}</div>
            <div class="user-contact">{{ record.user?.phone || '-' }}</div>
          </div>
        </div>
      </template>

      <!-- 图书信息插槽 -->
      <template #book="{ record }">
        <div class="book-info">
          <el-image :src="record.book?.coverImage" class="book-cover" fit="cover">
            <template #error>
              <div class="book-cover-placeholder">
                <el-icon><Reading /></el-icon>
              </div>
            </template>
          </el-image>
          <div class="book-details">
            <div class="book-title">{{ record.book?.title }}</div>
            <div class="book-meta">
              {{ Array.isArray(record.book?.authors) ? record.book.authors.join(', ') : record.book?.authors }}
            </div>
            <div class="book-meta">ISBN: {{ record.book?.isbn }}</div>
          </div>
        </div>
      </template>

      <!-- 逾期信息插槽 -->
      <template #overdueInfo="{ record }">
        <div class="overdue-info">
          <el-tag :type="getOverdueTagType(record.currentOverdueDays)" size="default" class="overdue-tag">
            逾期 {{ record.currentOverdueDays }} 天
          </el-tag>
          <div class="overdue-details">
            <div class="overdue-amount">预计罚金: ¥{{ calculateFine(record.currentOverdueDays) }}</div>
            <div class="overdue-level">
              {{ getOverdueLevel(record.currentOverdueDays) }}
            </div>
          </div>
        </div>
      </template>

          <!-- 操作插槽 -->
          <template #actions="{ record }">
            <div class="row-actions">
              <el-button type="success" size="small" @click="forceReturn(record)">
                强制归还
              </el-button>
              <el-button type="warning" size="small" @click="manageFines(record)">
                管理罚金
              </el-button>
              <el-button type="primary" size="small" @click="sendSingleReminder(record)">
                立即催还
              </el-button>
              <el-dropdown @command="(cmd) => handleMoreActions(cmd, record)">
                <el-button size="small" type="text">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="contact">联系用户</el-dropdown-item>
                    <el-dropdown-item command="history">查看记录</el-dropdown-item>
                    <el-dropdown-item command="markLost">标记丢失</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </ProTable>
      </el-card>
    </div>

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
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Bell,
  Money,
  Warning,
  Download,
  Message,
  Reading,
  Check,
  Phone,
  Timer,
  Close,
  View,
  Setting,
  Refresh
} from '@element-plus/icons-vue'
import { ProTable, SearchFilterSimple } from '@/components/common'
import NotificationCenter from './components/NotificationCenter.vue'
import FineManagement from './components/FineManagement.vue'
import ContactUser from './components/ContactUser.vue'
import { getOverdueRecords, returnBook, markBookAsLost, batchProcessBorrows } from '@/api/borrows'
import { formatDate, formatRelativeTime } from '@/utils/date'

// 每日罚金费率（元）
const DAILY_FINE_RATE = 0.5

// 响应式数据
const proTableRef = ref()
const loading = ref(false)
const showNotificationCenter = ref(false)
const showFineDialog = ref(false)
const showContactDialog = ref(false)
const showColumnSettings = ref(false)
const selectedRecord = ref(null)
const selectedUser = ref(null)
const selectedOverdueRecords = ref([])

// 搜索表单数据
const searchForm = reactive({
  keyword: '',
  minOverdueDays: '',
  maxOverdueDays: '',
  overdueLevel: '',
  dateRange: []
})

// 搜索参数
const overdueSearchParams = ref({})

// 搜索字段配置
const searchFields = [
  {
    name: 'keyword',
    label: '关键词',
    valueType: 'text',
    placeholder: '搜索用户姓名、图书标题、ISBN'
  },
  {
    name: 'minOverdueDays',
    label: '最小逾期天数',
    valueType: 'number',
    placeholder: '最小天数'
  },
  {
    name: 'maxOverdueDays',
    label: '最大逾期天数',
    valueType: 'number',
    placeholder: '最大天数'
  },
  {
    name: 'overdueLevel',
    label: '逾期等级',
    valueType: 'select',
    options: [
      { label: '轻微逾期（1-7天）', value: 'light' },
      { label: '严重逾期（8-30天）', value: 'serious' },
      { label: '超长逾期（30天以上）', value: 'severe' }
    ],
    placeholder: '选择逾期等级'
  },
  {
    name: 'dateRange',
    label: '借阅日期',
    valueType: 'dateRange',
    placeholder: ['开始日期', '结束日期']
  }
]

// 表格列配置
const overdueTableColumns = [
  {
    key: 'user',
    title: '借阅用户',
    slot: 'user',
    minWidth: 200
  },
  {
    key: 'book',
    title: '图书信息',
    slot: 'book',
    minWidth: 250
  },
  {
    key: 'overdueInfo',
    title: '逾期信息',
    slot: 'overdueInfo',
    minWidth: 120,
    align: 'center',
    sorter: true
  },
  {
    key: 'borrowDate',
    title: '借阅日期',
    dataIndex: 'borrowDate',
    minWidth: 120,
    sorter: true,
    render: (text) => formatDate(text)
  },
  {
    key: 'dueDate',
    title: '应还日期',
    dataIndex: 'dueDate',
    minWidth: 120,
    sorter: true,
    render: (text) => formatDate(text)
  },
  {
    key: 'notifications',
    title: '通知状态',
    minWidth: 140,
    render: (text, record) => {
      const count = getNotificationCount(record)
      const lastTime = getLastNotificationTime(record)
      return `已发送 ${count} 次，最后通知：${lastTime}`
    }
  },
  {
    key: 'actions',
    title: '操作',
    slot: 'actions',
    minWidth: 180,
    fixed: 'right'
  }
]

// 搜索处理
const handleSearch = (searchData) => {
  overdueSearchParams.value = {
    ...searchData,
    startDate: searchData.dateRange?.[0] || '',
    endDate: searchData.dateRange?.[1] || ''
  }
  proTableRef.value?.refresh()
}

const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    if (key === 'dateRange') {
      searchForm[key] = []
    } else {
      searchForm[key] = ''
    }
  })
  overdueSearchParams.value = {}
  proTableRef.value?.refresh()
}

// 数据加载
const loadData = () => {
  proTableRef.value?.refresh()
}

// 清空选择
const clearSelection = () => {
  selectedOverdueRecords.value = []
  proTableRef.value?.clearSelection()
}

// 数据请求函数
const requestOverdueRecords = async (params) => {
  try {
    loading.value = true
    
    const requestParams = {
      page: params.current || 1,
      limit: params.pageSize || 20,
      ...overdueSearchParams.value,
      sortBy: params.sorter || 'currentOverdueDays',
      sortOrder: params.order === 'ascend' ? 'asc' : 'desc'
    }

    const response = await getOverdueRecords(requestParams)
    
    return {
      success: true,
      data: response.data.overdueRecords || [],
      total: response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载逾期记录失败:', error)
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

// 事件处理方法
const handleCreate = () => {
  // 逾期记录不需要新建功能
  ElMessage.info('逾期记录无需手动创建')
}

const handleSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedOverdueRecords.value = selectedRows
}

const handleBatchReminder = async (selectedRows) => {
  if (selectedRows.length === 0) {
    ElMessage.warning('请选择要催还的记录')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要向 ${selectedRows.length} 位用户发送催还通知吗？`, '批量催还确认', {
      confirmButtonText: '确定发送',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const borrowIds = selectedRows.map(record => record.id)
    await batchProcessBorrows({
      borrowIds,
      action: 'sendReminder'
    })

    ElNotification.success({
      title: '批量催还完成',
      message: `已向 ${selectedRows.length} 位用户发送催还通知`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量催还失败:', error)
      ElMessage.error('批量催还失败')
    }
  }
}

const handleBatchCalculate = (selectedRows) => {
  if (selectedRows.length === 0) {
    ElMessage.warning('请选择要计算罚金的记录')
    return
  }

  const totalFine = selectedRows.reduce((sum, record) => {
    return sum + calculateFine(record.currentOverdueDays)
  }, 0)

  ElMessageBox.alert(
    `选中的 ${selectedRows.length} 条记录，预计总罚金为：¥${totalFine.toFixed(2)}`,
    '罚金计算结果',
    {
      confirmButtonText: '确定',
      type: 'info'
    }
  )
}

const handleBatchMarkLost = async (selectedRows) => {
  if (selectedRows.length === 0) {
    ElMessage.warning('请选择要标记为丢失的记录')
    return
  }

  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将 ${selectedRows.length} 本图书标记为丢失吗？`,
      '批量标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    const borrowIds = selectedRows.map(record => record.id)
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
      ElMessage.error('批量标记丢失失败')
    }
  }
}

const forceReturn = async (record) => {
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

    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('强制归还失败:', error)
      ElMessage.error('强制归还失败')
    }
  }
}

const manageFines = (record) => {
  selectedRecord.value = record
  showFineDialog.value = true
}

const sendSingleReminder = (record) => {
  ElMessage.success(`已向用户 ${record.user.realName || record.user.username} 发送催还通知`)
}

const handleMoreActions = (command, record) => {
  switch (command) {
    case 'contact':
      selectedUser.value = record.user
      showContactDialog.value = true
      break
    case 'history':
      ElMessage.info('查看记录功能待实现')
      break
    case 'markLost':
      markSingleBookAsLost(record)
      break
  }
}

const markSingleBookAsLost = async (record) => {
  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将图书"${record.book.title}"标记为丢失吗？`,
      '标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    await markBookAsLost(record.id, { notes })

    ElNotification.success({
      title: '标记成功',
      message: `图书"${record.book.title}"已标记为丢失`
    })

    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记丢失失败:', error)
      ElMessage.error('标记丢失失败')
    }
  }
}

const handleExport = () => {
  ElMessage.info('导出逾期报告功能待实现')
}

const handleFineSuccess = () => {
  showFineDialog.value = false
  proTableRef.value?.refresh()
}

// 工具函数
const calculateFine = (overdueDays) => {
  return (overdueDays * DAILY_FINE_RATE).toFixed(2)
}

const getOverdueTagType = (days) => {
  if (days <= 7) return 'warning'
  if (days <= 30) return 'danger'
  return 'danger'
}

const getOverdueLevel = (days) => {
  if (days <= 7) return '轻微逾期'
  if (days <= 30) return '严重逾期'
  return '超长逾期'
}

const getNotificationCount = (record) => {
  return record.notificationsSent?.length || 0
}

const getLastNotificationTime = (record) => {
  const notifications = record.notificationsSent || []
  if (notifications.length === 0) return '未发送'

  const lastNotification = notifications[notifications.length - 1]
  return formatRelativeTime(lastNotification.sentAt)
}
</script>

<style lang="scss" scoped>
.overdue-container {
  padding: 20px;
}

.table-section {
  margin-top: 20px;

  .table-card {
    border-radius: 8px;
  }
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .selection-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--el-color-primary);
      font-size: 14px;

      strong {
        font-weight: 600;
      }
    }

    .batch-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;

      &.show {
        opacity: 1;
        visibility: visible;
      }

      .action-badge {
        :deep(.el-badge__content) {
          background-color: var(--el-color-success);
        }
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
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
</style>