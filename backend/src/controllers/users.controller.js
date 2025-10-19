const usersService = require('../services/users.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, validationError } = require('../utils/response');
const { cleanParams, getPaginationParams } = require('../utils/queryHelper');
const { ValidationError } = require('../utils/errors');

/**
 * 用户控制器 - 处理用户的增删改查、搜索、统计等操作
 * 优化：采用函数式封装，符合企业级代码规范
 */

/**
 * 创建用户
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body, req.user);
  success(res, user, '用户创建成功', 201);
});

/**
 * 获取用户列表
 */
const getUserList = asyncHandler(async (req, res) => {
  console.log('=== DEBUG: 用户列表API调用 ===');
  console.log('原始查询参数:', req.query);
  const cleanedQuery = cleanParams(req.query, 'users');
  console.log('映射后查询参数:', cleanedQuery);
  console.log('=== DEBUG END ===');
  const result = await usersService.getUserList(cleanedQuery);

  successWithPagination(
    res,
    result.users,
    result.pagination,
    '获取用户列表成功'
  );
});

/**
 * 获取当前用户信息
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.user.id, req.user);
  success(res, user, '获取当前用户信息成功');
});

/**
 * 更新当前用户信息
 */
const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.user.id, req.body, req.user);
  success(res, user, '当前用户信息更新成功');
});

/**
 * 修改当前用户密码
 */
const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await usersService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
    req.user
  );
  success(res, null, result.message);
});

/**
 * 获取当前用户借阅历史
 */
const getCurrentUserBorrowHistory = asyncHandler(async (req, res) => {
  const result = await usersService.getUserBorrowHistory(
    req.user.id,
    req.query,
    req.user
  );

  successWithPagination(
    res,
    result.borrows,
    result.pagination,
    '获取当前用户借阅历史成功'
  );
});

/**
 * 获取管理员用户列表
 */
const getAdminUserList = asyncHandler(async (req, res) => {
  const cleanedQuery = cleanParams(req.query, 'users');
  const result = await usersService.getUserList(cleanedQuery);

  successWithPagination(
    res,
    result.users,
    result.pagination,
    '获取管理员用户列表成功'
  );
});

/**
 * 获取用户详情
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id, req.user);
  success(res, user, '获取用户详情成功');
});

/**
 * 更新用户信息
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body, req.user);
  success(res, user, '用户信息更新成功');
});

/**
 * 删除用户
 */
const deleteUser = asyncHandler(async (req, res) => {
  const result = await usersService.deleteUser(req.params.id, req.user);
  success(res, null, result.message);
});

/**
 * 修改用户密码
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await usersService.changePassword(
    req.params.id,
    currentPassword,
    newPassword,
    req.user
  );
  success(res, null, result.message);
});

/**
 * 搜索用户
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q: query, ...options } = req.query;
  const trimmedQuery = typeof query === 'string' ? query.trim() : '';

  if (!trimmedQuery) {
    throw new ValidationError('搜索关键词不能为空');
  }

  const result = await usersService.searchUsers(trimmedQuery, options);

  return successWithPagination(
    res,
    result.users,
    result.pagination,
    '搜索完成'
  );
});

/**
 * 管理端用户搜索（兼容前端 /api/v1/admin/users/search?query=xxx&limit=20 参数与返回结构）
 */
const adminSearchUsers = asyncHandler(async (req, res) => {
  const raw = req.query.query ?? req.query.q ?? '';
  const query = typeof raw === 'string' ? raw.trim() : '';

  const { limit, skip } = getPaginationParams(req.query);

  const basePagination = {
    page: Math.floor(skip / limit) + 1,
    limit,
    total: 0,
    pages: 0,
  };

  if (!query) {
    return successWithPagination(
      res,
      [],
      basePagination,
      '搜索完成'
    );
  }

  const result = await usersService.searchUsers(query, {
    limit,
    offset: skip,
    role: req.query.role,
    status: req.query.status,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  });

  return successWithPagination(
    res,
    result.users,
    result.pagination,
    '搜索完成'
  );
});

/**
 * 获取用户统计信息
 */
const getUserStatistics = asyncHandler(async (req, res) => {
  const statistics = await usersService.getUserStatistics();
  success(res, statistics, '获取用户统计成功');
});

/**
 * 批量操作用户
 */
const batchUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, action, params = {} } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ValidationError('用户ID数组不能为空');
  }
  if (!action) {
    throw new ValidationError('操作类型不能为空');
  }

  const result = await usersService.batchUpdateUsers(userIds, action, params, req.user);
  success(res, result, '批量操作完成');
});

/**
 * 获取用户借阅历史
 */
const getUserBorrowHistory = asyncHandler(async (req, res) => {
  const result = await usersService.getUserBorrowHistory(
    req.params.id,
    req.query,
    req.user
  );

  successWithPagination(
    res,
    result.borrows,
    result.pagination,
    '获取用户借阅历史成功'
  );
});

/**
 * 激活用户
 */
const activateUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(
    req.params.id,
    { status: 'active' },
    req.user
  );
  success(res, user, '用户激活成功');
});

/**
 * 暂停用户
 */
const suspendUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(
    req.params.id,
    { status: 'suspended' },
    req.user
  );
  success(res, user, '用户暂停成功');
});

// 优化：函数式导出，符合企业级代码规范
module.exports = {
  createUser,
  getUserList,
  getCurrentUser,
  updateCurrentUser,
  changeCurrentUserPassword,
  getCurrentUserBorrowHistory,
  getAdminUserList,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  searchUsers,
  adminSearchUsers,
  getUserStatistics,
  batchUpdateUsers,
  getUserBorrowHistory,
  activateUser,
  suspendUser,
};
