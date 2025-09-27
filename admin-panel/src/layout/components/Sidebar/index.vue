<template>
  <div class="sidebar-container">
    <div class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
      <!-- Logo -->
      <div class="sidebar-logo">
        <router-link to="/" class="logo-link">
          <el-icon v-if="collapsed" class="logo-icon-mini" size="24"><Reading /></el-icon>
          <div v-else class="logo-content">
            <el-icon class="logo-icon" size="32"><Reading /></el-icon>
            <h1 class="logo-title">图书馆管理</h1>
          </div>
        </router-link>
      </div>

      <!-- 菜单 -->
      <el-scrollbar class="sidebar-menu-container">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          :unique-opened="true"
          :collapse-transition="false"
          mode="vertical"
          background-color="transparent"
          text-color="var(--sidebar-text-color)"
          active-text-color="var(--sidebar-text-hover-color)"
          @select="handleMenuSelect"
        >
          <SidebarItem
            v-for="route in routes"
            :key="route.path"
            :item="route"
            :base-path="route.path"
            :collapsed="collapsed"
          />
        </el-menu>
      </el-scrollbar>
    </div>

    <!-- 移动端遮罩 -->
    <div v-if="isMobile && sidebarOpened" class="sidebar-mask" @click="closeSidebar" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Reading } from '@element-plus/icons-vue'
import SidebarItem from './SidebarItem.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 计算属性
const collapsed = computed(() => appStore.sidebarCollapsed)
const sidebarOpened = computed(() => appStore.sidebarOpened)
const isMobile = computed(() => appStore.isMobile)

// 获取路由列表（这里应该从路由配置或store中获取）
const routes = computed(() => {
  // 过滤掉隐藏的路由
  return appStore.routes.filter(route => !route.hidden)
})

// 当前激活的菜单
const activeMenu = computed(() => {
  const { meta, path } = route
  if (meta.activeMenu) {
    return meta.activeMenu
  }
  return path
})

// 方法
const toggleSidebar = () => {
  appStore.toggleSidebar()
}

const closeSidebar = () => {
  appStore.closeSidebar()
}

const handleMenuSelect = index => {
  if (index !== route.path) {
    router.push(index)
  }

  // 移动端选择菜单后关闭侧边栏
  if (isMobile.value) {
    closeSidebar()
  }
}
</script>

<style lang="scss" scoped>
.sidebar-container {
  position: relative;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--sidebar-bg-color);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;

  &--collapsed {
    width: var(--sidebar-collapsed-width);
  }

  @include respond-to(mobile) {
    transform: translateX(-100%);
    transition: transform 0.3s ease;

    &.sidebar--opened {
      transform: translateX(0);
    }
  }
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  .logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--sidebar-text-hover-color);
    padding: 0 16px;
    width: 100%;
    transition: all 0.3s ease;

    .logo-content {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .logo-icon,
    .logo-icon-mini {
      color: var(--sidebar-text-hover-color);
      flex-shrink: 0;
      transition: color 0.3s ease;
    }

    .logo-icon-mini {
      display: flex;
      justify-content: center;
      width: 100%;
      font-size: 28px;
    }

    .logo-title {
      margin-left: 12px;
      font-size: 18px;
      font-weight: 600;
      white-space: nowrap;
      transition: opacity 0.3s ease;
    }
  }
}

.sidebar-menu-container {
  flex: 1;

  :deep(.el-scrollbar__view) {
    height: 100%;
  }

  .el-menu {
    border: none;
    height: 100%;

    .el-menu-item,
    .el-submenu__title {
      height: 48px;
      line-height: 48px;
      color: var(--sidebar-text-color);
      border-bottom: none;

      &:hover:not(.is-active) {
        background-color: var(--sidebar-menu-hover-bg) !important;
        color: var(--sidebar-text-hover-color);
      }

      .el-icon {
        color: inherit;
        width: 20px;
      }
    }

    .el-menu-item.is-active {
      background-color: var(--sidebar-menu-active-bg) !important;
      color: var(--sidebar-text-hover-color);

      &::before {
        content: '';
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);
      }
    }

    .el-submenu {
      .el-menu-item {
        padding-left: 56px !important;

        &.is-active {
          background-color: var(--sidebar-menu-active-bg) !important;
        }
      }
    }

    // 折叠状态下的样式
    &.el-menu--collapse {
      .el-menu-item,
      .el-submenu__title {
        text-align: center;
        padding: 0 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;

        .el-icon {
          margin-right: 0;
          font-size: 20px;
        }

        .menu-icon {
          margin-right: 0 !important;
        }

        span {
          display: none;
        }
      }

      // 子菜单在折叠状态下的特殊处理
      .el-submenu {
        .el-submenu__title {
          position: relative;

          &::after {
            content: '';
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 4px;
            background-color: var(--sidebar-text-hover-color);
            border-radius: 50%;
            opacity: 0.8;
          }

          &:hover::after {
            background-color: var(--sidebar-text-hover-color);
            opacity: 1;
          }
        }
      }

      // 活跃状态的菜单项
      .el-menu-item.is-active {
        position: relative;

        &::before {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);
        }
      }
    }
  }
}

.sidebar-toggle {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--sidebar-text-color);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    background-color: var(--sidebar-menu-hover-bg);
    color: var(--sidebar-text-hover-color);
  }

  &:active {
    background-color: var(--sidebar-menu-active-bg);
  }

  .el-icon {
    font-size: 18px;
    transition: transform 0.3s ease;
  }

  // 折叠状态下的动画效果
  .sidebar--collapsed & {
    .el-icon {
      transform: rotate(180deg);
    }
  }
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1000;

  @include respond-to(desktop) {
    display: none;
  }
}

// 强制隐藏所有菜单箭头图标
.sidebar {
  :deep(.el-menu--collapse) {
    .el-icon.el-sub-menu__icon-arrow {
      display: none;
    }
  }
}

// 当侧边栏打开时的样式
.sidebar-container {
  :global(.admin-layout.layout--sidebar-opened) & {
    .sidebar {
      @include respond-to(mobile) {
        transform: translateX(0);
      }
    }
  }
}
</style>
