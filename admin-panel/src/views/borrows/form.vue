<template>
  <div class="borrow-form-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack" link size="large">返回</el-button>
        <div class="header-info">
          <h1>新增借阅</h1>
          <p class="description">创建新的图书借阅记录</p>
        </div>
      </div>
    </div>

    <!-- 快速操作提示 -->
    <el-card shadow="never" class="quick-tips-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Lightning /></el-icon>
            快速操作提示
          </div>
        </div>
      </template>

      <div class="tips-content">
        <el-alert title="操作建议" type="info" show-icon :closable="false">
          <ul class="tips-list">
            <li>
              <strong>扫码借阅：</strong>
              使用扫码设备扫描用户证件和图书条码，系统将自动填入信息
            </li>
            <li>
              <strong>搜索用户：</strong>
              输入用户姓名、学号或邮箱进行搜索
            </li>
            <li>
              <strong>搜索图书：</strong>
              输入书名、作者或ISBN进行搜索
            </li>
            <li>
              <strong>批量借阅：</strong>
              如需为同一用户借阅多本图书，建议分别创建借阅记录
            </li>
          </ul>
        </el-alert>
      </div>
    </el-card>

    <!-- 借阅表单 -->
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><DocumentAdd /></el-icon>
            借阅信息
          </div>
          <div class="header-actions">
            <el-button type="success" :icon="QrCode" @click="showScanDialog = true">扫码借阅</el-button>
          </div>
        </div>
      </template>

      <BorrowFormProSimple
        :preset-user-id="presetUserId"
        :preset-book-id="presetBookId"
        @success="handleSuccess"
        @cancel="handleCancel"
      />
    </el-card>

    <!-- 最近借阅记录 -->
    <el-card shadow="never" class="recent-borrows-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Clock /></el-icon>
            最近借阅记录
          </div>
          <div class="header-actions">
            <el-button link :icon="Refresh" @click="loadRecentBorrows" :loading="recentLoading">刷新</el-button>
          </div>
        </div>
      </template>

      <div v-loading="recentLoading" class="recent-borrows-content">
        <el-empty v-if="!recentLoading && recentBorrows.length === 0" description="暂无最近借阅记录" image-size="120" />

        <div v-else class="recent-borrows-list">
          <div v-for="borrow in recentBorrows" :key="borrow.id" class="recent-borrow-item">
            <div class="borrow-info">
              <div class="user-info">
                <el-avatar :src="borrow.user?.avatar" :size="32">
                  {{ borrow.user?.realName?.charAt(0) || borrow.user?.username?.charAt(0) }}
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ borrow.user?.realName || borrow.user?.username }}</div>
                  <div class="user-meta">{{ borrow.user?.email }}</div>
                </div>
              </div>

              <div class="book-info">
                <div class="book-title">{{ borrow.book?.title }}</div>
                <div class="book-meta">
                  {{ Array.isArray(borrow.book?.authors) ? borrow.book.authors.join(', ') : borrow.book?.authors }}
                </div>
              </div>

              <div class="borrow-meta">
                <div class="borrow-time">{{ formatRelativeTime(borrow.borrowDate) }}</div>
                <StatusTag :value="borrow.status" :config="borrowStatusConfig" size="small" />
              </div>
            </div>

            <div class="borrow-actions">
              <el-button link :icon="View" @click="viewBorrowDetail(borrow)" size="small">查看</el-button>
              <el-button
                v-if="borrow.status === 'borrowed'"
                link
                :icon="Check"
                @click="quickReturn(borrow)"
                size="small"
              >
                归还
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 扫码借阅对话框 -->
    <el-dialog v-model="showScanDialog" title="扫码借阅" width="500px" :close-on-click-modal="false">
      <ScanBorrowDialog v-if="showScanDialog" @success="handleScanSuccess" @cancel="showScanDialog = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Lightning, DocumentAdd, Clock, Refresh, View, Check, ArrowLeft } from '@element-plus/icons-vue'
import { StatusTag } from '@/components/common'
import BorrowFormProSimple from './components/BorrowFormProSimple.vue'
import ScanBorrowDialog from './components/ScanBorrowDialog.vue'
import { getBorrows, returnBook } from '@/api/borrows'
import { formatRelativeTime } from '@/utils/date'
import { showSuccess, showError, showInfo, notifySuccess, confirmDelete } from '@/utils/message'

// Router
const route = useRoute()
const router = useRouter()

// 响应式数据
const showScanDialog = ref(false)
const recentLoading = ref(false)
const recentBorrows = ref([])

// 预设数据（从路由查询参数获取）
const presetUserId = ref(route.query.userId || null)
const presetBookId = ref(route.query.bookId || null)

// 借阅状态配置
const borrowStatusConfig = {
  borrowed: { type: 'success', text: '借阅中', icon: 'Reading' },
  returned: { type: 'info', text: '已归还', icon: 'Check' },
  overdue: { type: 'danger', text: '逾期', icon: 'Warning' },
  lost: { type: 'danger', text: '丢失', icon: 'Close' },
  damaged: { type: 'warning', text: '损坏', icon: 'Warning' }
}

// 方法
const handleBack = () => {
  router.push({ name: 'BorrowList' })
}

const handleSuccess = async () => {
  notifySuccess('借阅记录已成功创建', '创建成功')

  // 刷新最近借阅记录
  loadRecentBorrows()

  // 询问是否继续创建
  const confirmed = await confirmDelete(0, '', '借阅记录创建成功！是否继续创建新的借阅记录？')
  if (!confirmed) {
    handleBack()
  }
}

const handleCancel = async () => {
  const confirmed = await confirmDelete(0, '', '确定要取消创建借阅记录吗？已填写的信息将丢失。')
  if (confirmed) {
    handleBack()
  }
}

const handleScanSuccess = data => {
  showScanDialog.value = false

  // 设置扫码获取的数据
  if (data.userId) {
    presetUserId.value = data.userId
  }
  if (data.bookId) {
    presetBookId.value = data.bookId
  }

  showSuccess('扫码成功，信息已自动填入')
}

const loadRecentBorrows = async () => {
  recentLoading.value = true
  try {
    const response = await getBorrows({
      page: 1,
      limit: 10,
      sortBy: 'borrow_date',
      sortOrder: 'desc'
    })

    recentBorrows.value = response.data
  } catch (error) {
    console.error('加载最近借阅记录失败:', error)
    showError('加载最近借阅记录失败')
  } finally {
    recentLoading.value = false
  }
}

const viewBorrowDetail = borrow => {
  router.push({
    name: 'BorrowDetail',
    params: { id: borrow.id }
  })
}

const quickReturn = async borrow => {
  try {
    const confirmed = await confirmDelete(1, '图书归还', `确定要归还图书"${borrow.book.title}"吗？`)
    if (!confirmed) return

    await returnBook(borrow.id, { condition: 'good' })

    notifySuccess(`图书"${borrow.book.title}"已成功归还`, '归还成功')

    // 刷新最近借阅记录
    loadRecentBorrows()
  } catch (error) {
    console.error('快速归还失败:', error)
    showError('快速归还失败')
  }
}

// 监听键盘快捷键
const handleKeydown = event => {
  // Ctrl+S 或 Cmd+S：快速保存
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    // 触发表单提交（需要通过 ref 或事件总线实现）
  }

  // Esc：取消操作
  if (event.key === 'Escape') {
    handleCancel()
  }

  // Ctrl+Shift+S 或 Cmd+Shift+S：扫码借阅
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
    event.preventDefault()
    showScanDialog.value = true
  }
}

// 生命周期
onMounted(() => {
  // 加载最近借阅记录
  loadRecentBorrows()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)

  // 如果有预设参数，显示提示
  if (presetUserId.value || presetBookId.value) {
    showInfo('已自动填入预设信息，请检查并完善其他必填项')
  }
})

onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.borrow-form-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-info {
      h1 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .description {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }
  }
}

.quick-tips-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .tips-content {
    .tips-list {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: var(--el-text-color-regular);
        line-height: 1.6;

        strong {
          color: var(--el-text-color-primary);
        }
      }
    }
  }
}

.form-card {
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
}

.recent-borrows-card {
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

  .recent-borrows-content {
    min-height: 200px;
  }

  .recent-borrows-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recent-borrow-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-extra-light);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
    }

    .borrow-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;

      .user-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 180px;

        .user-details {
          .user-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
            font-size: 14px;
          }

          .user-meta {
            font-size: 12px;
            color: var(--el-text-color-regular);
            margin-top: 2px;
          }
        }
      }

      .book-info {
        flex: 1;
        min-width: 200px;

        .book-title {
          font-weight: 500;
          color: var(--el-text-color-primary);
          font-size: 14px;
          margin-bottom: 4px;
          @include text-ellipsis();
        }

        .book-meta {
          font-size: 12px;
          color: var(--el-text-color-regular);
          @include text-ellipsis();
        }
      }

      .borrow-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        min-width: 120px;

        .borrow-time {
          font-size: 12px;
          color: var(--el-text-color-regular);
        }
      }
    }

    .borrow-actions {
      display: flex;
      gap: 4px;
      margin-left: 16px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .borrow-form-container {
    padding: 10px;
  }

  .recent-borrow-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    .borrow-info {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;

      .user-info,
      .book-info {
        min-width: auto;
      }

      .borrow-meta {
        align-items: stretch;

        .borrow-time {
          text-align: left;
        }
      }
    }

    .borrow-actions {
      margin-left: 0;
      justify-content: center;
    }
  }
}

// 辅助样式
@mixin text-ellipsis($lines: 1) {
  @if $lines == 1 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
