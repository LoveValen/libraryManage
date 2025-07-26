const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * WebSocket服务类
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socket ids
    this.socketUsers = new Map();    // socket id -> userId
    this.rooms = new Map();          // room name -> Set of socket ids
    this.isInitialized = false;
  }

  /**
   * 初始化WebSocket服务
   * @param {Object} server - HTTP服务器实例
   * @returns {void}
   */
  initialize(server) {
    if (this.isInitialized) {
      logger.warn('WebSocket service already initialized');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startPeriodicTasks();

    this.isInitialized = true;
    logger.info('WebSocket service initialized successfully');
  }

  /**
   * 设置中间件
   * @private
   */
  setupMiddleware() {
    // 身份验证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // 验证JWT令牌
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // 获取用户信息
        const user = await prisma.users.findUnique({
          where: { id: decoded.id },
          select: { id: true, username: true, email: true, role: true, status: true }
        });

        if (!user || user.status !== 'active') {
          return next(new Error('User not found or inactive'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // 连接日志中间件
    this.io.use((socket, next) => {
      logger.info(`WebSocket connection attempt from user ${socket.userId}`);
      next();
    });
  }

  /**
   * 设置事件处理器
   * @private
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // 基础事件
      socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));
      socket.on('error', (error) => this.handleError(socket, error));
      
      // 通知相关事件
      socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data));
      socket.on('get_unread_count', () => this.handleGetUnreadCount(socket));
      socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
      
      // 心跳检测
      socket.on('ping', () => socket.emit('pong'));
      
      // 状态更新
      socket.on('user_typing', (data) => this.handleUserTyping(socket, data));
      socket.on('user_status_change', (data) => this.handleUserStatusChange(socket, data));
    });
  }

  /**
   * 处理连接事件
   * @private
   */
  async handleConnection(socket) {
    const userId = socket.userId;
    
    try {
      // 添加用户连接
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);
      this.socketUsers.set(socket.id, userId);

      // 加入个人房间
      const personalRoom = `user:${userId}`;
      socket.join(personalRoom);

      // 加入角色房间
      const roleRoom = `role:${socket.user.role}`;
      socket.join(roleRoom);

      // 发送连接成功消息
      socket.emit('connected', {
        status: 'connected',
        userId,
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });

      // 发送未读通知数量
      const unreadCount = await prisma.notifications.count({
        where: { user_id: userId, is_read: false }
      });
      socket.emit('unread_count_update', { count: unreadCount });

      // 广播用户上线状态（给管理员）
      this.io.to('role:admin').emit('user_online', {
        userId,
        username: socket.user.username,
        timestamp: new Date().toISOString()
      });

      logger.info(`User ${userId} connected via WebSocket`, {
        socketId: socket.id,
        connectionCount: this.connectedUsers.get(userId).size
      });

    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      socket.emit('error', { message: 'Connection setup failed' });
    }
  }

  /**
   * 处理断开连接事件
   * @private
   */
  handleDisconnection(socket, reason) {
    const userId = socket.userId;
    
    try {
      // 移除连接记录
      if (this.connectedUsers.has(userId)) {
        this.connectedUsers.get(userId).delete(socket.id);
        if (this.connectedUsers.get(userId).size === 0) {
          this.connectedUsers.delete(userId);
          
          // 广播用户下线状态（给管理员）
          this.io.to('role:admin').emit('user_offline', {
            userId,
            username: socket.user?.username,
            timestamp: new Date().toISOString()
          });
        }
      }
      this.socketUsers.delete(socket.id);

      logger.info(`User ${userId} disconnected from WebSocket`, {
        socketId: socket.id,
        reason,
        remainingConnections: this.connectedUsers.get(userId)?.size || 0
      });

    } catch (error) {
      logger.error('Error handling WebSocket disconnection:', error);
    }
  }

  /**
   * 处理错误事件
   * @private
   */
  handleError(socket, error) {
    logger.error(`WebSocket error for user ${socket.userId}:`, error);
    socket.emit('error', { message: 'WebSocket error occurred' });
  }

  /**
   * 处理标记通知已读事件
   * @private
   */
  async handleMarkNotificationRead(socket, data) {
    try {
      const { notificationId } = data;
      const userId = socket.userId;

      // 标记通知为已读
      const notificationService = require('./notification.service');
      await notificationService.markAsRead(notificationId, userId);

      // 发送确认
      socket.emit('notification_marked_read', { notificationId });

      // 发送更新的未读数量
      const unreadCount = await prisma.notifications.count({
        where: { user_id: userId, is_read: false }
      });
      socket.emit('unread_count_update', { count: unreadCount });

    } catch (error) {
      logger.error('Error marking notification as read:', error);
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  /**
   * 处理获取未读数量事件
   * @private
   */
  async handleGetUnreadCount(socket) {
    try {
      const userId = socket.userId;
      const unreadCount = await prisma.notifications.count({
        where: { user_id: userId, is_read: false }
      });
      socket.emit('unread_count_update', { count: unreadCount });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      socket.emit('error', { message: 'Failed to get unread count' });
    }
  }

  /**
   * 处理加入房间事件
   * @private
   */
  handleJoinRoom(socket, data) {
    const { room } = data;
    const userId = socket.userId;

    // 验证房间权限
    if (this.canJoinRoom(userId, room, socket.user.role)) {
      socket.join(room);
      
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room).add(socket.id);

      socket.emit('room_joined', { room });
      logger.info(`User ${userId} joined room ${room}`);
    } else {
      socket.emit('error', { message: 'Permission denied to join room' });
    }
  }

  /**
   * 处理离开房间事件
   * @private
   */
  handleLeaveRoom(socket, data) {
    const { room } = data;
    const userId = socket.userId;

    socket.leave(room);
    
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(socket.id);
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }

    socket.emit('room_left', { room });
    logger.info(`User ${userId} left room ${room}`);
  }

  /**
   * 处理用户输入状态事件
   * @private
   */
  handleUserTyping(socket, data) {
    const { room, isTyping } = data;
    const userId = socket.userId;

    socket.to(room).emit('user_typing', {
      userId,
      username: socket.user.username,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理用户状态变化事件
   * @private
   */
  handleUserStatusChange(socket, data) {
    const { status } = data;
    const userId = socket.userId;

    // 广播状态变化给相关用户
    this.io.to(`user:${userId}`).emit('user_status_changed', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 发送通知给指定用户
   * @param {number} userId - 用户ID
   * @param {Object} notification - 通知数据
   * @returns {boolean} 发送结果
   */
  sendNotificationToUser(userId, notification) {
    try {
      const room = `user:${userId}`;
      
      this.io.to(room).emit('new_notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });

      // 同时更新未读数量
      this.updateUnreadCountForUser(userId);

      logger.info(`Sent notification to user ${userId}`, {
        notificationId: notification.id,
        type: notification.type
      });

      return true;
    } catch (error) {
      logger.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * 发送通知给多个用户
   * @param {Array} userIds - 用户ID数组
   * @param {Object} notification - 通知数据
   * @returns {number} 成功发送的数量
   */
  sendNotificationToUsers(userIds, notification) {
    let successCount = 0;
    
    for (const userId of userIds) {
      if (this.sendNotificationToUser(userId, notification)) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 发送通知给房间内所有用户
   * @param {string} room - 房间名称
   * @param {Object} notification - 通知数据
   * @returns {boolean} 发送结果
   */
  sendNotificationToRoom(room, notification) {
    try {
      this.io.to(room).emit('new_notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });

      logger.info(`Sent notification to room ${room}`, {
        notificationId: notification.id,
        type: notification.type
      });

      return true;
    } catch (error) {
      logger.error('Error sending notification to room:', error);
      return false;
    }
  }

  /**
   * 广播系统消息
   * @param {Object} message - 消息内容
   * @param {Array} excludeUsers - 排除的用户ID数组
   * @returns {boolean} 发送结果
   */
  broadcastSystemMessage(message, excludeUsers = []) {
    try {
      const sockets = Array.from(this.io.sockets.sockets.values());
      
      for (const socket of sockets) {
        if (!excludeUsers.includes(socket.userId)) {
          socket.emit('system_message', {
            ...message,
            timestamp: new Date().toISOString()
          });
        }
      }

      logger.info('Broadcasted system message', {
        type: message.type,
        excludedUsers: excludeUsers.length
      });

      return true;
    } catch (error) {
      logger.error('Error broadcasting system message:', error);
      return false;
    }
  }

  /**
   * 更新用户未读数量
   * @param {number} userId - 用户ID
   */
  async updateUnreadCountForUser(userId) {
    try {
      const unreadCount = await prisma.notifications.count({
        where: { user_id: userId, is_read: false }
      });
      const room = `user:${userId}`;
      
      this.io.to(room).emit('unread_count_update', { count: unreadCount });
    } catch (error) {
      logger.error('Error updating unread count for user:', error);
    }
  }

  /**
   * 检查用户是否可以加入房间
   * @private
   */
  canJoinRoom(userId, room, userRole) {
    // 个人房间：只能加入自己的房间
    if (room.startsWith('user:')) {
      const roomUserId = parseInt(room.split(':')[1]);
      return roomUserId === userId;
    }

    // 角色房间：只能加入自己角色的房间
    if (room.startsWith('role:')) {
      const roomRole = room.split(':')[1];
      return roomRole === userRole || userRole === 'admin';
    }

    // 公共房间：所有人都可以加入
    if (room.startsWith('public:')) {
      return true;
    }

    // 管理员房间：只有管理员可以加入
    if (room.startsWith('admin:')) {
      return userRole === 'admin';
    }

    // 默认拒绝
    return false;
  }

  /**
   * 获取在线用户统计
   * @returns {Object} 在线用户统计信息
   */
  getOnlineStats() {
    const totalConnections = this.io.sockets.sockets.size;
    const uniqueUsers = this.connectedUsers.size;
    const activeRooms = this.rooms.size;

    const usersByRole = {};
    for (const socket of this.io.sockets.sockets.values()) {
      const role = socket.user?.role || 'unknown';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    }

    return {
      totalConnections,
      uniqueUsers,
      activeRooms,
      usersByRole,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取连接的用户列表
   * @returns {Array} 在线用户列表
   */
  getConnectedUsers() {
    const users = [];
    
    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.user) {
        users.push({
          userId: socket.user.id,
          username: socket.user.username,
          role: socket.user.role,
          socketId: socket.id,
          connectedAt: socket.handshake.time
        });
      }
    }

    return users;
  }

  /**
   * 强制断开用户连接
   * @param {number} userId - 用户ID
   * @param {string} reason - 断开原因
   * @returns {number} 断开的连接数
   */
  disconnectUser(userId, reason = 'Admin disconnection') {
    let disconnectedCount = 0;
    
    if (this.connectedUsers.has(userId)) {
      const socketIds = Array.from(this.connectedUsers.get(userId));
      
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
          disconnectedCount++;
        }
      }
    }

    logger.info(`Forcefully disconnected user ${userId}`, {
      reason,
      connectionsDisconnected: disconnectedCount
    });

    return disconnectedCount;
  }

  /**
   * 启动定期任务
   * @private
   */
  startPeriodicTasks() {
    // 每5分钟清理断开的连接记录
    setInterval(() => {
      this.cleanupDisconnectedSockets();
    }, 5 * 60 * 1000);

    // 每小时发送在线统计给管理员
    setInterval(() => {
      const stats = this.getOnlineStats();
      this.io.to('role:admin').emit('online_stats_update', stats);
    }, 60 * 60 * 1000);

    logger.info('WebSocket periodic tasks started');
  }

  /**
   * 清理断开的Socket连接记录
   * @private
   */
  cleanupDisconnectedSockets() {
    let cleanedCount = 0;

    // 清理connectedUsers中的无效socket
    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      for (const socketId of socketIds) {
        if (!this.io.sockets.sockets.has(socketId)) {
          socketIds.delete(socketId);
          this.socketUsers.delete(socketId);
          cleanedCount++;
        }
      }
      
      if (socketIds.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // 清理rooms中的无效socket
    for (const [room, socketIds] of this.rooms.entries()) {
      for (const socketId of socketIds) {
        if (!this.io.sockets.sockets.has(socketId)) {
          socketIds.delete(socketId);
        }
      }
      
      if (socketIds.size === 0) {
        this.rooms.delete(room);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} disconnected socket records`);
    }
  }

  /**
   * 关闭WebSocket服务
   */
  close() {
    if (this.io) {
      this.io.close();
      this.connectedUsers.clear();
      this.socketUsers.clear();
      this.rooms.clear();
      this.isInitialized = false;
      logger.info('WebSocket service closed');
    }
  }
}

module.exports = new WebSocketService();