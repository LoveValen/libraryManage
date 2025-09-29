const UserService = require('./user.service');
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

/**
 * Basic PointsService for Prisma operations
 */
class PointsService {
  static async getOrCreateUserPoints(userId) {
    let userPoints = await prisma.userPoints.findUnique({
      where: { user_id: parseInt(userId) },
      include: { user: true }
    });

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          user_id: parseInt(userId),
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          level: 'NEWCOMER',
          level_name: '新手读者',
          created_at: new Date(),
          updated_at: new Date()
        },
        include: { user: true }
      });
    }

    return userPoints;
  }

  static async addPoints(userId, points, transactionType, description, options = {}) {
    const { operatorId, metadata, relatedEntityType, relatedEntityId } = options;

    return prisma.$transaction(async (tx) => {
      const userPoints = await this.getOrCreateUserPoints(userId);
      const previousBalance = userPoints.balance;
      const newBalance = previousBalance + points;

      const updatedUserPoints = await tx.userPoints.update({
        where: { user_id: parseInt(userId) },
        data: {
          balance: newBalance,
          total_earned: { increment: points > 0 ? points : 0 },
          total_spent: { increment: points < 0 ? Math.abs(points) : 0 },
          last_transaction_at: new Date(),
          updated_at: new Date()
        }
      });

      const transaction = await tx.pointsTransactions.create({
        data: {
          user_id: parseInt(userId),
          points_change: points,
          current_balance: newBalance,
          previous_balance: previousBalance,
          transaction_type: transactionType,
          description,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          metadata: metadata || {},
          processed_by: operatorId ? parseInt(operatorId) : null,
          status: 'completed',
          created_at: new Date()
        }
      });

      return { userPoints: updatedUserPoints, transaction };
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
    const level = this.calculateUserLevel(userPoints.total_earned || 0);
    
    return {
      id: userPoints.user_id,
      userId: userPoints.user_id,
      balance: userPoints.balance,
      totalEarned: userPoints.total_earned,
      totalSpent: userPoints.total_spent,
      borrowPoints: userPoints.borrow_points,
      reviewPoints: userPoints.review_points,
      bonusPoints: userPoints.bonus_points,
      penaltyPoints: userPoints.penalty_points,
      lastTransactionAt: userPoints.last_transaction_at,
      level: {
        ...level,
        currentLevelPoints: userPoints.total_earned,
        nextLevelPoints: userPoints.next_level_points,
        progressToNextLevel: userPoints.progress_to_next_level
      },
      createdAt: userPoints.created_at,
      updatedAt: userPoints.updated_at,
      totalPoints: userPoints.total_earned // For backwards compatibility
    };
  }

  /**
   * Add points
   */
  async addPoints(userId, points, type, description, operatorId = null, metadata = {}) {
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
      metadata
    });

    // Check for level upgrade
    const oldLevel = this.calculateUserLevel((result.userPoints.total_earned || 0) - points);
    const newLevel = this.calculateUserLevel(result.userPoints.total_earned || 0);
    
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
          { operatorId, metadata: { levelUpgrade: true, newLevel: newLevel.level } }
        );
      }
    }

    return {
      success: true,
      message: '积分添加成功',
      userPoints: await this.getUserPoints(userId),
      transaction: {
        id: result.transaction.id.toString(),
        userId: result.transaction.user_id,
        pointsChange: result.transaction.points_change,
        type: result.transaction.transaction_type,
        description: result.transaction.description,
        createdAt: result.transaction.created_at
      }
    };
  }

  /**
   * Deduct points
   */
  async deductPoints(userId, points, type, description, operatorId = null, metadata = {}) {
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
      metadata
    });

    return {
      success: true,
      message: '积分扣除成功',
      userPoints: await this.getUserPoints(userId),
      transaction: {
        id: result.transaction.id.toString(),
        userId: result.transaction.user_id,
        pointsChange: result.transaction.points_change,
        type: result.transaction.transaction_type,
        description: result.transaction.description,
        createdAt: result.transaction.created_at
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
        { transferTo: toUserId }
      );

      // Add to receiver
      await this.addPoints(
        toUserId,
        points,
        POINTS_TRANSACTION_TYPES.BONUS_REWARD,
        `收到用户${fromUserId}转账: ${description}`,
        operatorId,
        { transferFrom: fromUserId }
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
        userId: tx.user_id,
        pointsChange: tx.points_change,
        currentBalance: tx.current_balance,
        previousBalance: tx.previous_balance,
        type: tx.transaction_type,
        description: tx.description,
        metadata: tx.metadata,
        processedBy: tx.processed_by,
        status: tx.status,
        createdAt: tx.created_at,
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
        originalTransactionId: result.original_transaction_id?.toString(),
        userId: result.user_id,
        pointsChange: result.points_change,
        description: result.description,
        createdAt: result.created_at
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
          realName: entry.user.real_name,
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
            operation.points,
            operation.type || POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
            operation.description,
            operatorId,
            operation.metadata
          );
        } else if (operation.action === 'deduct') {
          result = await this.deductPoints(
            operation.userId,
            operation.points,
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