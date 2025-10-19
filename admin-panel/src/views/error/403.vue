<template>
  <div class="error-container">
    <div class="error-content">
      <!-- 403图标和动画 -->
      <div class="error-illustration">
        <div class="error-number">403</div>
        <div class="error-icon">
          <el-icon><Lock /></el-icon>
        </div>
      </div>

      <!-- 错误信息 -->
      <div class="error-info">
        <h1 class="error-title">权限不足</h1>
        <p class="error-description">抱歉，您没有访问此页面的权限。</p>
        <p class="error-suggestion">请联系管理员获取相应权限，或者尝试以下操作：</p>

        <!-- 用户信息 -->
        <div class="user-info" v-if="userInfo.username">
          <div class="user-card">
            <el-avatar :size="40" :src="userInfo.avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="user-details">
              <div class="user-name">{{ userInfo.realName || userInfo.username }}</div>
              <div class="user-role">角色: {{ getRoleText(userInfo.role) }}</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="error-actions">
          <el-button type="primary" @click="goHome">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
          <el-button @click="goBack">
            <el-icon><Back /></el-icon>
            返回上页
          </el-button>
          <el-button type="warning" @click="contactAdmin">
            <el-icon><Message /></el-icon>
            联系管理员
          </el-button>
          <el-button type="info" @click="switchUser">
            <el-icon><SwitchButton /></el-icon>
            切换账号
          </el-button>
        </div>

        <!-- 权限说明 -->
        <div class="permission-info">
          <h3>权限说明</h3>
          <div class="permission-list">
            <div class="permission-item">
              <el-icon class="permission-icon admin"><Crown /></el-icon>
              <div class="permission-text">
                <strong>管理员</strong>
                <span>拥有系统所有功能的访问权限</span>
              </div>
            </div>
            <div class="permission-item">
              <el-icon class="permission-icon librarian"><UserFilled /></el-icon>
              <div class="permission-text">
                <strong>图书管理员</strong>
                <span>可管理图书、借阅记录和用户信息</span>
              </div>
            </div>
            <div class="permission-item">
              <el-icon class="permission-icon user"><User /></el-icon>
              <div class="permission-text">
                <strong>普通用户</strong>
                <span>可查看个人信息和借阅记录</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="error-decoration">
      <div class="decoration-item decoration-1"></div>
      <div class="decoration-item decoration-2"></div>
      <div class="decoration-item decoration-3"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 计算属性
const userInfo = computed(() => authStore.userInfo || {})

// 方法
const getRoleText = role => {
  const roleMap = {
    admin: '管理员',
    librarian: '图书管理员',
    user: '普通用户'
  }
  return roleMap[role] || role || '未知'
}

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

const contactAdmin = async () => {
  try {
    await ElMessageBox.alert(
      '请联系系统管理员获取相应权限。\n\n联系方式：\n邮箱：admin@library.com\n电话：400-123-4567',
      '联系管理员',
      {
        confirmButtonText: '我知道了',
        type: 'info'
      }
    )
  } catch (error) {
    // 用户关闭对话框
  }
}

const switchUser = async () => {
  try {
    await ElMessageBox.confirm('确定要退出当前账号并重新登录吗？', '切换账号', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await authStore.logout()
    router.push('/login')
  } catch (error) {
    // 用户取消
  }
}

// 设置页面标题
document.title = '权限不足 - 图书管理系统'
</script>

<style lang="scss" scoped>
.error-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%);
  overflow: hidden;
}

.error-content {
  position: relative;
  z-index: 2;
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 700px;
  width: 90%;
  animation: slideUp 0.8s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-illustration {
  position: relative;
  margin-bottom: 40px;
}

.error-number {
  font-size: 120px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff6b6b, #ff9a56);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 20px;
  animation: shake 2s infinite;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
  }
}

.error-icon {
  font-size: 80px;
  color: #ff6b6b;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.error-info {
  .error-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
  }

  .error-description {
    font-size: 18px;
    color: var(--el-text-color-regular);
    margin: 0 0 16px 0;
    line-height: 1.6;
  }

  .error-suggestion {
    font-size: 16px;
    color: var(--el-text-color-secondary);
    margin: 0 0 32px 0;
  }
}

.user-info {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--el-fill-color-lighter);
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.user-details {
  text-align: left;

  .user-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .user-role {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 40px;

  .el-button {
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }
}

.permission-info {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 32px;
  text-align: left;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 20px 0;
    text-align: center;
  }
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color);
  }
}

.permission-icon {
  font-size: 20px;
  padding: 8px;
  border-radius: 8px;

  &.admin {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  &.librarian {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  &.user {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    color: white;
  }
}

.permission-text {
  flex: 1;

  strong {
    display: block;
    font-size: 16px;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  span {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
  }
}

.error-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.decoration-item {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;

  &.decoration-1 {
    width: 100px;
    height: 100px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }

  &.decoration-2 {
    width: 150px;
    height: 150px;
    top: 20%;
    right: 15%;
    animation-delay: 2s;
  }

  &.decoration-3 {
    width: 80px;
    height: 80px;
    bottom: 15%;
    left: 20%;
    animation-delay: 4s;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

// 响应式设计
@include respond-to(mobile) {
  .error-content {
    padding: 40px 20px;
  }

  .error-number {
    font-size: 80px;
  }

  .error-icon {
    font-size: 60px;
  }

  .error-title {
    font-size: 20px !important;
  }

  .error-description {
    font-size: 16px !important;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;

    .el-button {
      width: 100%;
      max-width: 200px;
    }
  }

  .permission-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}
</style>
