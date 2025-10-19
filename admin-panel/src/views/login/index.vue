<template>
  <div class="login-container">
    <div class="particles"></div>
    <div class="particles-extra">
      <div class="particle" v-for="n in 20" :key="n" :style="getParticleStyle(n)"></div>
    </div>
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
import { ElLoading } from 'element-plus'
import { message } from '@/utils/message'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { createValidationRules } from '@/utils/validators'
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
    await authStore.login(loginData)
  } catch (error) {
    console.error('登录错误:', error)

    // 检查错误类型，避免重复显示已被拦截器处理的错误
    const errorMessage = error.message || ''
    const isNetworkError = errorMessage.includes('Network Error') || errorMessage.includes('网络连接失败')
    const isAlreadyHandled = errorMessage.includes('网络连接失败') ||
                            errorMessage.includes('请求超时') ||
                            errorMessage.includes('请求失败')

    // 只有在拦截器未处理的情况下才显示错误
    if (!isNetworkError && !isAlreadyHandled) {
      message.error(errorMessage || '登录失败，请稍后重试')
    }
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

// 生成粒子样式
const getParticleStyle = (index) => {
  // 生成随机位置
  const generateRandomPosition = () => ({
    left: Math.random() * 90 + 5 + '%',
    top: Math.random() * 90 + 5 + '%'
  })
  
  // 预定义位置 + 随机位置
  const basePositions = [
    { left: '10%', top: '20%' },
    { left: '85%', top: '15%' },
    { left: '25%', top: '70%' },
    { left: '70%', top: '60%' },
    { left: '5%', top: '80%' },
    { left: '90%', top: '75%' },
    { left: '50%', top: '10%' },
    { left: '15%', top: '45%' },
    { left: '75%', top: '30%' },
    { left: '30%', top: '85%' },
    { left: '60%', top: '25%' },
    { left: '20%', top: '55%' },
    { left: '80%', top: '90%' },
    { left: '40%', top: '15%' },
    { left: '95%', top: '50%' },
    { left: '12%', top: '65%' }
  ]
  
  const position = basePositions[index - 1] || generateRandomPosition()
  const size = Math.random() * 5 + 2 // 2-7px
  const delay = Math.random() * 20 // 0-20s
  
  return {
    left: position.left,
    top: position.top,
    width: size + 'px',
    height: size + 'px',
    animationDelay: delay + 's'
  }
}

// 监听表单变化，保存记住我状态
watch(() => [loginForm.username, loginForm.rememberMe], saveRememberMe)
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg,
              #f0f9ff 0%,
              #e0f2fe 25%,
              #bae6fd 50%,
              #7dd3fc 75%,
              #38bdf8 100%);
  background-size: 400% 400%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  animation: gradientShift 8s ease-in-out infinite;
  transition: background 0.3s ease;


  // 浮动粒子背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><pattern id="particles" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.15)" opacity="0.9"><animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite"/></circle><circle cx="13" cy="13" r="0.8" fill="rgba(56,189,248,0.2)" opacity="0.7"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="5s" repeatCount="indefinite"/></circle><circle cx="8" cy="12" r="0.6" fill="rgba(125,211,252,0.18)" opacity="0.6"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="7s" repeatCount="indefinite"/></circle><circle cx="5" cy="8" r="0.4" fill="rgba(255,255,255,0.12)" opacity="0.5"><animate attributeName="opacity" values="0.1;0.6;0.1" dur="9s" repeatCount="indefinite"/></circle><circle cx="11" cy="4" r="0.7" fill="rgba(14,165,233,0.16)" opacity="0.8"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="4s" repeatCount="indefinite"/></circle><circle cx="14" cy="7" r="0.3" fill="rgba(255,255,255,0.1)" opacity="0.4"><animate attributeName="opacity" values="0.1;0.5;0.1" dur="6s" repeatCount="indefinite"/></circle></pattern></defs><rect width="100" height="100" fill="url(%23particles)"/></svg>');
    animation: particleFloat 12s linear infinite;
    pointer-events: none;
    opacity: 0.8;
  }
  
  // 光晕效果
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, 
                rgba(255, 255, 255, 0.1) 0%, 
                rgba(255, 255, 255, 0.05) 30%, 
                transparent 70%);
    transform: translate(-50%, -50%);
    animation: pulse 4s ease-in-out infinite;
    pointer-events: none;
  }
  
  // 额外粒子层
  .particles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    
    &::before,
    &::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      animation: floatParticle1 15s linear infinite;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.7),
                  0 0 30px rgba(255, 255, 255, 0.4);
    }
    
    &::before {
      top: 20%;
      left: 10%;
      animation-delay: -2s;
    }
    
    &::after {
      top: 60%;
      right: 15%;
      animation-delay: -8s;
      animation-name: floatParticle2;
      background: rgba(56, 189, 248, 0.9);
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.8),
                  0 0 40px rgba(56, 189, 248, 0.5);
    }
  }
  
  // Vue循环生成的粒子
  .particles-extra {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    
    .particle {
      position: absolute;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      animation: randomFloat 18s linear infinite;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5),
                  0 0 20px rgba(255, 255, 255, 0.3);
      
      &:nth-child(2n) {
        background: rgba(56, 189, 248, 0.8);
        animation-name: randomFloat2;
        animation-duration: 22s;
        box-shadow: 0 0 15px rgba(56, 189, 248, 0.6),
                    0 0 30px rgba(56, 189, 248, 0.4);
      }
      
      &:nth-child(3n) {
        background: rgba(125, 211, 252, 0.85);
        animation-name: randomFloat3;
        animation-duration: 16s;
        box-shadow: 0 0 12px rgba(125, 211, 252, 0.7),
                    0 0 25px rgba(125, 211, 252, 0.4);
      }
      
      &:nth-child(4n) {
        background: linear-gradient(45deg, rgba(255,255,255,0.9), rgba(56,189,248,0.7));
        animation-name: sparkle;
        animation-duration: 20s;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                    0 0 40px rgba(56, 189, 248, 0.5);
      }
      
      &:nth-child(5n) {
        background: rgba(14, 165, 233, 0.7);
        box-shadow: 0 0 18px rgba(14, 165, 233, 0.8),
                    0 0 35px rgba(14, 165, 233, 0.4);
      }
    }
  }
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(0px) translateX(0px);
  }
  25% {
    transform: translateY(-10px) translateX(5px);
  }
  50% {
    transform: translateY(-5px) translateX(-3px);
  }
  75% {
    transform: translateY(-15px) translateX(8px);
  }
  100% {
    transform: translateY(0px) translateX(0px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.15;
  }
}

@keyframes borderFlow {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes innerGlow {
  0%, 100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.2;
  }
}

@keyframes inputGlow {
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
}

@keyframes floatParticle1 {
  0% {
    transform: translateY(0px) translateX(0px) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  20% {
    transform: translateY(-50px) translateX(30px) scale(1.2);
  }
  40% {
    transform: translateY(-120px) translateX(-20px) scale(0.8);
  }
  60% {
    transform: translateY(-180px) translateX(40px) scale(1.1);
  }
  80% {
    transform: translateY(-240px) translateX(-10px) scale(0.9);
    opacity: 1;
  }
  100% {
    transform: translateY(-300px) translateX(20px) scale(1);
    opacity: 0;
  }
}

@keyframes floatParticle2 {
  0% {
    transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  25% {
    transform: translateY(-60px) translateX(-40px) scale(1.3) rotate(45deg);
  }
  45% {
    transform: translateY(-140px) translateX(25px) scale(0.7) rotate(90deg);
  }
  65% {
    transform: translateY(-200px) translateX(-30px) scale(1.2) rotate(180deg);
  }
  85% {
    transform: translateY(-280px) translateX(15px) scale(0.8) rotate(270deg);
    opacity: 0.6;
  }
  100% {
    transform: translateY(-350px) translateX(-20px) scale(1) rotate(360deg);
    opacity: 0;
  }
}

@keyframes randomFloat {
  0% {
    transform: translateY(100vh) translateX(0px) scale(0.5);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  30% {
    transform: translateY(70vh) translateX(50px) scale(1);
  }
  50% {
    transform: translateY(40vh) translateX(-30px) scale(0.8);
  }
  70% {
    transform: translateY(20vh) translateX(40px) scale(1.2);
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-10vh) translateX(-20px) scale(0.3);
    opacity: 0;
  }
}

@keyframes randomFloat2 {
  0% {
    transform: translateY(100vh) translateX(0px) scale(0.3) rotate(0deg);
    opacity: 0;
  }
  15% {
    opacity: 0.9;
  }
  35% {
    transform: translateY(65vh) translateX(-40px) scale(1.1) rotate(120deg);
  }
  55% {
    transform: translateY(35vh) translateX(60px) scale(0.6) rotate(240deg);
  }
  75% {
    transform: translateY(15vh) translateX(-50px) scale(1.3) rotate(300deg);
  }
  95% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(-15vh) translateX(30px) scale(0.4) rotate(360deg);
    opacity: 0;
  }
}

@keyframes randomFloat3 {
  0% {
    transform: translateY(100vh) translateX(0px) scale(0.8);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translateY(75vh) translateX(20px) scale(1.2);
  }
  40% {
    transform: translateY(50vh) translateX(-35px) scale(0.9);
  }
  60% {
    transform: translateY(25vh) translateX(45px) scale(1.4);
  }
  80% {
    transform: translateY(5vh) translateX(-25px) scale(0.7);
    opacity: 0.9;
  }
  100% {
    transform: translateY(-20vh) translateX(15px) scale(0.2);
    opacity: 0;
  }
}

@keyframes sparkle {
  0% {
    transform: translateY(100vh) translateX(0px) scale(0.2) rotate(0deg);
    opacity: 0;
    filter: brightness(1);
  }
  10% {
    opacity: 1;
    filter: brightness(1.5);
  }
  25% {
    transform: translateY(70vh) translateX(30px) scale(1.5) rotate(90deg);
    filter: brightness(2);
  }
  50% {
    transform: translateY(40vh) translateX(-20px) scale(0.8) rotate(180deg);
    filter: brightness(1.2);
  }
  75% {
    transform: translateY(15vh) translateX(35px) scale(1.8) rotate(270deg);
    filter: brightness(1.8);
  }
  90% {
    opacity: 0.8;
    filter: brightness(1);
  }
  100% {
    transform: translateY(-25vh) translateX(-15px) scale(0.1) rotate(360deg);
    opacity: 0;
    filter: brightness(0.5);
  }
}

.login-wrapper {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25), 
              0 16px 32px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
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
  border-radius: 8px;
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
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .el-input {
    height: 48px;

    :deep(.el-input__wrapper) {
      border-radius: 8px;
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
  border-radius: 8px;
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

<style lang="scss">
// 深色主题登录页面样式 - 非scoped
[data-theme="dark"] .login-container,
.dark .login-container {
  background: linear-gradient(135deg,
              #0a0a0a 0%,
              #1a1a1a 25%,
              #2a2a2a 50%,
              #1e293b 75%,
              #334155 100%) !important;
}
</style>
