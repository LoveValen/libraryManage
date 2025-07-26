<template>
  <div class="points-leaderboard">
    <PageHeader title="积分排行榜" subtitle="查看用户积分排名">
      <el-button type="primary">
        <el-icon><Trophy /></el-icon>
        导出排行榜
      </el-button>
    </PageHeader>

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
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.points-leaderboard {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
