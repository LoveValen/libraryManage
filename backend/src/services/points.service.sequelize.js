const { models } = require('../models');
const { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError,
  InsufficientPointsError 
} = require('../utils/apiError');
const { 
  POINTS_TRANSACTION_TYPES, 
  POINTS_RULES, 
  USER_LEVELS 
} = require('../utils/constants');

/**
 * 积分服务类
 */
class PointsService {
  /**
   * 获取用户积分信息
   */
  async getUserPoints(userId) {
    // 验证用户是否存在
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 获取或创建用户积分记录
    const userPoints = await models.UserPoints.findOrCreateForUser(userId);
    
    // 获取用户等级信息
    const level = this.calculateUserLevel(userPoints.totalPoints);
    
    return {
      ...userPoints.toJSON(),
      level,
    };
  }

  /**
   * 添加积分
   */
  async addPoints(userId, points, type, description, operatorId = null, metadata = {}) {
    if (points <= 0) {
      throw new BadRequestError('积分数量必须大于0');
    }

    // 验证用户是否存在
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 验证操作员（如果提供）
    let operator = null;
    if (operatorId) {
      operator = await models.User.findByPk(operatorId);
      if (!operator) {
        throw new NotFoundError('操作员不存在');
      }
    }

    // 使用事务确保数据一致性
    const transaction = await models.sequelize.transaction();
    
    try {
      // 获取或创建用户积分记录
      const userPoints = await models.UserPoints.findOrCreateForUser(userId, { transaction });
      
      // 更新积分
      await userPoints.addPoints(points, { transaction });
      
      // 创建积分交易记录
      const pointsTransaction = await models.PointsTransaction.create({
        userId,
        type,
        amount: points,
        description,
        processedBy: operatorId,
        metadata,
        status: 'completed',
      }, { transaction });

      // 检查是否达到新等级
      const oldLevel = this.calculateUserLevel(userPoints.totalPoints - points);
      const newLevel = this.calculateUserLevel(userPoints.totalPoints);
      
      if (newLevel.name !== oldLevel.name) {
        // 用户升级，可以在这里添加升级奖励或通知
        console.log(`用户 ${userId} 从 ${oldLevel.name} 升级到 ${newLevel.name}`);
        
        // 可以添加升级奖励
        const levelBonus = this.calculateLevelBonus(newLevel);
        if (levelBonus > 0) {
          await userPoints.addPoints(levelBonus, { transaction });
          
          await models.PointsTransaction.create({
            userId,
            type: POINTS_TRANSACTION_TYPES.BONUS_REWARD,
            amount: levelBonus,
            description: `升级到${newLevel.name}奖励`,
            processedBy: operatorId,
            metadata: { levelUp: true, newLevel: newLevel.name },
            status: 'completed',
          }, { transaction });
        }
      }

      await transaction.commit();
      
      return {
        transaction: pointsTransaction,
        userPoints: await this.getUserPoints(userId),
        levelChange: newLevel.name !== oldLevel.name ? { from: oldLevel, to: newLevel } : null,
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 扣除积分
   */
  async deductPoints(userId, points, type, description, operatorId = null, metadata = {}) {
    if (points <= 0) {
      throw new BadRequestError('积分数量必须大于0');
    }

    // 验证用户是否存在
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 获取用户积分记录
    const userPoints = await models.UserPoints.findOrCreateForUser(userId);
    
    // 检查积分是否足够
    if (userPoints.currentPoints < points) {
      throw new InsufficientPointsError('积分不足');
    }

    // 使用事务确保数据一致性
    const transaction = await models.sequelize.transaction();
    
    try {
      // 扣除积分
      await userPoints.deductPoints(points, { transaction });
      
      // 创建积分交易记录
      const pointsTransaction = await models.PointsTransaction.create({
        userId,
        type,
        amount: -points,
        description,
        processedBy: operatorId,
        metadata,
        status: 'completed',
      }, { transaction });

      await transaction.commit();
      
      return {
        transaction: pointsTransaction,
        userPoints: await this.getUserPoints(userId),
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 转移积分
   */
  async transferPoints(fromUserId, toUserId, points, description, operatorId = null) {
    if (points <= 0) {
      throw new BadRequestError('积分数量必须大于0');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestError('不能向自己转移积分');
    }

    // 验证用户是否存在
    const [fromUser, toUser] = await Promise.all([
      models.User.findByPk(fromUserId),
      models.User.findByPk(toUserId),
    ]);

    if (!fromUser) {
      throw new NotFoundError('转出用户不存在');
    }
    if (!toUser) {
      throw new NotFoundError('转入用户不存在');
    }

    // 检查转出用户积分是否足够
    const fromUserPoints = await models.UserPoints.findOrCreateForUser(fromUserId);
    if (fromUserPoints.currentPoints < points) {
      throw new InsufficientPointsError('积分不足');
    }

    // 使用事务确保原子性
    const transaction = await models.sequelize.transaction();
    
    try {
      // 扣除转出用户积分
      await fromUserPoints.deductPoints(points, { transaction });
      
      // 增加转入用户积分
      const toUserPoints = await models.UserPoints.findOrCreateForUser(toUserId, { transaction });
      await toUserPoints.addPoints(points, { transaction });
      
      // 创建转出记录
      const deductTransaction = await models.PointsTransaction.create({
        userId: fromUserId,
        type: POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        amount: -points,
        description: `向用户${toUser.realName || toUser.username}转出积分: ${description}`,
        processedBy: operatorId,
        metadata: { transferTo: toUserId, transferType: 'outgoing' },
        status: 'completed',
      }, { transaction });

      // 创建转入记录
      const addTransaction = await models.PointsTransaction.create({
        userId: toUserId,
        type: POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        amount: points,
        description: `来自用户${fromUser.realName || fromUser.username}的积分转入: ${description}`,
        processedBy: operatorId,
        metadata: { transferFrom: fromUserId, transferType: 'incoming' },
        status: 'completed',
      }, { transaction });

      await transaction.commit();
      
      return {
        fromUser: await this.getUserPoints(fromUserId),
        toUser: await this.getUserPoints(toUserId),
        transactions: [deductTransaction, addTransaction],
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取积分交易历史
   */
  async getPointsHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate,
      includeOperator = false,
    } = options;

    // 验证用户是否存在
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const where = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [models.sequelize.Op.between]: [startDate, endDate],
      };
    }

    const include = [];
    if (includeOperator) {
      include.push({
        model: models.User,
        as: 'processedByUser',
        attributes: ['id', 'username', 'realName'],
      });
    }

    const offset = (page - 1) * limit;

    const result = await models.PointsTransaction.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 获取积分统计信息
   */
  async getPointsStatistics(options = {}) {
    const { userId, startDate, endDate } = options;
    
    const whereCondition = {};
    if (userId) {
      whereCondition.userId = userId;
    }
    if (startDate && endDate) {
      whereCondition.createdAt = {
        [models.sequelize.Op.between]: [startDate, endDate],
      };
    }

    const [
      totalTransactions,
      totalPointsAwarded,
      totalPointsSpent,
      averageTransaction,
      transactionsByType,
      recentActivity,
    ] = await Promise.all([
      // 总交易数
      models.PointsTransaction.count({ where: whereCondition }),
      
      // 总发放积分
      models.PointsTransaction.sum('amount', {
        where: {
          ...whereCondition,
          amount: { [models.sequelize.Op.gt]: 0 },
        },
      }),
      
      // 总消费积分
      models.PointsTransaction.sum('amount', {
        where: {
          ...whereCondition,
          amount: { [models.sequelize.Op.lt]: 0 },
        },
      }),
      
      // 平均交易金额
      models.PointsTransaction.findOne({
        where: whereCondition,
        attributes: [
          [models.sequelize.fn('AVG', models.sequelize.fn('ABS', models.sequelize.col('amount'))), 'avgAmount'],
        ],
        raw: true,
      }),
      
      // 按类型统计
      models.PointsTransaction.findAll({
        where: whereCondition,
        attributes: [
          'type',
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
          [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount'],
        ],
        group: ['type'],
        order: [[models.sequelize.fn('COUNT', models.sequelize.col('id')), 'DESC']],
        raw: true,
      }),
      
      // 最近7天活动
      models.PointsTransaction.count({
        where: {
          ...whereCondition,
          createdAt: {
            [models.sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalTransactions,
      totalPointsAwarded: totalPointsAwarded || 0,
      totalPointsSpent: Math.abs(totalPointsSpent || 0),
      netPoints: (totalPointsAwarded || 0) + (totalPointsSpent || 0),
      averageTransaction: averageTransaction?.avgAmount ? parseFloat(averageTransaction.avgAmount).toFixed(1) : 0,
      transactionsByType: transactionsByType.map(item => ({
        type: item.type,
        count: parseInt(item.count),
        totalAmount: parseInt(item.totalAmount),
      })),
      recentActivity,
    };
  }

  /**
   * 冲正交易
   */
  async reverseTransaction(transactionId, reason, operatorId) {
    const originalTransaction = await models.PointsTransaction.findByPk(transactionId);
    if (!originalTransaction) {
      throw new NotFoundError('原始交易不存在');
    }

    if (originalTransaction.status !== 'completed') {
      throw new BadRequestError('只能冲正已完成的交易');
    }

    if (originalTransaction.reversalTransactionId) {
      throw new BadRequestError('该交易已被冲正');
    }

    // 验证操作员权限
    const operator = await models.User.findByPk(operatorId);
    if (!operator || operator.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以执行冲正操作');
    }

    const transaction = await models.sequelize.transaction();
    
    try {
      // 创建冲正交易
      const reversalTransaction = await models.PointsTransaction.create({
        userId: originalTransaction.userId,
        type: POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        amount: -originalTransaction.amount,
        description: `冲正交易 #${transactionId}: ${reason}`,
        processedBy: operatorId,
        originalTransactionId: transactionId,
        metadata: { 
          reversalReason: reason,
          originalTransactionId: transactionId,
        },
        status: 'completed',
      }, { transaction });

      // 更新原始交易的冲正标记
      await originalTransaction.update({
        reversalTransactionId: reversalTransaction.id,
      }, { transaction });

      // 更新用户积分
      const userPoints = await models.UserPoints.findOrCreateForUser(originalTransaction.userId, { transaction });
      if (originalTransaction.amount > 0) {
        await userPoints.deductPoints(originalTransaction.amount, { transaction });
      } else {
        await userPoints.addPoints(Math.abs(originalTransaction.amount), { transaction });
      }

      await transaction.commit();
      
      return {
        originalTransaction: await models.PointsTransaction.findByPk(transactionId, {
          include: [
            { model: models.PointsTransaction, as: 'reversalTransaction' },
          ],
        }),
        reversalTransaction,
        userPoints: await this.getUserPoints(originalTransaction.userId),
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 计算用户等级
   */
  calculateUserLevel(totalPoints) {
    for (const [levelKey, levelConfig] of Object.entries(USER_LEVELS)) {
      if (totalPoints >= levelConfig.min && totalPoints <= levelConfig.max) {
        return {
          key: levelKey.toLowerCase(),
          name: levelConfig.name,
          minPoints: levelConfig.min,
          maxPoints: levelConfig.max,
          currentPoints: totalPoints,
          progress: levelConfig.max === Infinity ? 100 : 
            ((totalPoints - levelConfig.min) / (levelConfig.max - levelConfig.min) * 100).toFixed(1),
        };
      }
    }
    
    // 默认返回新手等级
    return {
      key: 'newcomer',
      name: USER_LEVELS.NEWCOMER.name,
      minPoints: USER_LEVELS.NEWCOMER.min,
      maxPoints: USER_LEVELS.NEWCOMER.max,
      currentPoints: totalPoints,
      progress: 0,
    };
  }

  /**
   * 计算升级奖励
   */
  calculateLevelBonus(level) {
    const bonusMap = {
      reader: 50,
      bookworm: 100,
      scholar: 200,
      expert: 500,
      master: 1000,
      grandmaster: 2000,
    };
    
    return bonusMap[level.key] || 0;
  }

  /**
   * 获取积分排行榜
   */
  async getPointsLeaderboard(options = {}) {
    const {
      limit = 100,
      period = 'all', // all, monthly, weekly
    } = options;

    let whereCondition = {};
    
    if (period === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      whereCondition.createdAt = {
        [models.sequelize.Op.gte]: startOfMonth,
      };
    } else if (period === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      whereCondition.createdAt = {
        [models.sequelize.Op.gte]: startOfWeek,
      };
    }

    let orderBy;
    if (period === 'all') {
      orderBy = [['totalPoints', 'DESC']];
    } else {
      // 对于特定时期，需要计算该时期内的积分总和
      return this.getPeriodicLeaderboard(period, limit);
    }

    const leaderboard = await models.UserPoints.findAll({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatar'],
          where: {
            status: 'active',
          },
        },
      ],
      order: orderBy,
      limit,
    });

    return leaderboard.map((userPoints, index) => ({
      rank: index + 1,
      user: userPoints.user,
      points: period === 'all' ? userPoints.totalPoints : userPoints.currentPoints,
      level: this.calculateUserLevel(userPoints.totalPoints),
    }));
  }

  /**
   * 获取特定时期积分排行榜
   */
  async getPeriodicLeaderboard(period, limit) {
    let startDate;
    
    if (period === 'monthly') {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    }

    const result = await models.PointsTransaction.findAll({
      where: {
        createdAt: {
          [models.sequelize.Op.gte]: startDate,
        },
        amount: {
          [models.sequelize.Op.gt]: 0,
        },
      },
      attributes: [
        'userId',
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'periodPoints'],
      ],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatar'],
          where: {
            status: 'active',
          },
        },
      ],
      group: ['userId'],
      order: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'DESC']],
      limit,
      raw: false,
    });

    return result.map((item, index) => ({
      rank: index + 1,
      user: item.user,
      points: parseInt(item.getDataValue('periodPoints')),
      level: this.calculateUserLevel(item.user.totalPoints || 0),
    }));
  }

  /**
   * 批量操作积分
   */
  async batchProcessPoints(operations, operatorId) {
    // 验证操作员权限
    const operator = await models.User.findByPk(operatorId);
    if (!operator || operator.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以执行批量操作');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const transaction = await models.sequelize.transaction();
    
    try {
      for (const operation of operations) {
        try {
          const { userId, action, amount, description } = operation;
          
          switch (action) {
            case 'add':
              await this.addPoints(
                userId,
                amount,
                POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
                description || '管理员批量加分',
                operatorId
              );
              break;
            case 'deduct':
              await this.deductPoints(
                userId,
                amount,
                POINTS_TRANSACTION_TYPES.PENALTY_DEDUCTION,
                description || '管理员批量扣分',
                operatorId
              );
              break;
            default:
              throw new BadRequestError('不支持的操作类型');
          }
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId: operation.userId,
            error: error.message,
          });
        }
      }

      await transaction.commit();
      
      return {
        message: `批量操作完成，成功: ${results.success}, 失败: ${results.failed}`,
        results,
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new PointsService();