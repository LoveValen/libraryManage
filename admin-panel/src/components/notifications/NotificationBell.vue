<template>
  <div class="notification-bell">
    <el-popover
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="notification-popover"
      @show="handlePopoverShow"
    >
      <template #reference>
        <el-badge :value="unreadCount" :max="99" :hidden="unreadCount === 0" class="notification-badge">
          <el-button
            :icon="Bell"
            circle
            size="large"
            :class="{ 'has-unread': unreadCount > 0 }"
            @click="handleBellClick"
          />
        </el-badge>
      </template>

      <div class="notification-panel">
        <!-- 头部 -->
        <div class="notification-header">
          <div class="title">
            <el-icon><Bell /></el-icon>
            <span>通知</span>
            <el-tag v-if="unreadCount > 0" type="danger" size="small">
              {{ unreadCount }}
            </el-tag>
          </div>
          <div class="actions">
            <el-button v-if="unreadCount > 0" text size="small" type="primary" @click="markAllAsRead">
              全部已读
            </el-button>
            <el-button text size="small" @click="viewAllNotifications">查看全部</el-button>
          </div>
        </div>

        <!-- 通知列表 -->
        <div class="notification-list" v-loading="loading">
          <div v-if="displayNotifications.length === 0" class="empty-state">
            <el-empty description="暂无通知" image-size="80" />
          </div>

          <div v-else>
            <div
              v-for="notification in displayNotifications"
              :key="notification.id"
              class="notification-item"
              :class="{ unread: !notification.isRead }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-icon">
                <el-icon :color="getNotificationColor(notification.type)">
                  <component :is="getNotificationIcon(notification.type)" />
                </el-icon>
              </div>

              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.content }}</div>
                <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
              </div>

              <div class="notification-actions">
                <el-button v-if="!notification.isRead" text size="small" @click.stop="markAsRead(notification.id)">
                  标记已读
                </el-button>
                <el-button text size="small" type="danger" @click.stop="deleteNotification(notification.id)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="notification-footer" v-if="displayNotifications.length > 0">
          <el-button text type="primary" @click="viewAllNotifications" style="width: 100%">查看全部通知</el-button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  Message,
  Warning,
  CircleCheck,
  Document,
  Star,
  Trophy,
  Tools,
  Notification,
  Setting
} from '@element-plus/icons-vue'
import { useNotificationStore } from '@/stores/notification'
import webSocketService from '@/services/websocket.service'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { confirm } from '@/utils/message'

const router = useRouter()
const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)

// 计算属性
const unreadCount = computed(() => notificationStore.unreadCount)
const notifications = computed(() => notificationStore.notifications)

// 显示的通知（最多显示5条）
const displayNotifications = computed(() => {
  return notifications.value.slice(0, 5)
})

// 方法
const handleBellClick = () => {
  // 点击铃铛时的逻辑
}

const handlePopoverShow = async () => {
  if (notifications.value.length === 0) {
    await loadNotifications()
  }
}

const loadNotifications = async () => {
  try {
    loading.value = true
    await notificationStore.fetchNotifications({ limit: 5 })
  } finally {
    loading.value = false
  }
}

const markAllAsRead = async () => {
  try {
    await notificationStore.markAllAsRead()
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

const markAsRead = async notificationId => {
  try {
    await notificationStore.markAsRead(notificationId)
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

const deleteNotification = async notificationId => {
  const confirmed = await confirm('确定要删除这条通知吗？', '确认删除', {
    confirmButtonText: '删除'
  })

  if (confirmed) {
    try {
      await notificationStore.deleteNotification(notificationId)
    } catch (error) {
      console.error('删除通知失败:', error)
    }
  }
}

const handleNotificationClick = async notification => {
  // 标记为已读
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }

  // 如果有操作链接，跳转到对应页面
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
  }
}

const viewAllNotifications = () => {
  router.push('/notifications')
}

const getNotificationIcon = type => {
  const iconMap = {
    system: Setting,
    borrow_reminder: Document,
    return_reminder: Document,
    overdue_warning: Warning,
    reservation: Bell,
    review_reply: Star,
    points_change: Trophy,
    book_available: CircleCheck,
    maintenance: Tools,
    announcement: Notification,
    chat_message: Message,
    admin_alert: Warning
  }
  return iconMap[type] || Bell
}

const getNotificationColor = type => {
  const colorMap = {
    system: '#909399',
    borrow_reminder: '#409EFF',
    return_reminder: '#E6A23C',
    overdue_warning: '#F56C6C',
    reservation: '#409EFF',
    review_reply: '#E6A23C',
    points_change: '#67C23A',
    book_available: '#67C23A',
    maintenance: '#E6A23C',
    announcement: '#409EFF',
    chat_message: '#409EFF',
    admin_alert: '#F56C6C'
  }
  return colorMap[type] || '#909399'
}

const formatTime = timestamp => {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

// WebSocket事件监听
const setupWebSocketListeners = () => {
  // 监听新通知
  webSocketService.on('notification', notification => {
    // 通知已在 WebSocket 服务中处理，这里可以添加额外逻辑
  })

  // 监听未读计数更新
  webSocketService.on('unread_count', data => {
    // 计数已在 WebSocket 服务中处理
  })
}

const cleanupWebSocketListeners = () => {
  webSocketService.off('notification')
  webSocketService.off('unread_count')
}

// 生命周期
onMounted(async () => {
  // 初始化通知数据
  await notificationStore.fetchUnreadCount()

  // 设置 WebSocket 监听
  setupWebSocketListeners()
})

onUnmounted(() => {
  cleanupWebSocketListeners()
})
</script>

<style lang="scss" scoped>
.notification-bell {
  .notification-badge {
    :deep(.el-badge__content) {
      transform: translateX(50%) translateY(-50%);
    }
  }

  .has-unread {
    animation: bell-shake 2s infinite;

    @keyframes bell-shake {
      0%,
      50%,
      100% {
        transform: rotate(0deg);
      }
      10%,
      30% {
        transform: rotate(-10deg);
      }
      20%,
      40% {
        transform: rotate(10deg);
      }
    }
  }
}

:deep(.notification-popover) {
  padding: 0 !important;

  .el-popover__arrow {
    display: none;
  }
}

.notification-panel {
  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-extra-light);
    background: var(--el-fill-color-extra-light);

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .actions {
      display: flex;
      gap: 8px;
    }
  }

  .notification-list {
    max-height: 400px;
    overflow-y: auto;

    .empty-state {
      padding: 40px 20px;
      text-align: center;
    }

    .notification-item {
      display: flex;
      padding: 12px 16px;
      border-bottom: 1px solid var(--el-border-color-extra-light);
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background-color: var(--el-fill-color-extra-light);
      }

      &.unread {
        background-color: var(--el-color-primary-light-9);

        .notification-title {
          font-weight: 600;
        }

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: var(--el-color-primary);
        }
      }

      position: relative;

      .notification-icon {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }

      .notification-content {
        flex: 1;
        min-width: 0;

        .notification-title {
          font-size: 14px;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
          word-break: break-word;
        }

        .notification-message {
          font-size: 12px;
          color: var(--el-text-color-regular);
          line-height: 1.4;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-time {
          font-size: 11px;
          color: var(--el-text-color-placeholder);
        }
      }

      .notification-actions {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-left: 8px;
        opacity: 0;
        transition: opacity 0.3s;
      }

      &:hover .notification-actions {
        opacity: 1;
      }
    }
  }

  .notification-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--el-border-color-extra-light);
    background: var(--el-fill-color-extra-light);
  }
}

// 响应式设计
@media (max-width: 768px) {
  :deep(.notification-popover) {
    width: 320px !important;
  }

  .notification-panel {
    .notification-header {
      padding: 12px;

      .actions {
        .el-button {
          padding: 4px 8px;
          font-size: 12px;
        }
      }
    }

    .notification-list {
      .notification-item {
        padding: 10px 12px;

        .notification-content {
          .notification-title {
            font-size: 13px;
          }

          .notification-message {
            font-size: 11px;
          }
        }
      }
    }
  }
}
</style>
