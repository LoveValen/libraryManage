const { DataTypes } = require('sequelize');

/**
 * 通知模型定义
 * @param {Sequelize} sequelize - Sequelize实例
 * @returns {Model} Notification模型
 */
module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '通知ID'
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: '接收用户ID',
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM([
        'system',           // 系统通知
        'borrow_reminder',  // 借阅提醒
        'return_reminder',  // 归还提醒
        'overdue_warning',  // 逾期警告
        'reservation',      // 预约通知
        'review_reply',     // 书评回复
        'points_change',    // 积分变化
        'book_available',   // 图书可借
        'maintenance',      // 系统维护
        'announcement',     // 公告通知
        'chat_message',     // 聊天消息
        'admin_alert'       // 管理员告警
      ]),
      allowNull: false,
      comment: '通知类型'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '通知标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '通知内容'
    },
    priority: {
      type: DataTypes.ENUM(['low', 'normal', 'high', 'urgent']),
      defaultValue: 'normal',
      comment: '优先级'
    },
    status: {
      type: DataTypes.ENUM(['pending', 'sent', 'read', 'archived']),
      defaultValue: 'pending',
      comment: '通知状态'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否已读'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '阅读时间'
    },
    channel: {
      type: DataTypes.JSON,
      defaultValue: {
        inApp: true,      // 应用内通知
        email: false,     // 邮件通知
        sms: false,       // 短信通知
        push: false       // 推送通知
      },
      comment: '发送渠道配置'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '附加元数据',
      get() {
        const value = this.getDataValue('metadata');
        return value || {};
      }
    },
    relatedId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '关联对象ID（如借阅记录ID、图书ID等）'
    },
    relatedType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '关联对象类型（如borrow、book、user等）'
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '操作链接'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '过期时间'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '计划发送时间'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '实际发送时间'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '重试次数'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误信息'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['user_id', 'status']
      },
      {
        fields: ['type', 'priority']
      },
      {
        fields: ['scheduled_at']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['related_id', 'related_type']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: (notification) => {
        // 设置默认过期时间（30天）
        if (!notification.expiresAt) {
          notification.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        // 设置计划发送时间
        if (!notification.scheduledAt) {
          notification.scheduledAt = new Date();
        }
      },
      
      beforeUpdate: (notification) => {
        // 标记为已读时设置阅读时间
        if (notification.changed('isRead') && notification.isRead && !notification.readAt) {
          notification.readAt = new Date();
        }
        
        // 发送时设置发送时间
        if (notification.changed('status') && notification.status === 'sent' && !notification.sentAt) {
          notification.sentAt = new Date();
        }
      }
    }
  });

  // 实例方法
  Notification.prototype.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    this.status = 'read';
    return this.save();
  };

  Notification.prototype.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    return this.save();
  };

  Notification.prototype.archive = function() {
    this.status = 'archived';
    return this.save();
  };

  Notification.prototype.incrementRetry = function(errorMessage = null) {
    this.retryCount += 1;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
    return this.save();
  };

  Notification.prototype.canRetry = function() {
    return this.retryCount < 3 && this.status === 'pending';
  };

  Notification.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Notification.prototype.shouldSend = function() {
    const now = new Date();
    return this.status === 'pending' && 
           this.scheduledAt <= now && 
           !this.isExpired() &&
           this.canRetry();
  };

  // 类方法
  Notification.getUnreadCount = async function(userId) {
    return await this.count({
      where: {
        userId,
        isRead: false,
        status: { [sequelize.Sequelize.Op.in]: ['sent', 'read'] }
      }
    });
  };

  Notification.getByUser = async function(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      status = null,
      priority = null,
      unreadOnly = false
    } = options;

    const where = { userId };
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (unreadOnly) where.isRead = false;

    return await this.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  };

  Notification.markAllAsRead = async function(userId, type = null) {
    const where = { 
      userId, 
      isRead: false 
    };
    
    if (type) where.type = type;

    return await this.update({
      isRead: true,
      readAt: new Date(),
      status: 'read'
    }, {
      where
    });
  };

  Notification.cleanupExpired = async function() {
    const expiredNotifications = await this.findAll({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        },
        status: {
          [sequelize.Sequelize.Op.ne]: 'archived'
        }
      }
    });

    for (const notification of expiredNotifications) {
      await notification.archive();
    }

    return expiredNotifications.length;
  };

  Notification.getPendingNotifications = async function(limit = 100) {
    return await this.findAll({
      where: {
        status: 'pending',
        scheduledAt: {
          [sequelize.Sequelize.Op.lte]: new Date()
        },
        retryCount: {
          [sequelize.Sequelize.Op.lt]: 3
        }
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phone', 'preferences']
      }],
      limit,
      order: [
        ['priority', 'DESC'],
        ['scheduledAt', 'ASC']
      ]
    });
  };

  Notification.getStatistics = async function(startDate, endDate) {
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const [totalCount, typeStats, statusStats, priorityStats] = await Promise.all([
      this.count({ where }),
      this.findAll({
        where,
        attributes: [
          'type',
          [sequelize.Sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['type'],
        raw: true
      }),
      this.findAll({
        where,
        attributes: [
          'status',
          [sequelize.Sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      this.findAll({
        where,
        attributes: [
          'priority',
          [sequelize.Sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['priority'],
        raw: true
      })
    ]);

    return {
      total: totalCount,
      byType: typeStats,
      byStatus: statusStats,
      byPriority: priorityStats
    };
  };

  return Notification;
};