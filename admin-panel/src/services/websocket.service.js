import { io } from 'socket.io-client'
import { ElMessage, ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'

class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.eventListeners = new Map()
  }

  /**
   * 连接WebSocket服务器
   */
  connect() {
    const authStore = useAuthStore()

    if (!authStore.token) {
      console.warn('No auth token available for WebSocket connection')
      return
    }

    try {
      this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3000', {
        auth: {
          token: authStore.token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      })

      this.setupEventListeners()
      this.setupNotificationHandlers()
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.handleConnectionError(error)
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0

      ElMessage.success('实时连接已建立')

      // 触发连接成功事件
      this.emit('connected', { socketId: this.socket.id })
    })

    // 连接确认
    this.socket.on('connected', data => {
      console.log('WebSocket connection confirmed:', data)
    })

    // 断开连接
    this.socket.on('disconnect', reason => {
      console.log('WebSocket disconnected:', reason)
      this.isConnected = false

      if (reason === 'io server disconnect') {
        // 服务器主动断开，尝试重连
        this.reconnect()
      }

      this.emit('disconnected', { reason })
    })

    // 连接错误
    this.socket.on('connect_error', error => {
      console.error('WebSocket connection error:', error)
      this.handleConnectionError(error)
    })

    // 重连尝试
    this.socket.on('reconnect_attempt', attemptNumber => {
      console.log(`WebSocket reconnect attempt ${attemptNumber}`)
      ElMessage.info(`正在尝试重连... (${attemptNumber}/${this.maxReconnectAttempts})`)
    })

    // 重连成功
    this.socket.on('reconnect', attemptNumber => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`)
      ElMessage.success('重连成功')
    })

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed')
      ElMessage.error('连接失败，请刷新页面重试')
    })

    // 强制断开
    this.socket.on('force_disconnect', data => {
      console.warn('Force disconnected:', data)
      ElNotification.warning({
        title: '连接断开',
        message: data.reason || '您的连接被管理员断开',
        duration: 0
      })
    })

    // 错误处理
    this.socket.on('error', error => {
      console.error('WebSocket error:', error)
      ElMessage.error(error.message || '连接发生错误')
    })

    // 心跳响应
    this.socket.on('heartbeat_ack', data => {
      // 静默处理心跳响应
    })
  }

  /**
   * 设置通知处理器
   */
  setupNotificationHandlers() {
    const notificationStore = useNotificationStore()

    // 新通知
    this.socket.on('notification', notification => {
      console.log('Received notification:', notification)

      // 更新通知存储
      notificationStore.addNotification(notification)

      // 显示通知
      this.showNotification(notification)

      // 触发自定义事件
      this.emit('notification', notification)
    })

    // 系统通知
    this.socket.on('system_notification', notification => {
      console.log('Received system notification:', notification)

      // 显示系统通知
      this.showSystemNotification(notification)

      this.emit('system_notification', notification)
    })

    // 未读计数更新
    this.socket.on('unread_count', data => {
      console.log('Unread count updated:', data.count)
      notificationStore.setUnreadCount(data.count)
      this.emit('unread_count', data)
    })

    // 通知已读确认
    this.socket.on('notification_read', data => {
      console.log('Notification read:', data.notificationId)
      notificationStore.markAsRead(data.notificationId)
      this.emit('notification_read', data)
    })

    // 所有通知已读确认
    this.socket.on('all_notifications_read', data => {
      console.log('All notifications read')
      notificationStore.markAllAsRead()
      this.emit('all_notifications_read', data)
    })

    // 聊天消息
    this.socket.on('chat_message', message => {
      console.log('Received chat message:', message)
      this.showChatMessage(message)
      this.emit('chat_message', message)
    })

    // 消息发送确认
    this.socket.on('message_sent', data => {
      console.log('Message sent:', data)
      this.emit('message_sent', data)
    })

    // 输入状态
    this.socket.on('typing_start', data => {
      this.emit('typing_start', data)
    })

    this.socket.on('typing_stop', data => {
      this.emit('typing_stop', data)
    })

    // 房间事件
    this.socket.on('joined_room', data => {
      console.log('Joined room:', data.roomId)
      this.emit('joined_room', data)
    })

    this.socket.on('left_room', data => {
      console.log('Left room:', data.roomId)
      this.emit('left_room', data)
    })

    // 用户上线/离线（仅管理员）
    this.socket.on('user_online', data => {
      this.emit('user_online', data)
    })

    this.socket.on('user_offline', data => {
      this.emit('user_offline', data)
    })
  }

  /**
   * 显示通知
   */
  showNotification(notification) {
    const typeMap = {
      low: 'info',
      normal: 'info',
      high: 'warning',
      urgent: 'error'
    }

    const iconMap = {
      system: 'Setting',
      borrow_reminder: 'Reading',
      return_reminder: 'DocumentCopy',
      overdue_warning: 'Warning',
      reservation: 'Bell',
      review_reply: 'Star',
      points_change: 'TrophyBase',
      book_available: 'CircleCheck',
      maintenance: 'Tools',
      announcement: 'Notification',
      chat_message: 'Message',
      admin_alert: 'Warning'
    }

    ElNotification({
      title: notification.title,
      message: notification.content,
      type: typeMap[notification.priority] || 'info',
      duration: notification.priority === 'urgent' ? 0 : 4500,
      showClose: true,
      onClick: () => {
        if (notification.actionUrl) {
          this.$router.push(notification.actionUrl)
        }
        this.markNotificationAsRead(notification.id)
      }
    })
  }

  /**
   * 显示系统通知
   */
  showSystemNotification(notification) {
    ElNotification({
      title: '系统通知',
      message: notification.content,
      type: notification.priority === 'urgent' ? 'error' : 'warning',
      duration: 0,
      showClose: true
    })
  }

  /**
   * 显示聊天消息
   */
  showChatMessage(message) {
    ElNotification({
      title: `来自 ${message.senderName} 的消息`,
      message: message.message,
      type: 'info',
      duration: 4500,
      showClose: true
    })
  }

  /**
   * 发送消息
   */
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  /**
   * 监听事件
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(callback)

    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback)
    }

    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  /**
   * 加入房间
   */
  joinRoom(roomId) {
    this.emit('join_room', { roomId })
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId) {
    this.emit('leave_room', { roomId })
  }

  /**
   * 标记通知为已读
   */
  markNotificationAsRead(notificationId) {
    this.emit('mark_notification_read', { notificationId })
  }

  /**
   * 标记所有通知为已读
   */
  markAllNotificationsAsRead() {
    this.emit('mark_all_notifications_read')
  }

  /**
   * 获取未读通知计数
   */
  getUnreadCount() {
    this.emit('get_unread_count')
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(recipientId, message, type = 'text') {
    this.emit('send_chat_message', {
      recipientId,
      message,
      type
    })
  }

  /**
   * 开始输入
   */
  startTyping(recipientId) {
    this.emit('typing_start', { recipientId })
  }

  /**
   * 停止输入
   */
  stopTyping(recipientId) {
    this.emit('typing_stop', { recipientId })
  }

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    this.emit('heartbeat')
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(error) {
    console.error('WebSocket connection error:', error)

    if (error.message.includes('Authentication')) {
      ElMessage.error('身份验证失败，请重新登录')
      // 触发登出
      const authStore = useAuthStore()
      authStore.logout()
    } else {
      ElMessage.error('连接服务器失败')
    }
  }

  /**
   * 手动重连
   */
  reconnect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect()
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  /**
   * 检查连接状态
   */
  isConnectedToServer() {
    return this.isConnected && this.socket?.connected
  }

  /**
   * 获取连接ID
   */
  getSocketId() {
    return this.socket?.id
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnectedToServer()) {
        this.sendHeartbeat()
      }
    }, 30000) // 每30秒发送一次心跳
  }
}

// 创建单例实例
const webSocketService = new WebSocketService()

export default webSocketService
