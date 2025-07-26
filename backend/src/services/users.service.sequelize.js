const { models } = require('../models');
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
 * 用户服务类
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
    const existingUserByUsername = await models.User.findOne({
      where: { username, isDeleted: false },
    });

    if (existingUserByUsername) {
      throw new ConflictError('Username already exists');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingUserByEmail = await models.User.findOne({
        where: { email, isDeleted: false },
      });

      if (existingUserByEmail) {
        throw new ConflictError('Email already exists');
      }
    }

    // 只有管理员可以创建管理员用户
    if (role === USER_ROLES.ADMIN && !operatorUser.isAdmin()) {
      throw new UnauthorizedError('Only admins can create admin users');
    }

    const userToCreate = {
      ...userData,
      passwordHash: password, // 会在模型的hook中自动哈希
      role,
      status: USER_STATUS.ACTIVE,
    };

    const user = await models.User.create(userToCreate);

    logBusinessOperation({
      operation: 'user_created',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        role: user.role,
      },
    });

    return user.toSafeJSON();
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
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    // 构建查询条件
    const where = {
      isDeleted: false,
    };

    // 搜索条件
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { realName: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // 其他过滤条件
    if (role) where.role = role;
    if (status) where.status = status;

    const result = await models.User.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['passwordHash', 'emailVerificationToken'] },
    });

    return {
      users: result.rows.map(user => user.toSafeJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 根据ID获取用户详情
   * @param {number} userId - 用户ID
   * @param {Object} operatorUser - 操作用户（可选）
   * @returns {Object} 用户详情
   */
  async getUserById(userId, operatorUser = null) {
    const user = await models.User.findOne({
      where: {
        id: userId,
        isDeleted: false,
      },
      attributes: { exclude: ['passwordHash', 'emailVerificationToken'] },
      include: [
        {
          model: models.UserPoints,
          as: 'points',
          required: false,
        },
      ],
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

    return user.toSafeJSON();
  }

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 更新后的用户
   */
  async updateUser(userId, updateData, operatorUser) {
    const user = await models.User.findOne({
      where: {
        id: userId,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能修改自己的信息，或者管理员可以修改任何人的信息
    if (user.id !== operatorUser.id && !operatorUser.isAdmin()) {
      throw new UnauthorizedError('You can only update your own profile');
    }

    // 如果更新用户名，检查是否与其他用户冲突
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await models.User.findOne({
        where: {
          username: updateData.username,
          isDeleted: false,
          id: { [require('sequelize').Op.ne]: userId },
        },
      });
      if (existingUser) {
        throw new ConflictError('Username already exists');
      }
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await models.User.findOne({
        where: {
          email: updateData.email,
          isDeleted: false,
          id: { [require('sequelize').Op.ne]: userId },
        },
      });
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }
    }

    // 只有管理员可以修改角色
    if (updateData.role && updateData.role !== user.role) {
      if (!operatorUser.isAdmin()) {
        throw new UnauthorizedError('Only admins can change user roles');
      }
    }

    // 只有管理员可以修改状态
    if (updateData.status && updateData.status !== user.status) {
      if (!operatorUser.isAdmin()) {
        throw new UnauthorizedError('Only admins can change user status');
      }
    }

    // 更新用户信息
    await user.update(updateData);

    logBusinessOperation({
      operation: 'user_updated',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        changes: Object.keys(updateData),
      },
    });

    return user.toSafeJSON();
  }

  /**
   * 删除用户（软删除）
   * @param {number} userId - 用户ID
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 删除结果
   */
  async deleteUser(userId, operatorUser) {
    // 只有管理员可以删除用户
    if (!operatorUser.isAdmin()) {
      throw new UnauthorizedError('Only admins can delete users');
    }

    const user = await models.User.findOne({
      where: {
        id: userId,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 不能删除自己
    if (user.id === operatorUser.id) {
      throw new BadRequestError('You cannot delete your own account');
    }

    // 检查是否有未归还的借阅记录
    const activeBorrows = await models.Borrow.count({
      where: {
        userId: user.id,
        status: { [require('sequelize').Op.in]: ['borrowed', 'overdue'] },
      },
    });

    if (activeBorrows > 0) {
      throw new BadRequestError('Cannot delete user with active borrows');
    }

    // 软删除
    await user.softDelete();

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
    const user = await models.User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能修改自己的密码，或者管理员可以重置任何人的密码
    if (user.id !== operatorUser.id && !operatorUser.isAdmin()) {
      throw new UnauthorizedError('You can only change your own password');
    }

    // 如果不是管理员操作，需要验证当前密码
    if (user.id === operatorUser.id && !operatorUser.isAdmin()) {
      const isCurrentPasswordValid = await user.validatePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }
    }

    // 更新密码
    await user.update({
      passwordHash: newPassword, // 会在模型的hook中自动哈希
    });

    logBusinessOperation({
      operation: 'password_changed',
      userId: operatorUser.id,
      targetUserId: user.id,
      details: {
        username: user.username,
        isAdminReset: operatorUser.isAdmin() && user.id !== operatorUser.id,
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
    return await models.User.getStatistics();
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
    if (!operatorUser.isAdmin()) {
      throw new UnauthorizedError('Only admins can perform batch operations');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        const user = await models.User.findOne({
          where: { id: userId, isDeleted: false },
        });

        if (!user) {
          throw new NotFoundError(`User with ID ${userId} not found`);
        }

        // 不能对自己进行批量操作
        if (user.id === operatorUser.id) {
          throw new BadRequestError('You cannot perform batch operations on your own account');
        }

        switch (action) {
          case 'activate':
            await user.update({ status: USER_STATUS.ACTIVE });
            break;
          case 'suspend':
            await user.update({ status: USER_STATUS.SUSPENDED });
            break;
          case 'deactivate':
            await user.update({ status: USER_STATUS.INACTIVE });
            break;
          case 'delete':
            await user.softDelete();
            break;
          case 'changeRole':
            if (!params.role) {
              throw new BadRequestError('Role parameter is required');
            }
            await user.update({ role: params.role });
            break;
          default:
            throw new BadRequestError(`Unknown action: ${action}`);
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
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const { Op } = require('sequelize');

    const where = {
      isDeleted: false,
      [Op.or]: [
        { username: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { realName: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
      ],
    };

    if (role) where.role = role;
    if (status) where.status = status;

    const result = await models.User.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['passwordHash', 'emailVerificationToken'] },
    });

    return {
      users: result.rows.map(user => user.toSafeJSON()),
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
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
    const user = await models.User.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查权限：只能查看自己的借阅历史，或者管理员可以查看任何人的
    if (user.id !== operatorUser.id && !operatorUser.isAdmin()) {
      throw new UnauthorizedError('You can only view your own borrow history');
    }

    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    const where = { userId };

    if (status) where.status = status;
    if (startDate) {
      where.borrowDate = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      where.borrowDate = where.borrowDate ? 
        { ...where.borrowDate, [Op.lte]: new Date(endDate) } : 
        { [Op.lte]: new Date(endDate) };
    }

    const result = await models.Borrow.findAndCountAll({
      where,
      include: [
        {
          model: models.Book,
          attributes: ['id', 'title', 'isbn', 'authors', 'coverImage'],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      borrows: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }
}

module.exports = new UsersService();