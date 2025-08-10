<template>
  <div class="users-container">

    <!-- 搜索筛选区域 -->
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="false"
      @search="handleSearch"
      @reset="handleReset"
    />


    <!-- 用户表格 -->
    <div class="table-section">
      <el-card shadow="never" class="table-card">
        <!-- 用户管理表格 -->
        <ProTable
          ref="proTableRef"
          :request="requestUsers"
          :columns="userTableColumns"
          :batch-actions="userBatchActions"
          :actions="userRowActions"
          :row-selection="{ type: 'checkbox' }"
          :search="false"
          :toolBar="userToolBarConfig"
          :params="userSearchParams"
          :action-column="{ width: 280, fixed: 'right', align: 'center' }"
          row-key="id"
          @create="handleAdd"
          @selection-change="handleProTableSelectionChange"
        >
          <!-- 用户信息插槽 -->
          <template #userInfo="{ record }">
            <div class="user-info">
              <el-avatar :size="40" :src="record.avatar" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="user-details">
                <div class="user-name">{{ record.username }}</div>
                <div class="user-real-name">{{ record.realName || '-' }}</div>
              </div>
            </div>
          </template>

          <!-- 联系方式插槽 -->
          <template #contact="{ record }">
            <div class="contact-info">
              <div class="contact-item">
                <el-icon><Message /></el-icon>
                <span>{{ record.email || '-' }}</span>
              </div>
              <div class="contact-item">
                <el-icon><Phone /></el-icon>
                <span>{{ record.phone || '-' }}</span>
              </div>
            </div>
          </template>

          <!-- 角色插槽 -->
          <template #role="{ record }">
            <StatusTag
              :status="record.role"
              :text="getRoleText(record.role)"
              :type="getRoleTagType(record.role)"
              size="small"
            />
          </template>

          <!-- 状态插槽 -->
          <template #status="{ record }">
            <StatusTag :status="record.status" :preset="'user'" size="small" />
          </template>

          <!-- 借阅统计插槽 -->
          <template #borrowStats="{ record }">
            <div class="borrow-stats">
              <div class="stat-item">
                <span class="stat-label">当前:</span>
                <span class="stat-value">{{ record.currentBorrows || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">历史:</span>
                <span class="stat-value">{{ record.totalBorrows || 0 }}</span>
              </div>
            </div>
          </template>

          <!-- 积分插槽 -->
          <template #points="{ record }">
            <span class="points-value">{{ record.points?.balance || record.pointsBalance || 0 }}</span>
          </template>

          <!-- 最后登录时间插槽 -->
          <template #lastLogin="{ record }">
            <div class="time-info">
              <div>{{ formatDate(record.lastLoginAt) }}</div>
              <div class="time-ago">{{ formatTimeAgo(record.lastLoginAt) }}</div>
            </div>
          </template>

          <!-- 注册时间插槽 -->
          <template #createdTime="{ record }">
            <div class="time-info">
              <div>{{ formatDate(record.createdAt) }}</div>
              <div class="time-ago">{{ formatTimeAgo(record.createdAt) }}</div>
            </div>
          </template>

          <!-- 工具栏插槽 -->
          <template #toolBarRender="{ selectedRowKeys, selectedRows }">
            <!-- 新增用户按钮 -->
            <el-button type="primary" @click="handleAdd">
              新增用户
            </el-button>
            
            <!-- 批量操作按钮（始终显示，无选中项时禁用） -->
            <el-button 
              type="danger" 
              :disabled="selectedRowKeys.length === 0"
              @click="handleBatchDeleteFromTable(selectedRows)"
            >
              批量删除
            </el-button>
            <el-button 
              type="warning" 
              :disabled="selectedRowKeys.length === 0"
              @click="handleBatchToggleStatusFromTable(selectedRows)"
            >
              批量状态切换
            </el-button>
            
            <!-- 常规工具栏按钮 -->
            <el-button type="info" :icon="Download" :loading="exportLoading" @click="handleExport">
              导出数据
            </el-button>
            <el-button type="success" :icon="Upload" @click="handleImport">
              导入用户
            </el-button>
          </template>
        </ProTable>
      </el-card>
    </div>

    <!-- 列设置对话框 -->
    <el-dialog v-model="showColumnSettings" title="列设置" width="400px">
      <el-checkbox-group v-model="visibleColumns">
        <div class="column-settings">
          <el-checkbox
            v-for="column in columnOptions"
            :key="column.value"
            :label="column.value"
            :disabled="column.required"
          >
            {{ column.label }}
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="showColumnSettings = false">取消</el-button>
        <el-button type="primary" @click="applyColumnSettings">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  User,
  Message,
  Phone,
  Download,
  Upload
} from '@element-plus/icons-vue'
import { userApi } from '@/api/user'
import { formatDate, formatTimeAgo } from '@/utils/date'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import StatusTag from '@/components/common/StatusTag.vue'
import { ProTable } from '@/components/common'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const userList = ref([])
const selectedUsers = ref([])
const selectAll = ref(false)
const isIndeterminate = ref(false)
const showColumnSettings = ref(false)
const tableRef = ref()
const proTableRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  role: '',
  status: '',
  dateRange: null
})

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 排序信息
const sortInfo = reactive({
  prop: '',
  order: ''
})

// ProTable配置
const userSearchParams = computed(() => ({
  ...searchForm
}))

// 表格列配置
const userTableColumns = [
  {
    key: 'userInfo',
    title: '用户信息',
    slot: 'userInfo',
    minWidth: 180,
    align: 'center'
  },
  {
    key: 'contact',
    title: '联系方式',
    slot: 'contact',
    minWidth: 160,
    align: 'center'
  },
  {
    key: 'role',
    title: '角色',
    slot: 'role',
    minWidth: 90,
    sorter: true,
    align: 'center'
  },
  {
    key: 'status',
    title: '状态',
    slot: 'status',
    minWidth: 90,
    sorter: true,
    align: 'center'
  },
  {
    key: 'borrowStats',
    title: '借阅统计',
    slot: 'borrowStats',
    minWidth: 110,
    align: 'center'
  },
  {
    key: 'points',
    title: '积分',
    slot: 'points',
    minWidth: 70,
    sorter: true,
    align: 'center'
  },
  {
    key: 'lastLoginAt',
    title: '最后登录',
    slot: 'lastLogin',
    minWidth: 140,
    sorter: true,
    align: 'center'
  },
  {
    key: 'created_at',
    title: '注册时间',
    slot: 'createdTime',
    minWidth: 140,
    sorter: true,
    align: 'center'
  }
]

// 批量操作配置
const userBatchActions = [
  {
    key: 'batchDelete',
    text: '批量删除',
    type: 'danger',
    onClick: (selectedRowKeys, selectedRows) => handleBatchDeleteFromTable(selectedRows)
  },
  {
    key: 'batchToggleStatus',
    text: '批量状态切换',
    type: 'warning',
    onClick: (selectedRowKeys, selectedRows) => handleBatchToggleStatusFromTable(selectedRows)
  }
]

// 行操作配置
const userRowActions = [
  {
    key: 'view',
    text: '查看',
    type: 'text',
    onClick: (record) => handleView(record)
  },
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: (record) => handleEdit(record)
  },
  {
    key: 'resetPassword',
    text: '重置密码',
    type: 'text',
    onClick: (record) => handleAction('resetPassword', record)
  },
  {
    key: 'toggleStatus',
    text: '状态切换',
    type: 'text',
    onClick: (record) => handleAction('toggleStatus', record)
  },
  {
    key: 'delete',
    text: '删除',
    type: 'text',
    onClick: (record) => handleAction('delete', record)
  }
]

// 工具栏配置
const userToolBarConfig = {
  create: true,
  createText: '新增用户',
  reload: true,
  density: true,
  columnSetting: true,
  fullScreen: true
}


// 搜索字段配置（基于 ProForm 设计）
const searchFields = [
  {
    name: 'keyword',
    valueType: 'text',
    label: '关键词',
    placeholder: '输入用户名、真实姓名或邮箱',
    clearable: true
  },
  {
    name: 'role',
    valueType: 'select',
    label: '用户角色',
    placeholder: '选择角色',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '图书管理员', value: 'librarian' },
      { label: '普通用户', value: 'user' }
    ]
  },
  {
    name: 'status',
    valueType: 'select',
    label: '账户状态',
    placeholder: '选择状态',
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' }
    ]
  },
  {
    name: 'dateRange',
    valueType: 'dateRange',
    label: '注册时间',
    placeholder: ['开始时间', '结束时间']
  }
]

// 列设置
const visibleColumns = ref([
  'userInfo',
  'contact',
  'role',
  'status',
  'borrowStats',
  'points',
  'lastLogin',
  'registerTime'
])
const columnOptions = [
  { label: '用户信息', value: 'userInfo', required: true },
  { label: '联系方式', value: 'contact' },
  { label: '角色', value: 'role' },
  { label: '状态', value: 'status' },
  { label: '借阅统计', value: 'borrowStats' },
  { label: '积分', value: 'points' },
  { label: '最后登录', value: 'lastLogin' },
  { label: '注册时间', value: 'registerTime' }
]

// 选项配置
const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '图书管理员', value: 'librarian' },
  { label: '普通用户', value: 'user' }
]

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
]


// 计算属性
const isIndeterminateChecked = computed(() => {
  const selectedCount = selectedUsers.value.length
  const totalCount = userList.value.length
  return selectedCount > 0 && selectedCount < totalCount
})

// 方法
const formatNumber = num => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toLocaleString()
}

const getRoleText = role => {
  const roleMap = {
    admin: '管理员',
    librarian: '图书管理员',
    user: '普通用户'
  }
  return roleMap[role] || role
}

const getRoleTagType = role => {
  const typeMap = {
    admin: 'danger',
    librarian: 'warning',
    user: 'info'
  }
  return typeMap[role] || 'info'
}

const getStatusText = status => {
  const statusMap = {
    active: '启用',
    inactive: '禁用'
  }
  return statusMap[status] || status
}

const fetchUsers = async () => {
  try {
    loading.value = true

    // 检查userApi是否可用
    if (!userApi || !userApi.getUsers) {
      throw new Error('User API is not available')
    }

    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm,
      sortBy: sortInfo.prop,
      sortOrder: sortInfo.order
    }

    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await userApi.getUsers(params)

    if (response && response.data) {
      // Handle the actual backend response format
      // Backend returns: { success: true, data: [...users], pagination: {...} }
      userList.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
      }
    } else {
      throw new Error('Invalid response data')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    const message = error.message || '获取用户列表失败'
    ElMessage.error(message)

    // 如果是API不可用，显示空状态而不是错误
    if (error.message === 'User API is not available') {
      userList.value = []
      pagination.total = 0
    }
  } finally {
    loading.value = false
  }
}

// ProTable数据请求函数
const requestUsers = async (params) => {
  try {
    console.log('ProTable请求参数:', params)
    
    const requestParams = {
      page: params.current || 1,
      limit: params.pageSize || 20,
      sortBy: params.sorter || 'created_at',
      sortOrder: params.order === 'ascend' ? 'asc' : 'desc',
      ...searchForm
    }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      requestParams.startDate = searchForm.dateRange[0]
      requestParams.endDate = searchForm.dateRange[1]
    }

    const response = await userApi.getUsers(requestParams)
    
    return {
      success: true,
      data: response.data || [],
      total: response.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  }
}

const handleSearch = () => {
  pagination.page = 1
  proTableRef.value?.reload(true)
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    role: '',
    status: '',
    dateRange: null
  })
  pagination.page = 1
  proTableRef.value?.reload(true)
}

const handleSizeChange = size => {
  pagination.size = size
  pagination.page = 1
}

const handlePageChange = page => {
  pagination.page = page
}

const handleSortChange = ({ prop, order }) => {
  sortInfo.prop = prop
  sortInfo.order = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
}

const handleSelectionChange = selection => {
  selectedUsers.value = selection
  const selectedCount = selection.length
  const totalCount = userList.value.length

  selectAll.value = selectedCount === totalCount && totalCount > 0
  isIndeterminate.value = selectedCount > 0 && selectedCount < totalCount
}

// ProTable选择变化处理
const handleProTableSelectionChange = (selectedRowKeys, selectedRows) => {
  selectedUsers.value = selectedRows
}

const handleAdd = () => {
  try {
    router.push('/users/create')
  } catch (error) {
    console.error('Navigation to create user failed:', error)
    ElMessage.error('导航失败，请刷新页面后重试')
  }
}

const handleView = user => {
  router.push(`/users/detail/${user.id}`)
}

const handleEdit = user => {
  try {
    // 传递用户数据作为路由状态，以便在API不可用时使用
    router.push({
      path: `/users/edit/${user.id}`,
      state: { userData: user }
    })
  } catch (error) {
    console.error('Navigation to edit user failed:', error)
    ElMessage.error('导航失败，请刷新页面后重试')
  }
}

const handleAction = async (command, user) => {
  switch (command) {
    case 'resetPassword':
      await handleResetPassword(user)
      break
    case 'toggleStatus':
      await handleToggleStatus(user)
      break
    case 'viewBorrows':
      router.push(`/borrows?userId=${user.id}`)
      break
    case 'viewPoints':
      router.push(`/points/transactions?userId=${user.id}`)
      break
    case 'delete':
      await handleDelete(user)
      break
  }
}

const handleResetPassword = async user => {
  try {
    await ElMessageBox.confirm(`确定要重置用户"${user.username}"的密码吗？新密码将通过邮件发送给用户。`, '重置密码', {
      type: 'warning'
    })

    await userApi.resetPassword(user.id)
    ElMessage.success('密码重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置密码失败')
    }
  }
}

const handleToggleStatus = async user => {
  try {
    const action = user.status === 'active' ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定要${action}用户"${user.username}"吗？`, `${action}用户`, { type: 'warning' })

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await userApi.updateUser(user.id, { status: newStatus })

    user.status = newStatus
    ElMessage.success(`用户${action}成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新用户状态失败:', error)
      ElMessage.error('更新用户状态失败')
    }
  }
}

const handleDelete = async user => {
  try {
    await ElMessageBox.confirm(`确定要删除用户"${user.username}"吗？此操作不可撤销！`, '删除用户', { type: 'warning' })

    await userApi.deleteUser(user.id)
    ElMessage.success('用户删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}

// ProTable批量操作处理函数
const handleBatchDeleteFromTable = async (selectedRows) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.length} 个用户吗？此操作不可撤销！`,
      '批量删除',
      { type: 'warning' }
    )

    const userIds = selectedRows.map(user => user.id)
    await userApi.batchDeleteUsers(userIds)

    ElMessage.success('批量删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const handleBatchToggleStatusFromTable = async (selectedRows) => {
  if (selectedRows.length === 0) {
    ElMessage.warning('请选择要切换状态的用户')
    return
  }

  try {
    const { value: action } = await ElMessageBox.prompt(
      `选择要对选中的 ${selectedRows.length} 个用户执行的操作：`,
      '批量状态切换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'select',
        inputOptions: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' }
        ]
      }
    )

    const userIds = selectedRows.map(user => user.id)
    await userApi.batchUpdateStatus(userIds, action)

    ElMessage.success('批量状态切换成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量状态切换失败:', error)
      ElMessage.error('批量状态切换失败')
    }
  }
}

const handleImport = () => {
  ElMessage.info('批量导入功能开发中...')
}

const handleExport = async () => {
  try {
    exportLoading.value = true
    const params = { ...searchForm }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const blob = await userApi.exportUsers(params)

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `用户数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const applyColumnSettings = () => {
  showColumnSettings.value = false
  ElMessage.success('列设置已保存')
}

// 生命周期
onMounted(() => {
  // ProTable will auto-load data when mounted
})
</script>

<style lang="scss" scoped>
.users-container {
  background-color: var(--content-bg-color);
}


.search-section {
  margin-bottom: 24px;
}

.search-card {
  margin-bottom: 24px;
  
  :deep(.el-card__body) {
    padding: 20px 24px;
  }
}

.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}


.table-section {
  margin-top: 20px;
  
  .table-card {
    
    :deep(.pro-table-wrapper) {
      .pro-table-toolbar {
        padding: 0 24px 20px 24px !important;
        border-bottom: 1px solid var(--el-border-color-lighter);
      }
      
      // 操作列居中显示
      .table-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        
        .el-button {
          margin: 0 2px !important;
        }
      }
    }
  }
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  min-width: 0;

  .user-name {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 2px;
  }

  .user-real-name {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.contact-info {
  padding: 8px 0;
  
  .contact-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);

    &:last-child {
      margin-bottom: 0;
    }

    .el-icon {
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }
}

.borrow-stats {
  padding: 8px 0;
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 13px;

    &:last-child {
      margin-bottom: 0;
    }

    .stat-label {
      color: var(--el-text-color-secondary);
    }

    .stat-value {
      font-weight: 600;
      color: var(--el-color-primary);
    }
  }
}

.points-value {
  font-weight: 600;
  color: var(--el-color-warning);
}

.time-info {
  padding: 8px 0;
  
  .time-ago {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.pagination-wrapper {
  padding: 20px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
}

.column-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

// 响应式设计 - 使用标准媒体查询避免mixin问题
@media (min-width: 768px) and (max-width: 991px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .search-form {
    .el-form-item {
      margin-bottom: 16px;
    }
  }

}

@media (max-width: 767px) {
  .users-container {
    padding: 16px;
  }


  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .user-info {
    .user-details {
      .user-name {
        font-size: 14px;
      }
    }
  }

  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
