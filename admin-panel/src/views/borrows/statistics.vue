<template>
  <div class="borrows-statistics">
    <div class="page-header">
      <h1>借阅统计</h1>
      <p class="description">借阅数据统计分析</p>
    </div>

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><DataAnalysis /></el-icon>
          <p style="margin-top: 20px; color: #909399">借阅统计功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { DataAnalysis } from '@element-plus/icons-vue'
</script>

<style scoped>
.borrows-statistics {
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  h1 {
    margin: 0 0 8px 0;
    font-size: 20px;
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
