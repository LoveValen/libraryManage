<template>
  <div class="user-form-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <ElButton @click="goBack" :icon="ArrowLeft" plain>返回</ElButton>
        <span class="page-title">{{ isEdit ? '编辑用户' : '新增用户' }}</span>
      </div>
      <div class="header-right">
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="primary" @click="handleSave" :loading="saving" :icon="Check">
          {{ saving ? '保存中...' : '保存' }}
        </ElButton>
        <ElButton v-if="!isEdit" type="success" @click="handleSaveAndContinue" :loading="saving" :icon="Plus">保存并继续</ElButton>
      </div>
    </div>

    <!-- ProForm 表单 -->
    <ProForm
      ref="proFormRef"
      :fields="formFields"
      :initial-values="formData"
      :groups="formGroups"
      :loading="loading"
      :mode="isEdit ? 'edit' : 'create'"
      :columns="4"
      :gutter="16"
      :actions="false"
      :class-name="'user-pro-form'"
      @submit="handleFormSubmit"
      @values-change="handleValuesChange"
      @field-change="handleFieldChange"
    />
  </div>

  <!-- 头像预览对话框 -->
  <el-dialog v-model="showAvatarPreview" title="头像预览" width="400px">
    <div class="avatar-preview-container">
      <img :src="formData.avatar" class="avatar-preview-large" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElInput, ElIcon, ElButton, ElProgress, ElUpload } from 'element-plus'
import { showSuccess, showError } from '@/utils/message'
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
import { ProForm } from '@/components/common'

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
const proFormRef = ref()
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
    return authStore && authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
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

// 表单分组配置
const formGroups = [
  {
    key: 'userInfo',
    title: '用户信息',
    description: '填写用户的基本信息'
  },
  {
    key: 'permission',
    title: '角色权限',
    description: '设置用户的角色和权限'
  }
]

// 自定义头像上传组件
const AvatarUploadField = {
  name: 'AvatarUploadField',
  setup() {
    return () =>
      h('div', { class: 'avatar-upload-field' }, [
        h(
          ElUpload,
          {
            class: 'avatar-uploader',
            action: uploadAction.value,
            headers: uploadHeaders.value,
            showFileList: false,
            accept: 'image/*',
            disabled: uploading.value,
            beforeUpload: beforeAvatarUpload,
            onSuccess: handleAvatarSuccess,
            onError: handleAvatarError,
            onProgress: handleAvatarProgress
          },
          {
            default: () => {
              if (formData.avatar && !uploading.value) {
                return h('img', { src: formData.avatar, class: 'avatar' })
              } else if (uploading.value) {
                return h('div', { class: 'uploading' }, [
                  h(ElProgress, {
                    type: 'circle',
                    percentage: uploadProgress.value,
                    width: 78
                  })
                ])
              } else {
                return h(
                  ElIcon,
                  { class: 'avatar-uploader-icon' },
                  {
                    default: () => h(Plus)
                  }
                )
              }
            }
          }
        ),
        h('div', { class: 'upload-tips' }, [
          h('p', '支持 JPG、PNG 格式，文件大小不超过 2MB'),
          formData.avatar &&
            h('div', { class: 'avatar-actions' }, [
              h(
                ElButton,
                {
                  size: 'small',
                  type: 'primary',
                  link: true,
                  onClick: previewAvatar
                },
                {
                  default: () => [h(ElIcon, null, { default: () => h(ZoomIn) }), ' 预览']
                }
              ),
              h(
                ElButton,
                {
                  size: 'small',
                  type: 'danger',
                  link: true,
                  onClick: removeAvatar
                },
                {
                  default: () => [h(ElIcon, null, { default: () => h(Delete) }), ' 删除']
                }
              )
            ])
        ])
      ])
  }
}

// 自定义密码强度组件
const PasswordFieldWithStrength = {
  name: 'PasswordFieldWithStrength',
  props: ['field', 'value'],
  setup(props) {
    return () =>
      h('div', [
        h(ElInput, {
          modelValue: props.value,
          type: 'password',
          placeholder: props.field.placeholder,
          showPassword: true,
          clearable: true,
          maxlength: 128,
          prefixIcon: Lock,
          'onUpdate:modelValue': val => {
            formData[props.field.name] = val
            proFormRef.value?.setFieldValue(props.field.name, val)
          }
        }),
        props.value &&
          h('div', { class: 'password-strength' }, [
            h('div', { class: 'strength-bar' }, [
              h('div', {
                class: ['strength-fill', `strength-${passwordStrength.value.level}`],
                style: { width: passwordStrength.value.percentage + '%' }
              })
            ]),
            h('span', { class: 'strength-text' }, `强度：${passwordStrength.value.text}`)
          ])
      ])
  }
}

// 表单字段配置
const formFields = computed(() => {
  const fields = [
    // 用户信息组
    {
      name: 'avatar',
      label: '用户头像',
      valueType: 'custom',
      group: 'userInfo',
      span: 24,
      renderFormItem: () => h(AvatarUploadField)
    },
    {
      name: 'username',
      label: '用户名',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      required: true,
      disabled: isEdit.value,
      placeholder: '请输入用户名',
      fieldProps: {
        clearable: true,
        maxlength: 30,
        showWordLimit: true,
        prefixIcon: User
      },
      rules: [createValidationRules.required('请输入用户名'), createValidationRules.username()]
    },
    {
      name: 'realName',
      label: '真实姓名',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      required: true,
      placeholder: '请输入真实姓名',
      fieldProps: {
        clearable: true,
        maxlength: 50,
        prefixIcon: Avatar
      },
      rules: [createValidationRules.required('请输入真实姓名'), createValidationRules.length(2, 50, '真实姓名长度为2-50个字符')]
    },
    {
      name: 'email',
      label: '邮箱地址',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      placeholder: '请输入邮箱地址',
      fieldProps: {
        type: 'email',
        clearable: true,
        maxlength: 100,
        prefixIcon: Message
      },
      rules: [createValidationRules.email()]
    },
    {
      name: 'phone',
      label: '手机号码',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      placeholder: '请输入手机号码',
      fieldProps: {
        clearable: true,
        maxlength: 20,
        prefixIcon: Phone
      },
      rules: [createValidationRules.phone()]
    },
    {
      name: 'gender',
      label: '性别',
      valueType: 'select',
      group: 'userInfo',
      span: 6,
      placeholder: '请选择性别',
      fieldProps: {
        clearable: true
      },
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' }
      ]
    },
    {
      name: 'birthday',
      label: '生日',
      valueType: 'date',
      group: 'userInfo',
      span: 6,
      placeholder: '请选择生日',
      fieldProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        disabledDate: time => time.getTime() > Date.now(),
        style: { width: '100%' }
      }
    },
    {
      name: 'studentId',
      label: '学号/工号',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      placeholder: '请输入学号或工号',
      fieldProps: {
        clearable: true,
        maxlength: 50,
        prefixIcon: Postcard
      }
    },
    {
      name: 'department',
      label: '院系/部门',
      valueType: 'text',
      group: 'userInfo',
      span: 6,
      placeholder: '请输入院系或部门',
      fieldProps: {
        clearable: true,
        maxlength: 100,
        prefixIcon: OfficeBuilding
      }
    },
    {
      name: 'bio',
      label: '个人简介',
      valueType: 'textarea',
      group: 'userInfo',
      span: 24,
      placeholder: '简单介绍一下自己...',
      fieldProps: {
        rows: 3,
        maxlength: 500,
        showWordLimit: true,
        resize: 'none'
      }
    },
    // 角色权限组
    {
      name: 'role',
      label: '系统角色',
      valueType: 'select',
      group: 'permission',
      span: 6,
      required: true,
      placeholder: '请选择角色',
      options: [
        { label: '普通用户', value: 'user' },
        { label: '图书管理员', value: 'librarian' },
        { label: '管理员', value: 'admin' }
      ],
      rules: [createValidationRules.required('请选择角色')]
    },
    {
      name: 'status',
      label: '账户状态',
      valueType: 'radio',
      group: 'permission',
      span: 6,
      options: [
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'inactive' }
      ]
    },
    {
      name: 'borrowLimit',
      label: '借阅上限',
      valueType: 'number',
      group: 'permission',
      span: 6,
      fieldProps: {
        min: 1,
        max: 50,
        controls: false,
        style: { width: '100%' }
      },
      rules: [createValidationRules.numberRange(1, 50, '借阅上限必须在1-50之间')]
    },
    {
      name: 'borrowPermission',
      label: '借阅权限',
      valueType: 'checkbox',
      group: 'permission',
      span: 12,
      options: [
        { label: '借阅图书', value: 'borrow' },
        { label: '续借图书', value: 'renew' },
        { label: '预约图书', value: 'reserve' }
      ]
    }
  ]

  // 密码字段（仅新增模式）
  if (!isEdit.value) {
    // 找到 bio 字段的索引，在其后插入密码字段
    const bioIndex = fields.findIndex(f => f.name === 'bio')
    fields.splice(
      bioIndex + 1,
      0,
      {
        name: 'password',
        label: '登录密码',
        valueType: 'custom',
        group: 'userInfo',
        span: 6,
        required: true,
        placeholder: '请输入登录密码',
        rules: [createValidationRules.required('请输入密码'), createValidationRules.password()],
        renderFormItem: () => h(PasswordFieldWithStrength, { field: { name: 'password', placeholder: '请输入登录密码' }, value: formData.password })
      },
      {
        name: 'confirmPassword',
        label: '确认密码',
        valueType: 'password',
        group: 'userInfo',
        span: 6,
        required: true,
        placeholder: '请再次输入密码',
        fieldProps: {
          showPassword: true,
          clearable: true,
          maxlength: 128,
          prefixIcon: Lock
        },
        rules: [
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
    )

    // 在角色权限组最后添加初始积分
    fields.push({
      name: 'pointsBalance',
      label: '初始积分',
      valueType: 'number',
      group: 'permission',
      span: 6,
      fieldProps: {
        min: 0,
        max: 10000,
        step: 10,
        controls: false,
        style: { width: '100%' }
      }
    })
  }

  return fields
})

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
        formData.borrowPermission = Array.isArray(userData.borrowPermission) ? userData.borrowPermission : []
      }
    }
  } catch (error) {
    console.error('获取用户数据失败:', error)
    showError(error.response?.data?.message || '获取用户数据失败')
    setTimeout(() => goBack(), 2000)
  } finally {
    loading.value = false
  }
}

const validateForm = async () => {
  if (!proFormRef.value) return false
  try {
    const valid = await proFormRef.value.validate()
    return valid
  } catch (error) {
    ElMessage.warning('请检查表单填写是否正确')
    return false
  }
}

const handleFormSubmit = async values => {
  await handleSave()
}

const handleSave = async () => {
  if (hasError.value) {
    showError('页面状态异常，请刷新后重试')
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
      showSuccess('用户更新成功')
    } else {
      await userApi.createUser(userData)
      showSuccess('用户创建成功')
    }

    goBack()
  } catch (error) {
    console.error('保存用户失败:', error)
    showError(error.message || '保存用户失败')
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
    showSuccess('用户创建成功')
    handleReset()
  } catch (error) {
    console.error('保存用户失败:', error)
    showError(error.message || '保存用户失败')
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
  proFormRef.value?.reset()
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
    showError('上传文件必须是图片格式!')
    return false
  }
  if (!isLt2M) {
    showError('上传图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleAvatarProgress = event => {
  uploading.value = true
  uploadProgress.value = Math.round(event.percent)
}

const handleAvatarSuccess = response => {
  uploading.value = false
  uploadProgress.value = 0

  if (response.success) {
    formData.avatar = response.data.url
    showSuccess('头像上传成功')
  } else {
    showError(response.message || '头像上传失败')
  }
}

const handleAvatarError = error => {
  uploading.value = false
  uploadProgress.value = 0
  showError('头像上传失败')
}

const previewAvatar = () => {
  showAvatarPreview.value = true
}

const removeAvatar = () => {
  formData.avatar = ''
  showSuccess('头像已删除')
}

// 处理值变化
const handleValuesChange = (changedValues, allValues) => {
  Object.assign(formData, allValues)
}

const handleFieldChange = (fieldName, value, oldValue) => {
  // 特殊字段处理
  if (fieldName === 'password' && !isEdit.value) {
    // 密码变化时触发确认密码的验证
    if (formData.confirmPassword) {
      proFormRef.value?.validateField('confirmPassword')
    }
  }
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
    min-height: 64px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;

      .page-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin: 0;
        display: flex;
        align-items: center;
        height: 32px;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
  }

  // ProForm 自定义样式
  :deep(.user-pro-form) {
    .pro-form {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .form-group {
      background: var(--el-fill-color-light);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;

      .el-divider__text {
        background: var(--el-fill-color-light);
      }
    }
  }

  // 头像上传样式
  .avatar-upload-field {
    display: flex;
    align-items: flex-start;
    gap: 20px;

    .avatar-uploader {
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
      flex: 1;

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
  }

  // 密码强度样式
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

  .avatar-preview-container {
    text-align: center;

    .avatar-preview-large {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
    }
  }
}
</style>
