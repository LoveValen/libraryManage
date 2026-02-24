const prisma = require('../utils/prisma');
const { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError,
  InsufficientPointsError 
} = require('../utils/apiError');
const { formatDateTime } = require('../utils/date');
const { 
  POINTS_TRANSACTION_TYPES, 
  POINTS_RULES, 
  USER_LEVELS 
} = require('../utils/constants');
const UserService = require('./user.service');

/**
 * Basic PointsService for Prisma operations
 */
class PointsService {
  static async getOrCreateUserPoints(userId, client = prisma) {
    let userPoints = await client.user_points.findUnique({
      where: { userId: parseInt(userId) },
      include: { user: true }
    });

    if (!userPoints) {
      userPoints = await client.user_points.create({
        data: {
          userId: parseInt(userId),
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          level: 'NEWCOMER',
          levelName: '新手读者',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: { user: true }
      });
    }

    return userPoints;
  }

  static async addPoints(userId, points, transactionType, description, options = {}) {
    const {
      operatorId,
      metadata,
      relatedEntityType,
      relatedEntityId,
      transactionClient
    } = options;

    const execute = async (client) => {
      const userPoints = await this.getOrCreateUserPoints(userId, client);
      const previousBalance = userPoints.balance;
      const newBalance = previousBalance + points;

      const updatedUserPoints = await client.user_points.update({
        where: { userId: parseInt(userId) },
        data: {
          balance: newBalance,
          totalEarned: { increment: points > 0 ? points : 0 },
          totalSpent: { increment: points < 0 ? Math.abs(points) : 0 },
          lastTransactionAt: new Date(),
          updatedAt: new Date()
        }
      });

      const now = new Date();
      const transaction = await client.points_transactions.create({
        data: {
          userId: parseInt(userId),
          pointsChange: points,
          currentBalance: newBalance,
          previousBalance: previousBalance,
          transactionType: transactionType,
          description,
          relatedEntityType: relatedEntityType,
          relatedEntityId: relatedEntityId,
          metadata: metadata || {},
          processedBy: operatorId ? parseInt(operatorId) : null,
          status: 'completed',
          createdAt: now,
          updatedAt: now
        }
      });

      return { userPoints: updatedUserPoints, transaction };
    };

    if (transactionClient) {
      return execute(transactionClient);
    }

    return prisma.$transaction(async (tx) => execute(tx));
  }

  static async deductPoints(userId, points, transactionType, description, options = {}) {
    const amount = Math.abs(points);
    const {
      operatorId,
      metadata,
      relatedEntityType,
      relatedEntityId,
      transactionClient
    } = options;

    const execute = async (client) => {
      const userPoints = await this.getOrCreateUserPoints(userId, client);

      if (userPoints.balance < amount) {
        throw new InsufficientPointsError('积分余额不足');
      }

      const previousBalance = userPoints.balance;
      const newBalance = previousBalance - amount;
      const data = {
        balance: newBalance,
        totalSpent: { increment: amount },
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      };

      const updatedUserPoints = await client.user_points.update({
        where: { userId: parseInt(userId) },
        data
      });

      const now = new Date();
      const transaction = await client.points_transactions.create({
        data: {
          userId: parseInt(userId),
          pointsChange: -amount,
          currentBalance: newBalance,
          previousBalance: previousBalance,
          transactionType: transactionType,
          description,
          relatedEntityType: relatedEntityType,
          relatedEntityId: relatedEntityId,
          metadata: metadata || {},
          processedBy: operatorId ? parseInt(operatorId) : null,
          status: 'completed',
          createdAt: now,
          updatedAt: now
        }
      });

      return { userPoints: updatedUserPoints, transaction };
    };

    if (transactionClient) {
      return execute(transactionClient);
    }

    return prisma.$transaction(async (tx) => execute(tx));
  }

  static async getUserPointsHistory(userId, options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(options.limit, 10) || 20, 100));
    const skip = (page - 1) * limit;

    const where = { userId: parseInt(userId) };

    if (options.transactionType) {
      where.transactionType = options.transactionType;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate instanceof Date
          ? options.startDate
          : new Date(options.startDate);
      }
      if (options.endDate) {
        const end = options.endDate instanceof Date
          ? options.endDate
          : new Date(options.endDate);
        end.setMilliseconds(999);
        where.createdAt.lte = end;
      }
    }

    const [total, records] = await Promise.all([
      prisma.points_transactions.count({ where }),
      prisma.points_transactions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
              avatar: true,
              role: true
            }
          },
          processor: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
              avatar: true,
              role: true
            }
          }
        }
      })
    ]);

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getStatistics(options = {}) {
    const userFilter = options.userId ? { userId: parseInt(options.userId) } : {};
    const transactionWhere = options.userId ? { userId: parseInt(options.userId) } : {};

    if (options.startDate || options.endDate) {
      transactionWhere.createdAt = {};
      if (options.startDate) {
        transactionWhere.createdAt.gte = options.startDate instanceof Date
          ? options.startDate
          : new Date(options.startDate);
      }
      if (options.endDate) {
        const end = options.endDate instanceof Date
          ? options.endDate
          : new Date(options.endDate);
        end.setMilliseconds(999);
        transactionWhere.createdAt.lte = end;
      }
    }

    const [
      userAggregate,
      totalTransactions,
      transactionsByTypeRaw,
      levelDistributionRaw
    ] = await Promise.all([
      prisma.user_points.aggregate({
        where: userFilter,
        _sum: { balance: true },
        _count: { _all: true }
      }),
      prisma.points_transactions.count({ where: transactionWhere }),
      prisma.points_transactions.groupBy({
        by: ['transactionType'],
        where: transactionWhere,
        _sum: { pointsChange: true },
        _count: { _all: true }
      }),
      prisma.user_points.groupBy({
        by: ['level'],
        where: userFilter,
        _count: { _all: true }
      })
    ]);

    const totalUsers = userAggregate?._count?._all || 0;
    const totalPointsInCirculation = userAggregate?._sum?.balance || 0;

    const transactionsByType = transactionsByTypeRaw.map(item => ({
      type: item.transactionType,
      totalPoints: item._sum.pointsChange || 0,
      count: item._count._all
    }));

    const levelDistribution = levelDistributionRaw.map(item => ({
      level: item.level,
      count: item._count._all
    }));

    return {
      totalUsers,
      totalPointsInCirculation,
      totalTransactions,
      transactionsByType,
      levelDistribution
    };
  }

  static async getLeaderboard({ limit = 10, timeRange = 'all' } = {}) {
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 10, 100));
    const now = new Date();
    let startDate = null;

    if (timeRange === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    }

    if (!startDate) {
      const topUsers = await prisma.user_points.findMany({
        orderBy: { balance: 'desc' },
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
              avatar: true,
              role: true
            }
          }
        }
      });

      return topUsers.map((entry, index) => ({
        userId: entry.userId,
        user: entry.user,
        points: entry.balance,
        totalEarned: entry.totalEarned,
        level: {
          code: entry.level,
          name: entry.levelName
        },
        rank: index + 1
      }));
    }

    const grouped = await prisma.points_transactions.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _sum: { pointsChange: true }
    });

    const sorted = grouped
      .filter(item => item._sum.pointsChange !== null)
      .sort((a, b) => (b._sum.pointsChange || 0) - (a._sum.pointsChange || 0))
      .slice(0, take);

    const userIds = sorted.map(item => item.userId);

    const userPoints = await prisma.user_points.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    const userMap = new Map(userPoints.map(entry => [entry.userId, entry]));

    return sorted.map((item, index) => {
      const entry = userMap.get(item.userId);
      return {
        userId: item.userId,
        user: entry?.user,
        points: item._sum.pointsChange || 0,
        level: entry
          ? { code: entry.level, name: entry.levelName }
          : null,
        rank: index + 1
      };
    });
  }

  static async reverseTransaction(transactionId, reason, operatorId) {
    return prisma.$transaction(async (tx) => {
      const id = parseInt(transactionId, 10);
      const original = await tx.points_transactions.findUnique({
        where: { id }
      });

      if (!original) {
        throw new NotFoundError('交易不存在');
      }

      if (original.status === 'reversed') {
        throw new BadRequestError('该交易已被撤销');
      }

      const userPoints = await this.getOrCreateUserPoints(original.userId, tx);
      const adjustment = -original.pointsChange;
      const previousBalance = userPoints.balance;
      const newBalance = previousBalance + adjustment;

      if (newBalance < 0) {
        throw new BadRequestError('撤销后积分余额不能为负数');
      }

      const updatePayload = {
        balance: newBalance,
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      };

      if (original.pointsChange > 0) {
        updatePayload.totalEarned = { decrement: original.pointsChange };
      } else if (original.pointsChange < 0) {
        updatePayload.totalSpent = { decrement: Math.abs(original.pointsChange) };
      }

      await tx.user_points.update({
        where: { userId: original.userId },
        data: updatePayload
      });

      await tx.points_transactions.update({
        where: { id },
        data: { status: 'reversed' }
      });

      const now = new Date();
      const reversal = await tx.points_transactions.create({
        data: {
          userId: original.userId,
          pointsChange: adjustment,
          currentBalance: newBalance,
          previousBalance: previousBalance,
          transactionType: POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
          description: `撤销交易#${original.id}: ${reason}`,
          metadata: {
            relatedTransactionId: original.id,
            reason
          },
          processedBy: operatorId ? parseInt(operatorId, 10) : null,
          status: 'completed',
          createdAt: now,
          updatedAt: now
        }
      });

      return reversal;
    });
  }
}

/**
 * Points service adapter for Prisma
 * Maintains compatibility with existing controller interface
 */
class PointsServiceAdapter {
  /**
   * Calculate user level based on total points
   */
  calculateUserLevel(totalPoints) {
    const levels = [
      { min: 0, name: '新手读者', level: 'NEWCOMER', icon: '🌱' },
      { min: 100, name: '铜牌读者', level: 'BRONZE', icon: '🥉' },
      { min: 500, name: '银牌读者', level: 'SILVER', icon: '🥈' },
      { min: 1000, name: '金牌读者', level: 'GOLD', icon: '🥇' },
      { min: 5000, name: '白金读者', level: 'PLATINUM', icon: '💎' },
      { min: 10000, name: '钻石读者', level: 'DIAMOND', icon: '💠' }
    ];

    let userLevel = levels[0];
    for (const level of levels) {
      if (totalPoints >= level.min) {
        userLevel = level;
      } else {
        break;
      }
    }

    return userLevel;
  }

  /**
   * Calculate level bonus
   */
  calculateLevelBonus(level) {
    const bonuses = {
      'BRONZE': 20,
      'SILVER': 50,
      'GOLD': 100,
      'PLATINUM': 200,
      'DIAMOND': 500
    };
    return bonuses[level.level] || 0;
  }

  /**
   * Get user points
   */
  async getUserPoints(userId) {
    // Validate user exists
    const user = await UserService.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // Get or create user points
    const userPoints = await PointsService.getOrCreateUserPoints(userId);
    
    // Calculate level info
    const level = this.calculateUserLevel(userPoints.totalEarned || 0);

    return {
      id: userPoints.userId,
      userId: userPoints.userId,
      balance: userPoints.balance,
      totalEarned: userPoints.totalEarned,
      totalSpent: userPoints.totalSpent,
      borrowPoints: userPoints.borrowPoints,
      reviewPoints: userPoints.reviewPoints,
      bonusPoints: userPoints.bonusPoints,
      penaltyPoints: userPoints.penaltyPoints,
      lastTransactionAt: userPoints.lastTransactionAt,
      level: {
        ...level,
        currentLevelPoints: userPoints.totalEarned,
        nextLevelPoints: userPoints.nextLevelPoints,
        progressToNextLevel: userPoints.progressToNextLevel
      },
      createdAt: userPoints.createdAt,
      updatedAt: userPoints.updatedAt,
      totalPoints: userPoints.totalEarned // For backwards compatibility
    };
  }

  /**
   * Add points
   */
  async addPoints(userId, points, type, description, operatorId = null, metadata = {}, options = {}) {
    if (points <= 0) {
      throw new BadRequestError('积分数量必须大于0');
    }

    // Validate user exists
    const user = await UserService.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // Validate operator if provided
    if (operatorId) {
      const operator = await UserService.findById(operatorId);
      if (!operator) {
        throw new NotFoundError('操作员不存在');
      }
    }

    const result = await PointsService.addPoints(userId, points, type, description, {
      operatorId,
      metadata,
      transactionClient: options.transactionClient
    });

    // Check for level upgrade
    const oldLevel = this.calculateUserLevel((result.userPoints.totalEarned || 0) - points);
    const newLevel = this.calculateUserLevel(result.userPoints.totalEarned || 0);
    
    if (newLevel.level !== oldLevel.level) {
      console.log(`用户 ${userId} 从 ${oldLevel.name} 升级到 ${newLevel.name}`);
      
      // Add level bonus
      const levelBonus = this.calculateLevelBonus(newLevel);
      if (levelBonus > 0) {
        await PointsService.addPoints(
          userId, 
          levelBonus, 
          POINTS_TRANSACTION_TYPES.BONUS_REWARD,
          `升级到${newLevel.name}奖励`,
          {
            operatorId,
            metadata: { levelUpgrade: true, newLevel: newLevel.level },
            transactionClient: options.transactionClient
          }
        );
      }
    }

    return {
      success: true,
      message: '积分添加成功',
      userPoints: await this.getUserPoints(userId),
      transaction: {
        id: result.transaction.id.toString(),
        userId: result.transaction.userId,
        pointsChange: result.transaction.pointsChange,
        type: result.transaction.transactionType,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  }

  /**
   * Deduct points
   */
  async deductPoints(userId, points, type, description, operatorId = null, metadata = {}, options = {}) {
    if (points <= 0) {
      throw new BadRequestError('扣除积分数量必须大于0');
    }

    // Check user points balance
    const userPoints = await this.getUserPoints(userId);
    if (userPoints.balance < points) {
      throw new InsufficientPointsError('积分余额不足');
    }

    const result = await PointsService.deductPoints(userId, points, type, description, {
      operatorId,
      metadata,
      transactionClient: options.transactionClient
    });

    return {
      success: true,
      message: '积分扣除成功',
      userPoints: await this.getUserPoints(userId),
      transaction: {
        id: result.transaction.id.toString(),
        userId: result.transaction.userId,
        pointsChange: result.transaction.pointsChange,
        type: result.transaction.transactionType,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  }

  /**
   * Transfer points between users
   */
  async transferPoints(fromUserId, toUserId, points, description, operatorId = null) {
    if (points <= 0) {
      throw new BadRequestError('转账积分数量必须大于0');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestError('不能给自己转账');
    }

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // Deduct from sender
      await this.deductPoints(
        fromUserId, 
        points, 
        POINTS_TRANSACTION_TYPES.REDEEM_REWARD,
        `转账给用户${toUserId}: ${description}`,
        operatorId,
        { transferTo: toUserId },
        { transactionClient: tx }
      );

      // Add to receiver
      await this.addPoints(
        toUserId,
        points,
        POINTS_TRANSACTION_TYPES.BONUS_REWARD,
        `收到用户${fromUserId}转账: ${description}`,
        operatorId,
        { transferFrom: fromUserId },
        { transactionClient: tx }
      );

      return {
        success: true,
        message: '积分转账成功',
        fromUserPoints: await this.getUserPoints(fromUserId),
        toUserPoints: await this.getUserPoints(toUserId)
      };
    });
  }

  /**
   * Get points history
   */
  async getPointsHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate
    } = options;

    const result = await PointsService.getUserPointsHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      transactionType: type,
      startDate,
      endDate
    });

    return {
      transactions: result.data.map(tx => ({
        id: tx.id.toString(),
        userId: tx.userId,
        pointsChange: tx.pointsChange,
        currentBalance: tx.currentBalance,
        previousBalance: tx.previousBalance,
        type: tx.transactionType,
        description: tx.description,
        metadata: tx.metadata,
        processedBy: tx.processedBy,
        status: tx.status,
        createdAt: tx.createdAt,
        user: tx.user ? UserService.toSafeJSON(tx.user) : undefined,
        processor: tx.processor ? UserService.toSafeJSON(tx.processor) : undefined
      })),
      pagination: result.pagination
    };
  }

  /**
   * Get points statistics
   */
  async getPointsStatistics(options = {}) {
    const stats = await PointsService.getStatistics(options);
    
    return {
      overview: {
        totalUsers: stats.totalUsers,
        totalPointsInCirculation: stats.totalPointsInCirculation,
        totalTransactions: stats.totalTransactions,
        averagePointsPerUser: stats.totalUsers > 0 
          ? Math.round(stats.totalPointsInCirculation / stats.totalUsers)
          : 0
      },
      transactionsByType: stats.transactionsByType,
      levelDistribution: stats.levelDistribution,
      timestamp: formatDateTime(new Date())
    };
  }

  /**
   * Reverse transaction
   */
  async reverseTransaction(transactionId, reason, operatorId) {
    const result = await PointsService.reverseTransaction(transactionId, reason, operatorId);
    
    return {
      success: true,
      message: '交易撤销成功',
      reversalTransaction: {
        id: result.id.toString(),
        originalTransactionId: result.originalTransactionId?.toString(),
        userId: result.userId,
        pointsChange: result.pointsChange,
        description: result.description,
        createdAt: result.createdAt
      }
    };
  }

  /**
   * Get points leaderboard
   */
  async getPointsLeaderboard(options = {}) {
    const { limit = 10, period = 'all' } = options;
    
    const leaderboard = await PointsService.getLeaderboard({
      limit: parseInt(limit),
      timeRange: period
    });

    return {
      leaderboard: leaderboard.map(entry => ({
        ...entry,
        user: entry.user ? {
          id: entry.user.id,
          username: entry.user.username,
          realName: entry.user.realName,
          avatar: entry.user.avatar
        } : undefined
      })),
      period,
      updatedAt: formatDateTime(new Date())
    };
  }

  /**
   * Get periodic leaderboard
   */
  async getPeriodicLeaderboard(period, limit = 10) {
    return this.getPointsLeaderboard({ period, limit });
  }

  /**
   * Batch process points
   */
  async batchProcessPoints(operations, operatorId) {
    const results = {
      success: [],
      failed: []
    };

    for (const operation of operations) {
      try {
        let result;
        
        if (operation.action === 'add') {
          result = await this.addPoints(
            operation.userId,
            operation.amount,
            operation.type || POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
            operation.description,
            operatorId,
            operation.metadata
          );
        } else if (operation.action === 'deduct') {
          result = await this.deductPoints(
            operation.userId,
            operation.amount,
            operation.type || POINTS_TRANSACTION_TYPES.PENALTY_DEDUCTION,
            operation.description,
            operatorId,
            operation.metadata
          );
        } else {
          throw new BadRequestError(`Unknown action: ${operation.action}`);
        }
        
        results.success.push({
          userId: operation.userId,
          result
        });
      } catch (error) {
        results.failed.push({
          userId: operation.userId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `批量处理完成: 成功${results.success.length}个，失败${results.failed.length}个`,
      results
    };
  }
}

module.exports = new PointsServiceAdapter();
