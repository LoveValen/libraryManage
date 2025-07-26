<template>
  <div class="points-history-container">
    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ pointsStats.total || 0 }}</div>
            <div class="stat-label">当前积分</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value earned">+{{ pointsStats.earned || 0 }}</div>
            <div class="stat-label">累计获得</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value spent">-{{ pointsStats.spent || 0 }}</div>
            <div class="stat-label">累计消费</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ pointsStats.transactions || 0 }}</div>
            <div class="stat-label">交易次数</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <el-form :model="filterForm" :inline="true" size="small">
        <el-form-item label="类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="获得积分" value="earn" />
            <el-option label="消费积分" value="spend" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="filterForm.source" placeholder="全部来源" clearable style="width: 140px">
            <el-option label="借阅图书" value="borrow" />
            <el-option label="归还图书" value="return" />
            <el-option label="书评发布" value="review" />
            <el-option label="完成任务" value="task" />
            <el-option label="兑换奖励" value="exchange" />
            <el-option label="系统奖励" value="system" />
            <el-option label="管理员调整" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter" :loading="loading">
            <el-icon><Search /></el-icon>
            筛选
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 积分记录表格 -->
    <div class="table-section">
      <el-table v-loading="loading" :data="pointsHistory" stripe border height="400" empty-text="暂无积分记录">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <div class="time-info">
              <div>{{ formatDate(row.createdAt) }}</div>
              <div class="time-detail">{{ formatTime(row.createdAt) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'earn' ? 'success' : 'warning'" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="来源" width="100">
          <template #default="{ row }">
            <el-tag :type="getSourceTagType(row.source)" size="small">
              {{ getSourceText(row.source) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="积分变化" width="100">
          <template #default="{ row }">
            <span :class="['points-change', row.type === 'earn' ? 'earned' : 'spent']">
              {{ row.type === 'earn' ? '+' : '-' }}{{ Math.abs(row.amount) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="余额" width="80">
          <template #default="{ row }">
            <span class="balance">{{ row.balance }}</span>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="200">
          <template #default="{ row }">
            <div class="description">
              <div class="desc-title">{{ row.description }}</div>
              <div class="desc-detail" v-if="row.detail">{{ row.detail }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="关联" width="120">
          <template #default="{ row }">
            <div v-if="row.relatedBook" class="related-info">
              <el-button type="text" size="small" @click="viewBook(row.relatedBook)">
                {{ row.relatedBook.title }}
              </el-button>
            </div>
            <div v-else-if="row.relatedOrder" class="related-info">
              <el-button type="text" size="small" @click="viewOrder(row.relatedOrder)">
                订单#{{ row.relatedOrder.id }}
              </el-button>
            </div>
            <span v-else class="no-related">-</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { pointsApi } from '@/api/points'
import { formatDate, formatTime } from '@/utils/date'

// 属性定义
const props = defineProps({
  userId: {
    type: [String, Number],
    required: true
  }
})

// 响应式数据
const loading = ref(false)
const pointsHistory = ref([])
const pointsStats = ref({})

// 筛选表单
const filterForm = reactive({
  type: '',
  source: '',
  dateRange: null
})

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 方法
const getTypeText = type => {
  const typeMap = {
    earn: '获得',
    spend: '消费'
  }
  return typeMap[type] || type
}

const getSourceText = source => {
  const sourceMap = {
    borrow: '借阅图书',
    return: '归还图书',
    review: '书评发布',
    task: '完成任务',
    exchange: '兑换奖励',
    system: '系统奖励',
    admin: '管理员调整'
  }
  return sourceMap[source] || source
}

const getSourceTagType = source => {
  const typeMap = {
    borrow: 'success',
    return: 'primary',
    review: 'warning',
    task: 'info',
    exchange: 'danger',
    system: 'success',
    admin: 'warning'
  }
  return typeMap[source] || 'info'
}

const fetchPointsHistory = async () => {
  try {
    loading.value = true
    const params = {
      userId: props.userId,
      page: pagination.page,
      size: pagination.size,
      ...filterForm
    }

    // 处理日期范围
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    const { data } = await pointsApi.getUserPointsHistory(params)
    pointsHistory.value = data.records
    pointsStats.value = data.stats
    pagination.total = data.total
  } catch (error) {
    console.error('获取积分记录失败:', error)
    ElMessage.error('获取积分记录失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  pagination.page = 1
  fetchPointsHistory()
}

const handleReset = () => {
  Object.assign(filterForm, {
    type: '',
    source: '',
    dateRange: null
  })
  pagination.page = 1
  fetchPointsHistory()
}

const handleSizeChange = size => {
  pagination.size = size
  pagination.page = 1
  fetchPointsHistory()
}

const handlePageChange = page => {
  pagination.page = page
  fetchPointsHistory()
}

const viewBook = book => {
  // 跳转到图书详情页
  window.open(`/books/detail/${book.id}`, '_blank')
}

const viewOrder = order => {
  // 跳转到订单详情页
  window.open(`/orders/detail/${order.id}`, '_blank')
}

// 监听用户ID变化
watch(
  () => props.userId,
  () => {
    if (props.userId) {
      fetchPointsHistory()
    }
  }
)

// 生命周期
onMounted(() => {
  if (props.userId) {
    fetchPointsHistory()
  }
})
</script>

<style lang="scss" scoped>
.points-history-container {
  .stats-section {
    margin-bottom: 20px;
  }
}

.stat-card {
  background: var(--el-fill-color-lighter);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--el-border-color-light);

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;

    &.earned {
      color: var(--el-color-success);
    }

    &.spent {
      color: var(--el-color-warning);
    }
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.table-section {
  background: white;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
}

.time-info {
  .time-detail {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
}

.points-change {
  font-weight: 600;

  &.earned {
    color: var(--el-color-success);
  }

  &.spent {
    color: var(--el-color-warning);
  }
}

.balance {
  font-weight: 600;
  color: var(--el-color-primary);
}

.description {
  .desc-title {
    font-weight: 500;
    margin-bottom: 2px;
  }

  .desc-detail {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.related-info {
  .el-button {
    padding: 0;
    font-size: 12px;
  }
}

.no-related {
  color: var(--el-text-color-secondary);
}

.pagination-wrapper {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}

// 响应式设计
@include respond-to(mobile) {
  .stats-section {
    :deep(.el-row) {
      .el-col {
        margin-bottom: 12px;
      }
    }
  }

  .filter-section {
    :deep(.el-form) {
      .el-form-item {
        margin-bottom: 16px;
        display: block;

        .el-form-item__label {
          display: block;
          width: auto !important;
          margin-bottom: 8px;
        }

        .el-form-item__content {
          margin-left: 0 !important;
        }
      }
    }
  }
}
</style>
