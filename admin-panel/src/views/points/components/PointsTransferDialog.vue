<template>
  <el-dialog v-model="visible" title="积分转移" width="600px" :before-close="handleClose">
    <div class="points-transfer-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="转出用户" prop="fromUserId">
          <el-select v-model="form.fromUserId" placeholder="请选择转出用户" filterable>
            <el-option 
              v-for="user in users" 
              :key="user.id" 
              :label="user.username" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转入用户" prop="toUserId">
          <el-select v-model="form.toUserId" placeholder="请选择转入用户" filterable>
            <el-option 
              v-for="user in users" 
              :key="user.id" 
              :label="user.username" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转移积分" prop="amount">
          <el-input-number v-model="form.amount" :min="1" :max="10000" />
        </el-form-item>
        <el-form-item label="转移原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" placeholder="请输入转移原因" :rows="3" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">确认转移</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)
const users = ref([])

const form = reactive({
  fromUserId: '',
  toUserId: '',
  amount: 1,
  reason: ''
})

const rules = {
  fromUserId: [{ required: true, message: '请选择转出用户', trigger: 'change' }],
  toUserId: [
    { required: true, message: '请选择转入用户', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (value === form.fromUserId) {
          callback(new Error('转入用户不能与转出用户相同'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  amount: [{ required: true, message: '请输入转移积分数量', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入转移原因', trigger: 'blur' }]
}

// 监听visible变化
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      loadUsers()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

// 方法
const loadUsers = async () => {
  try {
    // 这里应该调用API获取用户列表
    // const response = await userApi.getUsers()
    // users.value = response.data
    
    // 临时数据用于演示
    users.value = [
      { id: 1, username: 'user1' },
      { id: 2, username: 'user2' },
      { id: 3, username: 'user3' }
    ]
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  }
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

const resetForm = () => {
  form.fromUserId = ''
  form.toUserId = ''
  form.amount = 1
  form.reason = ''
  formRef.value?.clearValidate()
}

const handleConfirm = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 这里应该调用API进行积分转移
    // await pointsApi.transferPoints(form)

    ElMessage.success('积分转移成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('积分转移失败:', error)
    ElMessage.error('积分转移失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (visible.value) {
    loadUsers()
  }
})
</script>

<style lang="scss" scoped>
.points-transfer-dialog {
  padding: 20px 0;
}
</style>