<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition :name="transitionName" mode="out-in">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="key" />
        </keep-alive>
      </transition>
    </router-view>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

// 计算属性
const cachedViews = computed(() => appStore.cachedViews)

// 路由key，用于强制刷新组件
const key = computed(() => route.path)

// 过渡动画名称
const transitionName = ref('fade-slide')

// 记录上一个路由路径
let previousPath = null

// 监听路由变化，动态设置动画
watch(() => route.path, (newPath, oldPath) => {
  // 根据路由 meta 配置设置动画
  if (route.meta?.transition) {
    transitionName.value = route.meta.transition
  } else {
    // 根据路由变化方向决定动画
    // 从详情/编辑页返回列表页使用不同动画
    if (oldPath?.includes('/edit') || oldPath?.includes('/create') || oldPath?.includes('/detail')) {
      if (newPath?.includes('/list')) {
        transitionName.value = 'fade-slide-reverse'
      } else {
        transitionName.value = 'fade-slide'
      }
    } else {
      // 默认使用 fade-slide 动画
      transitionName.value = 'fade-slide'
    }
  }
  
  previousPath = oldPath
})

</script>

<style lang="scss" scoped>
.app-main {
  flex: 1;
  width: 100%;
  position: relative;
  overflow: auto;
  padding: 16px;
  background-color: var(--el-bg-color-page, #f2f3f5);
  min-height: 0;
  box-sizing: border-box;
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

<style lang="scss">
// 路由过渡动画样式 - 不使用 scoped 以确保动画生效

// Fade-slide 动画（默认）
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

// Fade 动画（纯淡入淡出）
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Slide-up 动画（从下往上滑入）
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

// Zoom 动画（缩放）
.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.zoom-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

// 无动画（用于需要即时切换的场景）
.none-enter-active,
.none-leave-active {
  transition: none;
}

// Fade-slide-reverse 动画（反向滑动，用于返回）
.fade-slide-reverse-enter-active,
.fade-slide-reverse-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-reverse-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

.fade-slide-reverse-leave-to {
  opacity: 0;
  transform: translateX(15px);
}

// Slide-down 动画（从上往下滑出，用于返回）
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

// 响应式动画调整 - 移动设备使用更快的动画
@media (max-width: 768px) {
  .fade-slide-enter-active,
  .fade-slide-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .zoom-enter-active,
  .zoom-leave-active {
    transition-duration: 0.2s;
  }
  
  // 减少移动距离，避免在小屏幕上动画过于明显
  .fade-slide-enter-from {
    transform: translateX(15px);
  }
  
  .fade-slide-leave-to {
    transform: translateX(-15px);
  }
  
  .slide-up-enter-from {
    transform: translateY(10px);
  }
  
  .slide-up-leave-to {
    transform: translateY(-10px);
  }
}

// 优化动画性能
.fade-slide-enter-active,
.fade-slide-leave-active,
.fade-enter-active,
.fade-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.zoom-enter-active,
.zoom-leave-active {
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

// 禁用动画偏好（用户系统设置）
@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active,
  .fade-enter-active,
  .fade-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .zoom-enter-active,
  .zoom-leave-active {
    transition: none !important;
  }
}
</style>
