<template>
  <div class="analytics-performance">
    <PageHeader title="性能分析" subtitle="系统性能监控与分析" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><TrendCharts /></el-icon>
          <p style="margin-top: 20px; color: #909399">性能分析功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { TrendCharts } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.analytics-performance {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
