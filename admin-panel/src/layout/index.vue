<template>
  <div class="admin-layout" :class="layoutClasses">
    <!-- 侧边栏 -->
    <Sidebar />

    <!-- 主内容区域 -->
    <div class="layout-main">
      <!-- 头部导航 -->
      <NavHeader />

      <!-- 标签页 -->
      <TagsView v-if="showTagsView" />

      <!-- 页面内容 -->
      <AppMain />
    </div>

    <!-- 设置抽屉 -->
    <Settings />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import Sidebar from './components/Sidebar/index.vue'
import NavHeader from './components/NavHeader/index.vue'
import TagsView from './components/TagsView/index.vue'
import AppMain from './components/AppMain/index.vue'
import Settings from './components/Settings/index.vue'

const appStore = useAppStore()

// 计算属性
const layoutClasses = computed(() => {
  return {
    'layout--mobile': appStore.isMobile,
    'layout--tablet': appStore.isTablet,
    'layout--sidebar-collapsed': appStore.sidebarCollapsed,
    'layout--sidebar-opened': appStore.sidebarOpened
  }
})

const showTagsView = computed(() => {
  // 可以通过配置控制是否显示标签页
  return true
})
</script>

<style lang="scss" scoped>
.admin-layout {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.layout-main {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: var(--sidebar-width, 200px);
  display: flex;
  flex-direction: column;
  background-color: var(--content-bg-color, #f5f7fa);
  overflow: hidden;
  transition: left 0.3s ease;
}

// 侧边栏状态处理
.admin-layout {
  &.layout--sidebar-collapsed {
    .layout-main {
      left: var(--sidebar-collapsed-width, 64px);
    }
  }

  &.layout--mobile {
    .layout-main {
      left: 0;
    }
  }
}

// 响应式布局
@include respond-to(mobile) {
  .admin-layout {
    .layout-main {
      left: 0 !important;
    }
  }
}
</style>
