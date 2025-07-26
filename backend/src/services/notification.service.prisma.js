const prisma = require('../utils/prisma');
const { NOTIFICATION_TYPES, NOTIFICATION_STATUS, NOTIFICATION_PRIORITY } = require('../utils/constants');

class NotificationService {
  /**
   * Create a notification
   */
  static async create(notificationData) {
    const {
      user_id,
      type,
      title,
      content,
      priority = 'normal',
      channel = ['in_app'],
      metadata = {},
      related_id,
      related_type,
      action_url,
      expires_at,
      scheduled_at
    } = notificationData;

    return prisma.notifications.create({
      data: {
        user_id: parseInt(user_id),
        type,
        title,
        content,
        priority,
        status: scheduled_at ? 'pending' : 'sent',
        channel,
        metadata,
        related_id: related_id ? parseInt(related_id) : null,
        related_type,
        action_url,
        expires_at,
        scheduled_at,
        sent_at: scheduled_at ? null : new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Create multiple notifications
   */
  static async createBatch(notifications) {
    const notificationsData = notifications.map(notification => ({
      ...notification,
      user_id: parseInt(notification.user_id),
      priority: notification.priority || 'normal',
      status: notification.scheduled_at ? 'pending' : 'sent',
      channel: notification.channel || ['in_app'],
      metadata: notification.metadata || {},
      related_id: notification.related_id ? parseInt(notification.related_id) : null,
      sent_at: notification.scheduled_at ? null : new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }));

    return prisma.notifications.createMany({
      data: notificationsData
    });
  }

  /**
   * Find notifications with pagination
   */
  static async findWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      user_id,
      type,
      status,
      priority,
      is_read,
      orderBy = 'created_at',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    if (user_id) where.user_id = parseInt(user_id);
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (is_read !== undefined) where.is_read = is_read;

    // Exclude deleted notifications
    where.deleted_at = null;

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      prisma.notifications.count({ where })
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find notification by ID
   */
  static async findById(id) {
    return prisma.notifications.findUnique({
      where: { id: parseInt(id) }
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id) {
    return prisma.notifications.update({
      where: { id: parseInt(id) },
      data: {
        is_read: true,
        read_at: new Date(),
        status: 'read',
        updated_at: new Date()
      }
    });
  }

  /**
   * Mark multiple notifications as read
   */
  static async markManyAsRead(ids) {
    return prisma.notifications.updateMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      },
      data: {
        is_read: true,
        read_at: new Date(),
        status: 'read',
        updated_at: new Date()
      }
    });
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllAsRead(userId) {
    return prisma.notifications.updateMany({
      where: {
        user_id: parseInt(userId),
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date(),
        status: 'read',
        updated_at: new Date()
      }
    });
  }

  /**
   * Delete notification (soft delete)
   */
  static async softDelete(id) {
    return prisma.notifications.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Delete multiple notifications
   */
  static async deleteManyByIds(ids) {
    return prisma.notifications.updateMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId) {
    return prisma.notifications.count({
      where: {
        user_id: parseInt(userId),
        is_read: false,
        deleted_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      }
    });
  }

  /**
   * Get user notification statistics
   */
  static async getUserStats(userId) {
    const [total, unread, byType] = await Promise.all([
      prisma.notifications.count({
        where: {
          user_id: parseInt(userId),
          deleted_at: null
        }
      }),
      this.getUnreadCount(userId),
      prisma.notifications.groupBy({
        by: ['type'],
        where: {
          user_id: parseInt(userId),
          deleted_at: null
        },
        _count: true
      })
    ]);

    return {
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {})
    };
  }

  /**
   * Send scheduled notifications
   */
  static async sendScheduledNotifications() {
    const now = new Date();
    
    const notifications = await prisma.notifications.findMany({
      where: {
        scheduled_at: { lte: now },
        status: 'pending',
        deleted_at: null
      }
    });

    const results = [];
    
    for (const notification of notifications) {
      try {
        // Here you would implement actual sending logic
        // For now, just mark as sent
        await prisma.notifications.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sent_at: now,
            updated_at: now
          }
        });
        
        results.push({ id: notification.id, success: true });
      } catch (error) {
        await prisma.notifications.update({
          where: { id: notification.id },
          data: {
            retry_count: { increment: 1 },
            error_message: error.message,
            updated_at: now
          }
        });
        
        results.push({ id: notification.id, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpired() {
    const now = new Date();
    
    return prisma.notifications.updateMany({
      where: {
        expires_at: { lt: now },
        deleted_at: null
      },
      data: {
        deleted_at: now,
        updated_at: now
      }
    });
  }

  /**
   * Create notification from template
   */
  static async createFromTemplate(templateType, userId, variables = {}) {
    // This would load templates from database or config
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
      },
      OVERDUE_WARNING: {
        type: 'overdue_warning',
        title: '逾期警告',
        content: `您借阅的《${variables.bookTitle}》已逾期${variables.overdueDays}天，请尽快归还。`,
        priority: 'urgent'
      },
      POINTS_EARNED: {
        type: 'points_change',
        title: '积分变动',
        content: `恭喜！您因${variables.reason}获得${variables.points}积分。`,
        priority: 'low'
      }
    };

    const template = templates[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    return this.create({
      user_id: userId,
      ...template,
      related_id: variables.related_id,
      related_type: variables.related_type,
      metadata: variables
    });
  }

  /**
   * Send notification to multiple users
   */
  static async broadcast(userIds, notificationData) {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      user_id: userId
    }));

    return this.createBatch(notifications);
  }

  /**
   * Get notification preferences for user
   */
  static async getUserPreferences(userId) {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: {
        preferences: true
      }
    });

    return user?.preferences?.notifications || {
      email: true,
      sms: false,
      push: true,
      dueDateReminder: true,
      overdueNotice: true,
      pointsUpdate: true
    };
  }

  /**
   * Check if should send notification based on user preferences
   */
  static async shouldSendNotification(userId, notificationType, channel) {
    const preferences = await this.getUserPreferences(userId);
    
    // Map notification types to preference keys
    const typeToPreference = {
      'borrow_reminder': 'dueDateReminder',
      'return_reminder': 'dueDateReminder',
      'overdue_warning': 'overdueNotice',
      'points_change': 'pointsUpdate'
    };

    const preferenceKey = typeToPreference[notificationType];
    
    // Check if type is enabled
    if (preferenceKey && !preferences[preferenceKey]) {
      return false;
    }

    // Check if channel is enabled
    if (channel && !preferences[channel]) {
      return false;
    }

    return true;
  }

  /**
   * Archive old notifications
   */
  static async archiveOldNotifications(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.notifications.updateMany({
      where: {
        created_at: { lt: cutoffDate },
        status: { in: ['read', 'sent'] },
        deleted_at: null
      },
      data: {
        status: 'archived',
        updated_at: new Date()
      }
    });
  }
}

module.exports = NotificationService;