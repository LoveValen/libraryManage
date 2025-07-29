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
          <div class="title-icon">
            <el-icon><Menu /></el-icon>
          </div>
          <div class="title-info">
            <h2 class="page-title">分类管理</h2>
            <p class="page-subtitle">共 {{ filteredCategories.length }} 个分类</p>
          </div>
        </div>
        <div class="header-actions">
          <el-tooltip content="刷新数据" placement="top">
            <el-button :icon="Refresh" @click="loadCategories" :loading="loading">
              刷新
            </el-button>
          </el-tooltip>
          <el-button type="primary" :icon="Plus" @click="handleAddCategory">
            新增分类
          </el-button>
        </div>
      </div>

      <!-- 分类内容区域 -->
      <div class="categories-content" v-loading="loading">
        <!-- 空状态 -->
        <el-empty v-if="!loading && categories.length === 0" description="暂无分类数据" image-size="120">
          <el-button type="primary" @click="loadCategories">重新加载</el-button>
        </el-empty>

        <!-- 分类网格 -->
        <div v-else class="categories-grid">
        <div
          v-for="(category, index) in filteredCategories"
          :key="category.name"
          class="category-card"
          :class="{ 'category-selected': selectedCategories.includes(category.name) }"
          @click="toggleCategorySelection(category.name)"
        >
          <!-- 卡片头部 -->
          <div class="category-header">
            <div class="category-icon-wrapper">
              <div class="category-icon" :style="{ backgroundColor: getCategoryColor(index) + '20', color: getCategoryColor(index) }">
                <el-icon><FolderOpened /></el-icon>
              </div>
            </div>
            <div class="category-actions">
              <el-dropdown @command="handleCategoryAction" trigger="click">
                <el-button type="text" class="action-trigger">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
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

          <!-- 分类信息 -->
          <div class="category-info">
            <h3 class="category-name">{{ category.name || '未分类' }}</h3>
            <p class="category-description">
              {{ getCategoryDescription(category.name) }}
            </p>
          </div>

          <!-- 统计数据 -->
          <div class="category-stats">
            <div class="stat-item">
              <div class="stat-icon total">
                <el-icon><Reading /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ category.bookCount }}</div>
                <div class="stat-label">总数</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon available">
                <el-icon><View /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ category.availableCount }}</div>
                <div class="stat-label">可借</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon borrowed">
                <el-icon><Edit /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ category.borrowedCount }}</div>
                <div class="stat-label">借出</div>
              </div>
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="category-footer">
            <el-tag :type="getCategoryTagType(category.bookCount)" size="small" class="level-tag">
              {{ getCategoryLevel(category.bookCount) }}
            </el-tag>
            <span class="update-time">{{ formatDate(category.lastUpdated) }}</span>
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
    <el-dialog 
      v-model="editDialogVisible" 
      :title="editForm.isEdit ? '编辑分类' : '新增分类'" 
      width="500px" 
      :close-on-click-modal="false"
    >
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
          <el-button type="primary" @click="handleSaveCategory" :loading="saving">
            {{ editForm.isEdit ? '保存' : '创建' }}
          </el-button>
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
  Plus,
  QuestionFilled,
  TrendCharts,
  Reading
} from '@element-plus/icons-vue'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.vue'
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
  description: '',
  isEdit: false,
  originalName: ''
})

const editFormRef = ref()


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
    // 获取分类列表（后端已经包含统计信息）
    const categoriesResponse = await getBookCategories()
    const backendCategories = categoriesResponse.data.categories

    console.log('后端返回的分类数据:', backendCategories)

    // 将后端数据格式转换为前端需要的格式
    const categoriesWithStats = backendCategories.map(category => ({
      name: category.name,
      bookCount: category.stats?.total || category._count?.books || 0,
      availableCount: category.stats?.available || 0,
      borrowedCount: category.stats?.borrowed || 0,
      lastUpdated: new Date(category.updated_at || Date.now())
    }))

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

const handleAddCategory = () => {
  // 重置表单
  editForm.name = ''
  editForm.description = ''
  editForm.isEdit = false
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
    case 'editCategory':
      editForm.name = category
      editForm.description = getCategoryDescription(category)
      editForm.isEdit = true
      editForm.originalName = category
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

    if (editForm.isEdit) {
      // 编辑分类
      console.log('编辑分类:', {
        originalName: editForm.originalName,
        newName: editForm.name,
        description: editForm.description
      })
      
      // 更新本地数据（模拟后端响应）
      const categoryIndex = categories.value.findIndex(cat => cat.name === editForm.originalName)
      if (categoryIndex !== -1) {
        categories.value[categoryIndex] = {
          ...categories.value[categoryIndex],
          name: editForm.name,
          description: editForm.description,
          lastUpdated: new Date()
        }
      }
      
      ElMessage.success('分类编辑成功')
    } else {
      // 新增分类
      console.log('新增分类:', {
        name: editForm.name,
        description: editForm.description
      })
      
      // 添加到本地数据（模拟后端响应）
      const newCategory = {
        name: editForm.name,
        description: editForm.description,
        bookCount: 0,
        availableCount: 0,
        borrowedCount: 0,
        lastUpdated: new Date()
      }
      categories.value.push(newCategory)
      
      ElMessage.success('分类创建成功')
    }

    editDialogVisible.value = false
    
    // 重置表单
    editForm.name = ''
    editForm.description = ''
    editForm.isEdit = false
    editForm.originalName = ''
    
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

// 分类网格样式
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.category-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(64, 158, 255, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
    border-color: var(--el-color-primary-light-7);

    &::before {
      opacity: 1;
    }

    .category-header .category-icon {
      transform: scale(1.05);
    }
  }

  &.category-selected {
    border-color: var(--el-color-primary);
    background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, #ffffff 100%);
    box-shadow: 0 8px 28px rgba(64, 158, 255, 0.2);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
      background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(64, 158, 255, 0.08) 100%);
    }
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;

    .category-icon-wrapper {
      .category-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        &:hover::before {
          opacity: 1;
        }
      }
    }

    .category-actions {
      .action-trigger {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        color: var(--el-text-color-secondary);
        transition: all 0.2s ease;

        &:hover {
          background-color: var(--el-fill-color-light);
          color: var(--el-color-primary);
        }
      }
    }
  }

  .category-info {
    margin-bottom: 24px;

    .category-name {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: var(--el-text-color-primary);
      line-height: 1.3;
    }

    .category-description {
      font-size: 14px;
      color: var(--el-text-color-regular);
      margin: 0;
      line-height: 1.5;
    }
  }

  .category-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    .stat-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 14px;
      background: linear-gradient(135deg, var(--el-fill-color-extra-light) 0%, var(--el-fill-color-light) 100%);
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid var(--el-border-color-extra-light);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      &:hover {
        background: linear-gradient(135deg, var(--el-fill-color-light) 0%, var(--el-fill-color) 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: var(--el-border-color-light);

        &::before {
          opacity: 1;
        }

        .stat-icon {
          transform: scale(1.05);
        }
      }

      .stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        position: relative;
        flex-shrink: 0;

        &.total {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          color: #1976d2;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
        }

        &.available {
          background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
          color: #2e7d32;
          box-shadow: 0 2px 8px rgba(46, 125, 50, 0.2);
        }

        &.borrowed {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          color: #f57c00;
          box-shadow: 0 2px 8px rgba(245, 124, 0, 0.2);
        }
      }

      .stat-content {
        flex: 1;
        min-width: 0;

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--el-text-color-primary);
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          font-weight: 500;
          line-height: 1;
        }
      }
    }
  }

  .category-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-extra-light);
    margin-top: 4px;

    .level-tag {
      font-weight: 600;
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 12px;
      border: none;
      box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
    }

    .update-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;

      &::before {
        content: '🕑';
        font-size: 10px;
        opacity: 0.7;
      }
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
  padding: 20px 0 0 0;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.batch-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
  border: 1px solid var(--el-border-color-light);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  }

  .toolbar-content {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px 32px;

    .selected-info {
      color: var(--el-text-color-primary);
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;

      &::before {
        content: '✓';
        width: 20px;
        height: 20px;
        background: var(--el-color-primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }

      strong {
        color: var(--el-color-primary);
      }
    }

    .toolbar-actions {
      display: flex;
      gap: 12px;

      .el-button {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          transform: translateY(-1px);
        }
      }
    }
  }
}

.el-dialog {
  border-radius: 16px;
  overflow: hidden;

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
    color: white;
    padding: 20px 24px;
    margin: 0;

    .el-dialog__title {
      color: white;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 20px;
      right: 24px;

      .el-dialog__close {
        color: white;
        font-size: 18px;

        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }

  :deep(.el-dialog__body) {
    padding: 24px;
  }

  .dialog-footer {
    text-align: right;
    padding: 16px 24px 24px;
    border-top: 1px solid var(--el-border-color-extra-light);
    margin-top: 8px;

    .el-button {
      border-radius: 8px;
      font-weight: 500;
      padding: 10px 20px;
    }
  }
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

  .category-card {
    padding: 20px;

    .category-stats {
      flex-direction: column;
      gap: 12px;

      .stat-item {
        justify-content: space-between;
      }
    }
  }

  .batch-toolbar {
    left: 16px;
    right: 16px;
    transform: none;
    
    .toolbar-content {
      flex-direction: column;
      gap: 16px;
      padding: 16px 20px;

      .toolbar-actions {
        width: 100%;
        justify-content: center;
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
