<template>
  <div class="analytics-insights">
    <PageHeader title="数据洞察" subtitle="智能分析与预测">
      <el-button type="primary" @click="refreshInsights">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </PageHeader>

    <div class="insights-content">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card title="用户行为分析" class="insight-card">
            <div class="insight-item">
              <h4>活跃用户增长</h4>
              <p class="trend-up">+15.2%</p>
              <span class="insight-desc">本月相比上月</span>
            </div>
            <div class="insight-item">
              <h4>平均借阅时长</h4>
              <p class="trend-neutral">14天</p>
              <span class="insight-desc">与上月持平</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card title="图书流行度" class="insight-card">
            <div class="insight-item">
              <h4>热门分类</h4>
              <p class="category-tag">科技类</p>
              <span class="insight-desc">借阅量最高</span>
            </div>
            <div class="insight-item">
              <h4>新书关注度</h4>
              <p class="trend-up">+28.5%</p>
              <span class="insight-desc">本月新增关注</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card title="运营建议" class="insight-card">
            <div class="recommendation">
              <el-icon><Bulb /></el-icon>
              <div>
                <h4>建议增加科技类图书采购</h4>
                <p>基于用户借阅偏好分析</p>
              </div>
            </div>
            <div class="recommendation">
              <el-icon><Star /></el-icon>
              <div>
                <h4>推荐开展阅读活动</h4>
                <p>提高用户参与度</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Refresh, Bulb, Star } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'

const refreshInsights = () => {
  console.log('刷新数据洞察')
}
</script>

<style scoped>
.analytics-insights {
  padding: 20px;
}

.insights-content {
  margin-top: 20px;
}

.insight-card {
  height: 300px;
}

.insight-item {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.insight-item:last-child {
  border-bottom: none;
}

.insight-item h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.trend-up {
  color: var(--el-color-success);
  font-size: 24px;
  font-weight: bold;
  margin: 5px 0;
}

.trend-neutral {
  color: var(--el-color-info);
  font-size: 24px;
  font-weight: bold;
  margin: 5px 0;
}

.category-tag {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.insight-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.recommendation {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.recommendation .el-icon {
  margin-right: 10px;
  margin-top: 2px;
  color: var(--el-color-primary);
}

.recommendation h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.recommendation p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
