const { DataTypes } = require('sequelize');
const { BORROW_STATUS, BORROW_RULES } = require('../utils/constants');

module.exports = (sequelize) => {
  const Borrow = sequelize.define('Borrow', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    bookId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'book_id',
      references: {
        model: 'books',
        key: 'id',
      },
    },
    borrowDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'borrow_date',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'due_date',
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'return_date',
    },
    actualReturnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'actual_return_date',
      comment: '实际归还日期（考虑处理延迟）',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BORROW_STATUS)),
      allowNull: false,
      defaultValue: BORROW_STATUS.BORROWED,
    },
    borrowDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: BORROW_RULES.DEFAULT_BORROW_DAYS,
      field: 'borrow_days',
      comment: '借阅天数',
    },
    renewalCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'renewal_count',
      comment: '续借次数',
    },
    maxRenewals: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: BORROW_RULES.MAX_RENEWAL_TIMES,
      field: 'max_renewals',
      comment: '最大续借次数',
    },
    overdueDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'overdue_days',
      comment: '逾期天数',
    },
    fine: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: '罚金',
    },
    finePaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'fine_paid',
      comment: '罚金是否已支付',
    },
    condition: {
      type: DataTypes.ENUM('good', 'damaged', 'lost'),
      defaultValue: 'good',
      comment: '归还时图书状况',
    },
    damageDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'damage_description',
      comment: '损坏描述',
    },
    returnNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'return_notes',
      comment: '归还备注',
    },
    borrowNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'borrow_notes',
      comment: '借阅备注',
    },
    notificationsSent: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'notifications_sent',
      comment: '已发送的通知记录',
    },
    pointsEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'points_earned',
      comment: '此次借阅获得的积分',
    },
    pointsDeducted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'points_deducted',
      comment: '此次借阅扣除的积分',
    },
    // 管理员操作相关
    processedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'processed_by',
      comment: '处理此借阅的管理员ID',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    borrowLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'borrow_location',
      comment: '借阅地点',
    },
    returnLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'return_location',
      comment: '归还地点',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
    },
  }, {
    tableName: 'borrows',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['book_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['borrow_date'],
      },
      {
        fields: ['due_date'],
      },
      {
        fields: ['return_date'],
      },
      {
        fields: ['user_id', 'status'],
      },
      {
        fields: ['book_id', 'status'],
      },
      {
        unique: true,
        fields: ['user_id', 'book_id'],
        where: {
          status: BORROW_STATUS.BORROWED,
          is_deleted: false,
        },
        name: 'unique_active_borrow',
      },
    ],
    hooks: {
      beforeCreate: async (borrow, options) => {
        // 设置到期日期
        if (!borrow.dueDate) {
          const dueDate = new Date(borrow.borrowDate);
          dueDate.setDate(dueDate.getDate() + borrow.borrowDays);
          borrow.dueDate = dueDate;
        }
      },
      beforeSave: async (borrow, options) => {
        // 计算逾期天数
        if (borrow.status === BORROW_STATUS.RETURNED && borrow.returnDate) {
          const dueDate = new Date(borrow.dueDate);
          const returnDate = new Date(borrow.returnDate);
          
          if (returnDate > dueDate) {
            const timeDiff = returnDate.getTime() - dueDate.getTime();
            borrow.overdueDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (borrow.overdueDays > 0) {
              borrow.status = BORROW_STATUS.OVERDUE;
            }
          }
        }
        
        // 检查是否逾期
        if (borrow.status === BORROW_STATUS.BORROWED) {
          const now = new Date();
          const dueDate = new Date(borrow.dueDate);
          
          if (now > dueDate) {
            const timeDiff = now.getTime() - dueDate.getTime();
            const overdueDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (overdueDays > 0) {
              borrow.overdueDays = overdueDays;
              borrow.status = BORROW_STATUS.OVERDUE;
            }
          }
        }
      },
      afterCreate: async (borrow, options) => {
        // 更新图书库存
        const { Book } = sequelize.models;
        const book = await Book.findByPk(borrow.bookId);
        if (book) {
          await book.borrowCopy();
        }
      },
      afterUpdate: async (borrow, options) => {
        // 如果状态更新为已归还，更新图书库存
        if (borrow.changed('status') && borrow.status === BORROW_STATUS.RETURNED) {
          const { Book } = sequelize.models;
          const book = await Book.findByPk(borrow.bookId);
          if (book) {
            await book.returnCopy();
          }
        }
      },
    },
  });

  // 实例方法
  Borrow.prototype.isOverdue = function() {
    if (this.status === BORROW_STATUS.RETURNED) {
      return this.overdueDays > 0;
    }
    
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    return now > dueDate;
  };

  Borrow.prototype.getDaysRemaining = function() {
    if (this.status === BORROW_STATUS.RETURNED) {
      return 0;
    }
    
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysRemaining);
  };

  Borrow.prototype.getOverdueDays = function() {
    if (this.status === BORROW_STATUS.RETURNED) {
      return this.overdueDays;
    }
    
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    
    if (now <= dueDate) {
      return 0;
    }
    
    const timeDiff = now.getTime() - dueDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  Borrow.prototype.canRenew = function() {
    return this.status === BORROW_STATUS.BORROWED && 
           this.renewalCount < this.maxRenewals &&
           !this.isOverdue();
  };

  Borrow.prototype.renew = async function(days = BORROW_RULES.RENEWAL_DAYS) {
    if (!this.canRenew()) {
      throw new Error('Cannot renew this borrow');
    }
    
    const newDueDate = new Date(this.dueDate);
    newDueDate.setDate(newDueDate.getDate() + days);
    
    this.dueDate = newDueDate;
    this.renewalCount += 1;
    this.borrowDays += days;
    
    await this.save({
      fields: ['dueDate', 'renewalCount', 'borrowDays'],
    });
    
    return this;
  };

  Borrow.prototype.returnBook = async function(condition = 'good', notes = '', processedBy = null) {
    if (this.status === BORROW_STATUS.RETURNED) {
      throw new Error('Book already returned');
    }
    
    this.returnDate = new Date();
    this.actualReturnDate = new Date();
    this.status = BORROW_STATUS.RETURNED;
    this.condition = condition;
    this.returnNotes = notes;
    this.processedBy = processedBy;
    
    // 计算逾期天数和罚金
    if (this.isOverdue()) {
      this.overdueDays = this.getOverdueDays();
      // 这里可以根据逾期天数计算罚金
      // this.fine = this.overdueDays * dailyFineRate;
    }
    
    await this.save();
    return this;
  };

  Borrow.prototype.markAsLost = async function(notes = '', processedBy = null) {
    this.status = BORROW_STATUS.LOST;
    this.condition = 'lost';
    this.damageDescription = notes;
    this.processedBy = processedBy;
    
    await this.save();
    return this;
  };

  Borrow.prototype.markAsDamaged = async function(description = '', processedBy = null) {
    this.status = BORROW_STATUS.DAMAGED;
    this.condition = 'damaged';
    this.damageDescription = description;
    this.processedBy = processedBy;
    
    await this.save();
    return this;
  };

  Borrow.prototype.addNotificationRecord = async function(type, sentAt = new Date()) {
    const notifications = [...(this.notificationsSent || [])];
    notifications.push({
      type,
      sentAt: sentAt.toISOString(),
    });
    
    this.notificationsSent = notifications;
    await this.save({ fields: ['notificationsSent'] });
  };

  // 类方法
  Borrow.getActiveByUser = async function(userId) {
    return this.findAll({
      where: {
        userId,
        status: {
          [sequelize.Sequelize.Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE],
        },
        isDeleted: false,
      },
      include: [
        {
          model: sequelize.models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'coverImage', 'isbn'],
        },
      ],
      order: [['borrowDate', 'DESC']],
    });
  };

  Borrow.getOverdueRecords = async function(graceDays = BORROW_RULES.OVERDUE_GRACE_DAYS) {
    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() - graceDays);
    
    return this.findAll({
      where: {
        status: {
          [sequelize.Sequelize.Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE],
        },
        dueDate: {
          [sequelize.Sequelize.Op.lt]: gracePeriod,
        },
        isDeleted: false,
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'realName'],
        },
        {
          model: sequelize.models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn'],
        },
      ],
    });
  };

  Borrow.getDueSoonRecords = async function(reminderDays = 3) {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + reminderDays);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.findAll({
      where: {
        status: BORROW_STATUS.BORROWED,
        dueDate: {
          [sequelize.Sequelize.Op.between]: [today, reminderDate],
        },
        isDeleted: false,
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'realName'],
        },
        {
          model: sequelize.models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn'],
        },
      ],
    });
  };

  Borrow.getStatistics = async function() {
    const total = await this.count({
      where: { isDeleted: false },
    });
    
    const active = await this.count({
      where: {
        status: {
          [sequelize.Sequelize.Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE],
        },
        isDeleted: false,
      },
    });
    
    const overdue = await this.count({
      where: {
        status: BORROW_STATUS.OVERDUE,
        isDeleted: false,
      },
    });
    
    const returned = await this.count({
      where: {
        status: BORROW_STATUS.RETURNED,
        isDeleted: false,
      },
    });
    
    const thisMonth = await this.count({
      where: {
        borrowDate: {
          [sequelize.Sequelize.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        isDeleted: false,
      },
    });

    return {
      total,
      active,
      overdue,
      returned,
      thisMonth,
      overdueRate: active > 0 ? ((overdue / active) * 100).toFixed(2) : 0,
    };
  };

  Borrow.getUserBorrowHistory = async function(userId, options = {}) {
    const {
      status,
      limit = 20,
      offset = 0,
      sortBy = 'borrowDate',
      sortOrder = 'DESC',
    } = options;

    const where = {
      userId,
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    return this.findAndCountAll({
      where,
      include: [
        {
          model: sequelize.models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'coverImage', 'isbn'],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });
  };

  return Borrow;
};