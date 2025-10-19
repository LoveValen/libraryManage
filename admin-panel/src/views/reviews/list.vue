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
          <!-- 评论管理表格 -->
          <ProTable
            ref="proTableRef"
            :request="requestReviews"
            :columns="reviewTableColumns"
            :batch-actions="reviewBatchActions"
            :actions="reviewRowActions"
            :row-selection="{ type: 'checkbox' }"
            :search="false"
            :toolBar="reviewToolBarConfig"
            :params="reviewSearchParams"
            :action-column="{ width: 220, fixed: 'right', align: 'center' }"
            :max-height="finalTableHeight"
            row-key="id"
            stripe
            border
            @create="handleAdd"
            @selection-change="handleProTableSelectionChange"
          >
            <!-- 用户信息插槽 -->
            <template #userInfo="{ record }">
              <div class="user-info">
                <el-avatar :src="record.user?.avatar" :size="32">
                  {{ record.user?.username?.charAt(0) }}
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ record.user?.username }}</div>
                  <div class="user-meta">{{ record.user?.email }}</div>
                </div>
              </div>
            </template>

            <!-- 图书信息插槽 -->
            <template #bookInfo="{ record }">
              <div class="book-info">
                <img :src="record.book?.cover" :alt="record.book?.title" class="book-cover-small" />
                <div class="book-details">
                  <div class="book-title">{{ record.book?.title }}</div>
                  <div class="book-author">{{ record.book?.author }}</div>
                </div>
              </div>
            </template>

            <!-- 评分插槽 -->
            <template #rating="{ record }">
              <el-rate v-model="record.rating" disabled size="small" />
            </template>

            <!-- 评价内容插槽 -->
            <template #reviewContent="{ record }">
              <div class="review-content">
                <p class="review-text">{{ record.content }}</p>
                <div v-if="record.images?.length" class="review-images">
                  <el-image
                    v-for="(image, index) in record.images.slice(0, 3)"
                    :key="index"
                    :src="image"
                    class="review-image"
                    fit="cover"
                    :preview-src-list="record.images"
                  />
                  <span v-if="record.images.length > 3" class="more-images">
                    +{{ record.images.length - 3 }}
                  </span>
                </div>
              </div>
            </template>

            <!-- 状态插槽 -->
            <template #status="{ record }">
              <StatusTag :status="record.status" :preset="'review'" size="small" />
            </template>

            <!-- 点赞数插槽 -->
            <template #likeCount="{ record }">
              <span class="like-count">{{ record.likeCount || 0 }}</span>
            </template>

            <!-- 评价时间插槽 -->
            <template #createdTime="{ record }">
              <div class="time-info">
                <div>{{ formatDate(record.createdAt) }}</div>
                <div class="time-ago">{{ formatTimeAgo(record.createdAt) }}</div>
              </div>
            </template>

            <!-- 工具栏插槽 -->
            <template #toolBarRender="{ selectedRowKeys, selectedRows }">
              <div style="display: flex; justify-content: space-between; width: 100%;">
                <!-- 左侧操作按钮 -->
                <div style="display: flex; gap: 8px;">
                  <!-- 新增评论按钮 -->
                  <el-button type="primary" @click="handleAdd">
                    新增评论
                  </el-button>
                  
                  <!-- 批量操作按钮（始终显示，无选中项时禁用） -->
                  <el-button 
                    type="success" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchApproveFromTable(selectedRows)"
                  >
                    批量审核
                  </el-button>
                  <el-button 
                    type="danger" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchDeleteFromTable(selectedRows)"
                  >
                    批量删除
                  </el-button>
                  
                  <!-- 常规工具栏按钮 -->
                  <el-button type="info" :icon="TrendCharts" @click="showAnalytics">
                    数据分析
                  </el-button>
                  <el-button type="success" :icon="Download" @click="exportReviews">
                    导出数据
                  </el-button>
                </div>
                
                <!-- 右侧工具按钮 -->
                <div style="display: flex; gap: 8px;">
                  <el-tooltip content="刷新数据" placement="top">
                    <el-button :icon="Refresh" @click="handleRefresh" :loading="loading" />
                  </el-tooltip>
                  <el-tooltip content="列设置" placement="top">
                    <el-button :icon="Setting" @click="openColumnSettings" />
                  </el-tooltip>
                </div>
              </div>
            </template>
          </ProTable>
        </el-card>
      </div>
    </div>
    
    <!-- 列设置对话框 -->
    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import StatusTag from '@/components/common/StatusTag.vue'
import { ProTable, ColumnSettings } from '@/components/common'
import { formatDate, formatTimeAgo } from '@/utils/date'
import { showSuccess, showError, confirmDelete, confirmBatchAction } from '@/utils/message'
import { removeEmpty } from '@/utils/global'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

// 响应式数据
const loading = ref(false)
const reviewList = ref([])
const selectedReviews = ref([])
const tableRef = ref()
const proTableRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  rating: '',
  dateRange: null
})

// 搜索字段配置（基于 ProForm 设计）
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入用户名、图书名或评价内容搜索',
    clearable: true
  },
  {
    name: 'status',
    valueType: 'select',
    label: '审核状态',
    placeholder: '选择审核状态',
    options: [
      { label: '待审核', value: 'pending' },
      { label: '审核通过', value: 'approved' },
      { label: '审核拒绝', value: 'rejected' }
    ]
  },
  {
    name: 'rating',
    valueType: 'select',
    label: '评分等级',
    placeholder: '选择评分等级',
    options: [
      { label: '⭐⭐⭐⭐⭐ 5星', value: '5' },
      { label: '⭐⭐⭐⭐ 4星', value: '4' },
      { label: '⭐⭐⭐ 3星', value: '3' },
      { label: '⭐⭐ 2星', value: '2' },
      { label: '⭐ 1星', value: '1' }
    ]
  },
  {
    name: 'dateRange',
    valueType: 'dateRange',
    label: '评价时间',
    placeholder: ['开始日期', '结束日期']
  }
]

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 默认列设置配置
const defaultVisibleColumns = [
  'userInfo',
  'bookInfo',
  'rating',
  'reviewContent',
  'status',
  'likeCount',
  'createdTime'
]

const defaultColumnOptions = [
  { label: '用户信息', value: 'userInfo', required: true },
  { label: '图书信息', value: 'bookInfo', required: true },
  { label: '评分', value: 'rating' },
  { label: '评价内容', value: 'reviewContent', required: true },
  { label: '状态', value: 'status' },
  { label: '点赞数', value: 'likeCount' },
  { label: '评价时间', value: 'createdTime' }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('review', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 200, // 页面头部 + 搜索区域
  footerOffset: 80   // 分页区域
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

// ProTable配置
const reviewSearchParams = computed(() => ({
  ...searchForm
}))

// 表格列配置
const reviewTableColumns = [
  {
    key: 'userInfo',
    title: '用户信息',
    slot: 'userInfo',
    minWidth: 160,
    align: 'center'
  },
  {
    key: 'bookInfo',
    title: '图书信息',
    slot: 'bookInfo',
    minWidth: 220,
    align: 'center'
  },
  {
    key: 'rating',
    title: '评分',
    slot: 'rating',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'reviewContent',
    title: '评价内容',
    slot: 'reviewContent',
    minWidth: 260,
    align: 'center'
  },
  {
    key: 'status',
    title: '状态',
    slot: 'status',
    minWidth: 90,
    sorter: true,
    align: 'center'
  },
  {
    key: 'likeCount',
    title: '点赞数',
    slot: 'likeCount',
    minWidth: 70,
    sorter: true,
    align: 'center'
  },
  {
    key: 'createdAt',
    title: '评价时间',
    slot: 'createdTime',
    minWidth: 140,
    sorter: true,
    align: 'center'
  }
]

// 批量操作配置
const reviewBatchActions = [
  {
    key: 'batchApprove',
    text: '批量审核',
    type: 'text',
    onClick: (selectedRowKeys, selectedRows) => handleBatchApproveFromTable(selectedRows)
  },
  {
    key: 'batchDelete',
    text: '批量删除',
    type: 'text',
    onClick: (selectedRowKeys, selectedRows) => handleBatchDeleteFromTable(selectedRows)
  }
]

// 行操作配置
const reviewRowActions = [
  {
    key: 'view',
    text: '查看',
    type: 'text',
    onClick: (record) => handleView(record)
  },
  {
    key: 'approve',
    text: '审核',
    type: 'text',
    onClick: (record) => handleApprove(record)
  },
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: (record) => handleAction('edit', record)
  },
  {
    key: 'reply',
    text: '回复',
    type: 'text',
    onClick: (record) => handleAction('reply', record)
  },
  {
    key: 'delete',
    text: '删除',
    type: 'text',
    onClick: (record) => handleAction('delete', record)
  }
]

// 工具栏配置
const reviewToolBarConfig = {
  create: true,
  createText: '新增评论',
  reload: true,
  density: true,
  columnSetting: true,
  fullScreen: true
}

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
    showError(error.message || '获取评价列表失败')
  } finally {
    loading.value = false
  }
}

// ProTable数据请求函数
const requestReviews = async (params) => {
  try {
    console.log('ProTable请求参数:', params)

    // 清理请求参数，移除空值和undefined
    const cleanedParams = removeEmpty({
      page: params.current || pagination.page,
      pageSize: params.pageSize || pagination.size,
      keyword: searchForm.keyword,
      status: searchForm.status,
      rating: searchForm.rating,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 模拟数据
    const mockData = [
      {
        id: 1,
        user: { username: 'user1', email: 'user1@example.com', avatar: '' },
        book: { title: '《JavaScript权威指南》', author: 'David Flanagan', cover: '' },
        rating: 5,
        content: '非常好的JavaScript参考书，内容详实，讲解清晰。',
        status: 'approved',
        likeCount: 12,
        createdAt: new Date().toISOString(),
        images: []
      },
      {
        id: 2,
        user: { username: 'user2', email: 'user2@example.com', avatar: '' },
        book: { title: '《Vue.js设计与实现》', author: '霍春阳', cover: '' },
        rating: 4,
        content: '深入Vue.js源码，对理解框架原理很有帮助。',
        status: 'pending',
        likeCount: 8,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        images: []
      }
    ]

    // 模拟响应数据
    const mockResponse = {
      data: mockData,
      total: 50,
      page: cleanedParams.page || 1,
      pageSize: cleanedParams.pageSize || 20
    }

    return {
      success: true,
      data: Array.isArray(mockResponse.data) ? mockResponse.data : [],
      total: mockResponse.total || 0
    }
  } catch (error) {
    console.error('获取评论列表失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
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

// ProTable选择变化处理
const handleProTableSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedReviews.value = selectedRows
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
  showSuccess('查看评价详情')
}

const handleApprove = (row) => {
  showSuccess('评价审核通过')
}

const handleAction = (command, row) => {
  switch (command) {
    case 'edit':
      showSuccess('编辑评价')
      break
    case 'reply':
      showSuccess('回复评价')
      break
    case 'report':
      showSuccess('处理举报')
      break
    case 'delete':
      showError('删除评价')
      break
  }
}

const handleBatchDelete = () => {
  showError(`批量删除 ${selectedReviews.value.length} 条评价`)
}

const handleBatchToggleStatus = () => {
  showSuccess(`批量审核 ${selectedReviews.value.length} 条评价`)
}

const exportReviews = () => {
  showSuccess('导出评价数据')
}

const showAnalytics = () => {
  showSuccess('显示数据分析')
}

// ProTable批量操作处理函数
const handleBatchApproveFromTable = async (selectedRows) => {
  if (selectedRows.length === 0) {
    showError('请选择要审核的评论')
    return
  }

  try {
    const confirmed = await confirmBatchAction(selectedRows.length, '批量审核', '条评论')
    if (!confirmed) return

    // 这里应该调用批量审核API
    // await reviewApi.batchApprove(selectedRows.map(row => row.id))

    showSuccess('批量审核成功')
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量审核失败:', error)
    showError(error.message || '批量审核失败')
  }
}

const handleBatchDeleteFromTable = async (selectedRows) => {
  if (selectedRows.length === 0) {
    showError('请选择要删除的评论')
    return
  }

  try {
    const confirmed = await confirmBatchAction(selectedRows.length, '批量删除', '条评论')
    if (!confirmed) return

    // 这里应该调用批量删除API
    // await reviewApi.batchDelete(selectedRows.map(row => row.id))

    showSuccess('批量删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量删除失败:', error)
    showError(error.message || '批量删除失败')
  }
}

const handleAdd = () => {
  ElMessage.info('新增评论功能开发中')
}

const clearSelection = () => {
  selectedReviews.value = []
  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

const handleRefresh = () => {
  proTableRef.value?.refresh()
}

// 列设置应用回调 - 添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
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
  padding: 20px;
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
  font-size: 20px;
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
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.column-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
