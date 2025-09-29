<template>
  <div class="notification-center">
    <el-empty description="暂无通知" v-if="notifications.length === 0" />

    <div v-else>
      <div class="notification-item" v-for="notification in notifications" :key="notification.id">
        <el-card class="mb-3">
          <div class="flex items-start">
            <el-icon class="mr-3 mt-1" :class="getNotificationIcon(notification.type)">
              <component :is="getNotificationIcon(notification.type)" />
            </el-icon>
            <div class="flex-1">
              <div class="font-medium">{{ notification.title }}</div>
              <div class="text-gray-600 text-sm mt-1">{{ notification.message }}</div>
              <div class="text-gray-400 text-xs mt-2">{{ formatDate(notification.createdAt) }}</div>
            </div>
            <el-button v-if="!notification.read" type="primary" size="small" @click="markAsRead(notification.id)">
              标记已读
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <div class="mt-4 text-center">
      <el-button @click="$emit('close')">关闭</el-button>
      <el-button type="primary" @click="markAllAsRead" v-if="hasUnreadNotifications">全部标记为已读</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Warning, InfoFilled } from '@element-plus/icons-vue'
import { formatDateTime as formatDateTimeUtil } from '@/utils/date'

const emit = defineEmits(['close'])

const notifications = ref([])

const hasUnreadNotifications = computed(() => {
  return notifications.value.some(n => !n.read)
})

const getNotificationIcon = type => {
  switch (type) {
    case 'warning':
      return Warning
    case 'info':
      return InfoFilled
    default:
      return Bell
  }
}

const formatDate = date => {
  const formatted = formatDateTimeUtil(date)
  return formatted || ''
}

const markAsRead = id => {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.read = true
    ElMessage.success('已标记为已读')
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => (n.read = true))
  ElMessage.success('全部标记为已读')
}

const loadNotifications = () => {
  // 模拟数据，实际应该从API获取
  notifications.value = [
    {
      id: 1,
      title: '系统维护通知',
      message: '系统将在今晚22:00-24:00进行维护，请提前安排工作。',
      type: 'warning',
      read: false,
      createdAt: new Date()
    },
    {
      id: 2,
      title: '新功能上线',
      message: '图书推荐系统已上线，现在可以为用户提供个性化推荐。',
      type: 'info',
      read: true,
      createdAt: new Date(Date.now() - 86400000)
    }
  ]
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.notification-center {
  max-height: 500px;
  overflow-y: auto;
}

.notification-item {
  margin-bottom: 12px;
}

.notification-item:last-child {
  margin-bottom: 0;
}
</style>
