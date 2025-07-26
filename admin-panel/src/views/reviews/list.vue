<template>
  <div class="reviews-list">
    <PageHeader title="书评列表" subtitle="管理所有用户书评">
      <el-button type="primary">
        <el-icon><Plus /></el-icon>
        新增书评
      </el-button>
    </PageHeader>

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><ChatDotRound /></el-icon>
          <p style="margin-top: 20px; color: #909399">书评管理功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Plus, ChatDotRound } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.reviews-list {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
