<template>
  <div class="points-rules">
    <PageHeader title="积分规则" subtitle="配置积分获取和消费规则" />

    <div class="content">
      <el-card>
        <div style="text-align: center; padding: 60px 20px">
          <el-icon size="60" color="#909399"><Setting /></el-icon>
          <p style="margin-top: 20px; color: #909399">积分规则配置功能开发中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Setting } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<style scoped>
.points-rules {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
