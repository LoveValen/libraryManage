<template>
  <el-dialog v-model="visible" title="积分操作" width="600px" :before-close="handleClose">
    <div class="points-operation-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="操作类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择操作类型">
            <el-option label="增加积分" value="add" />
            <el-option label="扣除积分" value="subtract" />
          </el-select>
        </el-form-item>
        <el-form-item label="积分数量" prop="amount">
          <el-input-number v-model="form.amount" :min="1" :max="10000" />
        </el-form-item>
        <el-form-item label="操作原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" placeholder="请输入操作原因" :rows="3" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  userId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  type: '',
  amount: 1,
  reason: ''
})

const rules = {
  type: [{ required: true, message: '请选择操作类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入积分数量', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入操作原因', trigger: 'blur' }]
}

// 监听visible变化
watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

// 方法
const handleClose = () => {
  visible.value = false
  resetForm()
}

const resetForm = () => {
  form.type = ''
  form.amount = 1
  form.reason = ''
  formRef.value?.clearValidate()
}

const handleConfirm = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 这里应该调用API进行积分操作
    // await pointsApi.operatePoints(props.userId, form)

    ElMessage.success('积分操作成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('积分操作失败:', error)
    ElMessage.error('积分操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.points-operation-dialog {
  padding: 20px 0;
}
</style>
