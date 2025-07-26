<template>
  <div class="system-logs">
    <PageHeader title="系统日志" subtitle="查看和管理系统运行日志" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Document /></el-icon>
          <p style="margin-top: 20px; color: #909399">系统日志功能开发中...</p>
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
.system-logs {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
