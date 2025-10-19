import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification
} from '@/api/notifications'
import { showSuccess, showError } from '@/utils/message'

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  // 计算属性
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.isRead))

  const readNotifications = computed(() => notifications.value.filter(n => n.isRead))

  const notificationsByType = computed(() => {
    const grouped = {}
    notifications.value.forEach(notification => {
      if (!grouped[notification.type]) {
        grouped[notification.type] = []
      }
      grouped[notification.type].push(notification)
    })
    return grouped
  })

  const hasUnreadNotifications = computed(() => unreadCount.value > 0)

  // 操作方法

  /**
   * 获取通知列表
   */
  const fetchNotifications = async (params = {}) => {
    try {
      loading.value = true

      const response = await getUserNotifications({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      })

      if (response.success) {
        notifications.value = response.data || []
        pagination.value = {
          page: response.page || 1,
          pageSize: response.pageSize || 20,
          total: response.total || 0,
          totalPages: response.totalPages || 0
        }
      }
    } catch (error) {
      console.error('获取通知列表失败:', error)
      showError('获取通知列表失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取未读通知计数
   */
  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount()
      if (response.success) {
        unreadCount.value = response.data.count
      }
    } catch (error) {
      console.error('获取未读通知计数失败:', error)
    }
  }

  /**
   * 标记通知为已读
   */
  const markAsRead = async notificationId => {
    try {
      const response = await apiMarkAsRead(notificationId)
      if (response.success) {
        // 更新本地状态
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification && !notification.isRead) {
          notification.isRead = true
          notification.readAt = new Date().toISOString()
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
      }
      return response
    } catch (error) {
      console.error('标记通知已读失败:', error)
      showError('标记通知已读失败')
      throw error
    }
  }

  /**
   * 标记所有通知为已读
   */
  const markAllAsRead = async (type = null) => {
    try {
      const response = await apiMarkAllAsRead(type)
      if (response.success) {
        // 更新本地状态
        notifications.value.forEach(notification => {
          if (!type || notification.type === type) {
            notification.isRead = true
            notification.readAt = new Date().toISOString()
          }
        })

        if (!type) {
          unreadCount.value = 0
        } else {
          // 重新计算未读数量
          await fetchUnreadCount()
        }

        showSuccess('所有通知已标记为已读')
      }
      return response
    } catch (error) {
      console.error('标记所有通知已读失败:', error)
      showError('标记所有通知已读失败')
      throw error
    }
  }

  /**
   * 删除通知
   */
  const deleteNotification = async notificationId => {
    try {
      const response = await apiDeleteNotification(notificationId)
      if (response.success) {
        // 从本地状态中移除
        const index = notifications.value.findIndex(n => n.id === notificationId)
        if (index > -1) {
          const notification = notifications.value[index]
          if (!notification.isRead) {
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
          notifications.value.splice(index, 1)
        }

        showSuccess('通知已删除')
      }
      return response
    } catch (error) {
      console.error('删除通知失败:', error)
      showError('删除通知失败')
      throw error
    }
  }

  /**
   * 添加新通知（WebSocket）
   */
  const addNotification = notification => {
    // 检查是否已存在
    const exists = notifications.value.find(n => n.id === notification.id)
    if (!exists) {
      notifications.value.unshift(notification)

      // 更新未读计数
      if (!notification.isRead) {
        unreadCount.value += 1
      }
    }
  }

  /**
   * 更新通知状态（WebSocket）
   */
  const updateNotification = (notificationId, updates) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      Object.assign(notification, updates)
    }
  }

  /**
   * 设置未读计数（WebSocket）
   */
  const setUnreadCount = count => {
    unreadCount.value = count
  }

  /**
   * 清空通知列表
   */
  const clearNotifications = () => {
    notifications.value = []
    unreadCount.value = 0
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  }

  /**
   * 设置分页参数
   */
  const setPagination = newPagination => {
    pagination.value = { ...pagination.value, ...newPagination }
  }

  /**
   * 获取指定类型的通知
   */
  const getNotificationsByType = type => {
    return notifications.value.filter(n => n.type === type)
  }

  /**
   * 获取指定优先级的通知
   */
  const getNotificationsByPriority = priority => {
    return notifications.value.filter(n => n.priority === priority)
  }

  /**
   * 批量标记通知为已读
   */
  const batchMarkAsRead = async notificationIds => {
    try {
      const promises = notificationIds.map(id => markAsRead(id))
      await Promise.all(promises)
      showSuccess(`已标记 ${notificationIds.length} 条通知为已读`)
    } catch (error) {
      console.error('批量标记失败:', error)
      showError('批量标记失败')
    }
  }

  /**
   * 批量删除通知
   */
  const batchDeleteNotifications = async notificationIds => {
    try {
      const promises = notificationIds.map(id => deleteNotification(id))
      await Promise.all(promises)
      showSuccess(`已删除 ${notificationIds.length} 条通知`)
    } catch (error) {
      console.error('批量删除失败:', error)
      showError('批量删除失败')
    }
  }

  /**
   * 获取通知统计信息
   */
  const getNotificationStats = computed(() => {
    const stats = {
      total: notifications.value.length,
      unread: unreadNotifications.value.length,
      read: readNotifications.value.length,
      byType: {},
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0
      }
    }

    notifications.value.forEach(notification => {
      // 按类型统计
      if (!stats.byType[notification.type]) {
        stats.byType[notification.type] = 0
      }
      stats.byType[notification.type]++

      // 按优先级统计
      if (Object.prototype.hasOwnProperty.call(stats.byPriority, notification.priority)) {
        stats.byPriority[notification.priority]++
      }
    })

    return stats
  })

  /**
   * 搜索通知
   */
  const searchNotifications = keyword => {
    if (!keyword) return notifications.value

    const lowerKeyword = keyword.toLowerCase()
    return notifications.value.filter(
      notification =>
        notification.title.toLowerCase().includes(lowerKeyword) ||
        notification.content.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 过滤通知
   */
  const filterNotifications = filters => {
    let filtered = [...notifications.value]

    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type)
    }

    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority)
    }

    if (filters.status) {
      if (filters.status === 'unread') {
        filtered = filtered.filter(n => !n.isRead)
      } else if (filters.status === 'read') {
        filtered = filtered.filter(n => n.isRead)
      }
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange
      filtered = filtered.filter(n => {
        const notificationDate = new Date(n.createdAt)
        return notificationDate >= new Date(startDate) && notificationDate <= new Date(endDate)
      })
    }

    return filtered
  }

  /**
   * 初始化通知数据
   */
  const initialize = async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()])
  }

  /**
   * 重置状态
   */
  const reset = () => {
    clearNotifications()
  }

  return {
    // 状态
    notifications,
    unreadCount,
    loading,
    pagination,

    // 计算属性
    unreadNotifications,
    readNotifications,
    notificationsByType,
    hasUnreadNotifications,
    getNotificationStats,

    // 操作方法
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    updateNotification,
    setUnreadCount,
    clearNotifications,
    setPagination,
    getNotificationsByType,
    getNotificationsByPriority,
    batchMarkAsRead,
    batchDeleteNotifications,
    searchNotifications,
    filterNotifications,
    initialize,
    reset
  }
})
