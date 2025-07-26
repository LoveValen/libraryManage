<template>
  <div class="error-container">
    <div class="error-content">
      <!-- 404图标和动画 -->
      <div class="error-illustration">
        <div class="error-number">404</div>
        <div class="error-icon">
          <el-icon><DocumentDelete /></el-icon>
        </div>
      </div>

      <!-- 错误信息 -->
      <div class="error-info">
        <h1 class="error-title">页面不存在</h1>
        <p class="error-description">抱歉，您访问的页面不存在或已被删除。</p>
        <p class="error-suggestion">请检查网址是否正确，或者尝试以下操作：</p>

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
          <el-button type="success" @click="refresh">
            <el-icon><Refresh /></el-icon>
            刷新页面
          </el-button>
        </div>

        <!-- 搜索建议 -->
        <div class="search-suggestion">
          <p>或者搜索您想要的内容：</p>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索页面、功能..."
            class="search-input"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const searchKeyword = ref('')

// 方法
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

const refresh = () => {
  window.location.reload()
}

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    ElMessage.info('搜索功能开发中...')
    // 这里可以实现搜索逻辑
  } else {
    ElMessage.warning('请输入搜索关键词')
  }
}

// 设置页面标题
document.title = '页面不存在 - 图书管理系统'
</script>

<style lang="scss" scoped>
.error-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  max-width: 600px;
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
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.error-icon {
  font-size: 80px;
  color: #ff6b6b;
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
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

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 40px;

  .el-button {
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }
}

.search-suggestion {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 32px;

  p {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin: 0 0 16px 0;
  }

  .search-input {
    max-width: 300px;

    :deep(.el-input-group__append) {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);

      .el-button {
        background: transparent;
        border: none;
        color: white;
      }
    }
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
    font-size: 24px !important;
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
}
</style>
