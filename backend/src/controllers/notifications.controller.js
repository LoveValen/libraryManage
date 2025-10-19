const notificationService = require('../services/notification.service');
const websocketService = require('../services/websocket.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { ForbiddenError } = require('../utils/apiError');
const Joi = require('joi');

// Validation schemas
const CREATE_NOTIFICATION_SCHEMA = Joi.object({
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

const BULK_NOTIFICATION_SCHEMA = Joi.object({
  notifications: Joi.array().items(Joi.object({
    userId: Joi.number().integer().positive().required(),
    type: Joi.string().required(),
    title: Joi.string().max(200).required(),
    content: Joi.string().max(2000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
  })).min(1).max(100).required()
});

const TEMPLATE_SCHEMA = Joi.object({
  templateCode: Joi.string().required(),
  userId: Joi.number().integer().positive().required(),
  variables: Joi.object().optional(),
  options: Joi.object().optional()
});

const SYSTEM_MESSAGE_SCHEMA = Joi.object({
  message: Joi.string().max(500).required(),
  excludeUsers: Joi.array().items(Joi.number().integer().positive()).optional()
});

// Helper functions
/**
 * Parse integer parameter
 */
const parseIntParam = (value, defaultValue = null) => {
  return value ? parseInt(value) : defaultValue;
};

/**
 * Parse boolean parameter
 */
const parseBoolParam = (value, defaultValue = false) => {
  return value === 'true' || value === true;
};

/**
 * Check admin permission
 */
const checkAdminPermission = (user) => {
  if (user.role !== 'admin') {
    throw new ForbiddenError('只有管理员可以执行此操作');
  }
};

/**
 * 获取用户通知列表
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    priority,
    unreadOnly = false
  } = req.query;

  const result = await notificationService.getUserNotifications(req.user.id, {
    page: parseIntParam(page, 1),
    limit: parseIntParam(limit, 20),
    type,
    status,
    priority,
    unreadOnly: parseBoolParam(unreadOnly)
  });

  successWithPagination(
    res,
    result.notifications,
    result.pagination,
    '获取通知列表成功'
  );
});

/**
 * 获取未读通知数量
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  success(res, result, '获取未读数量成功');
});

/**
 * 标记通知为已读
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await notificationService.markAsRead(parseIntParam(id), req.user.id);
  success(res, notification, '通知已标记为已读');
});

/**
 * 标记所有通知为已读
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const updatedCount = await notificationService.markAllAsRead(req.user.id, type);
  res.status(200).json({
    success: true,
    message: '所有通知已标记为已读',
    data: updatedCount,
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * 删除通知
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await notificationService.deleteNotification(parseIntParam(id), req.user.id);
  success(res, null, '通知已删除');
});

/**
 * 创建通知（管理员）
 */
const createNotification = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(CREATE_NOTIFICATION_SCHEMA, req.body);
  const notification = await notificationService.createNotification(validatedData);
  success(res, notification, '通知创建成功', 201);
});

/**
 * 批量创建通知（管理员）
 */
const createBulkNotifications = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(BULK_NOTIFICATION_SCHEMA, req.body);
  const createdNotifications = await notificationService.createBulkNotifications(validatedData.notifications);
  success(res, createdNotifications, '批量通知创建成功', 201);
});

/**
 * 使用模板创建通知（管理员）
 */
const createNotificationFromTemplate = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(TEMPLATE_SCHEMA, req.body);

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
const sendNotification = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const { id } = req.params;
  const sendSuccess = await notificationService.sendNotification(parseIntParam(id));
  res.status(200).json({
    success: true,
    message: sendSuccess ? '通知发送成功' : '通知发送失败',
    data: sendSuccess,
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * 获取通知统计信息（管理员）
 */
const getNotificationStatistics = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
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
const cleanupExpiredNotifications = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const cleanedCount = await notificationService.cleanupExpiredNotifications();
  res.status(200).json({
    success: true,
    message: `已清理 ${cleanedCount} 条过期通知`,
    data: cleanedCount,
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * 处理待发送通知队列（管理员）
 */
const processPendingNotifications = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const { batchSize = 50 } = req.body;
  const results = await notificationService.processPendingNotifications(batchSize);
  success(res, results, '处理待发送通知队列成功');
});

/**
 * 获取在线用户统计（管理员）
 */
const getOnlineStats = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const stats = websocketService.getOnlineStats();
  success(res, stats, '获取在线统计成功');
});

/**
 * 获取连接的用户列表（管理员）
 */
const getConnectedUsers = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const users = websocketService.getConnectedUsers();
  success(res, users, '获取连接用户列表成功');
});

/**
 * 强制断开用户连接（管理员）
 */
const disconnectUser = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const { userId } = req.params;
  const { reason = '管理员操作' } = req.body;

  const disconnectedCount = websocketService.disconnectUser(parseIntParam(userId), reason);
  res.status(200).json({
    success: true,
    message: `已断开用户 ${userId} 的 ${disconnectedCount} 个连接`,
    data: disconnectedCount,
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * 广播系统消息（管理员）
 */
const broadcastSystemMessage = asyncHandler(async (req, res) => {
  checkAdminPermission(req.user);
  const validatedData = validateRequest(SYSTEM_MESSAGE_SCHEMA, req.body);

  const broadcastSuccess = websocketService.broadcastSystemMessage(
    validatedData.message,
    validatedData.excludeUsers || []
  );

  res.status(200).json({
    success: true,
    message: broadcastSuccess ? '系统消息广播成功' : '系统消息广播失败',
    data: broadcastSuccess,
    timestamp: require('../utils/date').formatDateTime(new Date())
  });
});

/**
 * 发送测试通知
 */
const sendTestNotification = asyncHandler(async (req, res) => {
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
const createSystemEventNotifications = async (eventType, eventData) => {
  const notifications = await notificationService.createSystemEventNotifications(eventType, eventData);
  return notifications;
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createBulkNotifications,
  createNotificationFromTemplate,
  sendNotification,
  getNotificationStatistics,
  cleanupExpiredNotifications,
  processPendingNotifications,
  getOnlineStats,
  getConnectedUsers,
  disconnectUser,
  broadcastSystemMessage,
  sendTestNotification,
  createSystemEventNotifications
};