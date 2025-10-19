<template>
  <div class="permissions-container">
    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      ref="searchFilterRef"
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="true"
      :default-collapsed="false"
      :collapsed-rows="1"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 权限列表表格 -->
    <el-card shadow="never" class="permissions-card">
      <ProTable
        ref="proTableRef"
        :request="requestPermissions"
        :columns="permissionColumns"
        :actions="rowActions"
        :row-selection="false"
        :search="false"
        :toolBar="toolBarConfig"
        :action-column="{ width: 200, fixed: 'right', align: 'center' }"
        :max-height="finalTableHeight"
        row-key="id"
        stripe
        border
        @create="handleAdd"
      >
        <!-- 分组插槽 -->
        <template #group_name="{ record }">
          <el-tag v-if="record.group_name" size="small" type="info">
            {{ record.group_name }}
          </el-tag>
          <span v-else style="color: #999;">-</span>
        </template>

        <!-- 工具栏插槽 -->
        <template #toolBarRender>
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <!-- 左侧操作按钮 -->
            <div style="display: flex; gap: 8px;">
              <el-button type="primary" @click="handleAdd">
                新增权限
              </el-button>
            </div>

            <!-- 右侧工具按钮 -->
            <div style="display: flex; gap: 8px;">
              <el-tooltip content="刷新数据" placement="top">
                <el-button :icon="Refresh" @click="handleRefresh" :loading="loading" />
              </el-tooltip>
            </div>
          </div>
        </template>
      </ProTable>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="form.id ? '编辑权限' : '新增权限'" 
      width="600px"
      destroy-on-close
    >
      <el-form :model="form" label-width="90px" :rules="formRules" ref="formRef">
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!form.id" placeholder="请输入权限编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="form.group_name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            type="textarea" 
            v-model="form.description" 
            :rows="3"
            placeholder="请输入权限描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { listPermissions, createPermission, updatePermission, deletePermission } from '@/api/permissions'
import { ProTable } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import { useTableRequest } from '@/composables/useTableRequest'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'
import { showSuccess, showError, confirmDelete } from '@/utils/message'

// 响应式状态
const proTableRef = ref()
const searchFilterRef = ref()
const dialogVisible = ref(false)
const saveLoading = ref(false)
const formRef = ref()
const form = ref({
  id: null,
  code: '',
  name: '',
  group_name: '',
  description: ''
})

// 表单验证规则
const formRules = {
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' }
  ]
}

// 搜索表单默认值
const defaultSearchForm = Object.freeze({
  keyword: '',
  group_name: ''
})

// 使用表格请求管理
const {
  searchForm,
  loading,
  dataSource,
  pagination,
  request: requestPermissions,
  reload: reloadPermissions
} = useTableRequest((params) => {
  // 将参数转换为后端需要的格式
  const query = {
    page: params.page || 1,
    size: params.pageSize || 20,
  }
  
  // 添加搜索条件
  if (params.search?.keyword) {
    query.keyword = params.search.keyword
  }
  if (params.search?.group_name) {
    query.group_name = params.search.group_name
  }
  
  return listPermissions(query)
}, {
  defaultSearch: defaultSearchForm,
  defaultPageSize: 20,
  manual: true,
  immediate: false,
  formatParams: ({ search, page, pageSize, sorter }) => {
    return {
      search,
      page,
      pageSize,
      sorter
    }
  }
})

// 搜索字段配置
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入权限编码或名称搜索',
    clearable: true
  },
  {
    name: 'group_name',
    valueType: 'text',
    label: '分组',
    placeholder: '输入分组名称搜索',
    clearable: true
  }
]

// 表格列配置
const permissionColumns = [
  {
    key: 'code',
    title: '权限编码',
    dataIndex: 'code',
    minWidth: 240,
    align: 'left'
  },
  {
    key: 'name',
    title: '权限名称',
    dataIndex: 'name',
    minWidth: 200,
    align: 'left'
  },
  {
    key: 'group_name',
    title: '分组',
    slot: 'group_name',
    minWidth: 160,
    align: 'center'
  },
  {
    key: 'description',
    title: '描述',
    dataIndex: 'description',
    minWidth: 200,
    align: 'left'
  }
]

// 表格行操作配置
const rowActions = [
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: (record) => handleEdit(record)
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
  createText: '新增权限',
  reload: true,
  density: false,
  columnSetting: false,
  fullScreen: false
}

// 使用表格高度管理
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 180,
  footerOffset: 80
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

// 方法
const handleSearch = (criteria = {}) => {
  Object.assign(searchForm, criteria)
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
  } else {
    reloadPermissions({ page: 1, pageSize: pagination.pageSize || 20 })
  }
}

const handleReset = () => {
  Object.assign(searchForm, { ...defaultSearchForm })
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
  } else {
    reloadPermissions({ page: 1, pageSize: 20 })
  }
}

const handleAdd = () => {
  form.value = {
    id: null,
    code: '',
    name: '',
    group_name: '',
    description: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  form.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    group_name: row.group_name || '',
    description: row.description || ''
  }
  dialogVisible.value = true
}

const save = async () => {
  // 表单验证
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  try {
    saveLoading.value = true
    const payload = { ...form.value }

    if (payload.id) {
      await updatePermission(payload.id, payload)
      showSuccess('更新成功')
    } else {
      await createPermission(payload)
      showSuccess('创建成功')
    }

    dialogVisible.value = false
    handleRefresh()
  } catch (error) {
    console.error('保存失败:', error)
    showError(error.response?.data?.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    const confirmed = await confirmDelete(1, '权限', `确认删除权限「${row.code}」吗？`)
    if (!confirmed) return

    await deletePermission(row.id)
    showSuccess('删除成功')
    handleRefresh()
  } catch (error) {
    console.error('删除失败:', error)
    showError(error.response?.data?.message || '删除失败')
  }
}

const handleRefresh = () => {
  if (proTableRef.value?.refresh) {
    proTableRef.value.refresh()
  }
}

// 生命周期
onMounted(() => {
  // ProTable 会自动触发首次加载
})
</script>

<style lang="scss" scoped>
.permissions-container {
  background-color: var(--content-bg-color);
}

.permissions-card {
  margin-bottom: 20px;
}
</style>
