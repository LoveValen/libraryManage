<template>
  <div class="notification-panel">
    <!-- 头部 -->
    <div class="notification-header">
      <div class="header-title">
        <span>通知中心</span>
      </div>
      <div class="header-actions">
        <el-button 
          text 
          size="small" 
          @click="markAllAsRead"
          :disabled="unreadCount === 0"
        >
          全部已读
        </el-button>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="notification-body">
      <el-empty 
        v-if="notifications.length === 0" 
        description="暂无通知" 
        :image-size="100"
      />
      <div v-else class="notification-list">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          class="notification-item"
          :class="{ 'is-unread': !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <el-icon class="icon" :class="getNotificationIconClass(notification.type)">
              <component :is="getNotificationIcon(notification.type)" />
            </el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
              <el-tag 
                v-if="notification.category" 
                size="small" 
                :type="getTagType(notification.type)"
              >
                {{ notification.category }}
              </el-tag>
            </div>
          </div>
          <div class="notification-actions">
            <el-dropdown trigger="click" @command="(cmd) => handleNotificationAction(cmd, notification)">
              <el-icon class="action-icon">
                <MoreFilled />
              </el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="!notification.read" command="read">
                    标为已读
                  </el-dropdown-item>
                  <el-dropdown-item v-else command="unread">
                    标为未读
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="notification-footer">
      <el-button text @click="handleViewAll">查看系统日志</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()

// 模拟通知数据
const notifications = ref([
  {
    id: 1,
    type: 'system',
    category: '系统通知',
    title: '系统升级完成',
    message: '系统已成功升级到v2.1.0版本，新增了多项功能。',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2分钟前
    link: '/system/settings'
  },
  {
    id: 2,
    type: 'warning',
    category: '安全提醒',
    title: '异常登录检测',
    message: '检测到您的账号在新设备上登录，如非本人操作请及时修改密码。',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
    link: '/system/logs'
  },
  {
    id: 3,
    type: 'info',
    category: '业务提醒',
    title: '图书借阅到期提醒',
    message: '您有5本图书即将到期，请及时续借或归还。',
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
    link: '/borrows/overdue'
  },
  {
    id: 4,
    type: 'success',
    category: '操作成功',
    title: '数据导出完成',
    message: '用户数据导出任务已完成，文件已保存到下载目录。',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
    link: '/system/settings'
  }
])

// 计算属性
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// 方法
const getNotificationIcon = (type) => {
  const iconMap = {
    system: 'Bell',
    warning: 'Warning',
    info: 'InfoFilled',
    success: 'SuccessFilled',
    error: 'CircleCloseFilled'
  }
  return iconMap[type] || 'Bell'
}

const getNotificationIconClass = (type) => {
  return `icon-${type}`
}

const getTagType = (type) => {
  const typeMap = {
    system: 'info',
    warning: 'warning',
    info: 'info',
    success: 'success',
    error: 'danger'
  }
  return typeMap[type] || 'info'
}

const formatTime = (date) => {
  return dayjs(date).fromNow()
}

const handleNotificationClick = (notification) => {
  // 标记为已读
  if (!notification.read) {
    notification.read = true
  }
  
  // 如果有链接，跳转到相应页面
  if (notification.link) {
    router.push(notification.link)
  }
}

const handleNotificationAction = (command, notification) => {
  switch (command) {
    case 'read':
      notification.read = true
      ElMessage.success('已标记为已读')
      break
    case 'unread':
      notification.read = false
      ElMessage.success('已标记为未读')
      break
    case 'delete':
      const index = notifications.value.findIndex(n => n.id === notification.id)
      if (index > -1) {
        notifications.value.splice(index, 1)
        ElMessage.success('通知已删除')
      }
      break
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => {
    n.read = true
  })
  ElMessage.success('所有通知已标记为已读')
}

const handleViewAll = () => {
  // 跳转到系统日志页面查看通知相关日志
  router.push('/system/logs')
}

// 暴露未读数量给父组件
defineExpose({
  unreadCount
})
</script>

<style lang="scss" scoped>
.notification-panel {
  width: 380px;
  max-height: 500px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.notification-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    .header-badge {
      :deep(.el-badge__content) {
        background-color: var(--el-color-danger);
        border: none;
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.notification-body {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;

  .notification-list {
    padding: 8px 0;
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.is-unread {
      background-color: var(--el-color-primary-light-9);

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

    .notification-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .icon {
        font-size: 16px;

        &.icon-system {
          color: var(--el-color-primary);
          background-color: var(--el-color-primary-light-9);
          border-radius: 50%;
          padding: 8px;
        }

        &.icon-warning {
          color: var(--el-color-warning);
          background-color: var(--el-color-warning-light-9);
          border-radius: 50%;
          padding: 8px;
        }

        &.icon-info {
          color: var(--el-color-info);
          background-color: var(--el-color-info-light-9);
          border-radius: 50%;
          padding: 8px;
        }

        &.icon-success {
          color: var(--el-color-success);
          background-color: var(--el-color-success-light-9);
          border-radius: 50%;
          padding: 8px;
        }

        &.icon-error {
          color: var(--el-color-danger);
          background-color: var(--el-color-danger-light-9);
          border-radius: 50%;
          padding: 8px;
        }
      }
    }

    .notification-content {
      flex: 1;
      min-width: 0;

      .notification-title {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .notification-message {
        font-size: 13px;
        color: var(--el-text-color-regular);
        line-height: 1.4;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .notification-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;

        .notification-time {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }

    .notification-actions {
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.2s ease;

      .action-icon {
        font-size: 16px;
        color: var(--el-text-color-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
          background-color: var(--el-fill-color);
          color: var(--el-text-color-primary);
        }
      }
    }

    &:hover .notification-actions {
      opacity: 1;
    }
  }
}

.notification-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
  flex-shrink: 0;
}

// 滚动条样式
.notification-body::-webkit-scrollbar {
  width: 4px;
}

.notification-body::-webkit-scrollbar-track {
  background: transparent;
}

.notification-body::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-light);
  border-radius: 2px;
}

.notification-body::-webkit-scrollbar-thumb:hover {
  background-color: var(--el-border-color);
}
</style>