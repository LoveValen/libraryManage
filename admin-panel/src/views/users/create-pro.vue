<template>
  <div class="user-create-pro-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack" link size="large">返回用户列表</el-button>
        <div class="header-info">
          <h1>{{ isEdit ? '编辑用户' : '创建用户' }}</h1>
          <p class="description">{{ isEdit ? '编辑用户信息和权限设置' : '创建新的系统用户账户' }}</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button :icon="QuestionFilled" @click="showHelp = true">使用帮助</el-button>
      </div>
    </div>

    <!-- 操作提示 -->
    <el-card shadow="never" class="tips-card" v-if="!isEdit">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><InfoFilled /></el-icon>
            创建提示
          </div>
        </div>
      </template>
      <div class="tips-content">
        <el-alert title="用户创建指南" type="info" show-icon :closable="false">
          <ul class="tips-list">
            <li><strong>用户名：</strong>必填，创建后不可修改，建议使用学号或工号</li>
            <li><strong>真实姓名：</strong>必填，用于身份识别和记录管理</li>
            <li><strong>邮箱地址：</strong>必填，用于系统通知和密码找回</li>
            <li><strong>用户角色：</strong>决定用户的系统权限和可访问功能</li>
            <li><strong>初始密码：</strong>用户首次登录密码，建议提醒用户及时修改</li>
          </ul>
        </el-alert>
      </div>
    </el-card>

    <!-- 用户表单 -->
    <el-card shadow="never" class="form-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><User /></el-icon>
            {{ isEdit ? '用户信息' : '用户信息设置' }}
          </div>
          <div class="header-actions">
            <el-button 
              v-if="isEdit" 
              type="warning" 
              :icon="Lock" 
              @click="handleResetPassword"
            >
              重置密码
            </el-button>
          </div>
        </div>
      </template>

      <UserFormPro
        :user-id="userId"
        :mode="mode"
        @success="handleSuccess"
        @cancel="handleCancel"
      />
    </el-card>

    <!-- 使用帮助对话框 -->
    <el-dialog v-model="showHelp" title="使用帮助" width="600px">
      <div class="help-content">
        <el-collapse>
          <el-collapse-item title="用户角色说明" name="roles">
            <div class="role-help">
              <div class="role-item">
                <h4>普通用户 (User)</h4>
                <p>适用于学生和普通读者，具有图书借阅、查询、个人信息管理等基础功能。</p>
              </div>
              <div class="role-item">
                <h4>图书管理员 (Librarian)</h4>
                <p>适用于图书馆工作人员，可管理图书信息、处理借还业务、查看借阅统计等。</p>
              </div>
              <div class="role-item">
                <h4>系统管理员 (Admin)</h4>
                <p>具有最高权限，可进行用户管理、系统设置、数据统计等所有操作。</p>
              </div>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="账户状态说明" name="status">
            <div class="status-help">
              <el-tag type="success" class="status-tag">正常</el-tag>
              <span>用户可正常登录和使用系统功能</span>
              
              <el-tag type="danger" class="status-tag">禁用</el-tag>
              <span>用户无法登录系统，所有功能被禁用</span>
              
              <el-tag type="warning" class="status-tag">暂停</el-tag>
              <span>用户可登录但功能受限，通常用于临时限制</span>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="常见问题" name="faq">
            <div class="faq-content">
              <div class="faq-item">
                <h5>Q: 用户名创建后还能修改吗？</h5>
                <p>A: 不能。用户名作为唯一标识，创建后无法修改。建议使用学号或工号作为用户名。</p>
              </div>
              <div class="faq-item">
                <h5>Q: 用户忘记密码怎么办？</h5>
                <p>A: 管理员可以使用"重置密码"功能，系统会生成新密码并通过邮件发送给用户。</p>
              </div>
              <div class="faq-item">
                <h5>Q: 如何批量创建用户？</h5>
                <p>A: 可以使用Excel模板批量导入用户信息，具体操作请参考系统帮助文档。</p>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showResetPassword" title="重置用户密码" width="400px">
      <el-form ref="resetPasswordFormRef" :model="resetPasswordForm" label-width="100px">
        <el-form-item label="新密码" prop="newPassword" :rules="[
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, max: 20, message: '密码长度应为 6-20 位', trigger: 'blur' }
        ]">
          <el-input 
            v-model="resetPasswordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="发送方式">
          <el-checkbox v-model="resetPasswordForm.sendEmail">通过邮件发送给用户</el-checkbox>
        </el-form-item>
        <el-alert 
          title="安全提示" 
          type="warning" 
          show-icon 
          :closable="false"
        >
          重置密码后，用户需要使用新密码重新登录。建议提醒用户及时修改密码。
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showResetPassword = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPassword" :loading="resetPasswordLoading">
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  ArrowLeft,
  User,
  Lock,
  QuestionFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import UserFormPro from './components/UserFormPro.vue'
import { userApi } from '@/api/user'

// Router
const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const showHelp = ref(false)
const showResetPassword = ref(false)
const resetPasswordLoading = ref(false)
const resetPasswordFormRef = ref()

// 计算属性
const userId = computed(() => route.params.id)
const isEdit = computed(() => route.name === 'SystemUserEdit' || !!userId.value)
const mode = computed(() => {
  if (route.query.mode === 'view') return 'view'
  return isEdit.value ? 'edit' : 'create'
})

// 重置密码表单
const resetPasswordForm = reactive({
  newPassword: '',
  sendEmail: true
})

// 方法
const handleBack = () => {
  router.push('/system/users')
}

const handleSuccess = (userData) => {
  ElNotification.success({
    title: isEdit.value ? '更新成功' : '创建成功',
    message: isEdit.value 
      ? `用户"${userData.realName}"的信息已更新`
      : `用户"${userData.realName}"已成功创建`,
    duration: 3000
  })
}

const handleCancel = () => {
  ElMessageBox.confirm(
    `确定要取消${isEdit.value ? '编辑' : '创建'}用户吗？已填写的信息将丢失。`,
    '取消确认',
    {
      confirmButtonText: '确定取消',
      cancelButtonText: '继续编辑',
      type: 'warning'
    }
  ).then(() => {
    handleBack()
  }).catch(() => {
    // 用户选择继续编辑，不做任何操作
  })
}

const handleResetPassword = async () => {
  if (!userId.value) return

  // 重置表单
  resetPasswordForm.newPassword = ''
  resetPasswordForm.sendEmail = true
  
  showResetPassword.value = true
}

const confirmResetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  try {
    await resetPasswordFormRef.value.validate()
    
    resetPasswordLoading.value = true
    
    await userApi.resetPassword(userId.value, {
      newPassword: resetPasswordForm.newPassword,
      sendEmail: resetPasswordForm.sendEmail
    })
    
    showResetPassword.value = false
    
    ElNotification.success({
      title: '密码重置成功',
      message: resetPasswordForm.sendEmail 
        ? '新密码已通过邮件发送给用户' 
        : '用户密码已重置，请告知用户新密码',
      duration: 5000
    })
    
    // 清空表单
    resetPasswordForm.newPassword = ''
    resetPasswordForm.sendEmail = true
    
  } catch (error) {
    console.error('重置密码失败:', error)
    ElMessage.error(error.response?.data?.message || '重置密码失败')
  } finally {
    resetPasswordLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  // 页面加载完成，可以进行一些初始化操作
})
</script>

<style lang="scss" scoped>
.user-create-pro-container {
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

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

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.tips-card {
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

.help-content {
  .role-help {
    .role-item {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--el-fill-color-extra-light);
      border-radius: 6px;

      h4 {
        margin: 0 0 8px 0;
        color: var(--el-text-color-primary);
        font-size: 14px;
      }

      p {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 13px;
        line-height: 1.5;
      }
    }
  }

  .status-help {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .status-tag {
      margin-right: 8px;
      width: 50px;
      text-align: center;
    }
  }

  .faq-content {
    .faq-item {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--el-border-color-extra-light);

      &:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      h5 {
        margin: 0 0 8px 0;
        color: var(--el-text-color-primary);
        font-size: 14px;
        font-weight: 500;
      }

      p {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 13px;
        line-height: 1.5;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-create-pro-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .header-actions {
      justify-content: flex-start;
    }
  }
}
</style>