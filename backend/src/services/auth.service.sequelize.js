const { models } = require('../models');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../middlewares/auth.middleware');
const { 
  UnauthorizedError, 
  ConflictError, 
  BadRequestError,
  WechatError,
  NotFoundError 
} = require('../utils/apiError');
const { logBusinessOperation, logSecurityEvent } = require('../utils/logger');
const config = require('../config');

/**
 * 认证服务类
 * 处理用户认证相关的业务逻辑
 */
class AuthService {
  /**
   * 用户注册
   * @param {Object} userData - 用户注册数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.email - 邮箱
   * @param {string} userData.password - 密码
   * @param {string} userData.realName - 真实姓名
   * @param {string} userData.phone - 手机号
   * @returns {Object} 注册结果
   */
  async register(userData) {
    const { username, email, password, realName, phone } = userData;

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

    // 检查手机号是否已存在
    if (phone) {
      const existingUserByPhone = await models.User.findOne({
        where: { phone, isDeleted: false },
      });

      if (existingUserByPhone) {
        throw new ConflictError('Phone number already exists');
      }
    }

    return models.sequelize.transaction(async (transaction) => {
      // 创建用户
      const user = await models.User.create({
        username,
        email,
        passwordHash: password, // 会被模型的beforeSave hook自动哈希
        realName,
        phone,
        role: 'patron',
        status: 'active',
      }, { transaction });

      // 为用户创建积分记录
      await models.UserPoints.findOrCreateForUser(user.id, transaction);

      logBusinessOperation('USER_REGISTER', user.id, {
        username: user.username,
        email: user.email,
      });

      return {
        user: user.toSafeJSON(),
        message: 'User registered successfully',
      };
    });
  }

  /**
   * 用户登录
   * @param {string} username - 用户名或邮箱
   * @param {string} password - 密码
   * @param {string} ip - 登录IP
   * @param {string} userAgent - 用户代理
   * @returns {Object} 登录结果
   */
  async login(username, password, ip, userAgent) {
    // 查找用户
    const user = await models.User.findByIdentifier(username);

    if (!user) {
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { ip }, {
        username,
        userAgent,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // 验证密码
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', { ip }, {
        userId: user.id,
        username: user.username,
        userAgent,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // 检查用户状态
    if (!user.isActive()) {
      logSecurityEvent('LOGIN_FAILED_INACTIVE_USER', { ip }, {
        userId: user.id,
        username: user.username,
        status: user.status,
        userAgent,
      });
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    // 更新登录信息
    await user.updateLoginInfo(ip);

    // 加载用户积分信息
    const userWithPoints = await models.User.findByPk(user.id, {
      include: [
        {
          model: models.UserPoints,
          as: 'points',
          required: false,
        },
      ],
    });

    // 生成令牌
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logBusinessOperation('USER_LOGIN', user.id, {
      ip,
      userAgent,
      loginMethod: 'password',
    });

    return {
      user: userWithPoints.toSafeJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.jwtConfig.expiresIn,
      },
      message: 'Login successful',
    };
  }

  /**
   * 微信小程序登录
   * @param {string} code - 微信登录凭证
   * @param {Object} userInfo - 微信用户信息
   * @param {string} ip - 登录IP
   * @param {string} userAgent - 用户代理
   * @returns {Object} 登录结果
   */
  async wechatLogin(code, userInfo = {}, ip, userAgent) {
    try {
      // 调用微信API获取用户信息
      const wechatData = await this.getWechatUserData(code);

      // 查找或创建用户
      let user = await models.User.findByWechatOpenid(wechatData.openid);

      if (!user) {
        // 创建新用户
        user = await models.User.createWechatUser(wechatData, userInfo);
        
        // 为新用户创建积分记录
        await models.UserPoints.findOrCreateForUser(user.id);

        logBusinessOperation('USER_REGISTER_WECHAT', user.id, {
          openid: wechatData.openid,
          unionid: wechatData.unionid,
          ip,
        });
      } else {
        // 更新现有用户的微信信息
        if (wechatData.unionid && user.wechatUnionid !== wechatData.unionid) {
          user.wechatUnionid = wechatData.unionid;
          await user.save();
        }

        // 更新登录信息
        await user.updateLoginInfo(ip);
      }

      // 检查用户状态
      if (!user.isActive()) {
        logSecurityEvent('WECHAT_LOGIN_FAILED_INACTIVE_USER', { ip }, {
          userId: user.id,
          openid: wechatData.openid,
          status: user.status,
        });
        throw new UnauthorizedError('Account is inactive or suspended');
      }

      // 加载用户积分信息
      const userWithPoints = await models.User.findByPk(user.id, {
        include: [
          {
            model: models.UserPoints,
            as: 'points',
            required: false,
          },
        ],
      });

      // 生成令牌
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logBusinessOperation('USER_LOGIN', user.id, {
        ip,
        userAgent,
        loginMethod: 'wechat',
        openid: wechatData.openid,
      });

      return {
        user: userWithPoints.toSafeJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.jwtConfig.expiresIn,
        },
        isNewUser: !user.lastLoginAt,
        message: 'WeChat login successful',
      };
    } catch (error) {
      if (error instanceof WechatError) {
        throw error;
      }
      
      logSecurityEvent('WECHAT_LOGIN_ERROR', { ip }, {
        code,
        error: error.message,
        userAgent,
      });
      
      throw new WechatError('WeChat login failed');
    }
  }

  /**
   * 刷新访问令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object} 新的令牌
   */
  async refreshToken(refreshToken) {
    try {
      // 验证刷新令牌
      const decoded = verifyRefreshToken(refreshToken);
      const userId = decoded.sub || decoded.userId;

      // 获取用户信息
      const user = await models.User.findByPk(userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive()) {
        throw new UnauthorizedError('Account is inactive');
      }

      // 生成新的访问令牌
      const newAccessToken = generateAccessToken(user);

      logBusinessOperation('TOKEN_REFRESH', user.id);

      return {
        accessToken: newAccessToken,
        expiresIn: config.jwt.jwtConfig.expiresIn,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * 用户登出
   * @param {Object} user - 用户对象
   * @param {string} token - 访问令牌
   * @returns {Object} 登出结果
   */
  async logout(user, token) {
    // TODO: 实现令牌黑名单机制
    // 这里可以将token添加到Redis黑名单中

    logBusinessOperation('USER_LOGOUT', user.id);

    return {
      message: 'Logout successful',
    };
  }

  /**
   * 修改密码
   * @param {Object} user - 用户对象
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @returns {Object} 修改结果
   */
  async changePassword(user, currentPassword, newPassword) {
    // 验证当前密码
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', { ip: 'unknown' }, {
        userId: user.id,
        reason: 'invalid_current_password',
      });
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await user.validatePassword(newPassword);

    if (isSamePassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    // 更新密码
    user.passwordHash = newPassword; // 会被模型的beforeSave hook自动哈希
    await user.save();

    logBusinessOperation('PASSWORD_CHANGE', user.id);

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * 重置密码（忘记密码）
   * @param {string} email - 邮箱
   * @returns {Object} 重置结果
   */
  async resetPassword(email) {
    const user = await models.User.findOne({
      where: { email, isDeleted: false },
    });

    if (!user) {
      // 为了安全，即使用户不存在也返回成功消息
      return {
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // TODO: 实现密码重置令牌和邮件发送
    // 1. 生成重置令牌
    // 2. 保存到数据库或Redis
    // 3. 发送重置邮件

    logBusinessOperation('PASSWORD_RESET_REQUEST', user.id, { email });

    return {
      message: 'If the email exists, a reset link has been sent',
    };
  }

  /**
   * 获取当前用户信息
   * @param {number} userId - 用户ID
   * @returns {Object} 用户信息
   */
  async getCurrentUser(userId) {
    const user = await models.User.findByPk(userId, {
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

    return user.toSafeJSON();
  }

  /**
   * 更新用户资料
   * @param {Object} user - 用户对象
   * @param {Object} updateData - 更新数据
   * @returns {Object} 更新结果
   */
  async updateProfile(user, updateData) {
    const { realName, phone, avatar, bio, preferences } = updateData;

    // 检查手机号是否被其他用户使用
    if (phone && phone !== user.phone) {
      const existingUser = await models.User.findOne({
        where: { 
          phone, 
          isDeleted: false,
          id: { [models.sequelize.Sequelize.Op.ne]: user.id },
        },
      });

      if (existingUser) {
        throw new ConflictError('Phone number already exists');
      }
    }

    // 更新用户信息
    const updates = {};
    if (realName !== undefined) updates.realName = realName;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;
    if (preferences !== undefined) {
      updates.preferences = {
        ...user.preferences,
        ...preferences,
      };
    }

    await user.update(updates);

    logBusinessOperation('PROFILE_UPDATE', user.id, {
      updatedFields: Object.keys(updates),
    });

    return {
      user: user.toSafeJSON(),
      message: 'Profile updated successfully',
    };
  }

  /**
   * 调用微信API获取用户数据
   * @param {string} code - 微信登录凭证
   * @returns {Object} 微信用户数据
   * @private
   */
  async getWechatUserData(code) {
    const axios = require('axios');
    
    const { appId, appSecret, loginUrl } = config.wechat;

    if (!appId || !appSecret) {
      throw new WechatError('WeChat configuration not found');
    }

    try {
      const response = await axios.get(loginUrl, {
        params: {
          appid: appId,
          secret: appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
        timeout: 10000,
      });

      const data = response.data;

      if (data.errcode) {
        throw new WechatError(`WeChat API error: ${data.errmsg}`, data.errcode);
      }

      if (!data.openid) {
        throw new WechatError('Invalid WeChat response: missing openid');
      }

      return {
        openid: data.openid,
        unionid: data.unionid,
        sessionKey: data.session_key,
      };
    } catch (error) {
      if (error instanceof WechatError) {
        throw error;
      }

      console.error('WeChat API request failed:', error);
      throw new WechatError('Failed to connect to WeChat service');
    }
  }
}

module.exports = new AuthService();