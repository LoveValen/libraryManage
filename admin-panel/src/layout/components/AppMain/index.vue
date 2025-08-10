<template>
  <section class="app-main">
    <router-view v-slot="{ Component }">
      <transition name="fade-transform" mode="out-in">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="key" />
        </keep-alive>
      </transition>
    </router-view>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

// 计算属性
const cachedViews = computed(() => appStore.cachedViews)

// 路由key，用于强制刷新组件
const key = computed(() => route.path)
</script>

<style lang="scss" scoped>
.app-main {
  flex: 1;
  width: 100%;
  position: relative;
  overflow: auto;
  padding: 16px;
  background-color: var(--content-bg-color, #f5f7fa);
  min-height: 0;
  box-sizing: border-box;
}

// 页面切换动画
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

// 响应式调整
@include respond-to(mobile) {
  .app-main {
    padding: 12px;
  }
}

@include respond-to(tablet) {
  .app-main {
    padding: 14px;
  }
}
</style>
