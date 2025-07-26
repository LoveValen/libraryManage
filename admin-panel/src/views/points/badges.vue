<template>
  <div class="points-badges">
    <PageHeader title="徽章管理" subtitle="管理用户徽章系统" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Medal /></el-icon>
          <p style="margin-top: 20px; color: #909399">徽章管理功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Medal } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.points-badges {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
