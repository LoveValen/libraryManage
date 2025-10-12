<template>
  <div class="borrow-form">
    <!-- 图书信息 -->
    <div class="book-info">
      <div class="book-cover">
        <img :src="book.cover" :alt="book.title" />
      </div>
      <div class="book-details">
        <h3 class="book-title">{{ book.title }}</h3>
        <p class="book-author">作者：{{ book.author }}</p>
        <p class="book-isbn">ISBN：{{ book.isbn }}</p>
        <div class="book-status">
          <el-tag :type="getStatusTagType(book.status)" size="small">
            {{ getStatusText(book.status) }}
          </el-tag>
          <span class="stock-info">库存：{{ book.stock || 0 }}本 | 可借：{{ book.availableStock || 0 }}本</span>
        </div>
      </div>
    </div>

    <!-- 借阅表单 -->
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" class="borrow-form-content">
      <el-form-item label="借阅用户" prop="userId" required>
        <el-select
          v-model="formData.userId"
          placeholder="搜索并选择用户"
          filterable
          remote
          :remote-method="searchUsers"
          :loading="searchingUsers"
          style="width: 100%"
          @change="handleUserChange"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.id"
            :label="`${user.realName} (${user.username})`"
            :value="user.id"
          >
            <div class="user-option">
              <div class="user-info">
                <span class="user-name">{{ user.realName }}</span>
                <span class="user-username">({{ user.username }})</span>
              </div>
              <div class="user-meta">
                <el-tag size="small" :type="getUserRoleType(user.role)">
                  {{ getUserRoleText(user.role) }}
                </el-tag>
              </div>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 选中用户信息 -->
      <div v-if="selectedUser" class="selected-user-info">
        <el-card shadow="never" class="user-card">
          <div class="user-header">
            <el-avatar :src="selectedUser.avatar" :size="40">
              {{ selectedUser.realName?.charAt(0) }}
            </el-avatar>
            <div class="user-details">
              <div class="user-name">{{ selectedUser.realName }}</div>
              <div class="user-stats">
                <span>当前借阅：{{ selectedUser.currentBorrowCount || 0 }}本</span>
                <span>借阅限额：{{ selectedUser.borrowLimit || 5 }}本</span>
                <span>积分：{{ selectedUser.points?.balance || selectedUser.pointsBalance || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- 借阅权限检查 -->
          <div v-if="borrowCheckResult" class="borrow-check">
            <el-alert
              :type="borrowCheckResult.canBorrow ? 'success' : 'error'"
              :title="borrowCheckResult.message"
              :description="borrowCheckResult.description"
              show-icon
              :closable="false"
            />
          </div>
        </el-card>
      </div>

      <el-form-item label="借阅天数" prop="borrowDays" required>
        <el-select v-model="formData.borrowDays" style="width: 200px">
          <el-option label="7天" :value="7" />
          <el-option label="14天" :value="14" />
          <el-option label="21天" :value="21" />
          <el-option label="30天" :value="30" />
          <el-option label="60天" :value="60" />
          <el-option label="90天" :value="90" />
        </el-select>
        <span class="due-date-info">到期时间：{{ calculateDueDate(formData.borrowDays) }}</span>
      </el-form-item>

      <el-form-item label="借阅方式" prop="borrowType">
        <el-radio-group v-model="formData.borrowType">
          <el-radio value="normal">普通借阅</el-radio>
          <el-radio value="reservation">预约借阅</el-radio>
          <el-radio value="urgent">加急借阅</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="取书方式" prop="pickupMethod">
        <el-radio-group v-model="formData.pickupMethod">
          <el-radio value="self">自取</el-radio>
          <el-radio value="delivery">送书上门</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="formData.pickupMethod === 'delivery'" label="送书地址" prop="deliveryAddress">
        <el-input v-model="formData.deliveryAddress" placeholder="请输入详细地址" type="textarea" :rows="2" />
      </el-form-item>

      <el-form-item label="备注信息" prop="notes">
        <el-input
          v-model="formData.notes"
          placeholder="可填写特殊要求或备注信息"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 借阅条款 -->
      <el-form-item>
        <el-checkbox v-model="agreedToTerms">
          我已阅读并同意
          <el-link type="primary" @click="showTerms = true">《图书借阅条款》</el-link>
        </el-checkbox>
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting" :disabled="!canSubmit">确认借阅</el-button>
    </div>

    <!-- 借阅条款对话框 -->
    <el-dialog v-model="showTerms" title="图书借阅条款" width="600px">
      <div class="terms-content">
        <h4>借阅规则</h4>
        <ol>
          <li>每位用户最多可同时借阅5本图书</li>
          <li>普通图书借阅期限为30天，可续借一次</li>
          <li>热门图书借阅期限为14天，不可续借</li>
          <li>逾期归还将产生滞纳金，每天每本0.1元</li>
        </ol>

        <h4>借阅者责任</h4>
        <ol>
          <li>爱护图书，不得污损、撕毁或遗失</li>
          <li>按期归还，如需续借请提前申请</li>
          <li>不得将图书转借他人</li>
          <li>如有损坏或遗失，需按原价赔偿</li>
        </ol>

        <h4>违约处理</h4>
        <ol>
          <li>逾期超过30天将暂停借阅权限</li>
          <li>损坏图书需承担修复或赔偿责任</li>
          <li>恶意损坏图书将被永久取消借阅资格</li>
        </ol>
      </div>

      <template #footer>
        <el-button type="primary" @click="showTerms = false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api/user'
import { borrowApi } from '@/api/borrows'
import { formatDate, addDays } from '@/utils/date'

// Props
const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

// 事件定义
const emit = defineEmits(['success', 'cancel'])

// 响应式数据
const formRef = ref()
const submitting = ref(false)
const searchingUsers = ref(false)
const userOptions = ref([])
const selectedUser = ref(null)
const borrowCheckResult = ref(null)
const agreedToTerms = ref(false)
const showTerms = ref(false)

// 表单数据
const formData = reactive({
  userId: null,
  borrowDays: 30,
  borrowType: 'normal',
  pickupMethod: 'self',
  deliveryAddress: '',
  notes: ''
})

// 表单验证规则
const formRules = {
  userId: [{ required: true, message: '请选择借阅用户', trigger: 'change' }],
  borrowDays: [{ required: true, message: '请选择借阅天数', trigger: 'change' }],
  deliveryAddress: [{ required: true, message: '请输入送书地址', trigger: 'blur' }]
}

// 计算属性
const canSubmit = computed(() => {
  return (
    formData.userId &&
    formData.borrowDays &&
    agreedToTerms.value &&
    borrowCheckResult.value?.canBorrow &&
    !submitting.value
  )
})

// 方法
const getStatusText = status => {
  const statusMap = {
    available: '可借',
    borrowed: '已借出',
    maintenance: '维修中',
    offline: '已下架'
  }
  return statusMap[status] || status
}

const getStatusTagType = status => {
  const typeMap = {
    available: 'success',
    borrowed: 'warning',
    maintenance: 'info',
    offline: 'danger'
  }
  return typeMap[status] || 'info'
}

const getUserRoleText = role => {
  const roleMap = {
    student: '学生',
    teacher: '教师',
    staff: '职工',
    admin: '管理员'
  }
  return roleMap[role] || role
}

const getUserRoleType = role => {
  const typeMap = {
    student: 'primary',
    teacher: 'success',
    staff: 'warning',
    admin: 'danger'
  }
  return typeMap[role] || 'info'
}

const calculateDueDate = days => {
  if (!days) return ''
  const dueDate = addDays(new Date(), days)
  return formatDate(dueDate)
}

const searchUsers = async query => {
  if (!query) return

  try {
    searchingUsers.value = true
    const response = await userApi.searchUsers(query, 20)
    userOptions.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('搜索用户失败')
  } finally {
    searchingUsers.value = false
  }
}

const handleUserChange = async userId => {
  if (!userId) {
    selectedUser.value = null
    borrowCheckResult.value = null
    return
  }

  try {
    // 获取用户详情
    const { data: userDetail } = await userApi.getUserDetail(userId)
    selectedUser.value = userDetail

    // 检查借阅权限
    await checkBorrowPermission(userId)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败')
  }
}

const checkBorrowPermission = async userId => {
  try {
    const resp = await borrowApi.checkBorrowPermission({
      userId,
      bookId: props.book.id
    })
    // 适配后端 /borrows/limits/:userId 返回结构，构造表单所需的检查结果
    const limits = resp.data?.limits || resp.limits || {}
    const canBorrowByLimits = !!limits.canBorrow
    const bookAvailable = (props.book.availableStock || 0) > 0
    const canBorrow = canBorrowByLimits && bookAvailable

    borrowCheckResult.value = {
      canBorrow,
      message: canBorrow ? '可借阅' : '不可借阅',
      description: canBorrow
        ? `剩余额度：${limits.availableSlots ?? '-'} 本`
        : (limits.reason ? `原因：${limits.reason}` : (bookAvailable ? '达到借阅上限或存在未付罚金' : '图书无可借库存'))
    }
  } catch (error) {
    console.error('检查借阅权限失败:', error)
    borrowCheckResult.value = {
      canBorrow: false,
      message: '权限检查失败',
      description: '无法验证用户借阅权限，请稍后重试'
    }
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    if (!borrowCheckResult.value?.canBorrow) {
      ElMessage.error('当前用户不能借阅此图书')
      return
    }

    submitting.value = true

    const borrowData = {
      userId: formData.userId,
      bookId: props.book.id,
      borrowDays: formData.borrowDays,
      borrowType: formData.borrowType,
      pickupMethod: formData.pickupMethod,
      deliveryAddress: formData.deliveryAddress,
      notes: formData.notes
    }

    await borrowApi.createBorrow(borrowData)

    ElMessage.success('借阅申请提交成功')
    emit('success')
  } catch (error) {
    if (error !== false) {
      // 表单验证失败时error为false
      console.error('借阅失败:', error)
      ElMessage.error('借阅失败：' + (error.message || '未知错误'))
    }
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// 监听器
watch(
  () => formData.pickupMethod,
  newValue => {
    if (newValue !== 'delivery') {
      formData.deliveryAddress = ''
    }
  }
)
</script>

<style lang="scss" scoped>
.borrow-form {
  .book-info {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

    .book-cover {
      flex-shrink: 0;

      img {
        width: 80px;
        height: 112px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid var(--el-border-color-light);
      }
    }

    .book-details {
      flex: 1;

      .book-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        line-height: 1.4;
      }

      .book-author,
      .book-isbn {
        margin: 0 0 8px 0;
        color: var(--el-text-color-regular);
        font-size: 14px;
      }

      .book-status {
        display: flex;
        align-items: center;
        gap: 12px;

        .stock-info {
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .selected-user-info {
    margin-bottom: 20px;

    .user-card {
      :deep(.el-card__body) {
        padding: 16px;
      }

      .user-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        .user-details {
          flex: 1;

          .user-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
          }

          .user-stats {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: var(--el-text-color-secondary);
          }
        }
      }

      .borrow-check {
        :deep(.el-alert) {
          margin: 0;
        }
      }
    }
  }

  .borrow-form-content {
    .due-date-info {
      margin-left: 12px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.user-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .user-info {
    .user-name {
      font-weight: 500;
    }

    .user-username {
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }
}

.terms-content {
  max-height: 400px;
  overflow-y: auto;

  h4 {
    color: var(--el-text-color-primary);
    margin: 16px 0 8px 0;

    &:first-child {
      margin-top: 0;
    }
  }

  ol {
    margin: 0 0 16px 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
      line-height: 1.5;
      color: var(--el-text-color-regular);
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .borrow-form {
    .book-info {
      flex-direction: column;
      align-items: center;
      text-align: center;

      .book-cover {
        align-self: center;
      }
    }

    .selected-user-info {
      .user-header {
        flex-direction: column;
        text-align: center;

        .user-stats {
          flex-direction: column;
          gap: 4px;
        }
      }
    }

    .form-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
