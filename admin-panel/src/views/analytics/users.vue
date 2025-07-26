<template>
  <div class="analytics-users">
    <PageHeader title="用户分析" subtitle="用户行为与统计数据">
      <el-button type="primary">
        <el-icon><Download /></el-icon>
        导出报告
      </el-button>
    </PageHeader>

    <div class="content">
      <el-row :gutter="20">
        <el-col :span="6">
          <StatCard title="总用户数" :value="2450" icon="User" color="#409EFF" />
        </el-col>
        <el-col :span="6">
          <StatCard title="活跃用户" :value="1680" icon="UserFilled" color="#67C23A" />
        </el-col>
        <el-col :span="6">
          <StatCard title="新增用户" :value="125" icon="Plus" color="#E6A23C" />
        </el-col>
        <el-col :span="6">
          <StatCard title="流失用户" :value="28" icon="Minus" color="#F56C6C" />
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
</script>

<style scoped>
.analytics-users {
  padding: 20px;
}
.content {
  margin-top: 20px;
}
</style>
