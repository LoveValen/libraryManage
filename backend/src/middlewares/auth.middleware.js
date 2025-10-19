const jwt = require('jsonwebtoken');
const UserService = require('../services/user.service');
const RolesService = require('../services/roles.service');
const { jwtConfig } = require('../config/jwt.config');
const { UnauthorizedError, ForbiddenError } = require('../utils/apiError');

/**
 * JWT认证中间件 - 简化版本
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedError('登录凭证缺失');
    }

    const decoded = jwt.verify(token, jwtConfig.secret);
    const userId = decoded.sub || decoded.userId;

    if (!userId) {
      throw new UnauthorizedError('无效的登录凭证');
    }

    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError('用户账户已被禁用');
    }

    const accessContext = await RolesService.getUserAccessContext(user.id);
    const contextPermissions = Array.isArray(accessContext.permissions) ? accessContext.permissions : [];
    const contextRoles = Array.isArray(accessContext.roles) ? accessContext.roles : [];
    const contextResources = accessContext.resources || null;

    const tokenPermissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];
    const tokenRoles = Array.isArray(decoded.roles) ? decoded.roles : [];

    const permissionSet = new Set([...contextPermissions, ...tokenPermissions]);
    if (user.role === 'admin') {
      permissionSet.add('*');
    }

    const roleSet = new Set([
      ...contextRoles,
      ...tokenRoles,
      typeof user.role === 'string' ? user.role : null,
    ].filter((role) => typeof role === 'string' && role.trim().length > 0));

    const permissions = Array.from(permissionSet);
    const roles = Array.from(roleSet);

    const enrichedUser = { ...user, permissions, roles };
    if (contextResources) {
      enrichedUser.accessResources = contextResources;
    }

    req.user = enrichedUser;
    req.token = decoded;
    req.tokenPayload = { ...decoded, permissions, roles };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('登录凭证已过期'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('无效的登录凭证'));
    }
    next(error);
  }
};

/**
 * 可选认证中间件 - 有token则验证，无token则跳过
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  // 有token则进行验证
  return authenticateToken(req, res, next);
};

/**
 * 生成JWT令牌
 */
const generateToken = (user, options = {}) => {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const permissionList = Array.isArray(user.permissions) ? [...user.permissions] : [];
  if (user.role === 'admin' && !permissionList.includes('*')) {
    permissionList.push('*');
  }
  if (permissionList.length > 0) {
    payload.permissions = Array.from(new Set(permissionList));
  }

  const roleList = Array.isArray(user.roles) ? [...user.roles] : [];
  if (user.role && typeof user.role === 'string') {
    roleList.push(user.role);
  }
  if (roleList.length > 0) {
    payload.roles = Array.from(new Set(roleList));
  }

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: options.expiresIn || jwtConfig.expiresIn,
    subject: user.id.toString(),
  });
};

/**
 * 验证刷新令牌
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

/**
 * 角色授权中间件
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要登录'));
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`权限不足，需要角色：${roles.join(' 或 ')}`));
    }

    next();
  };
};

/**
 * 管理员权限中间件
 */
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyRefreshToken,
  requireRole,
  requireAdmin,
  // 别名
  authenticate: authenticateToken,
  authorize: requireRole,
};
