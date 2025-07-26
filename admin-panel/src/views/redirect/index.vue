<template>
  <div class="redirect-container">
    <el-loading text="页面刷新中..." background="rgba(255, 255, 255, 0.9)" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

onMounted(() => {
  const { params, query } = route
  const { path } = params

  // 延迟一下再跳转，给用户刷新的感觉
  setTimeout(() => {
    router.replace({ path: '/' + path, query })
  }, 100)
})
</script>

<style lang="scss" scoped>
.redirect-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
