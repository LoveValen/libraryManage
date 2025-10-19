<template>
  <el-dialog v-model="visible" title="逾期管理" width="800px" :close-on-click-modal="false" @close="handleClose">
    <div class="overdue-container">
      <el-alert title="逾期管理说明" type="warning" show-icon :closable="false" class="mb-4">
        <p>管理所有逾期未还的图书，可进行批量操作和个别处理</p>
      </el-alert>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalOverdue }}</div>
          <div class="stat-label">逾期图书</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgOverdueDays }}</div>
          <div class="stat-label">平均逾期天数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">¥{{ stats.totalFines }}</div>
          <div class="stat-label">逾期罚金</div>
        </div>
      </div>

      <!-- 筛选操作区 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline size="default">
          <el-form-item label="逾期天数">
            <el-select v-model="filterForm.overdueDays" placeholder="选择逾期天数" @change="loadOverdueBooks">
              <el-option label="全部" value="" />
              <el-option label="1-7天" value="1-7" />
              <el-option label="8-15天" value="8-15" />
              <el-option label="16-30天" value="16-30" />
              <el-option label="30天以上" value="30+" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select v-model="filterForm.sortBy" placeholder="选择排序方式" @change="loadOverdueBooks">
              <el-option label="逾期天数升序" value="overdueDays_asc" />
              <el-option label="逾期天数降序" value="overdueDays_desc" />
              <el-option label="借阅时间升序" value="borrowDate_asc" />
              <el-option label="借阅时间降序" value="borrowDate_desc" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="loadOverdueBooks" :loading="loading">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作区 -->
      <div v-if="selectedBorrows.length > 0" class="batch-actions">
        <span class="selected-count">已选择 {{ selectedBorrows.length }} 项</span>
        <el-button-group>
          <el-button type="success" :icon="Check" @click="batchReturn" size="small">批量归还</el-button>
          <el-button type="info" :icon="Bell" @click="batchSendReminder" size="small">批量提醒</el-button>
          <el-button type="warning" :icon="Warning" @click="batchMarkLost" size="small">批量标记丢失</el-button>
        </el-button-group>
      </div>

      <!-- 逾期列表 -->
      <div class="overdue-list" v-loading="loading">
        <el-table :data="overdueBooks" @selection-change="handleSelectionChange" stripe size="default">
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column label="图书信息" min-width="200">
            <template #default="{ row }">
              <div class="book-info">
                <el-image :src="row.book?.coverImage" class="book-cover" fit="cover">
                  <template #error>
                    <div class="book-cover-placeholder">
                      <el-icon><Reading /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="book-details">
                  <div class="book-title">{{ row.book?.title }}</div>
                  <div class="book-meta">{{ row.book?.authors }}</div>
                  <div class="book-meta">{{ row.book?.isbn }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="借阅用户" width="120">
            <template #default="{ row }">
              <div class="user-info">
                <div class="user-name">{{ row.user?.realName || row.user?.username }}</div>
                <div class="user-meta">{{ row.user?.email }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="借阅时间" width="110" align="center">
            <template #default="{ row }">
              {{ formatDate(row.borrowDate) }}
            </template>
          </el-table-column>

          <el-table-column label="应还时间" width="110" align="center">
            <template #default="{ row }">
              <span class="text-danger">{{ formatDate(row.dueDate) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="逾期天数" width="100" align="center" sortable>
            <template #default="{ row }">
              <el-tag :type="getOverdueTagType(row.currentOverdueDays)" size="small">
                {{ row.currentOverdueDays }} 天
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="预计罚金" width="100" align="center">
            <template #default="{ row }">
              <span class="fine-amount">¥{{ calculateFine(row.currentOverdueDays) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-button type="success" :icon="Check" @click="returnSingleBook(row)" size="small" title="归还" />
                <el-button type="info" :icon="Bell" @click="sendSingleReminder(row)" size="small" title="发送提醒" />
                <el-button type="warning" :icon="Warning" @click="markSingleLost(row)" size="small" title="标记丢失" />
                <el-button type="primary" :icon="View" @click="viewBorrowDetail(row)" size="small" title="查看详情" />
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadOverdueBooks"
            @current-change="loadOverdueBooks"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="exportOverdueReport">导出报告</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Refresh, Check, Bell, Warning, View, Reading } from '@element-plus/icons-vue'
import { getBorrows, returnBook, markBookAsLost, batchProcessBorrows } from '@/api/borrows'
import { formatDate } from '@/utils/date'
import { removeEmpty } from '@/utils/global'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const overdueBooks = ref([])
const selectedBorrows = ref([])

// 统计数据
const stats = ref({
  totalOverdue: 0,
  avgOverdueDays: 0,
  totalFines: 0
})

// 筛选表单
const filterForm = reactive({
  overdueDays: '',
  sortBy: 'overdueDays_desc'
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 罚金费率（每天）
const fineRatePerDay = 0.5

// 加载逾期图书
const loadOverdueBooks = async () => {
  loading.value = true
  try {
    // 构建并清理请求参数
    const params = removeEmpty({
      status: 'overdue',
      page: pagination.page,
      limit: pagination.pageSize,
      overdueDays: filterForm.overdueDays,
      sortBy: filterForm.sortBy
    })

    const response = await getBorrows(params)

    // 直接使用后端标准响应格式
    overdueBooks.value = Array.isArray(response.data) ? response.data : []
    pagination.total = response.total || 0

    // 计算统计数据
    calculateStats()
  } catch (error) {
    console.error('加载逾期图书失败:', error)
    ElMessage.error('加载逾期图书失败')
  } finally {
    loading.value = false
  }
}

// 计算统计数据
const calculateStats = () => {
  stats.value.totalOverdue = overdueBooks.value.length

  if (overdueBooks.value.length > 0) {
    const totalOverdueDays = overdueBooks.value.reduce((sum, book) => sum + book.currentOverdueDays, 0)
    stats.value.avgOverdueDays = Math.round(totalOverdueDays / overdueBooks.value.length)
    stats.value.totalFines = overdueBooks.value.reduce((sum, book) => sum + calculateFine(book.currentOverdueDays), 0)
  } else {
    stats.value.avgOverdueDays = 0
    stats.value.totalFines = 0
  }
}

// 计算罚金
const calculateFine = overdueDays => {
  return (overdueDays * fineRatePerDay).toFixed(2)
}

// 处理选择变化
const handleSelectionChange = selection => {
  selectedBorrows.value = selection
}

// 单个归还
const returnSingleBook = async borrow => {
  try {
    await ElMessageBox.confirm(
      `确定要归还图书"${borrow.book.title}"吗？逾期${borrow.currentOverdueDays}天，需支付罚金¥${calculateFine(borrow.currentOverdueDays)}`,
      '逾期归还确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 清理请求数据
    const returnData = removeEmpty({
      condition: 'good',
      fine: calculateFine(borrow.currentOverdueDays)
    })

    await returnBook(borrow.id, returnData)

    ElNotification.success({
      title: '归还成功',
      message: `图书"${borrow.book.title}"已成功归还`
    })

    loadOverdueBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('归还图书失败:', error)
      ElMessage.error('归还图书失败')
    }
  }
}

// 发送单个提醒
const sendSingleReminder = borrow => {
  ElMessage.success(`已向${borrow.user.realName || borrow.user.username}发送逾期提醒`)
  // 这里应该调用实际的提醒API
}

// 标记单个丢失
const markSingleLost = async borrow => {
  try {
    const { value: notes } = await ElMessageBox.prompt(`确定要将图书"${borrow.book.title}"标记为丢失吗？`, '标记丢失', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入备注信息',
      inputType: 'textarea'
    })

    await markBookAsLost(borrow.id, { notes })

    ElNotification.success({
      title: '标记成功',
      message: `图书"${borrow.book.title}"已标记为丢失`
    })

    loadOverdueBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记丢失失败:', error)
      ElMessage.error('标记丢失失败')
    }
  }
}

// 查看详情
const viewBorrowDetail = borrow => {
  ElMessage.info('查看详情功能待实现')
}

// 批量归还
const batchReturn = async () => {
  if (selectedBorrows.value.length === 0) {
    ElMessage.warning('请先选择要归还的图书')
    return
  }

  const totalFine = selectedBorrows.value.reduce(
    (sum, borrow) => sum + parseFloat(calculateFine(borrow.currentOverdueDays)),
    0
  )

  try {
    await ElMessageBox.confirm(
      `确定要批量归还 ${selectedBorrows.value.length} 本逾期图书吗？总罚金：¥${totalFine.toFixed(2)}`,
      '批量归还确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const borrowIds = selectedBorrows.value.map(borrow => borrow.id)

    // 清理批量处理数据
    const batchData = removeEmpty({
      borrowIds,
      action: 'return',
      params: { condition: 'good' }
    })

    await batchProcessBorrows(batchData)

    ElNotification.success({
      title: '批量归还完成',
      message: `成功归还 ${selectedBorrows.value.length} 本图书`
    })

    selectedBorrows.value = []
    loadOverdueBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量归还失败:', error)
      ElMessage.error('批量归还失败')
    }
  }
}

// 批量发送提醒
const batchSendReminder = () => {
  if (selectedBorrows.value.length === 0) {
    ElMessage.warning('请先选择要提醒的用户')
    return
  }

  ElMessage.success(`已向 ${selectedBorrows.value.length} 位用户发送逾期提醒`)
  // 这里应该调用实际的批量提醒API
}

// 批量标记丢失
const batchMarkLost = async () => {
  if (selectedBorrows.value.length === 0) {
    ElMessage.warning('请先选择要标记的图书')
    return
  }

  try {
    const { value: notes } = await ElMessageBox.prompt(
      `确定要将 ${selectedBorrows.value.length} 本图书标记为丢失吗？`,
      '批量标记丢失',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入备注信息',
        inputType: 'textarea'
      }
    )

    const borrowIds = selectedBorrows.value.map(borrow => borrow.id)

    // 清理批量处理数据
    const batchData = removeEmpty({
      borrowIds,
      action: 'markLost',
      params: { notes }
    })

    await batchProcessBorrows(batchData)

    ElNotification.success({
      title: '批量标记完成',
      message: `成功标记 ${selectedBorrows.value.length} 本图书为丢失`
    })

    selectedBorrows.value = []
    loadOverdueBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记失败:', error)
      ElMessage.error('批量标记失败')
    }
  }
}

// 导出报告
const exportOverdueReport = () => {
  ElMessage.info('导出逾期报告功能待实现')
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  selectedBorrows.value = []
}

// 工具函数
const getOverdueTagType = days => {
  if (days <= 7) return 'warning'
  if (days <= 15) return 'danger'
  return 'danger'
}

// 监听对话框打开
watch(visible, newValue => {
  if (newValue) {
    loadOverdueBooks()
  }
})
</script>

<style lang="scss" scoped>
.overdue-container {
  .mb-4 {
    margin-bottom: 16px;
  }
}

.stats-section {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  .stat-card {
    flex: 1;
    padding: 16px;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    text-align: center;

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: var(--el-color-danger);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

.filter-section {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 6px;

  .selected-count {
    font-weight: 500;
    color: var(--el-color-primary);
  }
}

.overdue-list {
  .book-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .book-cover {
      width: 32px;
      height: 44px;
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
      .book-title {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .book-meta {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 2px;
      }
    }
  }

  .user-info {
    .user-name {
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 2px;
    }

    .user-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }

  .fine-amount {
    color: var(--el-color-danger);
    font-weight: 500;
  }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.text-danger {
  color: var(--el-color-danger);
}

@media (max-width: 768px) {
  .stats-section {
    flex-direction: column;
  }

  .batch-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>
