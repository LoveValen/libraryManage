<template>
  <div class="borrow-detail-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack" link size="large">返回</el-button>
        <div class="header-info">
          <h1>借阅详情</h1>
          <p class="description">借阅记录 #{{ borrowRecord?.id || '' }} 的详细信息</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="default" :icon="Refresh" @click="loadBorrowDetail">刷新</el-button>
        <el-button type="default" :icon="Printer" @click="() => window.print()">打印</el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <template v-if="borrowRecord">
        <!-- 基本信息卡片 -->
        <el-card shadow="never" class="basic-info-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><InfoFilled /></el-icon>
                基本信息
              </div>
              <div class="header-status">
                <StatusTag :value="borrowRecord.status" :config="borrowStatusConfig" :show-icon="true" size="large" />
                <div v-if="borrowRecord.isCurrentlyOverdue" class="overdue-warning">
                  <el-tag type="danger" size="default">逾期 {{ borrowRecord.currentOverdueDays }} 天</el-tag>
                </div>
              </div>
            </div>
          </template>

          <div class="basic-info-content">
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="info-section">
                  <h4 class="section-title">借阅用户</h4>
                  <div class="user-card">
                    <el-avatar :src="borrowRecord.user?.avatar" :size="60" class="user-avatar">
                      {{ borrowRecord.user?.realName?.charAt(0) || borrowRecord.user?.username?.charAt(0) }}
                    </el-avatar>
                    <div class="user-details">
                      <div class="user-name">{{ borrowRecord.user?.realName || borrowRecord.user?.username }}</div>
                      <div class="user-meta">{{ borrowRecord.user?.email }}</div>
                      <div class="user-meta">联系电话: {{ borrowRecord.user?.phone || '未设置' }}</div>
                      <div class="user-meta">学号: {{ borrowRecord.user?.studentId || '未设置' }}</div>
                    </div>
                    <div class="user-actions">
                      <el-button link :icon="User" @click="viewUserDetail" size="small">查看用户</el-button>
                      <el-button link :icon="Phone" @click="contactUser" size="small">联系用户</el-button>
                    </div>
                  </div>
                </div>
              </el-col>

              <el-col :span="12">
                <div class="info-section">
                  <h4 class="section-title">借阅图书</h4>
                  <div class="book-card">
                    <el-image :src="borrowRecord.book?.coverImage" class="book-cover" fit="cover">
                      <template #error>
                        <div class="book-cover-placeholder">
                          <el-icon><Reading /></el-icon>
                        </div>
                      </template>
                    </el-image>
                    <div class="book-details">
                      <div class="book-title">{{ borrowRecord.book?.title }}</div>
                      <div class="book-meta">
                        作者:
                        {{
                          Array.isArray(borrowRecord.book?.authors)
                            ? borrowRecord.book.authors.join(', ')
                            : borrowRecord.book?.authors
                        }}
                      </div>
                      <div class="book-meta">ISBN: {{ borrowRecord.book?.isbn }}</div>
                      <div class="book-meta">分类: {{ borrowRecord.book?.category || '未分类' }}</div>
                      <div class="book-meta">出版社: {{ borrowRecord.book?.publisher || '未知' }}</div>
                    </div>
                    <div class="book-actions">
                      <el-button link :icon="Reading" @click="viewBookDetail" size="small">查看图书</el-button>
                    </div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 时间线信息 -->
        <el-card shadow="never" class="timeline-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Clock /></el-icon>
                借阅时间线
              </div>
            </div>
          </template>

          <div class="timeline-content">
            <el-row :gutter="24">
              <el-col :span="6">
                <div class="timeline-item">
                  <div class="timeline-label">借阅时间</div>
                  <div class="timeline-value">{{ formatDate(borrowRecord.borrowDate) }}</div>
                  <div class="timeline-meta">{{ formatRelativeTime(borrowRecord.borrowDate) }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="timeline-item">
                  <div class="timeline-label">应还时间</div>
                  <div class="timeline-value" :class="getDueDateClass()">
                    {{ formatDate(borrowRecord.dueDate) }}
                  </div>
                  <div class="timeline-meta">
                    <span v-if="borrowRecord.status === 'borrowed'" :class="getDaysRemainingClass()">
                      {{ getDaysRemainingText() }}
                    </span>
                    <span v-else>-</span>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="timeline-item">
                  <div class="timeline-label">实际归还</div>
                  <div v-if="borrowRecord.returnDate" class="timeline-value">
                    {{ formatDate(borrowRecord.returnDate) }}
                  </div>
                  <div v-else class="timeline-value text-muted">未归还</div>
                  <div class="timeline-meta">
                    {{ borrowRecord.returnDate ? formatRelativeTime(borrowRecord.returnDate) : '-' }}
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="timeline-item">
                  <div class="timeline-label">借阅时长</div>
                  <div class="timeline-value">{{ getBorrowDuration() }}</div>
                  <div class="timeline-meta">
                    续借 {{ borrowRecord.renewalCount || 0 }}/{{ borrowRecord.maxRenewals || 2 }} 次
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 操作历史 -->
        <el-card shadow="never" class="actions-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Operation /></el-icon>
                操作历史
              </div>
              <div class="header-actions">
                <el-button
                  link
                  :icon="Refresh"
                  @click="loadBorrowHistory"
                  :loading="historyLoading"
                  size="small"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <div v-loading="historyLoading" class="actions-content">
            <el-timeline>
              <el-timeline-item
                v-for="(action, index) in borrowHistory"
                :key="index"
                :timestamp="formatDateTime(action.createdAt)"
                :type="getActionTimelineType(action.action)"
                :icon="getActionIcon(action.action)"
                size="large"
              >
                <div class="timeline-action">
                  <div class="action-title">{{ getActionTitle(action.action) }}</div>
                  <div class="action-description">{{ getActionDescription(action) }}</div>
                  <div v-if="action.notes" class="action-notes">备注: {{ action.notes }}</div>
                  <div class="action-operator">
                    操作员: {{ action.operatorUser?.realName || action.operatorUser?.username || '系统' }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>

            <el-empty
              v-if="!historyLoading && borrowHistory.length === 0"
              description="暂无操作历史"
              image-size="120"
            />
          </div>
        </el-card>

        <!-- 附加信息 -->
        <el-row :gutter="20">
          <!-- 罚金信息 -->
          <el-col :span="12">
            <el-card shadow="never" class="fine-card">
              <template #header>
                <div class="card-header">
                  <div class="header-title">
                    <el-icon><Money /></el-icon>
                    罚金信息
                  </div>
                </div>
              </template>

              <div class="fine-content">
                <div v-if="borrowRecord.fineAmount > 0" class="fine-details">
                  <div class="fine-item">
                    <span class="fine-label">罚金总额:</span>
                    <span class="fine-value danger">¥{{ borrowRecord.fineAmount.toFixed(2) }}</span>
                  </div>
                  <div class="fine-item">
                    <span class="fine-label">支付状态:</span>
                    <el-tag :type="borrowRecord.finePaid ? 'success' : 'danger'" size="small">
                      {{ borrowRecord.finePaid ? '已支付' : '未支付' }}
                    </el-tag>
                  </div>
                  <div v-if="borrowRecord.finePaidAt" class="fine-item">
                    <span class="fine-label">支付时间:</span>
                    <span class="fine-value">{{ formatDate(borrowRecord.finePaidAt) }}</span>
                  </div>
                </div>
                <div v-else class="no-fine">
                  <el-icon class="no-fine-icon"><CircleCheck /></el-icon>
                  <span>无罚金</span>
                </div>

                <div
                  v-if="borrowRecord.isCurrentlyOverdue && borrowRecord.status === 'borrowed'"
                  class="predicted-fine"
                >
                  <el-alert
                    title="预计罚金"
                    :description="`如当前逾期状态持续，预计产生罚金 ¥${calculatePredictedFine()}`"
                    type="warning"
                    :closable="false"
                  />
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 通知记录 -->
          <el-col :span="12">
            <el-card shadow="never" class="notifications-card">
              <template #header>
                <div class="card-header">
                  <div class="header-title">
                    <el-icon><Bell /></el-icon>
                    通知记录
                  </div>
                  <div class="header-actions">
                    <el-button
                      type="primary"
                      :icon="Message"
                      @click="sendReminder"
                      size="small"
                      v-if="['borrowed', 'overdue'].includes(borrowRecord.status)"
                    >
                      发送提醒
                    </el-button>
                  </div>
                </div>
              </template>

              <div class="notifications-content">
                <div v-if="borrowRecord.notificationsSent?.length > 0" class="notifications-list">
                  <div
                    v-for="(notification, index) in borrowRecord.notificationsSent"
                    :key="index"
                    class="notification-item"
                  >
                    <div class="notification-info">
                      <div class="notification-type">{{ notification.type || '催还提醒' }}</div>
                      <div class="notification-time">{{ formatRelativeTime(notification.sentAt) }}</div>
                    </div>
                    <el-tag :type="notification.success ? 'success' : 'danger'" size="small">
                      {{ notification.success ? '成功' : '失败' }}
                    </el-tag>
                  </div>
                </div>
                <div v-else class="no-notifications">
                  <el-icon class="no-notifications-icon"><Bell /></el-icon>
                  <span>暂无通知记录</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 相关记录 -->
        <el-card shadow="never" class="related-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Connection /></el-icon>
                相关记录
              </div>
            </div>
          </template>

          <div class="related-content">
            <el-tabs v-model="activeRelatedTab">
              <el-tab-pane label="用户借阅历史" name="userHistory">
                <div v-loading="userHistoryLoading" class="related-list">
                  <div
                    v-for="record in userBorrowHistory"
                    :key="record.id"
                    class="related-item"
                    @click="viewRelatedBorrow(record)"
                  >
                    <div class="related-book">{{ record.book?.title }}</div>
                    <div class="related-meta">
                      {{ formatDate(record.borrowDate) }} -
                      {{ record.returnDate ? formatDate(record.returnDate) : '借阅中' }}
                    </div>
                    <StatusTag :value="record.status" :config="borrowStatusConfig" size="small" />
                  </div>
                  <el-empty
                    v-if="!userHistoryLoading && userBorrowHistory.length === 0"
                    description="暂无其他借阅记录"
                    image-size="80"
                  />
                </div>
              </el-tab-pane>

              <el-tab-pane label="图书借阅历史" name="bookHistory">
                <div v-loading="bookHistoryLoading" class="related-list">
                  <div
                    v-for="record in bookBorrowHistory"
                    :key="record.id"
                    class="related-item"
                    @click="viewRelatedBorrow(record)"
                  >
                    <div class="related-user">{{ record.user?.realName || record.user?.username }}</div>
                    <div class="related-meta">
                      {{ formatDate(record.borrowDate) }} -
                      {{ record.returnDate ? formatDate(record.returnDate) : '借阅中' }}
                    </div>
                    <StatusTag :value="record.status" :config="borrowStatusConfig" size="small" />
                  </div>
                  <el-empty
                    v-if="!bookHistoryLoading && bookBorrowHistory.length === 0"
                    description="暂无其他借阅记录"
                    image-size="80"
                  />
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-card>
      </template>
    </div>

    <!-- 快速操作浮动按钮 -->
    <div v-if="borrowRecord && ['borrowed', 'overdue'].includes(borrowRecord.status)" class="floating-actions">
      <el-button-group>
        <el-button v-if="borrowRecord.canRenew" type="warning" :icon="RefreshLeft" @click="renewBorrow" size="large">
          续借
        </el-button>
        <el-button type="success" :icon="Check" @click="returnBorrow" size="large">归还</el-button>
        <el-button type="danger" :icon="Warning" @click="markAsLost" size="large">标记丢失</el-button>
      </el-button-group>
    </div>

    <!-- 联系用户对话框 -->
    <el-dialog v-model="showContactDialog" title="联系用户" width="500px" :close-on-click-modal="false">
      <ContactUser v-if="showContactDialog" :user="borrowRecord?.user" @close="showContactDialog = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  DocumentCopy,
  ArrowLeft,
  Printer,
  InfoFilled,
  User,
  Phone,
  Reading,
  Clock,
  Operation,
  Money,
  Bell,
  Message,
  Connection,
  Refresh,
  RefreshLeft,
  Check,
  Warning,
  CircleCheck
} from '@element-plus/icons-vue'
import { StatusTag } from '@/components/common'
import ContactUser from './components/ContactUser.vue'
import {
  getBorrowDetail,
  getBorrowHistory,
  getUserBorrowHistory,
  getBookBorrowHistory,
  returnBook,
  renewBook,
  markBookAsLost,
  sendBorrowReminder
} from '@/api/borrows'
import { formatDate, formatRelativeTime, formatDateTime } from '@/utils/date'

// Router
const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const historyLoading = ref(false)
const userHistoryLoading = ref(false)
const bookHistoryLoading = ref(false)
const showContactDialog = ref(false)

const borrowRecord = ref(null)
const borrowHistory = ref([])
const userBorrowHistory = ref([])
const bookBorrowHistory = ref([])
const activeRelatedTab = ref('userHistory')

// 每日罚金费率
const DAILY_FINE_RATE = 0.5


// 借阅状态配置
const borrowStatusConfig = {
  borrowed: { type: 'success', text: '借阅中', icon: 'Reading' },
  returned: { type: 'info', text: '已归还', icon: 'Check' },
  overdue: { type: 'danger', text: '逾期', icon: 'Warning' },
  lost: { type: 'danger', text: '丢失', icon: 'Close' },
  damaged: { type: 'warning', text: '损坏', icon: 'Warning' }
}

// 方法
const loadBorrowDetail = async () => {
  loading.value = true
  try {
    const borrowId = route.params.id
    const response = await getBorrowDetail(borrowId)
    borrowRecord.value = response.data

    // 加载相关数据
    loadBorrowHistory()
    loadUserBorrowHistory()
    loadBookBorrowHistory()
  } catch (error) {
    console.error('加载借阅详情失败:', error)
    ElMessage.error('加载借阅详情失败')
  } finally {
    loading.value = false
  }
}

const loadBorrowHistory = async () => {
  if (!borrowRecord.value) return

  historyLoading.value = true
  try {
    const response = await getBorrowHistory(borrowRecord.value.id)
    borrowHistory.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('加载操作历史失败:', error)
  } finally {
    historyLoading.value = false
  }
}

const loadUserBorrowHistory = async () => {
  if (!borrowRecord.value) return

  userHistoryLoading.value = true
  try {
    const response = await getUserBorrowHistory(borrowRecord.value.userId, {
      limit: 10,
      excludeId: borrowRecord.value.id
    })
    userBorrowHistory.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('加载用户借阅历史失败:', error)
  } finally {
    userHistoryLoading.value = false
  }
}

const loadBookBorrowHistory = async () => {
  if (!borrowRecord.value) return

  bookHistoryLoading.value = true
  try {
    const response = await getBookBorrowHistory(borrowRecord.value.bookId, {
      limit: 10,
      excludeId: borrowRecord.value.id
    })
    bookBorrowHistory.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('加载图书借阅历史失败:', error)
  } finally {
    bookHistoryLoading.value = false
  }
}


const handleBack = () => {
  router.push({ name: 'BorrowList' })
}

const viewUserDetail = () => {
  router.push({
    name: 'SystemUserDetail',
    params: { id: borrowRecord.value.userId }
  })
}

const viewBookDetail = () => {
  router.push({
    name: 'BookDetail',
    params: { id: borrowRecord.value.bookId }
  })
}

const contactUser = () => {
  showContactDialog.value = true
}

const viewRelatedBorrow = record => {
  router.push({
    name: 'BorrowDetail',
    params: { id: record.id }
  })
}

const returnBorrow = async () => {
  try {
    await ElMessageBox.confirm(`确定要归还图书"${borrowRecord.value.book.title}"吗？`, '归还确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await returnBook(borrowRecord.value.id, { condition: 'good' })
    ElNotification.success({
      title: '归还成功',
      message: `图书"${borrowRecord.value.book.title}"已成功归还`
    })

    loadBorrowDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('归还图书失败:', error)
      ElMessage.error('归还图书失败')
    }
  }
}

const renewBorrow = async () => {
  try {
    await ElMessageBox.confirm(`确定要续借图书"${borrowRecord.value.book.title}"吗？`, '续借确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await renewBook(borrowRecord.value.id)
    ElNotification.success({
      title: '续借成功',
      message: `图书"${borrowRecord.value.book.title}"已成功续借`
    })

    loadBorrowDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('续借图书失败:', error)
      ElMessage.error('续借图书失败')
    }
  }
}

const markAsLost = async () => {
  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将图书"${borrowRecord.value.book.title}"标记为丢失吗？`,
      '标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    await markBookAsLost(borrowRecord.value.id, { notes })
    ElNotification.success({
      title: '标记成功',
      message: `图书"${borrowRecord.value.book.title}"已标记为丢失`
    })

    loadBorrowDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记丢失失败:', error)
      ElMessage.error('标记丢失失败')
    }
  }
}

const sendReminder = async () => {
  try {
    await sendBorrowReminder(borrowRecord.value.id)
    ElMessage.success('提醒发送成功')
    loadBorrowDetail()
  } catch (error) {
    console.error('发送提醒失败:', error)
    ElMessage.error('发送提醒失败')
  }
}

// 工具函数
const getDueDateClass = () => {
  if (borrowRecord.value.status !== 'borrowed') return ''

  const daysRemaining = borrowRecord.value.daysRemaining
  if (daysRemaining <= 0) return 'text-danger'
  if (daysRemaining <= 3) return 'text-warning'
  return ''
}

const getDaysRemainingClass = () => {
  const daysRemaining = borrowRecord.value.daysRemaining
  if (daysRemaining <= 0) return 'text-danger'
  if (daysRemaining <= 3) return 'text-warning'
  return 'text-success'
}

const getDaysRemainingText = () => {
  const daysRemaining = borrowRecord.value.daysRemaining
  if (daysRemaining <= 0) {
    return `逾期 ${Math.abs(daysRemaining)} 天`
  } else {
    return `还有 ${daysRemaining} 天`
  }
}

const getBorrowDuration = () => {
  if (!borrowRecord.value.borrowDate) return '-'

  const startDate = new Date(borrowRecord.value.borrowDate)
  const endDate = borrowRecord.value.returnDate ? new Date(borrowRecord.value.returnDate) : new Date()

  const diffTime = Math.abs(endDate - startDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return `${diffDays} 天`
}

const calculatePredictedFine = () => {
  if (!borrowRecord.value.isCurrentlyOverdue) return '0.00'

  const overdueDays = borrowRecord.value.currentOverdueDays || 0
  return (overdueDays * DAILY_FINE_RATE).toFixed(2)
}

const getActionTimelineType = action => {
  const typeMap = {
    borrow: 'primary',
    return: 'success',
    renew: 'warning',
    overdue: 'danger',
    lost: 'danger',
    reminder: 'info'
  }
  return typeMap[action] || 'primary'
}

const getActionIcon = action => {
  const iconMap = {
    borrow: 'Plus',
    return: 'Check',
    renew: 'RefreshLeft',
    overdue: 'Warning',
    lost: 'Close',
    reminder: 'Bell'
  }
  return iconMap[action] || 'Operation'
}

const getActionTitle = action => {
  const titleMap = {
    borrow: '创建借阅',
    return: '图书归还',
    renew: '续借图书',
    overdue: '逾期提醒',
    lost: '标记丢失',
    reminder: '发送提醒'
  }
  return titleMap[action] || action
}

const getActionDescription = action => {
  const descriptions = {
    borrow: `用户 ${action.operatorUser?.realName || '用户'} 借阅了图书`,
    return: `图书已归还，状态: ${action.condition || '良好'}`,
    renew: `图书续借成功，新的到期日期: ${action.newDueDate ? formatDate(action.newDueDate) : ''}`,
    overdue: '系统检测到图书逾期未还',
    lost: '图书被标记为丢失',
    reminder: '向用户发送了催还提醒'
  }
  return descriptions[action.action] || action.description || ''
}

// 生命周期
onMounted(() => {
  loadBorrowDetail()
})
</script>

<style lang="scss" scoped>
.borrow-detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-info {
      h1 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .description {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.basic-info-card {
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

    .header-status {
      display: flex;
      align-items: center;
      gap: 12px;

      .overdue-warning {
        margin-left: 8px;
      }
    }
  }

  .basic-info-content {
    .info-section {
      .section-title {
        margin: 0 0 16px 0;
        color: var(--el-text-color-primary);
        font-size: 14px;
        font-weight: 600;
      }
    }
  }
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);

  .user-avatar {
    flex-shrink: 0;
  }

  .user-details {
    flex: 1;

    .user-name {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .user-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 2px;
    }
  }

  .user-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.book-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);

  .book-cover {
    width: 80px;
    height: 112px;
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
    flex: 1;

    .book-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 8px;
      color: var(--el-text-color-primary);
      line-height: 1.4;
    }

    .book-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 4px;
    }
  }

  .book-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.timeline-card {
  .timeline-content {
    .timeline-item {
      text-align: center;

      .timeline-label {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 4px;
      }

      .timeline-value {
        font-weight: 600;
        font-size: 16px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .timeline-meta {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

.actions-card {
  .actions-content {
    min-height: 200px;

    .timeline-action {
      .action-title {
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .action-description {
        color: var(--el-text-color-regular);
        margin-bottom: 4px;
      }

      .action-notes {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
        margin-bottom: 4px;
        font-style: italic;
      }

      .action-operator {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

.fine-card {
  .fine-content {
    .fine-details {
      .fine-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .fine-label {
          color: var(--el-text-color-regular);
        }

        .fine-value {
          font-weight: 600;

          &.danger {
            color: var(--el-color-danger);
          }
        }
      }
    }

    .no-fine {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: var(--el-color-success);

      .no-fine-icon {
        font-size: 20px;
      }
    }

    .predicted-fine {
      margin-top: 16px;
    }
  }
}

.notifications-card {
  .notifications-content {
    .notifications-list {
      .notification-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--el-border-color-extra-light);

        &:last-child {
          border-bottom: none;
        }

        .notification-info {
          .notification-type {
            font-weight: 500;
            color: var(--el-text-color-primary);
          }

          .notification-time {
            font-size: 12px;
            color: var(--el-text-color-regular);
            margin-top: 2px;
          }
        }
      }
    }

    .no-notifications {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: var(--el-text-color-placeholder);

      .no-notifications-icon {
        font-size: 20px;
      }
    }
  }
}

.related-card {
  .related-content {
    .related-list {
      .related-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border: 1px solid var(--el-border-color-extra-light);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          border-color: var(--el-color-primary-light-7);
          background: var(--el-color-primary-light-9);
        }

        .related-book,
        .related-user {
          font-weight: 500;
          color: var(--el-text-color-primary);
        }

        .related-meta {
          font-size: 12px;
          color: var(--el-text-color-regular);
        }
      }
    }
  }
}

.floating-actions {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
}

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

// 响应式设计
@media (max-width: 768px) {
  .borrow-detail-container {
    padding: 10px;
  }

  .user-card,
  .book-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .user-actions,
    .book-actions {
      align-self: stretch;
      flex-direction: row;
      justify-content: center;
    }
  }

  .floating-actions {
    bottom: 20px;
    right: 20px;
    left: 20px;

    .el-button-group {
      width: 100%;
      display: flex;

      .el-button {
        flex: 1;
      }
    }
  }
}

// 打印样式
@media print {
  .floating-actions,
  .user-actions,
  .book-actions,
  .header-actions {
    display: none !important;
  }
}
</style>
