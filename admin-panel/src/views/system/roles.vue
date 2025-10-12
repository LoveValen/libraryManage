<template>
  <div class="page-card">
    <div class="page-header">
      <ElButton type="primary" @click="openCreate">新增角色</ElButton>
    </div>
    <ElTable :data="roles" style="width: 100%">
      <ElTableColumn prop="code" label="编码" width="180" />
      <ElTableColumn prop="name" label="名称" width="200" />
      <ElTableColumn prop="description" label="描述" />
      <ElTableColumn prop="is_system" label="类型" width="100">
        <template #default="{ row }">
          <ElTag size="small" :type="row.is_system ? 'warning' : 'success'">
            {{ row.is_system ? '系统' : '自定义' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="权限代码" min-width="260">
        <template #default="{ row }">
          <div class="permission-list">
            <ElTag
              v-for="code in (row.permissionCodes || [])"
              :key="code"
              size="small"
              effect="plain"
            >
              {{ code }}
            </ElTag>
            <span v-if="!row.permissionCodes || row.permissionCodes.length === 0">-</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="240">
        <template #default="{ row }">
          <template v-if="row.is_system">
            <ElTooltip content="系统角色禁止修改">
              <span>
                <ElButton type="primary" link disabled>编辑</ElButton>
              </span>
            </ElTooltip>
            <ElTooltip content="系统角色禁止删除">
              <span>
                <ElButton type="danger" link disabled>删除</ElButton>
              </span>
            </ElTooltip>
          </template>
          <template v-else>
            <ElButton type="primary" link @click="openEdit(row)">编辑</ElButton>
            <ElButton type="danger" link @click="remove(row)">删除</ElButton>
          </template>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog v-model="dialogVisible" :title="form.id ? '编辑角色' : '新增角色'" width="600px">
      <ElForm :model="form" label-width="90px">
        <ElFormItem label="编码"><ElInput v-model="form.code" :disabled="!!form.id" /></ElFormItem>
        <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="描述"><ElInput type="textarea" v-model="form.description" /></ElFormItem>
        <ElFormItem label="系统角色">
          <ElSwitch
            v-model="form.is_system"
            :disabled="!!form.id && form.is_system"
            active-text="是"
            inactive-text="否"
          />
        </ElFormItem>
        <ElFormItem label="权限">
          <ElSelect v-model="form.permissionIds" multiple filterable style="width:100%">
            <ElOption v-for="p in permissions" :key="p.id" :label="p.code + ' - ' + p.name" :value="p.id" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="save">保存</ElButton>
      </template>
    </ElDialog>
  </div>
  
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRoles, createRole, updateRole, deleteRole } from '@/api/roles'
import { listPermissions } from '@/api/permissions'

const roles = ref([])
const permissions = ref([])
const dialogVisible = ref(false)
const form = ref({ id: null, code: '', name: '', description: '', is_system: false, permissionIds: [] })

const load = async () => {
  const [r, p] = await Promise.all([listRoles(), listPermissions()])
  roles.value = r.data
  permissions.value = p.data
}

const openCreate = () => {
  form.value = { id: null, code: '', name: '', description: '', is_system: false, permissionIds: [] }
  dialogVisible.value = true
}

const openEdit = (row) => {
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
  const payload = { ...form.value }
  if (!payload.name || !payload.code) {
    ElMessage.warning('请填写编码与名称')
    return
  }

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
    ElMessage.success('更新成功')
  } else {
    await createRole(payload)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  await load()
}

const remove = async (row) => {
  if (row.is_system) {
    ElMessage.warning('系统角色禁止删除')
    return
  }
  await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, '提示', { type: 'warning' })
  await deleteRole(row.id)
  ElMessage.success('删除成功')
  await load()
}

onMounted(load)
</script>

<style scoped>
.page-card { background: #fff; padding: 16px; border-radius: 8px; }
.page-header { margin-bottom: 12px; display: flex; justify-content: flex-end; }
.permission-list { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.permission-list span { color: #999; font-size: 12px; }
</style>


