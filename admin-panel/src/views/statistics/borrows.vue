<template>
  <div class="statistics-borrows">
    <PageHeader title="借阅统计" subtitle="借阅相关数据统计分析" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Clock /></el-icon>
          <p style="margin-top: 20px; color: #909399">借阅统计功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Clock } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.statistics-borrows {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
