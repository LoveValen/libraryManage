<template>
  <div class="system-backup">
    <!-- 自定义头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">数据备份</h1>
          <p class="header-subtitle">系统数据备份与恢复管理</p>
        </div>
      </div>
    </div>

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><FolderOpened /></el-icon>
          <p style="margin-top: 20px; color: #909399">数据备份功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { FolderOpened } from '@element-plus/icons-vue'
</script>

<style scoped>
.system-backup {
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  padding: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.header-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.content {
  margin-top: 20px;
}
</style>
