const authService = require('../services/auth.service');
const UserService = require('../services/user.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * 认证控制器
 * 处理所有认证相关的HTTP请求
 */
class AuthController {
  /**
   * 用户注册
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: result.message,
      data: {
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 用户登录
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(username, password, ip, userAgent);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 微信小程序登录
   * POST /api/v1/auth/wechat-login
   */
  wechatLogin = asyncHandler(async (req, res) => {
    const { code, userInfo } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.wechatLogin(code, userInfo, ip, userAgent);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens,
        isNewUser: result.isNewUser,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 刷新访问令牌
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 用户登出
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user, req.token);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 修改密码
   * PUT /api/v1/auth/password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(req.user, currentPassword, newPassword);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 重置密码（忘记密码）
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.resetPassword(email);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取当前用户信息
   * GET /api/v1/auth/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User information retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新用户资料
   * PUT /api/v1/auth/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user, req.body);

    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 验证令牌有效性
   * GET /api/v1/auth/verify
   */
  verifyToken = asyncHandler(async (req, res) => {
    // 如果请求能到达这里，说明token是有效的（通过了认证中间件）
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Token is valid',
      data: {
        user: UserService.toSafeJSON(req.user),
        tokenInfo: {
          userId: req.tokenPayload.userId,
          role: req.tokenPayload.role,
          iat: req.tokenPayload.iat,
          exp: req.tokenPayload.exp,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new AuthController();