<template>
  <div class="borrow-form-container">
    <ProForm
      ref="proFormRef"
      :fields="formFields"
      :initialValues="initialValues"
      :groups="formGroups"
      label-width="120px"
      @submit="handleSubmit"
      @values-change="handleValuesChange"
      :loading="submitting"
      :actions="{
        submit: {
          text: submitting ? '创建中...' : '创建借阅',
          disabled: !canSubmit,
          loading: submitting
        },
        reset: false
      }"
    >
      <!-- 用户信息预览插槽 -->
      <template #userPreview="{ formData }">
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
      </template>

      <!-- 图书信息预览插槽 -->
      <template #bookPreview="{ formData }">
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
      </template>

      <!-- 到期日期预览插槽 -->
      <template #dueDatePreview="{ formData }">
        <div class="due-date-preview">
          <el-tag type="info" size="large">
            {{ calculateDueDate(formData.borrowDays) }}
          </el-tag>
          <span class="form-help">根据借阅天数自动计算</span>
        </div>
      </template>

      <!-- 借阅规则说明插槽 -->
      <template #borrowRules="{ formData }">
        <el-alert title="借阅规则" type="info" show-icon :closable="false">
          <ul class="rules-list">
            <li>每位用户最多同时借阅 {{ maxBorrowBooks }} 本图书</li>
            <li>默认借阅期限为 {{ defaultBorrowDays }} 天，可自定义 1-90 天</li>
            <li>图书可续借 {{ maxRenewals }} 次，每次延长 {{ renewalDays }} 天</li>
            <li>逾期归还将产生罚金，具体费率请咨询管理员</li>
            <li>有未付罚金的用户暂时无法借阅新图书</li>
          </ul>
        </el-alert>
      </template>
    </ProForm>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Reading } from '@element-plus/icons-vue'
import { ProForm } from '@/components/common'
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
const proFormRef = ref()
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

// 初始值
const initialValues = reactive({
  userId: props.presetUserId || undefined,
  bookId: props.presetBookId || undefined,
  borrowDays: defaultBorrowDays,
  borrowNotes: ''
})

// ProForm 字段配置
const formFields = [
  {
    name: 'userId',
    label: '借阅用户',
    valueType: 'select',
    required: true,
    placeholder: '搜索并选择用户',
    fieldProps: {
      filterable: true,
      remote: true,
      reserveKeyword: true,
      remoteMethod: searchUsers,
      loading: userLoading,
      clearable: true,
      style: { width: '100%' }
    },
    options: () => userOptions.value.map(user => ({
      label: `${user.realName || user.username} (${user.email})`,
      value: user.id,
      user: user  // 保存用户信息用于渲染
    })),
    rules: [
      { required: true, message: '请选择借阅用户', trigger: 'change' }
    ],
    renderFormItem: (field, formData) => {
      return (
        <>
          <el-select
            v-model={formData.userId}
            placeholder="搜索并选择用户"
            filterable
            remote
            reserveKeyword
            remoteMethod={searchUsers}
            loading={userLoading.value}
            clearable
            style={{ width: '100%' }}
            onChange={handleUserChange}
          >
            {userOptions.value.map(user => (
              <el-option
                key={user.id}
                label={`${user.realName || user.username} (${user.email})`}
                value={user.id}
              >
                <div class="user-option">
                  <div class="user-info">
                    <span class="user-name">{user.realName || user.username}</span>
                    <span class="user-email">{user.email}</span>
                  </div>
                  <el-tag type={getUserStatusType(user.status)} size="small">
                    {getUserStatusText(user.status)}
                  </el-tag>
                </div>
              </el-option>
            ))}
          </el-select>
        </>
      )
    }
  },
  {
    name: 'userPreview',
    label: '',
    valueType: 'custom',
    renderFormItem: () => null,
    slot: 'userPreview',
    when: (formData) => !!formData.userId && !!selectedUser.value
  },
  {
    name: 'bookId',
    label: '借阅图书',
    valueType: 'select',
    required: true,
    placeholder: '搜索并选择图书',
    fieldProps: {
      filterable: true,
      remote: true,
      reserveKeyword: true,
      remoteMethod: searchBooks,
      loading: bookLoading,
      clearable: true,
      style: { width: '100%' }
    },
    options: () => bookOptions.value.map(book => ({
      label: `${book.title} - ${book.authors?.join?.(', ') || book.authors}`,
      value: book.id,
      disabled: !book.isAvailable,
      book: book
    })),
    rules: [
      { required: true, message: '请选择借阅图书', trigger: 'change' }
    ],
    renderFormItem: (field, formData) => {
      return (
        <el-select
          v-model={formData.bookId}
          placeholder="搜索并选择图书"
          filterable
          remote
          reserveKeyword
          remoteMethod={searchBooks}
          loading={bookLoading.value}
          clearable
          style={{ width: '100%' }}
          onChange={handleBookChange}
        >
          {bookOptions.value.map(book => (
            <el-option
              key={book.id}
              label={`${book.title} - ${book.authors?.join?.(', ') || book.authors}`}
              value={book.id}
              disabled={!book.isAvailable}
            >
              <div class="book-option">
                <div class="book-info">
                  <span class="book-title">{book.title}</span>
                  <span class="book-meta">{book.authors?.join?.(', ') || book.authors} - {book.isbn}</span>
                </div>
                <div class="book-status">
                  <el-tag type={getBookStatusType(book.status)} size="small">
                    {getBookStatusText(book.status)}
                  </el-tag>
                  <span class="stock-info">库存: {book.availableStock}/{book.totalStock}</span>
                </div>
              </div>
            </el-option>
          ))}
        </el-select>
      )
    }
  },
  {
    name: 'bookPreview',
    label: '',
    valueType: 'custom',
    renderFormItem: () => null,
    slot: 'bookPreview',
    when: (formData) => !!formData.bookId && !!selectedBook.value
  },
  {
    name: 'borrowDays',
    label: '借阅天数',
    valueType: 'number',
    required: true,
    min: 1,
    max: 90,
    step: 1,
    placeholder: '借阅天数',
    fieldProps: {
      style: { width: '200px' }
    },
    extra: `默认 ${defaultBorrowDays} 天，最多 90 天`,
    rules: [
      { required: true, message: '请输入借阅天数', trigger: 'blur' },
      { type: 'number', min: 1, max: 90, message: '借阅天数应在1-90天之间', trigger: 'blur' }
    ]
  },
  {
    name: 'dueDatePreview',
    label: '到期日期',
    valueType: 'custom',
    renderFormItem: () => null,
    slot: 'dueDatePreview'
  },
  {
    name: 'borrowNotes',
    label: '借阅备注',
    valueType: 'textarea',
    placeholder: '可选：输入借阅备注信息',
    maxLength: 500,
    fieldProps: {
      rows: 3,
      showWordLimit: true
    }
  },
  {
    name: 'borrowRules',
    label: '',
    valueType: 'custom',
    renderFormItem: () => null,
    slot: 'borrowRules'
  }
]

// 表单分组（可选）
const formGroups = [
  {
    key: 'basic',
    title: '基本信息',
    description: '选择借阅用户和图书'
  },
  {
    key: 'settings',
    title: '借阅设置',
    description: '设置借阅天数和备注'
  }
]

// 计算属性
const canSubmit = computed(() => {
  return (
    initialValues.userId &&
    initialValues.bookId &&
    initialValues.borrowDays >= 1 &&
    initialValues.borrowDays <= 90 &&
    limits.value.canBorrow &&
    selectedBook.value?.availableStock > 0
  )
})

// 方法
const searchUsers = async (query) => {
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

const searchBooks = async (query) => {
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

const handleUserChange = async (userId) => {
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

const handleBookChange = (bookId) => {
  if (!bookId) {
    selectedBook.value = null
    return
  }

  selectedBook.value = bookOptions.value.find(book => book.id === bookId)

  if (selectedBook.value && selectedBook.value.availableStock <= 0) {
    ElMessage.warning('该图书当前无可借库存')
  }
}

const calculateDueDate = (borrowDays) => {
  if (!borrowDays) return '-'

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + borrowDays)
  return formatDate(dueDate)
}

const handleValuesChange = (changedValues, allValues) => {
  // 同步到 initialValues 以便响应式更新
  Object.assign(initialValues, allValues)
  
  // 处理字段变化
  if (changedValues.userId !== undefined) {
    handleUserChange(changedValues.userId)
  }
  if (changedValues.bookId !== undefined) {
    handleBookChange(changedValues.bookId)
  }
}

const handleSubmit = async (formData) => {
  if (!canSubmit.value) {
    ElMessage.warning('请检查表单信息或用户借阅资格')
    return
  }

  submitting.value = true

  try {
    const borrowData = {
      userId: formData.userId,
      bookId: formData.bookId,
      borrowDays: formData.borrowDays,
      borrowNotes: formData.borrowNotes || undefined
    }

    await createBorrow(borrowData)

    ElMessage.success('借阅记录创建成功')
    emit('success')

    // 重置表单
    proFormRef.value?.reset()
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

// 工具函数
const getUserStatusType = (status) => {
  const statusMap = {
    active: 'success',
    inactive: 'info',
    suspended: 'warning',
    banned: 'danger'
  }
  return statusMap[status] || 'info'
}

const getUserStatusText = (status) => {
  const statusMap = {
    active: '正常',
    inactive: '未激活',
    suspended: '暂停',
    banned: '禁用'
  }
  return statusMap[status] || status
}

const getBookStatusType = (status) => {
  const statusMap = {
    available: 'success',
    borrowed: 'warning',
    maintenance: 'info',
    retired: 'danger'
  }
  return statusMap[status] || 'info'
}

const getBookStatusText = (status) => {
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
    handleUserChange(props.presetUserId)
  }

  // 如果有预设的图书ID，加载图书信息
  if (props.presetBookId) {
    handleBookChange(props.presetBookId)
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

.due-date-preview {
  display: flex;
  align-items: center;
  gap: 12px;
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