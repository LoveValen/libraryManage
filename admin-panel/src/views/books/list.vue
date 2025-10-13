<template>
  <div class="books-container">

    <!-- 鎼滅储绛涢€夊尯鍩?-->
    <SearchFilterSimple
      ref="searchFilterRef"
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="true"
      :default-collapsed="true"
      :collapsed-rows="1"
      @search="handleSearch"
      @reset="handleReset"
    />


    <!-- 鍥句功鍒楄〃鍗＄墖 -->
    <el-card shadow="never" class="books-card">
      <!-- 瑙嗗浘鎺у埗鏍?-->
      <div class="view-controls">
        <div class="view-controls-left">
          <el-radio-group v-model="viewMode" @change="handleViewModeChange" size="default">
            <el-radio-button value="grid">
              <el-icon><Grid /></el-icon>
              <span class="view-label">鍗＄墖瑙嗗浘</span>
            </el-radio-button>
            <el-radio-button value="table">
              <el-icon><List /></el-icon>
              <span class="view-label">琛ㄦ牸瑙嗗浘</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 鍥句功鍒楄〃 - 鍗＄墖瑙嗗浘 -->
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
                    <span>{{ book.borrowCount || 0 }}娆″€熼槄</span>
                  </div>
                  <div class="stat-item" v-if="showStock">
                    <el-icon><Box /></el-icon>
                    <span>{{ book.stock || 0 }}鏈簱瀛?/span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 鍥句功鍒楄〃 - 琛ㄦ牸瑙嗗浘 -->
      <div v-else>
        <ProTable
          ref="proTableRef"
          :request="requestBooks"
          :columns="bookTableColumns"
          :batch-actions="batchActions"
          :actions="rowActions"
          :row-selection="{ type: 'checkbox' }"
          :search="false"
          :toolBar="toolBarConfig"
          :action-column="{ width: 200, fixed: 'right', align: 'center' }"
          :max-height="finalTableHeight"
          row-key="id"
          stripe
          border
          @create="handleAdd"
          @selection-change="handleProTableSelectionChange"
        >
          <!-- 鍥句功淇℃伅鎻掓Ы -->
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

          <!-- 鍒嗙被鎻掓Ы -->
          <template #category="{ record }">
            <StatusTag :status="record.categoryId" :text="getCategoryName(record.categoryId)" size="small" />
          </template>

          <!-- 鐘舵€佹彃妲?-->
          <template #status="{ record }">
            <StatusTag :status="record.status" :preset="'book'" size="small" />
          </template>

          <!-- 浣嶇疆鎻掓Ы -->
          <template #location="{ record }">
            <div class="location-info">
              <el-icon><Position /></el-icon>
              <span>{{ record.location }}</span>
            </div>
          </template>

          <!-- 搴撳瓨淇℃伅鎻掓Ы -->
          <template #stock="{ record }">
            <div class="stock-info">
              <div class="stock-item">
                <span class="stock-label">搴撳瓨:</span>
                <span class="stock-value">{{ record.stock || 0 }}</span>
              </div>
              <div class="stock-item">
                <span class="stock-label">鍦ㄥ€?</span>
                <span class="borrowed-value">{{ record.borrowedCount || 0 }}</span>
              </div>
            </div>
          </template>

          <!-- 鍑虹増淇℃伅鎻掓Ы -->
          <template #publishInfo="{ record }">
            <div class="publish-info">
              <div class="publisher">{{ record.publisher || '-' }}</div>
              <div class="publish-date">{{ record.publishDate ? formatDate(record.publishDate) : '-' }}</div>
            </div>
          </template>

          <!-- 鍊熼槄娆℃暟鎻掓Ы -->
          <template #borrowCount="{ record }">
            <div class="borrow-count-info">
              <el-icon><Reading /></el-icon>
              <span>{{ record.borrowCount || 0 }}</span>
            </div>
          </template>

          <!-- 璇勫垎鎻掓Ы -->
          <template #rating="{ record }">
            <div class="rating-info">
              <el-rate v-model="record.rating" disabled size="small" />
              <span class="rating-count">({{ record.reviewCount || 0 }})</span>
            </div>
          </template>

          <!-- 鏃堕棿鎻掓Ы -->
          <template #createTime="{ record }">
            <div class="time-info">
              <div>{{ formatDate(record.createdAt) }}</div>
              <div class="time-ago">{{ formatTimeAgo(record.createdAt) }}</div>
            </div>
          </template>

          <!-- 宸ュ叿鏍忔彃妲?-->
          <template #toolBarRender="{ selectedRowKeys, selectedRows }">
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <!-- 宸︿晶鎿嶄綔鎸夐挳 -->
              <div style="display: flex; gap: 8px;">
                <!-- 鏂板鍥句功鎸夐挳 -->
                <el-button 
                  type="primary" 
                  @click="handleAdd"
                >
                鏂板鍥句功
                </el-button>
                
                <!-- 鎵归噺鎿嶄綔鎸夐挳锛堝缁堟樉绀猴紝鏃犻€変腑椤规椂绂佺敤锛?-->
                <el-button 
                  type="danger" 
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleBatchDeleteFromTable(selectedRows)"
                >
                  鎵归噺鍒犻櫎
                </el-button>
                <el-button 
                  type="warning" 
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleBatchUpdateStatusFromTable(selectedRows)"
                >
                  鎵归噺鐘舵€佹洿鏂?                </el-button>
                <el-button 
                  type="info" 
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleBatchMoveFromTable(selectedRows)"
                >
                  鎵归噺绉诲姩
                </el-button>
                
                <!-- 甯歌宸ュ叿鏍忔寜閽?-->
                <el-button type="info" :icon="Download" :loading="exportLoading" @click="handleExport">
                  瀵煎嚭鏁版嵁
                </el-button>
                <el-button type="success" :icon="Upload" @click="handleImport">
                  瀵煎叆鍥句功
                </el-button>
              </div>
              
              <!-- 鍙充晶宸ュ叿鎸夐挳 -->
              <div style="display: flex; gap: 8px;">
                <el-tooltip content="鍒锋柊鏁版嵁" placement="top">
                  <el-button :icon="Refresh" @click="handleRefresh" :loading="loading" />
                </el-tooltip>
                <el-tooltip content="鍒楄缃? placement="top">
                  <el-button :icon="Setting" @click="openColumnSettings" />
                </el-tooltip>
              </div>
            </div>
          </template>
        </ProTable>
      </div>
    </el-card>

    <!-- 鍒嗙被绠＄悊瀵硅瘽妗?-->
    <el-dialog v-model="showCategoryManager" title="鍒嗙被绠＄悊" width="800px" destroy-on-close>
      <CategoryManager @updated="fetchCategories" />
    </el-dialog>

    <!-- 鍒楄缃璇濇 -->
    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />

    <!-- 鍊熼槄瀵硅瘽妗?-->
    <el-dialog v-model="showBorrowDialog" title="鍊熼槄鍥句功" width="500px" destroy-on-close>
      <BorrowForm :book="selectedBook" @success="handleBorrowSuccess" />
    </el-dialog>

    <!-- 浜岀淮鐮佸璇濇 -->
    <el-dialog v-model="showQRCodeDialog" title="鍥句功浜岀淮鐮? width="400px" destroy-on-close>
      <QRCodeGenerator v-if="selectedBook" :book="selectedBook" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
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
import { bookLocationApi } from '@/api/bookLocation'
import { formatDate, formatTimeAgo } from '@/utils/date'
import { StatusTag, ProTable, ColumnSettings } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import BookCover from '@/components/common/BookCover.vue'
import CategoryManager from './components/CategoryManager.vue'
import BorrowForm from './components/BorrowForm.vue'
import QRCodeGenerator from './components/QRCodeGenerator.vue'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableRequest } from '@/composables/useTableRequest'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

const router = useRouter()

// 鍝嶅簲寮忔暟鎹?const exportLoading = ref(false)
const categories = ref([])
const locations = ref([])
const selectedBooks = ref([])
const viewMode = ref('table')
const showCover = ref(false)
const showStock = ref(false)
const showCategoryManager = ref(false)
const showBorrowDialog = ref(false)
const showQRCodeDialog = ref(false)
const selectedBook = ref(null)
const proTableRef = ref()
const searchFilterRef = ref()

// 鎼滅储琛ㄥ崟
const defaultSearchForm = Object.freeze({
  keyword: '',
  categoryId: null,
  status: '',
  locationId: null,
  dateRange: null
})
// 璁＄畻灞炴€?- 涓嬫媺閫夐」
const categoryOptions = computed(() =>
  categories.value.map(cat => ({ label: cat.name, value: cat.id }))
)

const locationOptions = computed(() =>
  locations.value.map(loc => ({ label: loc.name, value: loc.id }))
)

const defaultPageSizeTable = 20
const defaultPageSizeGrid = 24

const {
  searchForm,
  loading,
  dataSource: tableDataSource,
  pagination: tableState,
  request: requestBooks,
  reload: reloadBooks
} = useTableRequest((params) => bookApi.getBooks(params), {
  defaultSearch: defaultSearchForm,
  defaultPageSize: defaultPageSizeTable,
  manual: true,
  immediate: false,
  transform: (response) => {
    const payload = response?.data ?? undefined
    const list =
      Array.isArray(payload?.list)
        ? payload.list
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload)
              ? payload
              : []
    const totalCandidate = payload && typeof payload.total !== 'undefined' ? Number(payload.total) : undefined
    const fallbackTotal = typeof response?.total !== 'undefined' ? Number(response.total) : list.length
    return {
      list,
      total: Number.isFinite(totalCandidate) ? totalCandidate : fallbackTotal
    }
  },
  formatParams: ({ search, page, pageSize, sorter }) => {
    const filters = buildBookFilters(search)
    const query = {
      page,
      size: pageSize,
      ...filters
    }
    if (sorter?.field) {
      query.sortBy = sorter.field
      query.sortOrder = sorter.order && String(sorter.order).includes('asc') ? 'asc' : 'desc'
    }
    return query
  }
})

const bookList = computed(() => tableDataSource.value)

// 鍔犺浇鍩虹鏁版嵁 - 绠€鍖栫増
const loadCategories = async () => {
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
    console.error('鑾峰彇鍒嗙被澶辫触:', error)
  }
}

const loadLocations = async () => {
  try {
    const response = await bookLocationApi.getLocations({
      page: 1,
      size: 200,
      isActive: true
    })
    const rawData = response?.data
    const locationList = Array.isArray(rawData?.list)
      ? rawData.list
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.locations)
          ? rawData.locations
          : Array.isArray(rawData)
            ? rawData
            : []
    locations.value = locationList
  } catch (error) {
    console.error('鑾峰彇浣嶇疆澶辫触:', error)
  }
}


// 鎼滅储瀛楁閰嶇疆锛堝熀浜?ProForm 璁捐锛?const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '鍏抽敭璇?,
    placeholder: '杈撳叆涔﹀悕銆佷綔鑰呮垨ISBN鎼滅储',
    clearable: true
  },
  {
    name: 'categoryId',
    valueType: 'select',
    label: '鍥句功鍒嗙被',
    placeholder: '閫夋嫨鍥句功鍒嗙被',
    options: categoryOptions
  },
  {
    name: 'status',
    valueType: 'select',
    label: '鍥句功鐘舵€?,
    placeholder: '閫夋嫨鍥句功鐘舵€?,
    options: [
      { label: '鍙€熼槄', value: 'available' },
      { label: '宸插€熷嚭', value: 'borrowed' },
      { label: '缁存姢涓?, value: 'maintenance' },
      { label: '宸蹭笅鏋?, value: 'offline' }
    ]
  },
    {
    name: 'locationId',
    valueType: 'select',
    label: '瀛樻斁浣嶇疆',
    placeholder: '閫夋嫨瀛樻斁浣嶇疆',
    options: locationOptions
  },
  {
    name: 'dateRange',
    valueType: 'dateRange',
    label: '娣诲姞鏃堕棿',
    placeholder: '璇烽€夋嫨鏃堕棿鑼冨洿'
  }
]

const buildBookFilters = (form = searchForm) => {
  const filters = {}
  const keyword = typeof form.keyword === 'string' ? form.keyword.trim() : ''
  if (keyword) {
    filters.keyword = keyword
  }
  if (form.categoryId) {
    filters.categoryId = Number(form.categoryId)
  }
  if (form.status) {
    filters.status = form.status
  }
  if (form.locationId) {
    filters.locationId = Number(form.locationId)
  }
  if (Array.isArray(form.dateRange) && form.dateRange.length === 2) {
    const [start, end] = form.dateRange
    const startFormatted = formatDate(start)
    const endFormatted = formatDate(end)
    if (startFormatted) {
      filters.startDate = startFormatted
    }
    if (endFormatted) {
      filters.endDate = endFormatted
    }
  }
  return filters
}


// 鎵€鏈夊彲鐢ㄧ殑鍒楅厤缃?const allTableColumns = [
  {
    key: 'bookInfo',
    title: '鍥句功淇℃伅',
    slot: 'bookInfo',
    minWidth: 260,
    align: 'center'
  },
  {
    key: 'category',
    title: '鍒嗙被',
    slot: 'category',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'publishInfo',
    title: '鍑虹増淇℃伅',
    slot: 'publishInfo',
    minWidth: 150,
    align: 'center'
  },
  {
    key: 'status',
    title: '鐘舵€?,
    slot: 'status',
    minWidth: 90,
    sorter: true,
    align: 'center'
  },
  {
    key: 'location',
    title: '浣嶇疆',
    slot: 'location',
    minWidth: 130,
    align: 'center'
  },
  {
    key: 'stock',
    title: '搴撳瓨/鍊熼槄',
    slot: 'stock',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'rating',
    title: '璇勫垎',
    slot: 'rating',
    minWidth: 130,
    sorter: true,
    align: 'center'
  },
  {
    key: 'borrowCount',
    title: '鍊熼槄娆℃暟',
    slot: 'borrowCount',
    minWidth: 130,
    sorter: true,
    align: 'center'
  },
  {
    key: 'createTime',
    title: '娣诲姞鏃堕棿',
    slot: 'createTime',
    minWidth: 140,
    sorter: true,
    align: 'center'
  }
]

// 鍔ㄦ€佽繃婊ょ殑琛ㄦ牸鍒楅厤缃紙璁＄畻灞炴€э級
const bookTableColumns = computed(() => {
  // 鏍规嵁columnOptions鐨勯『搴忓拰visibleColumns鐨勯€夋嫨鏉ョ敓鎴愬垪
  const columnsMap = {}
  allTableColumns.forEach(col => {
    columnsMap[col.key] = col
  })
  
  // 鎸夌収columnOptions鐨勯『搴忚繑鍥炲彲瑙佺殑鍒?  return columnOptions.value
    .filter(opt => visibleColumns.value.includes(opt.value))
    .map(opt => columnsMap[opt.value])
    .filter(Boolean)
})

// 鎵归噺鎿嶄綔閰嶇疆
const batchActions = [
  {
    key: 'batchDelete',
    text: '鎵归噺鍒犻櫎',
    type: 'danger',
    onClick: (selectedRowKeys, selectedRows) => handleBatchDeleteFromTable(selectedRows)
  },
  {
    key: 'batchUpdateStatus',
    text: '鎵归噺鐘舵€佹洿鏂?,
    type: 'warning',
    onClick: (selectedRowKeys, selectedRows) => handleBatchUpdateStatusFromTable(selectedRows)
  },
  {
    key: 'batchMove',
    text: '鎵归噺绉诲姩',
    type: 'info',
    onClick: (selectedRowKeys, selectedRows) => handleBatchMoveFromTable(selectedRows)
  }
]

// 琛屾搷浣滈厤缃?const rowActions = [
  {
    key: 'view',
    text: '鏌ョ湅',
    type: 'text',
    onClick: (record) => handleView(record)
  },
  {
    key: 'edit',
    text: '缂栬緫',
    type: 'text',
    onClick: (record) => handleEdit(record)
  },
  {
    key: 'borrow',
    text: '鍊熼槄',
    type: 'text',
    onClick: (record) => handleBorrow(record)
  },
  {
    key: 'delete',
    text: '鍒犻櫎',
    type: 'text',
    onClick: (record) => handleDelete(record)
  }
]

// 宸ュ叿鏍忛厤缃?const toolBarConfig = {
  create: true,
  createText: '鏂板鍥句功',
  reload: true,
  density: true,
  columnSetting: true,
  fullScreen: true
}

// 榛樿鍒楄缃厤缃?const defaultVisibleColumns = [
  'bookInfo',
  'category',
  'status',
  'location',
  'stock',
  'rating',
  'createTime'
]

const defaultColumnOptions = [
  { label: '鍥句功淇℃伅', value: 'bookInfo', required: true },
  { label: '鍒嗙被', value: 'category' },
  { label: '鍑虹増淇℃伅', value: 'publishInfo' },
  { label: '鐘舵€?, value: 'status' },
  { label: '浣嶇疆', value: 'location' },
  { label: '搴撳瓨/鍊熼槄', value: 'stock' },
  { label: '璇勫垎', value: 'rating' },
  { label: '鍊熼槄娆℃暟', value: 'borrowCount' },
  { label: '娣诲姞鏃堕棿', value: 'createTime' }
]

// 浣跨敤缁熶竴鐨勫垪璁剧疆 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('book', defaultVisibleColumns, defaultColumnOptions)

// 浣跨敤琛ㄦ牸楂樺害绠＄悊 composable
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 220, // 鎼滅储鍖哄煙 + 宸ュ叿鏍?  footerOffset: 80   // 鍒嗛〉鍖哄煙
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)


// 鏂规硶
const getCategoryName = categoryId => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : '鏈垎绫?
}

// 鑾峰彇鍥句功鍒楄〃 - 缁熶竴澶勭悊
const fetchBooks = async (page = tableState.current, size) => {
  if (viewMode.value === 'table') {
    if (proTableRef.value?.reload) {
      proTableRef.value.reload(true)
      return
    }
    await reloadBooks({ page: page ?? 1, pageSize: tableState.pageSize || defaultPageSizeTable })
    return
  }
  const targetSize = size ?? defaultPageSizeGrid
  await reloadBooks({ page, pageSize: targetSize })
}

// 鍒嗙被鏇存柊鍥炶皟
const fetchCategories = () => loadCategories()

// 鎼滅储澶勭悊 - 缁熶竴鍖?const handleSearch = (criteria = {}) => {
  Object.assign(searchForm, criteria)
  if (viewMode.value === 'table') {
    if (proTableRef.value?.reload) {
      proTableRef.value.reload(true)
      return
    }
    reloadBooks({ page: 1, pageSize: tableState.pageSize || defaultPageSizeTable })
    return
  }
  reloadBooks({ page: 1, pageSize: defaultPageSizeGrid })
}

const handleReset = () => {
  Object.assign(searchForm, { ...defaultSearchForm })
  if (viewMode.value === 'table') {
    if (proTableRef.value?.reload) {
      proTableRef.value.reload(true)
      return
    }
    reloadBooks({ page: 1, pageSize: defaultPageSizeTable })
    return
  }
  reloadBooks({ page: 1, pageSize: defaultPageSizeGrid })
}

const handleViewModeChange = mode => {
  viewMode.value = mode
  if (mode === 'table') {
    if (proTableRef.value?.reload) {
      proTableRef.value.reload(true)
      return
    }
    reloadBooks({ page: 1, pageSize: defaultPageSizeTable })
    return
  }
  reloadBooks({ page: 1, pageSize: defaultPageSizeGrid })
}


// ProTable閫夋嫨鍙樺寲澶勭悊
const handleProTableSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedBooks.value = selectedRows
}



const handleAdd = () => {
  router.push('/books/create')
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
    await ElMessageBox.confirm(`纭畾瑕佸垹闄ゅ浘涔︺€?{book.title}銆嬪悧锛熸鎿嶄綔涓嶅彲鎾ら攢锛乣, '鍒犻櫎鍥句功', { type: 'warning' })

    await bookApi.deleteBook(book.id)
    ElMessage.success('鍥句功鍒犻櫎鎴愬姛')
    fetchBooks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('鍒犻櫎鍥句功澶辫触:', error)
      ElMessage.error('鍒犻櫎鍥句功澶辫触')
    }
  }
}



// ProTable鎵归噺鎿嶄綔澶勭悊鍑芥暟
const handleBatchDeleteFromTable = async (selectedRows) => {
  try {
    await ElMessageBox.confirm(
      `纭畾瑕佸垹闄ら€変腑鐨?${selectedRows.length} 鏈浘涔﹀悧锛熸鎿嶄綔涓嶅彲鎾ら攢锛乣,
      '鎵归噺鍒犻櫎',
      { type: 'warning' }
    )

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchDeleteBooks(bookIds)

    ElMessage.success('鎵归噺鍒犻櫎鎴愬姛')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('鎵归噺鍒犻櫎澶辫触:', error)
      ElMessage.error('鎵归噺鍒犻櫎澶辫触')
    }
  }
}

const handleBatchUpdateStatusFromTable = async (selectedRows) => {
  try {
    const { value: newStatus } = await ElMessageBox.prompt(`閫夋嫨瑕佽缃殑鐘舵€侊細`, '鎵归噺鏇存柊鐘舵€?, {
      confirmButtonText: '纭畾',
      cancelButtonText: '鍙栨秷',
      inputType: 'select',
      inputOptions: [
        { value: 'available', label: '鍙€? },
        { value: 'maintenance', label: '缁翠慨涓? },
        { value: 'offline', label: '宸蹭笅鏋? }
      ]
    })

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchUpdateStatus(bookIds, newStatus)

    ElMessage.success('鎵归噺鏇存柊鎴愬姛')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('鎵归噺鏇存柊澶辫触:', error)
      ElMessage.error('鎵归噺鏇存柊澶辫触')
    }
  }
}

const handleBatchMoveFromTable = async (selectedRows) => {
  try {
    const { value: newLocation } = await ElMessageBox.prompt('璇疯緭鍏ユ柊鐨勪綅缃細', '鎵归噺绉诲姩浣嶇疆', {
      confirmButtonText: '纭畾',
      cancelButtonText: '鍙栨秷'
    })

    const bookIds = selectedRows.map(book => book.id)
    await bookApi.batchUpdateLocation(bookIds, newLocation)

    ElMessage.success('鎵归噺绉诲姩鎴愬姛')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('鎵归噺绉诲姩澶辫触:', error)
      ElMessage.error('鎵归噺绉诲姩澶辫触')
    }
  }
}



const handleImport = () => {
  ElMessage.info('鎵归噺瀵煎叆鍔熻兘寮€鍙戜腑...')
}

const handleRefresh = () => {
  proTableRef.value?.refresh()
}

const handleExport = async () => {
  try {
    exportLoading.value = true

    const params = {
      ...searchForm,
      // 澶勭悊鏃ユ湡鑼冨洿
      ...(searchForm.dateRange?.length === 2 && (() => {
        const [start, end] = searchForm.dateRange
        const startFormatted = formatDate(start)
        const endFormatted = formatDate(end)
        const rangeParams = {}
        if (startFormatted) {
          rangeParams.startDate = startFormatted
        }
        if (endFormatted) {
          rangeParams.endDate = endFormatted
        }
        return rangeParams
      })())
    }

    // 杞崲鏁板瓧绫诲瀷
    if (params.categoryId) params.categoryId = Number(params.categoryId)
    if (params.locationId) params.locationId = Number(params.locationId)
    delete params.dateRange

    const blob = await bookApi.exportBooks(params)

    // 鍒涘缓涓嬭浇閾炬帴
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `鍥句功鏁版嵁_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('瀵煎嚭鎴愬姛')
  } catch (error) {
    console.error('瀵煎嚭澶辫触:', error)
    ElMessage.error('瀵煎嚭澶辫触')
  } finally {
    exportLoading.value = false
  }
}

const handleBorrowSuccess = () => {
  showBorrowDialog.value = false
  fetchBooks()
  ElMessage.success('鍊熼槄鎴愬姛')
}

// 鍒楄缃簲鐢ㄥ洖璋?- 鍖呰handleApplyFromComponent浠ユ坊鍔燩roTable鍒锋柊
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 寮哄埗鍒锋柊ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
}

// 鐢熷懡鍛ㄦ湡
onMounted(() => {
  Promise.all([loadCategories(), loadLocations()])
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
  margin-bottom: 20px;
}

.view-controls-left {
  display: flex;
  align-items: center;
}

.view-label {
  margin-left: 6px;
  font-size: 13px;
  vertical-align: text-top;
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
.books-grid {
  .book-card-col {
    margin-bottom: 20px;
  }
}

.book-card {
  background: white;
  border-radius: 8px;
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
    border-radius: 8px;
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

// 鍒楄缃璇濇鏍峰紡
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

// 鍝嶅簲寮忚璁?@media (max-width: 768px) {
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
