<template>
  <div class="analytics-books">

    <div class="analytics-content">

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
