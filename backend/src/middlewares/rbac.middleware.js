const { ForbiddenError, UnauthorizedError } = require('../utils/apiError');

/**
 * RBAC权限中间件 - 简化版本
 * 基于角色的访问控制，使用流行的简单权限模式
 */

/**
 * 基础角色定义
 */
const ROLES = {
  ADMIN: 'admin',
  LIBRARIAN: 'librarian', 
  PATRON: 'patron'
};

/**
 * 简化的权限检查
 */
const hasPermission = (user, permission) => {
  if (!user) return false;
  
  // 管理员拥有所有权限
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  
  // 图书管理员权限
  if (user.role === ROLES.LIBRARIAN) {
    const librarianPermissions = [
      'books:read', 'books:write', 'books:manage',
      'borrows:read', 'borrows:write', 'borrows:manage',
      'users:read', 'reviews:moderate'
    ];
    return librarianPermissions.includes(permission);
  }
  
  // 普通用户权限
  if (user.role === ROLES.PATRON) {
    const patronPermissions = [
      'books:read', 'borrows:read', 'reviews:read', 'reviews:write'
    ];
    return patronPermissions.includes(permission);
  }
  
  return false;
};

/**
 * 角色检查中间件
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要登录'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`权限不足，需要角色：${roles.join(' 或 ')}`));
    }

    next();
  };
};

/**
 * 权限检查中间件
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要登录'));
    }

    if (!hasPermission(req.user, permission)) {
      return next(new ForbiddenError(`权限不足，需要权限：${permission}`));
    }

    next();
  };
};

/**
 * 资源所有者或管理员检查
 */
const requireOwnerOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要登录'));
    }

    // 管理员可以访问所有资源
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // 检查资源所有权
    const resourceUserId = parseInt(req.params[userIdParam] || req.body[userIdParam]);
    
    if (!resourceUserId || req.user.id !== resourceUserId) {
      return next(new ForbiddenError('只能访问自己的资源'));
    }

    next();
  };
};

/**
 * 预定义的常用中间件
 */
const requireAdmin = requireRole(ROLES.ADMIN);
const requireLibrarian = requireRole([ROLES.ADMIN, ROLES.LIBRARIAN]);
const requirePatron = requireRole([ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.PATRON]);

module.exports = {
  ROLES,
  hasPermission,
  requireRole,
  requirePermission,
  requireOwnerOrAdmin,
  requireAdmin,
  requireLibrarian,
  requirePatron,
};