<template>
  <el-icon v-if="isIconComponent" class="menu-icon">
    <component :is="icon" />
  </el-icon>

  <i v-else-if="isClassIcon" :class="icon" class="menu-icon" />

  <el-icon v-else class="menu-icon">
    <Menu />
  </el-icon>
</template>

<script setup>
import { computed } from 'vue'
import { Menu } from '@element-plus/icons-vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  }
})

// 判断是否为Element Plus图标组件
const isIconComponent = computed(() => {
  // Element Plus 图标通常是PascalCase命名
  return /^[A-Z][a-zA-Z]*$/.test(props.icon)
})

// 判断是否为CSS类图标
const isClassIcon = computed(() => {
  return props.icon.includes('icon-') || props.icon.includes('fa-') || props.icon.includes('el-icon-')
})
</script>

<style lang="scss" scoped>
.menu-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;

  // 折叠状态下的特殊样式
  :global(.el-menu--collapse) & {
    margin-right: 0;
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
}
</style>
