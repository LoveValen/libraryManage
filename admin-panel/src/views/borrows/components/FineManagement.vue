<template>
  <div class="fine-management">
    <div v-if="borrowRecord" class="mb-4">
      <h4 class="text-lg font-medium mb-3">借阅记录信息</h4>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户">{{ borrowRecord.user?.name }}</el-descriptions-item>
        <el-descriptions-item label="图书">{{ borrowRecord.book?.title }}</el-descriptions-item>
        <el-descriptions-item label="借阅日期">{{ formatDate(borrowRecord.borrowDate) }}</el-descriptions-item>
        <el-descriptions-item label="应还日期">{{ formatDate(borrowRecord.dueDate) }}</el-descriptions-item>
        <el-descriptions-item label="逾期天数">{{ overdueDays }}天</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(borrowRecord.status)">
            {{ getStatusText(borrowRecord.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">罚金计算</h4>
      <el-card>
        <div class="flex justify-between items-center mb-3">
          <span>每日罚金：</span>
          <span class="font-medium">¥{{ dailyFine }}</span>
        </div>
        <div class="flex justify-between items-center mb-3">
          <span>逾期天数：</span>
          <span class="font-medium">{{ overdueDays }}天</span>
        </div>
        <div class="flex justify-between items-center mb-3">
          <span>应缴罚金：</span>
          <span class="font-medium text-red-600">¥{{ totalFine }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span>实缴罚金：</span>
          <el-input-number
            v-model="actualFine"
            :min="0"
            :max="totalFine"
            :precision="2"
            :step="0.1"
            size="small"
            style="width: 120px"
          />
        </div>
      </el-card>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">处理方式</h4>
      <el-radio-group v-model="processType">
        <el-radio label="collect">收取罚金</el-radio>
        <el-radio label="waive">减免罚金</el-radio>
        <el-radio label="defer">延期处理</el-radio>
      </el-radio-group>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">备注</h4>
      <el-input
        v-model="remark"
        type="textarea"
        :rows="3"
        placeholder="请输入处理备注..."
        maxlength="200"
        show-word-limit
      />
    </div>

    <div class="flex justify-end space-x-2">
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">确认处理</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate as formatDateUtil } from '@/utils/date'

const props = defineProps({
  borrowRecord: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['success', 'close'])

const dailyFine = ref(1.0) // 每日罚金
const actualFine = ref(0)
const processType = ref('collect')
const remark = ref('')
const submitting = ref(false)

const overdueDays = computed(() => {
  if (!props.borrowRecord?.dueDate) return 0
  const dueDate = new Date(props.borrowRecord.dueDate)
  const today = new Date()
  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
})

const totalFine = computed(() => {
  return overdueDays.value * dailyFine.value
})

const formatDate = date => {
  const formatted = formatDateUtil(date)
  return formatted || ''
}

const getStatusType = status => {
  switch (status) {
    case 'overdue':
      return 'danger'
    case 'returned':
      return 'success'
    case 'lost':
      return 'warning'
    default:
      return 'info'
  }
}

const getStatusText = status => {
  switch (status) {
    case 'overdue':
      return '逾期'
    case 'returned':
      return '已还'
    case 'lost':
      return '丢失'
    default:
      return '借阅中'
  }
}

const handleSubmit = async () => {
  if (processType.value === 'collect' && actualFine.value <= 0) {
    ElMessage.error('请输入实际收取的罚金金额')
    return
  }

  if (!remark.value.trim()) {
    ElMessage.error('请输入处理备注')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认${processType.value === 'collect' ? '收取' : processType.value === 'waive' ? '减免' : '延期处理'}罚金吗？`,
      '确认处理',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const processData = {
      borrowId: props.borrowRecord.id,
      processType: processType.value,
      totalFine: totalFine.value,
      actualFine: actualFine.value,
      remark: remark.value,
      processedAt: new Date().toISOString()
    }

    console.log('Processing fine:', processData)

    ElMessage.success('罚金处理成功')
    emit('success', processData)
    emit('close')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('处理失败，请重试')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  actualFine.value = totalFine.value
})
</script>

<style scoped>
.fine-management {
  max-height: 600px;
  overflow-y: auto;
}

.space-x-2 > * + * {
  margin-left: 8px;
}
</style>
