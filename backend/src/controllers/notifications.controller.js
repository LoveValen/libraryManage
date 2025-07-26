const notificationService = require('../services/notification.service');
const websocketService = require('../services/websocket.service');
const { ApiError, BadRequestError, NotFoundError, ForbiddenError } = require('../utils/apiError');
const { logger } = require('../utils/logger');

/**
 * 通知控制器
 */
class NotificationsController {
  /**
   * 获取用户通知列表
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        priority,
        unreadOnly = false
      } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status,
        priority,
        unreadOnly: unreadOnly === 'true'
      });

      res.apiSuccess(result);
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      res.apiError(error);
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await notificationService.getUnreadCount(userId);

      res.apiSuccess(result);
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      res.apiError(error);
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(parseInt(id), userId);

      res.apiSuccess(notification);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      res.apiError(error);
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.body;

      const updatedCount = await notificationService.markAllAsRead(userId, type);

      res.apiSuccess({ 
        message: '所有通知已标记为已读',
        updatedCount 
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      res.apiError(error);
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await notificationService.deleteNotification(parseInt(id), userId);

      res.apiSuccess({ message: '通知已删除' });
    } catch (error) {
      logger.error('Failed to delete notification:', error);
      res.apiError(error);
    }
  }

  /**
   * 创建通知（管理员）
   */
  async createNotification(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以创建通知');
      }

      const notificationData = req.body;
      const notification = await notificationService.createNotification(notificationData);

      res.apiSuccess(notification, '通知创建成功', 201);
    } catch (error) {
      logger.error('Failed to create notification:', error);
      res.apiError(error);
    }
  }

  /**
   * 批量创建通知（管理员）
   */
  async createBulkNotifications(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以批量创建通知');
      }

      const { notifications } = req.body;
      const createdNotifications = await notificationService.createBulkNotifications(notifications);

      res.apiSuccess(createdNotifications, '批量通知创建成功', 201);
    } catch (error) {
      logger.error('Failed to create bulk notifications:', error);
      res.apiError(error);
    }
  }

  /**
   * 使用模板创建通知（管理员）
   */
  async createNotificationFromTemplate(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以使用模板创建通知');
      }

      const { templateCode, userId, variables, options = {} } = req.body;
      
      const notification = await notificationService.createNotificationFromTemplate(
        templateCode,
        userId,
        variables,
        options
      );

      res.apiSuccess(notification, '模板通知创建成功', 201);
    } catch (error) {
      logger.error('Failed to create notification from template:', error);
      res.apiError(error);
    }
  }

  /**
   * 发送通知（管理员）
   */
  async sendNotification(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以发送通知');
      }

      const { id } = req.params;
      const success = await notificationService.sendNotification(parseInt(id));

      res.apiSuccess({ 
        success,
        message: success ? '通知发送成功' : '通知发送失败'
      });
    } catch (error) {
      logger.error('Failed to send notification:', error);
      res.apiError(error);
    }
  }

  /**
   * 获取通知统计信息（管理员）
   */
  async getNotificationStatistics(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以查看通知统计');
      }

      const { startDate, endDate } = req.query;
      
      const stats = await notificationService.getNotificationStatistics(
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );

      res.apiSuccess(stats);
    } catch (error) {
      logger.error('Failed to get notification statistics:', error);
      res.apiError(error);
    }
  }

  /**
   * 清理过期通知（管理员）
   */
  async cleanupExpiredNotifications(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以清理过期通知');
      }

      const cleanedCount = await notificationService.cleanupExpiredNotifications();

      res.apiSuccess({ 
        cleanedCount,
        message: `已清理 ${cleanedCount} 条过期通知`
      });
    } catch (error) {
      logger.error('Failed to cleanup expired notifications:', error);
      res.apiError(error);
    }
  }

  /**
   * 处理待发送通知队列（管理员）
   */
  async processPendingNotifications(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以处理通知队列');
      }

      const { batchSize = 50 } = req.body;
      const results = await notificationService.processPendingNotifications(batchSize);

      res.apiSuccess(results);
    } catch (error) {
      logger.error('Failed to process pending notifications:', error);
      res.apiError(error);
    }
  }

  /**
   * 获取在线用户统计（管理员）
   */
  async getOnlineStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以查看在线统计');
      }

      const stats = websocketService.getOnlineStats();
      res.apiSuccess(stats);
    } catch (error) {
      logger.error('Failed to get online stats:', error);
      res.apiError(error);
    }
  }

  /**
   * 获取连接的用户列表（管理员）
   */
  async getConnectedUsers(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以查看连接用户');
      }

      const users = websocketService.getConnectedUsers();
      res.apiSuccess(users);
    } catch (error) {
      logger.error('Failed to get connected users:', error);
      res.apiError(error);
    }
  }

  /**
   * 强制断开用户连接（管理员）
   */
  async disconnectUser(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以断开用户连接');
      }

      const { userId } = req.params;
      const { reason = '管理员操作' } = req.body;

      const disconnectedCount = websocketService.disconnectUser(parseInt(userId), reason);

      res.apiSuccess({ 
        disconnectedCount,
        message: `已断开用户 ${userId} 的 ${disconnectedCount} 个连接`
      });
    } catch (error) {
      logger.error('Failed to disconnect user:', error);
      res.apiError(error);
    }
  }

  /**
   * 广播系统消息（管理员）
   */
  async broadcastSystemMessage(req, res) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenError('只有管理员可以广播系统消息');
      }

      const { message, excludeUsers = [] } = req.body;
      
      const success = websocketService.broadcastSystemMessage(message, excludeUsers);

      res.apiSuccess({ 
        success,
        message: success ? '系统消息广播成功' : '系统消息广播失败'
      });
    } catch (error) {
      logger.error('Failed to broadcast system message:', error);
      res.apiError(error);
    }
  }

  /**
   * 发送测试通知
   */
  async sendTestNotification(req, res) {
    try {
      const userId = req.user.id;
      const { title = '测试通知', content = '这是一条测试通知消息' } = req.body;

      const notification = await notificationService.createNotification({
        userId,
        type: 'system',
        title,
        content,
        priority: 'normal',
        channel: { inApp: true, email: false, sms: false, push: false }
      });

      res.apiSuccess(notification, '测试通知发送成功');
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      res.apiError(error);
    }
  }

  /**
   * 创建系统事件通知（内部使用）
   */
  async createSystemEventNotifications(eventType, eventData) {
    try {
      const notifications = await notificationService.createSystemEventNotifications(eventType, eventData);
      
      logger.info(`Created ${notifications.length} system event notifications`, {
        eventType,
        notificationsCount: notifications.length
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to create system event notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationsController();