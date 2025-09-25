<template>
  <div class="points-leaderboard">
    <div class="page-header">
      <div class="header-left">
        <h1>积分排行榜</h1>
        <p class="description">查看用户积分排名</p>
      </div>
      <div class="header-actions">
        <el-button type="primary">
          <el-icon><Trophy /></el-icon>
          导出排行榜
        </el-button>
      </div>
    </div>

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Trophy /></el-icon>
          <p style="margin-top: 20px; color: #909399">积分排行榜功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Trophy } from '@element-plus/icons-vue'
</script>

<style scoped>
.points-leaderboard {
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    h1 {
      margin: 0 0 4px 0;
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

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.content {
  margin-top: 20px;
}
</style>
