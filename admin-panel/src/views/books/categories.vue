<template>
  <div class="categories-container">
    <!-- 搜索筛选 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 分类管理卡片 -->
    <el-card shadow="never" class="categories-card">
      <!-- 页面标题区域 -->
      <div class="page-header">
        <div class="header-left">
          <el-button type="primary" :icon="Plus" @click="handleAddCategory">
            新增分类
          </el-button>
        </div>
        <div class="header-actions">
          <el-tooltip content="刷新数据" placement="top">
            <el-button icon="Refresh" @click="loadCategories" :loading="loading" />
          </el-tooltip>
          <el-tooltip content="列设置" placement="top">
            <el-button icon="Setting" @click="showColumnSettings = true" />
          </el-tooltip>
        </div>
      </div>

      <!-- 分类内容区域 -->
      <div class="categories-content" v-loading="loading">

        <!-- 空状态 -->
        <el-empty v-if="!loading && categories.length === 0" description="暂无分类数据" image-size="120">
          <el-button type="primary" @click="loadCategories">重新加载</el-button>
        </el-empty>

        <!-- 分类表格 -->
        <div v-else class="categories-table">
          <ProTable
            ref="proTableRef"
            :request="requestCategories"
            :columns="categoryTableColumns"
            :actions="categoryRowActions"
            :search="false"
            :toolBar="categoryToolBarConfig"
            :pagination="false"
            :action-column="{ width: 280, fixed: 'right' }"
            row-key="id"
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            default-expand-all
            stripe
            border
            @create="handleAddCategory"
          >
            <!-- 分类名称插槽 -->
            <template #categoryName="{ record }">
              <div class="category-name-cell" :style="{ paddingLeft: record.level ? `${(record.level - 1) * 20}px` : '0' }">
                <div class="category-icon" :style="{ 
                  backgroundColor: getCategoryColorByLevel(record.level) + '20', 
                  color: getCategoryColorByLevel(record.level),
                  fontSize: record.level > 1 ? '14px' : '16px'
                }">
                  <el-icon>
                    <FolderOpened v-if="record.children && record.children.length > 0" />
                    <Document v-else />
                  </el-icon>
                </div>
                <div class="category-info">
                  <div class="name">
                    {{ record.name || '未分类' }}
                    <el-tag v-if="record.level > 1" size="small" type="info" class="level-tag">
                      {{ record.level }}级
                    </el-tag>
                  </div>
                  <div class="description">{{ record.description || '暂无描述' }}</div>
                </div>
              </div>
            </template>

            <!-- 图书统计插槽 -->
            <template #bookStats="{ record }">
              <div class="book-stats">
                <div class="stat-item">
                  <el-tag type="info" size="small">总数: {{ record.bookCount }}</el-tag>
                </div>
                <div class="stat-item">
                  <el-tag type="success" size="small">可借: {{ record.availableCount }}</el-tag>
                </div>
                <div class="stat-item">
                  <el-tag type="warning" size="small">借出: {{ record.borrowedCount }}</el-tag>
                </div>
              </div>
            </template>

            <!-- 分类等级插槽 -->
            <template #categoryLevel="{ record }">
              <el-tag :type="getCategoryTagType(record.bookCount)" size="small">
                {{ getCategoryLevel(record.bookCount) }}
              </el-tag>
            </template>

            <!-- 更新时间插槽 -->
            <template #updateTime="{ record }">
              <span class="update-time">{{ formatDate(record.lastUpdated) }}</span>
            </template>

            <!-- 工具栏插槽 -->
            <template #toolBarRender>
              <el-button type="info" :icon="TrendCharts" @click="showStatistics">
                统计分析
              </el-button>
              <el-button type="success" :icon="Download" @click="exportCategories">
                导出分类
              </el-button>
            </template>
          </ProTable>
        </div>
      </div>
    </el-card>

    <!-- 编辑分类对话框 -->
    <CategoryEditDialog
      v-model="editDialogVisible"
      :category-data="editCategoryData"
      :loading="saving"
      @confirm="handleSaveCategory"
      @cancel="handleCancelEdit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Menu,
  FolderOpened,
  Document,
  Refresh,
  MoreFilled,
  View,
  Edit,
  Delete,
  Download,
  Plus,
  QuestionFilled,
  TrendCharts,
  Reading
} from '@element-plus/icons-vue'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import CategoryEditDialog from './components/CategoryEditDialog.vue'
import { ProTable } from '@/components/common'
import { getBookCategories, getBookStatistics, getBooks, createBookCategory, updateBookCategory, deleteBookCategory } from '@/api/books'
import { formatDate } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const editDialogVisible = ref(false)
const editCategoryData = ref(null)
const proTableRef = ref()

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



// 搜索字段配置（基于 ProForm 设计）
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入分类名称或描述搜索',
    clearable: true
  },
  {
    name: 'sortBy',
    valueType: 'select',
    label: '排序方式',
    placeholder: '选择排序方式',
    options: [
      { label: '按图书数量', value: 'bookCount' },
      { label: '按分类名称', value: 'name' },
      { label: '按更新时间', value: 'lastUpdated' }
    ]
  },
  {
    name: 'sortOrder',
    valueType: 'select',
    label: '排序顺序',
    placeholder: '选择排序顺序',
    options: [
      { label: '降序', value: 'desc' },
      { label: '升序', value: 'asc' }
    ]
  }
]

// ProTable配置
// 表格列配置
const categoryTableColumns = [
  {
    key: 'categoryName',
    title: '分类名称',
    slot: 'categoryName',
    minWidth: 280
  },
  {
    key: 'bookStats',
    title: '图书统计',
    slot: 'bookStats',
    minWidth: 250
  },
  {
    key: 'categoryLevel',
    title: '分类等级',
    slot: 'categoryLevel',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'lastUpdated',
    title: '更新时间',
    slot: 'updateTime',
    minWidth: 150,
    align: 'center',
    sorter: true
  }
]

// 行操作配置
const categoryRowActions = [
  {
    key: 'viewBooks',
    text: '查看图书',
    type: 'primary',
    onClick: (record) => handleCategoryAction({ action: 'viewBooks', category: record.name })
  },
  {
    key: 'addSubCategory',
    text: '新增子分类',
    type: 'success',
    onClick: (record) => handleCategoryAction({ action: 'addSubCategory', category: record.name })
  },
  {
    key: 'editCategory',
    text: '编辑分类',
    type: 'info',
    onClick: (record) => handleCategoryAction({ action: 'editCategory', category: record.name })
  },
  {
    key: 'deleteCategory',
    text: '删除分类',
    type: 'danger',
    onClick: (record) => handleCategoryAction({ action: 'deleteCategory', category: record.name })
  }
]

// 工具栏配置
const categoryToolBarConfig = {
  create: true,
  createText: '新增分类',
  reload: true,
  density: true,
  columnSetting: true,
  fullScreen: true
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

// 分页数据 - 对于树形表格，我们需要对整个树结构进行分页
const paginatedCategories = computed(() => {
  // 对于树形结构，我们按顶级分类进行分页
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredCategories.value.slice(start, end)
})

// ProTable数据请求函数
const requestCategories = async (params) => {
  try {
    console.log('ProTable请求参数:', params)
    
    // 获取分类列表（后端已经包含统计信息）
    const categoriesResponse = await getBookCategories()
    const backendCategories = categoriesResponse.data.categories

    console.log('后端返回的分类数据:', backendCategories)

    // 构建分类的父子关系映射
    const categoryMap = new Map()
    const rootCategories = []
    
    // 首先将所有分类放入map中
    backendCategories.forEach(category => {
      const categoryData = {
        id: category.id,
        parentId: category.parent_id,
        name: category.name,
        description: category.description || '',
        bookCount: category.stats?.total || category._count?.books || 0,
        availableCount: category.stats?.available || 0,
        borrowedCount: category.stats?.borrowed || 0,
        lastUpdated: new Date(category.updated_at || Date.now()),
        level: category.level || 1,
        children: []
      }
      categoryMap.set(category.id, categoryData)
    })
    
    // 构建树形结构
    categoryMap.forEach(category => {
      if (category.parentId) {
        // 如果有父分类，将其添加到父分类的children中
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(category)
          parent.hasChildren = true
        }
      } else {
        // 如果没有父分类，则为根分类
        rootCategories.push(category)
      }
    })
    
    // 对每个层级的分类进行排序
    const sortCategories = (categories) => {
      categories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      categories.forEach(category => {
        if (category.children && category.children.length > 0) {
          sortCategories(category.children)
        }
      })
    }
    
    sortCategories(rootCategories)

    return {
      success: true,
      data: rootCategories,
      total: rootCategories.length
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  }
}

// 方法
const loadCategories = async () => {
  loading.value = true
  try {
    // 获取分类列表（后端已经包含统计信息）
    const categoriesResponse = await getBookCategories()
    const backendCategories = categoriesResponse.data.categories

    console.log('后端返回的分类数据:', backendCategories)

    // 构建分类的父子关系映射
    const categoryMap = new Map()
    const rootCategories = []
    
    // 首先将所有分类放入map中
    backendCategories.forEach(category => {
      const categoryData = {
        id: category.id,
        parentId: category.parent_id,
        name: category.name,
        description: category.description || '',
        bookCount: category.stats?.total || category._count?.books || 0,
        availableCount: category.stats?.available || 0,
        borrowedCount: category.stats?.borrowed || 0,
        lastUpdated: new Date(category.updated_at || Date.now()),
        level: category.level || 1,
        children: []
      }
      categoryMap.set(category.id, categoryData)
    })
    
    // 构建树形结构
    categoryMap.forEach(category => {
      if (category.parentId) {
        // 如果有父分类，将其添加到父分类的children中
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(category)
          parent.hasChildren = true
        }
      } else {
        // 如果没有父分类，则为根分类
        rootCategories.push(category)
      }
    })
    
    // 对每个层级的分类进行排序
    const sortCategories = (categories) => {
      categories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      categories.forEach(category => {
        if (category.children && category.children.length > 0) {
          sortCategories(category.children)
        }
      })
    }
    
    sortCategories(rootCategories)
    
    // 计算树形结构的统计数据
    const calculateTreeStats = (category) => {
      let totalBooks = category.bookCount
      let totalAvailable = category.availableCount
      let totalBorrowed = category.borrowedCount
      
      if (category.children && category.children.length > 0) {
        category.children.forEach(child => {
          const childStats = calculateTreeStats(child)
          totalBooks += childStats.totalBooks
          totalAvailable += childStats.totalAvailable
          totalBorrowed += childStats.totalBorrowed
        })
      }
      
      return { totalBooks, totalAvailable, totalBorrowed }
    }
    
    // 更新根分类的统计数据（包含子分类）
    rootCategories.forEach(category => {
      const stats = calculateTreeStats(category)
      category.totalBooks = stats.totalBooks
      category.totalAvailable = stats.totalAvailable
      category.totalBorrowed = stats.totalBorrowed
    })

    categories.value = rootCategories

    // 更新统计数据
    statistics.totalCategories = backendCategories.length
    statistics.categorizedBooks = backendCategories.reduce((sum, cat) => sum + (cat.stats?.total || cat._count?.books || 0), 0)
    statistics.uncategorizedBooks = 0
    statistics.maxBooksInCategory = Math.max(...backendCategories.map(c => c.stats?.total || c._count?.books || 0), 0)

    console.log('处理后的树形分类数据:', rootCategories)
  } catch (error) {
    console.error('加载分类数据失败:', error)
    ElMessage.error('加载分类数据失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
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


const handleAddCategory = () => {
  editCategoryData.value = null
  editDialogVisible.value = true
}

const handleAddSubCategory = (parentCategoryName) => {
  const parentCategory = findCategoryData(parentCategoryName, categories.value)
  editCategoryData.value = {
    parentCategory,
    isSubCategory: true
  }
  editDialogVisible.value = true
}

const handleCategoryAction = ({ action, category }) => {
  switch (action) {
    case 'viewBooks':
      // 跳转到图书列表页面并过滤该分类
      // 注意：在组合式API中不能使用this.$router
      // 这里需要导入useRouter或者使用其他方式
      ElMessage.info('查看图书功能开发中...')
      break
    case 'addSubCategory':
      handleAddSubCategory(category)
      break
    case 'editCategory':
      const categoryData = findCategoryData(category, categories.value)
      editCategoryData.value = categoryData
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
    .then(async () => {
      try {
        await deleteBookCategory(categoryName)
        await loadCategories()
        ElMessage.success('分类删除成功')
      } catch (error) {
        console.error('删除分类失败:', error)
        ElMessage.error('删除分类失败: ' + (error.message || '未知错误'))
      }
    })
    .catch(() => {
      // 用户取消删除
    })
}

const handleSaveCategory = async (formData) => {
  saving.value = true

  try {
    if (formData.isEdit) {
      // 编辑分类
      console.log('编辑分类:', {
        originalName: formData.originalName,
        newName: formData.name,
        description: formData.description
      })
      
      await updateBookCategory(formData.originalName, {
        name: formData.name,
        description: formData.description
      })
      
      await loadCategories()
      ElMessage.success('分类编辑成功')
    } else if (formData.isSubCategory) {
      // 新增子分类
      console.log('新增子分类:', {
        name: formData.name,
        description: formData.description,
        parentId: formData.parentCategory?.id,
        parentName: formData.parentCategory?.name
      })
      
      await createBookCategory({
        name: formData.name,
        description: formData.description,
        parentId: formData.parentCategory?.id
      })
      
      await loadCategories()
      ElMessage.success('子分类创建成功')
    } else {
      // 新增分类
      console.log('新增分类:', {
        name: formData.name,
        description: formData.description
      })
      
      await createBookCategory({
        name: formData.name,
        description: formData.description
      })
      
      await loadCategories()
      ElMessage.success('分类创建成功')
    }

    editDialogVisible.value = false
    editCategoryData.value = null
    
  } catch (error) {
    console.error('保存分类失败:', error)
    ElMessage.error('保存分类失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const handleCancelEdit = () => {
  editCategoryData.value = null
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

const getCategoryColorByLevel = (level) => {
  const colors = {
    1: '#409EFF', // 一级分类 - 蓝色
    2: '#67C23A', // 二级分类 - 绿色
    3: '#E6A23C', // 三级分类 - 橙色
    4: '#F56C6C', // 四级分类 - 红色
    5: '#909399'  // 五级及以上分类 - 灰色
  }
  return colors[level] || colors[5]
}

// 深度查找分类数据（包括子分类）
const findCategoryData = (categoryName, categories) => {
  for (const category of categories) {
    if (category.name === categoryName) {
      return category
    }
    if (category.children) {
      const found = findCategoryData(categoryName, category.children)
      if (found) return found
    }
  }
  return null
}

const getCategoryDescription = categoryName => {
  // 首先从实际分类数据中查找描述（包括子分类）
  const category = findCategoryData(categoryName, categories.value)
  if (category && category.description) {
    return category.description
  }
  
  // 如果没有找到，使用默认描述
  const defaultDescriptions = {
    计算机: '计算机科学、编程、软件工程等相关书籍',
    文学: '小说、诗歌、散文等文学作品',
    历史: '历史研究、传记、史料等历史类书籍',
    科学: '自然科学、物理、化学、生物等科学类书籍',
    艺术: '美术、音乐、设计等艺术类书籍'
  }
  return defaultDescriptions[categoryName] || '暂无描述'
}

// ProTable工具栏处理函数
const showStatistics = () => {
  ElMessage.info('统计分析功能开发中...')
}

const exportCategories = () => {
  ElMessage.info('导出分类功能开发中...')
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
  background-color: var(--content-bg-color);
  min-height: 100vh;
}

.categories-card {
  margin-bottom: 20px;

  :deep(.el-card__body) {
    padding: 0;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  background: white;
  margin-bottom: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .title-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }

    .title-info {
      .page-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin: 0 0 4px 0;
        line-height: 1.3;
      }

      .page-subtitle {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin: 0;
        font-weight: 500;
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.categories-content {
  padding: 24px;
}

// 统计概览样式
.stats-overview {
  .stats-card {
    @apply rounded-xl p-6 text-white shadow-lg;
    border: none;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .stats-content {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .stats-icon {
        font-size: 2.5rem;
        opacity: 0.9;
      }

      .stats-info {
        text-align: right;

        .stats-value {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stats-label {
          font-size: 0.875rem;
          opacity: 0.9;
          font-weight: 500;
        }
      }
    }
  }
}

// 分类表格样式
.categories-table {
  .category-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;

    .category-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .category-info {
      flex: 1;
      min-width: 0;

      .name {
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .description {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .action-trigger {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: var(--el-text-color-secondary);
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }
  }

  .update-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .book-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-item {
      display: flex;
      justify-content: flex-start;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding: 24px 0;
  border-top: 1px solid var(--el-border-color-extra-light);
  background: var(--el-fill-color-extra-light);
  border-radius: 0 0 12px 12px;
  margin-left: -24px;
  margin-right: -24px;
}



// 响应式设计
@media (max-width: 768px) {
  .categories-container {
    padding: 16px;
  }

  .categories-card {
    margin: 0 -16px 20px -16px;
    border-radius: 0;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;

    .header-left {
      .title-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .title-info {
        .page-title {
          font-size: 20px;
        }
      }
    }

    .header-actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  .categories-content {
    padding: 16px 20px 20px;
  }

  .categories-table {
    .category-name-cell {
      gap: 8px;

      .category-icon {
        width: 28px;
        height: 28px;
        font-size: 14px;
      }

      .category-info {
        .name {
          font-size: 13px;
        }

        .description {
          font-size: 11px;
        }
      }
    }
  }


  .pagination-wrapper {
    justify-content: center;
  }
}

.level-tag {
  margin-left: 8px;
}

@media (max-width: 480px) {
  .stats-overview {
    .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .stats-card {
      padding: 16px;

      .stats-content {
        .stats-icon {
          font-size: 2rem;
        }

        .stats-info {
          .stats-value {
            font-size: 1.5rem;
          }

          .stats-label {
            font-size: 0.75rem;
          }
        }
      }
    }
  }
}
</style>
