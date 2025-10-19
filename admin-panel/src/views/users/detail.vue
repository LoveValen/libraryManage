<template>
  <div class="user-detail-container">
    <!-- 错误边界 -->
    <div v-if="hasError" class="error-boundary">
      <el-result icon="error" title="页面加载失败" sub-title="抱歉，页面出现了一些问题，请刷新页面重试">
        <template #extra>
          <el-button type="primary" @click="handleRetry">重新加载</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else v-loading="loading" element-loading-text="加载中...">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <el-button @click="goBack" class="back-button">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <div class="header-info">
            <h1 class="page-title">用户详情</h1>
            <p class="page-description">查看用户的详细信息和相关数据</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button type="success" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑用户
          </el-button>
          <el-dropdown @command="handleAction">
            <el-button type="primary">
              更多操作
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="resetPassword">
                  <el-icon><Key /></el-icon>
                  重置密码
                </el-dropdown-item>
                <el-dropdown-item command="toggleStatus">
                  <el-icon><Switch /></el-icon>
                  {{ userInfo.status === 'active' ? '禁用用户' : '启用用户' }}
                </el-dropdown-item>
                <el-dropdown-item command="sendMessage">
                  <el-icon><Message /></el-icon>
                  发送消息
                </el-dropdown-item>
                <el-dropdown-item command="viewLogs">
                  <el-icon><Document /></el-icon>
                  查看日志
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  删除用户
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 用户基本信息卡片 -->
      <div class="info-section">
        <el-row :gutter="20">
          <el-col :lg="8" :md="24">
            <el-card class="user-profile-card" shadow="never">
              <div class="profile-header">
                <el-avatar :size="80" :src="userInfo.avatar" class="profile-avatar">
                  <el-icon><User /></el-icon>
                </el-avatar>
                <div class="profile-info">
                  <h2 class="profile-name">{{ userInfo.realName || userInfo.username }}</h2>
                  <p class="profile-username">@{{ userInfo.username }}</p>
                  <div class="profile-tags">
                    <el-tag :type="getRoleTagType(userInfo.role)" size="small">
                      {{ getRoleText(userInfo.role) }}
                    </el-tag>
                    <el-tag :type="userInfo.status === 'active' ? 'success' : 'danger'" size="small">
                      {{ getStatusText(userInfo.status) }}
                    </el-tag>
                  </div>
                </div>
              </div>

              <div class="profile-stats">
                <div class="stat-item">
                  <div class="stat-value">{{ userInfo.points?.balance || 0 }}</div>
                  <div class="stat-label">积分</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ userInfo.currentBorrows || 0 }}</div>
                  <div class="stat-label">在借</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ userInfo.totalBorrows || 0 }}</div>
                  <div class="stat-label">总借阅</div>
                </div>
              </div>

              <div class="profile-actions">
                <el-button type="primary" @click="openPointsDialog">
                  <el-icon><TrophyBase /></el-icon>
                  积分记录
                </el-button>
                <el-button @click="openBorrowsDialog">
                  <el-icon><Reading /></el-icon>
                  借阅记录
                </el-button>
              </div>
            </el-card>
          </el-col>

          <el-col :lg="16" :md="24">
            <el-card class="user-details-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <span class="card-title">基本信息</span>
                  <el-button link @click="handleEdit">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                </div>
              </template>

              <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">用户名</div>
                  <div class="detail-value">{{ userInfo.username }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">真实姓名</div>
                  <div class="detail-value">{{ userInfo.realName || '-' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">邮箱</div>
                  <div class="detail-value">
                    <span>{{ userInfo.email || '-' }}</span>
                    <el-tag v-if="userInfo.emailVerified" type="success" size="small" class="verify-tag">已验证</el-tag>
                    <el-tag v-else type="warning" size="small" class="verify-tag">未验证</el-tag>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">手机号</div>
                  <div class="detail-value">
                    <span>{{ userInfo.phone || '-' }}</span>
                    <el-tag v-if="userInfo.phoneVerified" type="success" size="small" class="verify-tag">已验证</el-tag>
                    <el-tag v-else type="warning" size="small" class="verify-tag">未验证</el-tag>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">性别</div>
                  <div class="detail-value">{{ getGenderText(userInfo.gender) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">生日</div>
                  <div class="detail-value">{{ formatDate(userInfo.birthday) || '-' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">学号/工号</div>
                  <div class="detail-value">{{ userInfo.studentId || '-' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">院系/部门</div>
                  <div class="detail-value">{{ userInfo.department || '-' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">注册时间</div>
                  <div class="detail-value">{{ formatDateTime(userInfo.createdAt) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">最后登录</div>
                  <div class="detail-value">
                    <span>{{ formatDateTime(userInfo.lastLoginAt) || '从未登录' }}</span>
                    <div v-if="userInfo.lastLoginIp" class="detail-sub">IP: {{ userInfo.lastLoginIp }}</div>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">更新时间</div>
                  <div class="detail-value">{{ formatDateTime(userInfo.updatedAt) }}</div>
                </div>
                <div class="detail-item detail-item--full">
                  <div class="detail-label">个人简介</div>
                  <div class="detail-value">{{ userInfo.bio || '暂无个人简介' }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 数据统计 -->
      <div class="stats-section">
        <el-row :gutter="20">
          <el-col :lg="12" :md="24">
            <el-card class="chart-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <span class="card-title">借阅趋势</span>
                  <el-button-group size="small">
                    <el-button
                      v-for="period in borrowPeriods"
                      :key="period.value"
                      :type="currentBorrowPeriod === period.value ? 'primary' : ''"
                      @click="changeBorrowPeriod(period.value)"
                    >
                      {{ period.label }}
                    </el-button>
                  </el-button-group>
                </div>
              </template>
              <div class="chart-container" ref="borrowChartRef"></div>
            </el-card>
          </el-col>

          <el-col :lg="12" :md="24">
            <el-card class="chart-card" shadow="never">
              <template #header>
                <span class="card-title">积分变化</span>
              </template>
              <div class="chart-container" ref="pointsChartRef"></div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 最近活动 -->
      <div class="activity-section">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">最近活动</span>
              <el-button link @click="viewAllActivities">查看全部</el-button>
            </div>
          </template>

          <el-timeline>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="formatDateTime(activity.createdAt)"
              :type="getActivityType(activity.type)"
            >
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-description">{{ activity.description }}</div>
                <div class="activity-meta">
                  <el-tag size="small" :type="getActivityTagType(activity.type)">
                    {{ getActivityTypeText(activity.type) }}
                  </el-tag>
                  <span class="activity-ip" v-if="activity.ip">IP: {{ activity.ip }}</span>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>

          <div v-if="recentActivities.length === 0" class="empty-state">
            <el-empty description="暂无活动记录" />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 积分记录对话框 -->
    <el-dialog v-model="showPointsDialog" title="积分记录" width="800px" destroy-on-close>
      <PointsHistory :user-id="userId" />
    </el-dialog>

    <!-- 借阅记录对话框 -->
    <el-dialog v-model="showBorrowsDialog" title="借阅记录" width="900px" destroy-on-close>
      <BorrowHistory :user-id="userId" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { userApi } from '@/api/user'
import { formatDate, formatDateTime, formatTimeAgo } from '@/utils/date'
import { showSuccess, showError, confirmDelete } from '@/utils/message'
import PointsHistory from './components/PointsHistory.vue'
import BorrowHistory from './components/BorrowHistory.vue'

const route = useRoute()
const router = useRouter()

// 错误处理
const hasError = ref(false)
const errorMessage = ref('')

// 响应式数据
const loading = ref(false)
const userInfo = ref({})
const recentActivities = ref([])
const showPointsDialog = ref(false)
const showBorrowsDialog = ref(false)
const borrowChartRef = ref()
const pointsChartRef = ref()
const currentBorrowPeriod = ref('month')

let borrowChart = null
let pointsChart = null

// 计算属性
const userId = computed(() => route.params.id)

// 期间选项
const borrowPeriods = ref([
  { label: '近一周', value: 'week' },
  { label: '近一月', value: 'month' },
  { label: '近三月', value: 'quarter' },
  { label: '近一年', value: 'year' }
])

// 方法
const getRoleText = role => {
  const roleMap = {
    admin: '管理员',
    librarian: '图书管理员',
    user: '普通用户'
  }
  return roleMap[role] || role
}

const getRoleTagType = role => {
  const typeMap = {
    admin: 'danger',
    librarian: 'warning',
    user: 'info'
  }
  return typeMap[role] || 'info'
}

const getStatusText = status => {
  const statusMap = {
    active: '启用',
    inactive: '禁用'
  }
  return statusMap[status] || status
}

const getGenderText = gender => {
  const genderMap = {
    male: '男',
    female: '女',
    other: '其他'
  }
  return genderMap[gender] || '未知'
}

const getActivityType = type => {
  const typeMap = {
    login: 'primary',
    borrow: 'success',
    return: 'info',
    overdue: 'warning',
    violation: 'danger'
  }
  return typeMap[type] || 'primary'
}

const getActivityTagType = type => {
  const typeMap = {
    login: 'info',
    borrow: 'success',
    return: 'primary',
    overdue: 'warning',
    violation: 'danger'
  }
  return typeMap[type] || 'info'
}

const getActivityTypeText = type => {
  const typeMap = {
    login: '登录',
    borrow: '借阅',
    return: '归还',
    overdue: '逾期',
    violation: '违规'
  }
  return typeMap[type] || type
}

const fetchUserDetail = async () => {
  try {
    loading.value = true

    // 检查API是否可用
    if (!userApi || !userApi.getUserDetail) {
      throw new Error('User API is not available')
    }

    const { data } = await userApi.getUserDetail(userId.value)

    if (data && data.user) {
      userInfo.value = data.user
      recentActivities.value = data.activities || []

      // 安全初始化图表
      try {
        await nextTick()
        initCharts()
      } catch (chartError) {
        console.warn('Chart initialization failed:', chartError)
        // 图表初始化失败不影响页面显示
      }
    } else {
      throw new Error('Invalid response data')
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    const message = error.message || '获取用户详情失败'
    showError(message)

    // 如果是关键错误，显示错误页面
    if (error.message === 'User API is not available') {
      hasError.value = true
      errorMessage.value = '系统初始化失败，请刷新页面重试'
    } else {
      goBack()
    }
  } finally {
    loading.value = false
  }
}

const initCharts = () => {
  try {
    initBorrowChart()
    initPointsChart()
  } catch (error) {
    console.error('Charts initialization failed:', error)
    // 图表初始化失败不应该影响整个页面
  }
}

const initBorrowChart = () => {
  try {
    if (!borrowChartRef.value) return

    // 检查echarts是否可用
    if (typeof echarts === 'undefined') {
      console.warn('ECharts is not available')
      return
    }

    borrowChart = echarts.init(borrowChartRef.value)
    updateBorrowChart()

    const resizeHandler = () => {
      try {
        borrowChart?.resize()
      } catch (error) {
        console.error('Chart resize failed:', error)
      }
    }

    window.addEventListener('resize', resizeHandler)
  } catch (error) {
    console.error('Borrow chart initialization failed:', error)
  }
}

const updateBorrowChart = () => {
  try {
    if (!borrowChart) return

    // 模拟数据
    const data = {
      week: {
        categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        borrowData: [1, 2, 0, 3, 1, 2, 1],
        returnData: [0, 1, 2, 1, 3, 1, 2]
      },
      month: {
        categories: ['第1周', '第2周', '第3周', '第4周'],
        borrowData: [8, 12, 6, 10],
        returnData: [6, 10, 8, 9]
      }
    }

    const currentData = data[currentBorrowPeriod.value] || data.month

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['借阅', '归还']
      },
      xAxis: {
        type: 'category',
        data: currentData.categories
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '借阅',
          type: 'bar',
          data: currentData.borrowData,
          itemStyle: {
            color: '#409EFF'
          }
        },
        {
          name: '归还',
          type: 'bar',
          data: currentData.returnData,
          itemStyle: {
            color: '#67C23A'
          }
        }
      ]
    }

    borrowChart.setOption(option)
  } catch (error) {
    console.error('Update borrow chart failed:', error)
  }
}

const initPointsChart = () => {
  try {
    if (!pointsChartRef.value) return

    // 检查echarts是否可用
    if (typeof echarts === 'undefined') {
      console.warn('ECharts is not available')
      return
    }

    pointsChart = echarts.init(pointsChartRef.value)

    // 模拟积分变化数据
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          return `${params[0].name}<br/>积分: ${params[0].value}`
        }
      },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '积分',
          type: 'line',
          data: [120, 150, 180, 200, 250, 300],
          smooth: true,
          itemStyle: {
            color: '#E6A23C'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(230, 162, 60, 0.3)' },
                { offset: 1, color: 'rgba(230, 162, 60, 0.1)' }
              ]
            }
          }
        }
      ]
    }

    pointsChart.setOption(option)

    const resizeHandler = () => {
      try {
        pointsChart?.resize()
      } catch (error) {
        console.error('Points chart resize failed:', error)
      }
    }

    window.addEventListener('resize', resizeHandler)
  } catch (error) {
    console.error('Points chart initialization failed:', error)
  }
}

const changeBorrowPeriod = period => {
  currentBorrowPeriod.value = period
  updateBorrowChart()
}

const goBack = () => {
  try {
    router.go(-1)
  } catch (error) {
    console.error('Navigation failed:', error)
    try {
      router.push('/system/users')
    } catch (pushError) {
      console.error('Push navigation failed:', pushError)
      window.location.href = '/system/users'
    }
  }
}

// 重试函数
const handleRetry = () => {
  hasError.value = false
  errorMessage.value = ''
  fetchUserDetail()
}

const handleEdit = () => {
  router.push(`/system/users/edit/${userId.value}`)
}

const handleAction = async command => {
  try {
    if (hasError.value) {
      showError('页面状态异常，请刷新后重试')
      return
    }

    switch (command) {
      case 'resetPassword':
        await handleResetPassword()
        break
      case 'toggleStatus':
        await handleToggleStatus()
        break
      case 'sendMessage':
        handleSendMessage()
        break
      case 'viewLogs':
        handleViewLogs()
        break
      case 'delete':
        await handleDelete()
        break
      default:
        console.warn('Unknown command:', command)
    }
  } catch (error) {
    console.error('Action failed:', error)
    showError('操作失败，请重试')
  }
}

const handleResetPassword = async () => {
  try {
    const confirmed = await confirmDelete(1, '用户密码', `确定要重置用户"${userInfo.value.username}"的密码吗？新密码将通过邮件发送给用户。`)
    if (!confirmed) return

    await userApi.resetPassword(userId.value)
    showSuccess('密码重置成功')
  } catch (error) {
    console.error('重置密码失败:', error)
    showError('重置密码失败')
  }
}

const handleToggleStatus = async () => {
  try {
    const action = userInfo.value.status === 'active' ? '禁用' : '启用'
    const confirmed = await confirmDelete(1, '用户状态', `确定要${action}用户"${userInfo.value.username}"吗？`)
    if (!confirmed) return

    const newStatus = userInfo.value.status === 'active' ? 'inactive' : 'active'
    await userApi.updateUser(userId.value, { status: newStatus })

    userInfo.value.status = newStatus
    showSuccess(`用户${action}成功`)
  } catch (error) {
    console.error('更新用户状态失败:', error)
    showError('更新用户状态失败')
  }
}

const handleSendMessage = () => {
  showError('发送消息功能开发中...')
}

const handleViewLogs = () => {
  router.push(`/system/logs?userId=${userId.value}`)
}

const handleDelete = async () => {
  try {
    const confirmed = await confirmDelete(1, '用户', `确定要删除用户"${userInfo.value.username}"吗？`)
    if (!confirmed) return

    await userApi.deleteUser(userId.value)
    showSuccess('用户删除成功')
    router.push('/system/users')
  } catch (error) {
    console.error('删除用户失败:', error)
    showError('删除用户失败')
  }
}

const openPointsDialog = () => {
  showPointsDialog.value = true
}

const openBorrowsDialog = () => {
  showBorrowsDialog.value = true
}

const viewAllActivities = () => {
  router.push(`/system/logs?userId=${userId.value}`)
}

// 生命周期 - 安全初始化
onMounted(() => {
  try {
    fetchUserDetail()
  } catch (error) {
    console.error('Component mount failed:', error)
    hasError.value = true
    errorMessage.value = '页面初始化失败'
  }
})

onBeforeUnmount(() => {
  try {
    borrowChart?.dispose()
    pointsChart?.dispose()
    // 清理事件监听器
    window.removeEventListener('resize', () => {})
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
})
</script>

<style lang="scss" scoped>
.user-detail-container {
  padding: 20px;
  background-color: var(--content-bg-color);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  padding: 8px 12px;
}

.header-info {
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 4px 0;
  }

  .page-description {
    color: var(--el-text-color-secondary);
    margin: 0;
    font-size: 14px;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.info-section {
  margin-bottom: 20px;
}

.user-profile-card {
  height: 100%;

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.profile-avatar {
  flex-shrink: 0;
  border: 3px solid var(--el-border-color-light);
}

.profile-info {
  flex: 1;
  min-width: 0;

  .profile-name {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 4px 0;
  }

  .profile-username {
    color: var(--el-text-color-secondary);
    margin: 0 0 12px 0;
    font-size: 14px;
  }
}

.profile-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 20px 0;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.stat-item {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-color-primary);
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.profile-actions {
  display: flex;
  gap: 12px;

  .el-button {
    flex: 1;
  }
}

.user-details-card {
  height: 100%;

  :deep(.el-card__body) {
    padding: 0;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.detail-item {
  &--full {
    grid-column: 1 / -1;
  }
}

.detail-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.detail-value {
  font-size: 15px;
  color: var(--el-text-color-primary);
  line-height: 1.5;

  .verify-tag {
    margin-left: 8px;
  }

  .detail-sub {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }
}

.stats-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;

  :deep(.el-card__body) {
    height: calc(100% - 57px);
    padding: 0;
  }
}

.chart-container {
  height: 100%;
  padding: 20px;
}

.activity-section {
  .el-card {
    :deep(.el-card__body) {
      padding: 0 20px 20px 20px;
    }
  }
}

.activity-content {
  .activity-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .activity-description {
    color: var(--el-text-color-regular);
    margin-bottom: 8px;
    line-height: 1.5;
  }
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 12px;

  .activity-ip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.empty-state {
  padding: 40px 0;
}

// 错误边界样式
.error-boundary {
  padding: 40px 20px;
  text-align: center;
}

// 响应式设计 - 使用标准媒体查询避免mixin问题
@media (min-width: 768px) and (max-width: 991px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .profile-stats {
    flex-direction: column;
    gap: 16px;

    .stat-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:last-child {
        border-bottom: none;
      }
    }
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .user-detail-container {
    padding: 16px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;

    .el-button {
      width: 100%;
    }
  }

  .profile-actions {
    flex-direction: column;
  }

  .chart-card {
    height: 300px;
  }
}
</style>
