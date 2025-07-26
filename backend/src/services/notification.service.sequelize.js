const { models } = require('../models');
const webSocketService = require('./websocket.service');
const { logger } = require('../utils/logger');
const { ApiError, BadRequestError, NotFoundError } = require('../utils/apiError');
const { Op } = require('sequelize');

class NotificationService {
  constructor() {
    this.emailService = null;
    this.smsService = null;
    this.pushService = null;
    this.processingQueue = [];
    this.isProcessing = false;
    
    // 启动通知处理器
    this.startNotificationProcessor();
  }

  /**
   * 创建通知
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

      // 验证必需参数
      if (!userId || !type || !title || !content) {
        throw new BadRequestError('Missing required notification parameters');
      }

      // 验证用户存在
      const user = await models.User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // 检查用户通知偏好
      const userPreferences = user.preferences?.notificationSettings || {};
      const mergedChannel = this.applyUserPreferences(channel, userPreferences);

      // 创建通知
      const notification = await models.Notification.create({
        userId,
        type,
        title,
        content,
        priority,
        channel: mergedChannel,
        metadata,
        relatedId,
        relatedType,
        actionUrl,
        scheduledAt: scheduledAt || new Date(),
        expiresAt
      });

      // 加入处理队列
      this.addToQueue(notification);

      logger.info(`创建通知: ${notification.id} for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 从模板创建通知
   */
  async createNotificationFromTemplate(templateCode, userId, variables = {}, options = {}) {
    try {
      const template = await models.NotificationTemplate.findByCode(templateCode);
      if (!template) {
        throw new NotFoundError(`Notification template not found: ${templateCode}`);
      }

      // 验证变量
      const validation = template.validateVariables(variables);
      if (!validation.isValid) {
        throw new BadRequestError(`Missing required variables: ${validation.missingVariables.join(', ')}`);
      }

      // 渲染模板
      const rendered = template.render(variables);

      // 创建通知数据
      const notificationData = {
        userId,
        type: template.type,
        title: rendered.title,
        content: rendered.content,
        priority: options.priority || template.priority,
        channel: options.channel || template.defaultChannels,
        metadata: {
          ...variables,
          templateCode,
          ...options.metadata
        },
        relatedId: options.relatedId,
        relatedType: options.relatedType,
        actionUrl: options.actionUrl,
        scheduledAt: options.scheduledAt,
        expiresAt: options.expiresAt
      };

      return await this.createNotification(notificationData);
    } catch (error) {
      logger.error('从模板创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建通知
   */
  async createBulkNotifications(notifications) {
    try {
      const results = [];
      for (const notificationData of notifications) {
        try {
          const notification = await this.createNotification(notificationData);
          results.push({ success: true, notification });
        } catch (error) {
          results.push({ success: false, error: error.message, data: notificationData });
        }
      }
      return results;
    } catch (error) {
      logger.error('批量创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(data) {
    try {
      const {
        title,
        content,
        priority = 'normal',
        targetRole = 'all', // all, admin, librarian, reader
        metadata = {}
      } = data;

      let targetUsers = [];

      if (targetRole === 'all') {
        targetUsers = await models.User.findAll({
          where: { status: 'active' },
          attributes: ['id']
        });
      } else {
        targetUsers = await models.User.findAll({
          where: { 
            role: targetRole,
            status: 'active'
          },
          attributes: ['id']
        });
      }

      const notifications = targetUsers.map(user => ({
        userId: user.id,
        type: 'system',
        title,
        content,
        priority,
        channel: { inApp: true },
        metadata: { ...metadata, targetRole }
      }));

      const results = await this.createBulkNotifications(notifications);
      
      // 通过WebSocket广播
      const sampleNotification = results.find(r => r.success)?.notification;
      if (sampleNotification) {
        webSocketService.broadcastSystemNotification(sampleNotification, targetRole);
      }

      return results;
    } catch (error) {
      logger.error('发送系统通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        status = null,
        priority = null,
        unreadOnly = false
      } = options;

      const result = await models.Notification.getByUser(userId, {
        page,
        limit,
        type,
        status,
        priority,
        unreadOnly
      });

      return {
        notifications: result.rows,
        pagination: {
          page,
          limit,
          total: result.count,
          pages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      logger.error('获取用户通知失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await models.Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      if (!notification.isRead) {
        await notification.markAsRead();
        webSocketService.sendUnreadCount(userId);
      }

      return notification;
    } catch (error) {
      logger.error('标记通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId, type = null) {
    try {
      const result = await models.Notification.markAllAsRead(userId, type);
      webSocketService.sendUnreadCount(userId);
      return result;
    } catch (error) {
      logger.error('标记所有通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await models.Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await notification.destroy();
      webSocketService.sendUnreadCount(userId);

      return { success: true };
    } catch (error) {
      logger.error('删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取未读通知计数
   */
  async getUnreadCount(userId) {
    try {
      return await models.Notification.getUnreadCount(userId);
    } catch (error) {
      logger.error('获取未读通知计数失败:', error);
      throw error;
    }
  }

  /**
   * 创建借阅相关通知
   */
  async createBorrowNotification(borrow, type, additionalData = {}) {
    try {
      const templates = {
        'borrow_success': {
          code: 'BORROW_SUCCESS',
          variables: {
            userName: borrow.user.realName || borrow.user.username,
            bookTitle: borrow.book.title,
            dueDate: borrow.dueDate.toLocaleDateString()
          }
        },
        'return_reminder': {
          code: 'RETURN_REMINDER',
          variables: {
            userName: borrow.user.realName || borrow.user.username,
            bookTitle: borrow.book.title,
            dueDate: borrow.dueDate.toLocaleDateString()
          }
        },
        'overdue_warning': {
          code: 'OVERDUE_WARNING',
          variables: {
            userName: borrow.user.realName || borrow.user.username,
            bookTitle: borrow.book.title,
            overdueDays: Math.ceil((new Date() - borrow.dueDate) / (1000 * 60 * 60 * 24))
          }
        }
      };

      const template = templates[type];
      if (!template) {
        throw new BadRequestError(`Unknown borrow notification type: ${type}`);
      }

      const variables = { ...template.variables, ...additionalData };

      return await this.createNotificationFromTemplate(
        template.code,
        borrow.userId,
        variables,
        {
          relatedId: borrow.id,
          relatedType: 'borrow',
          actionUrl: `/borrows/detail/${borrow.id}`
        }
      );
    } catch (error) {
      logger.error('创建借阅通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建图书相关通知
   */
  async createBookNotification(book, users, type, additionalData = {}) {
    try {
      const templates = {
        'book_available': {
          code: 'BOOK_AVAILABLE',
          variables: {
            bookTitle: book.title,
            bookAuthor: book.authors.join(', ')
          }
        },
        'new_book_added': {
          code: 'NEW_BOOK_ADDED',
          variables: {
            bookTitle: book.title,
            bookAuthor: book.authors.join(', '),
            category: book.category
          }
        }
      };

      const template = templates[type];
      if (!template) {
        throw new BadRequestError(`Unknown book notification type: ${type}`);
      }

      const notifications = users.map(userId => ({
        templateCode: template.code,
        userId,
        variables: { ...template.variables, ...additionalData },
        options: {
          relatedId: book.id,
          relatedType: 'book',
          actionUrl: `/books/detail/${book.id}`
        }
      }));

      const results = [];
      for (const notif of notifications) {
        try {
          const notification = await this.createNotificationFromTemplate(
            notif.templateCode,
            notif.userId,
            notif.variables,
            notif.options
          );
          results.push({ success: true, notification });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('创建图书通知失败:', error);
      throw error;
    }
  }

  /**
   * 应用用户通知偏好
   */
  applyUserPreferences(channel, userPreferences) {
    return {
      inApp: channel.inApp !== false, // 应用内通知默认开启
      email: channel.email && userPreferences.email !== false,
      sms: channel.sms && userPreferences.sms !== false,
      push: channel.push && userPreferences.push !== false
    };
  }

  /**
   * 添加到处理队列
   */
  addToQueue(notification) {
    this.processingQueue.push(notification);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 处理通知队列
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
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理单个通知
   */
  async processNotification(notification) {
    try {
      if (!notification.shouldSend()) {
        return;
      }

      const channel = notification.channel;
      let success = false;

      // 发送应用内通知
      if (channel.inApp) {
        try {
          await webSocketService.sendNotificationToUser(notification.userId, notification);
          success = true;
        } catch (error) {
          logger.error('发送应用内通知失败:', error);
        }
      }

      // 发送邮件通知
      if (channel.email && this.emailService) {
        try {
          await this.sendEmailNotification(notification);
          success = true;
        } catch (error) {
          logger.error('发送邮件通知失败:', error);
        }
      }

      // 发送短信通知
      if (channel.sms && this.smsService) {
        try {
          await this.sendSmsNotification(notification);
          success = true;
        } catch (error) {
          logger.error('发送短信通知失败:', error);
        }
      }

      // 发送推送通知
      if (channel.push && this.pushService) {
        try {
          await this.sendPushNotification(notification);
          success = true;
        } catch (error) {
          logger.error('发送推送通知失败:', error);
        }
      }

      // 更新通知状态
      if (success) {
        await notification.markAsSent();
      } else {
        await notification.incrementRetry('All channels failed');
      }

    } catch (error) {
      logger.error('处理通知失败:', error);
      await notification.incrementRetry(error.message);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(notification) {
    if (!this.emailService) {
      throw new Error('Email service not configured');
    }
    
    // 这里实现邮件发送逻辑
    // await this.emailService.send(...)
  }

  /**
   * 发送短信通知
   */
  async sendSmsNotification(notification) {
    if (!this.smsService) {
      throw new Error('SMS service not configured');
    }
    
    // 这里实现短信发送逻辑
    // await this.smsService.send(...)
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(notification) {
    if (!this.pushService) {
      throw new Error('Push service not configured');
    }
    
    // 这里实现推送通知发送逻辑
    // await this.pushService.send(...)
  }

  /**
   * 启动通知处理器
   */
  startNotificationProcessor() {
    // 定期处理待发送的通知
    setInterval(async () => {
      try {
        const pendingNotifications = await models.Notification.getPendingNotifications(50);
        for (const notification of pendingNotifications) {
          this.addToQueue(notification);
        }
      } catch (error) {
        logger.error('获取待发送通知失败:', error);
      }
    }, 30000); // 每30秒检查一次

    // 定期清理过期通知
    setInterval(async () => {
      try {
        await models.Notification.cleanupExpired();
      } catch (error) {
        logger.error('清理过期通知失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 获取通知统计信息
   */
  async getStatistics(startDate, endDate) {
    try {
      return await models.Notification.getStatistics(startDate, endDate);
    } catch (error) {
      logger.error('获取通知统计失败:', error);
      throw error;
    }
  }

  /**
   * 设置外部服务
   */
  setEmailService(service) {
    this.emailService = service;
  }

  setSmsService(service) {
    this.smsService = service;
  }

  setPushService(service) {
    this.pushService = service;
  }
}

// 创建单例实例
const notificationService = new NotificationService();

module.exports = notificationService;