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

                  <!-- 批量启用按钮 -->
                  <el-button
                    type="success"
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchEnable(selectedRows)"
                  >
                    批量启用
                  </el-button>

                  <!-- 批量禁用按钮 -->
                  <el-button
                    type="warning"
                    :disabled="selectedRowKeys.length === 0"
                    @click="handleBatchDisable(selectedRows)"
                  >
                    批量禁用
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
import { showSuccess, showError, showInfo, showWarning, confirmDelete, confirm } from '@/utils/message'
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
import { useTableRequest } from '@/composables/useTableRequest'

// 响应式数据
const saving = ref(false)
const categoryTree = ref([])
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
const defaultSearchForm = Object.freeze({
  keyword: '',
  sortBy: 'bookCount'
})

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
  }
]

const resolveCategoryList = (payload) => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const candidateKeys = ['list', 'items', 'records', 'rows', 'data']
  for (const key of candidateKeys) {
    const value = payload[key]
    const resolved = resolveCategoryList(value)
    if (resolved.length > 0) {
      return resolved
    }
  }
  return []
}

const {
  searchForm,
  loading,
  request: requestCategories,
  reload: reloadCategories
} = useTableRequest(async (params) => {
  const response = await getBookCategories()
  const payload = (response && typeof response === 'object') ? (response.data ?? response) : []
  const rawList = resolveCategoryList(payload)
  return {
    raw: rawList,
    query: params
  }
}, {
  defaultSearch: defaultSearchForm,
  defaultPageSize: 50,
  manual: true,
  immediate: false,
  formatParams: ({ search, sorter }) => ({
    keyword: (search.keyword || '').trim().toLowerCase(),
    sortBy: search.sortBy || 'bookCount',
    sortOrder: sorter?.order && String(sorter.order).includes('asc') ? 'asc' : 'desc'
  }),
  transform: (response) => {
    const rawList = resolveCategoryList(response?.raw)
    const query = response?.query || {}
    const tree = buildCategoryTree(rawList, query)
    return {
      list: tree,
      total: tree.length
    }
  },
  onSuccess: ({ list }) => {
    categoryTree.value = list
  }
})

const buildCategoryTree = (source = [], options = {}) => {
  const { keyword = '', sortBy = 'bookCount', sortOrder = 'desc' } = options

  const normalizedKeyword = typeof keyword === 'string' ? keyword.trim().toLowerCase() : ''
  const activeSortBy = sortBy || 'bookCount'
  const activeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  const categoryMap = new Map()
  const rootNodes = []

  source.forEach(item => {
    const node = {
      id: item.id,
      parentId: item.parent_id,
      name: item.name,
      description: item.description || '',
      bookCount: item.stats?.total ?? item._count?.books ?? 0,
      availableCount: item.stats?.available ?? 0,
      borrowedCount: item.stats?.borrowed ?? 0,
      lastUpdated: item.updated_at ? new Date(item.updated_at) : null,
      level: item.level || 1,
      children: []
    }
    categoryMap.set(item.id, node)
  })

  categoryMap.forEach(node => {
    if (node.parentId) {
      const parent = categoryMap.get(node.parentId)
      if (parent) {
        parent.children.push(node)
        parent.hasChildren = true
      } else {
        rootNodes.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  })

  const cloneTree = (nodes = []) => nodes.map(node => ({
    ...node,
    children: Array.isArray(node.children) ? cloneTree(node.children) : []
  }))

  const filterByKeyword = (nodes = []) => nodes
    .map(node => {
      const children = Array.isArray(node.children) ? filterByKeyword(node.children) : []
      const match = normalizedKeyword
        ? (node.name || '').toLowerCase().includes(normalizedKeyword) || (node.description || '').toLowerCase().includes(normalizedKeyword)
        : true
      if (match || children.length) {
        return { ...node, children }
      }
      return null
    })
    .filter(Boolean)

  const workingTree = normalizedKeyword ? filterByKeyword(rootNodes) : cloneTree(rootNodes)

  const sortTree = (nodes = []) => {
    nodes.sort((a, b) => {
      let result = 0
      switch (activeSortBy) {
        case 'name':
          result = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'lastUpdated':
          result = (a.lastUpdated ? a.lastUpdated.getTime() : 0) - (b.lastUpdated ? b.lastUpdated.getTime() : 0)
          break
        case 'bookCount':
        default:
          result = (a.bookCount || 0) - (b.bookCount || 0)
          break
      }
      if (result === 0) {
        result = a.name.localeCompare(b.name, 'zh-CN')
      }
      return activeSortOrder === 'asc' ? result : -result
    })
    nodes.forEach(child => {
      if (Array.isArray(child.children) && child.children.length) {
        sortTree(child.children)
      }
    })
  }

  sortTree(workingTree)

  const calculateStats = (node) => {
    let totalBooks = node.bookCount || 0
    let totalAvailable = node.availableCount || 0
    let totalBorrowed = node.borrowedCount || 0

    if (Array.isArray(node.children) && node.children.length) {
      node.children.forEach(child => {
        const childStats = calculateStats(child)
        totalBooks += childStats.totalBooks
        totalAvailable += childStats.totalAvailable
        totalBorrowed += childStats.totalBorrowed
      })
    }

    node.totalBooks = totalBooks
    node.totalAvailable = totalAvailable
    node.totalBorrowed = totalBorrowed

    return { totalBooks, totalAvailable, totalBorrowed }
  }

  workingTree.forEach(node => calculateStats(node))

  return workingTree
}

// ProTable配置
// 所有可用的表格列配置
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
const loadCategories = () => {
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
    return
  }
  reloadCategories({ page: 1 })
}

const handleSearch = (criteria = {}) => {
  Object.assign(searchForm, criteria)
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
    return
  }
  reloadCategories({ page: 1 })
}

const handleReset = () => {
  Object.assign(searchForm, { ...defaultSearchForm })
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
    return
  }
  reloadCategories({ page: 1 })
}

const handleAddCategory = () => {
  editCategoryData.value = null
  editDialogVisible.value = true
}

const handleAddSubCategory = (parentCategoryName) => {
  const parentCategory = findCategoryData(parentCategoryName, categoryTree.value)
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
      showInfo('查看图书功能开发中...')
      break
    case 'addSubCategory':
      handleAddSubCategory(category)
      break
    case 'editCategory': {
      const categoryData = findCategoryData(category, categoryTree.value)
      editCategoryData.value = categoryData
      editDialogVisible.value = true
      break
    }
    case 'deleteCategory':
      handleDeleteCategory(category)
      break
  }
}

const handleDeleteCategory = async categoryName => {
  const confirmed = await confirmDelete(1, `分类"${categoryName}"`)
  if (!confirmed) return

  try {
    await deleteBookCategory(categoryName)
    await loadCategories()
    showSuccess('分类删除成功')
  } catch (error) {
    console.error('删除分类失败:', error)
    showError('删除分类失败: ' + (error.message || '未知错误'))
  }
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
      showSuccess('分类编辑成功')
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
      showSuccess('子分类创建成功')
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
      showSuccess('分类创建成功')
    }

    editDialogVisible.value = false
    editCategoryData.value = null

  } catch (error) {
    console.error('保存分类失败:', error)
    showError('保存分类失败: ' + (error.message || '未知错误'))
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
  showInfo('批量导入功能开发中...')
}

const handleBatchDelete = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) {
    showWarning('请选择要删除的分类')
    return
  }

  const confirmed = await confirmDelete(selectedRows.length, '分类')
  if (!confirmed) return

  try {
    // 批量删除逻辑 - API expects category names
    for (const category of selectedRows) {
      await deleteBookCategory(category.name)
    }

    showSuccess('批量删除成功')
    await loadCategories()
  } catch (error) {
    console.error('批量删除失败:', error)
    showError('批量删除失败')
  }
}

// 批量启用分类
const handleBatchEnable = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) {
    showWarning('请选择要启用的分类')
    return
  }

  const confirmed = await confirm(`确定要启用选中的 ${selectedRows.length} 个分类吗？`, '批量启用', { type: 'info' })
  if (!confirmed) return

  try {
    // 批量启用逻辑 - API expects category names
    for (const category of selectedRows) {
      await updateBookCategory(category.name, { is_active: true })
    }

    showSuccess('批量启用成功')
    await loadCategories()
  } catch (error) {
    console.error('批量启用失败:', error)
    showError('批量启用失败')
  }
}

// 批量禁用分类
const handleBatchDisable = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) {
    showWarning('请选择要禁用的分类')
    return
  }

  const confirmed = await confirm(`确定要禁用选中的 ${selectedRows.length} 个分类吗？`, '批量禁用', { type: 'warning' })
  if (!confirmed) return

  try {
    // 批量禁用逻辑 - API expects category names
    for (const category of selectedRows) {
      await updateBookCategory(category.name, { is_active: false })
    }

    showSuccess('批量禁用成功')
    await loadCategories()
  } catch (error) {
    console.error('批量禁用失败:', error)
    showError('批量禁用失败')
  }
}

// 列设置应用回调 - 添加ProTable刷新
const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  // 强制刷新ProTable
  if (proTableRef.value) {
    proTableRef.value.refresh()
  }
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
