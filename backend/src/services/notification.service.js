const webSocketService = require('./websocket.service');
const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const { ApiError, BadRequestError, NotFoundError } = require('../utils/apiError');
const { NOTIFICATION_TYPES, NOTIFICATION_STATUS, NOTIFICATION_PRIORITY } = require('../utils/constants');

/**
 * Basic NotificationService for Prisma operations
 */
class NotificationService {
  static async create(notificationData) {
    const {
      userId,
      type,
      title,
      content,
      priority = 'normal',
      metadata = {},
      relatedId,
      relatedType,
      action_url
    } = notificationData;

    return prisma.notifications.create({
      data: {
        user_id: parseInt(userId),
        type,
        title,
        content,
        priority,
        status: 'pending',
        metadata,
        related_id: relatedId ? parseInt(relatedId) : null,
        related_type: relatedType,
        action_url,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  static async createFromTemplate(templateType, userId, variables = {}) {
    const templates = {
      BORROW_SUCCESS: {
        type: 'borrow_reminder',
        title: '借阅成功',
        content: `您已成功借阅《${variables.bookTitle}》，请在${variables.dueDate}前归还。`,
        priority: 'normal'
      },
      RETURN_REMINDER: {
        type: 'return_reminder',
        title: '还书提醒',
        content: `您借阅的《${variables.bookTitle}》将在${variables.daysRemaining}天后到期，请及时归还。`,
        priority: 'high'
      }
    };

    const template = templates[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    return this.create({
      userId: userId,
      ...template,
      relatedId: variables.relatedId,
      relatedType: variables.relatedType,
      metadata: variables
    });
  }

  /**
   * Send scheduled notifications
   */
  static async sendScheduledNotifications() {
    try {
      const now = new Date();
      // Since scheduled_at field doesn't exist, we'll process all pending notifications
      const scheduledNotifications = await prisma.notifications.findMany({
        where: {
          status: 'pending'
        },
        take: 10 // Process in batches to avoid overload
      });

      for (const notification of scheduledNotifications) {
        await prisma.notifications.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            updated_at: now
          }
        });
      }

      if (scheduledNotifications.length > 0) {
        logger.info(`Sent ${scheduledNotifications.length} scheduled notifications`);
      }
    } catch (error) {
      logger.error('Failed to send scheduled notifications:', error);
    }
  }

  /**
   * Clean up old notifications
   */
  static async cleanupExpired() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Clean up notifications older than 30 days that have been read or sent
      const result = await prisma.notifications.deleteMany({
        where: {
          created_at: {
            lt: thirtyDaysAgo
          },
          OR: [
            { status: 'sent' },
            { is_read: true }
          ]
        }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} old notifications`);
      }
    } catch (error) {
      logger.error('Failed to clean up old notifications:', error);
    }
  }
}

/**
 * Notification service adapter for Prisma
 * Maintains compatibility with existing controller interface
 */
class NotificationServiceAdapter {
  constructor() {
    this.smsService = null;
    this.pushService = null;
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Start notification processor
    this.startNotificationProcessor();
  }

  /**
   * Create notification
   */
  async createNotification(data) {
    try {
      const {
        userId,
        type,
        title,
        content,
        priority = 'normal',
        channel = { inApp: true },
        metadata = {},
        relatedId = null,
        relatedType = null,
        actionUrl = null,
        scheduledAt = null,
        expiresAt = null
      } = data;

      // Validate required parameters
      if (!userId || !type || !title || !content) {
        throw new BadRequestError('Missing required notification parameters');
      }

      // Validate user exists
      const user = await prisma.users.findUnique({
        where: { id: parseInt(userId) }
      });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check user notification preferences
      const userPreferences = user.preferences?.notificationSettings || {};
      const mergedChannel = this.applyUserPreferences(channel, userPreferences);

      // Convert channel object to array for Prisma
      const channelArray = [];
      if (mergedChannel.inApp) channelArray.push('in_app');
      if (mergedChannel.sms) channelArray.push('sms');
      if (mergedChannel.push) channelArray.push('push');

      // Create notification (removed non-existent fields: channel, scheduled_at, expires_at)
      const notification = await NotificationService.create({
        userId: userId,
        type,
        title,
        content,
        priority,
        metadata,
        relatedId: relatedId,
        relatedType: relatedType,
        action_url: actionUrl
      });

      // Add to processing queue
      this.addToQueue(notification);

      logger.info(`Created notification: ${notification.id} for user ${userId}`);
      return this.formatNotificationResponse(notification);
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create notification from template
   */
  async createNotificationFromTemplate(templateCode, userId, variables = {}, options = {}) {
    try {
      // Use predefined templates for now
      const notification = await NotificationService.createFromTemplate(
        templateCode,
        userId,
        {
          ...variables,
          relatedId: options.relatedId,
          relatedType: options.relatedType
        }
      );

      // Add to processing queue
      this.addToQueue(notification);

      return this.formatNotificationResponse(notification);
    } catch (error) {
      logger.error('Failed to create notification from template:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(notifications) {
    try {
      const result = await NotificationService.createBatch(notifications);
      logger.info(`Created ${result.count} notifications in bulk`);
      return result;
    } catch (error) {
      logger.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(data) {
    const allUsers = await prisma.users.findMany({
      where: {
        status: 'active',
        is_deleted: false
      },
      select: { id: true }
    });

    const userIds = allUsers.map(user => user.id);
    
    return NotificationService.broadcast(userIds, {
      type: data.type || 'announcement',
      title: data.title,
      content: data.content,
      priority: data.priority || 'normal',
      metadata: data.metadata
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      isRead,
      startDate,
      endDate
    } = options;

    const result = await NotificationService.findWithPagination({
      page: parseInt(page),
      limit: parseInt(limit),
      userId: userId,
      type,
      status,
      is_read: isRead
    });

    return {
      notifications: result.data.map(n => this.formatNotificationResponse(n)),
      pagination: result.pagination
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await NotificationService.findById(notificationId);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== parseInt(userId)) {
      throw new BadRequestError('Unauthorized to update this notification');
    }

    const updated = await NotificationService.markAsRead(notificationId);
    
    // Send WebSocket update
    if (webSocketService.isUserConnected(userId)) {
      webSocketService.sendToUser(userId, 'notification:read', {
        notificationId: updated.id
      });
    }

    return this.formatNotificationResponse(updated);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId, type = null) {
    const result = await NotificationService.markAllAsRead(userId);
    
    // Send WebSocket update
    if (webSocketService.isUserConnected(userId)) {
      webSocketService.sendToUser(userId, 'notification:all-read', {
        count: result.count
      });
    }

    return result;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await NotificationService.findById(notificationId);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== parseInt(userId)) {
      throw new BadRequestError('Unauthorized to delete this notification');
    }

    await NotificationService.softDelete(notificationId);
    
    return {
      success: true,
      message: 'Notification deleted successfully'
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const count = await NotificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Create borrow notification
   */
  async createBorrowNotification(borrow, type, additionalData = {}) {
    const borrowWithRelations = await prisma.borrows.findUnique({
      where: { id: borrow.id },
      include: {
        book: true,
        borrower: true
      }
    });

    const templates = {
      'borrowed': {
        type: 'borrow_reminder',
        templateCode: 'BORROW_SUCCESS'
      },
      'due_soon': {
        type: 'return_reminder',
        templateCode: 'RETURN_REMINDER'
      },
      'overdue': {
        type: 'overdue_warning',
        templateCode: 'OVERDUE_WARNING'
      }
    };

    const template = templates[type];
    if (!template) {
      throw new BadRequestError(`Unknown borrow notification type: ${type}`);
    }

    const daysRemaining = Math.floor((new Date(borrowWithRelations.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    const overdueDays = Math.max(0, -daysRemaining);

    return this.createNotificationFromTemplate(
      template.templateCode,
      borrowWithRelations.userId,
      {
        bookTitle: borrowWithRelations.book.title,
        dueDate: new Date(borrowWithRelations.due_date).toLocaleDateString('zh-CN'),
        daysRemaining,
        overdueDays,
        ...additionalData
      },
      {
        relatedId: borrow.id,
        relatedType: 'borrow'
      }
    );
  }

  /**
   * Create book notification
   */
  async createBookNotification(book, users, type, additionalData = {}) {
    const notifications = users.map(user => ({
      userId: user.id,
      type: 'book_available',
      title: `图书通知: ${book.title}`,
      content: additionalData.content || `《${book.title}》有新的动态`,
      priority: 'normal',
      metadata: {
        bookId: book.id,
        bookTitle: book.title,
        ...additionalData
      },
      relatedId: book.id,
      relatedType: 'book'
    }));

    return this.createBulkNotifications(notifications);
  }

  /**
   * Apply user preferences to notification channels
   */
  applyUserPreferences(requestedChannel, userPreferences) {
    const defaultChannel = { inApp: true };
    const merged = { ...defaultChannel };

    // Apply requested channels
    if (requestedChannel) {
      Object.keys(requestedChannel).forEach(key => {
        if (requestedChannel[key] && userPreferences[key] !== false) {
          merged[key] = true;
        }
      });
    }

    return merged;
  }

  /**
   * Add notification to processing queue
   */
  addToQueue(notification) {
    if (notification.scheduled_at && new Date(notification.scheduled_at) > new Date()) {
      // Don't queue scheduled notifications
      return;
    }
    
    this.processingQueue.push(notification);
  }

  /**
   * Start notification processor
   */
  startNotificationProcessor() {
    // Process queue every 5 seconds
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);

    // Process scheduled notifications every minute
    setInterval(() => {
      NotificationService.sendScheduledNotifications();
    }, 60000);

    // Clean up expired notifications daily
    setInterval(() => {
      NotificationService.cleanupExpired();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const notification = this.processingQueue.shift();
        await this.processNotification(notification);
      }
    } catch (error) {
      logger.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual notification
   */
  async processNotification(notification) {
    try {
      // Send real-time notification via WebSocket
      if (webSocketService.isUserConnected(notification.userId)) {
        webSocketService.sendToUser(notification.userId, 'notification:new', {
          notification: this.formatNotificationResponse(notification)
        });
      }

      // Send via other channels if configured
      const channels = notification.channel || [];
      
      
      if (channels.includes('sms') && this.smsService) {
        await this.sendSmsNotification(notification);
      }
      
      if (channels.includes('push') && this.pushService) {
        await this.sendPushNotification(notification);
      }

      logger.info(`Processed notification ${notification.id}`);
    } catch (error) {
      logger.error(`Failed to process notification ${notification.id}:`, error);
    }
  }


  /**
   * Send SMS notification (placeholder)
   */
  async sendSmsNotification(notification) {
    // Implementation would depend on SMS service
    logger.info(`Would send SMS notification ${notification.id}`);
  }

  /**
   * Send push notification (placeholder)
   */
  async sendPushNotification(notification) {
    // Implementation would depend on push service
    logger.info(`Would send push notification ${notification.id}`);
  }

  /**
   * Get notification statistics
   */
  async getStatistics(startDate, endDate) {
    const where = {};
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [
      total,
      byType,
      byStatus,
      byPriority
    ] = await Promise.all([
      prisma.notifications.count({ where }),
      prisma.notifications.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.notifications.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.notifications.groupBy({
        by: ['priority'],
        where,
        _count: true
      })
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {})
    };
  }

  /**
   * Format notification response
   */
  formatNotificationResponse(notification) {
    if (!notification) return null;

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      priority: notification.priority,
      status: notification.status,
      isRead: notification.is_read,
      readAt: notification.readAt,
      channel: notification.channel,
      metadata: notification.metadata,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      actionUrl: notification.action_url,
      expiresAt: notification.expires_at,
      scheduledAt: notification.scheduled_at,
      sentAt: notification.sentAt,
      retryCount: notification.retry_count,
      errorMessage: notification.error_message,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at
    };
  }
}

module.exports = new NotificationServiceAdapter();