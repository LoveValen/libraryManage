<template>
  <div class="review-detail">
    <PageHeader title="书评详情" subtitle="查看书评详细信息" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><View /></el-icon>
          <p style="margin-top: 20px; color: #909399">书评详情功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { View } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.review-detail {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
