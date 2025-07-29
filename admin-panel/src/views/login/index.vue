<template>
  <div class="login-container">
    <div class="login-wrapper">
      <!-- 左侧背景区域 -->
      <div class="login-background">
        <div class="background-content">
          <h1 class="system-title">
            <el-icon class="title-icon">
              <Reading />
            </el-icon>
            图书管理系统
          </h1>
          <p class="system-description">智能化图书管理，让阅读更美好</p>
          <div class="features-list">
            <div v-for="feature in features" :key="feature.icon" class="feature-item">
              <el-icon class="feature-icon">
                <component :is="feature.icon" />
              </el-icon>
              <span class="feature-text">{{ feature.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-form-container">
        <div class="login-form-wrapper">
          <!-- Logo区域 -->
          <div class="login-header">
            <h2 class="login-title">管理员登录</h2>
          </div>

          <!-- 登录表单 -->
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="login-form"
            size="large"
            @keyup.enter="handleLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                prefix-icon="User"
                clearable
                :disabled="loading"
                autocomplete="username"
              ></el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                prefix-icon="Lock"
                show-password
                clearable
                :disabled="loading"
                autocomplete="current-password"
              ></el-input>
            </el-form-item>


            <el-form-item>
              <div class="login-options">
                <el-checkbox v-model="loginForm.rememberMe" :disabled="loading">记住我</el-checkbox>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                class="login-button"
                :loading="loading"
                @click="handleLogin"
                :disabled="!isFormValid"
              >
                <span v-if="!loading">登录</span>
                <span v-else>登录中...</span>
              </el-button>
            </el-form-item>
          </el-form>


          <!-- 底部信息 -->
          <div class="login-footer">
            <p class="copyright">© 2024 图书管理系统. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { createValidationRules } from '@/utils/validate'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { currentTheme, themeConfig } = useTheme()

// 响应式数据
const loginFormRef = ref()
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: 'admin',
  password: 'admin123',
  rememberMe: false
})

// 系统特性展示
const features = ref([
  { icon: 'Management', text: '图书管理' },
  { icon: 'DataAnalysis', text: '借阅统计' }
])

// 表单验证规则
const loginRules = reactive({
  username: [
    createValidationRules.required('请输入用户名'),
    createValidationRules.length(3, 20, '用户名长度为3-20个字符')
  ],
  password: [createValidationRules.required('请输入密码'), createValidationRules.length(6, 50, '密码长度为6-50个字符')],
})

// 计算属性
const isFormValid = computed(() => {
  const { username, password } = loginForm
  return username.trim() && password.trim()
})

// 方法
/**
 * 处理登录
 */
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true

    // 构造登录数据
    const loginData = {
      username: loginForm.username.trim(),
      password: loginForm.password.trim(),
      rememberMe: loginForm.rememberMe
    }


    // 调用登录接口
    const result = await authStore.login(loginData)

    if (result.success) {
      ElMessage.success('登录成功！')

      // 跳转到首页或原来要访问的页面
      const redirect = router.currentRoute.value.query.redirect || '/dashboard'
      await router.replace(redirect)
    } else {
      ElMessage.error(result.message || '登录失败，请检查用户名和密码')
    }
  } catch (error) {
    console.error('登录错误:', error)

    ElMessage.error(error.message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}




/**
 * 初始化页面
 */
const initPage = async () => {
  // 设置页面标题
  document.title = '管理员登录 - 图书管理系统'

  // 如果已经登录，直接跳转
  if (authStore.isAuthenticated) {
    const redirect = router.currentRoute.value.query.redirect || '/dashboard'
    await router.replace(redirect)
    return
  }

  // 初始化应用设置
  await appStore.initialize()

  // 从localStorage恢复用户名
  const savedUsername = localStorage.getItem('remember_username')
  if (savedUsername) {
    loginForm.username = savedUsername
    loginForm.rememberMe = true
  }
}

/**
 * 保存记住用户名
 */
const saveRememberMe = () => {
  if (loginForm.rememberMe && loginForm.username.trim()) {
    localStorage.setItem('remember_username', loginForm.username.trim())
  } else {
    localStorage.removeItem('remember_username')
  }
}

// 键盘事件处理
const handleKeydown = event => {
  if (event.key === 'Enter' && !loading.value) {
    handleLogin()
  }
}

// 生命周期
onMounted(() => {
  initPage()
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 监听表单变化，保存记住我状态
watch(() => [loginForm.username, loginForm.rememberMe], saveRememberMe)
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  min-height: 100vh;
  background: #fefefe;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;

  // 背景动画
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="90" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="30" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="60" r="1" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    animation: float 20s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(10deg);
  }
}

.login-wrapper {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25), 
              0 16px 32px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
  display: flex;
  animation: slideUp 0.8s ease-out;
  position: relative;
  
  // 边缘动画线条
  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 27px;
    background: linear-gradient(45deg, 
                var(--color-primary-400, #38bdf8) 0%,
                var(--color-primary-500, #0ea5e9) 25%,
                var(--color-primary-600, #0284c7) 50%,
                var(--color-primary-500, #0ea5e9) 75%,
                var(--color-primary-400, #38bdf8) 100%);
    background-size: 400% 400%;
    animation: borderFlow 4s ease-in-out infinite;
    z-index: -1;
    pointer-events: none;
  }
  
  // 内侧光晕效果
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.1);
    pointer-events: none;
    animation: innerGlow 6s ease-in-out infinite;
  }
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

.login-background {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.15)" points="0,1000 1000,600 1000,1000"/><polygon fill="rgba(255,255,255,0.08)" points="0,800 1000,200 1000,800"/></svg>');
    background-size: cover;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.3) 50%, 
                transparent 100%);
  }
}

.background-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.system-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  .title-icon {
    font-size: 48px;
    color: rgba(255, 255, 255, 0.9);
  }
}

.system-description {
  font-size: 18px;
  margin: 0 0 40px 0;
  opacity: 0.9;
  line-height: 1.6;
}

.features-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 300px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .feature-icon {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.9);
  }

  .feature-text {
    font-size: 14px;
    font-weight: 500;
  }
}

.login-form-container {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form-wrapper {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 2;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;

  .logo-icon {
    font-size: 32px;
    color: var(--color-primary, var(--el-color-primary));
  }

  .logo-text {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.login-form {
  .el-form-item {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .el-input {
    height: 48px;

    :deep(.el-input__wrapper) {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--color-primary-200, #bae6fd);
      background: rgba(255, 255, 255, 0.9);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        right: 100%;
        height: 2px;
        background: linear-gradient(90deg, 
                    transparent 0%,
                    var(--color-primary-400, #38bdf8) 50%,
                    transparent 100%);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        border-color: var(--color-primary-400, #38bdf8);
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-1px);
      }

      &.is-focus {
        box-shadow: 0 4px 16px rgba(var(--color-primary-500, 14), var(--color-primary-500, 165), var(--color-primary-500, 233), 0.25);
        border-color: var(--color-primary-500, #0ea5e9);
        background: rgba(255, 255, 255, 1);
        transform: translateY(-2px);
        
        &::before {
          left: 0;
          right: 0;
          animation: inputGlow 0.6s ease-out;
        }
      }
    }
  }
}


.login-options {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--color-primary-500, #0ea5e9) 0%, var(--color-primary-700, #0369a1) 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
    background: linear-gradient(135deg, var(--color-primary-400, #38bdf8) 0%, var(--color-primary-600, #0284c7) 100%);
  }

  &:active {
    transform: translateY(0);
  }
}


.login-footer {
  margin-top: 40px;
  text-align: center;

  .copyright {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin: 0;
  }
}

// 响应式设计
@include respond-to(tablet) {
  .login-wrapper {
    flex-direction: column;
    max-width: 500px;
    
    &::before {
      animation-duration: 3s;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 17px;
    }
    
    &::after {
      animation-duration: 4s;
    }
  }

  .login-background {
    padding: 40px 30px;
  }

  .system-title {
    font-size: 32px;
  }

  .features-list {
    grid-template-columns: 1fr;
  }

  .login-form-container {
    padding: 40px 30px;
  }
}

@include respond-to(mobile) {
  .login-container {
    padding: 10px;
  }

  .login-wrapper {
    border-radius: 15px;
    min-height: auto;
  }

  .login-background {
    padding: 30px 20px;
  }

  .system-title {
    font-size: 28px;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
