<template>
  <div class="borrow-form-container">
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="120px"
      size="default"
      @submit.prevent="handleSubmit"
    >
      <!-- 用户选择 -->
      <el-form-item label="借阅用户" prop="userId" required>
        <el-select
          v-model="form.userId"
          placeholder="搜索并选择用户"
          filterable
          remote
          reserve-keyword
          :remote-method="searchUsers"
          :loading="userLoading"
          clearable
          style="width: 100%"
          @change="handleUserChange"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.id"
            :label="`${user.realName || user.username} (${user.email})`"
            :value="user.id"
          >
            <div class="user-option">
              <div class="user-info">
                <span class="user-name">{{ user.realName || user.username }}</span>
                <span class="user-email">{{ user.email }}</span>
              </div>
              <el-tag :type="getUserStatusType(user.status)" size="small">
                {{ getUserStatusText(user.status) }}
              </el-tag>
            </div>
          </el-option>
        </el-select>

        <!-- 用户信息预览 -->
        <div v-if="selectedUser" class="user-preview">
          <el-card shadow="never" class="user-card">
            <div class="user-details">
              <el-avatar :src="selectedUser.avatar" :size="40" class="user-avatar">
                {{ selectedUser.realName?.charAt(0) || selectedUser.username?.charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <div class="user-name">{{ selectedUser.realName || selectedUser.username }}</div>
                <div class="user-meta">{{ selectedUser.email }}</div>
              </div>
              <div class="user-limits">
                <el-tag :type="limits.canBorrow ? 'success' : 'danger'" size="small">
                  {{ limits.canBorrow ? '可借阅' : '不可借阅' }}
                </el-tag>
                <div class="limits-info">
                  <span>当前借阅: {{ limits.activeBorrowCount }}/{{ limits.maxBorrowLimit }}</span>
                  <span v-if="limits.unpaidFines > 0" class="fine-info">未付罚金: ¥{{ limits.unpaidFines }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-form-item>

      <!-- 图书选择 -->
      <el-form-item label="借阅图书" prop="bookId" required>
        <el-select
          v-model="form.bookId"
          placeholder="搜索并选择图书"
          filterable
          remote
          reserve-keyword
          :remote-method="searchBooks"
          :loading="bookLoading"
          clearable
          style="width: 100%"
          @change="handleBookChange"
        >
          <el-option
            v-for="book in bookOptions"
            :key="book.id"
            :label="`${book.title} - ${book.authors?.join?.(', ') || book.authors}`"
            :value="book.id"
            :disabled="!book.isAvailable"
          >
            <div class="book-option">
              <div class="book-info">
                <span class="book-title">{{ book.title }}</span>
                <span class="book-meta">{{ book.authors?.join?.(', ') || book.authors }} - {{ book.isbn }}</span>
              </div>
              <div class="book-status">
                <el-tag :type="getBookStatusType(book.status)" size="small">
                  {{ getBookStatusText(book.status) }}
                </el-tag>
                <span class="stock-info">库存: {{ book.availableStock }}/{{ book.totalStock }}</span>
              </div>
            </div>
          </el-option>
        </el-select>

        <!-- 图书信息预览 -->
        <div v-if="selectedBook" class="book-preview">
          <el-card shadow="never" class="book-card">
            <div class="book-details">
              <el-image :src="selectedBook.coverImage" class="book-cover" fit="cover">
                <template #error>
                  <div class="book-cover-placeholder">
                    <el-icon><Reading /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="book-info">
                <div class="book-title">{{ selectedBook.title }}</div>
                <div class="book-meta">
                  作者:
                  {{ Array.isArray(selectedBook.authors) ? selectedBook.authors.join(', ') : selectedBook.authors }}
                </div>
                <div class="book-meta">ISBN: {{ selectedBook.isbn }}</div>
                <div class="book-meta">分类: {{ selectedBook.category || '未分类' }}</div>
              </div>
              <div class="book-availability">
                <el-tag :type="getBookStatusType(selectedBook.status)" size="default">
                  {{ getBookStatusText(selectedBook.status) }}
                </el-tag>
                <div class="availability-info">
                  <span>可借: {{ selectedBook.availableStock }}</span>
                  <span>总计: {{ selectedBook.totalStock }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-form-item>

      <!-- 借阅天数 -->
      <el-form-item label="借阅天数" prop="borrowDays">
        <el-input-number
          v-model="form.borrowDays"
          :min="1"
          :max="90"
          :step="1"
          placeholder="借阅天数"
          style="width: 200px"
        />
        <span class="form-help">默认 {{ defaultBorrowDays }} 天，最多 90 天</span>
      </el-form-item>

      <!-- 到期日期预览 -->
      <el-form-item label="到期日期">
        <el-tag type="info" size="large">
          {{ calculateDueDate() }}
        </el-tag>
        <span class="form-help">根据借阅天数自动计算</span>
      </el-form-item>

      <!-- 借阅备注 -->
      <el-form-item label="借阅备注" prop="borrowNotes">
        <el-input
          v-model="form.borrowNotes"
          type="textarea"
          :rows="3"
          placeholder="可选：输入借阅备注信息"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <!-- 借阅规则说明 -->
      <el-form-item>
        <el-alert title="借阅规则" type="info" show-icon :closable="false">
          <ul class="rules-list">
            <li>每位用户最多同时借阅 {{ maxBorrowBooks }} 本图书</li>
            <li>默认借阅期限为 {{ defaultBorrowDays }} 天，可自定义 1-90 天</li>
            <li>图书可续借 {{ maxRenewals }} 次，每次延长 {{ renewalDays }} 天</li>
            <li>逾期归还将产生罚金，具体费率请咨询管理员</li>
            <li>有未付罚金的用户暂时无法借阅新图书</li>
          </ul>
        </el-alert>
      </el-form-item>

      <!-- 表单操作按钮 -->
      <el-form-item>
        <div class="form-actions">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit" :disabled="!canSubmit">
            {{ submitting ? '创建中...' : '创建借阅' }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Reading } from '@element-plus/icons-vue'
import { createBorrow, checkBorrowLimits } from '@/api/borrows'
import { getBooks } from '@/api/books'
import { searchUsers as searchUsersAPI } from '@/api/users'
import { formatDate } from '@/utils/date'

// Props
const props = defineProps({
  // 可以预设用户ID或图书ID
  presetUserId: {
    type: [String, Number],
    default: null
  },
  presetBookId: {
    type: [String, Number],
    default: null
  }
})

// Emits
const emit = defineEmits(['success', 'cancel'])

// 响应式数据
const formRef = ref()
const submitting = ref(false)
const userLoading = ref(false)
const bookLoading = ref(false)

const userOptions = ref([])
const bookOptions = ref([])
const selectedUser = ref(null)
const selectedBook = ref(null)
const limits = ref({
  canBorrow: true,
  activeBorrowCount: 0,
  maxBorrowLimit: 5,
  unpaidFines: 0,
  overdueBorrowCount: 0
})

// 借阅规则常量
const defaultBorrowDays = 30
const maxBorrowBooks = 5
const maxRenewals = 2
const renewalDays = 15

// 表单数据
const form = reactive({
  userId: props.presetUserId || '',
  bookId: props.presetBookId || '',
  borrowDays: defaultBorrowDays,
  borrowNotes: ''
})

// 表单验证规则
const formRules = {
  userId: [{ required: true, message: '请选择借阅用户', trigger: 'change' }],
  bookId: [{ required: true, message: '请选择借阅图书', trigger: 'change' }],
  borrowDays: [
    { required: true, message: '请输入借阅天数', trigger: 'blur' },
    { type: 'number', min: 1, max: 90, message: '借阅天数应在1-90天之间', trigger: 'blur' }
  ]
}

// 计算属性
const canSubmit = computed(() => {
  return (
    form.userId &&
    form.bookId &&
    form.borrowDays >= 1 &&
    form.borrowDays <= 90 &&
    limits.value.canBorrow &&
    selectedBook.value?.availableStock > 0
  )
})

// 方法
const searchUsers = async query => {
  if (!query || query.length < 2) {
    userOptions.value = []
    return
  }

  userLoading.value = true
  try {
    const response = await searchUsersAPI({ q: query, limit: 20 })
    userOptions.value = response.data
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('搜索用户失败')
  } finally {
    userLoading.value = false
  }
}

const searchBooks = async query => {
  if (!query || query.length < 2) {
    bookOptions.value = []
    return
  }

  bookLoading.value = true
  try {
    const response = await getBooks({
      search: query,
      limit: 20,
      status: 'available'
    })
    bookOptions.value = response.data.map(book => ({
      ...book,
      isAvailable: book.status === 'available' && book.availableStock > 0
    }))
  } catch (error) {
    console.error('搜索图书失败:', error)
    ElMessage.error('搜索图书失败')
  } finally {
    bookLoading.value = false
  }
}

const handleUserChange = async userId => {
  if (!userId) {
    selectedUser.value = null
    limits.value = {
      canBorrow: true,
      activeBorrowCount: 0,
      maxBorrowLimit: 5,
      unpaidFines: 0,
      overdueBorrowCount: 0
    }
    return
  }

  // 设置选中的用户
  selectedUser.value = userOptions.value.find(user => user.id === userId)

  // 检查用户借阅限制
  try {
    const response = await checkBorrowLimits(userId)
    limits.value = response.data.limits

    if (!limits.value.canBorrow) {
      ElMessage.warning('该用户当前无法借阅图书，请检查借阅限制')
    }
  } catch (error) {
    console.error('检查借阅限制失败:', error)
    ElMessage.error('检查借阅限制失败')
  }
}

const handleBookChange = bookId => {
  if (!bookId) {
    selectedBook.value = null
    return
  }

  selectedBook.value = bookOptions.value.find(book => book.id === bookId)

  if (selectedBook.value && selectedBook.value.availableStock <= 0) {
    ElMessage.warning('该图书当前无可借库存')
  }
}

const calculateDueDate = () => {
  if (!form.borrowDays) return '-'

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + form.borrowDays)
  return formatDate(dueDate)
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (!canSubmit.value) {
      ElMessage.warning('请检查表单信息或用户借阅资格')
      return
    }

    submitting.value = true

    const borrowData = {
      userId: form.userId,
      bookId: form.bookId,
      borrowDays: form.borrowDays,
      borrowNotes: form.borrowNotes || undefined
    }

    await createBorrow(borrowData)

    ElMessage.success('借阅记录创建成功')
    emit('success')

    // 重置表单
    await formRef.value.resetFields()
    selectedUser.value = null
    selectedBook.value = null
    userOptions.value = []
    bookOptions.value = []
  } catch (error) {
    console.error('创建借阅失败:', error)
    ElMessage.error(error.response?.data?.message || '创建借阅失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// 工具函数
const getUserStatusType = status => {
  const statusMap = {
    active: 'success',
    inactive: 'info',
    suspended: 'warning',
    banned: 'danger'
  }
  return statusMap[status] || 'info'
}

const getUserStatusText = status => {
  const statusMap = {
    active: '正常',
    inactive: '未激活',
    suspended: '暂停',
    banned: '禁用'
  }
  return statusMap[status] || status
}

const getBookStatusType = status => {
  const statusMap = {
    available: 'success',
    borrowed: 'warning',
    maintenance: 'info',
    retired: 'danger'
  }
  return statusMap[status] || 'info'
}

const getBookStatusText = status => {
  const statusMap = {
    available: '可借',
    borrowed: '已借出',
    maintenance: '维修中',
    retired: '已下架'
  }
  return statusMap[status] || status
}

// 生命周期
onMounted(() => {
  // 如果有预设的用户ID，加载用户信息
  if (props.presetUserId) {
    // 这里可以调用API获取用户详情
  }

  // 如果有预设的图书ID，加载图书信息
  if (props.presetBookId) {
    // 这里可以调用API获取图书详情
  }
})
</script>

<style lang="scss" scoped>
.borrow-form-container {
  max-width: 800px;
  margin: 0 auto;
}

.user-option,
.book-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.user-info {
  display: flex;
  flex-direction: column;

  .user-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .user-email {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-top: 2px;
  }
}

.book-info {
  display: flex;
  flex-direction: column;

  .book-title {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .book-meta {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-top: 2px;
  }
}

.book-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;

  .stock-info {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.user-preview,
.book-preview {
  margin-top: 12px;
}

.user-card,
.book-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-extra-light);
}

.user-details {
  display: flex;
  align-items: center;
  gap: 16px;

  .user-avatar {
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;

    .user-name {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }

    .user-meta {
      color: var(--el-text-color-regular);
      font-size: 14px;
    }
  }

  .user-limits {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    .limits-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 12px;
      color: var(--el-text-color-regular);
      gap: 2px;

      .fine-info {
        color: var(--el-color-danger);
        font-weight: 500;
      }
    }
  }
}

.book-details {
  display: flex;
  align-items: center;
  gap: 16px;

  .book-cover {
    width: 60px;
    height: 84px;
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

  .book-info {
    flex: 1;

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

  .book-availability {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    .availability-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 12px;
      color: var(--el-text-color-regular);
      gap: 2px;
    }
  }
}

.form-help {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.rules-list {
  margin: 0;
  padding-left: 20px;

  li {
    margin-bottom: 4px;
    color: var(--el-text-color-regular);
    line-height: 1.5;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .user-details,
  .book-details {
    flex-direction: column;
    align-items: flex-start;

    .user-limits,
    .book-availability {
      align-self: stretch;
      align-items: flex-start;
    }
  }
}
</style>
