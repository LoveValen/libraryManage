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
  PATRON: 'patron',
};

const FALLBACK_ROLE_PERMISSIONS = {
  [ROLES.LIBRARIAN]: new Set([
    'dashboard.view',
    'books.read',
    'books.create',
    'books.update',
    'books.delete',
    'bookcategories.read',
    'bookcategories.create',
    'bookcategories.update',
    'bookcategories.delete',
    'booktags.read',
    'booktags.create',
    'booktags.update',
    'booktags.delete',
    'booklocations.read',
    'booklocations.create',
    'booklocations.update',
    'booklocations.delete',
    'borrows.read',
    'borrows.create',
    'borrows.update',
    'users.read',
    'users.update',
    'reviews.moderate',
  ]),
  [ROLES.PATRON]: new Set([
    'dashboard.view',
    'books.read',
    'borrows.read',
    'reviews.read',
    'reviews.write',
  ]),
};

const normalizeRoleCode = (role) =>
  typeof role === 'string' ? role.trim().toLowerCase() : '';

const collectUserRoles = (user) => {
  const roleSet = new Set();
  const primary = normalizeRoleCode(user?.role);
  if (primary) {
    roleSet.add(primary);
  }

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((code) => {
      const normalized = normalizeRoleCode(code);
      if (normalized) {
        roleSet.add(normalized);
      }
    });
  }

  return roleSet;
};

const isAdminRole = (user) => collectUserRoles(user).has(ROLES.ADMIN);


/**
 * 简化的权限检查
 */
const hasPermission = (user, permission) => {
  if (!user) return false;

  const required = typeof permission === 'string' ? permission.trim().toLowerCase() : '';
  if (!required) return false;

  if (isAdminRole(user)) {
    return true;
  }

  const permissionSet = new Set(
    Array.isArray(user.permissions)
      ? user.permissions
          .map((code) => (typeof code === 'string' ? code.trim().toLowerCase() : ''))
          .filter(Boolean)
      : []
  );

  if (permissionSet.has('*') || permissionSet.has(required)) {
    return true;
  }

  const userRoles = collectUserRoles(user);
  for (const role of userRoles) {
    const fallbackSet = FALLBACK_ROLE_PERMISSIONS[role];
    if (fallbackSet && fallbackSet.has(required)) {
      return true;
    }
  }

  return false;
};

/**
 * 角色检查中间件
 */
const requireRole = (allowedRoles) => {
  const rawRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedRequired = rawRoles
    .map((role) => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
    .filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要登录'));
    }

    if (normalizedRequired.length === 0) {
      return next();
    }

    const userRoles = collectUserRoles(req.user);
    const matched = normalizedRequired.some((role) => userRoles.has(role));

    if (!matched) {
      return next(new ForbiddenError(`权限不足，需要角色：${rawRoles.join(' 或 ')}`));
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
    if (isAdminRole(req.user)) {
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
