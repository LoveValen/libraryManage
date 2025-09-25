<template>
  <el-dialog v-model="visible" title="借阅趋势分析" width="900px" :close-on-click-modal="false" @close="handleClose">
    <div class="trends-container">
      <!-- 时间范围选择 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline size="default">
          <el-form-item label="时间范围">
            <el-select v-model="filterForm.timeRange" placeholder="选择时间范围" @change="loadTrendsData">
              <el-option label="最近7天" value="7d" />
              <el-option label="最近30天" value="30d" />
              <el-option label="最近90天" value="90d" />
              <el-option label="最近一年" value="1y" />
            </el-select>
          </el-form-item>
          <el-form-item label="图表类型">
            <el-select v-model="filterForm.chartType" placeholder="选择图表类型" @change="updateChartType">
              <el-option label="折线图" value="line" />
              <el-option label="柱状图" value="bar" />
              <el-option label="面积图" value="area" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="loadTrendsData" :loading="loading">刷新数据</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 统计概览 -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ trendsData.totalBorrows }}</div>
            <div class="stat-label">总借阅量</div>
            <div class="stat-trend" :class="trendsData.borrowTrend > 0 ? 'up' : 'down'">
              {{ trendsData.borrowTrend > 0 ? '+' : '' }}{{ trendsData.borrowTrend }}%
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ trendsData.activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
            <div class="stat-trend" :class="trendsData.userTrend > 0 ? 'up' : 'down'">
              {{ trendsData.userTrend > 0 ? '+' : '' }}{{ trendsData.userTrend }}%
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ trendsData.avgBorrowDays }}</div>
            <div class="stat-label">平均借阅天数</div>
            <div class="stat-trend" :class="trendsData.daysTrend > 0 ? 'up' : 'down'">
              {{ trendsData.daysTrend > 0 ? '+' : '' }}{{ trendsData.daysTrend }}%
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ trendsData.overdueRate }}%</div>
            <div class="stat-label">逾期率</div>
            <div class="stat-trend" :class="trendsData.overdueTrend > 0 ? 'down' : 'up'">
              {{ trendsData.overdueTrend > 0 ? '+' : '' }}{{ trendsData.overdueTrend }}%
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section" v-loading="loading">
        <el-row :gutter="20">
          <!-- 借阅趋势图 -->
          <el-col :span="12">
            <el-card shadow="never" class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>借阅趋势</span>
                  <el-tag size="small" type="info">{{ getTimeRangeText() }}</el-tag>
                </div>
              </template>
              <div class="chart-container">
                <div class="chart-placeholder" v-if="!chartData.borrowTrend.length">
                  <el-icon size="48"><TrendCharts /></el-icon>
                  <p>暂无数据</p>
                </div>
                <div v-else class="chart-mock">
                  <div class="chart-title">借阅量变化</div>
                  <div class="chart-data">
                    <div v-for="(item, index) in chartData.borrowTrend" :key="index" class="data-point">
                      <span class="date">{{ item.date }}</span>
                      <span class="value">{{ item.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 热门图书排行 -->
          <el-col :span="12">
            <el-card shadow="never" class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>热门图书排行</span>
                  <el-tag size="small" type="success">TOP 10</el-tag>
                </div>
              </template>
              <div class="chart-container">
                <div class="ranking-list">
                  <div v-for="(book, index) in chartData.popularBooks" :key="index" class="ranking-item">
                    <div class="rank-number" :class="getRankClass(index)">{{ index + 1 }}</div>
                    <div class="book-info">
                      <div class="book-title">{{ book.title }}</div>
                      <div class="book-meta">{{ book.author }}</div>
                    </div>
                    <div class="borrow-count">
                      <span class="count">{{ book.borrowCount }}</span>
                      <span class="label">次借阅</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="mt-4">
          <!-- 用户活跃度 -->
          <el-col :span="12">
            <el-card shadow="never" class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>用户活跃度</span>
                  <el-tag size="small" type="warning">按借阅次数</el-tag>
                </div>
              </template>
              <div class="chart-container">
                <div class="user-activity">
                  <div v-for="segment in chartData.userActivity" :key="segment.label" class="activity-segment">
                    <div class="segment-info">
                      <span class="segment-label">{{ segment.label }}</span>
                      <span class="segment-count">{{ segment.count }}人</span>
                    </div>
                    <div class="segment-bar">
                      <div class="bar-fill" :style="{ width: segment.percentage + '%' }" :class="segment.type"></div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 借阅时长分布 -->
          <el-col :span="12">
            <el-card shadow="never" class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>借阅时长分布</span>
                  <el-tag size="small" type="info">平均天数</el-tag>
                </div>
              </template>
              <div class="chart-container">
                <div class="duration-distribution">
                  <div v-for="duration in chartData.durationDistribution" :key="duration.range" class="duration-item">
                    <div class="duration-range">{{ duration.range }}</div>
                    <div class="duration-bar">
                      <div class="bar-fill" :style="{ width: duration.percentage + '%' }"></div>
                    </div>
                    <div class="duration-count">{{ duration.count }}</div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="exportTrendsReport">导出报告</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, TrendCharts, User, Clock, Warning } from '@element-plus/icons-vue'
import { getBorrowStatistics } from '@/api/borrows'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  timeRange: '30d',
  chartType: 'line'
})

// 趋势数据
const trendsData = ref({
  totalBorrows: 0,
  activeUsers: 0,
  avgBorrowDays: 0,
  overdueRate: 0,
  borrowTrend: 0,
  userTrend: 0,
  daysTrend: 0,
  overdueTrend: 0
})

// 图表数据
const chartData = ref({
  borrowTrend: [],
  popularBooks: [],
  userActivity: [],
  durationDistribution: []
})

// 加载趋势数据
const loadTrendsData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    trendsData.value = {
      totalBorrows: 1248,
      activeUsers: 156,
      avgBorrowDays: 18,
      overdueRate: 12.5,
      borrowTrend: 8.2,
      userTrend: 15.3,
      daysTrend: -2.1,
      overdueTrend: -3.4
    }

    chartData.value = {
      borrowTrend: generateMockTrendData(),
      popularBooks: generateMockPopularBooks(),
      userActivity: generateMockUserActivity(),
      durationDistribution: generateMockDurationDistribution()
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
    ElMessage.error('加载趋势数据失败')
  } finally {
    loading.value = false
  }
}

// 生成模拟趋势数据
const generateMockTrendData = () => {
  const data = []
  const now = new Date()
  const days =
    filterForm.timeRange === '7d' ? 7 : filterForm.timeRange === '30d' ? 30 : filterForm.timeRange === '90d' ? 90 : 365

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count: Math.floor(Math.random() * 50) + 10
    })
  }
  return data
}

// 生成模拟热门图书数据
const generateMockPopularBooks = () => {
  return [
    { title: '人工智能导论', author: '张三', borrowCount: 45 },
    { title: 'Vue.js 实战', author: '李四', borrowCount: 38 },
    { title: 'Python 编程', author: '王五', borrowCount: 32 },
    { title: '数据结构与算法', author: '赵六', borrowCount: 28 },
    { title: '机器学习基础', author: '孙七', borrowCount: 25 },
    { title: '深度学习', author: '周八', borrowCount: 22 },
    { title: '前端开发指南', author: '吴九', borrowCount: 19 },
    { title: '数据库原理', author: '郑十', borrowCount: 16 },
    { title: '软件工程', author: '刘一', borrowCount: 13 },
    { title: '计算机网络', author: '陈二', borrowCount: 10 }
  ]
}

// 生成模拟用户活跃度数据
const generateMockUserActivity = () => {
  return [
    { label: '高活跃用户 (10次以上)', count: 28, percentage: 85, type: 'high' },
    { label: '中活跃用户 (5-10次)', count: 45, percentage: 65, type: 'medium' },
    { label: '低活跃用户 (1-5次)', count: 67, percentage: 45, type: 'low' },
    { label: '未活跃用户 (0次)', count: 16, percentage: 20, type: 'none' }
  ]
}

// 生成模拟借阅时长分布数据
const generateMockDurationDistribution = () => {
  return [
    { range: '1-7天', count: 156, percentage: 60 },
    { range: '8-15天', count: 234, percentage: 90 },
    { range: '16-30天', count: 312, percentage: 100 },
    { range: '31-60天', count: 89, percentage: 35 },
    { range: '60天以上', count: 23, percentage: 10 }
  ]
}

// 更新图表类型
const updateChartType = () => {
  ElMessage.info(
    `图表类型已切换为${filterForm.chartType === 'line' ? '折线图' : filterForm.chartType === 'bar' ? '柱状图' : '面积图'}`
  )
}

// 获取时间范围文本
const getTimeRangeText = () => {
  const textMap = {
    '7d': '最近7天',
    '30d': '最近30天',
    '90d': '最近90天',
    '1y': '最近一年'
  }
  return textMap[filterForm.timeRange] || '最近30天'
}

// 获取排名样式
const getRankClass = index => {
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return 'rank-other'
}

// 导出报告
const exportTrendsReport = () => {
  ElMessage.info('导出趋势报告功能待实现')
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
}

// 监听对话框打开
watch(visible, newValue => {
  if (newValue) {
    loadTrendsData()
  }
})
</script>

<style lang="scss" scoped>
.trends-container {
  .filter-section {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--el-fill-color-extra-light);
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--el-color-primary-light-9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--el-color-primary);
        font-size: 20px;
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
          margin-bottom: 4px;
        }

        .stat-trend {
          font-size: 12px;
          font-weight: 500;

          &.up {
            color: var(--el-color-success);
          }

          &.down {
            color: var(--el-color-danger);
          }
        }
      }
    }
  }

  .charts-section {
    .mt-4 {
      margin-top: 16px;
    }

    .chart-card {
      height: 400px;

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chart-container {
        height: 320px;
        position: relative;

        .chart-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--el-text-color-placeholder);

          p {
            margin-top: 16px;
            font-size: 14px;
          }
        }

        .chart-mock {
          height: 100%;
          display: flex;
          flex-direction: column;

          .chart-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-primary);
            margin-bottom: 16px;
          }

          .chart-data {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .data-point {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 12px;
              background: var(--el-fill-color-extra-light);
              border-radius: 4px;

              .date {
                font-size: 12px;
                color: var(--el-text-color-regular);
              }

              .value {
                font-weight: 500;
                color: var(--el-text-color-primary);
              }
            }
          }
        }

        .ranking-list {
          height: 100%;
          overflow-y: auto;

          .ranking-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid var(--el-border-color-lighter);

            &:last-child {
              border-bottom: none;
            }

            .rank-number {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              color: white;

              &.rank-1 {
                background: #ffd700;
              }

              &.rank-2 {
                background: #c0c0c0;
              }

              &.rank-3 {
                background: #cd7f32;
              }

              &.rank-other {
                background: var(--el-color-info);
              }
            }

            .book-info {
              flex: 1;

              .book-title {
                font-weight: 500;
                color: var(--el-text-color-primary);
                margin-bottom: 4px;
              }

              .book-meta {
                font-size: 12px;
                color: var(--el-text-color-regular);
              }
            }

            .borrow-count {
              text-align: right;

              .count {
                font-weight: bold;
                color: var(--el-color-primary);
              }

              .label {
                font-size: 12px;
                color: var(--el-text-color-regular);
                margin-left: 4px;
              }
            }
          }
        }

        .user-activity {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;

          .activity-segment {
            .segment-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;

              .segment-label {
                font-size: 14px;
                color: var(--el-text-color-primary);
              }

              .segment-count {
                font-size: 12px;
                color: var(--el-text-color-regular);
              }
            }

            .segment-bar {
              height: 8px;
              background: var(--el-fill-color-light);
              border-radius: 4px;
              overflow: hidden;

              .bar-fill {
                height: 100%;
                transition: width 0.3s ease;

                &.high {
                  background: var(--el-color-success);
                }

                &.medium {
                  background: var(--el-color-warning);
                }

                &.low {
                  background: var(--el-color-info);
                }

                &.none {
                  background: var(--el-color-danger);
                }
              }
            }
          }
        }

        .duration-distribution {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;

          .duration-item {
            display: flex;
            align-items: center;
            gap: 12px;

            .duration-range {
              width: 80px;
              font-size: 12px;
              color: var(--el-text-color-regular);
            }

            .duration-bar {
              flex: 1;
              height: 8px;
              background: var(--el-fill-color-light);
              border-radius: 4px;
              overflow: hidden;

              .bar-fill {
                height: 100%;
                background: var(--el-color-primary);
                transition: width 0.3s ease;
              }
            }

            .duration-count {
              width: 40px;
              text-align: right;
              font-weight: 500;
              color: var(--el-text-color-primary);
            }
          }
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .trends-container {
    .stats-overview {
      grid-template-columns: 1fr;
    }

    .charts-section {
      .el-row {
        flex-direction: column;

        .el-col {
          width: 100%;
          margin-bottom: 16px;
        }
      }
    }
  }
}
</style>
