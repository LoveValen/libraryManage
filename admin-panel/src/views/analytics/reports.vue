<template>
  <div class="analytics-reports">
    <PageHeader title="数据报告" subtitle="生成和管理各类数据报告" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Document /></el-icon>
          <p style="margin-top: 20px; color: #909399">报告功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.analytics-reports {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
