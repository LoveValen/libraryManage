<template>
  <el-dialog v-model="visible" title="快速归还" width="600px" :close-on-click-modal="false" @close="handleClose">
    <div class="quick-return-container">
      <el-alert title="快速归还说明" type="info" show-icon :closable="false" class="mb-4">
        <p>可通过扫描图书条码或搜索图书进行快速归还操作</p>
      </el-alert>

      <!-- 扫描/搜索区域 -->
      <el-form :model="form" label-width="120px" size="default">
        <el-form-item label="图书搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入图书标题、ISBN或条码进行搜索"
            clearable
            @input="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prepend>
              <el-button :icon="Search" @click="handleSearch">搜索</el-button>
            </template>
            <template #suffix>
              <el-button :icon="ScanIcon" text @click="openScanner" title="扫描条码" />
            </template>
          </el-input>
        </el-form-item>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div class="results-header">
            <span>搜索结果 ({{ searchResults.length }})</span>
          </div>
          <div class="results-list">
            <div
              v-for="borrow in searchResults"
              :key="borrow.id"
              class="borrow-item"
              :class="{ selected: selectedBorrow?.id === borrow.id }"
              @click="selectBorrow(borrow)"
            >
              <div class="book-info">
                <el-image :src="borrow.book?.coverImage" class="book-cover" fit="cover">
                  <template #error>
                    <div class="book-cover-placeholder">
                      <el-icon><Reading /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="book-details">
                  <div class="book-title">{{ borrow.book?.title }}</div>
                  <div class="book-meta">
                    作者:
                    {{ Array.isArray(borrow.book?.authors) ? borrow.book.authors.join(', ') : borrow.book?.authors }}
                  </div>
                  <div class="book-meta">ISBN: {{ borrow.book?.isbn }}</div>
                </div>
              </div>
              <div class="borrow-info">
                <div class="user-info">
                  <span class="user-name">{{ borrow.user?.realName || borrow.user?.username }}</span>
                  <span class="borrow-date">借阅时间: {{ formatDate(borrow.borrowDate) }}</span>
                </div>
                <div class="status-info">
                  <el-tag :type="borrow.status === 'overdue' ? 'danger' : 'warning'" size="small">
                    {{ borrow.status === 'overdue' ? '逾期' : '借阅中' }}
                  </el-tag>
                  <span v-if="borrow.isCurrentlyOverdue" class="overdue-days">
                    逾期 {{ borrow.currentOverdueDays }} 天
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 选中的借阅记录 -->
        <div v-if="selectedBorrow" class="selected-borrow">
          <el-form-item label="归还图书">
            <el-card shadow="never" class="borrow-card">
              <div class="borrow-details">
                <div class="book-section">
                  <el-image :src="selectedBorrow.book?.coverImage" class="book-cover-large" fit="cover">
                    <template #error>
                      <div class="book-cover-placeholder">
                        <el-icon><Reading /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  <div class="book-info">
                    <div class="book-title">{{ selectedBorrow.book?.title }}</div>
                    <div class="book-meta">
                      作者:
                      {{
                        Array.isArray(selectedBorrow.book?.authors)
                          ? selectedBorrow.book.authors.join(', ')
                          : selectedBorrow.book?.authors
                      }}
                    </div>
                    <div class="book-meta">ISBN: {{ selectedBorrow.book?.isbn }}</div>
                  </div>
                </div>
                <div class="user-section">
                  <div class="user-info">
                    <span class="label">借阅用户:</span>
                    <span class="value">{{ selectedBorrow.user?.realName || selectedBorrow.user?.username }}</span>
                  </div>
                  <div class="date-info">
                    <span class="label">借阅时间:</span>
                    <span class="value">{{ formatDate(selectedBorrow.borrowDate) }}</span>
                  </div>
                  <div class="date-info">
                    <span class="label">应还时间:</span>
                    <span class="value" :class="getDueDateClass(selectedBorrow)">
                      {{ formatDate(selectedBorrow.dueDate) }}
                    </span>
                  </div>
                  <div v-if="selectedBorrow.isCurrentlyOverdue" class="overdue-info">
                    <el-tag type="danger" size="small">逾期 {{ selectedBorrow.currentOverdueDays }} 天</el-tag>
                  </div>
                </div>
              </div>
            </el-card>
          </el-form-item>

          <!-- 归还状态 -->
          <el-form-item label="归还状态" prop="condition">
            <el-radio-group v-model="form.condition">
              <el-radio label="good">完好</el-radio>
              <el-radio label="damaged">损坏</el-radio>
              <el-radio label="lost">丢失</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 归还备注 -->
          <el-form-item label="归还备注">
            <el-input
              v-model="form.notes"
              type="textarea"
              :rows="3"
              placeholder="可选：输入归还备注信息"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!selectedBorrow" @click="handleReturn">
          {{ submitting ? '归还中...' : '确认归还' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Reading } from '@element-plus/icons-vue'
import { getBorrows, returnBook } from '@/api/borrows'
import { formatDate } from '@/utils/date'

// 图标常量
const ScanIcon = Search // 使用Search图标作为扫描图标的替代

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

const searchKeyword = ref('')
const searchResults = ref([])
const selectedBorrow = ref(null)
const submitting = ref(false)
const searching = ref(false)

// 表单数据
const form = reactive({
  condition: 'good',
  notes: ''
})

// 搜索借阅记录
const handleSearch = async () => {
  const keyword = searchKeyword.value?.trim()
  if (!keyword || keyword.length < 2) {
    searchResults.value = []
    return
  }

  searching.value = true
  try {
    const response = await getBorrows({
      keyword,
      status: 'borrowed,overdue',
      limit: 10
    })

    searchResults.value = response.data || []

    if (searchResults.value.length === 0) {
      ElMessage.info('未找到匹配的借阅记录')
    }
  } catch (error) {
    console.error('搜索借阅记录失败:', error)
    ElMessage.error('搜索借阅记录失败')
  } finally {
    searching.value = false
  }
}

// 选择借阅记录
const selectBorrow = borrow => {
  selectedBorrow.value = borrow
  // 重置表单
  form.condition = 'good'
  form.notes = ''
}

// 打开扫描器（占位符功能）
const openScanner = () => {
  ElMessage.info('条码扫描功能待实现')
}

// 处理归还
const handleReturn = async () => {
  if (!selectedBorrow.value) {
    ElMessage.warning('请先选择要归还的图书')
    return
  }

  try {
    const confirmText =
      form.condition === 'good'
        ? `确定要归还图书"${selectedBorrow.value.book.title}"吗？`
        : `确定要将图书"${selectedBorrow.value.book.title}"标记为${form.condition === 'damaged' ? '损坏' : '丢失'}并归还吗？`

    await ElMessageBox.confirm(confirmText, '归还确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    submitting.value = true

    const returnData = {
      condition: form.condition,
      notes: form.notes || undefined
    }

    await returnBook(selectedBorrow.value.id, returnData)

    ElMessage.success('图书归还成功')
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('归还图书失败:', error)
      ElMessage.error(error.response?.data?.message || '归还图书失败')
    }
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  // 重置数据
  searchKeyword.value = ''
  searchResults.value = []
  selectedBorrow.value = null
  form.condition = 'good'
  form.notes = ''
}

// 工具函数
const getDueDateClass = borrow => {
  if (borrow.isCurrentlyOverdue) {
    return 'text-danger'
  }

  const today = new Date()
  const dueDate = new Date(borrow.dueDate)
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

  if (diffDays <= 3) {
    return 'text-warning'
  }

  return ''
}

// 监听对话框打开
watch(visible, newValue => {
  if (newValue) {
    // 对话框打开时的初始化逻辑
    searchKeyword.value = ''
    searchResults.value = []
    selectedBorrow.value = null
    form.condition = 'good'
    form.notes = ''
  }
})
</script>

<style lang="scss" scoped>
.quick-return-container {
  .mb-4 {
    margin-bottom: 16px;
  }
}

.search-results {
  margin-top: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;

  .results-header {
    background: var(--el-fill-color-extra-light);
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .results-list {
    max-height: 300px;
    overflow-y: auto;
  }
}

.borrow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background: var(--el-fill-color-extra-light);
  }

  &.selected {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  &:last-child {
    border-bottom: none;
  }

  .book-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;

    .book-cover {
      width: 40px;
      height: 56px;
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

  .borrow-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .user-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }

      .borrow-date {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-top: 2px;
      }
    }

    .status-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .overdue-days {
        font-size: 12px;
        color: var(--el-color-danger);
        font-weight: 500;
      }
    }
  }
}

.selected-borrow {
  margin-top: 20px;

  .borrow-card {
    border: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-extra-light);
  }

  .borrow-details {
    display: flex;
    gap: 20px;

    .book-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;

      .book-cover-large {
        width: 60px;
        height: 84px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .book-info {
        .book-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .book-meta {
          color: var(--el-text-color-regular);
          font-size: 14px;
          margin-bottom: 4px;
        }
      }
    }

    .user-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 200px;

      .user-info,
      .date-info {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .label {
          font-size: 14px;
          color: var(--el-text-color-regular);
        }

        .value {
          font-weight: 500;
          color: var(--el-text-color-primary);
        }
      }

      .overdue-info {
        display: flex;
        justify-content: flex-end;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.text-danger {
  color: var(--el-color-danger) !important;
}

.text-warning {
  color: var(--el-color-warning) !important;
}

@media (max-width: 768px) {
  .borrow-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .borrow-info {
      align-self: stretch;
      align-items: flex-start;
    }
  }

  .borrow-details {
    flex-direction: column;
    gap: 16px;

    .user-section {
      min-width: auto;
    }
  }
}
</style>
