const usersService = require('../services/users.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, validationError } = require('../utils/response');

/**
 * 用户控制器 - 处理用户的增删改查、搜索、统计等操作
 */
class UsersController {
  /**
   * 清理和映射查询参数
   * @private
   */
  _cleanQueryParams(query) {
    const mappedQuery = {
      ...query,
      search: query.keyword || query.search,
      limit: query.size || query.limit
    };
    
    // 移除重复和无用参数
    delete mappedQuery.keyword;
    delete mappedQuery.size;
    delete mappedQuery._t;
    
    // 过滤空字符串参数
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    return mappedQuery;
  }
  /**
   * 创建用户
   */
  createUser = asyncHandler(async (req, res) => {
    const user = await usersService.createUser(req.body, req.user);
    success(res, { user }, '用户创建成功', 201);
  });

  /**
   * 获取用户列表
   */
  getUserList = asyncHandler(async (req, res) => {
    const mappedQuery = this._cleanQueryParams(req.query);
    const result = await usersService.getUserList(mappedQuery);
    successWithPagination(res, result.users, result.pagination, '获取用户列表成功');
  });

  /**
   * 获取管理员用户列表
   */
  getAdminUserList = asyncHandler(async (req, res) => {
    const mappedQuery = this._cleanQueryParams(req.query);
    const result = await usersService.getUserList(mappedQuery);
    successWithPagination(res, result.users, result.pagination, '获取管理员用户列表成功');
  });

  /**
   * 获取用户详情
   */
  getUserById = asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.params.id, req.user);
    success(res, { user }, '获取用户详情成功');
  });

  /**
   * 更新用户信息
   */
  updateUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    success(res, { user }, '用户信息更新成功');
  });

  /**
   * 删除用户
   */
  deleteUser = asyncHandler(async (req, res) => {
    const result = await usersService.deleteUser(req.params.id, req.user);
    success(res, null, result.message);
  });

  /**
   * 修改用户密码
   */
  changePassword = asyncHandler(async (req, res) => {
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
  searchUsers = asyncHandler(async (req, res) => {
    const { q: query, ...options } = req.query;
    
    if (!query?.trim()) {
      return validationError(res, [{ field: 'q', message: '搜索关键词不能为空' }]);
    }

    const result = await usersService.searchUsers(query, options);
    
    success(res, {
      users: result.users,
      pagination: result.pagination,
      query: query
    }, '搜索完成');
  });

  /**
   * 获取用户统计信息
   */
  getUserStatistics = asyncHandler(async (req, res) => {
    const statistics = await usersService.getUserStatistics();
    success(res, { statistics }, '获取用户统计成功');
  });

  /**
   * 批量操作用户
   */
  batchUpdateUsers = asyncHandler(async (req, res) => {
    const { userIds, action, params = {} } = req.body;
    
    const errors = [];
    if (!Array.isArray(userIds) || userIds.length === 0) {
      errors.push({ field: 'userIds', message: '用户ID数组不能为空' });
    }
    if (!action) {
      errors.push({ field: 'action', message: '操作类型不能为空' });
    }
    
    if (errors.length > 0) {
      return validationError(res, errors);
    }

    const result = await usersService.batchUpdateUsers(userIds, action, params, req.user);
    success(res, { batchResult: result }, '批量操作完成');
  });

  /**
   * 获取用户借阅历史
   */
  getUserBorrowHistory = asyncHandler(async (req, res) => {
    const result = await usersService.getUserBorrowHistory(
      req.params.id,
      req.query,
      req.user
    );
    successWithPagination(res, result.borrows, result.pagination, '获取用户借阅历史成功');
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.user.id, req.user);
    success(res, { user }, '获取当前用户信息成功');
  });

  /**
   * 更新当前用户信息
   */
  updateCurrentUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(req.user.id, req.body, req.user);
    success(res, { user }, '个人资料更新成功');
  });

  /**
   * 修改当前用户密码
   */
  changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    const errors = [];
    if (!currentPassword) errors.push({ field: 'currentPassword', message: '当前密码不能为空' });
    if (!newPassword) errors.push({ field: 'newPassword', message: '新密码不能为空' });
    
    if (errors.length > 0) {
      return validationError(res, errors);
    }

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
  getCurrentUserBorrowHistory = asyncHandler(async (req, res) => {
    const result = await usersService.getUserBorrowHistory(
      req.user.id,
      req.query,
      req.user
    );
    successWithPagination(res, result.borrows, result.pagination, '获取个人借阅历史成功');
  });

  /**
   * 激活用户
   */
  activateUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(
      req.params.id,
      { status: 'active' },
      req.user
    );
    success(res, { user }, '用户激活成功');
  });

  /**
   * 暂停用户
   */
  suspendUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(
      req.params.id,
      { status: 'suspended' },
      req.user
    );
    success(res, { user }, '用户暂停成功');
  });
}

module.exports = new UsersController();