<template>
  <div class="user-form-container">
    <!-- 错误边界 -->
    <div v-if="hasError" class="error-boundary">
      <el-result icon="error" title="页面加载失败" sub-title="抱歉，页面出现了一些问题，请刷新页面重试">
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
          <el-button @click="goBack" class="back-button">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <div class="header-info">
            <h1 class="page-title">{{ isEdit ? '编辑用户' : '新增用户' }}</h1>
            <p class="page-description">
              {{ isEdit ? '修改用户的基本信息和权限设置' : '创建新的系统用户' }}
            </p>
          </div>
        </div>
        <div class="header-actions">
          <el-button @click="handleSave" type="primary" :loading="saving">
            <el-icon><Check /></el-icon>
            {{ saving ? '保存中...' : '保存' }}
          </el-button>
          <el-button @click="handleSaveAndContinue" :loading="saving" v-if="!isEdit">
            <el-icon><Plus /></el-icon>
            保存并继续添加
          </el-button>
        </div>
      </div>

      <!-- 用户表单 -->
      <div class="form-section">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px" size="large" @submit.prevent>
          <el-row :gutter="20">
            <!-- 左侧基本信息 -->
            <el-col :lg="16" :md="24">
              <el-card class="form-card" shadow="never">
                <template #header>
                  <div class="card-header">
                    <span class="card-title">基本信息</span>
                    <el-tag type="danger" size="small">必填</el-tag>
                  </div>
                </template>

                <el-row :gutter="20">
                  <el-col :md="12" :sm="24">
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
                      <div class="form-tip" v-if="!isEdit">用户名只能包含字母、数字和下划线，3-30个字符</div>
                    </el-form-item>
                  </el-col>

                  <el-col :md="12" :sm="24">
                    <el-form-item label="真实姓名" prop="realName">
                      <el-input v-model="formData.realName" placeholder="请输入真实姓名" clearable maxlength="50">
                        <template #prefix>
                          <el-icon><Avatar /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20" v-if="!isEdit">
                  <el-col :md="12" :sm="24">
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
                    </el-form-item>
                  </el-col>

                  <el-col :md="12" :sm="24">
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

                <el-row :gutter="20">
                  <el-col :md="12" :sm="24">
                    <el-form-item label="邮箱地址" prop="email">
                      <el-input v-model="formData.email" placeholder="请输入邮箱地址" clearable maxlength="100">
                        <template #prefix>
                          <el-icon><Message /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-col>

                  <el-col :md="12" :sm="24">
                    <el-form-item label="手机号码" prop="phone">
                      <el-input v-model="formData.phone" placeholder="请输入手机号码" clearable maxlength="20">
                        <template #prefix>
                          <el-icon><Phone /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :md="8" :sm="24">
                    <el-form-item label="性别" prop="gender">
                      <el-select v-model="formData.gender" placeholder="请选择性别" style="width: 100%">
                        <el-option label="男" value="male" />
                        <el-option label="女" value="female" />
                        <el-option label="其他" value="other" />
                      </el-select>
                    </el-form-item>
                  </el-col>

                  <el-col :md="8" :sm="24">
                    <el-form-item label="生日" prop="birthday">
                      <el-date-picker
                        v-model="formData.birthday"
                        type="date"
                        placeholder="请选择生日"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :md="8" :sm="24">
                    <el-form-item label="角色" prop="role">
                      <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
                        <el-option label="普通用户" value="user" />
                        <el-option label="图书管理员" value="librarian" />
                        <el-option label="管理员" value="admin" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :md="12" :sm="24">
                    <el-form-item label="学号/工号" prop="studentId">
                      <el-input v-model="formData.studentId" placeholder="请输入学号或工号" clearable maxlength="50">
                        <template #prefix>
                          <el-icon><Postcard /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-col>

                  <el-col :md="12" :sm="24">
                    <el-form-item label="院系/部门" prop="department">
                      <el-input v-model="formData.department" placeholder="请输入院系或部门" clearable maxlength="100">
                        <template #prefix>
                          <el-icon><OfficeBuilding /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="个人简介" prop="bio">
                  <el-input
                    v-model="formData.bio"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入个人简介"
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>
              </el-card>
            </el-col>

            <!-- 右侧头像和权限设置 -->
            <el-col :lg="8" :md="24">
              <!-- 头像上传 -->
              <el-card class="form-card avatar-card" shadow="never">
                <template #header>
                  <span class="card-title">头像设置</span>
                </template>

                <div class="avatar-upload-container">
                  <el-upload
                    class="avatar-uploader"
                    :action="uploadAction"
                    :headers="uploadHeaders"
                    :show-file-list="false"
                    :on-success="handleAvatarSuccess"
                    :on-error="handleAvatarError"
                    :before-upload="beforeAvatarUpload"
                    accept="image/*"
                  >
                    <img v-if="formData.avatar" :src="formData.avatar" class="avatar-preview" />
                    <div v-else class="avatar-placeholder">
                      <el-icon class="avatar-uploader-icon"><Plus /></el-icon>
                      <div class="upload-text">点击上传头像</div>
                    </div>
                  </el-upload>

                  <div class="avatar-tips">
                    <p>建议尺寸：200x200像素</p>
                    <p>支持格式：JPG、PNG、GIF</p>
                    <p>文件大小：不超过2MB</p>
                  </div>

                  <div class="avatar-actions" v-if="formData.avatar">
                    <el-button size="small" @click="previewAvatar">预览</el-button>
                    <el-button size="small" type="danger" @click="removeAvatar">删除</el-button>
                  </div>
                </div>
              </el-card>

              <!-- 账户设置 -->
              <el-card class="form-card" shadow="never">
                <template #header>
                  <span class="card-title">账户设置</span>
                </template>

                <el-form-item label="账户状态" prop="status">
                  <el-radio-group v-model="formData.status">
                    <el-radio value="active">启用</el-radio>
                    <el-radio value="inactive">禁用</el-radio>
                  </el-radio-group>
                  <div class="form-tip">禁用后用户将无法登录系统</div>
                </el-form-item>

                <el-form-item label="初始积分" prop="pointsBalance" v-if="!isEdit">
                  <el-input-number
                    v-model="formData.pointsBalance"
                    :min="0"
                    :max="10000"
                    controls-position="right"
                    style="width: 100%"
                  />
                  <div class="form-tip">新用户的初始积分，默认为0</div>
                </el-form-item>

                <el-form-item label="借阅权限" prop="borrowPermission">
                  <el-checkbox-group v-model="formData.borrowPermission">
                    <el-checkbox value="borrow">允许借阅图书</el-checkbox>
                    <el-checkbox value="renew">允许续借图书</el-checkbox>
                    <el-checkbox value="reserve">允许预约图书</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>

                <el-form-item label="借阅上限" prop="borrowLimit">
                  <el-input-number
                    v-model="formData.borrowLimit"
                    :min="1"
                    :max="50"
                    controls-position="right"
                    style="width: 100%"
                  />
                  <div class="form-tip">用户同时借阅的图书数量上限</div>
                </el-form-item>
              </el-card>

              <!-- 验证状态 -->
              <el-card class="form-card" shadow="never" v-if="isEdit">
                <template #header>
                  <span class="card-title">验证状态</span>
                </template>

                <el-form-item label="邮箱验证">
                  <el-switch v-model="formData.emailVerified" active-text="已验证" inactive-text="未验证" />
                </el-form-item>

                <el-form-item label="手机验证">
                  <el-switch v-model="formData.phoneVerified" active-text="已验证" inactive-text="未验证" />
                </el-form-item>
              </el-card>
            </el-col>
          </el-row>
        </el-form>
      </div>
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
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api/user'
import { createValidationRules } from '@/utils/validate'
import { useAuthStore } from '@/stores/auth'

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

// 安全初始化
try {
  authStore = useAuthStore()
  console.log('Auth store initialized successfully')
} catch (error) {
  console.error('Auth store initialization failed:', error)
  hasError.value = true
  errorMessage.value = '认证系统初始化失败'
}

// 计算属性 - 添加调试信息
const isEdit = computed(() => {
  const result = !!route.params.id
  console.log('isEdit computed:', result, 'route.params.id:', route.params.id)
  return result
})
const userId = computed(() => {
  const id = route.params.id
  console.log('userId computed:', id)
  return id
})

// 上传配置 - 安全获取token
const uploadAction = ref('/api/upload/avatar')
const uploadHeaders = computed(() => {
  try {
    return authStore && authStore.token
      ? {
          Authorization: `Bearer ${authStore.token}`
        }
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
  borrowLimit: 10,
  emailVerified: false,
  phoneVerified: false
})

// 表单验证规则 - 使用计算属性确保路由可用
const formRules = computed(() => {
  console.log('Computing form rules, isEdit:', isEdit.value)
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
      // 新增模式 - 密码必填
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
    } else {
      // 编辑模式 - 密码可选
      baseRules.password = []
      baseRules.confirmPassword = []
    }

    return baseRules
  } catch (error) {
    console.error('Failed to create validation rules:', error)
    // 返回基础验证规则作为后备
    const fallbackRules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
      role: [{ required: true, message: '请选择角色', trigger: 'blur' }]
    }

    // 新增模式需要密码
    if (!isEdit.value) {
      fallbackRules.password = [{ required: true, message: '请输入密码', trigger: 'blur' }]
      fallbackRules.confirmPassword = [{ required: true, message: '请确认密码', trigger: 'blur' }]
    }

    return fallbackRules
  }
})

// 方法
const fetchUserData = async () => {
  if (!isEdit.value) return

  console.log('fetchUserData called for userId:', userId.value)
  try {
    loading.value = true

    // 检查userApi是否可用
    if (!userApi || !userApi.getUserDetail) {
      throw new Error('User API is not available')
    }

    console.log('Calling userApi.getUserDetail...')
    const { data } = await userApi.getUserDetail(userId.value)

    if (data) {
      // 填充表单数据 - 适配不同的响应格式
      const userData = data.user || data
      
      Object.keys(formData).forEach(key => {
        if (userData[key] !== undefined) {
          formData[key] = userData[key]
        }
      })

      // 处理特殊字段
      if (userData.borrowPermission) {
        formData.borrowPermission = Array.isArray(userData.borrowPermission) 
          ? userData.borrowPermission 
          : []
      }
      
      // 确保状态是字符串
      if (userData.status !== undefined) {
        formData.status = String(userData.status)
      }
      
      // 确保角色是字符串
      if (userData.role !== undefined) {
        formData.role = String(userData.role)
      }
    } else {
      throw new Error('Invalid response data')
    }
  } catch (error) {
    console.error('获取用户数据失败:', error)
    
    const message = error.response?.data?.message || error.message || '获取用户数据失败'
    ElMessage.error(message)

    // 如果获取失败，延迟返回
    setTimeout(() => {
      goBack()
    }, 2000)
  } finally {
    loading.value = false
  }
}

const validateForm = async () => {
  if (!formRef.value) {
    console.warn('Form ref is not available')
    return false
  }

  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    console.error('表单验证失败:', error)
    // 即使验证失败也要给用户友好的提示
    ElMessage.warning('请检查表单填写是否正确')
    return false
  }
}

const handleSave = async () => {
  // 防御性检查
  if (hasError.value) {
    ElMessage.error('页面状态异常，请刷新后重试')
    return
  }

  const isValid = await validateForm()
  if (!isValid) return

  try {
    saving.value = true

    // 检查API是否可用
    if (!userApi) {
      throw new Error('User API is not available')
    }

    const userData = { ...formData }

    // 移除确认密码字段
    delete userData.confirmPassword

    // 如果是编辑模式且密码为空，则不更新密码
    if (isEdit.value && !userData.password) {
      delete userData.password
    }

    if (isEdit.value) {
      if (!userApi.updateUser) {
        throw new Error('Update user API is not available')
      }
      await userApi.updateUser(userId.value, userData)
      ElMessage.success('用户更新成功')
    } else {
      if (!userApi.createUser) {
        throw new Error('Create user API is not available')
      }
      await userApi.createUser(userData)
      ElMessage.success('用户创建成功')
    }

    goBack()
  } catch (error) {
    console.error('保存用户失败:', error)
    const message = error.message || '保存用户失败'
    ElMessage.error(message)

    // 如果是关键API错误，显示错误状态
    if (message.includes('API is not available')) {
      hasError.value = true
      errorMessage.value = '系统服务不可用，请稍后重试'
    }
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

    // 重置表单
    resetForm()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.message || '保存用户失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  // 重置表单数据
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
    borrowLimit: 10,
    emailVerified: false,
    phoneVerified: false
  })

  // 清除验证
  formRef.value?.clearValidate()
}

const goBack = () => {
  try {
    router.go(-1)
  } catch (error) {
    console.error('Navigation failed:', error)
    // 如果router.go失败，尝试其他方式
    try {
      router.push('/users/list')
    } catch (pushError) {
      console.error('Push navigation failed:', pushError)
      // 最后手段：页面刷新
      window.location.href = '/users/list'
    }
  }
}

// 重试函数
const handleRetry = () => {
  hasError.value = false
  errorMessage.value = ''

  // 重新初始化
  try {
    authStore = useAuthStore()
    if (isEdit.value) {
      fetchUserData()
    }
  } catch (error) {
    console.error('Retry failed:', error)
    hasError.value = true
    errorMessage.value = '重新加载失败，请刷新整个页面'
  }
}

// 头像上传相关方法
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

const handleAvatarSuccess = response => {
  if (response.success) {
    formData.avatar = response.data.url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error(response.message || '头像上传失败')
  }
}

const handleAvatarError = error => {
  console.error('头像上传失败:', error)
  ElMessage.error('头像上传失败')
}

const previewAvatar = () => {
  showAvatarPreview.value = true
}

const removeAvatar = () => {
  formData.avatar = ''
  ElMessage.success('头像已删除')
}

// 生命周期 - 安全初始化
onMounted(() => {
  console.log('Form mounted, isEdit:', isEdit.value, 'userId:', userId.value)

  // 使用 nextTick 确保路由参数已经准备好
  nextTick(() => {
    try {
      if (isEdit.value && userId.value) {
        // 总是使用真实的 API 接口
        fetchUserData()
      }
    } catch (error) {
      console.error('Component mount failed:', error)
      hasError.value = true
      errorMessage.value = '页面初始化失败: ' + error.message
    }
  })
})
</script>

<style lang="scss" scoped>
.user-form-container {
  padding: 20px;
  background-color: var(--content-bg-color);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  padding: 8px 12px;
}

.header-info {
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 4px 0;
  }

  .page-description {
    color: var(--el-text-color-secondary);
    margin: 0;
    font-size: 14px;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-section {
  .form-card {
    margin-bottom: 20px;

    :deep(.el-card__header) {
      padding: 20px 24px;
      background: var(--el-fill-color-lighter);
    }

    :deep(.el-card__body) {
      padding: 24px;
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.avatar-card {
  .avatar-upload-container {
    text-align: center;
  }
}

.avatar-uploader {
  display: inline-block;

  :deep(.el-upload) {
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary);
    }
  }
}

.avatar-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;

  .avatar-uploader-icon {
    font-size: 24px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
  }

  .upload-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.avatar-tips {
  margin-top: 16px;
  text-align: left;

  p {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin: 4px 0;
    line-height: 1.4;
  }
}

.avatar-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.avatar-preview-container {
  text-align: center;
}

.avatar-preview-large {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

// 错误边界样式
.error-boundary {
  padding: 40px 20px;
  text-align: center;
}

// 响应式设计 - 使用标准媒体查询避免mixin问题
@media (min-width: 768px) and (max-width: 991px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .form-section {
    :deep(.el-form-item__label) {
      width: 100px !important;
    }
  }
}

@media (max-width: 767px) {
  .user-form-container {
    padding: 16px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;

    .el-button {
      width: 100%;
    }
  }

  .form-section {
    :deep(.el-form-item__label) {
      width: 80px !important;
      font-size: 14px;
    }
  }

  .avatar-tips {
    text-align: center;
  }
}
</style>
