<template>
  <div class="statistics-books">
    <PageHeader title="图书统计" subtitle="图书相关数据统计分析" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Reading /></el-icon>
          <p style="margin-top: 20px; color: #909399">图书统计功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Reading } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.statistics-books {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
