const usersService = require('../services/users.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * 用户控制器
 * 处理所有用户相关的HTTP请求
 */
class UsersController {
  /**
   * 创建用户
   * POST /api/v1/users
   */
  createUser = asyncHandler(async (req, res) => {
    const user = await usersService.createUser(req.body, req.user);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'User created successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户列表
   * GET /api/v1/users
   */
  getUserList = asyncHandler(async (req, res) => {
    // 参数映射: keyword -> search, size -> limit (兼容前端)
    const mappedQuery = {
      ...req.query,
      search: req.query.keyword || req.query.search,
      limit: req.query.size || req.query.limit,
    };
    
    // 移除重复和无用参数
    delete mappedQuery.keyword;
    delete mappedQuery.size;
    delete mappedQuery._t; // 移除时间戳参数
    
    // 过滤空字符串参数
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    const result = await usersService.getUserList(mappedQuery);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: {
        users: result.users,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取管理员用户列表 (兼容前端参数)
   * GET /api/v1/admin/users
   */
  getAdminUserList = asyncHandler(async (req, res) => {
    // 参数映射: keyword -> search, size -> limit
    const mappedQuery = {
      ...req.query,
      search: req.query.keyword || req.query.search,
      limit: req.query.size || req.query.limit,
    };
    
    // 移除重复和无用参数
    delete mappedQuery.keyword;
    delete mappedQuery.size;
    delete mappedQuery._t; // 移除时间戳参数
    
    // 过滤空字符串参数
    Object.keys(mappedQuery).forEach(key => {
      if (mappedQuery[key] === '') {
        delete mappedQuery[key];
      }
    });
    
    const result = await usersService.getUserList(mappedQuery);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Admin users retrieved successfully',
      data: {
        users: result.users,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户详情
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.params.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新用户信息
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User updated successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 删除用户
   * DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(async (req, res) => {
    const result = await usersService.deleteUser(req.params.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 修改用户密码
   * PUT /api/v1/users/:id/password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await usersService.changePassword(
      req.params.id,
      currentPassword,
      newPassword,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 搜索用户
   * GET /api/v1/users/search
   */
  searchUsers = asyncHandler(async (req, res) => {
    const { q: query, ...options } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Search query is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await usersService.searchUsers(query, options);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Search completed successfully',
      data: {
        users: result.users,
        pagination: result.pagination,
        query: query,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户统计信息
   * GET /api/v1/users/statistics
   */
  getUserStatistics = asyncHandler(async (req, res) => {
    const statistics = await usersService.getUserStatistics();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User statistics retrieved successfully',
      data: {
        statistics,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 批量操作用户
   * POST /api/v1/users/batch
   */
  batchUpdateUsers = asyncHandler(async (req, res) => {
    const { userIds, action, params = {} } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'User IDs array is required and cannot be empty',
        timestamp: new Date().toISOString(),
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Action is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await usersService.batchUpdateUsers(userIds, action, params, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Batch operation completed',
      data: {
        batchResult: result,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户借阅历史
   * GET /api/v1/users/:id/borrows
   */
  getUserBorrowHistory = asyncHandler(async (req, res) => {
    const result = await usersService.getUserBorrowHistory(
      req.params.id,
      req.query,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User borrow history retrieved successfully',
      data: {
        borrows: result.borrows,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取当前用户信息
   * GET /api/v1/users/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.user.id, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Current user information retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新当前用户信息
   * PUT /api/v1/users/me
   */
  updateCurrentUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(req.user.id, req.body, req.user);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Profile updated successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 修改当前用户密码
   * PUT /api/v1/users/me/password
   */
  changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Current password and new password are required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await usersService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取当前用户借阅历史
   * GET /api/v1/users/me/borrows
   */
  getCurrentUserBorrowHistory = asyncHandler(async (req, res) => {
    const result = await usersService.getUserBorrowHistory(
      req.user.id,
      req.query,
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Your borrow history retrieved successfully',
      data: {
        borrows: result.borrows,
        pagination: result.pagination,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 激活用户
   * PUT /api/v1/users/:id/activate
   */
  activateUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(
      req.params.id,
      { status: 'active' },
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User activated successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 暂停用户
   * PUT /api/v1/users/:id/suspend
   */
  suspendUser = asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(
      req.params.id,
      { status: 'suspended' },
      req.user
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User suspended successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new UsersController();