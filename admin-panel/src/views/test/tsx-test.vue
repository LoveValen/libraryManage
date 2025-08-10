<template>
  <div class="tsx-test-container">
    <el-card header="TSX 组件测试页面">
      <div class="section">
        <h3>ProForm TSX 测试</h3>
        <ProForm
          :fields="formFields"
          :initialValues="formInitialValues"
          @submit="handleFormSubmit"
          @values-change="handleValuesChange"
        />
      </div>

      <el-divider />

      <div class="section">
        <h3>ProTable TSX 测试</h3>
        <ProTable
          ref="proTableRef"
          :request="loadTableData"
          :columns="tableColumns"
          :batch-actions="batchActions"
          :actions="rowActions"
          :row-selection="{ type: 'checkbox' }"
          row-key="id"
          @selection-change="handleSelectionChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ProForm, ProTable } from '@/components/common'

// ProForm 测试数据
const formFields = [
  {
    name: 'name',
    label: '姓名',
    valueType: 'text',
    required: true,
    placeholder: '请输入姓名'
  },
  {
    name: 'email',
    label: '邮箱',
    valueType: 'text',
    required: true,
    placeholder: '请输入邮箱'
  },
  {
    name: 'age',
    label: '年龄',
    valueType: 'number',
    min: 1,
    max: 120,
    placeholder: '请输入年龄'
  },
  {
    name: 'gender',
    label: '性别',
    valueType: 'radio',
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' }
    ]
  },
  {
    name: 'interests',
    label: '兴趣爱好',
    valueType: 'multipleSelect',
    options: [
      { label: '阅读', value: 'reading' },
      { label: '运动', value: 'sports' },
      { label: '音乐', value: 'music' },
      { label: '旅行', value: 'travel' }
    ]
  },
  {
    name: 'birthday',
    label: '生日',
    valueType: 'date'
  },
  {
    name: 'description',
    label: '个人描述',
    valueType: 'textarea',
    placeholder: '请输入个人描述'
  }
]

const formInitialValues = reactive({
  name: 'Test User',
  gender: 'male'
})

// ProTable 测试数据
const tableColumns = [
  {
    key: 'id',
    title: 'ID',
    width: 80,
    align: 'center'
  },
  {
    key: 'name',
    title: '姓名',
    minWidth: 120,
    search: true
  },
  {
    key: 'email',
    title: '邮箱',
    minWidth: 180,
    search: true
  },
  {
    key: 'age',
    title: '年龄',
    width: 80,
    align: 'center'
  },
  {
    key: 'status',
    title: '状态',
    width: 100,
    valueType: 'option',
    valueEnum: [
      { value: 'active', label: '活跃', type: 'success' },
      { value: 'inactive', label: '非活跃', type: 'danger' }
    ]
  },
  {
    key: 'createdAt',
    title: '创建时间',
    width: 160,
    valueType: 'dateTime'
  }
]

const batchActions = [
  {
    key: 'activate',
    text: '批量激活',
    type: 'success',
    onClick: (selectedRowKeys, selectedRows) => {
      ElMessage.success(`激活了 ${selectedRows.length} 个用户`)
    }
  },
  {
    key: 'deactivate',
    text: '批量禁用',
    type: 'danger',
    onClick: (selectedRowKeys, selectedRows) => {
      ElMessage.warning(`禁用了 ${selectedRows.length} 个用户`)
    }
  }
]

const rowActions = [
  {
    key: 'edit',
    text: '编辑',
    type: 'primary',
    onClick: (record) => {
      ElMessage.info(`编辑用户: ${record.name}`)
    }
  },
  {
    key: 'delete',
    text: '删除',
    type: 'danger',
    onClick: (record) => {
      ElMessage.error(`删除用户: ${record.name}`)
    }
  }
]

// 模拟数据加载
const loadTableData = async (params) => {
  console.log('请求参数:', params)
  
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const data = Array.from({ length: 20 }, (_, index) => ({
    id: params.current * 20 + index + 1,
    name: `用户${params.current * 20 + index + 1}`,
    email: `user${params.current * 20 + index + 1}@example.com`,
    age: 20 + Math.floor(Math.random() * 40),
    status: Math.random() > 0.5 ? 'active' : 'inactive',
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString()
  }))
  
  return {
    success: true,
    data,
    total: 200
  }
}

// 事件处理
const handleFormSubmit = (values) => {
  console.log('表单提交:', values)
  ElMessage.success('表单提交成功!')
}

const handleValuesChange = (changedValues, allValues) => {
  console.log('表单值变化:', changedValues, allValues)
}

const handleSelectionChange = (selectedRowKeys, selectedRows) => {
  console.log('选择变化:', selectedRowKeys, selectedRows)
}
</script>

<style lang="scss" scoped>
.tsx-test-container {
  padding: 20px;

  .section {
    margin-bottom: 20px;

    h3 {
      margin-bottom: 16px;
      color: var(--el-text-color-primary);
      font-weight: 500;
    }
  }
}
</style>