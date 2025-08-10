<template>
  <el-icon class="svg-icon" :size="size">
    <component :is="iconComponent" />
  </el-icon>
</template>

<script setup>
import { computed } from 'vue'
import { Menu, Document, Setting, User, Star, Trophy, Reading, Warning, Plus, Edit, View, Delete, Refresh, Search } from '@element-plus/icons-vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  }
})

// 图标映射表
const iconMap = {
  'menu': Menu,
  'document': Document,
  'setting': Setting,
  'user': User,
  'star': Star,
  'trophy': Trophy,
  'reading': Reading,
  'warning': Warning,
  'plus': Plus,
  'edit': Edit,
  'view': View,
  'delete': Delete,
  'refresh': Refresh,
  'search': Search
}

// 计算图标组件
const iconComponent = computed(() => {
  return iconMap[props.name] || Menu
})
</script>

<style lang="scss" scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>