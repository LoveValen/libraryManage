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
      <!-- 分类内容区域 -->
      <div class="categories-content" v-loading="loading">

        <!-- 分类表格 -->
        <div class="categories-table">
          <ProTable
            ref="proTableRef"
            :request="requestCategories"
            :columns="categoryTableColumns"
            :actions="categoryRowActions"
            :row-selection="{ type: 'checkbox' }"
            :search="false"
            :toolBar="categoryToolBarConfig"
            :pagination="false"
            :action-column="{ width: 280, fixed: 'right', align: 'center' }"
            :max-height="finalTableHeight"
            row-key="id"
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            default-expand-all
            stripe
            border
            @create="handleAddCategory"
          >
            <!-- 分类名称插槽 -->
            <template #categoryName="{ record }">
              <span class="category-name">{{ record.name || '未分类' }}</span>
            </template>

            <!-- 分类描述插槽 -->
            <template #description="{ record }">
              <span class="category-description">{{ record.description || '暂无描述' }}</span>
            </template>

            <!-- 分类层级插槽 -->
            <template #level="{ record }">
              <span>
                {{ getLevelText(record.level) }}
              </span>
            </template>

            <!-- 图书总数插槽 -->
            <template #totalBooks="{ record }">
              <span>{{ record.bookCount || 0 }}</span>
            </template>

            <!-- 可借数量插槽 -->
            <template #availableBooks="{ record }">
              <span>{{ record.availableCount || 0 }}</span>
            </template>

            <!-- 借出数量插槽 -->
            <template #borrowedBooks="{ record }">
              <span>{{ record.borrowedCount || 0 }}</span>
            </template>


            <!-- 更新时间插槽 -->
            <template #updateTime="{ record }">
              <span>{{ formatDate(record.lastUpdated) }}</span>
            </template>

            <!-- 工具栏插槽 -->
            <template #toolBarRender="{ selectedRowKeys, selectedRows }">
              <div style="display: flex; justify-content: space-between; width: 100%;">
                <!-- 左侧操作按钮 -->
                <div style="display: flex; gap: 8px;">
                  <!-- 新增分类按钮 -->
                  <el-button type="primary" @click="handleAddCategory">
                    新增分类
                  </el-button>
                  
                  <!-- 批量操作按钮（始终显示，无选中项时禁用） -->
                  <el-button 
                    type="danger" 
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchDelete(selectedRows)"
                  >
                    批量删除
                  </el-button>
                  
                  <!-- 常规工具栏按钮 -->
                  <el-button type="info" :icon="TrendCharts" @click="showStatistics">
                    统计分析
                  </el-button>
                  <el-button type="success" :icon="Download" @click="exportCategories">
                    导出分类
                  </el-button>
                  <el-button type="success" :icon="Upload" @click="handleImport">
                    导入分类
                  </el-button>
                </div>
                
                <!-- 右侧工具按钮 -->
                <div style="display: flex; gap: 8px;">
                  <el-tooltip content="刷新数据" placement="top">
                    <el-button :icon="Refresh" @click="loadCategories" :loading="loading" />
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

    <!-- 编辑分类对话框 -->
    <CategoryEditDialog
      v-model="editDialogVisible"
      :category-data="editCategoryData"
      :loading="saving"
      @confirm="handleSaveCategory"
      @cancel="handleCancelEdit"
    />
    
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
  Menu,
  Refresh,
  MoreFilled,
  View,
  Edit,
  Delete,
  Download,
  Upload,
  Plus,
  QuestionFilled,
  TrendCharts,
  Reading,
  Setting
} from '@element-plus/icons-vue'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import CategoryEditDialog from './components/CategoryEditDialog.vue'
import { ProTable, ColumnSettings } from '@/components/common'
import { getBookCategories, createBookCategory, updateBookCategory, deleteBookCategory } from '@/api/books'
import { formatDate } from '@/utils/date'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const editDialogVisible = ref(false)
const editCategoryData = ref(null)
const proTableRef = ref()

// 默认列设置配置
const defaultVisibleColumns = [
  'level',
  'categoryName',
  'description',
  'totalBooks',
  'availableBooks',
  'borrowedBooks',
  'updateTime'
]

const defaultColumnOptions = [
  { label: '分类层级', value: 'level', required: true },
  { label: '分类名称', value: 'categoryName', required: true },
  { label: '分类描述', value: 'description' },
  { label: '图书总数', value: 'totalBooks' },
  { label: '可借数量', value: 'availableBooks' },
  { label: '借出数量', value: 'borrowedBooks' },
  { label: '更新时间', value: 'updateTime' }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('category', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable
const tableHeightConfig = getTableHeightPreset('compact', {
  headerOffset: 160, // 搜索区域 + 页面头部
  footerOffset: 60   // 较少的底部空间
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  sortBy: '',
  sortOrder: ''
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
// 所有可用的表格列配置
const allCategoryTableColumns = [
  {
    key: 'level',
    title: '分类层级',
    slot: 'level',
    minWidth: 120
  },
  {
    key: 'categoryName',
    title: '分类名称',
    slot: 'categoryName',
    minWidth: 200
  },
  {
    key: 'description',
    title: '分类描述',
    slot: 'description',
    minWidth: 200
  },
  {
    key: 'totalBooks',
    title: '图书总数',
    slot: 'totalBooks',
    minWidth: 100
  },
  {
    key: 'availableBooks',
    title: '可借数量',
    slot: 'availableBooks',
    minWidth: 100
  },
  {
    key: 'borrowedBooks',
    title: '借出数量',
    slot: 'borrowedBooks',
    minWidth: 100
  },
  {
    key: 'updateTime',
    title: '更新时间',
    slot: 'updateTime',
    minWidth: 150,
    sorter: true
  }
]

// 动态过滤的表格列配置（计算属性）
const categoryTableColumns = computed(() => {
  // 根据columnOptions的顺序和visibleColumns的选择来生成列
  const columnsMap = {}
  allCategoryTableColumns.forEach(col => {
    columnsMap[col.key] = col
  })

  // 按照columnOptions的顺序返回可见的列
  return columnOptions.value
    .filter(opt => visibleColumns.value.includes(opt.value))
    .map(opt => columnsMap[opt.value])
    .filter(Boolean)
})

// 行操作配置
const categoryRowActions = [
  {
    key: 'viewBooks',
    text: '查看图书',
    type: 'text',
    onClick: (record) => handleCategoryAction({ action: 'viewBooks', category: record.name })
  },
  {
    key: 'addSubCategory',
    text: '新增子分类',
    type: 'text',
    onClick: (record) => handleCategoryAction({ action: 'addSubCategory', category: record.name })
  },
  {
    key: 'editCategory',
    text: '编辑分类',
    type: 'text',
    onClick: (record) => handleCategoryAction({ action: 'editCategory', category: record.name })
  },
  {
    key: 'deleteCategory',
    text: '删除分类',
    type: 'text',
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
    case 'editCategory': {
      const categoryData = findCategoryData(category, categories.value)
      editCategoryData.value = categoryData
      editDialogVisible.value = true
      break
    }
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
      proTableRef.value?.refresh()
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
      proTableRef.value?.refresh()
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
      proTableRef.value?.refresh()
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

// ProTable工具栏处理函数
const handleImport = () => {
  ElMessage.info('批量导入功能开发中...')
}

const handleBatchDelete = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) {
    ElMessage.warning('请选择要删除的分类')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.length} 个分类吗？注意：这不会删除该分类下的图书，只会将它们标记为未分类。`,
      '批量删除',
      { type: 'warning' }
    )

    const categoryIds = selectedRows.map(cat => cat.id)
    // 批量删除逻辑
    for (const id of categoryIds) {
      await deleteBookCategory(id)
    }

    ElMessage.success('批量删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const showStatistics = () => {
  ElMessage.info('统计分析功能开发中...')
}

const exportCategories = () => {
  ElMessage.info('导出分类功能开发中...')
}

// 列设置应用回调 - 添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
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

// 获取层级文字
const getLevelText = (level) => {
  const levelNames = ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级']
  return levelNames[level - 1] || `${level}级`
}

// 生命周期
onMounted(() => {
  loadCategories()
})
</script>

<style lang="scss" scoped>
.categories-container {
  background-color: var(--content-bg-color);
  padding: 20px;
  // Remove max-width constraint to use full viewport width
  // max-width: 1400px;
  // margin: 0 auto;
}

.categories-card {
  margin-top: 16px;
  margin-bottom: 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-card__body) {
    padding: 0;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  background: white;
  margin-bottom: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .title-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
    }

    .title-info {
      .page-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin: 0 0 2px 0;
        line-height: 1.2;
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
  padding: 20px;
}


// 分类表格样式
.categories-table {
  // 增加表格行高
  :deep(.el-table__row) {
    height: 60px;
  }


  .action-trigger {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: var(--el-color-primary);
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }
  }

}




// 响应式设计
@media (max-width: 768px) {
  .categories-container {
    padding: 12px;
  }

  .categories-card {
    margin: 0 -12px 0 -12px;
    border-radius: 0;
    box-shadow: none;
    border-left: none;
    border-right: none;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;

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
    padding: 12px 16px 16px;
  }
}


.column-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

</style>
