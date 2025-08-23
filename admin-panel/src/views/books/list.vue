<template>
  <div class="books-container">

    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="true"
      :default-collapsed="true"
      :collapsed-rows="1"
      @search="handleSearch"
      @reset="handleReset"
    />


    <!-- 图书列表卡片 -->
    <el-card shadow="never" class="books-card">
      <!-- 视图控制栏 -->
      <div class="view-controls">
        <div class="view-controls-left">
          <el-radio-group v-model="viewMode" @change="handleViewModeChange" size="default">
            <el-radio-button value="grid">
              <el-icon><Grid /></el-icon>
              <span class="view-label">卡片视图</span>
            </el-radio-button>
            <el-radio-button value="table">
              <el-icon><List /></el-icon>
              <span class="view-label">表格视图</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 图书列表内容 -->
      <div class="books-content">
        <!-- 图书列表 - 卡片视图 -->
        <div v-if="viewMode === 'grid'" class="books-grid">
          <el-row :gutter="20" v-loading="loading">
            <el-col v-for="book in bookList" :key="book.id" :xl="6" :lg="8" :md="12" :sm="24" class="book-card-col">
              <div class="book-card" @click="handleView(book)">
                <div class="book-cover-container">
                  <BookCover 
                    :src="book.cover || book.coverUrl || book.cover_image" 
                    :title="book.title"
                    :alt="book.title"
                    width="100%"
                    height="240"
                    :show-title="!book.cover && !book.coverUrl && !book.cover_image"
                  />
                  <div class="book-overlay">
                    <div class="book-actions">
                      <el-button type="primary" circle @click.stop="handleView(book)">
                        <el-icon><View /></el-icon>
                      </el-button>
                      <el-button type="success" circle @click.stop="handleEdit(book)">
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button type="warning" circle @click.stop="handleBorrow(book)">
                        <el-icon><Reading /></el-icon>
                      </el-button>
                    </div>
                  </div>
                  <StatusTag :status="book.status" :preset="'book'" size="small" class="book-status-tag" />
                </div>

                <div class="book-info">
                  <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
                  <p class="book-author">{{ book.author }}</p>
                  <div class="book-meta">
                    <div class="book-category">
                      <StatusTag :status="book.categoryId" :text="getCategoryName(book.categoryId)" size="small" />
                    </div>
                    <div class="book-rating">
                      <el-rate v-model="book.rating" disabled size="small" show-score />
                    </div>
                  </div>
                  <div class="book-stats">
                    <div class="stat-item">
                      <el-icon><Reading /></el-icon>
                      <span>{{ book.borrowCount || 0 }}次借阅</span>
                    </div>
                    <div class="stat-item" v-if="showStock">
                      <el-icon><Box /></el-icon>
                      <span>{{ book.stock || 0 }}本库存</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 图书列表 - 表格视图 -->
        <div v-else class="table-section">
          <ProTable
            ref="proTableRef"
            :request="requestBooks"
            :columns="bookTableColumns"
            :batch-actions="batchActions"
            :actions="rowActions"
            :row-selection="{ type: 'checkbox' }"
            :search="false"
            :toolBar="toolBarConfig"
            :params="searchParams"
            :action-column="{ width: 200, fixed: 'right', align: 'center' }"
            :max-height="finalTableHeight"
            row-key="id"
            stripe
            border
            @create="handleAdd"
            @selection-change="handleProTableSelectionChange"
          >
            <!-- 图书信息插槽 -->
            <template #bookInfo="{ record }">
              <div class="book-info-cell">
                <img v-if="showCover" :src="record.cover" :alt="record.title" class="book-cover-small" />
                <div class="book-details">
                  <div class="book-title-cell">{{ record.title }}</div>
                  <div class="book-author-cell">{{ record.author }}</div>
                  <div class="book-isbn-cell">ISBN: {{ record.isbn }}</div>
                </div>
              </div>
            </template>

            <!-- 分类插槽 -->
            <template #category="{ record }">
              <StatusTag :status="record.categoryId" :text="getCategoryName(record.categoryId)" size="small" />
            </template>

            <!-- 状态插槽 -->
            <template #status="{ record }">
              <StatusTag :status="record.status" :preset="'book'" size="small" />
            </template>

            <!-- 位置插槽 -->
            <template #location="{ record }">
              <div class="location-info">
                <el-icon><Position /></el-icon>
                <span>{{ record.location }}</span>
              </div>
            </template>

            <!-- 库存信息插槽 -->
            <template #stock="{ record }">
              <div class="stock-info">
                <div class="stock-item">
                  <span class="stock-label">库存:</span>
                  <span class="stock-value">{{ record.stock || 0 }}</span>
                </div>
                <div class="stock-item">
                  <span class="stock-label">在借:</span>
                  <span class="borrowed-value">{{ record.borrowedCount || 0 }}</span>
                </div>
              </div>
            </template>

            <!-- 出版信息插槽 -->
            <template #publishInfo="{ record }">
              <div class="publish-info">
                <div class="publisher">{{ record.publisher || '-' }}</div>
                <div class="publish-date">{{ record.publishDate ? formatDate(record.publishDate) : '-' }}</div>
              </div>
            </template>

            <!-- 借阅次数插槽 -->
            <template #borrowCount="{ record }">
              <div class="borrow-count-info">
                <el-icon><Reading /></el-icon>
                <span>{{ record.borrowCount || 0 }}</span>
              </div>
            </template>

            <!-- 评分插槽 -->
            <template #rating="{ record }">
              <div class="rating-info">
                <el-rate v-model="record.rating" disabled size="small" />
                <span class="rating-count">({{ record.reviewCount || 0 }})</span>
              </div>
            </template>

            <!-- 时间插槽 -->
            <template #createTime="{ record }">
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
                  <!-- 新增图书按钮 -->
                  <el-dropdown split-button type="primary" @click="handleAdd">
                    新增图书
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="handleAdd">
                          <el-icon><Document /></el-icon>
                          手动添加
                        </el-dropdown-item>
                        <el-dropdown-item @click="handleAddFromAPI">
                          <el-icon><Download /></el-icon>
                          从网络添加
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  
                  <!-- 批量操作按钮（始终显示，无选中项时禁用） -->
                  <el-button 
                    type="danger" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchDeleteFromTable(selectedRows)"
                  >
                    批量删除
                  </el-button>
                  <el-button 
                    type="warning" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchUpdateStatusFromTable(selectedRows)"
                  >
                    批量状态更新
                  </el-button>
                  <el-button 
                    type="info" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchMoveFromTable(selectedRows)"
                  >
                    批量移动
                  </el-button>
                  
                  <!-- 常规工具栏按钮 -->
                  <el-button type="info" :icon="Download" :loading="exportLoading" @click="handleExport">
                    导出数据
                  </el-button>
                  <el-button type="success" :icon="Upload" @click="handleImport">
                    导入图书
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
        </div>
      </div>
    </el-card>

    <!-- 分类管理对话框 -->
    <el-dialog v-model="showCategoryManager" title="分类管理" width="800px" destroy-on-close>
      <CategoryManager @updated="fetchCategories" />
    </el-dialog>

    <!-- 列设置对话框 -->
    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />

    <!-- 借阅对话框 -->
    <el-dialog v-model="showBorrowDialog" title="借阅图书" width="500px" destroy-on-close>
      <BorrowForm :book="selectedBook" @success="handleBorrowSuccess" />
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="showQRCodeDialog" title="图书二维码" width="400px" destroy-on-close>
      <QRCodeGenerator v-if="selectedBook" :book="selectedBook" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Grid,
  List,
  Download,
  Upload,
  Refresh,
  Setting,
  View,
  Edit,
  Reading,
  Position,
  Box,
  Document
} from '@element-plus/icons-vue'
import { bookApi } from '@/api/book'
import { formatDate, formatTimeAgo } from '@/utils/date'
import { StatusTag, ProTable, ColumnSettings } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import BookCover from '@/components/common/BookCover.vue'
import CategoryManager from './components/CategoryManager.vue'
import BorrowForm from './components/BorrowForm.vue'
import QRCodeGenerator from './components/QRCodeGenerator.vue'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const bookList = ref([])
const categories = ref([])
const locations = ref(['A区', 'B区', 'C区', 'D区', '阅览室', '特藏室'])
const selectedBooks = ref([])
const viewMode = ref('table')
const showCover = ref(false)
const showStock = ref(false)
const sortBy = ref('createdAt')
const sortOrder = ref('desc')
const showCategoryManager = ref(false)
const showBorrowDialog = ref(false)
const showQRCodeDialog = ref(false)
const selectedBook = ref(null)
const proTableRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  category: '',
  status: '',
  location: '',
  dateRange: null
})

// 计算属性 - 选项数据
const categoryOptions = computed(() => 
  categories.value?.filter(cat => cat && cat.name && cat.id)
    .map(cat => ({ label: cat.name, value: cat.id })) || []
)

const locationOptions = computed(() => 
  locations.value?.filter(loc => loc && typeof loc === 'string')
    .map(loc => ({ label: loc, value: loc })) || []
)

// 搜索字段配置（基于 ProForm 设计）
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入书名、作者或ISBN搜索',
    clearable: true
  },
  {
    name: 'category',
    valueType: 'select',
    label: '图书分类',
    placeholder: '选择图书分类',
    options: categoryOptions
  },
  {
    name: 'status',
    valueType: 'select',
    label: '图书状态',
    placeholder: '选择图书状态',
    options: [
      { label: '可借阅', value: 'available' },
      { label: '已借出', value: 'borrowed' },
      { label: '维护中', value: 'maintenance' },
      { label: '已下架', value: 'offline' }
    ]
  },
  {
    name: 'location',
    valueType: 'select',
    label: '存放位置',
    placeholder: '选择存放位置',
    options: locationOptions
  },
  {
    name: 'dateRange',
    valueType: 'dateRange',
    label: '添加时间',
    placeholder: ['开始日期', '结束日期']
  }
]

// 分页信息
const pagination = reactive({
  page: 1,
  size: 24,
  total: 0
})

// ProTable配置
const searchParams = computed(() => ({
  ...searchForm,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value
}))

// 所有可用的列配置
const allTableColumns = [
  {
    key: 'bookInfo',
    title: '图书信息',
    slot: 'bookInfo',
    minWidth: 260,
    align: 'center'
  },
  {
    key: 'category',
    title: '分类',
    slot: 'category',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'publishInfo',
    title: '出版信息',
    slot: 'publishInfo',
    minWidth: 150,
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
    key: 'location',
    title: '位置',
    slot: 'location',
    minWidth: 130,
    align: 'center'
  },
  {
    key: 'stock',
    title: '库存/借阅',
    slot: 'stock',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'rating',
    title: '评分',
    slot: 'rating',
    minWidth: 130,
    sorter: true,
    align: 'center'
  },
  {
    key: 'borrowCount',
    title: '借阅次数',
    slot: 'borrowCount',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'createTime',
    title: '添加时间',
    slot: 'createTime',
    minWidth: 140,
    sorter: true,
    align: 'center'
  }
]

// 动态过滤的表格列配置（计算属性）
const bookTableColumns = computed(() => {
  // 根据columnOptions的顺序和visibleColumns的选择来生成列
  const columnsMap = {}
  allTableColumns.forEach(col => {
    columnsMap[col.key] = col
  })
  
  // 按照columnOptions的顺序返回可见的列
  return columnOptions.value
    .filter(opt => visibleColumns.value.includes(opt.value))
    .map(opt => columnsMap[opt.value])
    .filter(Boolean)
})

// 批量操作配置
const batchActions = [
  {
    key: 'batchDelete',
    text: '批量删除',
    type: 'danger',
    onClick: (selectedRowKeys, selectedRows) => handleBatchDeleteFromTable(selectedRows)
  },
  {
    key: 'batchUpdateStatus',
    text: '批量状态更新',
    type: 'warning',
    onClick: (selectedRowKeys, selectedRows) => handleBatchUpdateStatusFromTable(selectedRows)
  },
  {
    key: 'batchMove',
    text: '批量移动',
    type: 'info',
    onClick: (selectedRowKeys, selectedRows) => handleBatchMoveFromTable(selectedRows)
  }
]

// 行操作配置
const rowActions = [
  {
    key: 'view',
    text: '查看',
    type: 'text',
    onClick: (record) => handleView(record)
  },
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: (record) => handleEdit(record)
  },
  {
    key: 'borrow',
    text: '借阅',
    type: 'text',
    onClick: (record) => handleBorrow(record)
  },
  {
    key: 'delete',
    text: '删除',
    type: 'text',
    onClick: (record) => handleDelete(record)
  }
]

// 工具栏配置
const toolBarConfig = {
  create: true,
  createText: '新增图书',
  reload: true,
  density: true,
  columnSetting: true,
  fullScreen: true
}

// 默认列设置配置
const defaultVisibleColumns = [
  'bookInfo',
  'category',
  'status',
  'location',
  'stock',
  'rating',
  'createTime'
]

const defaultColumnOptions = [
  { label: '图书信息', value: 'bookInfo', required: true },
  { label: '分类', value: 'category' },
  { label: '出版信息', value: 'publishInfo' },
  { label: '状态', value: 'status' },
  { label: '位置', value: 'location' },
  { label: '库存/借阅', value: 'stock' },
  { label: '评分', value: 'rating' },
  { label: '借阅次数', value: 'borrowCount' },
  { label: '添加时间', value: 'createTime' }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('book', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 220, // 搜索区域 + 工具栏
  footerOffset: 80   // 分页区域
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)


// 方法
const getCategoryName = categoryId => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : '未分类'
}

const fetchBooks = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      ...searchForm
    }

    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await bookApi.getBooks(params)
    bookList.value = response.data || []
    pagination.total = response.pagination?.total || 0

  } catch (error) {
    console.error('获取图书列表失败:', error)
    ElMessage.error('获取图书列表失败')
  } finally {
    loading.value = false
  }
}

// ProTable数据请求函数
const requestBooks = async (params) => {
  try {
    console.log('ProTable请求参数:', params)
    
    const requestParams = {
      page: params.current || 1,
      size: params.pageSize || 20,
      sortBy: params.sorter || 'createdAt',
      sortOrder: params.order === 'ascend' ? 'asc' : 'desc',
      ...searchForm
    }

    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      requestParams.startDate = searchForm.dateRange[0]
      requestParams.endDate = searchForm.dateRange[1]
    }

    const response = await bookApi.getBooks(requestParams)
    
    return {
      success: true,
      data: response.data || [],
      total: response.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取图书列表失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  }
}

const fetchCategories = async () => {
  try {
    const { data } = await bookApi.getCategories()
    categories.value = data.categories
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}


const handleSearch = () => {
  pagination.page = 1
  fetchBooks()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    category: '',
    status: '',
    location: '',
    dateRange: null
  })
  pagination.page = 1
  fetchBooks()
}

const handleViewModeChange = mode => {
  viewMode.value = mode
  if (mode === 'grid') {
    pagination.size = 24
  } else {
    pagination.size = 20
  }
  pagination.page = 1
  fetchBooks()
}



// ProTable选择变化处理
const handleProTableSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedBooks.value = selectedRows
}



const handleAdd = () => {
  router.push('/books/create')
}

const handleAddFromAPI = () => {
  router.push('/books/add-with-api')
}

const handleView = book => {
  router.push(`/books/detail/${book.id}`)
}

const handleEdit = book => {
  router.push(`/books/edit/${book.id}`)
}

const handleBorrow = book => {
  selectedBook.value = book
  showBorrowDialog.value = true
}





const handleDelete = async book => {
  try {
    await ElMessageBox.confirm(`确定要删除图书《${book.title}》吗？此操作不可撤销！`, '删除图书', { type: 'warning' })

    await bookApi.deleteBook(book.id)
    ElMessage.success('图书删除成功')
    fetchBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除图书失败:', error)
      ElMessage.error('删除图书失败')
    }
  }
}



// ProTable批量操作处理函数
const handleBatchDeleteFromTable = async (selectedRows) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.length} 本图书吗？此操作不可撤销！`,
      '批量删除',
      { type: 'warning' }
    )

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchDeleteBooks(bookIds)

    ElMessage.success('批量删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const handleBatchUpdateStatusFromTable = async (selectedRows) => {
  try {
    const { value: newStatus } = await ElMessageBox.prompt(`选择要设置的状态：`, '批量更新状态', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'select',
      inputOptions: [
        { value: 'available', label: '可借' },
        { value: 'maintenance', label: '维修中' },
        { value: 'offline', label: '已下架' }
      ]
    })

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchUpdateStatus(bookIds, newStatus)

    ElMessage.success('批量更新成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量更新失败:', error)
      ElMessage.error('批量更新失败')
    }
  }
}

const handleBatchMoveFromTable = async (selectedRows) => {
  try {
    const { value: newLocation } = await ElMessageBox.prompt('请输入新的位置：', '批量移动位置', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchUpdateLocation(bookIds, newLocation)

    ElMessage.success('批量移动成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量移动失败:', error)
      ElMessage.error('批量移动失败')
    }
  }
}



const handleImport = () => {
  ElMessage.info('批量导入功能开发中...')
}

const handleRefresh = () => {
  proTableRef.value?.refresh()
}

const handleExport = async () => {
  try {
    exportLoading.value = true
    const params = { ...searchForm }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const blob = await bookApi.exportBooks(params)

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `图书数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const handleBorrowSuccess = () => {
  showBorrowDialog.value = false
  fetchBooks()
  ElMessage.success('借阅成功')
}

// 列设置应用回调 - 包装handleApplyFromComponent以添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
}

// 生命周期
onMounted(() => {
  fetchBooks()
  fetchCategories()
})
</script>

<style lang="scss" scoped>
.books-container {
  background-color: var(--content-bg-color);
}


.books-card {
  margin-bottom: 20px;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}

.view-controls-left {
  display: flex;
  align-items: center;
}

.view-controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-label {
  margin-left: 6px;
  font-size: 13px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.books-content {
  padding: 0 20px 20px;
}

.books-grid {
  .book-card-col {
    margin-bottom: 20px;
  }
}

.book-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);

    .book-overlay {
      opacity: 1;
    }
  }
}

.book-cover-container {
  position: relative;
  height: 240px;
  overflow: hidden;

  .book-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .book-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;

    .book-actions {
      display: flex;
      gap: 12px;
    }
  }

  .book-status {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: white;

    &.status--available {
      background: var(--el-color-success);
    }

    &.status--borrowed {
      background: var(--el-color-warning);
    }

    &.status--maintenance {
      background: var(--el-color-info);
    }

    &.status--offline {
      background: var(--el-color-danger);
    }
  }
}

.book-info {
  padding: 16px;

  .book-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 8px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-author {
    color: var(--el-text-color-secondary);
    margin: 0 0 12px 0;
    font-size: 14px;
  }
}

.book-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.book-rating {
  :deep(.el-rate) {
    height: auto;
  }
}

.book-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.book-info-cell {
  display: flex;
  gap: 12px;
  align-items: center;

  .book-cover-small {
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .book-details {
    flex: 1;
    min-width: 0;

    .book-title-cell {
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .book-author-cell {
      color: var(--el-text-color-regular);
      margin-bottom: 2px;
      font-size: 13px;
    }

    .book-isbn-cell {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }
}

.publish-info {
  .publisher {
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .publish-date {
    color: var(--el-text-color-regular);
    margin-bottom: 2px;
    font-size: 13px;
  }

  .edition {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.location-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.stock-info {
  .stock-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .stock-label {
      color: var(--el-text-color-secondary);
    }

    .stock-value {
      font-weight: 600;
      color: var(--el-color-primary);
    }

    .borrowed-value {
      font-weight: 600;
      color: var(--el-color-warning);
    }
  }
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .rating-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.borrow-count {
  font-weight: 600;
  color: var(--el-color-success);
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

// 列设置对话框样式
.column-settings-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.column-settings-list {
  display: flex;
  flex-direction: column;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.2s;
  cursor: move;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.is-disabled {
    cursor: default;
    background: #fafafa;
  }
  
  &[draggable="true"]:active {
    background: #ecf5ff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    z-index: 10;
    position: relative;
  }
}

.drag-handle {
  margin-right: 12px;
  color: #c0c4cc;
  cursor: move;
  font-size: 14px;
  
  &:hover {
    color: #909399;
  }
}

.drag-handle-placeholder {
  width: 26px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;
  
  .el-button {
    padding: 4px;
    background: transparent;
    border-color: #dcdfe6;
    
    &:hover:not(:disabled) {
      background: #f5f7fa;
      border-color: #c0c4cc;
      color: #409eff;
    }
    
    &:disabled {
      opacity: 0.4;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .view-controls {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .view-controls-left,
  .view-controls-right {
    width: 100%;
    justify-content: flex-start;
  }

  .view-controls-right {
    flex-wrap: wrap;
    gap: 12px;
  }
}

@media (max-width: 480px) {

  .book-info-cell {
    .book-cover-small {
      width: 32px;
      height: 44px;
    }

    .book-details {
      .book-title-cell {
        font-size: 14px;
      }
    }
  }
}
</style>
