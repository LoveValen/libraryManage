<template>
  <div class="review-moderate">
    <PageHeader title="书评审核" subtitle="审核和管理用户书评" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Select /></el-icon>
          <p style="margin-top: 20px; color: #909399">书评审核功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Select } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.review-moderate {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
