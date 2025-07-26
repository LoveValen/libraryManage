<template>
  <div class="system-backup">
    <PageHeader title="数据备份" subtitle="系统数据备份与恢复管理" />

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
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.system-backup {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
