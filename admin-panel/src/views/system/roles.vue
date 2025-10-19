<template>
  <div class="roles-container">
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

    <!-- 角色列表表格 -->
    <el-card shadow="never" class="roles-card">
      <ProTable
        ref="proTableRef"
        :request="requestRoles"
        :columns="roleColumns"
        :actions="rowActions"
        :row-selection="false"
        :search="false"
        :toolBar="toolBarConfig"
        :action-column="{ width: 240, fixed: 'right', align: 'center' }"
        :max-height="finalTableHeight"
        row-key="id"
        stripe
        border
        @create="handleAdd"
      >
        <!-- 类型插槽 -->
        <template #is_system="{ record }">
          <el-tag size="small" :type="record.is_system ? 'warning' : 'success'">
            {{ record.is_system ? '系统' : '自定义' }}
          </el-tag>
        </template>

        <!-- 权限代码插槽 -->
        <template #permissions="{ record }">
          <div class="permission-list">
            <el-tag
              v-for="code in (record.permissionCodes || [])"
              :key="code"
              size="small"
              effect="plain"
            >
              {{ code }}
            </el-tag>
            <span v-if="!record.permissionCodes || record.permissionCodes.length === 0">-</span>
          </div>
        </template>

        <!-- 工具栏插槽 -->
        <template #toolBarRender>
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <!-- 左侧操作按钮 -->
            <div style="display: flex; gap: 8px;">
              <el-button type="primary" @click="handleAdd">
                新增角色
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
      :title="form.id ? '编辑角色' : '新增角色'" 
      width="600px"
      destroy-on-close
    >
      <el-form :model="form" label-width="90px" :rules="formRules" ref="formRef">
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!form.id" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            type="textarea" 
            v-model="form.description" 
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
        <el-form-item label="系统角色">
          <el-switch
            v-model="form.is_system"
            :disabled="!!form.id && form.is_system"
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
        <el-form-item label="权限">
          <el-select 
            v-model="form.permissionIds" 
            multiple 
            filterable 
            style="width:100%"
            placeholder="请选择权限"
          >
            <el-option 
              v-for="p in permissions" 
              :key="p.id" 
              :label="p.code + ' - ' + p.name" 
              :value="p.id" 
            />
          </el-select>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { listRoles, createRole, updateRole, deleteRole } from '@/api/roles'
import { listPermissions } from '@/api/permissions'
import { ProTable } from '@/components/common'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import { showSuccess, showError, showWarning, confirmDelete } from '@/utils/message'
import { useTableRequest } from '@/composables/useTableRequest'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

// 响应式状态
const proTableRef = ref()
const searchFilterRef = ref()
const dialogVisible = ref(false)
const saveLoading = ref(false)
const formRef = ref()
const permissions = ref([])
const form = ref({
  id: null,
  code: '',
  name: '',
  description: '',
  is_system: false,
  permissionIds: []
})

// 表单验证规则
const formRules = {
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ]
}

// 搜索表单默认值
const defaultSearchForm = Object.freeze({
  keyword: '',
  is_system: null
})

// 使用表格请求管理
const {
  searchForm,
  loading,
  dataSource,
  pagination,
  request: requestRoles,
  reload: reloadRoles
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
  if (params.search?.is_system !== null && params.search?.is_system !== undefined && params.search?.is_system !== '') {
    query.is_system = params.search.is_system
  }
  
  return listRoles(query)
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
    placeholder: '输入角色编码或名称搜索',
    clearable: true
  },
  {
    name: 'is_system',
    valueType: 'select',
    label: '角色类型',
    placeholder: '请选择角色类型',
    options: [
      { label: '全部', value: null },
      { label: '系统角色', value: true },
      { label: '自定义角色', value: false }
    ]
  }
]

// 表格列配置
const roleColumns = [
  {
    key: 'code',
    title: '角色编码',
    dataIndex: 'code',
    minWidth: 180,
    align: 'left'
  },
  {
    key: 'name',
    title: '角色名称',
    dataIndex: 'name',
    minWidth: 200,
    align: 'left'
  },
  {
    key: 'description',
    title: '描述',
    dataIndex: 'description',
    minWidth: 200,
    align: 'left'
  },
  {
    key: 'is_system',
    title: '类型',
    slot: 'is_system',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'permissions',
    title: '权限代码',
    slot: 'permissions',
    minWidth: 260,
    align: 'left'
  }
]

// 表格行操作配置
const rowActions = [
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: (record) => handleEdit(record),
    disabled: (record) => record.is_system
  },
  {
    key: 'delete',
    text: '删除',
    type: 'text',
    onClick: (record) => handleDelete(record),
    disabled: (record) => record.is_system
  }
]

// 工具栏配置
const toolBarConfig = {
  create: true,
  createText: '新增角色',
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

// 加载权限列表
const loadPermissions = async () => {
  try {
    const response = await listPermissions()
    permissions.value = response?.data || []
  } catch (error) {
    console.error('获取权限列表失败:', error)
  }
}

// 方法
const handleSearch = (criteria = {}) => {
  Object.assign(searchForm, criteria)
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
  } else {
    reloadRoles({ page: 1, pageSize: pagination.pageSize || 20 })
  }
}

const handleReset = () => {
  Object.assign(searchForm, { ...defaultSearchForm })
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
  } else {
    reloadRoles({ page: 1, pageSize: 20 })
  }
}

const handleAdd = () => {
  form.value = {
    id: null,
    code: '',
    name: '',
    description: '',
    is_system: false,
    permissionIds: []
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  if (row.is_system) {
    showWarning('系统角色禁止修改')
    return
  }

  const fallbackIds = Array.from(
    new Set(
      (row.rolePermissions || [])
        .map(rp => rp?.permission?.id ?? rp?.permission_id)
        .filter(id => id !== undefined && id !== null)
        .map(id => Number(id))
    )
  )

  const preparedIds = Array.isArray(row.permissionIds) && row.permissionIds.length > 0
    ? Array.from(new Set(row.permissionIds.map(id => Number(id))))
    : fallbackIds

  form.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    is_system: !!row.is_system,
    permissionIds: preparedIds,
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
    
    // 处理权限 ID
    payload.permissionIds = Array.from(
      new Set(
        (payload.permissionIds || [])
          .map(id => Number(id))
          .filter(id => !Number.isNaN(id))
      )
    )
    payload.is_system = !!payload.is_system
    
    if (payload.id) {
      await updateRole(payload.id, payload)
      showSuccess('更新成功')
    } else {
      await createRole(payload)
      showSuccess('创建成功')
    }

    dialogVisible.value = false
    handleRefresh()
  } catch (error) {
    console.error('保存失败:', error)
    showError(error.response?.data?.message || error.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  if (row.is_system) {
    showWarning('系统角色禁止删除')
    return
  }

  try {
    const confirmed = await confirmDelete(1, '角色', `确认删除角色「${row.name}」吗？此操作不可撤销`)
    if (!confirmed) return

    await deleteRole(row.id)
    showSuccess('删除成功')
    handleRefresh()
  } catch (error) {
    console.error('删除失败:', error)
    showError(error.response?.data?.message || error.message || '删除失败')
  }
}

const handleRefresh = () => {
  if (proTableRef.value?.refresh) {
    proTableRef.value.refresh()
  }
}

// 生命周期
onMounted(() => {
  loadPermissions()
  // ProTable 会自动触发首次加载
})
</script>

<style lang="scss" scoped>
.roles-container {
  background-color: var(--content-bg-color);
}

.roles-card {
  margin-bottom: 20px;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  
  span {
    color: #999;
    font-size: 12px;
  }
}
</style>
