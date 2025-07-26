const prisma = require('../utils/prisma');
const { 
  POINTS_TRANSACTION_TYPES, 
  POINTS_RULES, 
  USER_LEVELS 
} = require('../utils/constants');

class PointsService {
  /**
   * Get or create user points
   */
  static async getOrCreateUserPoints(userId) {
    let userPoints = await prisma.user_points.findUnique({
      where: { user_id: parseInt(userId) },
      include: {
        user: true
      }
    });

    if (!userPoints) {
      userPoints = await prisma.user_points.create({
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
        include: {
          user: true
        }
      });
    }

    return userPoints;
  }

  /**
   * Add points to user
   */
  static async addPoints(userId, points, transactionType, description, options = {}) {
    const { operatorId, metadata, relatedEntityType, relatedEntityId } = options;

    return prisma.$transaction(async (tx) => {
      // Get current user points
      const userPoints = await this.getOrCreateUserPoints(userId);
      const previousBalance = userPoints.balance;
      const newBalance = previousBalance + points;

      // Update user points
      const updatedUserPoints = await tx.user_points.update({
        where: { user_id: parseInt(userId) },
        data: {
          balance: newBalance,
          total_earned: { increment: points > 0 ? points : 0 },
          total_spent: { increment: points < 0 ? Math.abs(points) : 0 },
          last_transaction_at: new Date(),
          updated_at: new Date(),
          // Update specific point types
          ...(transactionType === POINTS_TRANSACTION_TYPES.BORROW_BOOK && { borrow_points: { increment: points } }),
          ...(transactionType === POINTS_TRANSACTION_TYPES.WRITE_REVIEW && { review_points: { increment: points } }),
          ...(transactionType === POINTS_TRANSACTION_TYPES.BONUS_REWARD && { bonus_points: { increment: points } }),
          ...(transactionType === POINTS_TRANSACTION_TYPES.PENALTY_DEDUCTION && { penalty_points: { increment: Math.abs(points) } })
        }
      });

      // Create transaction record
      const transaction = await tx.points_transactions.create({
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

      // Check and update level
      await this.checkAndUpdateLevel(userId, updatedUserPoints.total_earned, tx);

      return {
        userPoints: updatedUserPoints,
        transaction
      };
    });
  }

  /**
   * Deduct points from user
   */
  static async deductPoints(userId, points, transactionType, description, options = {}) {
    if (points <= 0) {
      throw new Error('Points to deduct must be positive');
    }

    const userPoints = await this.getOrCreateUserPoints(userId);
    if (userPoints.balance < points) {
      throw new Error('Insufficient points balance');
    }

    return this.addPoints(userId, -points, transactionType, description, options);
  }

  /**
   * Check and update user level
   */
  static async checkAndUpdateLevel(userId, totalEarned, transaction = null) {
    const tx = transaction || prisma;
    
    const levels = [
      { points: 0, level: 'NEWCOMER', name: '新手读者' },
      { points: 100, level: 'BRONZE', name: '铜牌读者' },
      { points: 500, level: 'SILVER', name: '银牌读者' },
      { points: 1000, level: 'GOLD', name: '金牌读者' },
      { points: 5000, level: 'PLATINUM', name: '白金读者' },
      { points: 10000, level: 'DIAMOND', name: '钻石读者' }
    ];

    // Find current level
    let currentLevel = levels[0];
    let nextLevel = null;
    
    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalEarned >= levels[i].points) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
        break;
      }
    }

    const nextLevelPoints = nextLevel ? nextLevel.points : null;
    const progressToNextLevel = nextLevel 
      ? ((totalEarned - currentLevel.points) / (nextLevel.points - currentLevel.points) * 100).toFixed(2)
      : 100;

    await tx.user_points.update({
      where: { user_id: parseInt(userId) },
      data: {
        level: currentLevel.level,
        level_name: currentLevel.name,
        next_level_points: nextLevelPoints,
        progress_to_next_level: parseFloat(progressToNextLevel)
      }
    });

    return currentLevel;
  }

  /**
   * Get user points history
   */
  static async getUserPointsHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      transactionType,
      startDate,
      endDate
    } = options;

    const where = { user_id: parseInt(userId) };
    
    if (transactionType) {
      where.transaction_type = transactionType;
    }
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.points_transactions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: true,
          processor: true
        }
      }),
      prisma.points_transactions.count({ where })
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get points leaderboard
   */
  static async getLeaderboard(options = {}) {
    const { limit = 10, timeRange = 'all' } = options;

    let whereClause = {};
    
    if (timeRange === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      whereClause = {
        last_transaction_at: { gte: startOfMonth }
      };
    } else if (timeRange === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      whereClause = {
        last_transaction_at: { gte: startOfWeek }
      };
    }

    const topUsers = await prisma.user_points.findMany({
      where: whereClause,
      orderBy: { balance: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            real_name: true,
            avatar: true
          }
        }
      }
    });

    return topUsers.map((userPoints, index) => ({
      rank: index + 1,
      userId: userPoints.user_id,
      user: userPoints.user,
      balance: userPoints.balance,
      totalEarned: userPoints.total_earned,
      level: userPoints.level,
      levelName: userPoints.level_name
    }));
  }

  /**
   * Award points for specific actions
   */
  static async awardPointsForAction(userId, action, metadata = {}) {
    const pointsConfig = {
      [POINTS_TRANSACTION_TYPES.BORROW_BOOK]: {
        points: POINTS_RULES.BORROW_BOOK,
        description: '借阅图书'
      },
      [POINTS_TRANSACTION_TYPES.RETURN_ON_TIME]: {
        points: POINTS_RULES.RETURN_ON_TIME,
        description: '按时归还图书'
      },
      [POINTS_TRANSACTION_TYPES.WRITE_REVIEW]: {
        points: POINTS_RULES.WRITE_REVIEW,
        description: '撰写图书评论'
      },
      [POINTS_TRANSACTION_TYPES.COMPLETE_TUTORIAL]: {
        points: POINTS_RULES.COMPLETE_TUTORIAL || 50,
        description: '完成新手教程'
      }
    };

    const config = pointsConfig[action];
    if (!config) {
      throw new Error(`Unknown action type: ${action}`);
    }

    return this.addPoints(userId, config.points, action, config.description, {
      metadata
    });
  }

  /**
   * Get points statistics
   */
  static async getStatistics(options = {}) {
    const { startDate, endDate } = options;

    const where = {};
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [
      totalUsers,
      totalPointsInCirculation,
      totalTransactions,
      transactionsByType
    ] = await Promise.all([
      prisma.user_points.count(),
      prisma.user_points.aggregate({
        _sum: { balance: true }
      }),
      prisma.points_transactions.count({ where }),
      prisma.points_transactions.groupBy({
        by: ['transaction_type'],
        where,
        _count: true,
        _sum: {
          points_change: true
        }
      })
    ]);

    // Get level distribution
    const levelDistribution = await prisma.user_points.groupBy({
      by: ['level'],
      _count: true
    });

    return {
      totalUsers,
      totalPointsInCirculation: totalPointsInCirculation._sum.balance || 0,
      totalTransactions,
      transactionsByType: transactionsByType.map(item => ({
        type: item.transaction_type,
        count: item._count,
        totalPoints: item._sum.points_change
      })),
      levelDistribution: levelDistribution.map(item => ({
        level: item.level,
        count: item._count
      }))
    };
  }

  /**
   * Batch award points
   */
  static async batchAwardPoints(userIds, points, transactionType, description, operatorId) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.addPoints(userId, points, transactionType, description, {
          operatorId,
          metadata: { batchOperation: true }
        });
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Reverse transaction
   */
  static async reverseTransaction(transactionId, reason, operatorId) {
    const originalTransaction = await prisma.points_transactions.findUnique({
      where: { id: BigInt(transactionId) }
    });

    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }

    if (originalTransaction.status === 'reversed') {
      throw new Error('Transaction already reversed');
    }

    return prisma.$transaction(async (tx) => {
      // Create reversal transaction
      const reversalTransaction = await tx.points_transactions.create({
        data: {
          user_id: originalTransaction.user_id,
          points_change: -originalTransaction.points_change,
          current_balance: originalTransaction.previous_balance,
          previous_balance: originalTransaction.current_balance,
          transaction_type: POINTS_TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
          description: `撤销交易: ${reason}`,
          original_transaction_id: originalTransaction.id,
          processed_by: operatorId,
          status: 'completed',
          created_at: new Date()
        }
      });

      // Update original transaction status
      await tx.points_transactions.update({
        where: { id: originalTransaction.id },
        data: {
          status: 'reversed',
          reversal_transaction_id: reversalTransaction.id
        }
      });

      // Update user points
      await tx.user_points.update({
        where: { user_id: originalTransaction.user_id },
        data: {
          balance: { decrement: originalTransaction.points_change },
          updated_at: new Date()
        }
      });

      return reversalTransaction;
    });
  }
}

module.exports = PointsService;