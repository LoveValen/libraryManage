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
      <ProTable
        ref="proTableRef"
        :request="requestPointsHistory"
        :columns="filteredPointsTableColumns"
        :search="false"
        :toolBar="pointsToolBarConfig"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.size,
          total: pagination.total,
          pageSizes: [10, 20, 50],
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: handlePageChange,
          onShowSizeChange: handleSizeChange
        }"
        row-key="id"
        :max-height="finalTableHeight"
        empty-text="暂无积分记录"
        stripe
        border
      >
        <!-- 工具栏插槽 -->
        <template #toolBarRender>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <el-tooltip content="列设置" placement="top">
              <el-button :icon="Setting" @click="openColumnSettings" />
            </el-tooltip>
          </div>
        </template>
        <!-- 时间插槽 -->
        <template #timeInfo="{ record }">
          <div class="time-info">
            <div>{{ formatDate(record.createdAt) }}</div>
            <div class="time-detail">{{ formatTime(record.createdAt) }}</div>
          </div>
        </template>

        <!-- 类型插槽 -->
        <template #pointsType="{ record }">
          <el-tag :type="record.type === 'earn' ? 'success' : 'warning'" size="small">
            {{ getTypeText(record.type) }}
          </el-tag>
        </template>

        <!-- 来源插槽 -->
        <template #pointsSource="{ record }">
          <el-tag :type="getSourceTagType(record.source)" size="small">
            {{ getSourceText(record.source) }}
          </el-tag>
        </template>

        <!-- 积分变化插槽 -->
        <template #pointsChange="{ record }">
          <span :class="['points-change', record.type === 'earn' ? 'earned' : 'spent']">
            {{ record.type === 'earn' ? '+' : '-' }}{{ Math.abs(record.amount) }}
          </span>
        </template>

        <!-- 余额插槽 -->
        <template #balance="{ record }">
          <span class="balance">{{ record.balance }}</span>
        </template>

        <!-- 描述插槽 -->
        <template #description="{ record }">
          <div class="description">
            <div class="desc-title">{{ record.description }}</div>
            <div class="desc-detail" v-if="record.detail">{{ record.detail }}</div>
          </div>
        </template>

        <!-- 关联插槽 -->
        <template #related="{ record }">
          <div v-if="record.relatedBook" class="related-info">
            <el-button link size="small" @click="viewBook(record.relatedBook)">
              {{ record.relatedBook.title }}
            </el-button>
          </div>
          <div v-else-if="record.relatedOrder" class="related-info">
            <el-button link size="small" @click="viewOrder(record.relatedOrder)">
              订单#{{ record.relatedOrder.id }}
            </el-button>
          </div>
          <span v-else class="no-related">-</span>
        </template>
      </ProTable>
    </div>

    <!-- 列设置对话框 -->
    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { ProTable, ColumnSettings } from '@/components/common'
import { pointsApi } from '@/api/points'
import { formatDate, formatTime } from '@/utils/date'
import { removeEmpty } from '@/utils/global'
import { extractListResponse } from '@/utils/apiResponse'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

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
const proTableRef = ref()

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

// 默认列设置配置
const defaultVisibleColumns = [
  'createdAt',
  'type',
  'source',
  'amount',
  'balance',
  'description',
  'related'
]

const defaultColumnOptions = [
  { label: '时间', value: 'createdAt', required: true },
  { label: '类型', value: 'type' },
  { label: '来源', value: 'source' },
  { label: '积分变化', value: 'amount', required: true },
  { label: '余额', value: 'balance' },
  { label: '描述', value: 'description' },
  { label: '关联', value: 'related' }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('pointsHistory', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable (组件内使用较小的高度)
const tableHeightConfig = getTableHeightPreset('compact', {
  headerOffset: 100, // 组件头部较小
  footerOffset: 60   // 组件底部较小
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

// 所有可用的表格列配置
const allPointsTableColumns = [
  {
    key: 'createdAt',
    title: '时间',
    slot: 'timeInfo',
    width: 160
  },
  {
    key: 'type',
    title: '类型',
    slot: 'pointsType',
    width: 80,
    align: 'center'
  },
  {
    key: 'source',
    title: '来源',
    slot: 'pointsSource',
    width: 100,
    align: 'center'
  },
  {
    key: 'amount',
    title: '积分变化',
    slot: 'pointsChange',
    width: 100,
    align: 'center'
  },
  {
    key: 'balance',
    title: '余额',
    slot: 'balance',
    width: 80,
    align: 'center'
  },
  {
    key: 'description',
    title: '描述',
    slot: 'description',
    minWidth: 200
  },
  {
    key: 'related',
    title: '关联',
    slot: 'related',
    width: 120,
    align: 'center'
  }
]

// 动态过滤的表格列配置（计算属性）
const filteredPointsTableColumns = computed(() => {
  // 根据columnOptions的顺序和visibleColumns的选择来生成列
  const columnsMap = {}
  allPointsTableColumns.forEach(col => {
    columnsMap[col.key] = col
  })

  // 按照columnOptions的顺序返回可见的列
  return columnOptions.value
    .filter(opt => visibleColumns.value.includes(opt.value))
    .map(opt => columnsMap[opt.value])
    .filter(Boolean)
})

// 工具栏配置
const pointsToolBarConfig = {
  refresh: false,
  setting: false,
  density: false,
  columnSetting: false,
  fullScreen: false
}

// ProTable数据请求函数
const requestPointsHistory = async (params) => {
  try {
    // 构建并清理请求参数
    const requestParams = removeEmpty({
      userId: props.userId,
      page: params.current || pagination.page,
      size: params.pageSize || pagination.size,
      type: filterForm.type,
      source: filterForm.source,
      startDate: Array.isArray(filterForm.dateRange) && filterForm.dateRange.length === 2 ? formatDate(filterForm.dateRange[0]) : undefined,
      endDate: Array.isArray(filterForm.dateRange) && filterForm.dateRange.length === 2 ? formatDate(filterForm.dateRange[1]) : undefined
    })

    const response = await pointsApi.getUserPointsHistory(requestParams)

    const statsCandidate = response?.stats
      ?? (response?.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data.stats : undefined)
    pointsStats.value = statsCandidate || {}

    const meta = extractListResponse(response)
    const list = Array.isArray(meta.list) ? meta.list : []
    const total = typeof meta.total === 'number' ? meta.total : list.length

    return {
      success: true,
      data: list,
      total
    }
  } catch (error) {
    console.error('获取积分记录失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  }
}

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

// 旧的fetchPointsHistory函数已被ProTable的requestPointsHistory替代

const handleFilter = () => {
  pagination.page = 1
  proTableRef.value?.reload(true)
}

const handleReset = () => {
  Object.assign(filterForm, {
    type: '',
    source: '',
    dateRange: null
  })
  pagination.page = 1
  proTableRef.value?.reload(true)
}

const handleSizeChange = size => {
  pagination.size = size
  pagination.page = 1
}

const handlePageChange = page => {
  pagination.page = page
}

// 列设置应用回调 - 添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
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
      proTableRef.value?.reload(true)
    }
  }
)

// 生命周期
onMounted(() => {
  if (props.userId) {
    // ProTable will auto-load data when mounted
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
    font-size: 20px;
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
