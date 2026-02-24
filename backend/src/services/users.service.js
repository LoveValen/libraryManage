const prisma = require('../utils/prisma');
const UserService = require('./user.service');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError,
  UnauthorizedError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

/**
 * 用户服务类 (Prisma版本)
 * 处理用户相关的业务逻辑
 */
class UsersService {
  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 创建的用户
   */
  async createUser(userData, operatorUser) {
    const { username, email, password, role = USER_ROLES.PATRON } = userData;

    // 检查用户名是否已存在
    const existingUserByUsername = await UserService.isUsernameExists(username);
    if (existingUserByUsername) {
      throw new ConflictError('Username already exists');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingUserByEmail = await UserService.isEmailExists(email);
      if (existingUserByEmail) {
        throw new ConflictError('Email already exists');
      }
    }

    // 只有管理员可以创建管理员用户
    if (role === USER_ROLES.ADMIN && !UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('Only admins can create admin users');
    }

    const userToCreate = {
      ...userData,
      password,
      role,
      status: USER_STATUS.ACTIVE,
    };

    const user = await UserService.create(userToCreate);

    logBusinessOperation({
      operation: 'user_created',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        role: user.role,
      },
    });

    return UserService.toSafeJSON(user);
  }

  /**
   * 获取用户列表
   * @param {Object} filters - 过滤条件
   * @returns {Object} 用户列表和分页信息
   */
  async getUserList(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const result = await UserService.findWithPagination({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
      status,
      orderBy: sortBy,
      order: sortOrder,
    });

    return {
      users: result.data.map(user => UserService.toSafeJSON(user)),
      pagination: result.pagination,
    };
  }

  /**
   * 根据ID获取用户详情
   * @param {number} userId - 用户ID
   * @param {Object} operatorUser - 操作用户（可选）
   * @returns {Object} 用户详情
   */
  async getUserById(userId, operatorUser = null) {
    const user = await prisma.users.findUnique({
      where: {
        id: parseInt(userId),
        isDeleted: false,
      },
      include: {
        userPoints: true,
        _count: {
          select: {
            userBorrows: true,
            userReviews: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 记录访问日志
    if (operatorUser) {
      logBusinessOperation({
        operation: 'user_viewed',
        userId: operatorUser.id,
        targetUserId: user.id,
        details: {
          username: user.username,
        },
      });
    }

    return UserService.toSafeJSON(user);
  }

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 更新后的用户
   */
  async updateUser(userId, updateData, operatorUser) {
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能修改自己的信息，或者管理员可以修改任何人的信息
    if (user.id !== operatorUser.id && !UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('You can only update your own profile');
    }

    // 如果更新用户名，检查是否与其他用户冲突
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await UserService.isUsernameExists(updateData.username, userId);
      if (existingUser) {
        throw new ConflictError('Username already exists');
      }
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await UserService.isEmailExists(updateData.email, userId);
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }
    }

    // 只有管理员可以修改角色
    if (updateData.role && updateData.role !== user.role) {
      if (!UserService.isAdmin(operatorUser)) {
        throw new UnauthorizedError('Only admins can change user roles');
      }
    }

    // 只有管理员可以修改状态
    if (updateData.status && updateData.status !== user.status) {
      if (!UserService.isAdmin(operatorUser)) {
        throw new UnauthorizedError('Only admins can change user status');
      }
    }

    // 更新用户信息
    const updatedUser = await UserService.update(parseInt(userId), updateData);

    logBusinessOperation({
      operation: 'user_updated',
      userId: operatorUser.id,
      targetUserId: updatedUser.id,
      details: {
        username: updatedUser.username,
        changes: Object.keys(updateData),
      },
    });

    return UserService.toSafeJSON(updatedUser);
  }

  /**
   * 删除用户（软删除）
   * @param {number} userId - 用户ID
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 删除结果
   */
  async deleteUser(userId, operatorUser) {
    // 只有管理员可以删除用户
    if (!UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('Only admins can delete users');
    }

    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 不能删除自己
    if (user.id === operatorUser.id) {
      throw new BadRequestError('You cannot delete your own account');
    }

    // 检查是否有未归还的借阅记录
    const activeBorrows = await prisma.borrows.count({
      where: {
        userId: parseInt(userId),
        status: { in: ['borrowed', 'overdue'] },
      },
    });

    if (activeBorrows > 0) {
      throw new BadRequestError('Cannot delete user with active borrows');
    }

    // 软删除
    await UserService.softDelete(parseInt(userId));

    logBusinessOperation({
      operation: 'user_deleted',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        role: user.role,
      },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  /**
   * 修改用户密码
   * @param {number} userId - 用户ID
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 修改结果
   */
  async changePassword(userId, currentPassword, newPassword, operatorUser) {
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能修改自己的密码，或者管理员可以重置任何人的密码
    if (user.id !== operatorUser.id && !UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('You can only change your own password');
    }

    // 如果不是管理员操作，需要验证当前密码
    if (user.id === operatorUser.id && !UserService.isAdmin(operatorUser)) {
      const isCurrentPasswordValid = await UserService.validatePassword(user, currentPassword);
      if (!isCurrentPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }
    }

    // 更新密码
    await UserService.update(parseInt(userId), {
      password: newPassword,
    });

    logBusinessOperation({
      operation: 'password_changed',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        isAdminReset: UserService.isAdmin(operatorUser) && user.id !== operatorUser.id,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * 获取用户统计信息
   * @returns {Object} 统计信息
   */
  async getUserStatistics() {
    return await UserService.getStatistics();
  }

  /**
   * 批量操作用户
   * @param {Array} userIds - 用户ID列表
   * @param {string} action - 操作类型
   * @param {Object} params - 操作参数
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 操作结果
   */
  async batchUpdateUsers(userIds, action, params, operatorUser) {
    // 只有管理员可以批量操作
    if (!UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('Only admins can perform batch operations');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        const user = await UserService.findById(parseInt(userId));

        if (!user) {
          throw new NotFoundError(`User with ID ${userId} not found`);
        }

        // 不能对自己进行批量操作
        if (user.id === operatorUser.id) {
          throw new BadRequestError('You cannot perform batch operations on your own account');
        }

        let updateData = {};
        
        switch (action) {
          case 'activate':
            updateData = { status: USER_STATUS.ACTIVE };
            break;
          case 'suspend':
            updateData = { status: USER_STATUS.SUSPENDED };
            break;
          case 'deactivate':
            updateData = { status: USER_STATUS.INACTIVE };
            break;
          case 'delete':
            await UserService.softDelete(parseInt(userId));
            break;
          case 'changeRole':
            if (!params.role) {
              throw new BadRequestError('Role parameter is required');
            }
            updateData = { role: params.role };
            break;
          default:
            throw new BadRequestError(`Unknown action: ${action}`);
        }

        if (action !== 'delete' && Object.keys(updateData).length > 0) {
          await UserService.update(parseInt(userId), updateData);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message,
        });
      }
    }

    logBusinessOperation({
      operation: 'users_batch_update',
      userId: operatorUser.id,
      details: {
        action,
        totalUsers: userIds.length,
        successCount: results.success,
        failedCount: results.failed,
      },
    });

    return results;
  }

  /**
   * 搜索用户
   * @param {string} query - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Object} 搜索结果
   */
  async searchUsers(query, options = {}) {
    const {
      role,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const page = Math.floor(offset / limit) + 1;

    const result = await UserService.findWithPagination({
      page,
      limit: parseInt(limit),
      search: query,
      role,
      status,
      orderBy: sortBy,
      order: sortOrder,
    });

    return {
      users: result.data.map(user => UserService.toSafeJSON(user)),
      pagination: {
        page,
        limit: parseInt(limit),
        total: result.pagination.total,
        pages: result.pagination.totalPages,
      },
    };
  }

  /**
   * 获取用户借阅历史
   * @param {number} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 借阅历史
   */
  async getUserBorrowHistory(userId, filters = {}, operatorUser) {
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能查看自己的借阅历史，或者管理员可以查看任何人的
    if (user.id !== operatorUser.id && !UserService.isAdmin(operatorUser)) {
      throw new UnauthorizedError('You can only view your own borrow history');
    }

    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * limit;
    const where = { userId: parseInt(userId) };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.borrowDate = {};
      if (startDate) {
        where.borrowDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.borrowDate.lte = new Date(endDate);
      }
    }

    const [borrows, total] = await Promise.all([
      prisma.borrows.findMany({
        where,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              authors: true,
              coverImage: true,
            }
          },
        },
        orderBy: { borrowDate: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.borrows.count({ where })
    ]);

    return {
      borrows: borrows.map(borrow => ({
        ...borrow,
        // Alias renewalCount as renewCount for frontend compatibility
        renewCount: borrow.renewalCount,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new UsersService();