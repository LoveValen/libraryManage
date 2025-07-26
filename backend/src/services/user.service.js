const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

class UserService {
  /**
   * Create a new user
   */
  static async create(userData) {
    // Hash password if provided
    if (userData.password) {
      const salt = await bcrypt.genSalt(12);
      userData.password_hash = await bcrypt.hash(userData.password, salt);
      delete userData.password;
    }

    // Set default preferences if not provided
    if (!userData.preferences) {
      userData.preferences = {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          sms: false,
          push: true,
          dueDateReminder: true,
          overdueNotice: true,
          pointsUpdate: true,
        },
        privacy: {
          profileVisible: true,
          readingHistoryVisible: false,
          pointsVisible: true,
        },
      };
    }

    return prisma.users.create({
      data: userData,
      include: {
        userPoints: true,
        userPreferences: true
      }
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id, includeDeleted = false) {
    const where = { id };
    if (!includeDeleted) {
      where.is_deleted = false;
    }

    return prisma.users.findUnique({
      where,
      include: {
        userPoints: true,
        userPreferences: true,
        userBorrows: {
          where: { status: 'borrowed' },
          include: { book: true }
        }
      }
    });
  }

  /**
   * Find user by username or email
   */
  static async findByIdentifier(identifier, includeDeleted = false) {
    const where = {
      OR: [
        { username: identifier },
        { email: identifier }
      ]
    };

    if (!includeDeleted) {
      where.is_deleted = false;
    }

    return prisma.users.findFirst({
      where,
      include: {
        userPoints: true,
        userPreferences: true
      }
    });
  }

  /**
   * Find user by WeChat OpenID
   */
  static async findByWechatOpenid(openid) {
    return prisma.users.findUnique({
      where: { 
        wechat_openid: openid,
        is_deleted: false 
      },
      include: {
        userPoints: true,
        userPreferences: true
      }
    });
  }

  /**
   * Create WeChat user
   */
  static async createWechatUser(wechatData, userInfo = {}) {
    return this.create({
      username: `wx_${wechatData.openid.slice(-8)}`,
      wechat_openid: wechatData.openid,
      wechat_unionid: wechatData.unionid,
      real_name: userInfo.nickName,
      avatar: userInfo.avatarUrl,
      role: USER_ROLES.PATRON,
      status: USER_STATUS.ACTIVE,
    });
  }

  /**
   * Validate user password
   */
  static async validatePassword(user, password) {
    if (!user.password_hash) {
      return false;
    }
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update user login info
   */
  static async updateLoginInfo(userId, ip) {
    return prisma.users.update({
      where: { id: userId },
      data: {
        last_login_at: new Date(),
        last_login_ip: ip,
        login_count: { increment: 1 }
      }
    });
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    // Hash password if being updated
    if (updateData.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password_hash = await bcrypt.hash(updateData.password, salt);
      delete updateData.password;
    }

    return prisma.users.update({
      where: { id },
      data: updateData,
      include: {
        userPoints: true,
        userPreferences: true
      }
    });
  }

  /**
   * Soft delete user
   */
  static async softDelete(id) {
    return prisma.users.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        status: USER_STATUS.INACTIVE
      }
    });
  }

  /**
   * Get user statistics
   */
  static async getStatistics() {
    const [total, active, admins, newThisMonth] = await Promise.all([
      prisma.users.count({ where: { is_deleted: false } }),
      prisma.users.count({ 
        where: { 
          status: USER_STATUS.ACTIVE, 
          is_deleted: false 
        } 
      }),
      prisma.users.count({ 
        where: { 
          role: USER_ROLES.ADMIN, 
          is_deleted: false 
        } 
      }),
      prisma.users.count({
        where: {
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          is_deleted: false,
        },
      })
    ]);

    return {
      total,
      active,
      admins,
      newThisMonth,
      inactiveRate: total > 0 ? ((total - active) / total * 100).toFixed(2) : 0,
    };
  }

  /**
   * Get active user count
   */
  static async getActiveCount() {
    return prisma.users.count({
      where: {
        status: USER_STATUS.ACTIVE,
        is_deleted: false,
      },
    });
  }

  /**
   * Find users with pagination
   */
  static async findWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = null,
      status = null,
      orderBy = 'created_at',
      order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = { is_deleted: false };

    // Add search conditions
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { real_name: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // Add role filter
    if (role) {
      where.role = role;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          userPoints: true,
          _count: {
            select: {
              userBorrows: true,
              userReviews: true
            }
          }
        }
      }),
      prisma.users.count({ where })
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if username exists
   */
  static async isUsernameExists(username, excludeId = null) {
    const where = { username };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.users.count({ where });
    return count > 0;
  }

  /**
   * Check if email exists
   */
  static async isEmailExists(email, excludeId = null) {
    const where = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.users.count({ where });
    return count > 0;
  }

  /**
   * Get user safe data (remove sensitive fields)
   */
  static toSafeJSON(user) {
    const safeUser = { ...user };
    delete safeUser.password_hash;
    delete safeUser.email_verification_token;
    delete safeUser.is_deleted;
    delete safeUser.deleted_at;
    return safeUser;
  }

  /**
   * Check user permissions
   */
  static isAdmin(user) {
    return user.role === USER_ROLES.ADMIN;
  }

  static isActive(user) {
    return user.status === USER_STATUS.ACTIVE && !user.is_deleted;
  }

  static canBorrow(user) {
    return this.isActive(user) && user.status !== USER_STATUS.SUSPENDED;
  }

  /**
   * Update user points
   */
  static async updatePoints(userId, pointsChange, transaction) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { userPoints: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = user.userPoints?.balance || 0;
    const newBalance = currentBalance + pointsChange;

    if (newBalance < 0) {
      throw new Error('Insufficient points');
    }

    // Update or create user points
    return prisma.userPoints.upsert({
      where: { user_id: userId },
      update: {
        balance: newBalance,
        total_earned: pointsChange > 0 ? { increment: pointsChange } : undefined,
        total_spent: pointsChange < 0 ? { increment: Math.abs(pointsChange) } : undefined,
        last_transaction_at: new Date()
      },
      create: {
        user_id: userId,
        balance: newBalance,
        total_earned: pointsChange > 0 ? pointsChange : 0,
        total_spent: pointsChange < 0 ? Math.abs(pointsChange) : 0,
        last_transaction_at: new Date()
      }
    });
  }

  /**
   * Get user with all relations
   */
  static async getFullProfile(userId) {
    return prisma.users.findUnique({
      where: { id: userId },
      include: {
        userPoints: true,
        userPreferences: true,
        userBorrows: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            book: true
          }
        },
        userReviews: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            book: true
          }
        },
        _count: {
          select: {
            userBorrows: true,
            userReviews: true,
            recommendations: true
          }
        }
      }
    });
  }
}

module.exports = UserService;