<template>
  <el-breadcrumb class="app-breadcrumb" separator="/">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
        <span v-if="item.redirect === 'noRedirect' || index === breadcrumbs.length - 1" class="no-redirect">
          {{ item.meta.title }}
        </span>
        <a v-else @click.prevent="handleLink(item)">
          {{ item.meta.title }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const breadcrumbs = ref([])

/**
 * 获取面包屑数据
 */
const getBreadcrumb = () => {
  // 过滤掉不在面包屑中显示的路由
  let matched = route.matched.filter(item => item.meta && item.meta.title)

  // 如果当前就是仪表板页面，直接显示仪表板
  if (route.path === '/dashboard' || route.name === 'Dashboard') {
    breadcrumbs.value = matched.filter(item => {
      return item.meta && item.meta.title && item.meta.breadcrumb !== false
    })
    return
  }

  const first = matched[0]

  // 如果第一个不是首页且不是仪表板路由，添加首页
  if (!isDashboard(first) && route.path !== '/dashboard') {
    matched = [{ path: '/dashboard', meta: { title: '仪表板' } }].concat(matched)
  }

  breadcrumbs.value = matched.filter(item => {
    return item.meta && item.meta.title && item.meta.breadcrumb !== false
  })
}

/**
 * 判断是否为首页
 */
const isDashboard = route => {
  const name = route && route.name
  if (!name) {
    return false
  }
  return name.trim().toLocaleLowerCase() === 'Dashboard'.toLocaleLowerCase()
}

/**
 * 处理面包屑点击
 */
const handleLink = item => {
  const { redirect, path } = item
  if (redirect) {
    router.push(redirect)
    return
  }
  router.push(path)
}

// 监听路由变化
watch(route, getBreadcrumb, { immediate: true })
</script>

<style lang="scss" scoped>
.app-breadcrumb.el-breadcrumb {
  display: inline-block;
  font-size: 14px;
  line-height: 50px;
  margin-left: 8px;

  .no-redirect {
    color: var(--el-text-color-secondary);
    cursor: text;
  }

  a {
    color: var(--el-text-color-regular);
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

// 面包屑过渡动画
.breadcrumb-enter-active,
.breadcrumb-leave-active {
  transition: all 0.5s;
}

.breadcrumb-enter-from,
.breadcrumb-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.breadcrumb-leave-active {
  position: absolute;
}
</style>
