<template>
  <div class="user-form-page">
    <!-- 错误边界 -->
    <div v-if="hasError" class="error-container">
      <el-result icon="error" title="页面加载失败" :sub-title="errorMessage">
        <template #extra>
          <el-button type="primary" @click="handleRetry">重新加载</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else v-loading="loading" element-loading-text="加载中...">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <el-button @click="goBack" :icon="ArrowLeft" plain>返回</el-button>
          <span class="page-title">{{ isEdit ? '编辑用户' : '新增用户' }}</span>
        </div>
        <div class="header-right">
          <el-button @click="handleReset">重置</el-button>
          <el-button 
            type="primary" 
            @click="handleSave" 
            :loading="saving"
            :icon="Check"
          >
            {{ saving ? '保存中...' : '保存' }}
          </el-button>
          <el-button 
            v-if="!isEdit" 
            type="success" 
            @click="handleSaveAndContinue" 
            :loading="saving"
            :icon="Plus"
          >
            保存并继续
          </el-button>
        </div>
      </div>

      <!-- 表单内容 -->
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="120px"
        class="user-form"
      >
        <!-- 用户信息 -->
        <el-card class="form-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>用户信息</span>
              <el-tag type="danger" size="small" effect="plain">必填</el-tag>
            </div>
          </template>

          <!-- 头像上传 -->
          <el-row :gutter="20" class="avatar-row">
            <el-col :span="24">
              <el-form-item label="用户头像">
                <el-upload
                  ref="avatarUploadRef"
                  class="avatar-uploader"
                  :action="uploadAction"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  :on-error="handleAvatarError"
                  :on-progress="handleAvatarProgress"
                  :before-upload="beforeAvatarUpload"
                  accept="image/*"
                  :disabled="uploading"
                >
                  <img v-if="formData.avatar && !uploading" :src="formData.avatar" class="avatar" />
                  <div v-else-if="uploading" class="uploading">
                    <el-progress type="circle" :percentage="uploadProgress" :width="78" />
                  </div>
                  <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                </el-upload>
                <div class="upload-tips">
                  <p>支持 JPG、PNG 格式，文件大小不超过 2MB</p>
                  <div v-if="formData.avatar" class="avatar-actions">
                    <el-button size="small" type="primary" link @click="previewAvatar">
                      <el-icon><ZoomIn /></el-icon> 预览
                    </el-button>
                    <el-button size="small" type="danger" link @click="removeAvatar">
                      <el-icon><Delete /></el-icon> 删除
                    </el-button>
                  </div>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 基本信息 -->
          <el-divider content-position="left">
            <el-icon><User /></el-icon>
            <span style="margin-left: 8px;">基本信息</span>
          </el-divider>

          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="用户名" prop="username">
                <el-input 
                  v-model="formData.username" 
                  placeholder="请输入用户名"
                  :disabled="isEdit"
                  clearable
                  maxlength="30"
                  show-word-limit
                >
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="真实姓名" prop="realName">
                <el-input 
                  v-model="formData.realName" 
                  placeholder="请输入真实姓名"
                  clearable
                  maxlength="50"
                >
                  <template #prefix>
                    <el-icon><Avatar /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="邮箱地址" prop="email">
                <el-input 
                  v-model="formData.email" 
                  placeholder="请输入邮箱地址"
                  type="email"
                  clearable
                  maxlength="100"
                >
                  <template #prefix>
                    <el-icon><Message /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="手机号码" prop="phone">
                <el-input 
                  v-model="formData.phone" 
                  placeholder="请输入手机号码"
                  clearable
                  maxlength="20"
                >
                  <template #prefix>
                    <el-icon><Phone /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="性别" prop="gender">
                <el-select v-model="formData.gender" placeholder="请选择性别" clearable style="width: 100%">
                  <el-option label="男" value="male">
                    <el-icon><Male /></el-icon> 男
                  </el-option>
                  <el-option label="女" value="female">
                    <el-icon><Female /></el-icon> 女
                  </el-option>
                  <el-option label="其他" value="other">
                    <el-icon><User /></el-icon> 其他
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="生日" prop="birthday">
                <el-date-picker
                  v-model="formData.birthday"
                  type="date"
                  placeholder="请选择生日"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :disabled-date="disabledDate"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 密码字段（仅新增模式） -->
          <el-row v-if="!isEdit" :gutter="16">
            <el-col :span="6">
              <el-form-item label="登录密码" prop="password">
                <el-input
                  v-model="formData.password"
                  type="password"
                  placeholder="请输入登录密码"
                  show-password
                  clearable
                  maxlength="128"
                >
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
                <!-- 密码强度 -->
                <div v-if="formData.password" class="password-strength">
                  <div class="strength-bar">
                    <div 
                      class="strength-fill" 
                      :class="`strength-${passwordStrength.level}`"
                      :style="{ width: passwordStrength.percentage + '%' }"
                    ></div>
                  </div>
                  <span class="strength-text">强度：{{ passwordStrength.text }}</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="formData.confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  show-password
                  clearable
                  maxlength="128"
                >
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 其他信息 -->
          <el-divider content-position="left">
            <el-icon><InfoFilled /></el-icon>
            <span style="margin-left: 8px;">其他信息</span>
          </el-divider>

          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="学号/工号" prop="studentId">
                <el-input 
                  v-model="formData.studentId" 
                  placeholder="请输入学号或工号"
                  clearable
                  maxlength="50"
                >
                  <template #prefix>
                    <el-icon><Postcard /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="院系/部门" prop="department">
                <el-input 
                  v-model="formData.department" 
                  placeholder="请输入院系或部门"
                  clearable
                  maxlength="100"
                >
                  <template #prefix>
                    <el-icon><OfficeBuilding /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="个人简介" prop="bio">
                <el-input
                  v-model="formData.bio"
                  type="textarea"
                  :rows="3"
                  placeholder="简单介绍一下自己..."
                  maxlength="500"
                  show-word-limit
                  resize="none"
                />
              </el-form-item>
            </el-col>
          </el-row>

        </el-card>

        <!-- 角色权限 -->
        <el-card class="form-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span>角色权限</span>
            </div>
          </template>

          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="系统角色" prop="role">
                <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
                  <el-option label="普通用户" value="user">
                    <div class="role-option">
                      <el-icon class="role-icon user-role"><User /></el-icon>
                      <div>
                        <div>普通用户</div>
                        <div class="role-desc">基本借阅权限</div>
                      </div>
                    </div>
                  </el-option>
                  <el-option label="图书管理员" value="librarian">
                    <div class="role-option">
                      <el-icon class="role-icon librarian-role"><Reading /></el-icon>
                      <div>
                        <div>图书管理员</div>
                        <div class="role-desc">管理图书和借阅</div>
                      </div>
                    </div>
                  </el-option>
                  <el-option label="管理员" value="admin">
                    <div class="role-option">
                      <el-icon class="role-icon admin-role"><UserFilled /></el-icon>
                      <div>
                        <div>管理员</div>
                        <div class="role-desc">全部系统权限</div>
                      </div>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="账户状态" prop="status">
                <el-radio-group v-model="formData.status">
                  <el-radio value="active">
                    <el-icon color="#67c23a"><CircleCheck /></el-icon> 启用
                  </el-radio>
                  <el-radio value="inactive">
                    <el-icon color="#f56c6c"><CircleClose /></el-icon> 禁用
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="借阅上限" prop="borrowLimit">
                <InputNumber
                  v-model="formData.borrowLimit"
                  :min="1"
                  :max="50"
                  :controls="false"
                  unit="本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="!isEdit" :span="6">
              <el-form-item label="初始积分" prop="pointsBalance">
                <InputNumber
                  v-model="formData.pointsBalance"
                  :min="0"
                  :max="10000"
                  :step="10"
                  :controls="false"
                  unit="分"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="借阅权限" prop="borrowPermission">
                <el-checkbox-group v-model="formData.borrowPermission">
                  <el-checkbox value="borrow">
                    <el-icon><Reading /></el-icon> 借阅图书
                  </el-checkbox>
                  <el-checkbox value="renew">
                    <el-icon><Refresh /></el-icon> 续借图书
                  </el-checkbox>
                  <el-checkbox value="reserve">
                    <el-icon><Clock /></el-icon> 预约图书
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

      </el-form>
    </div>

    <!-- 头像预览对话框 -->
    <el-dialog v-model="showAvatarPreview" title="头像预览" width="400px">
      <div class="avatar-preview-container">
        <img :src="formData.avatar" class="avatar-preview-large" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  CircleCheck, 
  CircleClose, 
  ArrowLeft, 
  Check, 
  Plus, 
  User, 
  Edit, 
  Star,
  UploadFilled,
  ZoomIn,
  Delete,
  QuestionFilled,
  Male,
  Female,
  Calendar,
  UserFilled,
  Reading,
  Postcard,
  OfficeBuilding,
  Setting,
  Minus,
  Clock,
  Refresh,
  Message,
  Phone,
  Lock,
  Avatar,
  InfoFilled
} from '@element-plus/icons-vue'
import { userApi } from '@/api/user'
import { createValidationRules } from '@/utils/validators'
import { useAuthStore } from '@/stores/auth'
import InputNumber from '@/components/InputNumber.vue'

const route = useRoute()
const router = useRouter()
let authStore = null

// 错误处理
const hasError = ref(false)
const errorMessage = ref('')

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const showAvatarPreview = ref(false)
const formRef = ref()
const avatarUploadRef = ref()

// 上传状态
const uploading = ref(false)
const uploadProgress = ref(0)

// 安全初始化
try {
  authStore = useAuthStore()
  console.log('Auth store initialized successfully')
} catch (error) {
  console.error('Auth store initialization failed:', error)
  hasError.value = true
  errorMessage.value = '认证系统初始化失败'
}

// 计算属性
const isEdit = computed(() => !!route.params.id)
const userId = computed(() => route.params.id)

// 上传配置
const uploadAction = ref('/api/upload/avatar')
const uploadHeaders = computed(() => {
  try {
    return authStore && authStore.token
      ? { Authorization: `Bearer ${authStore.token}` }
      : {}
  } catch (error) {
    console.error('Failed to get auth headers:', error)
    return {}
  }
})

// 表单数据
const formData = reactive({
  username: '',
  realName: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  gender: '',
  birthday: '',
  role: 'user',
  studentId: '',
  department: '',
  bio: '',
  avatar: '',
  status: 'active',
  pointsBalance: 0,
  borrowPermission: ['borrow', 'renew', 'reserve'],
  borrowLimit: 10
})

// 表单验证规则
const formRules = computed(() => {
  try {
    const baseRules = {
      username: [createValidationRules.required('请输入用户名'), createValidationRules.username()],
      realName: [
        createValidationRules.required('请输入真实姓名'),
        createValidationRules.length(2, 50, '真实姓名长度为2-50个字符')
      ],
      email: [createValidationRules.email()],
      phone: [createValidationRules.phone()],
      role: [createValidationRules.required('请选择角色')],
      borrowLimit: [createValidationRules.numberRange(1, 50, '借阅上限必须在1-50之间')]
    }

    // 根据模式设置密码验证规则
    if (!isEdit.value) {
      baseRules.password = [createValidationRules.required('请输入密码'), createValidationRules.password()]
      baseRules.confirmPassword = [
        {
          validator: (rule, value, callback) => {
            if (!value) {
              callback(new Error('请再次输入密码'))
            } else if (value !== formData.password) {
              callback(new Error('两次输入的密码不一致'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ]
    }

    return baseRules
  } catch (error) {
    console.error('Failed to create validation rules:', error)
    return {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
      role: [{ required: true, message: '请选择角色', trigger: 'blur' }]
    }
  }
})

// 密码强度检测
const passwordStrength = computed(() => {
  const password = formData.password
  if (!password) return { level: 'weak', percentage: 0, text: '' }
  
  let score = 0
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[^\w\s]/.test(password)
  }
  
  score = Object.values(checks).filter(Boolean).length
  
  if (score <= 2) {
    return { level: 'weak', percentage: 25, text: '弱' }
  } else if (score === 3) {
    return { level: 'medium', percentage: 50, text: '中等' }
  } else if (score === 4) {
    return { level: 'good', percentage: 75, text: '较强' }
  } else {
    return { level: 'strong', percentage: 100, text: '强' }
  }
})

// 日期限制
const disabledDate = (time) => {
  return time.getTime() > Date.now()
}

// 方法
const fetchUserData = async () => {
  if (!isEdit.value) return

  try {
    loading.value = true
    const { data } = await userApi.getUserDetail(userId.value)

    if (data) {
      const userData = data.user || data
      Object.keys(formData).forEach(key => {
        if (userData[key] !== undefined) {
          formData[key] = userData[key]
        }
      })

      if (userData.borrowPermission) {
        formData.borrowPermission = Array.isArray(userData.borrowPermission) 
          ? userData.borrowPermission 
          : []
      }
    }
  } catch (error) {
    console.error('获取用户数据失败:', error)
    ElMessage.error(error.response?.data?.message || '获取用户数据失败')
    setTimeout(() => goBack(), 2000)
  } finally {
    loading.value = false
  }
}

const validateForm = async () => {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    ElMessage.warning('请检查表单填写是否正确')
    return false
  }
}

const handleSave = async () => {
  if (hasError.value) {
    ElMessage.error('页面状态异常，请刷新后重试')
    return
  }

  const isValid = await validateForm()
  if (!isValid) return

  try {
    saving.value = true
    const userData = { ...formData }
    delete userData.confirmPassword

    if (isEdit.value && !userData.password) {
      delete userData.password
    }

    if (isEdit.value) {
      await userApi.updateUser(userId.value, userData)
      ElMessage.success('用户更新成功')
    } else {
      await userApi.createUser(userData)
      ElMessage.success('用户创建成功')
    }

    goBack()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.message || '保存用户失败')
  } finally {
    saving.value = false
  }
}

const handleSaveAndContinue = async () => {
  const isValid = await validateForm()
  if (!isValid) return

  try {
    saving.value = true
    const userData = { ...formData }
    delete userData.confirmPassword

    await userApi.createUser(userData)
    ElMessage.success('用户创建成功')
    handleReset()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.message || '保存用户失败')
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  Object.assign(formData, {
    username: '',
    realName: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    gender: '',
    birthday: '',
    role: 'user',
    studentId: '',
    department: '',
    bio: '',
    avatar: '',
    status: 'active',
    pointsBalance: 0,
    borrowPermission: ['borrow', 'renew', 'reserve'],
    borrowLimit: 10
  })
  formRef.value?.clearValidate()
}

const goBack = () => {
  try {
    router.go(-1)
  } catch (error) {
    router.push('/system/users')
  }
}

const handleRetry = () => {
  hasError.value = false
  errorMessage.value = ''
  try {
    authStore = useAuthStore()
    if (isEdit.value) {
      fetchUserData()
    }
  } catch (error) {
    hasError.value = true
    errorMessage.value = '重新加载失败，请刷新整个页面'
  }
}

// 头像上传相关
const beforeAvatarUpload = file => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('上传文件必须是图片格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleAvatarProgress = (event) => {
  uploading.value = true
  uploadProgress.value = Math.round(event.percent)
}

const handleAvatarSuccess = response => {
  uploading.value = false
  uploadProgress.value = 0
  
  if (response.success) {
    formData.avatar = response.data.url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error(response.message || '头像上传失败')
  }
}

const handleAvatarError = error => {
  uploading.value = false
  uploadProgress.value = 0
  ElMessage.error('头像上传失败')
}

const previewAvatar = () => {
  showAvatarPreview.value = true
}

const removeAvatar = () => {
  formData.avatar = ''
  ElMessage.success('头像已删除')
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    try {
      if (isEdit.value && userId.value) {
        fetchUserData()
      }
    } catch (error) {
      hasError.value = true
      errorMessage.value = '页面初始化失败: ' + error.message
    }
  })
})
</script>

<style lang="scss" scoped>
.user-form-page {
  background-color: var(--el-bg-color-page);
}

.error-container {
  padding: 40px 20px;
  text-align: center;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.user-form {
  .form-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;

      .el-tag {
        margin-left: auto;
      }
    }
  }

  .avatar-row {
    margin-bottom: 20px;
  }

  .avatar-uploader {
    display: block;

    :deep(.el-upload) {
      border: 2px dashed var(--el-border-color);
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    .avatar {
      width: 80px;
      height: 80px;
      object-fit: cover;
      display: block;
    }

    .uploading {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-uploader-icon {
      font-size: 28px;
      color: var(--el-text-color-placeholder);
      width: 80px;
      height: 80px;
      text-align: center;
      line-height: 80px;
    }
  }

  .upload-tips {
    margin-left: 20px;

    p {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }

    .avatar-actions {
      display: flex;
      gap: 8px;
    }
  }

  .role-option {
    display: flex;
    align-items: center;
    gap: 8px;

    .role-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;

      &.user-role {
        background: var(--el-color-info-light-8);
        color: var(--el-color-info);
      }

      &.librarian-role {
        background: var(--el-color-warning-light-8);
        color: var(--el-color-warning);
      }

      &.admin-role {
        background: var(--el-color-danger-light-8);
        color: var(--el-color-danger);
      }
    }

    .role-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }


  .password-strength {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;

    .strength-bar {
      flex: 1;
      height: 4px;
      background: var(--el-fill-color-light);
      border-radius: 2px;
      overflow: hidden;

      .strength-fill {
        height: 100%;
        transition: all 0.3s ease;

        &.strength-weak {
          background: var(--el-color-danger);
        }

        &.strength-medium {
          background: var(--el-color-warning);
        }

        &.strength-good {
          background: var(--el-color-primary);
        }

        &.strength-strong {
          background: var(--el-color-success);
        }
      }
    }

    .strength-text {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }

  // 分割线样式
  :deep(.el-divider) {
    margin: 20px 0 20px 0;

    .el-divider__text {
      display: flex;
      align-items: center;
      font-weight: 500;
      color: var(--el-text-color-primary);
      background: white;
      padding: 0 16px;
    }
  }
}

.avatar-preview-container {
  text-align: center;

  .avatar-preview-large {
    max-width: 100%;
    max-height: 400px;
    border-radius: 8px;
  }
}

</style>