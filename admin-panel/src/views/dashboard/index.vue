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
          <el-dropdown @command="handleCategoryAction">
            <el-button link>
              更多操作
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="export">导出数据</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新</el-dropdown-item>
                <el-dropdown-item command="detail">查看详情</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="chart-container" ref="categoryChartRef"></div>
      </div>
    </div>

    <!-- 最新动态和待办事项 -->
    <div class="activity-grid">
      <!-- 最新动态 -->
      <div class="activity-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><Bell /></el-icon>
            最新动态
          </h3>
          <el-button link @click="viewAllActivities">查看全部</el-button>
        </div>
        <div class="activity-list">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-avatar">
              <el-avatar :size="32" :src="activity.userAvatar">
                <el-icon><User /></el-icon>
              </el-avatar>
            </div>
            <div class="activity-content">
              <div class="activity-text">
                <span class="activity-user">{{ activity.userName }}</span>
                <span class="activity-action">{{ activity.action }}</span>
                <span class="activity-target">《{{ activity.target }}》</span>
              </div>
              <div class="activity-time">{{ formatTime(activity.time) }}</div>
            </div>
            <div class="activity-status" :class="`status--${activity.status}`">
              {{ getStatusText(activity.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 待办事项 -->
      <div class="todo-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><List /></el-icon>
            待办事项
          </h3>
          <el-button link @click="addTodo">添加</el-button>
        </div>
        <div class="todo-list">
          <div v-for="todo in todoList" :key="todo.id" class="todo-item" :class="{ completed: todo.completed }">
            <el-checkbox v-model="todo.completed" @change="toggleTodo(todo.id)" />
            <div class="todo-content">
              <div class="todo-text">{{ todo.text }}</div>
              <div class="todo-meta">
                <span class="todo-priority" :class="`priority--${todo.priority}`">
                  {{ getPriorityText(todo.priority) }}
                </span>
                <span class="todo-deadline">{{ formatDate(todo.deadline) }}</span>
              </div>
            </div>
            <el-button link size="small" @click="removeTodo(todo.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import * as echarts from 'echarts'

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
  const date = new Date()
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
  return date.toLocaleDateString('zh-CN', options)
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
    value: 15420,
    change: 8.2,
    period: '较上月',
    type: 'primary',
    icon: 'Reading'
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    value: 3248,
    change: 12.5,
    period: '较上月',
    type: 'success',
    icon: 'User'
  },
  {
    key: 'borrowings',
    label: '当月借阅',
    value: 892,
    change: -3.2,
    period: '较上月',
    type: 'warning',
    icon: 'DocumentCopy'
  },
  {
    key: 'revenue',
    label: '系统收入',
    value: 28450,
    change: 15.8,
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

// 最新动态数据
const recentActivities = ref([
  {
    id: 1,
    userName: '张三',
    userAvatar: '',
    action: '借阅了',
    target: '深入理解计算机系统',
    time: new Date(Date.now() - 5 * 60 * 1000),
    status: 'success'
  },
  {
    id: 2,
    userName: '李四',
    userAvatar: '',
    action: '归还了',
    target: 'JavaScript高级程序设计',
    time: new Date(Date.now() - 15 * 60 * 1000),
    status: 'success'
  },
  {
    id: 3,
    userName: '王五',
    userAvatar: '',
    action: '预约了',
    target: 'Vue.js设计与实现',
    time: new Date(Date.now() - 30 * 60 * 1000),
    status: 'pending'
  },
  {
    id: 4,
    userName: '赵六',
    userAvatar: '',
    action: '超期未还',
    target: 'Python编程：从入门到实践',
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'warning'
  }
])

// 待办事项
const todoList = ref([
  {
    id: 1,
    text: '处理超期图书归还',
    completed: false,
    priority: 'high',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  {
    id: 2,
    text: '更新图书分类信息',
    completed: false,
    priority: 'medium',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  }
])

// 系统通知
const systemNotifications = ref([
  {
    id: 1,
    title: '系统维护通知',
    description: '系统将于今晚22:00-次日2:00进行维护升级，请提前做好相关准备。',
    type: 'warning',
    time: new Date()
  },
  {
    id: 2,
    title: '新功能上线',
    description: '图书推荐系统已上线，现在可以为用户提供个性化图书推荐服务。',
    type: 'success',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
])

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
  return time.toLocaleDateString('zh-CN')
}

const formatDate = date => {
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
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

const getPriorityText = priority => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || priority
}

const handleQuickAction = actionKey => {
  const actionMap = {
    addBook: () => router.push('/books/add'),
    borrowBook: () => router.push('/borrows'),
    userManage: () => router.push('/users'),
    systemSettings: () => router.push('/settings')
  }

  const action = actionMap[actionKey]
  if (action) {
    action()
  } else {
    ElMessage.info(`${actionKey} 功能开发中`)
  }
}

const changeTrendPeriod = period => {
  currentTrendPeriod.value = period
  updateBorrowTrendChart()
}

const handleCategoryAction = command => {
  switch (command) {
    case 'export':
      ElMessage.success('数据导出中...')
      break
    case 'refresh':
      updateCategoryChart()
      ElMessage.success('数据已刷新')
      break
    case 'detail':
      router.push('/statistics/category')
      break
  }
}

const viewAllActivities = () => {
  router.push('/activities')
}

const addTodo = async () => {
  try {
    const { value: text } = await ElMessageBox.prompt('请输入待办事项', '添加待办', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入待办事项内容'
    })

    if (text?.trim()) {
      const newTodo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        priority: 'medium',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
      todoList.value.unshift(newTodo)
      ElMessage.success('待办事项已添加')
    }
  } catch (error) {
    // 用户取消
  }
}

const toggleTodo = id => {
  const todo = todoList.value.find(t => t.id === id)
  if (todo) {
    ElMessage.success(todo.completed ? '任务已完成' : '任务已重新打开')
  }
}

const removeTodo = async id => {
  try {
    await ElMessageBox.confirm('确定要删除这个待办事项吗？', '确认删除', {
      type: 'warning'
    })

    const index = todoList.value.findIndex(t => t.id === id)
    if (index > -1) {
      todoList.value.splice(index, 1)
      ElMessage.success('待办事项已删除')
    }
  } catch (error) {
    // 用户取消
  }
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

const updateBorrowTrendChart = () => {
  if (!borrowTrendChart) return

  // 模拟数据
  const data = {
    week: {
      categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      borrowData: [23, 45, 32, 54, 41, 67, 38],
      returnData: [18, 42, 28, 48, 35, 59, 32]
    },
    month: {
      categories: ['第1周', '第2周', '第3周', '第4周'],
      borrowData: [203, 245, 232, 254],
      returnData: [180, 220, 208, 235]
    }
  }

  const currentData = data[currentTrendPeriod.value] || data.week

  const option = {
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
      data: currentData.categories
    },
    yAxis: {
      type: 'value'
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

const updateCategoryChart = () => {
  if (!categoryChart) return

  const data = [
    { value: 1048, name: '计算机' },
    { value: 735, name: '文学' },
    { value: 580, name: '历史' },
    { value: 484, name: '科学' },
    { value: 300, name: '艺术' },
    { value: 235, name: '其他' }
  ]

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

// 生命周期
onMounted(async () => {
  // 设置页面标题
  document.title = '仪表板 - 图书管理系统'

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
  padding: 20px;
  background-color: var(--content-bg-color);
  min-height: calc(100vh - 120px);
}

.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
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
  margin-bottom: 24px;
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
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
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
  border-radius: 12px;
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
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
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
  padding: 20px;
}

.activity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.activity-card,
.todo-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.activity-list,
.todo-list {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--el-fill-color-lighter);
  }

  &:last-child {
    border-bottom: none;
  }
}

.activity-avatar {
  margin-right: 12px;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;

  .activity-user {
    font-weight: 600;
    color: var(--el-color-primary);
  }

  .activity-target {
    font-weight: 500;
  }
}

.activity-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.activity-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.status--success {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }

  &.status--warning {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }

  &.status--pending {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
  }
}

.todo-item {
  display: flex;
  align-items: flex-start;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--el-fill-color-lighter);
  }

  &:last-child {
    border-bottom: none;
  }

  &.completed {
    opacity: 0.6;

    .todo-text {
      text-decoration: line-through;
    }
  }
}

.todo-content {
  flex: 1;
  margin: 0 12px;
}

.todo-text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.todo-priority {
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;

  &.priority--high {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }

  &.priority--medium {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }

  &.priority--low {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
  }
}

.todo-deadline {
  color: var(--el-text-color-secondary);
}

.notification-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
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
  .charts-grid,
  .activity-grid {
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
    padding: 24px 20px;
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
