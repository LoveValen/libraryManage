<template>
  <div class="statistics-users">
    <PageHeader title="用户统计" subtitle="用户相关数据统计分析" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><User /></el-icon>
          <p style="margin-top: 20px; color: #909399">用户统计功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { User } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.statistics-users {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
