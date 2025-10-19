<template>
  <div class="borrow-history-container">
    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ borrowStats.current || 0 }}</div>
            <div class="stat-label">当前在借</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ borrowStats.total || 0 }}</div>
            <div class="stat-label">累计借阅</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value returned">{{ borrowStats.returned || 0 }}</div>
            <div class="stat-label">已归还</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value overdue">{{ borrowStats.overdue || 0 }}</div>
            <div class="stat-label">逾期次数</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <el-form :model="filterForm" :inline="true" size="small">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="已借出" value="borrowed" />
            <el-option label="已归还" value="returned" />
            <el-option label="已逾期" value="overdue" />
            <el-option label="已预约" value="reserved" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="全部分类" clearable style="width: 120px">
            <el-option label="计算机" value="computer" />
            <el-option label="文学" value="literature" />
            <el-option label="历史" value="history" />
            <el-option label="科学" value="science" />
            <el-option label="艺术" value="art" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
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

    <!-- 借阅记录表格 -->
    <div class="table-section">
      <el-table v-loading="loading" :data="borrowHistory" stripe border height="500" empty-text="暂无借阅记录">
        <el-table-column label="图书信息" min-width="250">
          <template #default="{ row }">
            <div class="book-info">
              <img :src="row.book.cover" :alt="row.book.title" class="book-cover" />
              <div class="book-details">
                <div class="book-title">{{ row.book.title }}</div>
                <div class="book-meta">
                  <span class="book-author">{{ row.book.author }}</span>
                  <el-tag size="small" :type="getCategoryTagType(row.book.category)">
                    {{ row.book.category }}
                  </el-tag>
                </div>
                <div class="book-isbn">ISBN: {{ row.book.isbn }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="借阅时间" width="160">
          <template #default="{ row }">
            <div class="time-info">
              <div>{{ formatDate(row.borrowedAt) }}</div>
              <div class="time-detail">{{ formatTime(row.borrowedAt) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="应还时间" width="160">
          <template #default="{ row }">
            <div class="time-info">
              <div :class="{ 'overdue-date': isOverdue(row.dueDate) }">
                {{ formatDate(row.dueDate) }}
              </div>
              <div class="time-detail">
                {{ getDaysRemaining(row.dueDate) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="归还时间" width="160">
          <template #default="{ row }">
            <div class="time-info" v-if="row.returnedAt">
              <div>{{ formatDate(row.returnedAt) }}</div>
              <div class="time-detail">{{ formatTime(row.returnedAt) }}</div>
            </div>
            <span v-else class="not-returned">未归还</span>
          </template>
        </el-table-column>

        <el-table-column label="续借次数" width="80">
          <template #default="{ row }">
            <span class="renewal-count">{{ row.renewalCount || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="逾期天数" width="80">
          <template #default="{ row }">
            <span v-if="row.overdueDays > 0" class="overdue-days">{{ row.overdueDays }}天</span>
            <span v-else class="no-overdue">-</span>
          </template>
        </el-table-column>

        <el-table-column label="罚金" width="80">
          <template #default="{ row }">
            <span v-if="row.fine > 0" class="fine-amount">¥{{ row.fine.toFixed(2) }}</span>
            <span v-else class="no-fine">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" link size="small" @click="viewDetail(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button v-if="row.status === 'borrowed'" type="success" link size="small" @click="handleReturn(row)">
                <el-icon><Check /></el-icon>
                归还
              </el-button>
              <el-button
                v-if="row.status === 'borrowed' && row.renewalCount < 3"
                type="warning"
                link
                size="small"
                @click="handleRenewal(row)"
              >
                <el-icon><Refresh /></el-icon>
                续借
              </el-button>
            </div>
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

    <!-- 借阅详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="借阅详情" width="600px" destroy-on-close>
      <BorrowDetail v-if="selectedBorrow" :borrow="selectedBorrow" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { borrowApi } from '@/api/borrows'
import { formatDate, formatTime } from '@/utils/date'
import { removeEmpty } from '@/utils/global'
import BorrowDetail from './BorrowDetail.vue'

// 属性定义
const props = defineProps({
  userId: {
    type: [String, Number],
    required: true
  }
})

// 响应式数据
const loading = ref(false)
const borrowHistory = ref([])
const borrowStats = ref({})
const showDetailDialog = ref(false)
const selectedBorrow = ref(null)

// 筛选表单
const filterForm = reactive({
  status: '',
  category: '',
  dateRange: null
})

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 方法
const getStatusText = status => {
  const statusMap = {
    borrowed: '已借出',
    returned: '已归还',
    overdue: '已逾期',
    reserved: '已预约'
  }
  return statusMap[status] || status
}

const getStatusTagType = status => {
  const typeMap = {
    borrowed: 'primary',
    returned: 'success',
    overdue: 'danger',
    reserved: 'warning'
  }
  return typeMap[status] || 'info'
}

const getCategoryTagType = category => {
  const typeMap = {
    computer: 'primary',
    literature: 'success',
    history: 'warning',
    science: 'info',
    art: 'danger'
  }
  return typeMap[category] || 'info'
}

const isOverdue = dueDate => {
  return new Date(dueDate) < new Date()
}

const getDaysRemaining = dueDate => {
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = due - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `逾期${Math.abs(diffDays)}天`
  } else if (diffDays === 0) {
    return '今日到期'
  } else if (diffDays <= 3) {
    return `还有${diffDays}天`
  } else {
    return `还有${diffDays}天`
  }
}

const fetchBorrowHistory = async () => {
  try {
    loading.value = true

    // 构建并清理请求参数
    const params = removeEmpty({
      userId: props.userId,
      page: pagination.page,
      size: pagination.size,
      status: filterForm.status,
      category: filterForm.category,
      startDate: Array.isArray(filterForm.dateRange) && filterForm.dateRange.length === 2 ? formatDate(filterForm.dateRange[0]) : undefined,
      endDate: Array.isArray(filterForm.dateRange) && filterForm.dateRange.length === 2 ? formatDate(filterForm.dateRange[1]) : undefined
    })

    const response = await borrowApi.getUserBorrowHistory(params)

    // 直接使用后端标准响应格式
    borrowHistory.value = Array.isArray(response.data) ? response.data : []
    borrowStats.value = response.stats || {}
    pagination.total = response.total || 0
  } catch (error) {
    console.error('获取借阅记录失败:', error)
    ElMessage.error('获取借阅记录失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  pagination.page = 1
  fetchBorrowHistory()
}

const handleReset = () => {
  Object.assign(filterForm, {
    status: '',
    category: '',
    dateRange: null
  })
  pagination.page = 1
  fetchBorrowHistory()
}

const handleSizeChange = size => {
  pagination.size = size
  pagination.page = 1
  fetchBorrowHistory()
}

const handlePageChange = page => {
  pagination.page = page
  fetchBorrowHistory()
}

const viewDetail = borrow => {
  selectedBorrow.value = borrow
  showDetailDialog.value = true
}

const handleReturn = async borrow => {
  try {
    await ElMessageBox.confirm(`确定要归还图书《${borrow.book.title}》吗？`, '归还图书', { type: 'warning' })

    await borrowApi.returnBook(borrow.id)
    ElMessage.success('图书归还成功')
    fetchBorrowHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('归还图书失败:', error)
      ElMessage.error('归还图书失败')
    }
  }
}

const handleRenewal = async borrow => {
  try {
    await ElMessageBox.confirm(`确定要续借图书《${borrow.book.title}》吗？续借后归还日期将延长14天。`, '续借图书', {
      type: 'info'
    })

    await borrowApi.renewBook(borrow.id)
    ElMessage.success('图书续借成功')
    fetchBorrowHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('续借图书失败:', error)
      ElMessage.error(error.message || '续借图书失败')
    }
  }
}

// 监听用户ID变化
watch(
  () => props.userId,
  () => {
    if (props.userId) {
      fetchBorrowHistory()
    }
  }
)

// 生命周期
onMounted(() => {
  if (props.userId) {
    fetchBorrowHistory()
  }
})
</script>

<style lang="scss" scoped>
.borrow-history-container {
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

    &.returned {
      color: var(--el-color-success);
    }

    &.overdue {
      color: var(--el-color-danger);
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

.book-info {
  display: flex;
  gap: 12px;

  .book-cover {
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .book-details {
    flex: 1;
    min-width: 0;

    .book-title {
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .book-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .book-author {
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }

    .book-isbn {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.time-info {
  .time-detail {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }

  .overdue-date {
    color: var(--el-color-danger);
    font-weight: 600;
  }
}

.not-returned {
  color: var(--el-text-color-secondary);
  font-style: italic;
}

.renewal-count {
  font-weight: 600;
  color: var(--el-color-warning);
}

.overdue-days {
  color: var(--el-color-danger);
  font-weight: 600;
}

.no-overdue,
.no-fine {
  color: var(--el-text-color-secondary);
}

.fine-amount {
  color: var(--el-color-danger);
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pagination-wrapper {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
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

  .book-info {
    .book-cover {
      width: 32px;
      height: 44px;
    }

    .book-details {
      .book-title {
        font-size: 14px;
      }

      .book-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  }
}
</style>
