<template>
  <!-- 外部链接 -->
  <a v-if="isExternal(to)" :href="to" target="_blank" rel="noopener noreferrer">
    <slot />
  </a>

  <!-- 内部路由链接 -->
  <router-link v-else :to="to" custom v-slot="{ navigate, href, isActive, isExactActive }">
    <a
      :href="href"
      :class="{ 'router-link-active': isActive, 'router-link-exact-active': isExactActive }"
      @click="navigate"
    >
      <slot />
    </a>
  </router-link>
</template>

<script setup>
import { isExternal } from '@/utils/validators'

defineProps({
  to: {
    type: String,
    required: true
  }
})
</script>

<style lang="scss" scoped>
a {
  color: inherit;
  text-decoration: none;
  display: block;
  width: 100%;
}
</style>
