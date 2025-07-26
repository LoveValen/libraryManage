const { DataTypes } = require('sequelize');
const { USER_LEVELS } = require('../utils/constants');

module.exports = (sequelize) => {
  const UserPoints = sequelize.define('UserPoints', {
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '当前积分余额',
      validate: {
        min: 0,
      },
    },
    totalEarned: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'total_earned',
      comment: '历史总获得积分',
    },
    totalSpent: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'total_spent',
      comment: '历史总消费积分',
    },
    level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'NEWCOMER',
      comment: '用户等级',
    },
    levelName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '新手读者',
      field: 'level_name',
      comment: '等级名称',
    },
    nextLevelPoints: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'next_level_points',
      comment: '升级到下一等级所需积分',
    },
    progressToNextLevel: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      field: 'progress_to_next_level',
      comment: '升级进度百分比',
    },
    lastTransactionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_transaction_at',
      comment: '最后一次积分变动时间',
    },
    // 统计字段
    borrowPoints: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'borrow_points',
      comment: '借阅获得的积分',
    },
    reviewPoints: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'review_points',
      comment: '书评获得的积分',
    },
    bonusPoints: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'bonus_points',
      comment: '奖励获得的积分',
    },
    penaltyPoints: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'penalty_points',
      comment: '被扣除的积分',
    },
    // 徽章相关
    badgeCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'badge_count',
      comment: '获得的徽章数量',
    },
    // 排名相关
    rankPosition: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'rank_position',
      comment: '积分排名位置',
    },
    lastRankUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_rank_update',
      comment: '最后排名更新时间',
    },
  }, {
    tableName: 'user_points',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['balance'],
      },
      {
        fields: ['level'],
      },
      {
        fields: ['rank_position'],
      },
      {
        fields: ['total_earned'],
      },
      {
        fields: ['last_transaction_at'],
      },
    ],
    hooks: {
      beforeSave: async (userPoints, options) => {
        // 根据积分余额计算用户等级
        userPoints.calculateLevel();
      },
      afterUpdate: async (userPoints, options) => {
        // 如果积分发生变化，更新最后交易时间
        if (userPoints.changed('balance')) {
          userPoints.lastTransactionAt = new Date();
          // 注意：这里不能再次调用save，会导致无限循环
          // 应该在调用此hook的地方处理
        }
      },
    },
  });

  // 实例方法
  UserPoints.prototype.calculateLevel = function() {
    const currentBalance = this.balance;
    
    for (const [levelKey, levelConfig] of Object.entries(USER_LEVELS)) {
      if (currentBalance >= levelConfig.min && currentBalance <= levelConfig.max) {
        this.level = levelKey;
        this.levelName = levelConfig.name;
        
        // 计算到下一等级的进度
        const nextLevelEntry = Object.entries(USER_LEVELS).find(
          ([key, config]) => config.min > levelConfig.max
        );
        
        if (nextLevelEntry) {
          const [nextLevelKey, nextLevelConfig] = nextLevelEntry;
          this.nextLevelPoints = nextLevelConfig.min;
          
          const currentLevelRange = levelConfig.max - levelConfig.min + 1;
          const currentProgress = currentBalance - levelConfig.min;
          this.progressToNextLevel = (currentProgress / currentLevelRange) * 100;
        } else {
          // 已经是最高等级
          this.nextLevelPoints = null;
          this.progressToNextLevel = 100;
        }
        
        break;
      }
    }
  };

  UserPoints.prototype.addPoints = async function(points, transactionType, description, relatedEntityId = null, transaction = null) {
    if (points <= 0) {
      throw new Error('Points must be positive');
    }

    const { PointsTransaction } = sequelize.models;
    
    // 在事务中执行
    const executeInTransaction = async (t) => {
      // 更新余额和统计
      this.balance += points;
      this.totalEarned += points;
      this.lastTransactionAt = new Date();
      
      // 根据交易类型更新分类统计
      this.updateCategoryPoints(transactionType, points);
      
      // 重新计算等级
      this.calculateLevel();
      
      // 保存用户积分记录
      await this.save({ transaction: t });
      
      // 创建积分流水记录
      const pointsTransaction = await PointsTransaction.create({
        userId: this.userId,
        pointsChange: points,
        currentBalance: this.balance,
        transactionType,
        description,
        relatedEntityId,
      }, { transaction: t });
      
      return pointsTransaction;
    };

    if (transaction) {
      return executeInTransaction(transaction);
    } else {
      return sequelize.transaction(executeInTransaction);
    }
  };

  UserPoints.prototype.deductPoints = async function(points, transactionType, description, relatedEntityId = null, transaction = null) {
    if (points <= 0) {
      throw new Error('Points must be positive');
    }

    if (this.balance < points) {
      throw new Error('Insufficient points');
    }

    const { PointsTransaction } = sequelize.models;
    
    // 在事务中执行
    const executeInTransaction = async (t) => {
      // 更新余额和统计
      this.balance -= points;
      this.totalSpent += points;
      this.penaltyPoints += points;
      this.lastTransactionAt = new Date();
      
      // 重新计算等级
      this.calculateLevel();
      
      // 保存用户积分记录
      await this.save({ transaction: t });
      
      // 创建积分流水记录（负数）
      const pointsTransaction = await PointsTransaction.create({
        userId: this.userId,
        pointsChange: -points,
        currentBalance: this.balance,
        transactionType,
        description,
        relatedEntityId,
      }, { transaction: t });
      
      return pointsTransaction;
    };

    if (transaction) {
      return executeInTransaction(transaction);
    } else {
      return sequelize.transaction(executeInTransaction);
    }
  };

  UserPoints.prototype.updateCategoryPoints = function(transactionType, points) {
    switch (transactionType) {
      case 'BORROW_BOOK':
      case 'RETURN_ON_TIME':
        this.borrowPoints += points;
        break;
      case 'WRITE_REVIEW':
        this.reviewPoints += points;
        break;
      case 'BONUS_REWARD':
      case 'COMPLETE_TUTORIAL':
        this.bonusPoints += points;
        break;
    }
  };

  UserPoints.prototype.canAfford = function(points) {
    return this.balance >= points;
  };

  UserPoints.prototype.getProgressToNextLevel = function() {
    return {
      currentLevel: this.level,
      currentLevelName: this.levelName,
      currentPoints: this.balance,
      nextLevelPoints: this.nextLevelPoints,
      progress: this.progressToNextLevel,
      pointsNeeded: this.nextLevelPoints ? this.nextLevelPoints - this.balance : 0,
    };
  };

  UserPoints.prototype.updateBadgeCount = async function() {
    const { UserBadge } = sequelize.models;
    const count = await UserBadge.count({
      where: { userId: this.userId },
    });
    
    this.badgeCount = count;
    await this.save({ fields: ['badgeCount'] });
  };

  // 类方法
  UserPoints.findOrCreateForUser = async function(userId, transaction = null) {
    const [userPoints, created] = await this.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        level: 'NEWCOMER',
        levelName: '新手读者',
      },
      transaction,
    });

    if (created) {
      userPoints.calculateLevel();
      await userPoints.save({ transaction });
    }

    return userPoints;
  };

  UserPoints.getLeaderboard = async function(limit = 50, period = 'all') {
    let whereClause = {};
    
    if (period === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      whereClause.lastTransactionAt = {
        [sequelize.Sequelize.Op.gte]: startOfMonth,
      };
    } else if (period === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      whereClause.lastTransactionAt = {
        [sequelize.Sequelize.Op.gte]: startOfWeek,
      };
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatar'],
          where: {
            isDeleted: false,
            status: 'active',
          },
        },
      ],
      order: [['balance', 'DESC']],
      limit,
    });
  };

  UserPoints.updateRankings = async function() {
    const users = await this.findAll({
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          where: {
            isDeleted: false,
            status: 'active',
          },
        },
      ],
      order: [['balance', 'DESC']],
    });

    const updatePromises = users.map((userPoints, index) => {
      userPoints.rankPosition = index + 1;
      userPoints.lastRankUpdate = new Date();
      return userPoints.save({ fields: ['rankPosition', 'lastRankUpdate'] });
    });

    await Promise.all(updatePromises);
    
    return users.length;
  };

  UserPoints.getStatistics = async function() {
    const stats = await this.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'totalUsers'],
        [sequelize.fn('SUM', sequelize.col('balance')), 'totalPoints'],
        [sequelize.fn('AVG', sequelize.col('balance')), 'averagePoints'],
        [sequelize.fn('MAX', sequelize.col('balance')), 'highestPoints'],
        [sequelize.fn('SUM', sequelize.col('total_earned')), 'totalEarnedPoints'],
        [sequelize.fn('SUM', sequelize.col('total_spent')), 'totalSpentPoints'],
      ],
      raw: true,
    });

    // 获取等级分布
    const levelDistribution = await this.findAll({
      attributes: [
        'level',
        'level_name',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count'],
      ],
      group: ['level', 'level_name'],
      raw: true,
    });

    return {
      ...stats,
      levelDistribution,
    };
  };

  return UserPoints;
};