<template>
  <div class="user-form-pro-container">
    <ProForm
      ref="proFormRef"
      :fields="formFields"
      :groups="formGroups"
      :initialValues="initialValues"
      label-width="120px"
      :columns="2"
      @submit="handleSubmit"
      @values-change="handleValuesChange"
      :loading="submitting"
      :actions="{
        submit: {
          text: submitting ? (isEdit ? '更新中...' : '创建中...') : (isEdit ? '更新用户' : '创建用户'),
          loading: submitting
        },
        reset: {
          text: '重置',
          onClick: handleReset
        }
      }"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ProForm } from '@/components/common'
import { userApi } from '@/api/user'
import { uploadFile } from '@/api/common'
import { removeEmpty } from '@/utils/global'

// Router
const route = useRoute()
const router = useRouter()

// Props
const props = defineProps({
  userId: {
    type: [String, Number],
    default: null
  },
  mode: {
    type: String,
    default: 'create', // create | edit | view
    validator: (value) => ['create', 'edit', 'view'].includes(value)
  }
})

// Emits
const emit = defineEmits(['success', 'cancel'])

// 响应式数据
const proFormRef = ref()
const submitting = ref(false)
const loading = ref(false)

// 计算属性
const isEdit = computed(() => props.mode === 'edit')
const isView = computed(() => props.mode === 'view')
const userId = computed(() => props.userId || route.params.id)

// 初始值
const initialValues = reactive({
  username: '',
  realName: '',
  email: '',
  phone: '',
  role: 'user',
  status: 'active',
  avatar: '',
  studentId: '',
  grade: '',
  major: '',
  department: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  borrowLimit: 5,
  notes: ''
})

// 角色选项
const roleOptions = [
  { label: '普通用户', value: 'user', description: '可借阅图书，查看个人信息' },
  { label: '图书管理员', value: 'librarian', description: '管理图书信息，处理借还业务' },
  { label: '系统管理员', value: 'admin', description: '系统设置，用户管理，数据统计' }
]

// 状态选项
const statusOptions = [
  { label: '正常', value: 'active', type: 'success' },
  { label: '禁用', value: 'inactive', type: 'danger' },
  { label: '暂停', value: 'suspended', type: 'warning' }
]

// 年级选项
const gradeOptions = [
  { label: '大一', value: 'freshman' },
  { label: '大二', value: 'sophomore' },
  { label: '大三', value: 'junior' },
  { label: '大四', value: 'senior' },
  { label: '研一', value: 'graduate1' },
  { label: '研二', value: 'graduate2' },
  { label: '研三', value: 'graduate3' },
  { label: '博士', value: 'phd' },
  { label: '教师', value: 'teacher' },
  { label: '其他', value: 'other' }
]

// 表单字段配置
const formFields = [
  // 基本信息组
  {
    name: 'avatar',
    label: '头像',
    valueType: 'uploadImage',
    group: 'basic',
    span: 24,
    fieldProps: {
      action: '/api/upload/image',
      accept: 'image/*',
      limit: 1,
      listType: 'picture-card',
      tip: '建议上传 200x200 像素的图片，支持 jpg、png 格式',
      beforeUpload: (file) => {
        const isImage = file.type.startsWith('image/')
        const isLt2M = file.size / 1024 / 1024 < 2

        if (!isImage) {
          ElMessage.error('只能上传图片格式的文件!')
          return false
        }
        if (!isLt2M) {
          ElMessage.error('上传图片大小不能超过 2MB!')
          return false
        }
        return true
      }
    },
    span: 24
  },
  {
    name: 'username',
    label: '用户名',
    valueType: 'text',
    required: true,
    group: 'basic',
    placeholder: '请输入用户名，用于系统登录',
    rules: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 3, max: 20, message: '用户名长度应为 3-20 位', trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
    ],
    disabled: isEdit.value,
    extra: isEdit.value ? '用户名创建后不可修改' : '3-20位字母、数字或下划线'
  },
  {
    name: 'realName',
    label: '真实姓名',
    valueType: 'text',
    required: true,
    group: 'basic',
    placeholder: '请输入真实姓名',
    rules: [
      { required: true, message: '请输入真实姓名', trigger: 'blur' },
      { min: 2, max: 20, message: '姓名长度应为 2-20 位', trigger: 'blur' }
    ]
  },
  {
    name: 'email',
    label: '邮箱地址',
    valueType: 'text',
    required: true,
    group: 'basic',
    placeholder: '请输入邮箱地址',
    rules: [
      { required: true, message: '请输入邮箱地址', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
    ]
  },
  {
    name: 'phone',
    label: '手机号码',
    valueType: 'text',
    group: 'basic',
    placeholder: '请输入手机号码',
    rules: [
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
    ]
  },
  {
    name: 'role',
    label: '用户角色',
    valueType: 'radio',
    required: true,
    group: 'basic',
    options: roleOptions,
    rules: [
      { required: true, message: '请选择用户角色', trigger: 'change' }
    ],
    span: 24,
    renderFormItem: (field, formData) => {
      return (
        <el-radio-group v-model={formData.role}>
          {roleOptions.map(option => (
            <el-radio key={option.value} label={option.value} class="role-radio">
              <div class="role-option">
                <div class="role-name">{option.label}</div>
                <div class="role-desc">{option.description}</div>
              </div>
            </el-radio>
          ))}
        </el-radio-group>
      )
    }
  },
  {
    name: 'status',
    label: '账户状态',
    valueType: 'select',
    required: true,
    group: 'basic',
    options: statusOptions,
    rules: [
      { required: true, message: '请选择账户状态', trigger: 'change' }
    ]
  },

  // 学籍信息组
  {
    name: 'studentId',
    label: '学号/工号',
    valueType: 'text',
    group: 'academic',
    placeholder: '请输入学号或工号',
    when: (formData) => formData.role !== 'admin'
  },
  {
    name: 'grade',
    label: '年级',
    valueType: 'select',
    group: 'academic',
    placeholder: '请选择年级',
    options: gradeOptions,
    when: (formData) => formData.role !== 'admin'
  },
  {
    name: 'major',
    label: '专业',
    valueType: 'text',
    group: 'academic',
    placeholder: '请输入专业名称',
    when: (formData) => formData.role !== 'admin'
  },
  {
    name: 'department',
    label: '院系',
    valueType: 'text',
    group: 'academic',
    placeholder: '请输入所属院系',
    when: (formData) => formData.role !== 'admin'
  },

  // 联系信息组
  {
    name: 'address',
    label: '联系地址',
    valueType: 'textarea',
    group: 'contact',
    placeholder: '请输入联系地址',
    span: 24,
    fieldProps: {
      rows: 2
    }
  },
  {
    name: 'emergencyContact',
    label: '紧急联系人',
    valueType: 'text',
    group: 'contact',
    placeholder: '请输入紧急联系人姓名'
  },
  {
    name: 'emergencyPhone',
    label: '紧急联系电话',
    valueType: 'text',
    group: 'contact',
    placeholder: '请输入紧急联系电话',
    rules: [
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
    ]
  },

  // 系统设置组
  {
    name: 'borrowLimit',
    label: '借阅限制',
    valueType: 'number',
    group: 'settings',
    min: 1,
    max: 20,
    step: 1,
    placeholder: '设置最大借阅数量',
    extra: '用户可同时借阅的最大图书数量',
    when: (formData) => formData.role !== 'user'
  },
  {
    name: 'notes',
    label: '备注信息',
    valueType: 'textarea',
    group: 'settings',
    placeholder: '请输入备注信息',
    span: 24,
    fieldProps: {
      rows: 3,
      maxlength: 500,
      showWordLimit: true
    }
  },

  // 密码设置（仅创建时显示）
  {
    name: 'password',
    label: '登录密码',
    valueType: 'password',
    group: 'security',
    required: !isEdit.value,
    placeholder: '请输入登录密码',
    rules: [
      { required: !isEdit.value, message: '请输入登录密码', trigger: 'blur' },
      { min: 6, max: 20, message: '密码长度应为 6-20 位', trigger: 'blur' }
    ],
    when: () => !isEdit.value
  },
  {
    name: 'confirmPassword',
    label: '确认密码',
    valueType: 'password',
    group: 'security',
    required: !isEdit.value,
    placeholder: '请再次输入密码',
    rules: [
      { required: !isEdit.value, message: '请确认密码', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          const formData = proFormRef.value?.getValues()
          if (value && value !== formData?.password) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ],
    when: () => !isEdit.value
  }
]

// 表单分组
const formGroups = [
  {
    key: 'basic',
    title: '基本信息',
    description: '用户的基本身份信息'
  },
  {
    key: 'academic',
    title: '学籍信息',
    description: '学生/教师的学籍相关信息'
  },
  {
    key: 'contact',
    title: '联系信息',
    description: '联系方式和地址信息'
  },
  {
    key: 'settings',
    title: '系统设置',
    description: '用户权限和系统配置'
  },
  {
    key: 'security',
    title: '安全设置',
    description: '登录密码设置（仅创建时）'
  }
]

// 方法
const loadUserData = async () => {
  if (!userId.value || !isEdit.value) return

  loading.value = true
  try {
    const response = await userApi.getUserById(userId.value)

    // 直接使用后端标准响应格式
    const userData = response.data || {}

    // 更新初始值
    Object.assign(initialValues, {
      username: userData.username,
      realName: userData.realName,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      status: userData.status,
      avatar: userData.avatar,
      studentId: userData.studentId,
      grade: userData.grade,
      major: userData.major,
      department: userData.department,
      address: userData.address,
      emergencyContact: userData.emergencyContact,
      emergencyPhone: userData.emergencyPhone,
      borrowLimit: userData.borrowLimit || 5,
      notes: userData.notes
    })

    // 设置表单值
    proFormRef.value?.setValues(initialValues)
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

const handleValuesChange = (changedValues, allValues) => {
  // 可以在这里处理字段间的联动逻辑
  Object.assign(initialValues, allValues)
}

const handleSubmit = async (formData) => {
  submitting.value = true

  try {
    // 移除确认密码字段并清理空值
    const submitData = removeEmpty({
      ...formData,
      confirmPassword: undefined
    })

    let result
    if (isEdit.value) {
      result = await userApi.updateUser(userId.value, submitData)
      ElMessage.success('用户信息更新成功')
    } else {
      result = await userApi.createUser(submitData)
      ElMessage.success('用户创建成功')
    }

    // 直接使用后端标准响应格式
    emit('success', result.data)

    // 询问是否继续操作
    if (!isEdit.value) {
      const action = await ElMessageBox.confirm(
        '用户创建成功！是否继续创建新用户？',
        '操作成功',
        {
          confirmButtonText: '继续创建',
          cancelButtonText: '返回列表',
          type: 'success'
        }
      ).catch(() => 'cancel')

      if (action === 'cancel') {
        router.push('/system/users')
      } else {
        handleReset()
      }
    } else {
      router.push('/system/users')
    }
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.response?.data?.message || '保存用户失败')
  } finally {
    submitting.value = false
  }
}

const handleReset = () => {
  proFormRef.value?.reset()
  // 重置到初始状态
  if (!isEdit.value) {
    Object.assign(initialValues, {
      username: '',
      realName: '',
      email: '',
      phone: '',
      role: 'user',
      status: 'active',
      avatar: '',
      studentId: '',
      grade: '',
      major: '',
      department: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      borrowLimit: 5,
      notes: ''
    })
  }
}

// 生命周期
onMounted(() => {
  if (isEdit.value) {
    loadUserData()
  }
})
</script>

<style lang="scss" scoped>
.user-form-pro-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

:deep(.role-radio) {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  height: auto;
  white-space: normal;

  .el-radio__label {
    width: 100%;
  }
}

.role-option {
  .role-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .role-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-form-pro-container {
    padding: 10px;
  }
}
</style>