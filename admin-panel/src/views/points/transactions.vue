<template>
  <div class="points-transactions">
    <PageHeader title="积分交易" subtitle="查看所有积分交易记录" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><CreditCard /></el-icon>
          <p style="margin-top: 20px; color: #909399">积分交易功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { CreditCard } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.points-transactions {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
