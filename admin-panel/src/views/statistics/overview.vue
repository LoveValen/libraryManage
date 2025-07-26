<template>
  <div class="statistics-overview">
    <PageHeader title="统计概览" subtitle="系统整体数据统计" />

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
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.statistics-overview {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
