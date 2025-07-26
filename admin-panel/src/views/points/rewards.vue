<template>
  <div class="points-rewards">
    <PageHeader title="奖励商城" subtitle="管理积分兑换奖励" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Present /></el-icon>
          <p style="margin-top: 20px; color: #909399">奖励商城功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Present } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.points-rewards {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
