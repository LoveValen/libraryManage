const { ForbiddenError, UnauthorizedError } = require('../utils/apiError');
const { USER_ROLES } = require('../utils/constants');
const { logSecurityEvent } = require('../utils/logger');

/**
 * 权限定义
 * 定义系统中的所有权限
 */
const PERMISSIONS = {
  // 用户管理权限
  'users:read': 'Read user information',
  'users:write': 'Create and update users',
  'users:delete': 'Delete users',
  'users:admin': 'Administrative user operations',

  // 图书管理权限
  'books:read': 'Read book information',
  'books:write': 'Create and update books',
  'books:delete': 'Delete books',
  'books:manage': 'Full book management',

  // 借阅管理权限
  'borrows:read': 'Read borrow records',
  'borrows:write': 'Create borrow records',
  'borrows:manage': 'Manage all borrow records',
  'borrows:process': 'Process returns and renewals',

  // 积分系统权限
  'points:read': 'Read points information',
  'points:manage': 'Manage user points',
  'points:admin': 'Administrative points operations',

  // 书评权限
  'reviews:read': 'Read reviews',
  'reviews:write': 'Write reviews',
  'reviews:moderate': 'Moderate reviews',
  'reviews:delete': 'Delete reviews',

  // 系统管理权限
  'system:read': 'Read system information',
  'system:write': 'Modify system settings',
  'system:admin': 'Full system administration',

  // 报告和统计权限
  'reports:read': 'Read reports and statistics',
  'reports:export': 'Export reports',

  // 游戏化权限
  'gamification:read': 'Read gamification data',
  'gamification:manage': 'Manage gamification rules',
};

/**
 * 角色权限映射
 * 定义每个角色拥有的权限
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.PATRON]: [
    'books:read',
    'borrows:read',
    'borrows:write',
    'points:read',
    'reviews:read',
    'reviews:write',
    'gamification:read',
  ],
  [USER_ROLES.ADMIN]: [
    // 用户管理
    'users:read',
    'users:write',
    'users:delete',
    'users:admin',
    
    // 图书管理
    'books:read',
    'books:write',
    'books:delete',
    'books:manage',
    
    // 借阅管理
    'borrows:read',
    'borrows:write',
    'borrows:manage',
    'borrows:process',
    
    // 积分系统
    'points:read',
    'points:manage',
    'points:admin',
    
    // 书评管理
    'reviews:read',
    'reviews:write',
    'reviews:moderate',
    'reviews:delete',
    
    // 系统管理
    'system:read',
    'system:write',
    'system:admin',
    
    // 报告统计
    'reports:read',
    'reports:export',
    
    // 游戏化管理
    'gamification:read',
    'gamification:manage',
  ],
};

/**
 * 获取用户权限列表
 * @param {Object} user - 用户对象
 * @returns {Array} 权限列表
 */
const getUserPermissions = (user) => {
  if (!user || !user.role) {
    return [];
  }

  return ROLE_PERMISSIONS[user.role] || [];
};

/**
 * 检查用户是否拥有指定权限
 * @param {Object} user - 用户对象
 * @param {string} permission - 权限名称
 * @returns {boolean} 是否拥有权限
 */
const hasPermission = (user, permission) => {
  if (!user) {
    return false;
  }

  // 系统用户拥有所有权限
  if (user.isSystem) {
    return true;
  }

  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
};

/**
 * 检查用户是否拥有任一权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限列表
 * @returns {boolean} 是否拥有任一权限
 */
const hasAnyPermission = (user, permissions) => {
  if (!user || !Array.isArray(permissions)) {
    return false;
  }

  // 系统用户拥有所有权限
  if (user.isSystem) {
    return true;
  }

  const userPermissions = getUserPermissions(user);
  return permissions.some(permission => userPermissions.includes(permission));
};

/**
 * 检查用户是否拥有所有权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限列表
 * @returns {boolean} 是否拥有所有权限
 */
const hasAllPermissions = (user, permissions) => {
  if (!user || !Array.isArray(permissions)) {
    return false;
  }

  // 系统用户拥有所有权限
  if (user.isSystem) {
    return true;
  }

  const userPermissions = getUserPermissions(user);
  return permissions.every(permission => userPermissions.includes(permission));
};

/**
 * 角色检查中间件工厂
 * @param {string|Array} allowedRoles - 允许的角色
 * @returns {Function} Express中间件
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (req.user.isSystem) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent('INSUFFICIENT_ROLE', req, {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
    }

    next();
  };
};

/**
 * 权限检查中间件工厂
 * @param {string|Array} requiredPermissions - 必需的权限
 * @param {boolean} requireAll - 是否需要所有权限（默认false，只需任一权限）
 * @returns {Function} Express中间件
 */
const requirePermission = (requiredPermissions, requireAll = false) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(req.user, permissions)
      : hasAnyPermission(req.user, permissions);

    if (!hasRequiredPermissions) {
      logSecurityEvent('INSUFFICIENT_PERMISSIONS', req, {
        userId: req.user.id,
        userRole: req.user.role,
        userPermissions: getUserPermissions(req.user),
        requiredPermissions: permissions,
        requireAll,
      });
      
      const permissionText = requireAll 
        ? `all of: ${permissions.join(', ')}`
        : `any of: ${permissions.join(', ')}`;
      
      throw new ForbiddenError(`Access denied. Required permissions: ${permissionText}`);
    }

    next();
  };
};

/**
 * 资源所有者检查中间件工厂
 * 允许用户访问自己的资源或管理员访问所有资源
 * @param {string} userIdParam - URL参数中用户ID的字段名（默认'userId'）
 * @returns {Function} Express中间件
 */
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // 系统用户或管理员可以访问所有资源
    if (req.user.isSystem || req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // 检查是否是资源所有者
    const resourceUserId = parseInt(req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam]);
    
    if (!resourceUserId) {
      throw new ForbiddenError('Resource user ID is required');
    }

    if (req.user.id !== resourceUserId) {
      logSecurityEvent('UNAUTHORIZED_RESOURCE_ACCESS', req, {
        userId: req.user.id,
        attemptedResourceUserId: resourceUserId,
        userIdParam,
      });
      throw new ForbiddenError('Access denied. You can only access your own resources');
    }

    next();
  };
};

/**
 * 管理员专用中间件
 */
const requireAdmin = requireRole(USER_ROLES.ADMIN);

/**
 * 仅限激活用户的中间件
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (req.user.isSystem) {
    return next();
  }

  if (!req.user.canBorrow()) {
    logSecurityEvent('INACTIVE_USER_ACTION', req, {
      userId: req.user.id,
      userStatus: req.user.status,
    });
    throw new ForbiddenError('Account is suspended or inactive');
  }

  next();
};

/**
 * IP白名单检查中间件
 * @param {Array} allowedIPs - 允许的IP地址列表
 * @returns {Function} Express中间件
 */
const requireIPWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurityEvent('IP_ACCESS_DENIED', req, {
        clientIP,
        allowedIPs,
      });
      throw new ForbiddenError('Access denied from this IP address');
    }

    next();
  };
};

/**
 * 组合权限检查中间件
 * 支持复杂的权限逻辑组合
 * @param {Object} options - 权限配置选项
 * @returns {Function} Express中间件
 */
const requireAccess = (options = {}) => {
  const {
    roles = null,
    permissions = null,
    requireAllPermissions = false,
    allowOwner = false,
    ownerIdParam = 'userId',
    requireActive = true,
    allowedIPs = [],
  } = options;

  return async (req, res, next) => {
    try {
      // 1. 检查认证
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // 2. 检查IP白名单
      if (allowedIPs.length > 0) {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (!allowedIPs.includes(clientIP)) {
          logSecurityEvent('IP_ACCESS_DENIED', req, { clientIP, allowedIPs });
          throw new ForbiddenError('Access denied from this IP address');
        }
      }

      // 3. 系统用户跳过其他检查
      if (req.user.isSystem) {
        return next();
      }

      // 4. 检查用户激活状态
      if (requireActive && !req.user.canBorrow()) {
        logSecurityEvent('INACTIVE_USER_ACTION', req, {
          userId: req.user.id,
          userStatus: req.user.status,
        });
        throw new ForbiddenError('Account is suspended or inactive');
      }

      // 5. 检查资源所有权
      if (allowOwner) {
        const resourceUserId = parseInt(req.params[ownerIdParam] || req.body[ownerIdParam] || req.query[ownerIdParam]);
        if (resourceUserId && req.user.id === resourceUserId) {
          return next();
        }
      }

      // 6. 检查角色
      if (roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(req.user.role)) {
          logSecurityEvent('INSUFFICIENT_ROLE', req, {
            userId: req.user.id,
            userRole: req.user.role,
            requiredRoles: allowedRoles,
          });
          throw new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
        }
      }

      // 7. 检查权限
      if (permissions) {
        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
        const hasRequiredPermissions = requireAllPermissions 
          ? hasAllPermissions(req.user, requiredPermissions)
          : hasAnyPermission(req.user, requiredPermissions);

        if (!hasRequiredPermissions) {
          logSecurityEvent('INSUFFICIENT_PERMISSIONS', req, {
            userId: req.user.id,
            userRole: req.user.role,
            userPermissions: getUserPermissions(req.user),
            requiredPermissions,
            requireAllPermissions,
          });
          
          const permissionText = requireAllPermissions 
            ? `all of: ${requiredPermissions.join(', ')}`
            : `any of: ${requiredPermissions.join(', ')}`;
          
          throw new ForbiddenError(`Access denied. Required permissions: ${permissionText}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requireRole,
  requirePermission,
  requireOwnershipOrAdmin,
  requireAdmin,
  requireActiveUser,
  requireIPWhitelist,
  requireAccess,
};