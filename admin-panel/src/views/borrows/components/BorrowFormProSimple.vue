<template>
  <div class="borrow-form-pro-container">
    <ProForm
      ref="proFormRef"
      :fields="formFields"
      :initialValues="initialValues"
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
        reset: {
          text: '取消',
          onClick: () => emit('cancel')
        }
      }"
    />

    <!-- 借阅规则说明 -->
    <div class="borrow-rules-section">
      <el-alert title="借阅规则" type="info" show-icon :closable="false">
        <ul class="rules-list">
          <li>每位用户最多同时借阅 {{ maxBorrowBooks }} 本图书</li>
          <li>默认借阅期限为 {{ defaultBorrowDays }} 天，可自定义 1-90 天</li>
          <li>图书可续借 {{ maxRenewals }} 次，每次延长 {{ renewalDays }} 天</li>
          <li>逾期归还将产生罚金，具体费率请咨询管理员</li>
          <li>有未付罚金的用户暂时无法借阅新图书</li>
        </ul>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ProForm } from '@/components/common'
import { createBorrow, checkBorrowLimits } from '@/api/borrows'
import { getBooks } from '@/api/books'
import { searchUsers as searchUsersAPI } from '@/api/users'
import { formatDate } from '@/utils/date'

// Props
const props = defineProps({
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
const userOptions = ref([])
const bookOptions = ref([])
const selectedUser = ref(null)
const selectedBook = ref(null)
const limits = ref({
  canBorrow: true,
  activeBorrowCount: 0,
  maxBorrowLimit: 5,
  unpaidFines: 0
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

// 搜索用户
const loadUserOptions = async (query) => {
  if (!query || query.length < 2) {
    return []
  }

  try {
    const response = await searchUsersAPI({ q: query, limit: 20 })
    return response.data.map(user => ({
      label: `${user.realName || user.username} (${user.email})`,
      value: user.id,
      user
    }))
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('搜索用户失败')
    return []
  }
}

// 搜索图书
const loadBookOptions = async (query) => {
  if (!query || query.length < 2) {
    return []
  }

  try {
    const response = await getBooks({
      search: query,
      limit: 20,
      status: 'available'
    })
    
    return response.data
      .filter(book => book.status === 'available' && book.availableStock > 0)
      .map(book => ({
        label: `${book.title} - ${book.authors?.join?.(', ') || book.authors}`,
        value: book.id,
        book
      }))
  } catch (error) {
    console.error('搜索图书失败:', error)
    ElMessage.error('搜索图书失败')
    return []
  }
}

// ProForm 字段配置
const formFields = [
  {
    name: 'userId',
    label: '借阅用户',
    valueType: 'select',
    required: true,
    placeholder: '搜索并选择用户（输入姓名、学号或邮箱）',
    options: loadUserOptions,
    fieldProps: {
      filterable: true,
      remote: true,
      clearable: true,
      style: { width: '100%' }
    },
    rules: [
      { required: true, message: '请选择借阅用户', trigger: 'change' }
    ],
    extra: computed(() => selectedUser.value ? 'user-preview' : '')
  },
  {
    name: 'bookId',
    label: '借阅图书',
    valueType: 'select',
    required: true,
    placeholder: '搜索并选择图书（输入书名、作者或ISBN）',
    options: loadBookOptions,
    fieldProps: {
      filterable: true,
      remote: true,
      clearable: true,
      style: { width: '100%' }
    },
    rules: [
      { required: true, message: '请选择借阅图书', trigger: 'change' }
    ],
    extra: computed(() => selectedBook.value ? 'book-preview' : '')
  },
  {
    name: 'borrowDays',
    label: '借阅天数',
    valueType: 'number',
    required: true,
    initialValue: defaultBorrowDays,
    min: 1,
    max: 90,
    step: 1,
    placeholder: '请输入借阅天数',
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
    name: 'dueDateDisplay',
    label: '到期日期',
    valueType: 'text',
    render: (value, formData) => {
      if (!formData.borrowDays) return '-'
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + formData.borrowDays)
      return formatDate(dueDate)
    },
    extra: '根据借阅天数自动计算'
  },
  {
    name: 'borrowNotes',
    label: '借阅备注',
    valueType: 'textarea',
    placeholder: '可选：输入借阅备注信息（如特殊要求、注意事项等）',
    maxLength: 500,
    fieldProps: {
      rows: 3,
      showWordLimit: true
    }
  }
]

// 计算属性
const canSubmit = computed(() => {
  const formData = proFormRef.value?.getValues() || {}
  return (
    formData.userId &&
    formData.bookId &&
    formData.borrowDays >= 1 &&
    formData.borrowDays <= 90 &&
    limits.value.canBorrow &&
    selectedBook.value?.availableStock > 0
  )
})

// 处理用户变化
const handleUserChange = async (userId) => {
  if (!userId) {
    selectedUser.value = null
    limits.value = {
      canBorrow: true,
      activeBorrowCount: 0,
      maxBorrowLimit: 5,
      unpaidFines: 0
    }
    return
  }

  // 从选项中找到选中的用户
  const userOptions = await loadUserOptions('')
  const userOption = userOptions.find(opt => opt.value === userId)
  if (userOption) {
    selectedUser.value = userOption.user
  }

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

// 处理图书变化
const handleBookChange = async (bookId) => {
  if (!bookId) {
    selectedBook.value = null
    return
  }

  // 从选项中找到选中的图书
  const bookOptions = await loadBookOptions('')
  const bookOption = bookOptions.find(opt => opt.value === bookId)
  if (bookOption) {
    selectedBook.value = bookOption.book
  }

  if (selectedBook.value && selectedBook.value.availableStock <= 0) {
    ElMessage.warning('该图书当前无可借库存')
  }
}

// 处理值变化
const handleValuesChange = (changedValues, allValues) => {
  Object.assign(initialValues, allValues)
  
  if (changedValues.userId !== undefined) {
    handleUserChange(changedValues.userId)
  }
  if (changedValues.bookId !== undefined) {
    handleBookChange(changedValues.bookId)
  }
}

// 处理提交
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
  } catch (error) {
    console.error('创建借阅失败:', error)
    ElMessage.error(error.response?.data?.message || '创建借阅失败')
  } finally {
    submitting.value = false
  }
}

// 生命周期
onMounted(() => {
  if (props.presetUserId) {
    handleUserChange(props.presetUserId)
  }
  if (props.presetBookId) {
    handleBookChange(props.presetBookId)
  }
})
</script>

<style lang="scss" scoped>
.borrow-form-pro-container {
  max-width: 800px;
  margin: 0 auto;
}

.user-preview,
.book-preview {
  margin-top: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .user-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;

    .user-name {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .user-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

.book-info {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .book-details {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .book-title {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .book-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

.borrow-rules-section {
  margin-top: 20px;
}

.rules-list {
  margin: 0;
  padding-left: 20px;

  li {
    margin-bottom: 8px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
  }
}
</style>