const notificationService = require('../services/notification.service');
const websocketService = require('../services/websocket.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * 通知控制器
 */
class NotificationsController {
  // 验证模式常量
  static CREATE_NOTIFICATION_SCHEMA = Joi.object({
    userId: Joi.number().integer().positive().required(),
    type: Joi.string().valid('system', 'borrow', 'return', 'overdue', 'reservation', 'maintenance').required(),
    title: Joi.string().max(200).required(),
    content: Joi.string().max(2000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    channel: Joi.object({
      inApp: Joi.boolean().optional(),
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      push: Joi.boolean().optional()
    }).optional(),
    scheduledAt: Joi.date().optional(),
    expiresAt: Joi.date().optional()
  });

  static BULK_NOTIFICATION_SCHEMA = Joi.object({
    notifications: Joi.array().items(Joi.object({
      userId: Joi.number().integer().positive().required(),
      type: Joi.string().required(),
      title: Joi.string().max(200).required(),
      content: Joi.string().max(2000).required(),
      priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
    })).min(1).max(100).required()
  });

  static TEMPLATE_SCHEMA = Joi.object({
    templateCode: Joi.string().required(),
    userId: Joi.number().integer().positive().required(),
    variables: Joi.object().optional(),
    options: Joi.object().optional()
  });

  static SYSTEM_MESSAGE_SCHEMA = Joi.object({
    message: Joi.string().max(500).required(),
    excludeUsers: Joi.array().items(Joi.number().integer().positive()).optional()
  });

  /**
   * 解析整数参数
   * @private
   */
  _parseIntParam(value, defaultValue = null) {
    return value ? parseInt(value) : defaultValue;
  }

  /**
   * 解析布尔参数
   * @private
   */
  _parseBoolParam(value, defaultValue = false) {
    return value === 'true' || value === true;
  }

  /**
   * 检查管理员权限
   * @private
   */
  _checkAdminPermission(user) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以执行此操作');
    }
  }
  /**
   * 获取用户通知列表
   */
  getUserNotifications = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      priority,
      unreadOnly = false
    } = req.query;

    const result = await notificationService.getUserNotifications(req.user.id, {
      page: this._parseIntParam(page, 1),
      limit: this._parseIntParam(limit, 20),
      type,
      status,
      priority,
      unreadOnly: this._parseBoolParam(unreadOnly)
    });

    success(res, result, '获取通知列表成功');
  });

  /**
   * 获取未读通知数量
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user.id);
    success(res, result, '获取未读数量成功');
  });

  /**
   * 标记通知为已读
   */
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(this._parseIntParam(id), req.user.id);
    success(res, notification, '通知已标记为已读');
  });

  /**
   * 标记所有通知为已读
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const { type } = req.body;
    const updatedCount = await notificationService.markAllAsRead(req.user.id, type);
    success(res, { updatedCount }, '所有通知已标记为已读');
  });

  /**
   * 删除通知
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await notificationService.deleteNotification(this._parseIntParam(id), req.user.id);
    success(res, null, '通知已删除');
  });

  /**
   * 创建通知（管理员）
   */
  createNotification = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const validatedData = validateRequest(NotificationsController.CREATE_NOTIFICATION_SCHEMA, req.body);
    const notification = await notificationService.createNotification(validatedData);
    success(res, notification, '通知创建成功', 201);
  });

  /**
   * 批量创建通知（管理员）
   */
  createBulkNotifications = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const validatedData = validateRequest(NotificationsController.BULK_NOTIFICATION_SCHEMA, req.body);
    const createdNotifications = await notificationService.createBulkNotifications(validatedData.notifications);
    success(res, createdNotifications, '批量通知创建成功', 201);
  });

  /**
   * 使用模板创建通知（管理员）
   */
  createNotificationFromTemplate = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const validatedData = validateRequest(NotificationsController.TEMPLATE_SCHEMA, req.body);
    
    const notification = await notificationService.createNotificationFromTemplate(
      validatedData.templateCode,
      validatedData.userId,
      validatedData.variables,
      validatedData.options
    );

    success(res, notification, '模板通知创建成功', 201);
  });

  /**
   * 发送通知（管理员）
   */
  sendNotification = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const { id } = req.params;
    const sendSuccess = await notificationService.sendNotification(this._parseIntParam(id));
    success(res, { success: sendSuccess }, sendSuccess ? '通知发送成功' : '通知发送失败');
  });

  /**
   * 获取通知统计信息（管理员）
   */
  getNotificationStatistics = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const { startDate, endDate } = req.query;
    
    const stats = await notificationService.getNotificationStatistics(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    success(res, stats, '获取通知统计成功');
  });

  /**
   * 清理过期通知（管理员）
   */
  cleanupExpiredNotifications = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const cleanedCount = await notificationService.cleanupExpiredNotifications();
    success(res, { cleanedCount }, `已清理 ${cleanedCount} 条过期通知`);
  });

  /**
   * 处理待发送通知队列（管理员）
   */
  processPendingNotifications = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const { batchSize = 50 } = req.body;
    const results = await notificationService.processPendingNotifications(batchSize);
    success(res, results, '处理待发送通知队列成功');
  });

  /**
   * 获取在线用户统计（管理员）
   */
  getOnlineStats = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const stats = websocketService.getOnlineStats();
    success(res, stats, '获取在线统计成功');
  });

  /**
   * 获取连接的用户列表（管理员）
   */
  getConnectedUsers = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const users = websocketService.getConnectedUsers();
    success(res, users, '获取连接用户列表成功');
  });

  /**
   * 强制断开用户连接（管理员）
   */
  disconnectUser = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const { userId } = req.params;
    const { reason = '管理员操作' } = req.body;

    const disconnectedCount = websocketService.disconnectUser(this._parseIntParam(userId), reason);
    success(res, { disconnectedCount }, `已断开用户 ${userId} 的 ${disconnectedCount} 个连接`);
  });

  /**
   * 广播系统消息（管理员）
   */
  broadcastSystemMessage = asyncHandler(async (req, res) => {
    this._checkAdminPermission(req.user);
    const validatedData = validateRequest(NotificationsController.SYSTEM_MESSAGE_SCHEMA, req.body);
    
    const broadcastSuccess = websocketService.broadcastSystemMessage(
      validatedData.message, 
      validatedData.excludeUsers || []
    );

    success(res, { success: broadcastSuccess }, broadcastSuccess ? '系统消息广播成功' : '系统消息广播失败');
  });

  /**
   * 发送测试通知
   */
  sendTestNotification = asyncHandler(async (req, res) => {
    const { title = '测试通知', content = '这是一条测试通知消息' } = req.body;

    const notification = await notificationService.createNotification({
      userId: req.user.id,
      type: 'system',
      title,
      content,
      priority: 'normal',
      channel: { inApp: true, email: false, sms: false, push: false }
    });

    success(res, notification, '测试通知发送成功');
  });

  /**
   * 创建系统事件通知（内部使用）
   */
  async createSystemEventNotifications(eventType, eventData) {
    const notifications = await notificationService.createSystemEventNotifications(eventType, eventData);
    return notifications;
  }
}

module.exports = new NotificationsController();