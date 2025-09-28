<template>
  <div class="book-location-page">
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card shadow="never" class="location-card">
      <ProTable
        ref="proTableRef"
        :request="requestLocations"
        :columns="locationTableColumns"
        :actions="rowActions"
        :batch-actions="batchActions"
        :row-selection="{ type: 'checkbox' }"
        :toolBar="toolBarConfig"
        :action-column="{ width: 200, fixed: 'right', align: 'center' }"
        :max-height="finalTableHeight"
        row-key="id"
        :search="false"
        stripe
        border
        @create="openCreateDialog"      >
        <template #capacity="{ record }">
          <span>{{ record.capacity ?? '—' }}</span>
        </template>

        <template #status="{ record }">
          <el-tag :type="record.isActive ? 'success' : 'info'">
            {{ record.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>

        <template #updatedAt="{ record }">
          {{ formatTime(record.updatedAt) }}
        </template>

        <template #toolBarRender="{ selectedRowKeys, selectedRows }">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <el-button type="primary" @click="openCreateDialog">
                新增位置
              </el-button>
              <el-button
                type="danger"
                :disabled="selectedRowKeys.length === 0"
                @click="handleBatchDelete(selectedRows)"
              >
                批量删除
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-tooltip content="刷新数据" placement="top">
                <el-button :icon="Refresh" @click="refreshTable" :loading="loading" />
              </el-tooltip>
              <el-tooltip content="列设置" placement="top">
                <el-button :icon="Setting" @click="openColumnSettings" />
              </el-tooltip>
            </div>
          </div>
        </template>
      </ProTable>
    </el-card>

    <ColumnSettings
      v-model="showColumnSettings"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :default-column-options="defaultColumnOptions"
      :default-visible-columns="defaultVisibleColumns"
      @apply="handleColumnSettingsApply"
    />

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="位置名称" prop="name">
          <el-input v-model="form.name" placeholder="输入存放位置名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" placeholder="输入唯一编码" maxlength="50" />
        </el-form-item>
        <el-form-item label="区域" prop="area">
          <el-input v-model="form.area" placeholder="输入区域描述" maxlength="100" />
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-input v-model="form.floor" placeholder="例如 1F/2F" maxlength="50" />
        </el-form-item>
        <el-form-item label="书架" prop="shelf">
          <el-input v-model="form.shelf" placeholder="书架编号或路径" maxlength="50" />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" rows="3" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Refresh, Setting } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { bookLocationApi } from '@/api/bookLocation'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import { ProTable, ColumnSettings } from '@/components/common'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'

const loading = ref(false)
const proTableRef = ref()

const defaultSearchCriteria = Object.freeze({
  keyword: '',
  isActive: ''
})
const searchForm = reactive({ ...defaultSearchCriteria })

const searchFields = [
  {
    name: 'keyword',
    label: '关键词',
    valueType: 'text',
    placeholder: '输入名称或编码搜索',
    clearable: true
  },
  {
    name: 'isActive',
    label: '状态',
    valueType: 'select',
    placeholder: '选择状态',
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: true },
      { label: '停用', value: false }
    ]
  }
]

// 合并搜索条件时补齐缺失字段，确保请求参数与界面同步
const applySearchCriteria = (criteria = {}) => {
  const merged = { ...defaultSearchCriteria, ...criteria }
  Object.keys(searchForm).forEach(key => {
    if (!(key in merged)) {
      delete searchForm[key]
    }
  })
  Object.entries(merged).forEach(([key, value]) => {
    searchForm[key] = value
  })
  return merged
}

const buildSearchParams = () => {
  const params = {}
  const keyword = typeof searchForm.keyword === 'string' ? searchForm.keyword.trim() : ''
  if (keyword) {
    params.keyword = keyword
  }
  if (searchForm.isActive !== '' && searchForm.isActive !== null && searchForm.isActive !== undefined) {
    params.isActive = searchForm.isActive
  }
  return params
}

const defaultVisibleColumns = [
  'name',
  'code',
  'area',
  'floor',
  'shelf',
  'capacity',
  'status',
  'updatedAt'
]

const defaultColumnOptions = [
  { label: '位置名称', value: 'name', required: true },
  { label: '编码', value: 'code' },
  { label: '区域', value: 'area' },
  { label: '楼层', value: 'floor' },
  { label: '书架', value: 'shelf' },
  { label: '容量', value: 'capacity' },
  { label: '状态', value: 'status' },
  { label: '更新时间', value: 'updatedAt' }
]

const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('book-location', defaultVisibleColumns, defaultColumnOptions)

const allColumns = [
  {
    key: 'name',
    title: '位置名称',
    dataIndex: 'name',
    minWidth: 160
  },
  {
    key: 'code',
    title: '编码',
    dataIndex: 'code',
    minWidth: 120
  },
  {
    key: 'area',
    title: '区域',
    dataIndex: 'area',
    minWidth: 140
  },
  {
    key: 'floor',
    title: '楼层',
    dataIndex: 'floor',
    minWidth: 120
  },
  {
    key: 'shelf',
    title: '书架',
    dataIndex: 'shelf',
    minWidth: 140
  },
  {
    key: 'capacity',
    title: '容量',
    slot: 'capacity',
    width: 120,
    align: 'center'
  },
  {
    key: 'status',
    title: '状态',
    slot: 'status',
    width: 120,
    align: 'center'
  },
  {
    key: 'updatedAt',
    title: '更新时间',
    slot: 'updatedAt',
    minWidth: 180,
    align: 'center'
  }
]

const locationTableColumns = computed(() => {
  const map = {}
  allColumns.forEach(column => {
    map[column.key] = column
  })
  return columnOptions.value
    .filter(option => visibleColumns.value.includes(option.value))
    .map(option => map[option.value])
    .filter(Boolean)
})

const toolBarConfig = {
  create: false,
  reload: false,
  density: true,
  columnSetting: false,
  fullScreen: true
}

const batchActions = [
  {
    key: 'batchDelete',
    text: '批量删除',
    type: 'danger',
    onClick: (selectedRowKeys, rows) => handleBatchDelete(rows)
  }
]

const rowActions = [
  {
    key: 'edit',
    text: '编辑',
    type: 'text',
    onClick: record => openEditDialog(record)
  },
  {
    key: 'toggle',
    text: '切换状态',
    type: 'text',
    onClick: record => toggleStatus(record)
  },
  {
    key: 'delete',
    text: '删除',
    type: 'text',
    onClick: record => handleDelete(record)
  }
]

const tableHeightPreset = getTableHeightPreset('standard', {
  headerOffset: 200,
  footerOffset: 60
})
const { finalTableHeight } = useTableHeight(tableHeightPreset)

const requestLocations = async (params) => {
  const { current = 1, pageSize = 10 } = params
  const requestParams = {
    page: current,
    size: pageSize,
    ...buildSearchParams()
  }

  try {
    loading.value = true
    const { data } = await bookLocationApi.getLocations(requestParams)
    const list = data?.locations || []
    const total = data?.total || 0
    return {
      success: true,
      data: list,
      total
    }
  } catch (error) {
    console.error('获取存放位置失败:', error)
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || '数据加载失败'
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = (criteria = {}) => {
  applySearchCriteria(criteria)
  proTableRef.value?.reload?.(true) ?? proTableRef.value?.refresh?.({ current: 1 })
}

const handleReset = (criteria = {}) => {
  applySearchCriteria(criteria)
  proTableRef.value?.reload?.(true) ?? proTableRef.value?.refresh?.({ current: 1 })
}

const refreshTable = () => {
  proTableRef.value?.reload?.() ?? proTableRef.value?.refresh?.()
}

const dialog = reactive({
  visible: false,
  title: '新增位置',
  submitting: false,
  mode: 'create'
})

const formRef = ref()
const form = reactive({
  id: null,
  name: '',
  code: '',
  area: '',
  floor: '',
  shelf: '',
  capacity: null,
  sortOrder: 0,
  isActive: true,
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入位置名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度需在 1-100 字之间', trigger: 'blur' }
  ],
  code: [
    { max: 50, message: '编码长度不超过 50 字符', trigger: 'blur' }
  ],
  area: [
    { max: 100, message: '区域长度不超过 100 字符', trigger: 'blur' }
  ],
  floor: [
    { max: 50, message: '楼层长度不超过 50 字符', trigger: 'blur' }
  ],
  shelf: [
    { max: 50, message: '书架长度不超过 50 字符', trigger: 'blur' }
  ]
}

const formatTime = (value) => {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value
}

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    code: '',
    area: '',
    floor: '',
    shelf: '',
    capacity: null,
    sortOrder: 0,
    isActive: true,
    description: ''
  })
  formRef.value?.clearValidate?.()
}

const openCreateDialog = () => {
  dialog.mode = 'create'
  dialog.title = '新增位置'
  resetForm()
  dialog.visible = true
}

const openEditDialog = (row) => {
  dialog.mode = 'edit'
  dialog.title = '编辑位置'
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    area: row.area || '',
    floor: row.floor || '',
    shelf: row.shelf || '',
    capacity: row.capacity ?? null,
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive,
    description: row.description || ''
  })
  dialog.visible = true
}

const buildPayload = () => ({
  name: form.name,
  code: form.code,
  area: form.area || null,
  floor: form.floor || null,
  shelf: form.shelf || null,
  capacity: form.capacity ?? null,
  sortOrder: form.sortOrder ?? 0,
  isActive: form.isActive,
  description: form.description || null
})

const handleSubmit = async () => {
  await formRef.value?.validate()
  dialog.submitting = true
  try {
    const payload = buildPayload()
    if (dialog.mode === 'create') {
      await bookLocationApi.createLocation(payload)
      ElNotification.success({ title: '操作成功', message: '新增位置成功' })
    } else {
      await bookLocationApi.updateLocation(form.id, payload)
      ElNotification.success({ title: '操作成功', message: '更新位置成功' })
    }
    dialog.visible = false
    refreshTable()
  } catch (error) {
    console.error('保存位置失败:', error)
    ElMessage.error('保存位置失败: ' + (error.message || '未知错误'))
  } finally {
    dialog.submitting = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除位置“${row.name}”吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await bookLocationApi.deleteLocation(row.id)
      ElNotification.success({ title: '操作成功', message: '删除位置成功' })
      refreshTable()
    } catch (error) {
      console.error('删除位置失败:', error)
      ElMessage.error(error?.response?.data?.message || '删除失败，请检查该位置下是否仍有关联图书')
    }
  }).catch(() => {})
}

const handleBatchDelete = (rows) => {
  if (!rows || rows.length === 0) return
  ElMessageBox.confirm(`确定删除选中的 ${rows.length} 个位置吗？`, '批量删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await Promise.all(rows.map(item => bookLocationApi.deleteLocation(item.id)))
      ElNotification.success({ title: '操作成功', message: '批量删除成功' })
      refreshTable()
    } catch (error) {
      console.error('批量删除失败:', error)
      ElMessage.error(error?.response?.data?.message || '批量删除失败')
    }
  }).catch(() => {})
}

const toggleStatus = async (row) => {
  try {
    await bookLocationApi.updateLocation(row.id, {
      isActive: !row.isActive
    })
    ElNotification.success({ title: '操作成功', message: '状态更新成功' })
    refreshTable()
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
  }
}

const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  proTableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.book-location-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-card {
  :deep(.el-card__body) {
    padding: 0;
  }
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
