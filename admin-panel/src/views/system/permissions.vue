<template>
  <div class="page-card">
    <div class="page-header">
      <ElButton type="primary" @click="openCreate">新增权限</ElButton>
    </div>
    <ElTable :data="permissions" style="width: 100%">
      <ElTableColumn prop="code" label="编码" width="240" />
      <ElTableColumn prop="name" label="名称" width="200" />
      <ElTableColumn prop="group_name" label="分组" width="160" />
      <ElTableColumn prop="description" label="描述" />
      <ElTableColumn label="操作" width="200">
        <template #default="{ row }">
          <ElButton type="primary" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="danger" link @click="remove(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog v-model="dialogVisible" :title="form.id ? '编辑权限' : '新增权限'" width="600px">
      <ElForm :model="form" label-width="90px">
        <ElFormItem label="编码"><ElInput v-model="form.code" :disabled="!!form.id" /></ElFormItem>
        <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="分组"><ElInput v-model="form.group_name" /></ElFormItem>
        <ElFormItem label="描述"><ElInput type="textarea" v-model="form.description" /></ElFormItem>
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
import { listPermissions, createPermission, updatePermission, deletePermission } from '@/api/permissions'

const permissions = ref([])
const dialogVisible = ref(false)
const form = ref({ id: null, code: '', name: '', group_name: '', description: '' })

const load = async () => {
  const res = await listPermissions()
  permissions.value = res.data
}

const openCreate = () => {
  form.value = { id: null, code: '', name: '', group_name: '', description: '' }
  dialogVisible.value = true
}

const openEdit = (row) => {
  form.value = { id: row.id, code: row.code, name: row.name, group_name: row.group_name, description: row.description }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.value.code || !form.value.name) {
    ElMessage.warning('请填写编码与名称')
    return
  }
  if (form.value.id) {
    await updatePermission(form.value.id, form.value)
    ElMessage.success('更新成功')
  } else {
    await createPermission(form.value)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  await load()
}

const remove = async (row) => {
  await ElMessageBox.confirm(`确定删除权限「${row.code}」吗？`, '提示', { type: 'warning' })
  await deletePermission(row.id)
  ElMessage.success('删除成功')
  await load()
}

onMounted(load)
</script>

<style scoped>
.page-card { background: #fff; padding: 16px; border-radius: 8px; }
.page-header { margin-bottom: 12px; display: flex; justify-content: flex-end; }
</style>


