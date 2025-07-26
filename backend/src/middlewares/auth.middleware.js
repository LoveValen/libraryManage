const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const UserService = require('../services/user.service');
const { jwtConfig, verifyTokenOptions } = require('../config/jwt.config');
const { UnauthorizedError, ForbiddenError, JWTError } = require('../utils/apiError');
const { logSecurityEvent } = require('../utils/logger');

/**
 * JWT认证中间件
 * 验证请求头中的JWT令牌并提取用户信息
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      logSecurityEvent('MISSING_TOKEN', req, {
        message: 'No authentication token provided',
      });
      throw new UnauthorizedError('Access token is required');
    }

    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret, verifyTokenOptions);
    } catch (jwtError) {
      logSecurityEvent('INVALID_TOKEN', req, {
        message: 'Invalid or expired token',
        error: jwtError.message,
      });

      if (jwtError.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      } else if (jwtError.name === 'NotBeforeError') {
        throw new UnauthorizedError('Token not yet valid');
      } else {
        throw new JWTError('Token verification failed');
      }
    }

    // 获取用户信息
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Convert userId to integer for Prisma
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      logSecurityEvent('USER_NOT_FOUND', req, {
        userId,
        message: 'User from token not found in database',
      });
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'active') {
      logSecurityEvent('INACTIVE_USER_ACCESS', req, {
        userId: user.id,
        status: user.status,
        message: 'Inactive user attempted access',
      });
      throw new ForbiddenError('User account is inactive');
    }

    // 检查token是否为最新（可选，如果实现了token撤销机制）
    // 注意：这里应该检查专门的密码更改时间字段，而不是通用的updatedAt
    // 暂时禁用此检查，避免任何用户信息更新都导致token失效
    /*
    if (decoded.iat && user.lastPasswordChangeAt) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const lastPasswordChange = user.lastPasswordChangeAt;
      
      // 如果密码在token签发后被更改，则token失效
      if (lastPasswordChange > tokenIssuedAt) {
        logSecurityEvent('TOKEN_AFTER_PASSWORD_CHANGE', req, {
          userId: user.id,
          tokenIssuedAt,
          lastPasswordChange,
        });
        throw new UnauthorizedError('Token is no longer valid');
      }
    }
    */

    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    if (error.code === 'P2002' || error.code === 'P2025') {
      console.error('Database error during authentication:', error);
      return res.apiInternalServerError(null, 'Authentication service temporarily unavailable');
    }
    
    next(error);
  }
};

/**
 * 可选认证中间件
 * 如果有token则验证，没有token则继续（用户为null）
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    req.user = null;
    return next();
  }

  // 有token则进行完整验证
  return authenticateToken(req, res, next);
};

/**
 * 生成访问令牌
 */
const generateAccessToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
  };

  const options = {
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: jwtConfig.algorithm,
    subject: user.id.toString(),
  };

  return jwt.sign(payload, jwtConfig.secret, options);
};

/**
 * 生成刷新令牌
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh',
  };

  const options = {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: jwtConfig.algorithm,
    subject: user.id.toString(),
  };

  return jwt.sign(payload, jwtConfig.secret, options);
};

/**
 * 验证刷新令牌
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, verifyTokenOptions);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new JWTError('Invalid refresh token');
  }
};

/**
 * 从token中提取用户ID（不验证token有效性）
 */
const extractUserIdFromToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.sub || decoded?.userId;
  } catch {
    return null;
  }
};

/**
 * 检查token是否即将过期
 */
const isTokenExpiringSoon = (token, minutesThreshold = 30) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return false;
    
    const expirationTime = decoded.exp * 1000; // 转换为毫秒
    const currentTime = Date.now();
    const thresholdTime = minutesThreshold * 60 * 1000; // 转换为毫秒
    
    return (expirationTime - currentTime) <= thresholdTime;
  } catch {
    return true; // 如果无法解析，认为即将过期
  }
};

/**
 * 撤销token（将来可能需要实现黑名单机制）
 */
const revokeToken = async (token, reason = 'user_logout') => {
  // 这里可以实现token黑名单机制
  // 例如将token存储到Redis黑名单中
  console.log(`Token revoked: ${reason}`);
  // TODO: 实现token黑名单功能
};

/**
 * API密钥认证中间件（用于系统间调用）
 */
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logSecurityEvent('MISSING_API_KEY', req);
    throw new UnauthorizedError('API key is required');
  }

  // 验证API密钥
  const validApiKey = process.env.API_KEY || 'library-system-api-key';
  
  if (apiKey !== validApiKey) {
    logSecurityEvent('INVALID_API_KEY', req, { providedKey: apiKey });
    throw new UnauthorizedError('Invalid API key');
  }

  // 为API调用创建虚拟系统用户
  req.user = {
    id: 0,
    username: 'system',
    role: 'admin',
    isSystem: true,
  };

  next();
};

/**
 * 认证中间件组合器
 * 允许同时支持JWT和API Key认证
 */
const flexibleAuth = async (req, res, next) => {
  const hasApiKey = req.headers['x-api-key'];
  const hasToken = req.headers.authorization?.startsWith('Bearer ');

  if (hasApiKey) {
    return authenticateApiKey(req, res, next);
  } else if (hasToken) {
    return authenticateToken(req, res, next);
  } else {
    throw new UnauthorizedError('Authentication required (JWT token or API key)');
  }
};

/**
 * 角色授权中间件
 * @param {string[]} allowedRoles - 允许访问的角色数组
 * @returns {Function} Express中间件函数
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // 确保用户已经通过认证
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // 如果没有指定角色限制，则允许所有已认证用户
      if (!allowedRoles || allowedRoles.length === 0) {
        return next();
      }

      // 检查用户角色是否在允许的角色列表中
      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', req, {
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
        });
        throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractUserIdFromToken,
  isTokenExpiringSoon,
  revokeToken,
  authenticateApiKey,
  flexibleAuth,
  authorize,
  authenticate: authenticateToken, // Alias for authenticateToken
};