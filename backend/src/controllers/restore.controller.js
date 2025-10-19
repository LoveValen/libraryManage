const prisma = require('../utils/prisma');
const restoreService = require('../services/restore.service');
const { logger } = require('../utils/logger');
const { formatResponse } = require('../utils/response');
const { ValidationError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * 恢复控制器
 */
class RestoreController {
  /**
   * 创建恢复操作
   */
  async createRestoreOperation(req, res) {
    try {
      const schema = Joi.object({
        backupJobId: Joi.number().integer().positive().required(),
        name: Joi.string().min(2).max(200).required(),
        description: Joi.string().max(1000).optional(),
        restoreType: Joi.string().valid('full', 'database_only', 'files_only', 'selective', 'point_in_time', 'partial').default('full'),
        targetTimestamp: Joi.date().optional(),
        scheduledAt: Joi.date().min('now').optional(),
        restoreConfig: Joi.object({
          overwriteExisting: Joi.boolean().default(false),
          restoreDatabases: Joi.boolean().default(true),
          restoreFiles: Joi.boolean().default(true),
          restorePermissions: Joi.boolean().default(true),
          verifyAfterRestore: Joi.boolean().default(true),
          createBackupBeforeRestore: Joi.boolean().default(true),
          stopServicesBeforeRestore: Joi.boolean().default(false)
        }).optional(),
        restoreScope: Joi.object({
          databases: Joi.array().items(Joi.string()).optional(),
          tables: Joi.array().items(Joi.string()).optional(),
          directories: Joi.array().items(Joi.string()).optional(),
          files: Joi.array().items(Joi.string()).optional(),
          excludePaths: Joi.array().items(Joi.string()).optional()
        }).optional(),
        targetPaths: Joi.object({
          databasePath: Joi.string().optional(),
          filesPath: Joi.string().optional(),
          uploadsPath: Joi.string().optional(),
          ebooksPath: Joi.string().optional()
        }).optional(),
        priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal'),
        environment: Joi.string().max(50).default('production'),
        isTestRestore: Joi.boolean().default(false),
        tags: Joi.array().items(Joi.string()).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const restoreData = {
        ...value,
        triggeredBy: req.user.id,
        trigger: value.scheduledAt ? 'scheduled' : 'manual'
      };

      const operation = await restoreService.createRestoreOperation(restoreData);
      
      res.status(201).json(formatResponse(true, '恢复操作创建成功', {
        restoreOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('创建恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 执行恢复操作
   */
  async executeRestoreOperation(req, res) {
    try {
      const { id } = req.params;
      
      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      if (operation.status !== 'pending' && operation.status !== 'preparing') {
        return res.status(400).json(formatResponse(false, '只能执行待处理或准备中状态的恢复操作'));
      }

      // 检查权限 - 高优先级恢复需要管理员权限
      if (['high', 'critical'].includes(operation.priority) && req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '高优先级恢复操作需要管理员权限'));
      }

      // 异步执行恢复操作
      restoreService.executeRestoreOperation(operation).catch(error => {
        logger.error(`恢复操作执行失败 [${id}]:`, error);
      });

      res.json(formatResponse(true, '恢复操作已开始执行', {
        restoreOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('执行恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取恢复操作列表
   */
  async getRestoreOperations(req, res) {
    try {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        status: Joi.string().valid('pending', 'preparing', 'running', 'completed', 'failed', 'cancelled', 'rolled_back').optional(),
        restoreType: Joi.string().valid('full', 'database_only', 'files_only', 'selective', 'point_in_time', 'partial').optional(),
        priority: Joi.string().valid('low', 'normal', 'high', 'critical').optional(),
        isTestRestore: Joi.boolean().optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        search: Joi.string().max(100).optional(),
        sortBy: Joi.string().valid('createdAt', 'startedAt', 'completedAt', 'duration', 'priority').default('createdAt'),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const { page, limit, status, restoreType, priority, isTestRestore, startDate, endDate, search, sortBy, sortOrder } = value;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (restoreType) where.restoreType = restoreType;
      if (priority) where.priority = priority;
      if (isTestRestore !== undefined) where.isTestRestore = isTestRestore;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[models.sequelize.Op.gte] = startDate;
        if (endDate) where.createdAt[models.sequelize.Op.lte] = endDate;
      }
      if (search) {
        where[models.sequelize.Op.or] = [
          { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
          { description: { [models.sequelize.Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await models.RestoreOperation.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: [
          {
            model: models.BackupJob,
            as: 'backupJob',
            attributes: ['id', 'name', 'backupType', 'fileSize', 'completedAt']
          },
          {
            model: models.User,
            as: 'triggeredByUser',
            attributes: ['id', 'username', 'realName']
          },
          {
            model: models.User,
            as: 'approvedByUser',
            attributes: ['id', 'username', 'realName']
          }
        ]
      });

      const totalPages = Math.ceil(count / limit);

      res.json(formatResponse(true, '获取恢复操作列表成功', {
        restoreOperations: rows.map(operation => operation.getSummary()),
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }));
    } catch (error) {
      logger.error('获取恢复操作列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取恢复操作详情
   */
  async getRestoreOperationById(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id, {
        include: [
          {
            model: models.BackupJob,
            as: 'backupJob',
            include: [
              {
                model: models.User,
                as: 'triggeredByUser',
                attributes: ['id', 'username', 'realName']
              }
            ]
          },
          {
            model: models.BackupJob,
            as: 'preRestoreBackup',
            attributes: ['id', 'name', 'backupType', 'completedAt']
          },
          {
            model: models.User,
            as: 'triggeredByUser',
            attributes: ['id', 'username', 'realName']
          },
          {
            model: models.User,
            as: 'approvedByUser',
            attributes: ['id', 'username', 'realName']
          }
        ]
      });

      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      res.json(formatResponse(true, '获取恢复操作详情成功', {
        restoreOperation: operation.toJSON()
      }));
    } catch (error) {
      logger.error('获取恢复操作详情失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 审批恢复操作
   */
  async approveRestoreOperation(req, res) {
    try {
      const { id } = req.params;
      const schema = Joi.object({
        note: Joi.string().max(1000).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '只有管理员可以审批恢复操作'));
      }

      await operation.approve(req.user.id, value.note);

      res.json(formatResponse(true, '恢复操作已审批', {
        restoreOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('审批恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 拒绝恢复操作
   */
  async rejectRestoreOperation(req, res) {
    try {
      const { id } = req.params;
      const schema = Joi.object({
        reason: Joi.string().min(1).max(1000).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '只有管理员可以拒绝恢复操作'));
      }

      await operation.reject(req.user.id, value.reason);

      res.json(formatResponse(true, '恢复操作已拒绝', {
        restoreOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('拒绝恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 取消恢复操作
   */
  async cancelRestoreOperation(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      // 检查权限 - 只有触发者或管理员可以取消
      if (operation.triggeredBy !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '无权限取消此恢复操作'));
      }

      await restoreService.cancelRestoreOperation(id);

      res.json(formatResponse(true, '恢复操作已取消', {
        restoreOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('取消恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 回滚恢复操作
   */
  async rollbackRestoreOperation(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '只有管理员可以执行回滚操作'));
      }

      const rollbackOperation = await operation.rollback();

      res.json(formatResponse(true, '回滚操作已创建', {
        rollbackOperation: rollbackOperation.getSummary(),
        originalOperation: operation.getSummary()
      }));
    } catch (error) {
      logger.error('回滚恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 验证恢复结果
   */
  async verifyRestoreOperation(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      const verificationResult = await operation.verify();

      res.json(formatResponse(true, '恢复验证完成', {
        verification: verificationResult
      }));
    } catch (error) {
      logger.error('验证恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 测试恢复
   */
  async testRestore(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      const testResult = await restoreService.testRestore(operation);

      res.json(formatResponse(true, '测试恢复完成', {
        testResult: testResult
      }));
    } catch (error) {
      logger.error('测试恢复失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取活跃恢复操作
   */
  async getActiveOperations(req, res) {
    try {
      const activeOperations = restoreService.getActiveOperations();

      res.json(formatResponse(true, '获取活跃恢复操作成功', {
        activeOperations,
        count: activeOperations.length
      }));
    } catch (error) {
      logger.error('获取活跃恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取等待审批的恢复操作
   */
  async getPendingApprovals(req, res) {
    try {
      const pendingApprovals = await models.RestoreOperation.getPendingApprovals();

      res.json(formatResponse(true, '获取等待审批的恢复操作成功', {
        pendingApprovals: pendingApprovals.map(op => op.getSummary()),
        count: pendingApprovals.length
      }));
    } catch (error) {
      logger.error('获取等待审批的恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取恢复统计
   */
  async getRestoreStatistics(req, res) {
    try {
      const { timeRange = 30 } = req.query;

      const statistics = await restoreService.getRestoreStatistics(parseInt(timeRange));

      res.json(formatResponse(true, '获取恢复统计成功', {
        statistics,
        timeRange: parseInt(timeRange)
      }));
    } catch (error) {
      logger.error('获取恢复统计失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 清理过期测试恢复
   */
  async cleanupTestRestores(req, res) {
    try {
      const cleanedCount = await restoreService.cleanupExpiredTestRestores();

      res.json(formatResponse(true, '清理过期测试恢复完成', {
        cleanedCount
      }));
    } catch (error) {
      logger.error('清理过期测试恢复失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取恢复操作日志
   */
  async getRestoreOperationLogs(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id, {
        attributes: ['id', 'name', 'executionLog']
      });

      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      res.json(formatResponse(true, '获取恢复操作日志成功', {
        logs: operation.executionLog || '',
        operationId: operation.id,
        operationName: operation.name
      }));
    } catch (error) {
      logger.error('获取恢复操作日志失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 预检查恢复操作
   */
  async preCheckRestoreOperation(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      const preCheckResult = await operation.preCheck();

      res.json(formatResponse(true, '恢复操作预检查完成', {
        preCheck: preCheckResult
      }));
    } catch (error) {
      logger.error('恢复操作预检查失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 删除恢复操作
   */
  async deleteRestoreOperation(req, res) {
    try {
      const { id } = req.params;

      const operation = await models.RestoreOperation.findByPk(id);
      if (!operation) {
        return res.status(404).json(formatResponse(false, '恢复操作不存在'));
      }

      if (['preparing', 'running'].includes(operation.status)) {
        return res.status(400).json(formatResponse(false, '无法删除进行中的恢复操作'));
      }

      // 检查权限 - 只有触发者或管理员可以删除
      if (operation.triggeredBy !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '无权限删除此恢复操作'));
      }

      await operation.destroy();

      res.json(formatResponse(true, '恢复操作已删除'));
    } catch (error) {
      logger.error('删除恢复操作失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 批量操作恢复任务
   */
  async batchOperateRestoreOperations(req, res) {
    try {
      const schema = Joi.object({
        operationIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
        action: Joi.string().valid('approve', 'reject', 'cancel', 'delete').required(),
        reason: Joi.string().max(1000).optional(),
        note: Joi.string().max(1000).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const { operationIds, action, reason, note } = value;

      if (req.user.role !== 'admin') {
        return res.status(403).json(formatResponse(false, '批量操作需要管理员权限'));
      }

      const results = [];
      const operations = await models.RestoreOperation.findAll({
        where: {
          id: operationIds
        }
      });

      for (const operation of operations) {
        try {
          switch (action) {
            case 'approve':
              await operation.approve(req.user.id, note);
              break;
            case 'reject':
              await operation.reject(req.user.id, reason);
              break;
            case 'cancel':
              await restoreService.cancelRestoreOperation(operation.id);
              break;
            case 'delete':
              if (!['preparing', 'running'].includes(operation.status)) {
                await operation.destroy();
              } else {
                throw new Error('无法删除进行中的恢复操作');
              }
              break;
          }
          results.push({
            id: operation.id,
            success: true,
            message: `${action} 操作成功`
          });
        } catch (error) {
          results.push({
            id: operation.id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json(formatResponse(true, `批量操作完成：成功 ${successCount} 个，失败 ${failureCount} 个`, {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failure: failureCount
        }
      }));
    } catch (error) {
      logger.error('批量操作恢复任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }
}

module.exports = new RestoreController();