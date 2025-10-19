<template>
  <div class="category-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增分类
        </el-button>
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="expandAll">
          <el-icon><Expand /></el-icon>
          展开全部
        </el-button>
        <el-button @click="collapseAll">
          <el-icon><Fold /></el-icon>
          收起全部
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索分类名称"
          style="width: 200px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 分类树 -->
    <div class="category-tree">
      <el-tree
        ref="treeRef"
        :data="filteredCategories"
        :props="treeProps"
        :expand-on-click-node="false"
        :default-expand-all="false"
        node-key="id"
        draggable
        @node-drop="handleNodeDrop"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <div class="node-content">
              <div class="node-info">
                <div class="color-indicator" :style="{ backgroundColor: data.color || '#409EFF' }"></div>
                <span class="node-label">{{ data.name }}</span>
                <el-tag v-if="data.bookCount" size="small" type="info">{{ data.bookCount }}本</el-tag>
              </div>
              <div class="node-actions">
                <el-button type="primary" link size="small" @click.stop="handleEdit(data)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button type="success" link size="small" @click.stop="handleAddChild(data)">
                  <el-icon><Plus /></el-icon>
                </el-button>
                <el-button type="danger" link size="small" @click.stop="handleDelete(data)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </template>
      </el-tree>
    </div>

    <!-- 分类表单对话框 -->
    <el-dialog
      v-model="showForm"
      :title="formMode === 'create' ? '新增分类' : '编辑分类'"
      width="500px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入分类名称" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="父分类" prop="parentId">
          <el-tree-select
            v-model="formData.parentId"
            :data="categoryTreeOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="选择父分类（不选则为顶级分类）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="分类颜色" prop="color">
          <el-color-picker v-model="formData.color" :predefine="colorPresets" show-alpha />
        </el-form-item>

        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="formData.sort"
            :min="0"
            :max="999"
            placeholder="数字越小排序越靠前"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ formMode === 'create' ? '创建' : '更新' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 分类详情对话框 -->
    <el-dialog v-model="showDetail" title="分类详情" width="600px" destroy-on-close>
      <div v-if="selectedCategory" class="category-detail">
        <div class="detail-header">
          <div class="category-color" :style="{ backgroundColor: selectedCategory.color || '#409EFF' }"></div>
          <div class="category-info">
            <h3>{{ selectedCategory.name }}</h3>
            <p>{{ selectedCategory.description || '暂无描述' }}</p>
          </div>
        </div>

        <div class="detail-stats">
          <div class="stat-item">
            <span class="stat-label">图书数量：</span>
            <span class="stat-value">{{ selectedCategory.bookCount || 0 }}本</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">创建时间：</span>
            <span class="stat-value">{{ formatDate(selectedCategory.createdAt) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">更新时间：</span>
            <span class="stat-value">{{ formatDate(selectedCategory.updatedAt) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">状态：</span>
            <el-tag :type="selectedCategory.status === 'active' ? 'success' : 'danger'">
              {{ selectedCategory.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </div>
        </div>

        <div v-if="selectedCategory.children && selectedCategory.children.length" class="subcategories">
          <h4>子分类</h4>
          <div class="subcategory-list">
            <el-tag
              v-for="child in selectedCategory.children"
              :key="child.id"
              class="subcategory-tag"
              @click="handleNodeClick(null, child)"
            >
              {{ child.name }}
            </el-tag>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit(selectedCategory)">编辑分类</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { bookApi } from '@/api/book'
import { formatDate } from '@/utils/date'
import { removeEmpty } from '@/utils/global'

// 事件定义
const emit = defineEmits(['updated'])

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const categories = ref([])
const filteredCategories = ref([])
const searchKeyword = ref('')
const showForm = ref(false)
const showDetail = ref(false)
const formMode = ref('create') // create | edit
const selectedCategory = ref(null)
const treeRef = ref()
const formRef = ref()

// 树组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 颜色预设
const colorPresets = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9'
]

// 表单数据
const formData = reactive({
  name: '',
  parentId: null,
  description: '',
  color: '#409EFF',
  sort: 0,
  status: 'active'
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  sort: [{ type: 'number', message: '排序必须为数字', trigger: 'blur' }]
}

// 计算属性
const categoryTreeOptions = computed(() => {
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }))
  }

  return buildTree(categories.value.filter(c => c.id !== formData.id))
})

// 方法
const fetchCategories = async () => {
  try {
    loading.value = true
    const response = await bookApi.getCategoryTree()

    // 直接使用后端标准响应格式
    const categoriesData = Array.isArray(response.data) ? response.data : []

    categories.value = categoriesData
    filteredCategories.value = categoriesData
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = keyword => {
  if (!keyword) {
    filteredCategories.value = categories.value
    return
  }

  const filterTree = items => {
    return items.reduce((result, item) => {
      if (item.name.toLowerCase().includes(keyword.toLowerCase())) {
        result.push({ ...item })
      } else if (item.children) {
        const filteredChildren = filterTree(item.children)
        if (filteredChildren.length > 0) {
          result.push({ ...item, children: filteredChildren })
        }
      }
      return result
    }, [])
  }

  filteredCategories.value = filterTree(categories.value)
}

const handleRefresh = () => {
  fetchCategories()
}

const expandAll = () => {
  const allNodes = treeRef.value.store._getAllNodes()
  allNodes.forEach(node => {
    if (!node.isLeaf) {
      node.expand()
    }
  })
}

const collapseAll = () => {
  const allNodes = treeRef.value.store._getAllNodes()
  allNodes.forEach(node => {
    node.collapse()
  })
}

const handleAdd = () => {
  formMode.value = 'create'
  resetForm()
  showForm.value = true
}

const handleAddChild = parentCategory => {
  formMode.value = 'create'
  resetForm()
  formData.parentId = parentCategory.id
  showForm.value = true
}

const handleEdit = category => {
  formMode.value = 'edit'
  Object.assign(formData, {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    description: category.description || '',
    color: category.color || '#409EFF',
    sort: category.sort || 0,
    status: category.status || 'active'
  })
  showForm.value = true
  showDetail.value = false
}

const handleDelete = async category => {
  if (category.children && category.children.length > 0) {
    ElMessage.warning('该分类下有子分类，请先删除子分类')
    return
  }

  if (category.bookCount > 0) {
    ElMessage.warning('该分类下有图书，请先移动或删除图书')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？`, '删除分类', { type: 'warning' })

    await bookApi.deleteCategory(category.id)
    ElMessage.success('删除成功')
    fetchCategories()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error)
      ElMessage.error('删除分类失败')
    }
  }
}

const handleNodeClick = (data, node) => {
  selectedCategory.value = data || node
  showDetail.value = true
}

const handleNodeDrop = async (draggingNode, dropNode, dropType) => {
  try {
    const dragData = draggingNode.data
    let newParentId = null
    let newSort = 0

    if (dropType === 'inner') {
      newParentId = dropNode.data.id
    } else {
      newParentId = dropNode.data.parentId
      newSort = dropNode.data.sort + (dropType === 'after' ? 1 : -1)
    }

    // 清理更新数据，移除空值
    const updateData = removeEmpty({
      parentId: newParentId,
      sort: newSort
    })

    await bookApi.updateCategory(dragData.id, updateData)

    ElMessage.success('分类移动成功')
    fetchCategories()
    emit('updated')
  } catch (error) {
    console.error('移动分类失败:', error)
    ElMessage.error('移动分类失败')
    // 刷新恢复原状态
    fetchCategories()
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    // 清理表单数据，移除空值
    const submitData = removeEmpty({
      ...formData,
      id: formMode.value === 'edit' ? formData.id : undefined
    })

    if (formMode.value === 'create') {
      await bookApi.createCategory(submitData)
      ElMessage.success('创建成功')
    } else {
      await bookApi.updateCategory(formData.id, submitData)
      ElMessage.success('更新成功')
    }

    showForm.value = false
    fetchCategories()
    emit('updated')
  } catch (error) {
    if (error !== false) {
      // 表单验证失败时error为false
      console.error('保存分类失败:', error)
      ElMessage.error('保存分类失败')
    }
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: '',
    parentId: null,
    description: '',
    color: '#409EFF',
    sort: 0,
    status: 'active'
  })

  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 生命周期
onMounted(() => {
  fetchCategories()
})
</script>

<style lang="scss" scoped>
.category-manager {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.category-tree {
  flex: 1;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  overflow: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &:hover .node-actions {
    opacity: 1;
  }
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
}

.node-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.category-detail {
  .detail-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .category-color {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid var(--el-border-color);
    }

    .category-info {
      h3 {
        margin: 0 0 4px 0;
        font-size: 18px;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 0;
        color: var(--el-text-color-regular);
      }
    }
  }

  .detail-stats {
    margin-bottom: 20px;

    .stat-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;

      .stat-label {
        color: var(--el-text-color-secondary);
      }

      .stat-value {
        font-weight: 500;
      }
    }
  }

  .subcategories {
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    .subcategory-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .subcategory-tag {
        cursor: pointer;

        &:hover {
          opacity: 0.8;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .category-manager {
    height: auto;
  }

  .toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .category-tree {
    min-height: 300px;
  }

  .node-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .node-actions {
    opacity: 1;
  }
}
</style>
