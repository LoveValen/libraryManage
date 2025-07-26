<template>
  <div class="analytics-books">
    <PageHeader title="图书分析" subtitle="图书相关数据分析">
      <el-button type="primary" @click="exportData">
        <el-icon><Download /></el-icon>
        导出数据
      </el-button>
    </PageHeader>

    <div class="analytics-content">
      <el-row :gutter="20">
        <el-col :span="6">
          <StatCard title="图书总数" :value="bookStats.total" icon="Reading" color="#409EFF" />
        </el-col>
        <el-col :span="6">
          <StatCard title="可借阅" :value="bookStats.available" icon="CircleCheck" color="#67C23A" />
        </el-col>
        <el-col :span="6">
          <StatCard title="已借出" :value="bookStats.borrowed" icon="Clock" color="#E6A23C" />
        </el-col>
        <el-col :span="6">
          <StatCard title="维护中" :value="bookStats.maintenance" icon="Warning" color="#F56C6C" />
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="12">
          <el-card title="分类分布">
            <div ref="categoryChart" style="height: 300px"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card title="借阅趋势">
            <div ref="trendChart" style="height: 300px"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'

const bookStats = ref({
  total: 1250,
  available: 890,
  borrowed: 320,
  maintenance: 40
})

const exportData = () => {
  console.log('导出图书分析数据')
}

onMounted(() => {
  console.log('图书分析页面已加载')
})
</script>

<style scoped>
.analytics-books {
  padding: 20px;
}

.analytics-content {
  margin-top: 20px;
}
</style>
