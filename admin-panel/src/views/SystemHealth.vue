<template>
  <div class="system-health">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><Monitor /></el-icon>
          系统健康监控
        </h1>
        <p class="page-description">实时监控系统状态，管理告警和健康检查</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Refresh" @click="refreshAllData" :loading="refreshing">刷新数据</el-button>
      </div>
    </div>

    <!-- 系统概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-card class="overview-card status-card">
            <div class="card-content">
              <div class="card-icon" :class="getStatusClass(overview.systemStatus)">
                <el-icon size="24">
                  <component :is="getStatusIcon(overview.systemStatus)" />
                </el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ getStatusText(overview.systemStatus) }}</div>
                <div class="card-label">系统状态</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card score-card">
            <div class="card-content">
              <div class="card-icon">
                <el-icon size="24"><TrendCharts /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ overview.healthScore }}分</div>
                <div class="card-label">健康评分</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card alerts-card">
            <div class="card-content">
              <div class="card-icon">
                <el-icon size="24"><Warning /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ overview.activeAlertsCount }}</div>
                <div class="card-label">活跃告警</div>
                <div class="card-detail" v-if="overview.criticalAlertsCount > 0">
                  其中严重: {{ overview.criticalAlertsCount }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card uptime-card">
            <div class="card-content">
              <div class="card-icon">
                <el-icon size="24"><Timer /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ formatUptime(overview.uptime) }}</div>
                <div class="card-label">系统运行时间</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-row :gutter="16">
        <!-- 左侧：健康检查状态 -->
        <el-col :span="16">
          <el-card class="health-checks-card">
            <template #header>
              <div class="card-header">
                <span>健康检查状态</span>
                <el-tag :type="getHealthTagType(healthStatus.overall.overallStatus)">
                  {{ getStatusText(healthStatus.overall.overallStatus) }}
                </el-tag>
              </div>
            </template>

            <!-- 健康检查列表 -->
            <div class="health-checks-list" v-loading="loading.healthStatus">
              <div
                v-for="check in healthStatus.checks"
                :key="`${check.type}_${check.name}`"
                class="health-check-item"
                :class="{ 'check-failed': check.status === 'critical' }"
              >
                <div class="check-info">
                  <div class="check-name">
                    <el-icon :color="getStatusColor(check.status)">
                      <component :is="getCheckIcon(check.type)" />
                    </el-icon>
                    <span>{{ check.name }}</span>
                  </div>
                  <div class="check-details">
                    <el-tag :type="getHealthTagType(check.status)" size="small">
                      {{ getStatusText(check.status) }}
                    </el-tag>
                    <span v-if="check.responseTime" class="response-time">{{ check.responseTime }}ms</span>
                    <span class="last-check">
                      {{ formatTime(check.lastCheck) }}
                    </span>
                  </div>
                </div>
                <div v-if="check.error" class="check-error">
                  <el-icon><Warning /></el-icon>
                  {{ check.error }}
                </div>
              </div>
            </div>
          </el-card>

          <!-- 系统指标图表 -->
          <el-card class="metrics-chart-card">
            <template #header>
              <div class="card-header">
                <span>系统性能指标</span>
                <el-radio-group v-model="metricsTimePeriod" size="small" @change="loadSystemMetrics">
                  <el-radio-button label="1h">1小时</el-radio-button>
                  <el-radio-button label="6h">6小时</el-radio-button>
                  <el-radio-button label="24h">24小时</el-radio-button>
                </el-radio-group>
              </div>
            </template>

            <div class="metrics-charts" v-loading="loading.metrics">
              <div class="metric-chart">
                <h4>CPU 使用率</h4>
                <div class="chart-container" ref="cpuChart"></div>
              </div>
              <div class="metric-chart">
                <h4>内存 使用率</h4>
                <div class="chart-container" ref="memoryChart"></div>
              </div>
              <div class="metric-chart">
                <h4>磁盘 使用率</h4>
                <div class="chart-container" ref="diskChart"></div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：告警管理 -->
        <el-col :span="8">
          <el-card class="alerts-card">
            <template #header>
              <div class="card-header">
                <span>活跃告警</span>
                <el-badge :value="alerts.length" :max="99">
                  <el-button size="small" @click="viewAllAlerts">查看全部</el-button>
                </el-badge>
              </div>
            </template>

            <div class="alerts-list" v-loading="loading.alerts">
              <el-empty v-if="alerts.length === 0" description="暂无活跃告警" image-size="80" />

              <div
                v-else
                v-for="alert in alerts.slice(0, 5)"
                :key="alert.id"
                class="alert-item"
                :class="`alert-${alert.severity}`"
              >
                <div class="alert-header">
                  <div class="alert-title">{{ alert.title }}</div>
                  <el-tag :type="getSeverityTagType(alert.severity)" size="small">
                    {{ alert.severity }}
                  </el-tag>
                </div>
                <div class="alert-description">{{ alert.description }}</div>
                <div class="alert-footer">
                  <span class="alert-time">{{ formatTime(alert.createdAt) }}</span>
                  <div class="alert-actions">
                    <el-button
                      v-if="alert.status === 'active'"
                      size="small"
                      type="primary"
                      text
                      @click="acknowledgeAlert(alert)"
                    >
                      确认
                    </el-button>
                    <el-button size="small" type="success" text @click="resolveAlert(alert)">解决</el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 健康检查统计 -->
          <el-card class="health-stats-card">
            <template #header>
              <span>健康检查统计</span>
            </template>

            <div class="health-stats">
              <div class="stat-item">
                <div class="stat-label">总检查项</div>
                <div class="stat-value">{{ overview.checksStatus.total }}</div>
              </div>
              <div class="stat-item success">
                <div class="stat-label">正常</div>
                <div class="stat-value">{{ overview.checksStatus.healthy }}</div>
              </div>
              <div class="stat-item warning">
                <div class="stat-label">警告</div>
                <div class="stat-value">{{ overview.checksStatus.warning }}</div>
              </div>
              <div class="stat-item danger">
                <div class="stat-label">严重</div>
                <div class="stat-value">{{ overview.checksStatus.critical }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 告警操作对话框 -->
    <el-dialog v-model="alertDialog.visible" :title="alertDialog.title" width="500px">
      <el-form :model="alertDialog.form" label-width="80px">
        <el-form-item label="备注">
          <el-input v-model="alertDialog.form.note" type="textarea" :rows="3" placeholder="请输入处理备注（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="alertDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleAlertAction" :loading="alertDialog.loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor,
  Refresh,
  TrendCharts,
  Warning,
  Timer,
  CircleCheck,
  CircleClose,
  QuestionFilled,
  Database,
  Search,
  MemoryCard,
  Cpu,
  FolderOpened,
  Connection,
  ChatLineRound,
  Setting
} from '@element-plus/icons-vue'
import {
  getSystemHealth,
  getHealthOverview,
  getSystemMetrics,
  getActiveAlerts,
  acknowledgeAlert as apiAcknowledgeAlert,
  resolveAlert as apiResolveAlert
} from '@/api/health'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const router = useRouter()

// 响应式数据
const overview = ref({
  systemStatus: 'unknown',
  healthScore: 0,
  activeAlertsCount: 0,
  criticalAlertsCount: 0,
  uptime: 0,
  checksStatus: {
    total: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0
  }
})

const healthStatus = ref({
  overall: {
    overallStatus: 'unknown',
    statusCounts: {}
  },
  checks: []
})

const systemMetrics = ref({
  cpu: [],
  memory: [],
  disk: [],
  summary: {}
})

const alerts = ref([])

const loading = reactive({
  healthStatus: false,
  metrics: false,
  alerts: false
})

const refreshing = ref(false)
const metricsTimePeriod = ref('1h')

// 告警操作对话框
const alertDialog = reactive({
  visible: false,
  title: '',
  action: '',
  alertId: null,
  loading: false,
  form: {
    note: ''
  }
})

// 方法
const loadOverview = async () => {
  try {
    const response = await getHealthOverview()
    if (response.success) {
      overview.value = response.data
    }
  } catch (error) {
    console.error('获取系统概览失败:', error)
  }
}

const loadHealthStatus = async () => {
  try {
    loading.healthStatus = true
    const response = await getSystemHealth()
    if (response.success) {
      healthStatus.value = response.data
    }
  } catch (error) {
    console.error('获取健康状态失败:', error)
  } finally {
    loading.healthStatus = false
  }
}

const loadSystemMetrics = async () => {
  try {
    loading.metrics = true
    const response = await getSystemMetrics({ period: metricsTimePeriod.value })
    if (response.success) {
      systemMetrics.value = response.data
      await nextTick()
      renderMetricsCharts()
    }
  } catch (error) {
    console.error('获取系统指标失败:', error)
  } finally {
    loading.metrics = false
  }
}

const loadActiveAlerts = async () => {
  try {
    loading.alerts = true
    const response = await getActiveAlerts({ limit: 10 })
    if (response.success) {
      alerts.value = response.data.alerts
    }
  } catch (error) {
    console.error('获取活跃告警失败:', error)
  } finally {
    loading.alerts = false
  }
}

const refreshAllData = async () => {
  refreshing.value = true
  try {
    await Promise.all([loadOverview(), loadHealthStatus(), loadSystemMetrics(), loadActiveAlerts()])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    refreshing.value = false
  }
}

const acknowledgeAlert = alert => {
  alertDialog.visible = true
  alertDialog.title = '确认告警'
  alertDialog.action = 'acknowledge'
  alertDialog.alertId = alert.id
  alertDialog.form.note = ''
}

const resolveAlert = alert => {
  alertDialog.visible = true
  alertDialog.title = '解决告警'
  alertDialog.action = 'resolve'
  alertDialog.alertId = alert.id
  alertDialog.form.note = ''
}

const handleAlertAction = async () => {
  try {
    alertDialog.loading = true

    const { action, alertId, form } = alertDialog

    let response
    if (action === 'acknowledge') {
      response = await apiAcknowledgeAlert(alertId, { note: form.note })
    } else if (action === 'resolve') {
      response = await apiResolveAlert(alertId, { note: form.note })
    }

    if (response.success) {
      ElMessage.success(`告警${action === 'acknowledge' ? '确认' : '解决'}成功`)
      alertDialog.visible = false

      // 刷新告警列表
      await loadActiveAlerts()
      await loadOverview()
    }
  } catch (error) {
    console.error('告警操作失败:', error)
    ElMessage.error('操作失败')
  } finally {
    alertDialog.loading = false
  }
}

const viewAllAlerts = () => {
  router.push('/system/alerts')
}

// 渲染指标图表（简化版本，实际项目中应使用 ECharts 等图表库）
const renderMetricsCharts = () => {
  // 这里应该使用图表库如 ECharts 来渲染图表
  // 由于示例简化，这里只是占位方法
  console.log('渲染指标图表:', systemMetrics.value)
}

// 工具方法
const getStatusClass = status => {
  const classMap = {
    healthy: 'status-healthy',
    warning: 'status-warning',
    critical: 'status-critical',
    unknown: 'status-unknown'
  }
  return classMap[status] || 'status-unknown'
}

const getStatusIcon = status => {
  const iconMap = {
    healthy: CircleCheck,
    warning: Warning,
    critical: CircleClose,
    unknown: QuestionFilled
  }
  return iconMap[status] || QuestionFilled
}

const getStatusText = status => {
  const textMap = {
    healthy: '正常',
    warning: '警告',
    critical: '严重',
    unknown: '未知'
  }
  return textMap[status] || '未知'
}

const getStatusColor = status => {
  const colorMap = {
    healthy: '#67C23A',
    warning: '#E6A23C',
    critical: '#F56C6C',
    unknown: '#909399'
  }
  return colorMap[status] || '#909399'
}

const getHealthTagType = status => {
  const typeMap = {
    healthy: 'success',
    warning: 'warning',
    critical: 'danger',
    unknown: 'info'
  }
  return typeMap[status] || 'info'
}

const getSeverityTagType = severity => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  }
  return typeMap[severity] || 'info'
}

const getCheckIcon = type => {
  const iconMap = {
    database: Database,
    elasticsearch: Search,
    memory: MemoryCard,
    cpu: Cpu,
    disk: FolderOpened,
    api_response: Connection,
    websocket: ChatLineRound,
    custom: Setting
  }
  return iconMap[type] || Setting
}

const formatTime = timestamp => {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const formatUptime = seconds => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 生命周期
onMounted(async () => {
  await refreshAllData()

  // 设置自动刷新
  const autoRefreshInterval = setInterval(() => {
    loadOverview()
    loadActiveAlerts()
  }, 30000) // 每30秒刷新一次概览和告警

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(autoRefreshInterval)
  })
})
</script>

<style lang="scss" scoped>
.system-health {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;

    .header-left {
      .page-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .page-description {
        margin: 0;
        color: var(--el-text-color-regular);
      }
    }
  }

  .overview-cards {
    margin-bottom: 20px;

    .overview-card {
      .card-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;

          &.status-healthy {
            background: var(--el-color-success-light-9);
            color: var(--el-color-success);
          }

          &.status-warning {
            background: var(--el-color-warning-light-9);
            color: var(--el-color-warning);
          }

          &.status-critical {
            background: var(--el-color-danger-light-9);
            color: var(--el-color-danger);
          }

          &.status-unknown {
            background: var(--el-color-info-light-9);
            color: var(--el-color-info);
          }
        }

        .card-info {
          flex: 1;

          .card-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
          }

          .card-label {
            font-size: 14px;
            color: var(--el-text-color-regular);
          }

          .card-detail {
            font-size: 12px;
            color: var(--el-text-color-placeholder);
            margin-top: 2px;
          }
        }
      }
    }
  }

  .main-content {
    .health-checks-card,
    .metrics-chart-card,
    .alerts-card,
    .health-stats-card {
      margin-bottom: 16px;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .health-checks-list {
      .health-check-item {
        padding: 12px;
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        margin-bottom: 8px;
        transition: all 0.3s;

        &:hover {
          border-color: var(--el-border-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        &.check-failed {
          border-color: var(--el-color-danger-light-5);
          background: var(--el-color-danger-light-9);
        }

        .check-info {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .check-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
          }

          .check-details {
            display: flex;
            align-items: center;
            gap: 12px;

            .response-time,
            .last-check {
              font-size: 12px;
              color: var(--el-text-color-placeholder);
            }
          }
        }

        .check-error {
          margin-top: 8px;
          padding: 8px;
          background: var(--el-color-danger-light-9);
          border-radius: 4px;
          font-size: 12px;
          color: var(--el-color-danger);
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .metrics-charts {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;

      .metric-chart {
        h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--el-text-color-regular);
        }

        .chart-container {
          height: 120px;
          background: var(--el-fill-color-extra-light);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--el-text-color-placeholder);
          font-size: 12px;
        }
      }
    }

    .alerts-list {
      max-height: 400px;
      overflow-y: auto;

      .alert-item {
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 8px;
        border-left: 4px solid;

        &.alert-low {
          border-left-color: var(--el-color-info);
          background: var(--el-color-info-light-9);
        }

        &.alert-medium {
          border-left-color: var(--el-color-warning);
          background: var(--el-color-warning-light-9);
        }

        &.alert-high,
        &.alert-critical {
          border-left-color: var(--el-color-danger);
          background: var(--el-color-danger-light-9);
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .alert-title {
            font-weight: 500;
            color: var(--el-text-color-primary);
          }
        }

        .alert-description {
          font-size: 12px;
          color: var(--el-text-color-regular);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .alert-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .alert-time {
            font-size: 11px;
            color: var(--el-text-color-placeholder);
          }

          .alert-actions {
            display: flex;
            gap: 4px;
          }
        }
      }
    }

    .health-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .stat-item {
        text-align: center;
        padding: 16px;
        border-radius: 6px;
        background: var(--el-fill-color-extra-light);

        &.success {
          background: var(--el-color-success-light-9);
          color: var(--el-color-success);
        }

        &.warning {
          background: var(--el-color-warning-light-9);
          color: var(--el-color-warning);
        }

        &.danger {
          background: var(--el-color-danger-light-9);
          color: var(--el-color-danger);
        }

        .stat-label {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .system-health {
    .overview-cards .el-col {
      margin-bottom: 16px;
    }

    .main-content {
      .metrics-charts {
        grid-template-columns: 1fr;
      }
    }
  }
}

@media (max-width: 768px) {
  .system-health {
    padding: 16px;

    .page-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }

    .main-content .el-row {
      flex-direction: column;

      .el-col {
        margin-bottom: 16px;
      }
    }
  }
}
</style>
