const prisma = require('../utils/prisma');
const UserService = require('./user.service');
const { 
  generateToken, 
  verifyRefreshToken 
} = require('../middlewares/auth.middleware');
const RolesService = require('./roles.service');
const {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  NotFoundError
} = require('../utils/apiError');
const { logBusinessOperation, logSecurityEvent } = require('../utils/logger');
const config = require('../config');

/**
 * Authentication Service using Prisma
 */
class AuthService {
  /**
   * User registration
   */
  async register(userData) {
    const { username, email, password, realName, phone } = userData;

    // Check if username exists
    if (await UserService.isUsernameExists(username)) {
      throw new ConflictError('Username already exists');
    }

    // Check if email exists
    if (email && await UserService.isEmailExists(email)) {
      throw new ConflictError('Email already exists');
    }

    // Check if phone exists
    if (phone) {
      const existingPhone = await prisma.users.findFirst({
        where: { phone, isDeleted: false }
      });
      if (existingPhone) {
        throw new ConflictError('Phone number already exists');
      }
    }

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await UserService.create({
        username,
        email,
        password,
        realName: realName,
        phone,
        role: 'patron',
        status: 'active'
      });

      // Create user points record
      const now = new Date();
      await tx.user_points.create({
        data: {
          userId: user.id,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          level: 'NEWCOMER',
          createdAt: now,
          updatedAt: now,
          levelName: '新手读者'
        }
      });

      logBusinessOperation('USER_REGISTER', user.id, {
        username: user.username,
        email: user.email
      });

      return user;
    });

    return {
      user: UserService.toSafeJSON(result),
      message: 'User registered successfully'
    };
  }

  /**
   * User login
   */
  async login(username, password, ip, userAgent) {
    // Find user
    const user = await UserService.findByIdentifier(username);

    if (!user) {
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { ip }, {
        username,
        userAgent
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await UserService.validatePassword(user, password);

    if (!isPasswordValid) {
      logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', { ip }, {
        userId: user.id,
        username: user.username,
        userAgent
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check user status
    if (!UserService.isActive(user)) {
      logSecurityEvent('LOGIN_FAILED_INACTIVE_USER', { ip }, {
        userId: user.id,
        username: user.username,
        status: user.status,
        userAgent
      });
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    // Update login info
    await UserService.updateLoginInfo(user.id, ip);

    // 加载角色与权限上下文
    const accessContext = await RolesService.getUserAccessContext(user.id);
    const permissions = Array.isArray(accessContext.permissions) ? accessContext.permissions : [];
    const roles = Array.isArray(accessContext.roles) ? accessContext.roles : [];
    const accessResources = accessContext.resources || null;

    // 组合鉴权载荷
    const enrichedUser = { ...user, permissions, roles };

    // 生成访问令牌与刷新令牌
    const accessToken = generateToken(enrichedUser);
    const refreshTokenValue = generateToken(enrichedUser, { expiresIn: '7d' });

    logBusinessOperation('USER_LOGIN', user.id, {
      ip,
      userAgent,
      loginMethod: 'password'
    });

    const safeUser = UserService.toSafeJSON(enrichedUser);
    safeUser.permissions = permissions;
    safeUser.roles = roles;
    safeUser.accessResources = accessResources;

    return {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: config.jwt.jwtConfig.expiresIn
      },
      message: 'Login successful'
    };
  }


  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user
      const user = await UserService.findById(decoded.userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!UserService.isActive(user)) {
        throw new UnauthorizedError('Account is inactive or suspended');
      }

      const accessContext = await RolesService.getUserAccessContext(user.id);
      const permissions = Array.isArray(accessContext.permissions) ? accessContext.permissions : [];
      const roles = Array.isArray(accessContext.roles) ? accessContext.roles : [];
      const enrichedUser = { ...user, permissions, roles };

      // Generate new access token
      const accessToken = generateToken(enrichedUser);

      return {
        accessToken,
        expiresIn: config.jwt.jwtConfig.expiresIn,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * User logout
   */
  async logout(user, token) {
    // Log the logout action
    logBusinessOperation('USER_LOGOUT', user.id, {
      tokenInfo: {
        issuedAt: new Date(token.iat * 1000),
        expiresAt: new Date(token.exp * 1000)
      }
    });

    // In a real implementation, you might want to blacklist the token
    // or store it in a cache to prevent reuse

    return {
      message: 'Logged out successfully'
    };
  }

  /**
   * Change password
   */
  async changePassword(user, currentPassword, newPassword) {
    // Get fresh user data
    const freshUser = await UserService.findById(user.id);

    // Validate current password
    const isPasswordValid = await UserService.validatePassword(freshUser, currentPassword);

    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Update password
    await UserService.update(user.id, { password: newPassword });

    logBusinessOperation('USER_CHANGE_PASSWORD', user.id, {});

    return {
      message: 'Password changed successfully'
    };
  }

  /**
   * Reset password (forgot password)
   */
  async resetPassword(email) {
    const user = await prisma.users.findFirst({
      where: { email, isDeleted: false }
    });

    if (!user) {
      throw new NotFoundError('User with this email does not exist');
    }

    // Generate reset token (in a real implementation)
    // const resetToken = generateResetToken();
    // await UserService.update(user.id, { reset_token: resetToken });


    logBusinessOperation('USER_PASSWORD_RESET_REQUEST', user.id, { email });

    return {
      message: 'Password reset instructions sent to your email'
    };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId) {
    const user = await UserService.getFullProfile(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessContext = await RolesService.getUserAccessContext(user.id);
    const permissions = Array.isArray(accessContext.permissions) ? accessContext.permissions : [];
    const roles = Array.isArray(accessContext.roles) ? accessContext.roles : [];
    const accessResources = accessContext.resources || null;

    const safeUser = UserService.toSafeJSON(user);
    safeUser.permissions = permissions;
    safeUser.roles = roles;
    safeUser.accessResources = accessResources;

    return safeUser;
  }

  /**
   * Update user profile
   */
  async updateProfile(user, updateData) {
    // Remove fields that shouldn't be updated through this endpoint
    delete updateData.password;
    delete updateData.password_hash;
    delete updateData.role;
    delete updateData.status;
    delete updateData.points_balance;

    const updatedUser = await UserService.update(user.id, updateData);

    logBusinessOperation('USER_UPDATE_PROFILE', user.id, {
      updatedFields: Object.keys(updateData)
    });

    return {
      user: UserService.toSafeJSON(updatedUser),
      message: 'Profile updated successfully'
    };
  }

}

module.exports = new AuthService();
