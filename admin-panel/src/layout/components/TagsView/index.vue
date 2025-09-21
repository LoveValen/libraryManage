<template>
  <div class="tags-view-container">
    <el-scrollbar ref="scrollContainer" class="tags-view-wrapper" tag="div">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :class="isActive(tag) ? 'active' : ''"
        :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
        class="tags-view-item"
        @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : ''"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ tag.title }}
        <el-icon v-if="!isAffix(tag)" class="tag-close-icon" @click.prevent.stop="closeSelectedTag(tag)">
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>

    <!-- 右键菜单 -->
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">
        <el-icon><Refresh /></el-icon>
        刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <el-icon><Close /></el-icon>
        关闭当前
      </li>
      <li @click="closeOthersTags">
        <el-icon><CircleClose /></el-icon>
        关闭其他
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <el-icon><Back /></el-icon>
        关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <el-icon><Right /></el-icon>
        关闭右侧
      </li>
      <li @click="closeAllTags(selectedTag)">
        <el-icon><CircleCloseFilled /></el-icon>
        关闭所有
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref({})
const affixTags = ref([])
const scrollContainer = ref(null)

// 计算属性
const visitedViews = computed(() => appStore.visitedViews)

// 生命周期
onMounted(() => {
  initTags()
  addTags()
})

// 监听器
watch(route, () => {
  addTags()
  moveToCurrentTag()
})

watch(visible, value => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

// 方法
const isActive = tag => {
  return tag.path === route.path
}

const isAffix = tag => {
  return tag.affix
}

const isFirstView = () => {
  try {
    return selectedTag.value.fullPath === visitedViews.value[1].fullPath || selectedTag.value.fullPath === '/dashboard'
  } catch (err) {
    return false
  }
}

const isLastView = () => {
  try {
    return selectedTag.value.fullPath === visitedViews.value[visitedViews.value.length - 1].fullPath
  } catch (err) {
    return false
  }
}

const filterAffixTags = (routes, basePath = '/') => {
  let tags = []
  routes.forEach(route => {
    if (route.meta && route.meta.affix) {
      // 确保路径始终以 / 开头
      const tagPath = basePath === '/'
        ? `/${route.path}`.replace(/\/+/g, '/')
        : `${basePath}/${route.path}`.replace(/\/+/g, '/')
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: route.name,
        meta: { ...route.meta }
      })
    }
    if (route.children) {
      // 确保传递的basePath以/开头
      const childBasePath = route.path.startsWith('/') ? route.path : `/${route.path}`
      const tempTags = filterAffixTags(route.children, childBasePath)
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags]
      }
    }
  })
  return tags
}

const initTags = () => {
  const routes = appStore.routes
  affixTags.value = filterAffixTags(routes)

  for (const tag of affixTags.value) {
    if (tag.name) {
      appStore.addVisitedView(tag)
    }
  }
}

const addTags = () => {
  const { name } = route
  if (name) {
    appStore.addVisitedView(route)
    appStore.addCachedView(route)
  }
  return false
}

const moveToCurrentTag = () => {
  nextTick(() => {
    const tags = document.querySelectorAll('.tags-view-item')
    for (const tag of tags) {
      if (tag.to && tag.to.path === route.path) {
        scrollContainer.value.scrollToElement(tag)

        if (tag.to.fullPath !== route.fullPath) {
          appStore.updateVisitedView(route)
        }
        break
      }
    }
  })
}

const refreshSelectedTag = view => {
  appStore.delCachedView(view)
  nextTick(() => {
    router.replace({
      path: '/redirect' + view.fullPath
    })
  })
}

const closeSelectedTag = view => {
  appStore.delVisitedView(view)
  appStore.delCachedView(view)

  if (isActive(view)) {
    toLastView(visitedViews.value, view)
  }
}

const closeRightTags = () => {
  appStore.delRightTags(selectedTag.value)
  if (!visitedViews.value.find(i => i.fullPath === route.fullPath)) {
    toLastView(visitedViews.value)
  }
}

const closeLeftTags = () => {
  appStore.delLeftTags(selectedTag.value)
  if (!visitedViews.value.find(i => i.fullPath === route.fullPath)) {
    toLastView(visitedViews.value)
  }
}

const closeOthersTags = () => {
  router.push(selectedTag.value)
  appStore.delOthersVisitedViews(selectedTag.value)
  appStore.delOthersCachedViews(selectedTag.value)
  moveToCurrentTag()
}

const closeAllTags = view => {
  appStore.delAllVisitedViews()
  appStore.delAllCachedViews()

  if (affixTags.value.some(tag => tag.path === view.path)) {
    return
  }
  toLastView(visitedViews.value, view)
}

const toLastView = (visitedViews, view) => {
  const latestView = visitedViews.slice(-1)[0]
  if (latestView) {
    router.push(latestView.fullPath)
  } else {
    if (view.name === 'Dashboard') {
      router.replace({ path: '/redirect/dashboard' })
    } else {
      router.push('/')
    }
  }
}

const openMenu = (tag, e) => {
  const menuMinWidth = 105
  const offsetLeft = scrollContainer.value.$el.getBoundingClientRect().left
  const offsetWidth = scrollContainer.value.$el.offsetWidth
  const maxLeft = offsetWidth - menuMinWidth
  const leftPos = e.clientX - offsetLeft + 15

  if (leftPos > maxLeft) {
    left.value = maxLeft
  } else {
    left.value = leftPos
  }

  top.value = e.clientY
  visible.value = true
  selectedTag.value = tag
}

const closeMenu = () => {
  visible.value = false
}
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 40px;
  width: 100%;
  background: var(--tabs-bg-color, #ffffff);
  border-bottom: 1px solid var(--tabs-border-color, #e4e7ed);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  flex-shrink: 0;

  .tags-view-wrapper {
    .tags-view-item {
      display: inline-block;
      position: relative;
      cursor: pointer;
      height: 32px;
      line-height: 32px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      color: var(--el-text-color-primary);
      background: var(--el-bg-color);
      padding: 0 12px;
      font-size: 12px;
      margin-left: 5px;
      margin-top: 4px;
      text-decoration: none;
      transition: all 0.3s ease;

      &:first-of-type {
        margin-left: 15px;
      }

      &:last-of-type {
        margin-right: 15px;
      }

      &.active {
        background-color: var(--el-color-primary);
        color: #fff;
        border-color: var(--el-color-primary);

        &::before {
          content: '';
          background: #fff;
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
          margin-right: 4px;
        }

        .tag-close-icon {
          color: #fff;

          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
        }
      }

      &:hover:not(.active) {
        color: var(--el-color-primary);
      }

      .tag-close-icon {
        width: 16px;
        height: 16px;
        margin-left: 4px;
        border-radius: 50%;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
        transform-origin: 100% 50%;

        &:hover {
          background-color: var(--el-fill-color);
        }
      }
    }
  }

  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-primary);
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);

    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;

      &:hover {
        background: var(--el-fill-color-light);
      }
    }
  }
}

// 移动端适配
@include respond-to(mobile) {
  .tags-view-container {
    height: 35px;

    .tags-view-wrapper {
      .tags-view-item {
        height: 28px;
        line-height: 28px;
        margin-top: 3px;
        padding: 0 8px;
        font-size: 11px;

        .tag-close-icon {
          width: 14px;
          height: 14px;
        }
      }
    }
  }
}
</style>
