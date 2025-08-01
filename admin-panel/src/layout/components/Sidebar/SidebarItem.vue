<template>
  <div v-if="!item.hidden && !(item.meta && item.meta.hidden)">
    <!-- 单个菜单项 -->
    <template
      v-if="
        hasOneShowingChild(item.children, item) &&
        (!onlyOneChild.children || onlyOneChild.noShowingChildren) &&
        !item.alwaysShow
      "
    >
      <AppLink v-if="onlyOneChild.meta" :to="resolvePath(onlyOneChild.path)">
        <ElMenuItem :index="resolvePath(onlyOneChild.path)" :class="{ 'submenu-title-noDropdown': !isNest }">
          <ItemIcon v-if="onlyOneChild.meta.icon" :icon="onlyOneChild.meta.icon" />
          <template #title>
            <span>{{ onlyOneChild.meta.title }}</span>
          </template>
        </ElMenuItem>
      </AppLink>
    </template>

    <!-- 多级菜单 -->
    <ElSubMenu v-else ref="subMenu" :index="resolvePath(item.path)" popper-append-to-body>
      <template #title>
        <ItemIcon v-if="item.meta && item.meta.icon" :icon="item.meta.icon" />
        <span>{{ item.meta.title }}</span>
      </template>

      <SidebarItem
        v-for="child in visibleChildren"
        :key="child.path"
        :is-nest="true"
        :item="child"
        :base-path="resolvePath(child.path)"
        class="nest-menu"
      />
    </ElSubMenu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMenuItem, ElSubMenu } from 'element-plus'
import { isExternal } from '@/utils/validate'
import AppLink from './AppLink.vue'
import ItemIcon from './ItemIcon.vue'

const props = defineProps({
  // 路由对象
  item: {
    type: Object,
    required: true
  },
  // 是否嵌套
  isNest: {
    type: Boolean,
    default: false
  },
  // 基础路径
  basePath: {
    type: String,
    default: ''
  }
})

const onlyOneChild = ref({})

// 计算属性：过滤掉隐藏的子菜单
const visibleChildren = computed(() => {
  if (!props.item.children) return []

  const filtered = props.item.children.filter(child => {
    // 检查路由本身的 hidden 属性或 meta.hidden
    const isHidden = child.hidden || (child.meta && child.meta.hidden)

    // 开发模式下输出调试信息
    if (import.meta.env.DEV && isHidden) {
      console.log(`Hiding menu item: ${child.path}`, { hidden: child.hidden, metaHidden: child.meta?.hidden })
    }

    return !isHidden
  })

  return filtered
})

/**
 * 检查是否只有一个显示的子菜单
 */
function hasOneShowingChild(children = [], parent) {
  const showingChildren = children.filter(item => {
    // 检查路由本身的 hidden 属性或 meta.hidden
    if (item.hidden || (item.meta && item.meta.hidden)) {
      return false
    } else {
      // 临时设置，用于判断是否只有一个子菜单
      onlyOneChild.value = item
      return true
    }
  })

  // 当只有一个子路由时，默认显示该子路由
  if (showingChildren.length === 1) {
    return true
  }

  // 如果没有子路由显示，则显示父路由
  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: '', noShowingChildren: true }
    return true
  }

  return false
}

/**
 * 解析路径
 */
function resolvePath(routePath) {
  if (isExternal(routePath)) {
    return routePath
  }

  if (isExternal(props.basePath)) {
    return props.basePath
  }

  // 简单的路径拼接，适用于前端路由
  if (props.basePath && !props.basePath.endsWith('/')) {
    return props.basePath + '/' + routePath
  }
  return (props.basePath || '') + routePath
}
</script>

<style lang="scss" scoped>
.nest-menu {
  :deep(.el-submenu__title) {
    padding-left: 56px !important;

    .el-submenu__icon-arrow {
      display: none;
    }
  }
}
</style>
