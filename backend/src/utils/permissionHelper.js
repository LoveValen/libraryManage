/**
 * PermissionHelper - 权限检查工具函数库（函数式封装）
 *
 * 功能：
 * 1. 统一的权限检查逻辑
 * 2. 角色验证
 * 3. 资源所有权验证
 * 4. 批量权限检查
 *
 * @example
 * const { checkRole, checkOwnership } = require('../utils/permissionHelper');
 *
 * checkRole(user, 'admin'); // 检查是否为管理员
 * checkOwnership(user, resource); // 检查是否为资源所有者
 */

const { USER_ROLES } = require('./constants');
const { UnauthorizedError } = require('./errors');

/**
 * 检查用户是否为管理员
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function isAdmin(user) {
  return user && user.role === USER_ROLES.ADMIN;
}

/**
 * 检查用户是否为图书管理员
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function isLibrarian(user) {
  return user && user.role === USER_ROLES.LIBRARIAN;
}

/**
 * 检查用户是否为普通用户
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function isPatron(user) {
  return user && user.role === USER_ROLES.PATRON;
}

/**
 * 检查用户是否具有指定角色
 * @param {Object} user - 用户对象
 * @param {string|Array<string>} roles - 角色或角色数组
 * @returns {boolean}
 */
function hasRole(user, roles) {
  if (!user || !user.role) {
    return false;
  }

  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }

  return user.role === roles;
}

/**
 * 检查用户是否具有管理权限（管理员或图书管理员）
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function hasManagementRole(user) {
  return hasRole(user, [USER_ROLES.ADMIN, USER_ROLES.LIBRARIAN]);
}

/**
 * 检查用户是否为资源所有者
 * @param {Object} user - 用户对象
 * @param {Object} resource - 资源对象
 * @param {string} ownerField - 所有者字段名，默认'userId'
 * @returns {boolean}
 */
function isOwner(user, resource, ownerField = 'userId') {
  if (!user || !resource) {
    return false;
  }

  const resourceOwnerId = resource[ownerField] || resource.user_id || resource.id;
  return user.id === resourceOwnerId;
}

/**
 * 检查用户是否可以访问资源（所有者或管理员）
 * @param {Object} user - 用户对象
 * @param {Object} resource - 资源对象
 * @param {string} ownerField - 所有者字段名
 * @returns {boolean}
 */
function canAccess(user, resource, ownerField = 'userId') {
  return isAdmin(user) || isOwner(user, resource, ownerField);
}

/**
 * 检查用户是否可以修改资源（所有者或管理员）
 * @param {Object} user - 用户对象
 * @param {Object} resource - 资源对象
 * @param {string} ownerField - 所有者字段名
 * @returns {boolean}
 */
function canModify(user, resource, ownerField = 'userId') {
  return isAdmin(user) || isOwner(user, resource, ownerField);
}

/**
 * 要求用户具有指定角色，否则抛出错误
 * @param {Object} user - 用户对象
 * @param {string|Array<string>} roles - 角色或角色数组
 * @param {string} message - 错误消息
 * @throws {UnauthorizedError}
 */
function requireRole(user, roles, message = null) {
  if (!hasRole(user, roles)) {
    const roleStr = Array.isArray(roles) ? roles.join('、') : roles;
    throw new UnauthorizedError(message || `需要${roleStr}权限`);
  }
}

/**
 * 要求用户为管理员，否则抛出错误
 * @param {Object} user - 用户对象
 * @param {string} message - 错误消息
 * @throws {UnauthorizedError}
 */
function requireAdmin(user, message = '只有管理员才能执行此操作') {
  if (!isAdmin(user)) {
    throw new UnauthorizedError(message);
  }
}

/**
 * 要求用户具有管理权限，否则抛出错误
 * @param {Object} user - 用户对象
 * @param {string} message - 错误消息
 * @throws {UnauthorizedError}
 */
function requireManagement(user, message = '需要管理员或图书管理员权限') {
  if (!hasManagementRole(user)) {
    throw new UnauthorizedError(message);
  }
}

/**
 * 要求用户为资源所有者，否则抛出错误
 * @param {Object} user - 用户对象
 * @param {Object} resource - 资源对象
 * @param {string} ownerField - 所有者字段名
 * @param {string} message - 错误消息
 * @throws {UnauthorizedError}
 */
function requireOwnership(user, resource, ownerField = 'userId', message = '只能操作自己的资源') {
  if (!isOwner(user, resource, ownerField)) {
    throw new UnauthorizedError(message);
  }
}

/**
 * 要求用户可以访问资源（所有者或管理员），否则抛出错误
 * @param {Object} user - 用户对象
 * @param {Object} resource - 资源对象
 * @param {string} ownerField - 所有者字段名
 * @param {string} message - 错误消息
 * @throws {UnauthorizedError}
 */
function requireAccess(user, resource, ownerField = 'userId', message = '无权访问此资源') {
  if (!canAccess(user, resource, ownerField)) {
    throw new UnauthorizedError(message);
  }
}

/**
 * 检查用户是否可以修改角色
 * @param {Object} operator - 操作者
 * @param {string} targetRole - 目标角色
 * @returns {boolean}
 */
function canChangeRole(operator, targetRole) {
  // 只有管理员可以修改角色
  if (!isAdmin(operator)) {
    return false;
  }

  // 管理员可以修改任何角色
  return true;
}

/**
 * 检查用户是否可以修改状态
 * @param {Object} operator - 操作者
 * @param {Object} targetUser - 目标用户
 * @returns {boolean}
 */
function canChangeStatus(operator, targetUser) {
  // 管理员可以修改任何用户状态
  if (isAdmin(operator)) {
    return true;
  }

  // 图书管理员可以修改普通用户状态
  if (isLibrarian(operator) && isPatron(targetUser)) {
    return true;
  }

  return false;
}

/**
 * 创建权限检查中间件
 * @param {string|Array<string>} roles - 允许的角色
 * @returns {Function} Express中间件
 */
function createRoleMiddleware(roles) {
  return (req, res, next) => {
    try {
      requireRole(req.user, roles);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 创建资源所有权检查中间件
 * @param {Function} getResource - 获取资源的函数
 * @param {string} ownerField - 所有者字段名
 * @returns {Function} Express中间件
 */
function createOwnershipMiddleware(getResource, ownerField = 'userId') {
  return async (req, res, next) => {
    try {
      const resource = await getResource(req);
      requireAccess(req.user, resource, ownerField);
      req.resource = resource; // 将资源附加到请求对象
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 批量权限检查
 * @param {Object} user - 用户对象
 * @param {Array<Function>} checks - 检查函数数组
 * @returns {boolean} 是否所有检查都通过
 */
function checkAll(user, checks) {
  return checks.every(check => check(user));
}

/**
 * 任一权限检查
 * @param {Object} user - 用户对象
 * @param {Array<Function>} checks - 检查函数数组
 * @returns {boolean} 是否至少一个检查通过
 */
function checkAny(user, checks) {
  return checks.some(check => check(user));
}

module.exports = {
  // 角色检查
  isAdmin,
  isLibrarian,
  isPatron,
  hasRole,
  hasManagementRole,

  // 所有权检查
  isOwner,
  canAccess,
  canModify,

  // 权限要求（抛出错误）
  requireRole,
  requireAdmin,
  requireManagement,
  requireOwnership,
  requireAccess,

  // 特殊权限检查
  canChangeRole,
  canChangeStatus,

  // 中间件创建
  createRoleMiddleware,
  createOwnershipMiddleware,

  // 批量检查
  checkAll,
  checkAny,
};
