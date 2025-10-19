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
          :max-height="finalTableHeight"
          row-key="id"
          stripe
          border
          @create="handleAdd"
          @selection-change="handleProTableSelectionChange"
        >
          <!-- 用户名插槽 -->
          <template #username="{ record }">
            <div class="username-info">
              <el-avatar :size="32" :src="record.avatar" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ record.username }}</span>
            </div>
          </template>

          <!-- 真实姓名插槽 -->
          <template #realName="{ record }">
            <span>{{ record.realName || '-' }}</span>
          </template>

          <!-- 邮箱插槽 -->
          <template #email="{ record }">
            <span>{{ record.email || '-' }}</span>
          </template>

          <!-- 电话插槽 -->
          <template #phone="{ record }">
            <span>{{ record.phone || '-' }}</span>
          </template>

          <!-- 角色插槽 -->
          <template #role="{ record }">
            <el-tag
              :type="record.role === 'admin' ? 'danger' : record.role === 'librarian' ? 'warning' : 'success'"
              size="small"
            >
              {{ getStatusText(record.role) }}
            </el-tag>
          </template>

          <!-- 状态插槽 -->
          <template #status="{ record }">
            <StatusTag :status="record.status" :preset="'user'" size="small" />
          </template>

          <!-- 当前借阅插槽 -->
          <template #currentBorrows="{ record }">
            <span>{{ record.currentBorrows || 0 }}</span>
          </template>

          <!-- 历史借阅插槽 -->
          <template #historyBorrows="{ record }">
            <span>{{ record.totalBorrows || 0 }}</span>
          </template>

          <!-- 积分插槽 -->
          <template #points="{ record }">
            <span>{{ record.points?.balance || record.pointsBalance || 0 }}</span>
          </template>

          <!-- 最后登录时间插槽 -->
          <template #lastLogin="{ record }">
            <div class="time-info">
              <div>{{ formatDate(record.last_login_at) }}</div>
            </div>
          </template>

          <!-- 注册时间插槽 -->
          <template #createdTime="{ record }">
            <div class="time-info">
              <div>{{ formatDate(record.created_at) }}</div>
            </div>
          </template>

          <!-- 工具栏插槽 -->
          <template #toolBarRender="{ selectedRowKeys, selectedRows }">
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <!-- 左侧操作按钮 -->
              <div style="display: flex; gap: 8px;">
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
              </div>
              
              <!-- 右侧工具按钮 -->
              <div style="display: flex; gap: 8px;">
                <el-tooltip content="刷新数据" placement="top">
                  <el-button :icon="Refresh" @click="handleRefresh" :loading="loading" />
                </el-tooltip>
                <el-tooltip content="列设置" placement="top">
                  <el-button :icon="Setting" @click="openColumnSettings" />
                </el-tooltip>
              </div>
            </div>
          </template>
        </ProTable>
      </el-card>
    </div>

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
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { message } from '@/utils/message'
import {
  User,
  Message,
  Phone,
  Download,
  Upload,
  Refresh,
  Setting
} from '@element-plus/icons-vue'
import { userApi } from '@/api/user'
import { formatDate, formatTimeAgo } from '@/utils/date'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import StatusTag from '@/components/common/StatusTag.vue'
import { ProTable, ColumnSettings } from '@/components/common'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

// 优化：导入工具函数
import { ROLE_OPTIONS, STATUS_TAG_TYPE, getStatusText, getOptionLabel } from '@/constants/enums'
import { showSuccess, showError, confirmDelete, confirmBatchAction } from '@/utils/message'
import { applyDateRangeToParams } from '@/utils/dateRangeHelper'
import { extractListResponse } from '@/utils/apiResponse'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const userList = ref([])
const selectedUsers = ref([])
const selectAll = ref(false)
const isIndeterminate = ref(false)
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

// 所有可用的列配置
const allUserTableColumns = [
  {
    key: 'username',
    title: '用户名',
    slot: 'username',
    minWidth: 140,
    align: 'center'
  },
  {
    key: 'realName',
    title: '真实姓名',
    slot: 'realName',
    minWidth: 120,
    align: 'center'
  },
  {
    key: 'email',
    title: '邮箱',
    slot: 'email',
    minWidth: 180,
    align: 'center'
  },
  {
    key: 'phone',
    title: '电话',
    slot: 'phone',
    minWidth: 140,
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
    key: 'currentBorrows',
    title: '当前借阅',
    slot: 'currentBorrows',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'historyBorrows',
    title: '历史借阅',
    slot: 'historyBorrows',
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'points',
    title: '积分',
    slot: 'points',
    minWidth: 100,
    sorter: true,
    align: 'center'
  },
  {
    key: 'lastLogin',
    title: '最后登录',
    slot: 'lastLogin',
    minWidth: 140,
    sorter: true,
    align: 'center'
  },
  {
    key: 'registerTime',
    title: '注册时间',
    slot: 'createdTime',
    minWidth: 140,
    sorter: true,
    align: 'center'
  }
]

// 动态过滤的表格列配置（计算属性）
const userTableColumns = computed(() => {
  // 根据columnOptions的顺序和visibleColumns的选择来生成列
  const columnsMap = {}
  allUserTableColumns.forEach(col => {
    columnsMap[col.key] = col
  })
  
  // 按照columnOptions的顺序返回可见的列
  return columnOptions.value
    .filter(opt => visibleColumns.value.includes(opt.value))
    .map(opt => columnsMap[opt.value])
    .filter(Boolean)
})

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
    options: ROLE_OPTIONS  // 优化：使用统一的枚举常量
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

// 默认列设置配置
const defaultVisibleColumns = [
  'username',
  'realName',
  'email',
  'phone',
  'role',
  'status',
  'currentBorrows',
  'historyBorrows',
  'points',
  'lastLogin',
  'registerTime'
]

const defaultColumnOptions = [
  { label: '用户名', value: 'username', required: true },
  { label: '真实姓名', value: 'realName' },
  { label: '邮箱', value: 'email' },
  { label: '电话', value: 'phone' },
  { label: '角色', value: 'role' },
  { label: '状态', value: 'status' },
  { label: '当前借阅', value: 'currentBorrows' },
  { label: '历史借阅', value: 'historyBorrows' },
  { label: '积分', value: 'points' },
  { label: '最后登录', value: 'lastLogin' },
  { label: '注册时间', value: 'registerTime' }
]

// 使用统一的列设置 composable
const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('user', defaultVisibleColumns, defaultColumnOptions)

// 使用表格高度管理 composable
const tableHeightConfig = getTableHeightPreset('standard', {
  headerOffset: 200, // 搜索区域 + 工具栏
  footerOffset: 80   // 分页区域
})
const { finalTableHeight } = useTableHeight(tableHeightConfig)

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

// 优化：删除重复的辅助函数，使用导入的 getEnumStatusText 和 ROLE_OPTIONS
// getRoleText, getRoleTagType, getStatusText 已删除，改用工具函数

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

    if (Array.isArray(params.dateRange) && params.dateRange.length === 2) {
      const [start, end] = params.dateRange
      const startFormatted = formatDate(start)
      const endFormatted = formatDate(end)
      if (startFormatted) {
        params.startDate = startFormatted
      }
      if (endFormatted) {
        params.endDate = endFormatted
      }
    }

    delete params.dateRange

    const response = await userApi.getUsers(params)

    if (response && response.data !== undefined) {
      const payload = response?.data && typeof response.data === 'object' ? response.data : {}
      const list = Array.isArray(payload.list)
        ? payload.list
        : Array.isArray(response?.data)
          ? response.data
          : []
      userList.value = list
      if (typeof payload.total === 'number') {
        pagination.total = payload.total
      } else if (typeof response.total === 'number') {
        pagination.total = response.total
      } else if (response.pagination) {
        pagination.total = response.pagination.total || 0
      } else {
        pagination.total = list.length
      }

      if (typeof payload.page === 'number') {
        pagination.page = payload.page
      } else if (typeof response.page === 'number') {
        pagination.page = response.page
      }

      if (typeof payload.pageSize === 'number') {
        pagination.pageSize = payload.pageSize
      } else if (typeof response.pageSize === 'number') {
        pagination.pageSize = response.pageSize
      }

      if (typeof payload.page === 'number') {
        pagination.page = payload.page
      }
      if (typeof payload.pageSize === 'number') {
        pagination.pageSize = payload.pageSize
      }
    } else {
      throw new Error('Invalid response data')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    const message = error.message || '获取用户列表失败'
    message.error(message)

    // 如果是API不可用，显示空状态而不是错误
    if (error.message === 'User API is not available') {
      userList.value = []
      pagination.total = 0
    }
  } finally {
    loading.value = false
  }
}

// ProTable数据请求函数 - 优化：使用工具函数简化
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

    // 优化：使用 applyDateRangeToParams 处理日期范围（减少15行）
    applyDateRangeToParams(requestParams)

    const response = await userApi.getUsers(requestParams)
    const meta = extractListResponse(response)
    const list = Array.isArray(meta.list) ? meta.list : []
    const total = typeof meta.total === 'number' ? meta.total : list.length
    const currentPage = typeof meta.page === 'number' && Number.isFinite(meta.page) ? meta.page : requestParams.page
    const size = typeof meta.pageSize === 'number' && Number.isFinite(meta.pageSize) ? meta.pageSize : requestParams.limit

    return {
      success: true,
      data: list,
      total,
      current: currentPage,
      pageSize: size
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
    router.push('/system/users/create')
  } catch (error) {
    console.error('Navigation to create user failed:', error)
    message.error('导航失败，请刷新页面后重试')
  }
}

const handleView = user => {
  router.push(`/system/users/detail/${user.id}`)
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
    message.error('导航失败，请刷新页面后重试')
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

// 优化：使用 confirmDelete + showSuccess/showError
const handleResetPassword = async user => {
  try {
    const confirmed = await confirmDelete(1, '用户密码', `确定要重置用户"${user.username}"的密码吗？新密码将通过邮件发送给用户。`)
    if (!confirmed) return

    await userApi.resetPassword(user.id)
    showSuccess('密码重置成功')
  } catch (error) {
    console.error('重置密码失败:', error)
    showError(error.message || '重置密码失败')
  }
}

// 优化：使用 confirmDelete + showSuccess/showError
const handleToggleStatus = async user => {
  try {
    const action = user.status === 'active' ? '禁用' : '启用'
    const confirmed = await confirmDelete(1, '用户状态', `确定要${action}用户"${user.username}"吗？`)
    if (!confirmed) return

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await userApi.updateUser(user.id, { status: newStatus })

    user.status = newStatus
    showSuccess(`用户${action}成功`)
  } catch (error) {
    console.error('更新用户状态失败:', error)
    showError(error.message || '更新用户状态失败')
  }
}

// 优化：使用 confirmDelete + showSuccess/showError（减少8行）
const handleDelete = async user => {
  try {
    const confirmed = await confirmDelete(1, '用户', `确定要删除用户"${user.username}"吗？`)
    if (!confirmed) return

    await userApi.deleteUser(user.id)
    showSuccess('用户删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('删除用户失败:', error)
    showError(error.message || '删除用户失败')
  }
}

// ProTable批量操作处理函数 - 优化：使用 confirmBatchAction（减少8行）
const handleBatchDeleteFromTable = async (selectedRows) => {
  try {
    const confirmed = await confirmBatchAction(selectedRows.length, '删除', '用户')
    if (!confirmed) return

    const userIds = selectedRows.map(user => user.id)
    await userApi.batchDeleteUsers(userIds)

    showSuccess('批量删除成功')
    proTableRef.value?.refresh()
  } catch (error) {
    console.error('批量删除失败:', error)
    showError(error.message || '批量删除失败')
  }
}

const handleBatchToggleStatusFromTable = async (selectedRows) => {
  if (selectedRows.length === 0) {
    message.warning('请选择要切换状态的用户')
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

    message.success('批量状态切换成功')
    proTableRef.value?.refresh()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量状态切换失败:', error)
      message.error('批量状态切换失败')
    }
  }
}

const handleImport = () => {
  ElMessage.info('批量导入功能开发中...')
}

const handleRefresh = () => {
  proTableRef.value?.refresh()
}

const handleExport = async () => {
  try {
    exportLoading.value = true
    const params = { ...searchForm }

    // 优化：使用 applyDateRangeToParams 处理日期范围（减少15行）
    applyDateRangeToParams(params)

    const blob = await userApi.exportUsers(params)

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `用户数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    message.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败')
  } finally {
    exportLoading.value = false
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
  margin-bottom: 20px;
}

.search-card {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 20px 20px;
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
        padding: 0 20px 20px 20px !important;
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
  padding: 20px 20px;
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

.username-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;

  .user-avatar {
    flex-shrink: 0;
  }

  .username {
    font-weight: 500;
  }
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
  padding: 20px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
}

// 列设置对话框样式
.column-settings-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.column-settings-list {
  display: flex;
  flex-direction: column;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.2s;
  cursor: move;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.is-disabled {
    cursor: default;
    background: #fafafa;
  }
  
  &[draggable="true"]:active {
    background: #ecf5ff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    z-index: 10;
    position: relative;
  }
}

.drag-handle {
  margin-right: 12px;
  color: #c0c4cc;
  cursor: move;
  font-size: 14px;
  
  &:hover {
    color: #909399;
  }
}

.drag-handle-placeholder {
  width: 26px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;
  
  .el-button {
    padding: 4px;
    background: transparent;
    border-color: #dcdfe6;
    
    &:hover:not(:disabled) {
      background: #f5f7fa;
      border-color: #c0c4cc;
      color: #409eff;
    }
    
    &:disabled {
      opacity: 0.4;
    }
  }
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

  .username-info {
    .username {
      font-size: 14px;
    }
  }

  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
