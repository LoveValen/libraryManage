<template>
  <div class="reviews-list">
    <!-- 自定义头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">书评列表</h1>
          <p class="header-subtitle">管理所有用户书评</p>
        </div>
        <div class="header-actions">
          <el-button type="primary">
            <el-icon><Plus /></el-icon>
            新增书评
          </el-button>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- 搜索筛选区域 -->
      <SearchFilterSimple
        v-model="searchForm"
        :fields="searchFields"
        :loading="loading"
        :collapsible="false"
        @search="handleSearch"
        @reset="handleReset"
      />

      <!-- 表格区域 -->
      <div class="table-section">
        <el-card shadow="never" class="table-card">
          <!-- 表格工具栏 -->
          <div class="table-toolbar">
            <div class="toolbar-left">
              <div v-if="selectedReviews.length > 0" class="selection-info">
                <el-icon><Check /></el-icon>
                <span>已选择 <strong>{{ selectedReviews.length }}</strong> 项</span>
              </div>
              <div class="batch-actions" :class="{ 'show': selectedReviews.length > 0 }">
                <el-button type="success" :disabled="selectedReviews.length === 0" @click="handleBatchToggleStatus">
                  <el-icon><Check /></el-icon>
                  批量审核
                </el-button>
                <el-button type="danger" :disabled="selectedReviews.length === 0" @click="handleBatchDelete">
                  <el-icon><Delete /></el-icon>
                  批量删除
                </el-button>
                <el-button @click="clearSelection" v-if="selectedReviews.length > 0">
                  取消选择
                </el-button>
              </div>
            </div>
            <div class="toolbar-right">
              <el-tooltip content="刷新数据">
                <el-button icon="Refresh" @click="fetchReviews" :loading="loading" />
              </el-tooltip>
              <el-tooltip content="导出数据">
                <el-button icon="Download" @click="exportReviews" />
              </el-tooltip>
              <el-tooltip content="数据分析">
                <el-button icon="TrendCharts" @click="showAnalytics" />
              </el-tooltip>
              <el-tooltip content="列设置">
                <el-button icon="Setting" @click="showColumnSettings = true" />
              </el-tooltip>
            </div>
          </div>

          <!-- 数据表格 -->
          <el-table
            ref="tableRef"
            v-loading="loading"
            :data="reviewList"
            stripe
            border
            height="600"
            @selection-change="handleSelectionChange"
            @sort-change="handleSortChange"
          >
            <el-table-column type="selection" width="50" fixed="left" />
            <el-table-column label="序号" type="index" width="60" fixed="left" />

            <el-table-column label="用户信息" min-width="180" fixed="left">
              <template #default="{ row }">
                <div class="user-info">
                  <el-avatar :src="row.user?.avatar" :size="32">
                    {{ row.user?.username?.charAt(0) }}
                  </el-avatar>
                  <div class="user-details">
                    <div class="user-name">{{ row.user?.username }}</div>
                    <div class="user-meta">{{ row.user?.email }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="图书信息" min-width="250">
              <template #default="{ row }">
                <div class="book-info">
                  <img :src="row.book?.cover" :alt="row.book?.title" class="book-cover-small" />
                  <div class="book-details">
                    <div class="book-title">{{ row.book?.title }}</div>
                    <div class="book-author">{{ row.book?.author }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="评分" width="120" sortable="custom" prop="rating">
              <template #default="{ row }">
                <el-rate v-model="row.rating" disabled size="small" />
              </template>
            </el-table-column>

            <el-table-column label="评价内容" min-width="300">
              <template #default="{ row }">
                <div class="review-content">
                  <p class="review-text">{{ row.content }}</p>
                  <div v-if="row.images?.length" class="review-images">
                    <el-image
                      v-for="(image, index) in row.images.slice(0, 3)"
                      :key="index"
                      :src="image"
                      class="review-image"
                      fit="cover"
                      :preview-src-list="row.images"
                    />
                    <span v-if="row.images.length > 3" class="more-images">
                      +{{ row.images.length - 3 }}
                    </span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="状态" width="100" sortable="custom" prop="status">
              <template #default="{ row }">
                <StatusTag :status="row.status" :preset="'review'" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="点赞数" width="80" sortable="custom" prop="likeCount">
              <template #default="{ row }">
                <span class="like-count">{{ row.likeCount || 0 }}</span>
              </template>
            </el-table-column>

            <el-table-column label="评价时间" width="160" sortable="custom" prop="createdAt">
              <template #default="{ row }">
                <div class="time-info">
                  <div>{{ formatDate(row.createdAt) }}</div>
                  <div class="time-ago">{{ formatTimeAgo(row.createdAt) }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button type="primary" link size="small" @click="handleView(row)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button type="success" link size="small" @click="handleApprove(row)">
                    <el-icon><Check /></el-icon>
                    审核
                  </el-button>
                  <el-dropdown @command="command => handleAction(command, row)">
                    <el-button type="info" link size="small">
                      更多
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit">
                          <el-icon><Edit /></el-icon>
                          编辑
                        </el-dropdown-item>
                        <el-dropdown-item command="reply">
                          <el-icon><ChatDotRound /></el-icon>
                          回复
                        </el-dropdown-item>
                        <el-dropdown-item command="report">
                          <el-icon><Warning /></el-icon>
                          举报处理
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided>
                          <el-icon><Delete /></el-icon>
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.size"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Plus, 
  ChatDotRound, 
  View, 
  Check, 
  Edit, 
  Delete, 
  Warning, 
  ArrowDown,
  Refresh,
  Download,
  Setting,
  TrendCharts
} from '@element-plus/icons-vue'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { formatDate, formatTimeAgo } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const reviewList = ref([])
const selectedReviews = ref([])
const tableRef = ref()
const showColumnSettings = ref(false)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  rating: '',
  dateRange: null
})

// 搜索字段配置
const searchFields = [
  {
    key: 'keyword',
    type: 'input',
    label: '关键词',
    placeholder: '搜索用户名、图书名、评价内容',
    inputWidth: '250px'
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '选择状态',
    options: [
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' }
    ]
  },
  {
    key: 'rating',
    type: 'select',
    label: '评分',
    placeholder: '选择评分',
    options: [
      { label: '5星', value: '5' },
      { label: '4星', value: '4' },
      { label: '3星', value: '3' },
      { label: '2星', value: '2' },
      { label: '1星', value: '1' }
    ]
  },
  {
    key: 'dateRange',
    type: 'date',
    dateType: 'daterange',
    label: '评价时间',
    startPlaceholder: '开始日期',
    endPlaceholder: '结束日期'
  }
]

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 方法
const fetchReviews = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    reviewList.value = [
      {
        id: 1,
        user: { username: 'user1', email: 'user1@example.com', avatar: '' },
        book: { title: '深入理解计算机系统', author: 'Randal E. Bryant', cover: '' },
        rating: 5,
        content: '这本书非常不错，对计算机系统有了更深入的理解。',
        images: [],
        status: 'approved',
        likeCount: 12,
        createdAt: new Date()
      }
    ]
    pagination.total = 50
  } catch (error) {
    console.error('获取评价列表失败:', error)
    ElMessage.error('获取评价列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchReviews()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    rating: '',
    dateRange: null
  })
  pagination.page = 1
  fetchReviews()
}

const handleSelectionChange = (selection) => {
  selectedReviews.value = selection
}

const handleSortChange = ({ prop, order }) => {
  // 处理排序
  fetchReviews()
}

const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  fetchReviews()
}

const handlePageChange = (page) => {
  pagination.page = page
  fetchReviews()
}

const handleView = (row) => {
  ElMessage.info('查看评价详情')
}

const handleApprove = (row) => {
  ElMessage.success('评价审核通过')
}

const handleAction = (command, row) => {
  switch (command) {
    case 'edit':
      ElMessage.info('编辑评价')
      break
    case 'reply':
      ElMessage.info('回复评价')
      break
    case 'report':
      ElMessage.info('处理举报')
      break
    case 'delete':
      ElMessage.warning('删除评价')
      break
  }
}

const handleBatchDelete = () => {
  ElMessage.warning(`批量删除 ${selectedReviews.value.length} 条评价`)
}

const handleBatchToggleStatus = () => {
  ElMessage.info(`批量审核 ${selectedReviews.value.length} 条评价`)
}

const exportReviews = () => {
  ElMessage.info('导出评价数据')
}

const showAnalytics = () => {
  ElMessage.info('显示数据分析')
}

const clearSelection = () => {
  selectedReviews.value = []
  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

// 生命周期
onMounted(() => {
  fetchReviews()
})
</script>

<style scoped>
.reviews-list {
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  padding: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.header-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.content {
  margin-top: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .user-details {
    .user-name {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .user-meta {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-top: 2px;
    }
  }
}

.book-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .book-cover-small {
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .book-details {
    .book-title {
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
    }

    .book-author {
      color: var(--el-text-color-regular);
      font-size: 13px;
    }
  }
}

.review-content {
  .review-text {
    margin: 0 0 8px 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .review-images {
    display: flex;
    gap: 4px;
    align-items: center;

    .review-image {
      width: 32px;
      height: 32px;
      border-radius: 4px;
    }

    .more-images {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.like-count {
  font-weight: 600;
  color: var(--el-color-primary);
}

.time-info {
  .time-ago {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    .selection-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--el-color-primary);
      font-weight: 500;
      animation: slideIn 0.3s ease;

      .el-icon {
        font-size: 16px;
      }
    }

    .batch-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;

      &.show {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
