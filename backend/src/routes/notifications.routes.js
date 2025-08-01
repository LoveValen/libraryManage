const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { notificationSchemas } = require('../utils/validation');
const { validate, validateId } = require('../middlewares/validation.middleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: 通知管理接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 通知ID
 *         userId:
 *           type: integer
 *           description: 用户ID
 *         type:
 *           type: string
 *           enum: [system, borrow_reminder, return_reminder, overdue_warning, reservation, review_reply, points_change, book_available, maintenance, announcement, chat_message, admin_alert]
 *           description: 通知类型
 *         title:
 *           type: string
 *           description: 通知标题
 *         content:
 *           type: string
 *           description: 通知内容
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: 优先级
 *         status:
 *           type: string
 *           enum: [pending, sent, read, archived]
 *           description: 通知状态
 *         isRead:
 *           type: boolean
 *           description: 是否已读
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: 阅读时间
 *         channel:
 *           type: object
 *           description: 发送渠道配置
 *         metadata:
 *           type: object
 *           description: 附加元数据
 *         relatedId:
 *           type: integer
 *           description: 关联对象ID
 *         relatedType:
 *           type: string
 *           description: 关联对象类型
 *         actionUrl:
 *           type: string
 *           description: 操作链接
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: 过期时间
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

// 所有路由都需要身份验证
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: 获取用户通知列表
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 通知类型过滤
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态过滤
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: 优先级过滤
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 只显示未读通知
 *     responses:
 *       200:
 *         description: 成功获取通知列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                     unreadCount:
 *                       type: integer
 */
router.get('/', notificationsController.getUserNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: 获取未读通知数量
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取未读数量
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/test:
 *   post:
 *     summary: 发送测试通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: 测试通知
 *               content:
 *                 type: string
 *                 default: 这是一条测试通知消息
 *     responses:
 *       200:
 *         description: 测试通知发送成功
 */
router.post('/test', notificationsController.sendTestNotification);

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   post:
 *     summary: 标记所有通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: 通知类型（可选，标记特定类型的通知）
 *     responses:
 *       200:
 *         description: 成功标记所有通知为已读
 */
router.post('/mark-all-read', notificationsController.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   post:
 *     summary: 标记通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 成功标记通知为已读
 */
router.post('/:id/read', validateId(), notificationsController.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: 删除通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 成功删除通知
 */
router.delete('/:id', validateId(), notificationsController.deleteNotification);

// =============================================================================
// 管理员专用路由
// =============================================================================

/**
 * @swagger
 * /api/v1/notifications/admin:
 *   post:
 *     summary: 创建通知（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - title
 *               - content
 *             properties:
 *               userId:
 *                 type: integer
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               channel:
 *                 type: object
 *               metadata:
 *                 type: object
 *               relatedId:
 *                 type: integer
 *               relatedType:
 *                 type: string
 *               actionUrl:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 通知创建成功
 */
router.post('/admin', 
  requireRole(['admin']), 
  validate(notificationSchemas.createNotification),
  notificationsController.createNotification
);

/**
 * @swagger
 * /api/v1/notifications/admin/bulk:
 *   post:
 *     summary: 批量创建通知（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notifications
 *             properties:
 *               notifications:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: 批量通知创建成功
 */
router.post('/admin/bulk', 
  requireRole(['admin']), 
  validate(notificationSchemas.createBulkNotifications),
  notificationsController.createBulkNotifications
);

/**
 * @swagger
 * /api/v1/notifications/admin/template:
 *   post:
 *     summary: 使用模板创建通知（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateCode
 *               - userId
 *               - variables
 *             properties:
 *               templateCode:
 *                 type: string
 *               userId:
 *                 type: integer
 *               variables:
 *                 type: object
 *               options:
 *                 type: object
 *     responses:
 *       201:
 *         description: 模板通知创建成功
 */
router.post('/admin/template', 
  requireRole(['admin']), 
  validate(notificationSchemas.createFromTemplate),
  notificationsController.createNotificationFromTemplate
);

/**
 * @swagger
 * /api/v1/notifications/admin/{id}/send:
 *   post:
 *     summary: 发送通知（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 通知发送成功
 */
router.post('/admin/:id/send', 
  requireRole(['admin']), 
  validateId(),
  notificationsController.sendNotification
);

/**
 * @swagger
 * /api/v1/notifications/admin/statistics:
 *   get:
 *     summary: 获取通知统计信息（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 成功获取统计信息
 */
router.get('/admin/statistics', 
  requireRole(['admin']), 
  notificationsController.getNotificationStatistics
);

/**
 * @swagger
 * /api/v1/notifications/admin/cleanup:
 *   post:
 *     summary: 清理过期通知（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 清理完成
 */
router.post('/admin/cleanup', 
  requireRole(['admin']), 
  notificationsController.cleanupExpiredNotifications
);

/**
 * @swagger
 * /api/v1/notifications/admin/process-pending:
 *   post:
 *     summary: 处理待发送通知队列（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 50
 *     responses:
 *       200:
 *         description: 处理完成
 */
router.post('/admin/process-pending', 
  requireRole(['admin']), 
  validate(notificationSchemas.processPending),
  notificationsController.processPendingNotifications
);

// =============================================================================
// WebSocket管理路由
// =============================================================================

/**
 * @swagger
 * /api/v1/notifications/admin/websocket/stats:
 *   get:
 *     summary: 获取在线用户统计（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取在线统计
 */
router.get('/admin/websocket/stats', 
  requireRole(['admin']), 
  notificationsController.getOnlineStats
);

/**
 * @swagger
 * /api/v1/notifications/admin/websocket/users:
 *   get:
 *     summary: 获取连接的用户列表（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取连接用户列表
 */
router.get('/admin/websocket/users', 
  requireRole(['admin']), 
  notificationsController.getConnectedUsers
);

/**
 * @swagger
 * /api/v1/notifications/admin/websocket/users/{userId}/disconnect:
 *   post:
 *     summary: 强制断开用户连接（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 default: 管理员操作
 *     responses:
 *       200:
 *         description: 成功断开用户连接
 */
router.post('/admin/websocket/users/:userId/disconnect', 
  requireRole(['admin']), 
  validateId('userId'),
  notificationsController.disconnectUser
);

/**
 * @swagger
 * /api/v1/notifications/admin/websocket/broadcast:
 *   post:
 *     summary: 广播系统消息（管理员）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: object
 *               excludeUsers:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 系统消息广播成功
 */
router.post('/admin/websocket/broadcast', 
  requireRole(['admin']), 
  validate(notificationSchemas.broadcastMessage),
  notificationsController.broadcastSystemMessage
);

module.exports = router;