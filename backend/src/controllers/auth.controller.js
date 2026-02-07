const authService = require('../services/auth.service');
const UserService = require('../services/user.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

/**
 * 用户注册
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  success(res, {
    user: result.user
  }, result.message, 201);
});

/**
 * 用户登录
 */
const login = asyncHandler(async (req, res) => {
  const { username, identifier, password } = req.body;
  const loginIdentifier = username || identifier;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  const result = await authService.login(loginIdentifier, password, ip, userAgent);

  success(res, {
    user: result.user,
    tokens: result.tokens
  }, result.message);
});

/**
 * 刷新访问令牌
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);

  success(res, {
    accessToken: result.accessToken,
    expiresIn: result.expiresIn
  }, result.message);
});

/**
 * 用户登出
 */
const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user, req.token);
  success(res, null, result.message);
});

/**
 * 修改密码
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user, currentPassword, newPassword);
  success(res, null, result.message);
});

/**
 * 重置密码（忘记密码）
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resetPassword(email);
  success(res, null, result.message);
});

/**
 * 获取当前用户信息
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  const permissions = new Set(
    [
      ...(Array.isArray(user.permissions) ? user.permissions : []),
      ...(Array.isArray(req.user?.permissions) ? req.user.permissions : []),
      ...(Array.isArray(req.tokenPayload?.permissions) ? req.tokenPayload.permissions : []),
    ].filter((code) => typeof code === 'string' && code.trim().length > 0)
  );

  const roles = new Set(
    [
      ...(Array.isArray(user.roles) ? user.roles : []),
      ...(Array.isArray(req.user?.roles) ? req.user.roles : []),
      ...(Array.isArray(req.tokenPayload?.roles) ? req.tokenPayload.roles : []),
      typeof req.user?.role === 'string' ? req.user.role : null,
    ].filter((role) => typeof role === 'string' && role.trim().length > 0)
  );

  const resp = {
    ...user,
    permissions: Array.from(permissions),
    roles: Array.from(roles),
  };

  success(res, resp, '用户信息获取成功');
});

/**
 * 更新用户资料
 */
const updateProfile = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.user, req.body);
  success(res, result.user, result.message);
});

/**
 * 验证令牌有效性
 */
const verifyToken = asyncHandler(async (req, res) => {
  // 如果请求能到达这里，说明token是有效的（通过了认证中间件）
  success(res, {
    user: UserService.toSafeJSON(req.user),
    tokenInfo: {
      userId: req.tokenPayload?.userId,
      role: req.tokenPayload?.role,
      iat: req.tokenPayload?.iat,
      exp: req.tokenPayload?.exp
    }
  }, '令牌有效');
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  changePassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  verifyToken
};
