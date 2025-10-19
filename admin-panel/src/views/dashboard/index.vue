<template>
  <div class="dashboard-container">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1 class="welcome-title">{{ getGreeting() }}，{{ userInfo.realName || userInfo.username }}！</h1>
          <p class="welcome-subtitle">欢迎回到图书管理系统，今天是一个美好的{{ currentDate }}</p>
        </div>
        <div class="welcome-avatar">
          <el-avatar :size="80" :src="userInfo.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
        </div>
      </div>
      <div class="quick-actions">
        <el-button
          v-for="action in quickActions"
          :key="action.key"
          :type="action.type"
          :icon="action.icon"
          @click="handleQuickAction(action.key)"
        >
          {{ action.label }}
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="stat in statsData" :key="stat.key" class="stat-card" :class="`stat-card--${stat.type}`">
        <div class="stat-icon">
          <el-icon :class="`icon--${stat.type}`">
            <component :is="stat.icon" />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stat.value) }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-change" :class="{ positive: stat.change > 0, negative: stat.change < 0 }">
            <el-icon>
              <component :is="stat.change > 0 ? 'TrendCharts' : 'Bottom'" />
            </el-icon>
            <span>{{ Math.abs(stat.change) }}%</span>
            <span class="change-period">{{ stat.period }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表和数据展示 -->
    <div class="charts-grid">
      <!-- 借阅趋势图 -->
      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><TrendCharts /></el-icon>
            借阅趋势分析
          </h3>
          <el-button-group size="small">
            <el-button
              v-for="period in trendPeriods"
              :key="period.value"
              :type="currentTrendPeriod === period.value ? 'primary' : ''"
              @click="changeTrendPeriod(period.value)"
            >
              {{ period.label }}
            </el-button>
          </el-button-group>
        </div>
        <div class="chart-container" ref="borrowTrendChartRef"></div>
      </div>

      <!-- 图书分类统计 -->
      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><PieChart /></el-icon>
            图书分类统计
          </h3>
        </div>
        <div class="chart-container" ref="categoryChartRef"></div>
      </div>
    </div>

    <!-- 系统通知 -->
    <div class="notification-section" v-if="systemNotifications.length > 0">
      <h3 class="section-title">
        <el-icon><Message /></el-icon>
        系统通知
      </h3>
      <div class="notification-list">
        <el-alert
          v-for="notification in systemNotifications"
          :key="notification.id"
          :title="notification.title"
          :description="notification.description"
          :type="notification.type"
          :closable="true"
          @close="dismissNotification(notification.id)"
          class="notification-item"
        >
          <template #default>
            <div class="notification-content">
              <div class="notification-text">
                <strong>{{ notification.title }}</strong>
                <p>{{ notification.description }}</p>
              </div>
              <div class="notification-time">
                {{ formatTime(notification.time) }}
              </div>
            </div>
          </template>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showError, showInfo } from '@/utils/message'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '@/utils/date'
import { removeEmpty } from '@/utils/global'
import * as echarts from 'echarts'
import {
  getDashboardStats,
  getBorrowTrend,
  getCategoryStats,
  getSystemNotifications
} from '@/api/dashboard'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// 响应式数据
const borrowTrendChartRef = ref()
const categoryChartRef = ref()
const currentTrendPeriod = ref('week')
let borrowTrendChart = null
let categoryChart = null

// 计算属性
const userInfo = computed(() => authStore.userInfo || {})
const currentDate = computed(() => {
  const now = new Date()
  return formatDateTimeUtil(now)
})

// 快捷操作
const quickActions = ref([
  { key: 'addBook', label: '添加图书', type: 'primary', icon: 'Plus' },
  { key: 'borrowBook', label: '借阅管理', type: 'success', icon: 'Reading' },
  { key: 'userManage', label: '用户管理', type: 'warning', icon: 'User' },
  { key: 'systemSettings', label: '系统设置', type: 'info', icon: 'Setting' }
])

// 统计数据
const statsData = ref([
  {
    key: 'totalBooks',
    label: '图书总数',
    value: 0,
    change: 0,
    period: '较上月',
    type: 'primary',
    icon: 'Reading'
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    value: 0,
    change: 0,
    period: '较上月',
    type: 'success',
    icon: 'User'
  },
  {
    key: 'borrowings',
    label: '当月借阅',
    value: 0,
    change: 0,
    period: '较上月',
    type: 'warning',
    icon: 'DocumentCopy'
  },
  {
    key: 'revenue',
    label: '系统积分',
    value: 0,
    change: 0,
    period: '较上月',
    type: 'danger',
    icon: 'Money'
  }
])

// 趋势期间选项
const trendPeriods = ref([
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' }
])


// 系统通知
const systemNotifications = ref([])
const loading = ref(true)

// 方法
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
}

const formatNumber = num => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toLocaleString()
}

const formatTime = time => {
  const now = new Date()
  const diff = now - time
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDateTimeUtil(time)
}

const formatDate = date => {
  const formatted = formatDateUtil(date)
  return formatted || ''
}

const getStatusText = status => {
  const statusMap = {
    success: '成功',
    pending: '待处理',
    warning: '警告',
    error: '错误'
  }
  return statusMap[status] || status
}


const handleQuickAction = actionKey => {
  const actionMap = {
    addBook: () => router.push('/books/add'),
    borrowBook: () => router.push('/borrows'),
    userManage: () => router.push('/system/users'),
    systemSettings: () => router.push('/settings')
  }

  const action = actionMap[actionKey]
  if (action) {
    action()
  } else {
    showInfo(`${actionKey} 功能开发中`)
  }
}

const changeTrendPeriod = async period => {
  currentTrendPeriod.value = period
  await fetchBorrowTrendData()
  updateBorrowTrendChart()
}



const dismissNotification = id => {
  const index = systemNotifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    systemNotifications.value.splice(index, 1)
  }
}

// 图表相关方法
const initBorrowTrendChart = () => {
  if (!borrowTrendChartRef.value) return

  borrowTrendChart = echarts.init(borrowTrendChartRef.value)
  updateBorrowTrendChart()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    borrowTrendChart?.resize()
  })
}

const borrowTrendData = ref({
  categories: [],
  borrowData: [],
  returnData: []
})

const updateBorrowTrendChart = () => {
  if (!borrowTrendChart) return

  const currentData = borrowTrendData.value

  const option = {
    grid: {
      top: '12%',
      left: '3%',
      right: '4%',
      bottom: '5%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['借阅量', '归还量']
    },
    xAxis: {
      type: 'category',
      data: currentData.categories,
      boundaryGap: false,
      axisLine: {
        onZero: true
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: {
        show: true
      }
    },
    series: [
      {
        name: '借阅量',
        type: 'line',
        data: currentData.borrowData,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '归还量',
        type: 'line',
        data: currentData.returnData,
        smooth: true,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }

  borrowTrendChart.setOption(option)
}

const initCategoryChart = () => {
  if (!categoryChartRef.value) return

  categoryChart = echarts.init(categoryChartRef.value)
  updateCategoryChart()

  window.addEventListener('resize', () => {
    categoryChart?.resize()
  })
}

const categoryData = ref([])

const updateCategoryChart = () => {
  if (!categoryChart) return

  const data = categoryData.value

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      data: data.map(item => item.name)
    },
    series: [
      {
        name: '图书分类',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data
      }
    ]
  }

  categoryChart.setOption(option)
}

// API数据获取函数
const fetchDashboardData = async () => {
  try {
    loading.value = true

    // 获取统计数据
    const statsRes = await getDashboardStats()

    if (statsRes.code === 200 && statsRes.data?.stats && Array.isArray(statsRes.data.stats)) {
      // 映射API返回的数据到现有结构，保留icon属性
      statsData.value = statsRes.data.stats.map(item => ({
        ...item,
        icon: item.key === 'totalBooks' ? 'Reading' :
              item.key === 'activeUsers' ? 'User' :
              item.key === 'borrowings' ? 'DocumentCopy' : 'Money'
      }))
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    showError('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

const fetchBorrowTrendData = async () => {
  try {
    const res = await getBorrowTrend(currentTrendPeriod.value)

    if (res.code === 200 && res.data) {
      borrowTrendData.value = {
        categories: res.data.categories || [],
        borrowData: res.data.borrowData || [],
        returnData: res.data.returnData || []
      }
    }
  } catch (error) {
    console.error('获取借阅趋势失败:', error)
    showError('获取借阅趋势失败')
  }
}

const fetchCategoryData = async () => {
  try {
    const res = await getCategoryStats()

    if (res.code === 200) {
      categoryData.value = Array.isArray(res.data) ? res.data : []
    }
  } catch (error) {
    console.error('获取分类统计失败:', error)
    showError('获取分类统计失败')
  }
}


const fetchNotifications = async () => {
  try {
    const res = await getSystemNotifications(5)

    if (res.code === 200) {
      const notifications = Array.isArray(res.data) ? res.data : []

      systemNotifications.value = notifications.map(item => ({
        ...item,
        time: new Date(item.time)
      }))
    }
  } catch (error) {
    console.error('获取系统通知失败:', error)
    // 通知获取失败不显示错误消息，因为可能没有通知
  }
}

// 生命周期
onMounted(async () => {
  // 设置页面标题
  document.title = '仪表板 - 图书管理系统'

  // 并行获取所有数据
  await Promise.all([
    fetchDashboardData(),
    fetchBorrowTrendData(),
    fetchCategoryData(),
    fetchNotifications()
  ])

  // 等待DOM更新后初始化图表
  await nextTick()
  initBorrowTrendChart()
  initCategoryChart()
})

onBeforeUnmount(() => {
  borrowTrendChart?.dispose()
  categoryChart?.dispose()
  window.removeEventListener('resize', () => {})
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  background-color: var(--content-bg-color);
  min-height: calc(100vh - 140px);
}

.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 20px;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(50%, -50%);
  }
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.welcome-text {
  flex: 1;

  .welcome-title {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .welcome-subtitle {
    font-size: 16px;
    opacity: 0.9;
    margin: 0;
  }
}

.welcome-avatar {
  .el-avatar {
    border: 3px solid rgba(255, 255, 255, 0.3);
  }
}

.quick-actions {
  display: flex;
  gap: 12px;
  position: relative;
  z-index: 1;

  .el-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;

  .el-icon {
    font-size: 28px;
  }

  .stat-card--primary & {
    background: linear-gradient(135deg, #409eff, #5d73e7);

    .el-icon {
      color: white;
    }
  }

  .stat-card--success & {
    background: linear-gradient(135deg, #67c23a, #85ce61);

    .el-icon {
      color: white;
    }
  }

  .stat-card--warning & {
    background: linear-gradient(135deg, #e6a23c, #f0a020);

    .el-icon {
      color: white;
    }
  }

  .stat-card--danger & {
    background: linear-gradient(135deg, #f56c6c, #f78989);

    .el-icon {
      color: white;
    }
  }
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;

  &.positive {
    color: #67c23a;
  }

  &.negative {
    color: #f56c6c;
  }

  .change-period {
    color: var(--el-text-color-secondary);
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 20px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.chart-container {
  height: 300px;
  padding: 20px 20px 10px 20px;
}

.notification-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  border-radius: 8px;
}

.notification-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.notification-text {
  flex: 1;

  strong {
    display: block;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }
}

.notification-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  margin-left: 16px;
}

// 响应式设计
@include respond-to(tablet) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .quick-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@include respond-to(mobile) {
  .dashboard-container {
    padding: 16px;
  }

  .welcome-section {
    padding: 20px 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 20px;
  }

  .chart-container {
    height: 250px;
    padding: 16px;
  }

  .quick-actions {
    .el-button {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>
