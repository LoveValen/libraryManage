<template>
  <div class="statistics-overview">
    <div class="page-header">
      <h1>统计概览</h1>
      <p class="description">系统整体数据统计</p>
    </div>

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><DataBoard /></el-icon>
          <p style="margin-top: 20px; color: #909399">统计概览功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { DataBoard } from '@element-plus/icons-vue'
</script>

<style scoped>
.statistics-overview {
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .description {
    margin: 0;
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
}

.content {
  margin-top: 20px;
}
</style>
