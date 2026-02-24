const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

/**
 * User Service - 用户管理服务
 * 提供用户的增删改查、认证、权限管理等功能
 */
class UserService {
  /**
   * 创建新用户
   * @param {Object} userData 用户数据
   * @param {string} userData.username 用户名
   * @param {string} userData.email 邮箱
   * @param {string} userData.password 密码
   * @param {string} [userData.real_name] 真实姓名
   * @param {string} [userData.phone] 电话
   * @returns {Promise<Object>} 创建的用户
   */
  static async create(userData) {
    try {
      // 验证必要字段
      if (!userData?.username?.trim()) {
        throw new Error('用户名不能为空');
      }
      if (!userData?.password?.trim()) {
        throw new Error('密码不能为空');
      }
      
      // 邮箱是可选的，但如果提供了就要验证格式
      if (userData?.email && !userData.email.trim()) {
        // 如果邮箱字段存在但是空字符串，清除它
        userData.email = null;
      }

      // 检查用户名是否已存在
      const usernameExists = await this.isUsernameExists(userData.username);
      if (usernameExists) {
        throw new Error('用户名已存在');
      }

      // 如果提供了邮箱，检查邮箱是否已存在
      if (userData.email && userData.email.trim()) {
        const emailExists = await this.isEmailExists(userData.email);
        if (emailExists) {
          throw new Error('邮箱已存在');
        }
      }

      // 加密密码
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      const now = new Date();
      const createData = {
        username: userData.username.trim(),
        email: userData.email ? userData.email.trim().toLowerCase() : null,
        passwordHash,
        realName: userData.realName ?? userData.real_name ?? null,
        phone: userData.phone?.trim() || null,
        avatar: userData.avatar?.trim() || null,
        role: userData.role || USER_ROLES.PATRON,
        status: userData.status || USER_STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      return await prisma.users.create({
        data: createData,
        include: {
          userPoints: true,
          userPreferences: true
        }
      });
    } catch (error) {
      throw new Error(`创建用户失败: ${error.message}`);
    }
  }

  /**
   * 根据 ID 获取用户
   * @param {number} id 用户 ID
   * @param {boolean} includeDeleted 是否包含已删除的用户
   * @returns {Promise<Object|null>} 用户信息
   */
  static async findById(id, includeDeleted = false) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的用户 ID');
      }

      const where = { id: Number(id) };
      if (!includeDeleted) {
        where.isDeleted = false;
      }

      return await prisma.users.findUnique({
        where,
        include: {
          userPoints: true,
          userPreferences: true,
          userBorrows: {
            where: {
              status: 'borrowed',
              isDeleted: false
            },
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  isbn: true,
                  coverImage: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });
    } catch (error) {
      throw new Error(`获取用户信息失败: ${error.message}`);
    }
  }

  /**
   * 根据用户名或邮箱获取用户
   * @param {string} identifier 用户名或邮箱
   * @param {boolean} includeDeleted 是否包含已删除的用户
   * @returns {Promise<Object|null>} 用户信息
   */
  static async findByIdentifier(identifier, includeDeleted = false) {
    try {
      if (!identifier?.trim()) {
        throw new Error('用户标识符不能为空');
      }

      const where = {
        OR: [
          { username: identifier.trim() },
          { email: identifier.trim() }
        ]
      };

      if (!includeDeleted) {
        where.isDeleted = false;
      }

      // 登录/借阅等场景通常只需要用户基础信息。
      // 在某些部署环境中，关联表可能尚未完成初始化，提前 include 会导致整个查询失败。
      // 需要完整资料时请使用 getFullProfile / findById。
      return await prisma.users.findFirst({ where });
    } catch (error) {
      throw new Error(`根据标识符获取用户失败: ${error.message}`);
    }
  }


  /**
   * 验证用户密码
   * @param {Object} user 用户对象
   * @param {string} password 密码
   * @returns {Promise<boolean>} 是否匹配
   */
  static async validatePassword(user, password) {
    try {
      if (!user?.passwordHash || !password) {
        return false;
      }
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      throw new Error(`密码验证失败: ${error.message}`);
    }
  }

  /**
   * 更新用户登录信息
   * @param {number} userId 用户 ID
   * @param {string} ip IP 地址
   * @returns {Promise<Object>} 更新后的用户
   */
  static async updateLoginInfo(userId, ip) {
    try {
      if (!userId || isNaN(Number(userId))) {
        throw new Error('无效的用户 ID');
      }

      return await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip || null,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      throw new Error(`更新登录信息失败: ${error.message}`);
    }
  }

  /**
   * 更新用户信息
   * @param {number} id 用户 ID
   * @param {Object} updateData 更新数据
   * @returns {Promise<Object>} 更新后的用户
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(Number(id))) {
        throw new Error('无效的用户 ID');
      }

      // 检查用户是否存在
      const existingUser = await this.findById(id, false);
      if (!existingUser) {
        throw new Error('用户不存在');
      }

      const processedData = { ...updateData };

      // 如果更新密码，进行加密
      if (updateData.password) {
        if (updateData.password.length < 6) {
          throw new Error('密码长度不能少于 6 位');
        }
        const salt = await bcrypt.genSalt(12);
        processedData.passwordHash = await bcrypt.hash(updateData.password, salt);
        delete processedData.password;
      }

      // 检查用户名和邮箱是否已存在（排除自己）
      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await this.isUsernameExists(updateData.username, id);
        if (usernameExists) {
          throw new Error('用户名已存在');
        }
      }

      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.isEmailExists(updateData.email, id);
        if (emailExists) {
          throw new Error('邮箱已存在');
        }
      }

      processedData.updatedAt = new Date();

      return await prisma.users.update({
        where: { id: Number(id) },
        data: processedData,
        include: {
          userPoints: true,
          userPreferences: true
        }
      });
    } catch (error) {
      throw new Error(`更新用户信息失败: ${error.message}`);
    }
  }

  /**
   * Soft delete user
   */
  static async softDelete(id) {
    return prisma.users.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: USER_STATUS.INACTIVE
      }
    });
  }

  /**
   * 获取用户统计数据
   * @returns {Promise<Object>} 统计数据
   */
  static async getStatistics() {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const [total, active, admins, suspended, newThisMonth, newLastMonth] = await Promise.all([
        prisma.users.count({
          where: { isDeleted: false }
        }),
        prisma.users.count({
          where: {
            status: USER_STATUS.ACTIVE,
            isDeleted: false
          }
        }),
        prisma.users.count({
          where: {
            role: USER_ROLES.ADMIN,
            isDeleted: false
          }
        }),
        prisma.users.count({
          where: {
            status: USER_STATUS.SUSPENDED,
            isDeleted: false
          }
        }),
        prisma.users.count({
          where: {
            createdAt: { gte: thisMonthStart },
            isDeleted: false,
          },
        }),
        prisma.users.count({
          where: {
            createdAt: {
              gte: lastMonthStart,
              lt: thisMonthStart
            },
            isDeleted: false,
          },
        })
      ]);

      const inactive = total - active;
      const inactiveRate = total > 0 ? Number(((inactive / total) * 100).toFixed(2)) : 0;
      const growthRate = newLastMonth > 0 ? Number((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(2)) : 0;

      return {
        total,
        active,
        inactive,
        admins,
        suspended,
        newThisMonth,
        newLastMonth,
        inactiveRate,
        growthRate
      };
    } catch (error) {
      throw new Error(`获取用户统计数据失败: ${error.message}`);
    }
  }

  /**
   * Get active user count
   */
  static async getActiveCount() {
    return prisma.users.count({
      where: {
        status: USER_STATUS.ACTIVE,
        isDeleted: false,
      },
    });
  }

  /**
   * 获取分页用户列表
   * @param {Object} options 查询选项
   * @param {number} [options.page=1] 页码
   * @param {number} [options.limit=20] 每页数量
   * @param {string} [options.search=''] 搜索关键词
   * @param {string} [options.role] 角色过滤
   * @param {string} [options.status] 状态过滤
   * @param {string} [options.orderBy='createdAt'] 排序字段
   * @param {string} [options.order='desc'] 排序方向
   * @returns {Promise<Object>} 分页结果
   */
  static async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = null,
        status = null,
        orderBy = 'createdAt',
        order = 'desc'
      } = options;

      const skip = (Number(page) - 1) * Number(limit);
      const where = { isDeleted: false };

      const normalizedSearch = typeof search === 'string' ? search : '';

      // 搜索条件
      if (normalizedSearch) {
        where.OR = [
          { username: { contains: normalizedSearch } },
          { email: { contains: normalizedSearch } },
          { realName: { contains: normalizedSearch } },
          { phone: { contains: normalizedSearch } }
        ];
      }

      // 角色过滤
      if (role) {
        where.role = role;
      }

      // 状态过滤
      if (status) {
        where.status = status;
      }

      const [users, total] = await Promise.all([
        prisma.users.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { [orderBy]: order },
          include: {
            userPoints: true,
            _count: {
              select: {
                userBorrows: { where: { isDeleted: false } },
                userReviews: true
              }
            }
          }
        }),
        prisma.users.count({ where })
      ]);

      // 移除敏感信息
      const safeUsers = users.map(user => this.toSafeJSON(user));

      return {
        data: safeUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      };
    } catch (error) {
      throw new Error(`获取用户列表失败: ${error.message}`);
    }
  }

  /**
   * 检查用户名是否已存在
   * @param {string} username 用户名
   * @param {number} [excludeId] 排除的用户 ID
   * @returns {Promise<boolean>} 是否存在
   */
  static async isUsernameExists(username, excludeId = null) {
    try {
      if (!username?.trim()) {
        return false;
      }

      const where = {
        username: username.trim(),
        isDeleted: false
      };
      
      if (excludeId) {
        where.id = { not: Number(excludeId) };
      }

      const count = await prisma.users.count({ where });
      return count > 0;
    } catch (error) {
      throw new Error(`检查用户名失败: ${error.message}`);
    }
  }

  /**
   * 检查邮箱是否已存在
   * @param {string} email 邮箱
   * @param {number} [excludeId] 排除的用户 ID
   * @returns {Promise<boolean>} 是否存在
   */
  static async isEmailExists(email, excludeId = null) {
    try {
      if (!email?.trim()) {
        return false;
      }

      const where = {
        email: email.trim().toLowerCase(),
        isDeleted: false
      };
      
      if (excludeId) {
        where.id = { not: Number(excludeId) };
      }

      const count = await prisma.users.count({ where });
      return count > 0;
    } catch (error) {
      throw new Error(`检查邮箱失败: ${error.message}`);
    }
  }

  /**
   * 将用户对象转换为安全的 JSON 格式（移除敏感字段）
   * @param {Object} user 用户对象
   * @returns {Object} 安全的用户数据
   */
  static toSafeJSON(user) {
    if (!user) return null;

    const safeUser = { ...user };
    
    // 移除敏感或内部字段
    delete safeUser.passwordHash;
    delete safeUser.emailVerificationToken;
    delete safeUser.isDeleted;
    delete safeUser.deletedAt;
    delete safeUser.wechatOpenid;
    delete safeUser.wechatUnionid;
    
    // 确保数据类型正确
    if (safeUser.id) safeUser.id = Number(safeUser.id);

    return safeUser;
  }

  /**
   * 检查用户权限和状态
   */
  
  /**
   * 检查是否为管理员
   * @param {Object} user 用户对象
   * @returns {boolean} 是否为管理员
   */
  static isAdmin(user) {
    return user?.role === USER_ROLES.ADMIN;
  }

  /**
   * 检查用户是否激活
   * @param {Object} user 用户对象
   * @returns {boolean} 是否激活
   */
  static isActive(user) {
    return user?.status === USER_STATUS.ACTIVE && !user?.isDeleted;
  }

  /**
   * 检查用户是否可以借书
   * @param {Object} user 用户对象
   * @returns {boolean} 是否可以借书
   */
  static canBorrow(user) {
    return this.isActive(user) && user?.status !== USER_STATUS.SUSPENDED;
  }

  /**
   * 检查是否为图书管理员
   * @param {Object} user 用户对象
   * @returns {boolean} 是否为图书管理员
   */
  static isLibrarian(user) {
    return user?.role === USER_ROLES.LIBRARIAN || user?.role === USER_ROLES.ADMIN;
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
    const now = new Date();
    return prisma.user_points.upsert({
      where: { userId: userId },
      update: {
        balance: newBalance,
        totalEarned: pointsChange > 0 ? { increment: pointsChange } : undefined,
        totalSpent: pointsChange < 0 ? { increment: Math.abs(pointsChange) } : undefined,
        lastTransactionAt: now,
        updatedAt: now
      },
      create: {
        userId: userId,
        balance: newBalance,
        totalEarned: pointsChange > 0 ? pointsChange : 0,
        totalSpent: pointsChange < 0 ? Math.abs(pointsChange) : 0,
        lastTransactionAt: now,
        createdAt: now,
        updatedAt: now
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
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            book: true
          }
        },
        userReviews: {
          orderBy: { createdAt: 'desc' },
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
