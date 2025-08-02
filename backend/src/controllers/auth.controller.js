const authService = require('../services/auth.service');
const UserService = require('../services/user.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

/**
 * 认证控制器 - 处理用户登录、注册、令牌等认证相关操作
 */
class AuthController {
  /**
   * 用户注册
   */
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    
    success(res, {
      user: result.user
    }, result.message, 201);
  });

  /**
   * 用户登录
   */
  login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(username, password, ip, userAgent);

    success(res, {
      user: result.user,
      tokens: result.tokens
    }, result.message);
  });


  /**
   * 刷新访问令牌
   */
  refreshToken = asyncHandler(async (req, res) => {
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
  logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user, req.token);
    success(res, null, result.message);
  });

  /**
   * 修改密码
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user, currentPassword, newPassword);
    success(res, null, result.message);
  });

  /**
   * 重置密码（忘记密码）
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.resetPassword(email);
    success(res, null, result.message);
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    success(res, { user }, '用户信息获取成功');
  });

  /**
   * 更新用户资料
   */
  updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user, req.body);
    success(res, { user: result.user }, result.message);
  });

  /**
   * 验证令牌有效性
   */
  verifyToken = asyncHandler(async (req, res) => {
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
}

module.exports = new AuthController();