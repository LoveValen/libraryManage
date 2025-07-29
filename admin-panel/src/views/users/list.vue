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
        <!-- 表格工具栏 -->
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-button type="danger" :disabled="selectedUsers.length === 0" @click="handleBatchDelete">
              删除
            </el-button>
            <el-button
              type="warning"
              :disabled="selectedUsers.length === 0"
              @click="handleBatchToggleStatus"
            >
              启用/禁用
            </el-button>
          </div>
          <div class="toolbar-right">
            <el-tooltip content="刷新数据">
              <el-button icon="Refresh" @click="fetchUsers" :loading="loading" />
            </el-tooltip>
            <el-tooltip content="列设置">
              <el-button icon="Setting" @click="showColumnSettings = true" />
            </el-tooltip>
          </div>
        </div>

        <!-- 数据表格 -->
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="userList"
          stripe
          border
          height="600"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <el-table-column type="selection" width="50" fixed="left" />
          <el-table-column label="序号" type="index" width="60" fixed="left" />

          <el-table-column label="用户信息" min-width="200" fixed="left">
            <template #default="{ row }">
              <div class="user-info">
                <el-avatar :size="40" :src="row.avatar" class="user-avatar">
                  <el-icon><User /></el-icon>
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ row.username }}</div>
                  <div class="user-real-name">{{ row.realName || '-' }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="联系方式" min-width="180">
            <template #default="{ row }">
              <div class="contact-info">
                <div class="contact-item">
                  <el-icon><Message /></el-icon>
                  <span>{{ row.email || '-' }}</span>
                </div>
                <div class="contact-item">
                  <el-icon><Phone /></el-icon>
                  <span>{{ row.phone || '-' }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="角色" width="100" sortable="custom" prop="role">
            <template #default="{ row }">
              <StatusTag
                :status="row.role"
                :text="getRoleText(row.role)"
                :type="getRoleTagType(row.role)"
                size="small"
              />
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100" sortable="custom" prop="status">
            <template #default="{ row }">
              <StatusTag :status="row.status" :preset="'user'" size="small" />
            </template>
          </el-table-column>

          <el-table-column label="借阅统计" width="120">
            <template #default="{ row }">
              <div class="borrow-stats">
                <div class="stat-item">
                  <span class="stat-label">当前:</span>
                  <span class="stat-value">{{ row.currentBorrows || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">历史:</span>
                  <span class="stat-value">{{ row.totalBorrows || 0 }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="积分" width="80" sortable="custom" prop="points">
            <template #default="{ row }">
              <span class="points-value">{{ row.points?.balance || row.pointsBalance || 0 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="最后登录" width="160" sortable="custom" prop="lastLoginAt">
            <template #default="{ row }">
              <div class="time-info">
                <div>{{ formatDate(row.lastLoginAt) }}</div>
                <div class="time-ago">{{ formatTimeAgo(row.lastLoginAt) }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="注册时间" width="160" sortable="custom" prop="createdAt">
            <template #default="{ row }">
              <div class="time-info">
                <div>{{ formatDate(row.createdAt) }}</div>
                <div class="time-ago">{{ formatTimeAgo(row.createdAt) }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" link size="small" @click="handleView(row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button type="success" link size="small" @click="handleEdit(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-dropdown @command="command => handleAction(command, row)">
                  <el-button type="info" link size="small">
                    更多
                    <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="resetPassword">
                        <el-icon><Key /></el-icon>
                        重置密码
                      </el-dropdown-item>
                      <el-dropdown-item command="toggleStatus">
                        <el-icon><Switch /></el-icon>
                        {{ row.status === 'active' ? '禁用' : '启用' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="viewBorrows">
                        <el-icon><Reading /></el-icon>
                        借阅记录
                      </el-dropdown-item>
                      <el-dropdown-item command="viewPoints">
                        <el-icon><TrophyBase /></el-icon>
                        积分记录
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <el-icon><Delete /></el-icon>
                        删除用户
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
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
import { userApi } from '@/api/user'
import { formatDate, formatTimeAgo } from '@/utils/date'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.vue'
import StatusTag from '@/components/common/StatusTag.vue'

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


// 搜索字段配置
const searchFields = [
  {
    type: 'input',
    key: 'keyword',
    label: '关键词',
    placeholder: '请输入用户名、真实姓名或邮箱',
    clearable: true
  },
  {
    type: 'select',
    key: 'role',
    label: '用户角色',
    placeholder: '请选择角色',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '图书管理员', value: 'librarian' },
      { label: '普通用户', value: 'user' }
    ]
  },
  {
    type: 'select',
    key: 'status',
    label: '账户状态',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' }
    ]
  },
  {
    type: 'date',
    key: 'dateRange',
    label: '注册时间',
    placeholder: ['开始时间', '结束时间'],
    dateType: 'daterange'
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

    const { data } = await userApi.getUsers(params)

    if (data) {
      userList.value = data.users || []
      pagination.total = data.total || 0

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


const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    role: '',
    status: '',
    dateRange: null
  })
  pagination.page = 1
  fetchUsers()
}

const handleSizeChange = size => {
  pagination.size = size
  pagination.page = 1
  fetchUsers()
}

const handlePageChange = page => {
  pagination.page = page
  fetchUsers()
}

const handleSortChange = ({ prop, order }) => {
  sortInfo.prop = prop
  sortInfo.order = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
  fetchUsers()
}

const handleSelectionChange = selection => {
  selectedUsers.value = selection
  const selectedCount = selection.length
  const totalCount = userList.value.length

  selectAll.value = selectedCount === totalCount && totalCount > 0
  isIndeterminate.value = selectedCount > 0 && selectedCount < totalCount
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
    fetchUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可撤销！`,
      '批量删除',
      { type: 'warning' }
    )

    const userIds = selectedUsers.value.map(user => user.id)
    await userApi.batchDeleteUsers(userIds)

    ElMessage.success('批量删除成功')
    fetchUsers()
    tableRef.value.clearSelection()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const handleBatchToggleStatus = async () => {
  try {
    const { value: action } = await ElMessageBox.prompt(
      `选择要对选中的 ${selectedUsers.value.length} 个用户执行的操作：`,
      '批量操作',
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

    const userIds = selectedUsers.value.map(user => user.id)
    await userApi.batchUpdateStatus(userIds, action)

    ElMessage.success('批量操作成功')
    fetchUsers()
    tableRef.value.clearSelection()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量操作失败:', error)
      ElMessage.error('批量操作失败')
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
  fetchUsers()
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
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}


.table-section {
  .table-card {
    :deep(.el-card__body) {
      padding: 0;
    }
  }
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
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
  .contact-item {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--el-text-color-regular);

    &:last-child {
      margin-bottom: 0;
    }

    .el-icon {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.borrow-stats {
  .stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 12px;

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
  .time-ago {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  padding: 16px 20px;
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
