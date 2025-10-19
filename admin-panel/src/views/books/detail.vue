<template>
  <div class="book-detail" v-loading="loading">
    <!-- 页面头部导航 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" size="default">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <div class="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/books' }">图书管理</el-breadcrumb-item>
            <el-breadcrumb-item>图书详情</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>
      <div class="header-actions" v-if="bookDetail">
        <el-button type="primary" @click="handleEdit">
          <el-icon><Edit /></el-icon>
          编辑图书
        </el-button>
        <el-button type="success" @click="handleBorrow">
          <el-icon><Reading /></el-icon>
          借阅图书
        </el-button>
        <el-dropdown @command="handleAction">
          <el-button>
            更多操作
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="duplicate">
                <el-icon><CopyDocument /></el-icon>
                复制图书
              </el-dropdown-item>
              <el-dropdown-item command="qrcode">
                <el-icon><Tickets /></el-icon>
                生成二维码
              </el-dropdown-item>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>
                导出信息
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon>
                删除图书
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div v-if="bookDetail" class="book-content">
      <!-- 图书基本信息 -->
      <div class="book-overview">
        <el-row :gutter="24">
          <el-col :xl="6" :lg="8" :md="10" :sm="24">
            <div class="book-cover-section">
              <div class="cover-container">
                <BookCover 
                  :src="bookDetail.cover || bookDetail.coverUrl || bookDetail.cover_image"
                  :title="bookDetail.title"
                  :alt="bookDetail.title"
                  width="100%"
                  height="320"
                  :show-title="!bookDetail.cover && !bookDetail.coverUrl && !bookDetail.cover_image"
                  :radius="8"
                />
                <div class="cover-actions">
                  <el-upload
                    ref="uploadRef"
                    :show-file-list="false"
                    :before-upload="beforeUploadCover"
                    accept="image/*"
                  >
                    <el-button size="small" type="primary">
                      <el-icon><Upload /></el-icon>
                      更换封面
                    </el-button>
                  </el-upload>
                </div>
              </div>

              <div class="book-status-card">
                <div class="status-item">
                  <span class="status-label">状态</span>
                  <el-tag :type="getStatusTagType(bookDetail.status)" size="default">
                    {{ getStatusText(bookDetail.status) }}
                  </el-tag>
                </div>
                <div class="status-item">
                  <span class="status-label">位置</span>
                  <span class="status-value">{{ bookDetail.location }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">库存</span>
                  <span class="status-value">{{ bookDetail.stock }}本</span>
                </div>
                <div class="status-item">
                  <span class="status-label">可借</span>
                  <span class="status-value">{{ bookDetail.availableStock }}本</span>
                </div>
              </div>
            </div>
          </el-col>

          <el-col :xl="18" :lg="16" :md="14" :sm="24">
            <div class="book-info-section">
              <div class="book-title-area">
                <h1 class="book-title">{{ bookDetail.title }}</h1>
                <div class="book-subtitle">{{ bookDetail.subtitle }}</div>
                <div class="book-meta">
                  <div class="meta-item">
                    <span class="meta-label">作者：</span>
                    <span class="meta-value">{{ bookDetail.author }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">分类：</span>
                    <el-tag :type="getCategoryTagType(bookDetail.categoryId)" size="small">
                      {{ getCategoryName(bookDetail.categoryId) }}
                    </el-tag>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">评分：</span>
                    <el-rate v-model="bookDetail.rating" disabled show-score />
                    <span class="review-count">({{ bookDetail.reviewCount }}人评价)</span>
                  </div>
                </div>
              </div>

              <div class="book-description">
                <h3>内容简介</h3>
                <p>{{ bookDetail.description || '暂无内容简介' }}</p>
              </div>

              <div class="book-details-grid">
                <div class="detail-item">
                  <span class="detail-label">ISBN：</span>
                  <span class="detail-value">{{ bookDetail.isbn }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">出版社：</span>
                  <span class="detail-value">{{ bookDetail.publisher }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">出版日期：</span>
                  <span class="detail-value">{{ formatDate(bookDetail.publishDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">页数：</span>
                  <span class="detail-value">{{ bookDetail.pages }}页</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">语言：</span>
                  <span class="detail-value">{{ bookDetail.language }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">版次：</span>
                  <span class="detail-value">第{{ bookDetail.edition }}版</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">价格：</span>
                  <span class="detail-value">¥{{ bookDetail.price }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">添加时间：</span>
                  <span class="detail-value">{{ formatDateTime(bookDetail.createdAt) }}</span>
                </div>
              </div>

              <!-- 标签 -->
              <div v-if="bookDetail.tags && bookDetail.tags.length" class="book-tags">
                <h4>标签</h4>
                <div class="tags-list">
                  <el-tag v-for="tag in bookDetail.tags" :key="tag" size="small" class="tag-item">
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 统计信息 -->
      <div class="book-statistics">
        <el-row :gutter="20">
          <el-col :xl="6" :lg="12" :md="12" :sm="24">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon borrow-icon">
                  <el-icon><Reading /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.borrowCount || 0 }}</div>
                  <div class="stat-label">总借阅次数</div>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :xl="6" :lg="12" :md="12" :sm="24">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon view-icon">
                  <el-icon><View /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.viewCount || 0 }}</div>
                  <div class="stat-label">浏览次数</div>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :xl="6" :lg="12" :md="12" :sm="24">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon favorite-icon">
                  <el-icon><Star /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.favoriteCount || 0 }}</div>
                  <div class="stat-label">收藏次数</div>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :xl="6" :lg="12" :md="12" :sm="24">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon reserve-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.reserveCount || 0 }}</div>
                  <div class="stat-label">预约次数</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 详细信息标签页 -->
      <div class="book-tabs">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 借阅记录 -->
          <el-tab-pane label="借阅记录" name="borrows">
            <div class="tab-content">
              <div class="tab-toolbar">
                <div class="toolbar-left">
                  <el-input
                    v-model="borrowSearch"
                    placeholder="搜索用户姓名或学号"
                    style="width: 200px"
                    clearable
                    @input="fetchBorrowHistory"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                  <el-select v-model="borrowStatusFilter" @change="fetchBorrowHistory" style="width: 120px">
                    <el-option label="全部状态" value="" />
                    <el-option label="借阅中" value="borrowed" />
                    <el-option label="已归还" value="returned" />
                    <el-option label="逾期" value="overdue" />
                  </el-select>
                </div>
                <div class="toolbar-right">
                  <el-button @click="fetchBorrowHistory" :loading="borrowLoading">
                    <el-icon><Refresh /></el-icon>
                    刷新
                  </el-button>
                </div>
              </div>

              <el-table :data="borrowHistory" v-loading="borrowLoading" stripe border>
                <el-table-column label="借阅用户" min-width="150">
                  <template #default="{ row }">
                    <div class="user-info">
                      <el-avatar :src="row.user?.avatar" :size="32">
                        {{ row.user?.realName?.charAt(0) }}
                      </el-avatar>
                      <div class="user-details">
                        <div class="user-name">{{ row.user?.realName }}</div>
                        <div class="user-id">{{ row.user?.username }}</div>
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="借阅时间" prop="borrowDate" width="160">
                  <template #default="{ row }">
                    {{ formatDateTime(row.borrowDate) }}
                  </template>
                </el-table-column>

                <el-table-column label="应还时间" prop="dueDate" width="160">
                  <template #default="{ row }">
                    <span :class="{ overdue: isOverdue(row.dueDate) && row.status === 'borrowed' }">
                      {{ formatDate(row.dueDate) }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="归还时间" prop="returnDate" width="160">
                  <template #default="{ row }">
                    {{ row.returnDate ? formatDateTime(row.returnDate) : '-' }}
                  </template>
                </el-table-column>

                <el-table-column label="状态" prop="status" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getBorrowStatusTagType(row.status)" size="small">
                      {{ getBorrowStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="续借次数" prop="renewalCount" width="100" align="center" />

                <el-table-column label="备注" prop="notes" min-width="150" show-overflow-tooltip />

                <el-table-column label="操作" width="150" fixed="right">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.status === 'borrowed'"
                      type="success"
                      link
                      size="small"
                      @click="handleReturn(row)"
                    >
                      归还
                    </el-button>
                    <el-button
                      v-if="row.status === 'borrowed' && !isOverdue(row.dueDate)"
                      type="primary"
                      link
                      size="small"
                      @click="handleRenew(row)"
                    >
                      续借
                    </el-button>
                    <el-button type="info" link size="small" @click="viewBorrowDetail(row)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="borrowPagination.page"
                  v-model:page-size="borrowPagination.size"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="borrowPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="fetchBorrowHistory"
                  @current-change="fetchBorrowHistory"
                />
              </div>
            </div>
          </el-tab-pane>

          <!-- 评论评分 -->
          <el-tab-pane label="评论评分" name="reviews">
            <div class="tab-content">
              <div class="reviews-summary">
                <div class="rating-overview">
                  <div class="overall-rating">
                    <div class="rating-score">{{ bookDetail.rating || 0 }}</div>
                    <el-rate v-model="bookDetail.rating" disabled />
                    <div class="rating-count">{{ bookDetail.reviewCount || 0 }}人评价</div>
                  </div>

                  <div class="rating-distribution">
                    <div v-for="star in 5" :key="star" class="rating-bar">
                      <span class="star-label">{{ 6 - star }}星</span>
                      <el-progress :percentage="getRatingPercentage(6 - star)" :show-text="false" :stroke-width="8" />
                      <span class="star-count">{{ getRatingCount(6 - star) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="reviews-list" v-loading="reviewsLoading">
                <div v-if="reviews.length === 0" class="empty-reviews">
                  <el-empty description="暂无评论" />
                </div>

                <div v-else class="review-items">
                  <div v-for="review in reviews" :key="review.id" class="review-item">
                    <div class="review-header">
                      <div class="reviewer-info">
                        <el-avatar :src="review.user?.avatar" :size="40">
                          {{ review.user?.realName?.charAt(0) }}
                        </el-avatar>
                        <div class="reviewer-details">
                          <div class="reviewer-name">{{ review.user?.realName }}</div>
                          <div class="review-time">{{ formatTimeAgo(review.createdAt) }}</div>
                        </div>
                      </div>

                      <div class="review-rating">
                        <el-rate v-model="review.rating" disabled size="small" />
                      </div>

                      <div class="review-actions">
                        <el-button type="danger" link size="small" @click="deleteReview(review)">删除</el-button>
                      </div>
                    </div>

                    <div class="review-content">
                      {{ review.content }}
                    </div>

                    <div v-if="review.images && review.images.length" class="review-images">
                      <el-image
                        v-for="(image, index) in review.images"
                        :key="index"
                        :src="image"
                        :preview-src-list="review.images"
                        class="review-image"
                        fit="cover"
                      />
                    </div>
                  </div>
                </div>

                <div class="reviews-pagination">
                  <el-pagination
                    v-model:current-page="reviewsPagination.page"
                    v-model:page-size="reviewsPagination.size"
                    :page-sizes="[5, 10, 20]"
                    :total="reviewsPagination.total"
                    layout="total, sizes, prev, pager, next"
                    @size-change="fetchReviews"
                    @current-change="fetchReviews"
                  />
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 库存记录 -->
          <el-tab-pane label="库存记录" name="stock">
            <div class="tab-content">
              <div class="tab-toolbar">
                <div class="toolbar-left">
                  <el-button type="primary" @click="showStockAdjustDialog = true">
                    <el-icon><Plus /></el-icon>
                    调整库存
                  </el-button>
                </div>
                <div class="toolbar-right">
                  <el-button @click="fetchStockHistory" :loading="stockLoading">
                    <el-icon><Refresh /></el-icon>
                    刷新
                  </el-button>
                </div>
              </div>

              <el-table :data="stockHistory" v-loading="stockLoading" stripe border>
                <el-table-column label="操作时间" prop="createdAt" width="160">
                  <template #default="{ row }">
                    {{ formatDateTime(row.createdAt) }}
                  </template>
                </el-table-column>

                <el-table-column label="操作类型" prop="type" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getStockTypeTagType(row.type)" size="small">
                      {{ getStockTypeText(row.type) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="变动数量" prop="change" width="120" align="center">
                  <template #default="{ row }">
                    <span :class="{ positive: row.change > 0, negative: row.change < 0 }">
                      {{ row.change > 0 ? '+' : '' }}{{ row.change }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="变动后库存" prop="afterStock" width="120" align="center" />

                <el-table-column label="操作人" prop="operator" width="120">
                  <template #default="{ row }">
                    {{ row.operator?.realName || '-' }}
                  </template>
                </el-table-column>

                <el-table-column label="操作原因" prop="reason" min-width="150" />

                <el-table-column label="备注" prop="note" min-width="150" show-overflow-tooltip />
              </el-table>

              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="stockPagination.page"
                  v-model:page-size="stockPagination.size"
                  :page-sizes="[10, 20, 50]"
                  :total="stockPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="fetchStockHistory"
                  @current-change="fetchStockHistory"
                />
              </div>
            </div>
          </el-tab-pane>

          <!-- 操作日志 -->
          <el-tab-pane label="操作日志" name="logs">
            <div class="tab-content">
              <el-table :data="operationLogs" v-loading="logsLoading" stripe border>
                <el-table-column label="操作时间" prop="createdAt" width="160">
                  <template #default="{ row }">
                    {{ formatDateTime(row.createdAt) }}
                  </template>
                </el-table-column>

                <el-table-column label="操作类型" prop="action" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getActionTagType(row.action)" size="small">
                      {{ getActionText(row.action) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="操作人" prop="operator" width="120">
                  <template #default="{ row }">
                    {{ row.operator?.realName || '-' }}
                  </template>
                </el-table-column>

                <el-table-column label="操作描述" prop="description" min-width="200" />

                <el-table-column label="IP地址" prop="ipAddress" width="130" />

                <el-table-column label="详情" width="80">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="viewLogDetail(row)">查看</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="logsPagination.page"
                  v-model:page-size="logsPagination.size"
                  :page-sizes="[10, 20, 50]"
                  :total="logsPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="fetchOperationLogs"
                  @current-change="fetchOperationLogs"
                />
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 电子书文件 -->
          <el-tab-pane label="电子书文件" name="files">
            <div class="tab-content">
              <p>电子书文件功能开发中...</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 库存调整对话框 -->
    <el-dialog v-model="showStockAdjustDialog" title="调整库存" width="500px">
      <el-form ref="stockFormRef" :model="stockForm" :rules="stockFormRules" label-width="100px">
        <el-form-item label="当前库存">
          <span class="current-stock">{{ bookDetail?.stock || 0 }}本</span>
        </el-form-item>

        <el-form-item label="调整类型" prop="type">
          <el-radio-group v-model="stockForm.type">
            <el-radio value="increase">入库</el-radio>
            <el-radio value="decrease">出库</el-radio>
            <el-radio value="adjust">调整</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="调整数量" prop="quantity">
          <el-input-number
            v-model="stockForm.quantity"
            :min="stockForm.type === 'decrease' ? -bookDetail?.stock : 1"
            :max="9999"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="调整原因" prop="reason">
          <el-select v-model="stockForm.reason" style="width: 100%">
            <el-option label="新书入库" value="new_arrival" />
            <el-option label="图书损坏" value="damaged" />
            <el-option label="图书丢失" value="lost" />
            <el-option label="图书下架" value="removed" />
            <el-option label="库存盘点" value="inventory" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="note">
          <el-input v-model="stockForm.note" type="textarea" :rows="3" placeholder="请输入调整备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showStockAdjustDialog = false">取消</el-button>
        <el-button type="primary" @click="handleStockAdjust" :loading="adjustingStock">确定调整</el-button>
      </template>
    </el-dialog>

    <!-- 借阅对话框 -->
    <el-dialog v-model="showBorrowDialog" title="借阅图书" width="600px" destroy-on-close>
      <BorrowForm v-if="bookDetail" :book="bookDetail" @success="handleBorrowSuccess" />
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="showQRCodeDialog" title="生成二维码" width="800px" destroy-on-close>
      <QRCodeGenerator v-if="bookDetail" :book="bookDetail" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccess, showError, showInfo, confirm, confirmDelete } from '@/utils/message'
import { bookApi } from '@/api/book'
import { borrowApi } from '@/api/borrows'
import { formatDate, formatDateTime, formatTimeAgo } from '@/utils/date'
import BookCover from '@/components/common/BookCover.vue'
import BorrowForm from './components/BorrowForm.vue'
import QRCodeGenerator from './components/QRCodeGenerator.vue'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const bookDetail = ref(null)
const statistics = ref({
  borrowCount: 0,
  viewCount: 0,
  favoriteCount: 0,
  reserveCount: 0
})
const categories = ref([])
const activeTab = ref('borrows')

// 借阅记录
const borrowHistory = ref([])
const borrowLoading = ref(false)
const borrowSearch = ref('')
const borrowStatusFilter = ref('')
const borrowPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 评论数据
const reviews = ref([])
const reviewsLoading = ref(false)
const reviewsDistribution = ref({})
const reviewsPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 库存记录
const stockHistory = ref([])
const stockLoading = ref(false)
const stockPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 操作日志
const operationLogs = ref([])
const logsLoading = ref(false)
const logsPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 对话框状态
const showBorrowDialog = ref(false)
const showQRCodeDialog = ref(false)
const showStockAdjustDialog = ref(false)
const adjustingStock = ref(false)

// 库存调整表单
const stockFormRef = ref()
const stockForm = reactive({
  type: 'increase',
  quantity: 1,
  reason: 'new_arrival',
  note: ''
})

const stockFormRules = {
  quantity: [
    { required: true, message: '请输入调整数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }
  ],
  reason: [{ required: true, message: '请选择调整原因', trigger: 'change' }]
}

// 计算属性
const bookId = computed(() => route.params.id)

// 方法
const fetchBookDetail = async () => {
  try {
    loading.value = true
    const { data } = await bookApi.getBookDetail(bookId.value)
    bookDetail.value = data
    statistics.value = data.statistics || {
      borrowCount: 0,
      viewCount: 0,
      favoriteCount: 0,
      reserveCount: 0
    }
  } catch (error) {
    console.error('获取图书详情失败:', error)
    showError('获取图书详情失败')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await bookApi.getCategories()
    const rawData = response?.data
    const categoryList = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.categories)
        ? rawData.categories
        : []
    categories.value = categoryList
  } catch (error) {
    console.error('获取分类失败:', error)
    categories.value = []
  }
}

const fetchBorrowHistory = async () => {
  try {
    borrowLoading.value = true
    const params = {
      page: borrowPagination.page,
      size: borrowPagination.size,
      search: borrowSearch.value,
      status: borrowStatusFilter.value
    }

    const response = await bookApi.getBookBorrowHistory(bookId.value, params)
    borrowHistory.value = response.data
    borrowPagination.total = response.total
  } catch (error) {
    console.error('获取借阅记录失败:', error)
    showError('获取借阅记录失败')
  } finally{
    borrowLoading.value = false
  }
}

const fetchReviews = async () => {
  try {
    reviewsLoading.value = true
    const params = {
      page: reviewsPagination.page,
      size: reviewsPagination.size
    }

    const response = await bookApi.getBookReviews(bookId.value, params)
    reviews.value = response.data
    reviewsDistribution.value = response.data.statistics?.ratingDistribution
    reviewsPagination.total = response.total
  } catch (error) {
    console.error('获取评论失败:', error)
    ElMessage.error('获取评论失败')
  } finally {
    reviewsLoading.value = false
  }
}

const fetchStockHistory = async () => {
  try {
    stockLoading.value = true
    const params = {
      page: stockPagination.page,
      size: stockPagination.size
    }

    const response = await bookApi.getBookStockHistory(bookId.value, params)
    stockHistory.value = response.data
    stockPagination.total = response.total
  } catch (error) {
    console.error('获取库存记录失败:', error)
    ElMessage.error('获取库存记录失败')
  } finally {
    stockLoading.value = false
  }
}

const fetchOperationLogs = async () => {
  try {
    logsLoading.value = true
    const params = {
      page: logsPagination.page,
      size: logsPagination.size
    }

    const response = await bookApi.getBookLogs(bookId.value, params)
    operationLogs.value = response.data
    logsPagination.total = response.total
  } catch (error) {
    console.error('获取操作日志失败:', error)
    ElMessage.error('获取操作日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 辅助方法
const getStatusText = status => {
  const statusMap = {
    available: '可借',
    borrowed: '已借出',
    maintenance: '维修中',
    offline: '已下架'
  }
  return statusMap[status] || status
}

const getStatusTagType = status => {
  const typeMap = {
    available: 'success',
    borrowed: 'warning',
    maintenance: 'info',
    offline: 'danger'
  }
  return typeMap[status] || 'info'
}

const getCategoryName = categoryId => {
  const categoryList = Array.isArray(categories.value) ? categories.value : []
  const category = categoryList.find(c => c.id === categoryId)
  return category ? category.name : '未分类'
}

const getCategoryTagType = categoryId => {
  const types = ['primary', 'success', 'warning', 'danger', 'info']
  return types[categoryId % types.length]
}

const getBorrowStatusText = status => {
  const statusMap = {
    borrowed: '借阅中',
    returned: '已归还',
    overdue: '逾期',
    renewed: '已续借'
  }
  return statusMap[status] || status
}

const getBorrowStatusTagType = status => {
  const typeMap = {
    borrowed: 'primary',
    returned: 'success',
    overdue: 'danger',
    renewed: 'warning'
  }
  return typeMap[status] || 'info'
}

const getStockTypeText = type => {
  const typeMap = {
    increase: '入库',
    decrease: '出库',
    adjust: '调整',
    borrow: '借出',
    return: '归还'
  }
  return typeMap[type] || type
}

const getStockTypeTagType = type => {
  const typeMap = {
    increase: 'success',
    decrease: 'danger',
    adjust: 'warning',
    borrow: 'primary',
    return: 'info'
  }
  return typeMap[type] || 'info'
}

const getActionText = action => {
  const actionMap = {
    create: '创建',
    update: '更新',
    delete: '删除',
    borrow: '借阅',
    return: '归还',
    view: '查看'
  }
  return actionMap[action] || action
}

const getActionTagType = action => {
  const typeMap = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    borrow: 'warning',
    return: 'info',
    view: ''
  }
  return typeMap[action] || 'info'
}

const getRatingPercentage = star => {
  const total = bookDetail.value?.reviewCount || 0
  const count = reviewsDistribution.value?.[star] || 0
  return total > 0 ? Math.round((count / total) * 100) : 0
}

const getRatingCount = star => {
  return reviewsDistribution.value?.[star] || 0
}

const isOverdue = dueDate => {
  return new Date(dueDate) < new Date()
}

// 操作方法
const goBack = () => {
  router.go(-1)
}

const handleEdit = () => {
  router.push(`/books/edit/${bookId.value}`)
}

const handleBorrow = () => {
  showBorrowDialog.value = true
}

const handleAction = async command => {
  switch (command) {
    case 'duplicate':
      await handleDuplicate()
      break
    case 'qrcode':
      showQRCodeDialog.value = true
      break
    case 'export':
      await handleExport()
      break
    case 'delete':
      await handleDelete()
      break
  }
}

const handleDuplicate = async () => {
  const confirmed = await confirm(`确定要复制图书《${bookDetail.value.title}》吗？`, '复制图书', { type: 'info' })
  if (!confirmed) return

  try {
    await bookApi.duplicateBook(bookId.value)
    showSuccess('图书复制成功')
  } catch (error) {
    console.error('复制图书失败:', error)
    showError('复制图书失败')
  }
}

const handleExport = async () => {
  try {
    const blob = await bookApi.exportBooks({ bookId: bookId.value })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${bookDetail.value.title}_详情.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    showSuccess('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showError('导出失败')
  }
}

const handleDelete = async () => {
  const confirmed = await confirmDelete(1, `图书《${bookDetail.value.title}》`)
  if (!confirmed) return

  try {
    await bookApi.deleteBook(bookId.value)
    showSuccess('图书删除成功')
    router.push('/books')
  } catch (error) {
    console.error('删除图书失败:', error)
    showError('删除图书失败')
  }
}

const handleReturn = async borrowRecord => {
  const confirmed = await confirm('确定要归还这本图书吗？', '归还图书', { type: 'info' })
  if (!confirmed) return

  try {
    await borrowApi.returnBook(borrowRecord.id)
    showSuccess('归还成功')
    fetchBorrowHistory()
    fetchBookDetail()
  } catch (error) {
    console.error('归还失败:', error)
    showError('归还失败')
  }
}

const handleRenew = async borrowRecord => {
  const confirmed = await confirm('确定要续借这本图书吗？', '续借图书', { type: 'info' })
  if (!confirmed) return

  try {
    await borrowApi.renewBook(borrowRecord.id, { renewalDays: 30 })
    showSuccess('续借成功')
    fetchBorrowHistory()
  } catch (error) {
    console.error('续借失败:', error)
    showError('续借失败')
  }
}

const handleBorrowSuccess = () => {
  showBorrowDialog.value = false
  fetchBorrowHistory()
  fetchBookDetail()
}

const handleStockAdjust = async () => {
  try {
    await stockFormRef.value.validate()
    adjustingStock.value = true

    const change = stockForm.type === 'decrease' ? -stockForm.quantity : stockForm.quantity

    await bookApi.adjustBookStock(bookId.value, {
      change,
      reason: stockForm.reason,
      note: stockForm.note
    })

    showSuccess('库存调整成功')
    showStockAdjustDialog.value = false
    fetchBookDetail()
    fetchStockHistory()
  } catch (error) {
    if (error !== false) {
      console.error('库存调整失败:', error)
      showError('库存调整失败')
    }
  } finally {
    adjustingStock.value = false
  }
}

const deleteReview = async review => {
  const confirmed = await confirmDelete(1, '评论')
  if (!confirmed) return

  try {
    await bookApi.deleteBookReview(bookId.value, review.id)
    showSuccess('评论删除成功')
    fetchReviews()
    fetchBookDetail()
  } catch (error) {
    console.error('删除评论失败:', error)
    showError('删除评论失败')
  }
}

const viewBorrowDetail = borrowRecord => {
  router.push(`/borrows/detail/${borrowRecord.id}`)
}

const viewLogDetail = log => {
  showInfo('操作日志详情功能开发中...')
}

const beforeUploadCover = file => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }

  // 处理文件上传
  const formData = new FormData()
  formData.append('cover', file)

  bookApi
    .updateBookCover(bookId.value, formData)
    .then(() => {
      showSuccess('封面更新成功')
      fetchBookDetail()
    })
    .catch(error => {
      console.error('封面更新失败:', error)
      showError('封面更新失败')
    })

  return false
}

// 生命周期
onMounted(() => {
  fetchBookDetail()
  fetchCategories()
  fetchBorrowHistory()
})
</script>

<style lang="scss" scoped>
.book-detail {
  padding: 20px;
  background-color: var(--content-bg-color);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;

  .breadcrumb {
    :deep(.el-breadcrumb__item) {
      font-size: 14px;
    }
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.book-content {
  .book-overview {
    margin-bottom: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

.book-cover-section {
  .cover-container {
    position: relative;
    margin-bottom: 20px;

    .book-cover {
      width: 100%;
      max-width: 200px;
      height: auto;
      aspect-ratio: 3/4;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--el-border-color-light);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .cover-actions {
      margin-top: 12px;
      text-align: center;
    }
  }

  .book-status-card {
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    padding: 16px;

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .status-label {
        color: var(--el-text-color-secondary);
        font-size: 14px;
      }

      .status-value {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }
  }
}

.book-info-section {
  .book-title-area {
    margin-bottom: 20px;

    .book-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      margin: 0 0 8px 0;
      line-height: 1.3;
    }

    .book-subtitle {
      font-size: 16px;
      color: var(--el-text-color-regular);
      margin-bottom: 16px;
    }

    .book-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .meta-label {
          color: var(--el-text-color-secondary);
          font-size: 14px;
        }

        .meta-value {
          color: var(--el-text-color-primary);
          font-weight: 500;
        }

        .review-count {
          margin-left: 8px;
          color: var(--el-text-color-secondary);
          font-size: 13px;
        }
      }
    }
  }

  .book-description {
    margin-bottom: 20px;

    h3 {
      font-size: 16px;
      color: var(--el-text-color-primary);
      margin: 0 0 12px 0;
    }

    p {
      line-height: 1.6;
      color: var(--el-text-color-regular);
      margin: 0;
    }
  }

  .book-details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
    margin-bottom: 20px;

    .detail-item {
      display: flex;

      .detail-label {
        width: 80px;
        color: var(--el-text-color-secondary);
        font-size: 14px;
      }

      .detail-value {
        flex: 1;
        color: var(--el-text-color-primary);
        font-size: 14px;
      }
    }
  }

  .book-tags {
    h4 {
      font-size: 14px;
      color: var(--el-text-color-primary);
      margin: 0 0 12px 0;
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .tag-item {
        cursor: default;
      }
    }
  }
}

.book-statistics {
  margin-bottom: 20px;

  .stat-card {
    :deep(.el-card__body) {
      padding: 20px;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;

        .el-icon {
          font-size: 20px;
          color: white;
        }

        &.borrow-icon {
          background: linear-gradient(135deg, #409eff, #5d73e7);
        }

        &.view-icon {
          background: linear-gradient(135deg, #67c23a, #85ce61);
        }

        &.favorite-icon {
          background: linear-gradient(135deg, #e6a23c, #f0a020);
        }

        &.reserve-icon {
          background: linear-gradient(135deg, #909399, #b1b3b8);
        }
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--el-text-color-primary);
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          color: var(--el-text-color-secondary);
          font-size: 14px;
        }
      }
    }
  }
}

.book-tabs {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  :deep(.el-tabs__content) {
    padding: 0;
  }

  .tab-content {
    padding: 20px;

    .tab-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .toolbar-left {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }

    .pagination-wrapper {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
  }
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

    .user-id {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.overdue {
  color: var(--el-color-danger);
  font-weight: 500;
}

.positive {
  color: var(--el-color-success);
  font-weight: 500;
}

.negative {
  color: var(--el-color-danger);
  font-weight: 500;
}

.reviews-summary {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;

  .rating-overview {
    display: flex;
    gap: 40px;
    align-items: center;

    .overall-rating {
      text-align: center;

      .rating-score {
        font-size: 48px;
        font-weight: 700;
        color: var(--el-color-warning);
        line-height: 1;
        margin-bottom: 8px;
      }

      .rating-count {
        color: var(--el-text-color-secondary);
        font-size: 14px;
        margin-top: 8px;
      }
    }

    .rating-distribution {
      flex: 1;

      .rating-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;

        .star-label {
          width: 30px;
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }

        .star-count {
          width: 30px;
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }

        :deep(.el-progress) {
          flex: 1;
        }
      }
    }
  }
}

.review-items {
  .review-item {
    padding: 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }

    .review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .reviewer-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .reviewer-details {
          .reviewer-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
          }

          .review-time {
            font-size: 13px;
            color: var(--el-text-color-secondary);
          }
        }
      }

      .review-actions {
        display: flex;
        gap: 8px;
      }
    }

    .review-content {
      line-height: 1.6;
      color: var(--el-text-color-regular);
      margin-bottom: 12px;
    }

    .review-images {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;

      .review-image {
        width: 80px;
        height: 80px;
        border-radius: 4px;
        cursor: pointer;
      }
    }
  }
}

.reviews-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.current-stock {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-color-primary);
}

// 响应式设计
@media (max-width: 768px) {
  .book-detail {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;

    .header-actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  .book-cover-section {
    text-align: center;
    margin-bottom: 20px;
  }

  .book-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .book-details-grid {
    grid-template-columns: 1fr;
  }

  .rating-overview {
    flex-direction: column;
    gap: 20px;

    .rating-distribution {
      width: 100%;
    }
  }

  .tab-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;

    .toolbar-left {
      width: 100%;
      flex-wrap: wrap;
    }
  }
}
</style>
