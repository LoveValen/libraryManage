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
          <el-table
            :data="paginatedCategories"
            style="width: 100%"
            row-key="name"
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            default-expand-all
            stripe
            border
          >
            <!-- 分类名称列 -->
            <el-table-column prop="name" label="分类名称" min-width="280">
              <template #default="scope">
                <div class="category-name-cell">
                  <div class="category-icon" :style="{ backgroundColor: getCategoryColor(scope.$index) + '20', color: getCategoryColor(scope.$index) }">
                    <el-icon><FolderOpened /></el-icon>
                  </div>
                  <div class="category-info">
                    <div class="name">{{ scope.row.name || '未分类' }}</div>
                    <div class="description">{{ scope.row.description || '暂无描述' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <!-- 图书统计列 -->
            <el-table-column prop="bookCount" label="总数" width="100" align="center">
              <template #default="scope">
                <el-tag type="info" size="small">{{ scope.row.bookCount }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="availableCount" label="可借" width="100" align="center">
              <template #default="scope">
                <el-tag type="success" size="small">{{ scope.row.availableCount }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="borrowedCount" label="借出" width="100" align="center">
              <template #default="scope">
                <el-tag type="warning" size="small">{{ scope.row.borrowedCount }}</el-tag>
              </template>
            </el-table-column>
            
            <!-- 分类等级列 -->
            <el-table-column label="分类等级" width="120" align="center">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.bookCount)" size="small">
                  {{ getCategoryLevel(scope.row.bookCount) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <!-- 更新时间列 -->
            <el-table-column prop="lastUpdated" label="更新时间" width="180" align="center">
              <template #default="scope">
                <span class="update-time">{{ formatDate(scope.row.lastUpdated) }}</span>
              </template>
            </el-table-column>
            
            <!-- 操作列 -->
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="scope">
                <el-dropdown @command="handleCategoryAction" trigger="click">
                  <el-button type="text" class="action-trigger">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'viewBooks', category: scope.row.name }" :icon="View">
                        查看图书
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'addSubCategory', category: scope.row.name }" :icon="Plus">
                        新增子分类
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'editCategory', category: scope.row.name }" :icon="Edit">
                        编辑分类
                      </el-dropdown-item>
                      <el-dropdown-item
                        :command="{ action: 'deleteCategory', category: scope.row.name }"
                        :icon="Delete"
                        divided
                      >
                        删除分类
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
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
import SearchFilterSimple from '@/components/common/SearchFilterSimple.vue'
import CategoryEditDialog from './components/CategoryEditDialog.vue'
import { getBookCategories, getBookStatistics, getBooks, createBookCategory, updateBookCategory, deleteBookCategory } from '@/api/books'
import { formatDate } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const editDialogVisible = ref(false)
const editCategoryData = ref(null)

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

// 方法
const loadCategories = async () => {
  loading.value = true
  try {
    // 获取分类列表（后端已经包含统计信息）
    const categoriesResponse = await getBookCategories()
    const backendCategories = categoriesResponse.data.categories

    console.log('后端返回的分类数据:', backendCategories)

    // 将后端数据格式转换为前端需要的格式，并添加树形结构
    const categoriesWithStats = backendCategories.map(category => {
      const categoryData = {
        id: category.id, // 重要：保留ID信息
        name: category.name,
        description: category.description || '',
        bookCount: category.stats?.total || category._count?.books || 0,
        availableCount: category.stats?.available || 0,
        borrowedCount: category.stats?.borrowed || 0,
        lastUpdated: new Date(category.updated_at || Date.now())
      }

      // 为某些分类添加子分类（模拟树形结构）
      if (category.name === '计算机') {
        categoryData.children = [
          {
            name: '编程语言',
            description: '各种编程语言相关的图书',
            bookCount: Math.floor(categoryData.bookCount * 0.4),
            availableCount: Math.floor(categoryData.availableCount * 0.4),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.4),
            lastUpdated: new Date(),
            children: [
              {
                name: 'JavaScript',
                description: 'JavaScript编程语言相关书籍',
                bookCount: 15,
                availableCount: 12,
                borrowedCount: 3,
                lastUpdated: new Date()
              },
              {
                name: 'Python',
                description: 'Python编程语言相关书籍',
                bookCount: 18,
                availableCount: 14,
                borrowedCount: 4,
                lastUpdated: new Date()
              }
            ]
          },
          {
            name: '软件工程',
            description: '软件开发、项目管理等软件工程相关书籍',
            bookCount: Math.floor(categoryData.bookCount * 0.3),
            availableCount: Math.floor(categoryData.availableCount * 0.3),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.3),
            lastUpdated: new Date()
          },
          {
            name: '数据结构',
            description: '数据结构与算法相关书籍',
            bookCount: Math.floor(categoryData.bookCount * 0.3),
            availableCount: Math.floor(categoryData.availableCount * 0.3),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.3),
            lastUpdated: new Date()
          }
        ]
        categoryData.hasChildren = true
      } else if (category.name === '文学') {
        categoryData.children = [
          {
            name: '现代文学',
            description: '现代小说、诗歌、散文等现代文学作品',
            bookCount: Math.floor(categoryData.bookCount * 0.6),
            availableCount: Math.floor(categoryData.availableCount * 0.6),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.6),
            lastUpdated: new Date()
          },
          {
            name: '古典文学',
            description: '古代文学作品、传统诗词、文言文等',
            bookCount: Math.floor(categoryData.bookCount * 0.4),
            availableCount: Math.floor(categoryData.availableCount * 0.4),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.4),
            lastUpdated: new Date()
          }
        ]
        categoryData.hasChildren = true
      } else if (category.name === '科学') {
        categoryData.children = [
          {
            name: '物理学',
            description: '物理学理论、实验、应用等相关书籍',
            bookCount: Math.floor(categoryData.bookCount * 0.4),
            availableCount: Math.floor(categoryData.availableCount * 0.4),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.4),
            lastUpdated: new Date()
          },
          {
            name: '化学',
            description: '化学原理、有机化学、无机化学等书籍',
            bookCount: Math.floor(categoryData.bookCount * 0.3),
            availableCount: Math.floor(categoryData.availableCount * 0.3),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.3),
            lastUpdated: new Date()
          },
          {
            name: '生物学',
            description: '生物科学、生命科学、生态学等书籍',
            bookCount: Math.floor(categoryData.bookCount * 0.3),
            availableCount: Math.floor(categoryData.availableCount * 0.3),
            borrowedCount: Math.floor(categoryData.borrowedCount * 0.3),
            lastUpdated: new Date()
          }
        ]
        categoryData.hasChildren = true
      }

      return categoryData
    })

    categories.value = categoriesWithStats

    // 更新统计数据
    statistics.totalCategories = backendCategories.length
    statistics.categorizedBooks = categoriesWithStats.reduce((sum, cat) => sum + cat.bookCount, 0)
    statistics.uncategorizedBooks = 0
    statistics.maxBooksInCategory = Math.max(...categoriesWithStats.map(c => c.bookCount), 0)

    console.log('处理后的分类数据:', categoriesWithStats)
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
    parentCategory: parentCategory,
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
