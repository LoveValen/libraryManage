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
            <div class="logo">
              <el-icon class="logo-icon">
                <Reading />
              </el-icon>
              <span class="logo-text">图书管理系统</span>
            </div>
            <h2 class="login-title">管理员登录</h2>
            <p class="login-subtitle">Welcome back! Please login to your account.</p>
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

            <el-form-item prop="captcha" v-if="showCaptcha">
              <div class="captcha-container">
                <el-input
                  v-model="loginForm.captcha"
                  placeholder="请输入验证码"
                  clearable
                  :disabled="loading"
                  autocomplete="off"
                >
                  <template #prefix>
                    <el-icon>
                      <Key />
                    </el-icon>
                  </template>
                </el-input>
                <div class="captcha-image" @click="refreshCaptcha">
                  <img :src="captchaUrl" alt="验证码" />
                  <div class="captcha-refresh">
                    <el-icon>
                      <Refresh />
                    </el-icon>
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item>
              <div class="login-options">
                <el-checkbox v-model="loginForm.rememberMe" :disabled="loading">记住我</el-checkbox>
                <el-button type="text" class="forgot-password" @click="handleForgotPassword" :disabled="loading">
                  忘记密码？
                </el-button>
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

          <!-- 其他登录方式 -->
          <div class="other-login" v-if="enableOtherLogin">
            <el-divider>
              <span class="divider-text">其他登录方式</span>
            </el-divider>
            <div class="social-login">
              <el-button class="social-button github" @click="handleSocialLogin('github')" :disabled="loading">
                <el-icon>
                  <Platform />
                </el-icon>
                GitHub
              </el-button>
              <el-button class="social-button wechat" @click="handleSocialLogin('wechat')" :disabled="loading">
                <el-icon>
                  <ChatDotRound />
                </el-icon>
                微信
              </el-button>
            </div>
          </div>

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

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// 响应式数据
const loginFormRef = ref()
const loading = ref(false)
const showCaptcha = ref(false)
const captchaUrl = ref('')
const enableOtherLogin = ref(true)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  captcha: '',
  rememberMe: false
})

// 系统特性展示
const features = ref([
  { icon: 'Management', text: '智能管理' },
  { icon: 'DataAnalysis', text: '数据分析' },
  { icon: 'Shield', text: '安全可靠' },
  { icon: 'Connection', text: '云端同步' }
])

// 表单验证规则
const loginRules = reactive({
  username: [
    createValidationRules.required('请输入用户名'),
    createValidationRules.length(3, 20, '用户名长度为3-20个字符')
  ],
  password: [createValidationRules.required('请输入密码'), createValidationRules.length(6, 50, '密码长度为6-50个字符')],
  captcha: showCaptcha.value
    ? [createValidationRules.required('请输入验证码'), createValidationRules.length(4, 6, '验证码长度为4-6个字符')]
    : []
})

// 计算属性
const isFormValid = computed(() => {
  const { username, password, captcha } = loginForm
  const basicValid = username.trim() && password.trim()
  return showCaptcha.value ? basicValid && captcha.trim() : basicValid
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

    // 如果需要验证码，添加验证码
    if (showCaptcha.value) {
      loginData.captcha = loginForm.captcha.trim()
    }

    // 调用登录接口
    const result = await authStore.login(loginData)

    if (result.success) {
      ElMessage.success('登录成功！')

      // 跳转到首页或原来要访问的页面
      const redirect = router.currentRoute.value.query.redirect || '/dashboard'
      await router.replace(redirect)
    } else {
      // 登录失败，可能需要验证码
      if (result.needCaptcha) {
        showCaptcha.value = true
        await refreshCaptcha()
      }

      ElMessage.error(result.message || '登录失败，请检查用户名和密码')
    }
  } catch (error) {
    console.error('登录错误:', error)

    // 检查是否需要验证码
    if (error.response?.status === 429 || error.needCaptcha) {
      showCaptcha.value = true
      await refreshCaptcha()
      ElMessage.warning('登录失败次数过多，请输入验证码')
    } else {
      ElMessage.error(error.message || '登录失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 刷新验证码
 */
const refreshCaptcha = async () => {
  try {
    const timestamp = Date.now()
    captchaUrl.value = `/api/auth/captcha?t=${timestamp}`
  } catch (error) {
    console.error('获取验证码失败:', error)
    ElMessage.error('获取验证码失败')
  }
}

/**
 * 处理忘记密码
 */
const handleForgotPassword = () => {
  ElMessage.info('请联系系统管理员重置密码')
  // 可以打开忘记密码对话框或跳转到重置页面
}

/**
 * 处理第三方登录
 */
const handleSocialLogin = platform => {
  ElMessage.info(`${platform} 登录功能正在开发中`)
  // 实现第三方登录逻辑
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
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
  display: flex;
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

.login-background {
  flex: 1;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.1)" points="0,1000 1000,600 1000,1000"/><polygon fill="rgba(255,255,255,0.05)" points="0,800 1000,200 1000,800"/></svg>');
    background-size: cover;
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
    color: var(--el-color-primary);
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
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.is-focus {
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      }
    }
  }
}

.captcha-container {
  display: flex;
  gap: 12px;
  align-items: center;

  .el-input {
    flex: 1;
  }
}

.captcha-image {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);

    .captcha-refresh {
      opacity: 1;
    }
  }

  img {
    width: 100px;
    height: 48px;
    display: block;
  }

  .captcha-refresh {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;

    .el-icon {
      color: white;
      font-size: 18px;
    }
  }
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .forgot-password {
    padding: 0;
    font-size: 14px;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, #5d73e7 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.4);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(64, 158, 255, 0.5);
  }

  &:active {
    transform: translateY(0);
  }
}

.other-login {
  margin-top: 30px;

  .divider-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.social-login {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.social-button {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;

  &.github {
    background: #333;
    border-color: #333;
    color: white;

    &:hover {
      background: #444;
      border-color: #444;
    }
  }

  &.wechat {
    background: #1aad19;
    border-color: #1aad19;
    color: white;

    &:hover {
      background: #179b16;
      border-color: #179b16;
    }
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

  .login-form-container {
    padding: 30px 20px;
  }

  .social-login {
    flex-direction: column;
  }
}
</style>
