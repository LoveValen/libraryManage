<template>
  <div class="analytics-dashboard">
    <!-- 页面头部 -->
    <PageHeader
      title="高级分析仪表板"
      description="全面的图书馆运营数据分析和洞察"
      icon="TrendCharts"
      :actions="headerActions"
      @action="handleHeaderAction"
    />

    <!-- 时间范围选择器 -->
    <el-card shadow="never" class="time-selector-card">
      <div class="time-controls">
        <div class="quick-filters">
          <el-button-group>
            <el-button
              v-for="filter in quickFilters"
              :key="filter.key"
              :type="selectedQuickFilter === filter.key ? 'primary' : 'default'"
              @click="selectQuickFilter(filter.key)"
              size="small"
            >
              {{ filter.label }}
            </el-button>
          </el-button-group>
        </div>

        <div class="custom-range">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
            size="small"
          />

          <el-select
            v-model="granularity"
            @change="loadDashboardData"
            size="small"
            style="width: 100px; margin-left: 12px"
          >
            <el-option label="按天" value="day" />
            <el-option label="按周" value="week" />
            <el-option label="按月" value="month" />
          </el-select>
        </div>

        <div class="refresh-controls">
          <el-button :icon="Refresh" @click="loadDashboardData" :loading="loading" size="small">刷新</el-button>

          <el-switch v-model="autoRefresh" active-text="自动刷新" @change="toggleAutoRefresh" size="small" />
        </div>
      </div>
    </el-card>

    <!-- 关键指标概览 -->
    <div class="overview-section">
      <div class="metrics-grid">
        <StatCard
          v-for="metric in overviewMetrics"
          :key="metric.key"
          :title="metric.label"
          :value="metric.value"
          :icon="metric.icon"
          :type="metric.type"
          :trend="metric.trend"
          :show-trend="true"
          :count-up="true"
          :loading="loading"
          @click="handleMetricClick(metric.key)"
          class="cursor-pointer"
        />
      </div>
    </div>

    <!-- 趋势图表 -->
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card shadow="never" class="trends-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><TrendCharts /></el-icon>
                趋势分析
              </div>
              <div class="header-actions">
                <el-checkbox-group v-model="selectedTrendMetrics" @change="updateTrendChart">
                  <el-checkbox label="borrows">借阅量</el-checkbox>
                  <el-checkbox label="returns">归还量</el-checkbox>
                  <el-checkbox label="registrations">新用户</el-checkbox>
                  <el-checkbox label="reviews">评价数</el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </template>

          <div v-loading="loading" class="chart-container">
            <div ref="trendsChart" class="chart" style="height: 400px"></div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" class="category-chart-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><PieChart /></el-icon>
                分类分布
              </div>
            </div>
          </template>

          <div v-loading="loading" class="chart-container">
            <div ref="categoryChart" class="chart" style="height: 400px"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 热门图书和活跃用户 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="never" class="top-books-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Trophy /></el-icon>
                热门图书
              </div>
              <div class="header-actions">
                <el-select v-model="selectedBookMetric" @change="loadTopBooks" size="small">
                  <el-option label="借阅量" value="mostBorrowed" />
                  <el-option label="评价数" value="mostReviewed" />
                  <el-option label="评分" value="highestRated" />
                  <el-option label="趋势" value="trending" />
                </el-select>
              </div>
            </div>
          </template>

          <div v-loading="loading" class="books-list">
            <div v-for="(book, index) in topBooks" :key="book.id" class="book-item" @click="viewBookDetail(book.id)">
              <div class="book-rank">{{ index + 1 }}</div>
              <div class="book-cover">
                <img :src="book.coverUrl || '/images/default-book.jpg'" :alt="book.title" />
              </div>
              <div class="book-info">
                <div class="book-title">{{ book.title }}</div>
                <div class="book-author">{{ book.author }}</div>
                <div class="book-category">{{ book.category }}</div>
              </div>
              <div class="book-metrics">
                <div class="metric-value">{{ getBookMetricValue(book) }}</div>
                <div class="metric-label">{{ getBookMetricLabel() }}</div>
              </div>
            </div>

            <el-empty v-if="!loading && topBooks.length === 0" description="暂无数据" image-size="120" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never" class="active-users-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><User /></el-icon>
                活跃用户
              </div>
              <div class="header-actions">
                <el-select v-model="selectedUserMetric" @change="loadActiveUsers" size="small">
                  <el-option label="借阅量" value="topBorrowers" />
                  <el-option label="评价数" value="activeReviewers" />
                  <el-option label="积分" value="pointsLeaders" />
                </el-select>
              </div>
            </div>
          </template>

          <div v-loading="loading" class="users-list">
            <div
              v-for="(user, index) in activeUsers"
              :key="user.id || user.user?.id"
              class="user-item"
              @click="viewUserDetail(user.id || user.user?.id)"
            >
              <div class="user-rank">{{ index + 1 }}</div>
              <el-avatar :src="user.avatar || user.user?.avatar" :size="40" class="user-avatar">
                {{ (user.realName || user.username || user.user?.realName || user.user?.username)?.charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <div class="user-name">
                  {{ user.realName || user.username || user.user?.realName || user.user?.username }}
                </div>
                <div class="user-level">{{ getUserLevel(user) }}</div>
              </div>
              <div class="user-metrics">
                <div class="metric-value">{{ getUserMetricValue(user) }}</div>
                <div class="metric-label">{{ getUserMetricLabel() }}</div>
              </div>
            </div>

            <el-empty v-if="!loading && activeUsers.length === 0" description="暂无数据" image-size="120" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 性能指标和预测洞察 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="never" class="performance-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Speedometer /></el-icon>
                性能指标
              </div>
            </div>
          </template>

          <div v-loading="loading" class="performance-metrics">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="藏书利用率">
                <el-progress
                  :percentage="performanceMetrics.utilizationRate"
                  :color="getUtilizationColor(performanceMetrics.utilizationRate)"
                />
                {{ performanceMetrics.utilizationRate }}%
              </el-descriptions-item>

              <el-descriptions-item label="用户留存率">
                <el-progress
                  :percentage="performanceMetrics.retentionRate"
                  :color="getRetentionColor(performanceMetrics.retentionRate)"
                />
                {{ performanceMetrics.retentionRate }}%
              </el-descriptions-item>

              <el-descriptions-item label="图书周转率">
                <el-tag :type="getTurnoverType(performanceMetrics.turnoverRate)">
                  {{ performanceMetrics.turnoverRate }}
                </el-tag>
              </el-descriptions-item>

              <el-descriptions-item label="系统健康度">
                <el-tag :type="getHealthType(performanceMetrics.systemHealth)">
                  {{ performanceMetrics.systemHealth }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never" class="insights-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><DataAnalysis /></el-icon>
                智能洞察
              </div>
            </div>
          </template>

          <div v-loading="loading" class="insights-content">
            <div
              v-for="insight in insights"
              :key="insight.type"
              class="insight-item"
              :class="`insight-${insight.priority}`"
            >
              <div class="insight-header">
                <el-icon class="insight-icon">
                  <component :is="getInsightIcon(insight.type)" />
                </el-icon>
                <div class="insight-title">{{ insight.title }}</div>
                <el-tag :type="getInsightTagType(insight.priority)" size="small">
                  {{ insight.priority }}
                </el-tag>
              </div>
              <div class="insight-description">{{ insight.description }}</div>
            </div>

            <el-empty v-if="!loading && insights.length === 0" description="暂无洞察数据" image-size="120" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时活动流 -->
    <el-card shadow="never" class="activity-stream-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Monitor /></el-icon>
            实时活动
          </div>
          <div class="header-actions">
            <el-tag type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              实时更新
            </el-tag>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="activity-stream">
        <el-timeline>
          <el-timeline-item
            v-for="activity in realtimeActivities"
            :key="activity.id"
            :timestamp="formatTime(activity.timestamp)"
            :type="getActivityType(activity.type)"
          >
            <div class="activity-content">
              <el-icon class="activity-icon">
                <component :is="getActivityIcon(activity.type)" />
              </el-icon>
              <span class="activity-text">{{ activity.description }}</span>
            </div>
          </el-timeline-item>
        </el-timeline>

        <div v-if="realtimeActivities.length === 0" class="no-activities">
          <el-text type="info">暂无实时活动</el-text>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import {
  TrendCharts,
  PieChart,
  Trophy,
  User,
  Speedometer,
  DataAnalysis,
  Monitor,
  Refresh,
  CircleCheck,
  Warning,
  InfoFilled,
  DocumentCopy,
  Reading,
  Star
} from '@element-plus/icons-vue'
import { PageHeader, StatCard } from '@/components/common'
import {
  getDashboardAnalytics,
  getOverviewStats,
  getTrendsData,
  getBooksAnalytics,
  getUsersAnalytics,
  getPerformanceMetrics,
  getPredictiveInsights,
  getRealTimeStats
} from '@/api/analytics'
import * as echarts from 'echarts'

// 响应式数据
const loading = ref(false)
const autoRefresh = ref(false)
const refreshInterval = ref(null)

// 时间控制
const selectedQuickFilter = ref('30d')
const dateRange = ref([])
const granularity = ref('day')

// 图表实例
const trendsChart = ref(null)
const categoryChart = ref(null)

// 图表选项
const selectedTrendMetrics = ref(['borrows', 'returns'])
const selectedBookMetric = ref('mostBorrowed')
const selectedUserMetric = ref('topBorrowers')

// 数据状态
const dashboardData = ref({})
const overviewMetrics = ref([])
const trendsData = ref([])
const topBooks = ref([])
const activeUsers = ref([])
const performanceMetrics = ref({})
const insights = ref([])
const realtimeActivities = ref([])

// 快速筛选器
const quickFilters = [
  { key: '7d', label: '最近7天', days: 7 },
  { key: '30d', label: '最近30天', days: 30 },
  { key: '90d', label: '最近90天', days: 90 },
  { key: '1y', label: '最近1年', days: 365 }
]

// 头部操作按钮
const headerActions = [
  {
    key: 'export',
    label: '导出报告',
    type: 'primary',
    icon: 'Download'
  },
  {
    key: 'settings',
    label: '设置',
    type: 'default',
    icon: 'Setting'
  }
]

// 计算属性
const currentDateRange = computed(() => {
  if (dateRange.value && dateRange.value.length === 2) {
    return dateRange.value
  }

  const filter = quickFilters.find(f => f.key === selectedQuickFilter.value)
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - filter.days * 24 * 60 * 60 * 1000)

  return [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
})

// 方法
const selectQuickFilter = filterKey => {
  selectedQuickFilter.value = filterKey
  dateRange.value = []
  loadDashboardData()
}

const handleDateRangeChange = () => {
  selectedQuickFilter.value = ''
  loadDashboardData()
}

const handleHeaderAction = action => {
  switch (action.key) {
    case 'export':
      exportReport()
      break
    case 'settings':
      showSettings()
      break
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    const [startDate, endDate] = currentDateRange.value

    const [dashboard, performance, insightsData, realtime] = await Promise.all([
      getDashboardAnalytics({ startDate, endDate, granularity: granularity.value }),
      getPerformanceMetrics({ startDate, endDate }),
      getPredictiveInsights({ startDate, endDate }),
      getRealTimeStats()
    ])

    dashboardData.value = dashboard.data
    updateOverviewMetrics(dashboard.data.overview)
    updateTrendsData(dashboard.data.trends)
    updateTopBooks(dashboard.data.topBooks)
    updateActiveUsers(dashboard.data.activeUsers)
    performanceMetrics.value = performance.data
    insights.value = insightsData.data.recommendations || []
    realtimeActivities.value = generateRealtimeActivities(realtime.data)

    await nextTick()
    renderCharts()
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    ElMessage.error('加载仪表板数据失败')
  } finally {
    loading.value = false
  }
}

const updateOverviewMetrics = overview => {
  overviewMetrics.value = [
    {
      key: 'totalBooks',
      label: '总图书数',
      value: overview.totals.books,
      icon: 'Reading',
      type: 'primary',
      trend: { value: 0, isUp: true }
    },
    {
      key: 'totalUsers',
      label: '总用户数',
      value: overview.totals.users,
      icon: 'User',
      type: 'success',
      trend: { value: overview.period.userGrowth, isUp: overview.period.userGrowth >= 0 }
    },
    {
      key: 'activeBorrows',
      label: '活跃借阅',
      value: overview.current.activeBorrows,
      icon: 'DocumentCopy',
      type: 'warning',
      trend: { value: overview.period.borrowGrowth, isUp: overview.period.borrowGrowth >= 0 }
    },
    {
      key: 'returnRate',
      label: '归还率',
      value: `${overview.current.returnRate}%`,
      icon: 'CircleCheck',
      type: 'info',
      trend: { value: 0, isUp: true }
    }
  ]
}

const updateTrendsData = trends => {
  trendsData.value = trends
}

const updateTopBooks = topBooksData => {
  topBooks.value = topBooksData[selectedBookMetric.value] || []
}

const updateActiveUsers = activeUsersData => {
  activeUsers.value = activeUsersData[selectedUserMetric.value] || []
}

const renderCharts = () => {
  renderTrendsChart()
  renderCategoryChart()
}

const renderTrendsChart = () => {
  if (!trendsChart.value) return

  const chart = echarts.init(trendsChart.value)

  const dates = trendsData.value.map(item => item.date)
  const series = []

  if (selectedTrendMetrics.value.includes('borrows')) {
    series.push({
      name: '借阅量',
      type: 'line',
      data: trendsData.value.map(item => item.borrows),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 3 },
      areaStyle: { opacity: 0.3 }
    })
  }

  if (selectedTrendMetrics.value.includes('returns')) {
    series.push({
      name: '归还量',
      type: 'line',
      data: trendsData.value.map(item => item.returns),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 3 }
    })
  }

  if (selectedTrendMetrics.value.includes('registrations')) {
    series.push({
      name: '新用户',
      type: 'bar',
      data: trendsData.value.map(item => item.registrations),
      yAxisIndex: 1
    })
  }

  if (selectedTrendMetrics.value.includes('reviews')) {
    series.push({
      name: '评价数',
      type: 'line',
      data: trendsData.value.map(item => item.reviews),
      smooth: true,
      symbol: 'diamond',
      symbolSize: 8
    })
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: series.map(s => s.name),
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        position: 'left'
      },
      {
        type: 'value',
        name: '新用户',
        position: 'right'
      }
    ],
    series
  }

  chart.setOption(option)
}

const renderCategoryChart = () => {
  if (!categoryChart.value || !dashboardData.value.categories) return

  const chart = echarts.init(categoryChart.value)

  const data = dashboardData.value.categories.summary.map(item => ({
    name: item.category,
    value: item.borrowCount
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '借阅分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
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

  chart.setOption(option)
}

const updateTrendChart = () => {
  renderTrendsChart()
}

const loadTopBooks = async () => {
  // 这里可以单独加载图书数据
  updateTopBooks(dashboardData.value.topBooks)
}

const loadActiveUsers = async () => {
  // 这里可以单独加载用户数据
  updateActiveUsers(dashboardData.value.activeUsers)
}

const handleMetricClick = metricKey => {
  // 根据指标类型跳转到相应的详细页面
  console.log('Metric clicked:', metricKey)
}

const viewBookDetail = bookId => {
  window.open(`/books/detail/${bookId}`, '_blank')
}

const viewUserDetail = userId => {
  window.open(`/users/detail/${userId}`, '_blank')
}

const getBookMetricValue = book => {
  switch (selectedBookMetric.value) {
    case 'mostBorrowed':
      return book.borrowCount
    case 'mostReviewed':
      return book.reviewCount
    case 'highestRated':
      return book.avgRating
    case 'trending':
      return `${book.growthRate}%`
    default:
      return book.borrowCount
  }
}

const getBookMetricLabel = () => {
  switch (selectedBookMetric.value) {
    case 'mostBorrowed':
      return '借阅次数'
    case 'mostReviewed':
      return '评价数'
    case 'highestRated':
      return '平均评分'
    case 'trending':
      return '增长率'
    default:
      return '借阅次数'
  }
}

const getUserMetricValue = user => {
  switch (selectedUserMetric.value) {
    case 'topBorrowers':
      return user.borrowCount
    case 'activeReviewers':
      return user.reviewCount
    case 'pointsLeaders':
      return user.totalPoints || user.user?.totalPoints
    default:
      return user.borrowCount
  }
}

const getUserMetricLabel = () => {
  switch (selectedUserMetric.value) {
    case 'topBorrowers':
      return '借阅次数'
    case 'activeReviewers':
      return '评价数'
    case 'pointsLeaders':
      return '总积分'
    default:
      return '借阅次数'
  }
}

const getUserLevel = user => {
  // 简化的用户等级显示
  return '活跃用户'
}

const getUtilizationColor = rate => {
  if (rate >= 80) return '#67c23a'
  if (rate >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getRetentionColor = rate => {
  if (rate >= 70) return '#67c23a'
  if (rate >= 50) return '#e6a23c'
  return '#f56c6c'
}

const getTurnoverType = rate => {
  if (rate >= 3) return 'success'
  if (rate >= 2) return 'warning'
  return 'danger'
}

const getHealthType = health => {
  if (health === 'healthy') return 'success'
  if (health === 'warning') return 'warning'
  return 'danger'
}

const getInsightIcon = type => {
  switch (type) {
    case 'policy':
      return Warning
    case 'collection':
      return Reading
    case 'user':
      return User
    default:
      return InfoFilled
  }
}

const getInsightTagType = priority => {
  switch (priority) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'info'
  }
}

const getActivityType = type => {
  switch (type) {
    case 'borrow':
      return 'primary'
    case 'return':
      return 'success'
    case 'review':
      return 'warning'
    case 'user':
      return 'info'
    default:
      return 'info'
  }
}

const getActivityIcon = type => {
  switch (type) {
    case 'borrow':
      return DocumentCopy
    case 'return':
      return CircleCheck
    case 'review':
      return Star
    case 'user':
      return User
    default:
      return InfoFilled
  }
}

const generateRealtimeActivities = realtimeData => {
  // 基于实时数据生成活动流
  const activities = []

  if (realtimeData.current?.activeBorrows > 0) {
    activities.push({
      id: 1,
      type: 'borrow',
      description: `当前有 ${realtimeData.current.activeBorrows} 本书籍正在借阅中`,
      timestamp: new Date()
    })
  }

  return activities
}

const formatTime = timestamp => {
  return new Date(timestamp).toLocaleString()
}

const toggleAutoRefresh = enabled => {
  if (enabled) {
    refreshInterval.value = setInterval(() => {
      loadDashboardData()
    }, 30000) // 30秒刷新一次
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}

const exportReport = () => {
  ElMessage.info('导出功能开发中...')
}

const showSettings = () => {
  ElMessage.info('设置功能开发中...')
}

// 生命周期
onMounted(() => {
  loadDashboardData()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style lang="scss" scoped>
.analytics-dashboard {
  padding: 20px;
}

.time-selector-card {
  margin-bottom: 20px;

  .time-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;

    .quick-filters {
      flex: 1;
    }

    .custom-range {
      display: flex;
      align-items: center;
    }

    .refresh-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
}

.overview-section {
  margin-bottom: 20px;

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
}

.trends-card,
.category-chart-card {
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

  .chart-container {
    .chart {
      width: 100%;
    }
  }
}

.top-books-card,
.active-users-card {
  margin-bottom: 20px;

  .books-list,
  .users-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .book-item,
  .user-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-extra-light);
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background-color: var(--el-fill-color-extra-light);
    }

    &:last-child {
      border-bottom: none;
    }

    .book-rank,
    .user-rank {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      border-radius: 50%;
      font-weight: 600;
      margin-right: 12px;
    }

    .book-cover {
      width: 40px;
      height: 50px;
      margin-right: 12px;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
      }
    }

    .user-avatar {
      margin-right: 12px;
    }

    .book-info,
    .user-info {
      flex: 1;

      .book-title,
      .user-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .book-author,
      .book-category,
      .user-level {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }

    .book-metrics,
    .user-metrics {
      text-align: right;

      .metric-value {
        font-weight: 600;
        font-size: 16px;
        color: var(--el-color-primary);
      }

      .metric-label {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

.performance-card,
.insights-card {
  margin-bottom: 20px;

  .performance-metrics {
    .el-descriptions {
      :deep(.el-descriptions__label) {
        width: 120px;
      }
    }
  }

  .insights-content {
    max-height: 400px;
    overflow-y: auto;

    .insight-item {
      padding: 16px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 8px;
      margin-bottom: 12px;

      &.insight-high {
        border-color: var(--el-color-danger);
        background-color: var(--el-color-danger-light-9);
      }

      &.insight-medium {
        border-color: var(--el-color-warning);
        background-color: var(--el-color-warning-light-9);
      }

      &.insight-low {
        border-color: var(--el-color-info);
        background-color: var(--el-color-info-light-9);
      }

      .insight-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .insight-icon {
          font-size: 18px;
        }

        .insight-title {
          flex: 1;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }
      }

      .insight-description {
        font-size: 14px;
        color: var(--el-text-color-regular);
        line-height: 1.5;
      }
    }
  }
}

.activity-stream-card {
  .activity-stream {
    max-height: 300px;
    overflow-y: auto;

    .activity-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .activity-icon {
        color: var(--el-color-primary);
      }

      .activity-text {
        color: var(--el-text-color-primary);
      }
    }

    .no-activities {
      text-align: center;
      padding: 40px;
    }
  }
}

.cursor-pointer {
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.3s ease;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .analytics-dashboard {
    padding: 10px;
  }

  .time-controls {
    flex-direction: column;
    align-items: stretch !important;

    .quick-filters,
    .custom-range,
    .refresh-controls {
      justify-content: center;
    }
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .book-item,
  .user-item {
    padding: 8px !important;

    .book-cover {
      width: 32px !important;
      height: 40px !important;
    }
  }
}
</style>
