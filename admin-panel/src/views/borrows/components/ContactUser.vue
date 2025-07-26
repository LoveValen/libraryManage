<template>
  <div class="contact-user">
    <div v-if="user" class="mb-4">
      <h4 class="text-lg font-medium mb-3">用户信息</h4>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ user.name }}</el-descriptions-item>
        <el-descriptions-item label="学号/工号">{{ user.studentId || user.employeeId }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ user.phone }}</el-descriptions-item>
        <el-descriptions-item label="身份">
          <el-tag :type="getUserRoleType(user.role)">
            {{ getUserRoleText(user.role) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getUserStatusType(user.status)">
            {{ getUserStatusText(user.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">联系方式</h4>
      <el-radio-group v-model="contactMethod">
        <el-radio label="email">邮件通知</el-radio>
        <el-radio label="sms">短信通知</el-radio>
        <el-radio label="phone">电话联系</el-radio>
        <el-radio label="wechat">微信通知</el-radio>
      </el-radio-group>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">通知类型</h4>
      <el-radio-group v-model="notificationType">
        <el-radio label="overdue">逾期提醒</el-radio>
        <el-radio label="fine">罚金通知</el-radio>
        <el-radio label="return">还书提醒</el-radio>
        <el-radio label="custom">自定义消息</el-radio>
      </el-radio-group>
    </div>

    <div class="mb-4">
      <h4 class="text-lg font-medium mb-3">消息内容</h4>
      <el-input
        v-model="message"
        type="textarea"
        :rows="5"
        :placeholder="getMessagePlaceholder()"
        maxlength="500"
        show-word-limit
      />
    </div>

    <div class="mb-4" v-if="contactMethod === 'email'">
      <h4 class="text-lg font-medium mb-3">邮件设置</h4>
      <el-form :model="emailSettings" label-width="80px">
        <el-form-item label="主题">
          <el-input v-model="emailSettings.subject" placeholder="请输入邮件主题" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="emailSettings.priority" placeholder="选择优先级">
            <el-option label="普通" value="normal" />
            <el-option label="重要" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="flex justify-end space-x-2">
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="handleSend" :loading="sending">发送通知</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const contactMethod = ref('email')
const notificationType = ref('overdue')
const message = ref('')
const sending = ref(false)
const emailSettings = ref({
  subject: '',
  priority: 'normal'
})

const getUserRoleType = role => {
  switch (role) {
    case 'admin':
      return 'danger'
    case 'librarian':
      return 'warning'
    case 'student':
      return 'info'
    case 'teacher':
      return 'success'
    default:
      return 'info'
  }
}

const getUserRoleText = role => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'librarian':
      return '图书管理员'
    case 'student':
      return '学生'
    case 'teacher':
      return '教师'
    default:
      return '未知'
  }
}

const getUserStatusType = status => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warning'
    case 'blocked':
      return 'danger'
    default:
      return 'info'
  }
}

const getUserStatusText = status => {
  switch (status) {
    case 'active':
      return '正常'
    case 'inactive':
      return '未激活'
    case 'blocked':
      return '已封禁'
    default:
      return '未知'
  }
}

const getMessagePlaceholder = () => {
  switch (notificationType.value) {
    case 'overdue':
      return '尊敬的用户，您借阅的图书已逾期，请及时归还...'
    case 'fine':
      return '尊敬的用户，您有未缴纳的图书罚金，请及时处理...'
    case 'return':
      return '尊敬的用户，您借阅的图书即将到期，请及时归还...'
    default:
      return '请输入要发送的消息内容...'
  }
}

const getDefaultMessage = () => {
  switch (notificationType.value) {
    case 'overdue':
      return `尊敬的${props.user.name}，\n\n您借阅的图书已逾期，请及时归还以避免产生更多罚金。\n\n如有疑问，请联系图书馆。`
    case 'fine':
      return `尊敬的${props.user.name}，\n\n您有未缴纳的图书罚金，请及时到图书馆缴纳。\n\n如有疑问，请联系图书馆。`
    case 'return':
      return `尊敬的${props.user.name}，\n\n您借阅的图书即将到期，请及时归还。\n\n如有疑问，请联系图书馆。`
    default:
      return ''
  }
}

const handleSend = async () => {
  if (!message.value.trim()) {
    ElMessage.error('请输入消息内容')
    return
  }

  if (contactMethod.value === 'email' && !emailSettings.value.subject.trim()) {
    ElMessage.error('请输入邮件主题')
    return
  }

  try {
    await ElMessageBox.confirm(`确认通过${getContactMethodText()}发送通知给用户 ${props.user.name} 吗？`, '确认发送', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    sending.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    const contactData = {
      userId: props.user.id,
      contactMethod: contactMethod.value,
      notificationType: notificationType.value,
      message: message.value,
      emailSettings: contactMethod.value === 'email' ? emailSettings.value : null,
      sentAt: new Date().toISOString()
    }

    console.log('Sending notification:', contactData)

    ElMessage.success('通知发送成功')
    emit('close')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发送失败，请重试')
    }
  } finally {
    sending.value = false
  }
}

const getContactMethodText = () => {
  switch (contactMethod.value) {
    case 'email':
      return '邮件'
    case 'sms':
      return '短信'
    case 'phone':
      return '电话'
    case 'wechat':
      return '微信'
    default:
      return '未知方式'
  }
}

onMounted(() => {
  message.value = getDefaultMessage()
  if (contactMethod.value === 'email') {
    emailSettings.value.subject = `图书馆${notificationType.value === 'overdue' ? '逾期' : notificationType.value === 'fine' ? '罚金' : '还书'}通知`
  }
})
</script>

<style scoped>
.contact-user {
  max-height: 600px;
  overflow-y: auto;
}

.space-x-2 > * + * {
  margin-left: 8px;
}
</style>
