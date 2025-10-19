<template>
  <div class="book-tag-page">
    <SearchFilterSimple
      v-model="searchForm"
      :fields="searchFields"
      :loading="loading"
      :collapsible="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card shadow="never" class="tag-card">
      <ProTable
        ref="proTableRef"
        :request="requestTags"
        :columns="tagTableColumns"
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
        @create="openCreateDialog"
      >
        <template #color="{ record }">
          <div class="color-cell" v-if="record.color">
            <span class="color-preview" :style="{ backgroundColor: record.color }" />
            <span>{{ record.color }}</span>
          </div>
          <span v-else>—</span>
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
                新增标签
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="form.name" placeholder="输入标签名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="标签编码" prop="code">
          <el-input v-model="form.code" placeholder="输入唯一编码" maxlength="50" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-input v-model="form.color" placeholder="例如 #409EFF 或 red" maxlength="20" />
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
import { showError, confirmDelete, notifySuccess } from '@/utils/message'
import { Refresh, Setting } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { bookTagApi } from '@/api/bookTag'
import SearchFilterSimple from '@/components/common/SearchFilterSimple.tsx'
import { ProTable, ColumnSettings } from '@/components/common'
import { useColumnSettings } from '@/composables/useColumnSettings'
import { useTableHeight, getTableHeightPreset } from '@/composables/useTableHeight'
import { useTableRequest } from '@/composables/useTableRequest'

const proTableRef = ref()

const defaultSearchForm = Object.freeze({
  keyword: '',
  isActive: ''
})

const searchFields = [
  {
    name: 'keyword',
    label: '关键词',
    valueType: 'text',
    placeholder: '输入标签名称或编码',
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

const {
  searchForm,
  loading,
  request: requestTags,
  reload: reloadTags
} = useTableRequest((params) => bookTagApi.getTags(params), {
  defaultSearch: defaultSearchForm,
  defaultPageSize: 10,
  manual: true,
  immediate: false,
  formatParams: ({ search, page, pageSize, sorter }) => {
    const filters = {}
    const keyword = typeof search.keyword === 'string' ? search.keyword.trim() : ''
    if (keyword) {
      filters.keyword = keyword
    }
    if (search.isActive !== '' && search.isActive !== null && search.isActive !== undefined) {
      filters.isActive = search.isActive
    }
    const query = {
      page,
      size: pageSize,
      ...filters
    }
    if (sorter?.field) {
      query.sortBy = sorter.field
      query.sortOrder = sorter.order && String(sorter.order).includes('asc') ? 'asc' : 'desc'
    }
    return query
  }
})

const defaultVisibleColumns = [
  'name',
  'code',
  'color',
  'description',
  'sortOrder',
  'status',
  'updatedAt'
]

const defaultColumnOptions = [
  { label: '标签名称', value: 'name', required: true },
  { label: '编码', value: 'code' },
  { label: '颜色', value: 'color' },
  { label: '描述', value: 'description' },
  { label: '排序', value: 'sortOrder' },
  { label: '状态', value: 'status' },
  { label: '更新时间', value: 'updatedAt' }
]

const {
  visibleColumns,
  columnOptions,
  showColumnSettings,
  handleApplyFromComponent,
  openColumnSettings
} = useColumnSettings('book-tag', defaultVisibleColumns, defaultColumnOptions)

const allColumns = [
  {
    key: 'name',
    title: '标签名称',
    dataIndex: 'name',
    minWidth: 160
  },
  {
    key: 'code',
    title: '编码',
    dataIndex: 'code',
    minWidth: 140
  },
  {
    key: 'color',
    title: '颜色',
    slot: 'color',
    minWidth: 160
  },
  {
    key: 'description',
    title: '描述',
    dataIndex: 'description',
    minWidth: 200
  },
  {
    key: 'sortOrder',
    title: '排序',
    dataIndex: 'sortOrder',
    width: 100,
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

const tagTableColumns = computed(() => {
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

const handleSearch = (criteria = {}) => {
  Object.assign(searchForm, criteria)
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
    return
  }
  reloadTags({ page: 1 })
}

const handleReset = () => {
  Object.assign(searchForm, { ...defaultSearchForm })
  if (proTableRef.value?.reload) {
    proTableRef.value.reload(true)
    return
  }
  reloadTags({ page: 1 })
}

const refreshTable = () => {
  if (proTableRef.value?.reload) {
    proTableRef.value.reload()
    return
  }
  reloadTags()
}

const dialog = reactive({
  visible: false,
  title: '新增标签',
  submitting: false,
  mode: 'create'
})

const formRef = ref()
const form = reactive({
  id: null,
  name: '',
  code: '',
  color: '',
  sortOrder: 0,
  isActive: true,
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度需在 1-50 字之间', trigger: 'blur' }
  ],
  code: [
    { max: 50, message: '编码长度不超过 50 字符', trigger: 'blur' }
  ],
  color: [
    { max: 20, message: '颜色值不超过 20 字符', trigger: 'blur' }
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
    color: '',
    sortOrder: 0,
    isActive: true,
    description: ''
  })
  formRef.value?.clearValidate?.()
}

const openCreateDialog = () => {
  dialog.mode = 'create'
  dialog.title = '新增标签'
  resetForm()
  dialog.visible = true
}

const openEditDialog = (row) => {
  dialog.mode = 'edit'
  dialog.title = '编辑标签'
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    color: row.color || '',
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive,
    description: row.description || ''
  })
  dialog.visible = true
}

const buildPayload = () => ({
  name: form.name,
  code: form.code,
  color: form.color || null,
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
      await bookTagApi.createTag(payload)
      notifySuccess('新增标签成功', '操作成功')
    } else {
      await bookTagApi.updateTag(form.id, payload)
      notifySuccess('更新标签成功', '操作成功')
    }
    dialog.visible = false
    refreshTable()
  } catch (error) {
    console.error('保存标签失败:', error)
    showError('保存标签失败: ' + (error.message || '未知错误'))
  } finally {
    dialog.submitting = false
  }
}

const handleDelete = async (row) => {
  const confirmed = await confirmDelete(1, `标签"${row.name}"`)
  if (!confirmed) return

  try {
    await bookTagApi.deleteTag(row.id)
    notifySuccess('删除标签成功', '操作成功')
    refreshTable()
  } catch (error) {
    console.error('删除标签失败:', error)
    showError(error?.response?.data?.message || '删除失败，请检查标签是否仍被使用')
  }
}

const handleBatchDelete = async (rows) => {
  if (!rows || rows.length === 0) return

  const confirmed = await confirmDelete(rows.length, '标签')
  if (!confirmed) return

  try {
    await Promise.all(rows.map(item => bookTagApi.deleteTag(item.id)))
    notifySuccess('批量删除成功', '操作成功')
    refreshTable()
  } catch (error) {
    console.error('批量删除失败:', error)
    showError(error?.response?.data?.message || '批量删除失败')
  }
}

const toggleStatus = async (row) => {
  try {
    await bookTagApi.updateTag(row.id, {
      isActive: !row.isActive
    })
    notifySuccess('状态更新成功', '操作成功')
    refreshTable()
  } catch (error) {
    console.error('更新状态失败:', error)
    showError('更新状态失败')
  }
}

const handleColumnSettingsApply = (data) => {
  handleApplyFromComponent(data)
  proTableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.book-tag-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tag-card {
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

.color-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .color-preview {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
}
</style>
