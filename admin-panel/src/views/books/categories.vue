<template>
  <div class="categories-container">
    <!-- 页面头部 -->
    <PageHeader
      title="图书分类"
      description="管理图书分类信息，查看各分类下的图书数量"
      icon="Menu"
      :actions="headerActions"
      @action="handleHeaderAction"
    />

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <StatCard
          title="分类总数"
          :value="statistics.totalCategories"
          icon="FolderOpened"
          type="primary"
          :show-trend="false"
        />
        <StatCard
          title="已分类图书"
          :value="statistics.categorizedBooks"
          icon="Reading"
          type="success"
          :show-trend="false"
        />
        <StatCard
          title="未分类图书"
          :value="statistics.uncategorizedBooks"
          icon="QuestionFilled"
          type="warning"
          :show-trend="false"
        />
        <StatCard
          title="最大分类图书数"
          :value="statistics.maxBooksInCategory"
          icon="TrendCharts"
          type="info"
          :show-trend="false"
        />
      </div>
    </div>

    <!-- 搜索筛选 -->
    <SearchFilter
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 分类列表 -->
    <el-card shadow="never" class="categories-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Menu /></el-icon>
            分类列表
          </div>
          <div class="header-actions">
            <el-button type="primary" :icon="Refresh" @click="loadCategories" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="categories-content">
        <!-- 空状态 -->
        <el-empty v-if="!loading && categories.length === 0" description="暂无分类数据" image-size="120">
          <el-button type="primary" @click="loadCategories">重新加载</el-button>
        </el-empty>

        <!-- 分类网格 -->
        <div v-else class="categories-grid">
          <div
            v-for="(category, index) in filteredCategories"
            :key="category.name"
            class="category-item"
            :class="{ 'category-selected': selectedCategories.includes(category.name) }"
            @click="toggleCategorySelection(category.name)"
          >
            <div class="category-content">
              <div class="category-header">
                <div class="category-icon">
                  <el-icon :style="{ color: getCategoryColor(index) }">
                    <FolderOpened />
                  </el-icon>
                </div>
                <div class="category-actions">
                  <el-dropdown @command="handleCategoryAction">
                    <el-button type="text" :icon="MoreFilled" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="{ action: 'viewBooks', category: category.name }" :icon="View">
                          查看图书
                        </el-dropdown-item>
                        <el-dropdown-item :command="{ action: 'editCategory', category: category.name }" :icon="Edit">
                          编辑分类
                        </el-dropdown-item>
                        <el-dropdown-item
                          :command="{ action: 'deleteCategory', category: category.name }"
                          :icon="Delete"
                          divided
                        >
                          删除分类
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>

              <div class="category-info">
                <h3 class="category-name">{{ category.name || '未分类' }}</h3>
                <p class="category-description">
                  {{ getCategoryDescription(category.name) }}
                </p>
              </div>

              <div class="category-stats">
                <div class="stat-item">
                  <span class="stat-label">图书数量</span>
                  <span class="stat-value">{{ category.bookCount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">可借数量</span>
                  <span class="stat-value available">{{ category.availableCount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">借出数量</span>
                  <span class="stat-value borrowed">{{ category.borrowedCount }}</span>
                </div>
              </div>

              <div class="category-footer">
                <el-tag :type="getCategoryTagType(category.bookCount)" size="small">
                  {{ getCategoryLevel(category.bookCount) }}
                </el-tag>
                <span class="update-time">最新更新: {{ formatDate(category.lastUpdated) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="filteredCategories.length > 0" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[12, 24, 48, 96]"
            :total="filteredCategories.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedCategories.length > 0" class="batch-toolbar">
      <div class="toolbar-content">
        <div class="selected-info">
          已选择
          <strong>{{ selectedCategories.length }}</strong>
          个分类
        </div>
        <div class="toolbar-actions">
          <el-button @click="clearSelection">取消选择</el-button>
          <el-button type="primary" :icon="Download" @click="exportSelectedCategories">导出数据</el-button>
          <el-button type="danger" :icon="Delete" @click="batchDeleteCategories">批量删除</el-button>
        </div>
      </div>
    </div>

    <!-- 编辑分类对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑分类" width="500px" :close-on-click-modal="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editFormRules" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入分类名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            placeholder="请输入分类描述"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveCategory" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Menu,
  FolderOpened,
  Refresh,
  MoreFilled,
  View,
  Edit,
  Delete,
  Download,
  QuestionFilled,
  TrendCharts,
  Reading
} from '@element-plus/icons-vue'
import { PageHeader, StatCard, SearchFilter } from '@/components/common'
import { getBookCategories, getBookStatistics, getBooks } from '@/api/books'
import { formatDate } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const selectedCategories = ref([])
const editDialogVisible = ref(false)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  sortBy: 'bookCount',
  sortOrder: 'desc'
})

// 统计数据
const statistics = reactive({
  totalCategories: 0,
  categorizedBooks: 0,
  uncategorizedBooks: 0,
  maxBooksInCategory: 0
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 12
})

// 编辑表单
const editForm = reactive({
  name: '',
  description: ''
})

const editFormRef = ref()

// 头部操作按钮
const headerActions = [
  {
    key: 'refresh',
    label: '刷新数据',
    type: 'default',
    icon: 'Refresh'
  }
]

// 搜索字段配置
const searchFields = [
  {
    key: 'keyword',
    type: 'input',
    label: '关键词',
    placeholder: '搜索分类名称',
    inputWidth: '250px'
  },
  {
    key: 'sortBy',
    type: 'select',
    label: '排序方式',
    placeholder: '选择排序方式',
    options: [
      { label: '按图书数量', value: 'bookCount' },
      { label: '按分类名称', value: 'name' },
      { label: '按更新时间', value: 'lastUpdated' }
    ]
  },
  {
    key: 'sortOrder',
    type: 'select',
    label: '排序顺序',
    placeholder: '选择排序顺序',
    options: [
      { label: '降序', value: 'desc' },
      { label: '升序', value: 'asc' }
    ]
  }
]

// 表单验证规则
const editFormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分类名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const filteredCategories = computed(() => {
  let filtered = [...categories.value]

  // 关键词过滤
  if (searchForm.keyword) {
    filtered = filtered.filter(category => category.name.toLowerCase().includes(searchForm.keyword.toLowerCase()))
  }

  // 排序
  filtered.sort((a, b) => {
    const aValue = a[searchForm.sortBy]
    const bValue = b[searchForm.sortBy]

    if (searchForm.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return filtered
})

// 方法
const loadCategories = async () => {
  loading.value = true
  try {
    // 获取分类列表
    const categoriesResponse = await getBookCategories()
    const categoryNames = categoriesResponse.data.categories

    // 获取统计信息
    const statsResponse = await getBookStatistics()
    const stats = statsResponse.data.statistics

    // 为每个分类获取详细信息
    const categoriesWithStats = await Promise.all(
      categoryNames.map(async categoryName => {
        const booksResponse = await getBooks({
          category: categoryName,
          limit: 1000 // 获取所有图书用于统计
        })

        const books = booksResponse.data.books
        const availableCount = books.filter(book => book.status === 'available').length
        const borrowedCount = books.filter(book => book.status === 'borrowed').length

        return {
          name: categoryName,
          bookCount: books.length,
          availableCount,
          borrowedCount,
          lastUpdated: new Date() // 临时数据，实际应该从API获取
        }
      })
    )

    categories.value = categoriesWithStats

    // 更新统计数据
    statistics.totalCategories = categoryNames.length
    statistics.categorizedBooks = stats.total - (stats.uncategorizedBooks || 0)
    statistics.uncategorizedBooks = stats.uncategorizedBooks || 0
    statistics.maxBooksInCategory = Math.max(...categoriesWithStats.map(c => c.bookCount), 0)
  } catch (error) {
    console.error('加载分类数据失败:', error)
    ElMessage.error('加载分类数据失败')
  } finally {
    loading.value = false
  }
}

const handleHeaderAction = action => {
  switch (action.key) {
    case 'refresh':
      loadCategories()
      break
  }
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    sortBy: 'bookCount',
    sortOrder: 'desc'
  })
}

const toggleCategorySelection = categoryName => {
  const index = selectedCategories.value.indexOf(categoryName)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryName)
  }
}

const clearSelection = () => {
  selectedCategories.value = []
}

const handleCategoryAction = ({ action, category }) => {
  switch (action) {
    case 'viewBooks':
      // 跳转到图书列表页面并过滤该分类
      this.$router.push({
        name: 'BookList',
        query: { category }
      })
      break
    case 'editCategory':
      editForm.name = category
      editForm.description = getCategoryDescription(category)
      editDialogVisible.value = true
      break
    case 'deleteCategory':
      handleDeleteCategory(category)
      break
  }
}

const handleDeleteCategory = categoryName => {
  ElMessageBox.confirm(
    `确定要删除分类"${categoryName}"吗？注意：这不会删除该分类下的图书，只会将它们标记为未分类。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 这里应该调用API删除分类
      // 由于当前后端只是返回现有分类，暂时模拟删除
      ElMessage.warning('分类删除功能需要后端API支持')
    })
    .catch(() => {
      // 用户取消删除
    })
}

const handleSaveCategory = async () => {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()
    saving.value = true

    // 这里应该调用API保存分类
    // 由于当前后端只是返回现有分类，暂时模拟保存
    ElMessage.warning('分类编辑功能需要后端API支持')

    editDialogVisible.value = false
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    saving.value = false
  }
}

const batchDeleteCategories = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedCategories.value.length} 个分类吗？`, '批量删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      ElMessage.warning('批量删除功能需要后端API支持')
      clearSelection()
    })
    .catch(() => {
      // 用户取消删除
    })
}

const exportSelectedCategories = () => {
  ElMessage.warning('导出功能需要后端API支持')
}

const handleSizeChange = newSize => {
  pagination.pageSize = newSize
  pagination.page = 1
}

const handlePageChange = newPage => {
  pagination.page = newPage
}

// 工具函数
const getCategoryColor = index => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399']
  return colors[index % colors.length]
}

const getCategoryDescription = categoryName => {
  const descriptions = {
    计算机: '计算机科学、编程、软件工程等相关书籍',
    文学: '小说、诗歌、散文等文学作品',
    历史: '历史研究、传记、史料等历史类书籍',
    科学: '自然科学、物理、化学、生物等科学类书籍',
    艺术: '美术、音乐、设计等艺术类书籍'
  }
  return descriptions[categoryName] || '暂无描述'
}

const getCategoryTagType = bookCount => {
  if (bookCount >= 100) return 'success'
  if (bookCount >= 50) return ''
  if (bookCount >= 20) return 'warning'
  return 'info'
}

const getCategoryLevel = bookCount => {
  if (bookCount >= 100) return '大型分类'
  if (bookCount >= 50) return '中型分类'
  if (bookCount >= 20) return '小型分类'
  return '微型分类'
}

// 生命周期
onMounted(() => {
  loadCategories()
})
</script>

<style lang="scss" scoped>
.categories-container {
  padding: 20px;
}

.stats-section {
  margin-bottom: 20px;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
}

.categories-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }
}

.categories-content {
  min-height: 400px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.category-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &.category-selected {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

.category-content {
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .category-icon {
      font-size: 24px;
    }
  }

  .category-info {
    margin-bottom: 16px;

    .category-name {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--el-text-color-primary);
    }

    .category-description {
      font-size: 14px;
      color: var(--el-text-color-regular);
      margin: 0;
      line-height: 1.5;
    }
  }

  .category-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .stat-item {
      text-align: center;
      padding: 8px;
      background: var(--el-fill-color-lighter);
      border-radius: 4px;

      .stat-label {
        display: block;
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 4px;
      }

      .stat-value {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);

        &.available {
          color: var(--el-color-success);
        }

        &.borrowed {
          color: var(--el-color-warning);
        }
      }
    }
  }

  .category-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .update-time {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.batch-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;

  .toolbar-content {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 24px;

    .selected-info {
      color: var(--el-text-color-primary);
      font-weight: 500;
    }

    .toolbar-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.el-dialog {
  .dialog-footer {
    text-align: right;
  }
}

@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
