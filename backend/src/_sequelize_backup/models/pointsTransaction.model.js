const { DataTypes } = require('sequelize');
const { POINTS_TRANSACTION_TYPES } = require('../utils/constants');

module.exports = (sequelize) => {
  const PointsTransaction = sequelize.define('PointsTransaction', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
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
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    pointsChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'points_change',
      comment: '积分变动值，正数为增加，负数为减少',
    },
    currentBalance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'current_balance',
      comment: '本次交易后的积分余额',
    },
    previousBalance: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'previous_balance',
      comment: '本次交易前的积分余额',
    },
    transactionType: {
      type: DataTypes.ENUM(...Object.values(POINTS_TRANSACTION_TYPES)),
      allowNull: false,
      field: 'transaction_type',
      comment: '交易类型',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '交易描述',
    },
    relatedEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'related_entity_type',
      comment: '关联实体类型，如 book, review, borrow 等',
    },
    relatedEntityId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'related_entity_id',
      comment: '关联实体ID，如图书ID、评论ID、借阅记录ID等',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '附加元数据，如具体操作信息',
    },
    processedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'processed_by',
      comment: '处理此交易的管理员ID（如果是手动调整）',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    batchId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'batch_id',
      comment: '批量操作ID，用于关联同批次的交易',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'reversed'),
      defaultValue: 'completed',
      comment: '交易状态',
    },
    reversalTransactionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'reversal_transaction_id',
      comment: '冲正交易ID（如果此交易被撤销）',
      references: {
        model: 'points_transactions',
        key: 'id',
      },
    },
    originalTransactionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'original_transaction_id',
      comment: '原始交易ID（如果此交易是冲正交易）',
      references: {
        model: 'points_transactions',
        key: 'id',
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: '积分过期时间（如果适用）',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: '操作IP地址',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'user_agent',
      comment: '用户代理信息',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '交易备注',
    },
  }, {
    tableName: 'points_transactions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['transaction_type'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['user_id', 'created_at'],
      },
      {
        fields: ['user_id', 'transaction_type'],
      },
      {
        fields: ['related_entity_type', 'related_entity_id'],
      },
      {
        fields: ['batch_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['processed_by'],
      },
    ],
    hooks: {
      beforeCreate: async (transaction, options) => {
        // 如果没有指定前一余额，计算它
        if (transaction.previousBalance === null || transaction.previousBalance === undefined) {
          transaction.previousBalance = transaction.currentBalance - transaction.pointsChange;
        }

        // 根据关联实体ID自动设置实体类型
        if (transaction.relatedEntityId && !transaction.relatedEntityType) {
          transaction.relatedEntityType = transaction.inferEntityType();
        }
      },
      beforeBulkCreate: (transactions, options) => {
        transactions.forEach(transaction => {
          if (transaction.previousBalance === null || transaction.previousBalance === undefined) {
            transaction.previousBalance = transaction.currentBalance - transaction.pointsChange;
          }
        });
      },
    },
  });

  // 实例方法
  PointsTransaction.prototype.inferEntityType = function() {
    // 根据交易类型推断实体类型
    switch (this.transactionType) {
      case POINTS_TRANSACTION_TYPES.BORROW_BOOK:
      case POINTS_TRANSACTION_TYPES.RETURN_ON_TIME:
      case POINTS_TRANSACTION_TYPES.RETURN_LATE:
        return 'borrow';
      case POINTS_TRANSACTION_TYPES.WRITE_REVIEW:
        return 'review';
      default:
        return null;
    }
  };

  PointsTransaction.prototype.isCredit = function() {
    return this.pointsChange > 0;
  };

  PointsTransaction.prototype.isDebit = function() {
    return this.pointsChange < 0;
  };

  PointsTransaction.prototype.canReverse = function() {
    return this.status === 'completed' && 
           !this.reversalTransactionId && 
           !this.originalTransactionId;
  };

  PointsTransaction.prototype.reverse = async function(reason = 'Manual reversal', processedBy = null) {
    if (!this.canReverse()) {
      throw new Error('Transaction cannot be reversed');
    }

    const { UserPoints } = sequelize.models;
    
    return sequelize.transaction(async (t) => {
      // 创建冲正交易
      const reversalTransaction = await PointsTransaction.create({
        userId: this.userId,
        pointsChange: -this.pointsChange,
        currentBalance: this.previousBalance,
        previousBalance: this.currentBalance,
        transactionType: 'ADMIN_ADJUSTMENT',
        description: `Reversal: ${reason}`,
        processedBy,
        originalTransactionId: this.id,
        status: 'completed',
      }, { transaction: t });

      // 更新原交易记录
      this.status = 'reversed';
      this.reversalTransactionId = reversalTransaction.id;
      await this.save({ transaction: t });

      // 更新用户积分余额
      const userPoints = await UserPoints.findByPk(this.userId, { transaction: t });
      if (userPoints) {
        userPoints.balance = this.previousBalance;
        if (this.isCredit()) {
          userPoints.totalEarned -= this.pointsChange;
        } else {
          userPoints.totalSpent -= Math.abs(this.pointsChange);
        }
        userPoints.lastTransactionAt = new Date();
        userPoints.calculateLevel();
        await userPoints.save({ transaction: t });
      }

      return reversalTransaction;
    });
  };

  PointsTransaction.prototype.getRelatedEntity = async function() {
    if (!this.relatedEntityType || !this.relatedEntityId) {
      return null;
    }

    const modelName = this.relatedEntityType.charAt(0).toUpperCase() + this.relatedEntityType.slice(1);
    const model = sequelize.models[modelName];
    
    if (!model) {
      return null;
    }

    return model.findByPk(this.relatedEntityId);
  };

  // 类方法
  PointsTransaction.getUserHistory = async function(userId, options = {}) {
    const {
      transactionType,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = options;

    const where = {
      userId,
      status: 'completed',
    };

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[sequelize.Sequelize.Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[sequelize.Sequelize.Op.lte] = new Date(endDate);
      }
    }

    return this.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: sequelize.models.User,
          as: 'processedByUser',
          attributes: ['id', 'username', 'realName'],
          required: false,
        },
      ],
    });
  };

  PointsTransaction.getTransactionSummary = async function(userId, period = 'month') {
    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // 从开始时间
    }

    const summary = await this.findAll({
      where: {
        userId,
        status: 'completed',
        createdAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'transaction_type',
        [sequelize.fn('SUM', sequelize.col('points_change')), 'totalChange'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('AVG', sequelize.col('points_change')), 'averageChange'],
      ],
      group: ['transaction_type'],
      raw: true,
    });

    // 计算总的收入和支出
    const totals = await this.findOne({
      where: {
        userId,
        status: 'completed',
        createdAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN points_change > 0 THEN points_change ELSE 0 END')
        ), 'totalEarned'],
        [sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END')
        ), 'totalSpent'],
        [sequelize.fn('SUM', sequelize.col('points_change')), 'netChange'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
      ],
      raw: true,
    });

    return {
      period,
      startDate,
      endDate,
      summary,
      totals,
    };
  };

  PointsTransaction.getSystemStatistics = async function(period = 'month') {
    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const stats = await this.findOne({
      where: {
        status: 'completed',
        createdAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'activeUsers'],
        [sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN points_change > 0 THEN points_change ELSE 0 END')
        ), 'totalPointsIssued'],
        [sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END')
        ), 'totalPointsRedeemed'],
        [sequelize.fn('AVG', sequelize.col('points_change')), 'averageTransaction'],
      ],
      raw: true,
    });

    // 按交易类型分组统计
    const byType = await this.findAll({
      where: {
        status: 'completed',
        createdAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'transaction_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('points_change')), 'totalPoints'],
      ],
      group: ['transaction_type'],
      raw: true,
    });

    return {
      period,
      startDate,
      endDate,
      overview: stats,
      byType,
    };
  };

  PointsTransaction.createBatchTransactions = async function(transactions, batchId = null) {
    if (!batchId) {
      batchId = require('uuid').v4();
    }

    const transactionsWithBatch = transactions.map(tx => ({
      ...tx,
      batchId,
      status: 'completed',
    }));

    return sequelize.transaction(async (t) => {
      const createdTransactions = await this.bulkCreate(transactionsWithBatch, {
        transaction: t,
        returning: true,
      });

      // 更新所有相关用户的积分余额
      const userUpdates = new Map();
      
      for (const tx of createdTransactions) {
        if (!userUpdates.has(tx.userId)) {
          userUpdates.set(tx.userId, {
            pointsChange: 0,
            earned: 0,
            spent: 0,
          });
        }
        
        const update = userUpdates.get(tx.userId);
        update.pointsChange += tx.pointsChange;
        
        if (tx.pointsChange > 0) {
          update.earned += tx.pointsChange;
        } else {
          update.spent += Math.abs(tx.pointsChange);
        }
      }

      // 批量更新用户积分
      const { UserPoints } = sequelize.models;
      const updatePromises = Array.from(userUpdates.entries()).map(async ([userId, update]) => {
        const userPoints = await UserPoints.findOrCreateForUser(userId, t);
        userPoints.balance += update.pointsChange;
        userPoints.totalEarned += update.earned;
        userPoints.totalSpent += update.spent;
        userPoints.lastTransactionAt = new Date();
        userPoints.calculateLevel();
        await userPoints.save({ transaction: t });
      });

      await Promise.all(updatePromises);

      return {
        batchId,
        transactions: createdTransactions,
        affectedUsers: userUpdates.size,
      };
    });
  };

  return PointsTransaction;
};