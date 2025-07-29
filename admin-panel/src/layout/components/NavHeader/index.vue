<template>
  <div class="nav-header">
    <div class="nav-header-left">
      <!-- 菜单折叠按钮 -->
      <div class="hamburger-container" @click="toggleSideBar">
        <el-icon class="hamburger" :class="{ 'is-active': !sidebar.opened }">
          <component :is="sidebar.opened ? 'Fold' : 'Expand'" />
        </el-icon>
      </div>

      <!-- 面包屑导航 -->
      <Breadcrumb class="breadcrumb-container" />
    </div>

    <div class="nav-header-right">
      <!-- 搜索 -->
      <div class="header-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索菜单..."
          prefix-icon="Search"
          size="small"
          clearable
          @input="handleSearch"
          @clear="handleSearchClear"
        />
      </div>

      <!-- 通知 -->
      <el-popover
        placement="bottom"
        :width="380"
        trigger="click"
        popper-class="notification-popover"
        :show-arrow="false"
        :offset="8"
        persistent
      >
        <template #reference>
          <div class="header-item notification-trigger">
            <el-badge :value="notificationCount" :hidden="notificationCount === 0">
              <el-icon class="header-icon">
                <Bell />
              </el-icon>
            </el-badge>
          </div>
        </template>
        <NotificationPanel ref="notificationPanelRef" />
      </el-popover>

      <!-- 全屏切换 -->
      <div class="header-item">
        <el-icon class="header-icon" @click="toggleFullscreen">
          <component :is="isFullscreen ? 'Aim' : 'FullScreen'" />
        </el-icon>
      </div>

      <!-- 主题切换 -->
      <div class="header-item">
        <el-icon class="header-icon" @click="toggleTheme">
          <component :is="theme === 'light' ? 'Moon' : 'Sunny'" />
        </el-icon>
      </div>

      <!-- 语言切换 -->
      <el-dropdown class="header-item" @command="handleLanguageChange">
        <div class="language-selector">
          <el-icon class="header-icon">
            <Translate />
          </el-icon>
          <span class="language-text">{{ currentLanguage.label }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="lang in languages"
              :key="lang.value"
              :command="lang.value"
              :class="{ 'is-active': language === lang.value }"
            >
              {{ lang.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 用户信息 -->
      <el-dropdown class="user-dropdown" @command="handleUserCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="userAvatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <span class="user-name">{{ userName }}</span>
          <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人资料
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-dropdown-item>
            <el-dropdown-item command="help">
              <el-icon><QuestionFilled /></el-icon>
              帮助中心
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import Breadcrumb from './Breadcrumb.vue'
import NotificationPanel from './NotificationPanel.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// 响应式数据
const searchKeyword = ref('')
const notificationPanelRef = ref()
const isFullscreen = ref(false)

// 计算属性
const sidebar = computed(() => ({
  opened: appStore.sidebarOpened
}))

const userName = computed(() => authStore.userName)
const userAvatar = computed(() => authStore.userAvatar)
const theme = computed(() => appStore.theme)
const language = computed(() => appStore.language)

// 通知数量计算属性
const notificationCount = computed(() => {
  return notificationPanelRef.value?.unreadCount || 0
})

// 语言选项
const languages = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const currentLanguage = computed(() => {
  return languages.find(lang => lang.value === language.value) || languages[0]
})

// 方法
const toggleSideBar = () => {
  appStore.toggleSidebar()
}

const handleSearch = value => {
  if (value.trim()) {
    // 实现菜单搜索逻辑
    console.log('搜索菜单:', value)
  }
}

const handleSearchClear = () => {
  searchKeyword.value = ''
}


const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
      isFullscreen.value = false
    }
  }
}

const toggleTheme = () => {
  appStore.toggleTheme()
}

const handleLanguageChange = lang => {
  appStore.setLanguage(lang)
}

const handleUserCommand = async command => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'help':
      window.open('https://help.example.com', '_blank')
      break
    case 'logout':
      await handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await authStore.logout()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出登录失败:', error)
    }
  }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})
</script>

<style lang="scss" scoped>
.nav-header {
  width: 100%;
  height: 60px;
  line-height: 60px;
  position: relative;
  background: var(--header-bg-color, #ffffff);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 999;
  flex-shrink: 0;
  box-sizing: border-box;
}

.nav-header-left {
  display: flex;
  align-items: center;

  .hamburger-container {
    line-height: 58px;
    height: 100%;
    float: left;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .hamburger {
      display: inline-block;
      vertical-align: middle;
      width: 20px;
      height: 20px;
      font-size: 18px;
      color: var(--el-text-color-primary);
      transition: transform 0.3s;

      &.is-active {
        transform: rotate(180deg);
      }
    }
  }

  .breadcrumb-container {
    margin-left: 20px;
  }
}

.nav-header-right {
  display: flex;
  align-items: center;
  gap: 16px;

  .header-search {
    .el-input {
      width: 200px;
    }
  }

  .header-item {
    height: 60px;
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 0 8px;
    transition: background-color 0.3s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .header-icon {
      font-size: 18px;
      color: var(--el-text-color-primary);
    }

  }

  .language-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;

    .language-text {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }
  }

  .user-dropdown {
    cursor: pointer;

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      height: 60px;
      transition: background-color 0.3s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .user-name {
        font-size: 14px;
        color: var(--el-text-color-primary);
        font-weight: 500;
      }

      .dropdown-icon {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        transition: transform 0.3s;
      }
    }

    &:hover .dropdown-icon {
      transform: rotate(180deg);
    }
  }
}

// 响应式设计
@include respond-to(mobile) {
  .nav-header {
    padding: 0 16px;

    .nav-header-right {
      gap: 8px;

      .header-search {
        display: none;
      }

      .language-selector .language-text {
        display: none;
      }

      .user-info .user-name {
        display: none;
      }
    }
  }
}

// 下拉菜单项样式
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;

  &.is-active {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

// 通知弹窗样式
:deep(.notification-popover) {
  padding: 0 !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid var(--el-border-color-light) !important;
  background: var(--el-bg-color) !important;
  max-height: 500px !important;
  overflow: hidden !important;
  z-index: 2000 !important;
  
  .el-popover__arrow {
    display: none !important;
  }
}

// 通知触发器样式优化
.notification-trigger {
  position: relative;
  .el-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    
    :deep(.el-badge__content) {
      background-color: var(--el-color-danger) !important;
      border: 2px solid var(--header-bg-color, #ffffff) !important;
      font-size: 10px !important;
      height: 16px !important;
      min-width: 16px !important;
      line-height: 12px !important;
      padding: 0 4px !important;
      top: -5px !important;
      right: 0px !important;
      z-index: 10 !important;
    }
  }
}
</style>
