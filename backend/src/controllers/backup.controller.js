const prisma = require('../utils/prisma');
const backupService = require('../services/backup.service');
const { logger } = require('../utils/logger');
const { formatResponse } = require('../utils/response');
const { ValidationError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * 备份控制器
 */
class BackupController {
  /**
   * 创建备份任务
   */
  async createBackupJob(req, res) {
    try {
      const schema = Joi.object({
        name: Joi.string().min(2).max(200).required(),
        description: Joi.string().max(1000).optional(),
        backupType: Joi.string().valid('full', 'database_only', 'files_only', 'incremental', 'differential').required(),
        backupConfig: Joi.object({
          includeDatabases: Joi.boolean().default(true),
          includeFiles: Joi.boolean().default(true),
          includeUploads: Joi.boolean().default(true),
          includeEbooks: Joi.boolean().default(true),
          compression: Joi.boolean().default(true),
          compressionLevel: Joi.number().min(1).max(9).default(6),
          encryption: Joi.boolean().default(false),
          retentionDays: Joi.number().min(1).max(365).default(30)
        }).optional(),
        storageConfig: Joi.object({
          storageId: Joi.number().integer().positive().optional()
        }).optional(),
        scheduledAt: Joi.date().min('now').optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const backupData = {
        ...value,
        triggeredBy: req.user.id,
        trigger: value.scheduledAt ? 'scheduled' : 'manual'
      };

      const backupJob = await backupService.createBackupJob(backupData);
      
      res.status(201).json(formatResponse(true, '备份任务创建成功', {
        backupJob: backupJob.getSummary()
      }));
    } catch (error) {
      logger.error('创建备份任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 执行备份任务
   */
  async executeBackupJob(req, res) {
    try {
      const { id } = req.params;
      
      const backupJob = await models.BackupJob.findByPk(id);
      if (!backupJob) {
        return res.status(404).json(formatResponse(false, '备份任务不存在'));
      }

      if (backupJob.status !== 'pending') {
        return res.status(400).json(formatResponse(false, '只能执行待处理状态的备份任务'));
      }

      // 异步执行备份任务
      backupService.executeBackupJob(backupJob).catch(error => {
        logger.error(`备份任务执行失败 [${id}]:`, error);
      });

      res.json(formatResponse(true, '备份任务已开始执行', {
        backupJob: backupJob.getSummary()
      }));
    } catch (error) {
      logger.error('执行备份任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取备份任务列表
   */
  async getBackupJobs(req, res) {
    try {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
        backupType: Joi.string().valid('full', 'database_only', 'files_only', 'incremental', 'differential').optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        search: Joi.string().max(100).optional(),
        sortBy: Joi.string().valid('createdAt', 'startedAt', 'completedAt', 'fileSize', 'duration').default('createdAt'),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const { page, limit, status, backupType, startDate, endDate, search, sortBy, sortOrder } = value;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (backupType) where.backupType = backupType;
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

      const { count, rows } = await models.BackupJob.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: [
          {
            model: models.User,
            as: 'triggeredByUser',
            attributes: ['id', 'username', 'realName']
          },
          {
            model: models.BackupSchedule,
            as: 'schedule',
            attributes: ['id', 'name']
          }
        ]
      });

      const totalPages = Math.ceil(count / limit);

      res.json(formatResponse(true, '获取备份任务列表成功', {
        backupJobs: rows.map(job => job.getSummary()),
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
      logger.error('获取备份任务列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取备份任务详情
   */
  async getBackupJobById(req, res) {
    try {
      const { id } = req.params;

      const backupJob = await models.BackupJob.findByPk(id, {
        include: [
          {
            model: models.User,
            as: 'triggeredByUser',
            attributes: ['id', 'username', 'realName']
          },
          {
            model: models.BackupSchedule,
            as: 'schedule',
            attributes: ['id', 'name', 'description']
          },
          {
            model: models.BackupJob,
            as: 'parentBackup',
            attributes: ['id', 'name', 'backupType', 'completedAt']
          },
          {
            model: models.BackupJob,
            as: 'childBackups',
            attributes: ['id', 'name', 'backupType', 'status', 'createdAt']
          }
        ]
      });

      if (!backupJob) {
        return res.status(404).json(formatResponse(false, '备份任务不存在'));
      }

      res.json(formatResponse(true, '获取备份任务详情成功', {
        backupJob: backupJob.toJSON()
      }));
    } catch (error) {
      logger.error('获取备份任务详情失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 取消备份任务
   */
  async cancelBackupJob(req, res) {
    try {
      const { id } = req.params;

      const backupJob = await models.BackupJob.findByPk(id);
      if (!backupJob) {
        return res.status(404).json(formatResponse(false, '备份任务不存在'));
      }

      if (!['pending', 'running'].includes(backupJob.status)) {
        return res.status(400).json(formatResponse(false, '只能取消待处理或运行中的备份任务'));
      }

      await backupService.cancelBackupJob(id);

      res.json(formatResponse(true, '备份任务已取消', {
        backupJob: backupJob.getSummary()
      }));
    } catch (error) {
      logger.error('取消备份任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 删除备份任务
   */
  async deleteBackupJob(req, res) {
    try {
      const { id } = req.params;
      const { deleteFiles = false } = req.query;

      const backupJob = await models.BackupJob.findByPk(id);
      if (!backupJob) {
        return res.status(404).json(formatResponse(false, '备份任务不存在'));
      }

      if (backupJob.status === 'running') {
        return res.status(400).json(formatResponse(false, '无法删除运行中的备份任务'));
      }

      if (deleteFiles && backupJob.filePath) {
        const fs = require('fs').promises;
        try {
          await fs.unlink(backupJob.filePath);
        } catch (error) {
          logger.warn(`删除备份文件失败 [${backupJob.filePath}]:`, error);
        }
      }

      await backupJob.destroy();

      res.json(formatResponse(true, '备份任务已删除'));
    } catch (error) {
      logger.error('删除备份任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 验证备份完整性
   */
  async verifyBackup(req, res) {
    try {
      const { id } = req.params;

      const result = await backupService.verifyBackup(id);

      res.json(formatResponse(true, '备份验证完成', {
        verification: result
      }));
    } catch (error) {
      logger.error('验证备份失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取活跃备份任务
   */
  async getActiveJobs(req, res) {
    try {
      const activeJobs = backupService.getActiveJobs();

      res.json(formatResponse(true, '获取活跃备份任务成功', {
        activeJobs,
        count: activeJobs.length
      }));
    } catch (error) {
      logger.error('获取活跃备份任务失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取备份统计
   */
  async getBackupStatistics(req, res) {
    try {
      const { timeRange = 30 } = req.query;

      const statistics = await backupService.getBackupStatistics(parseInt(timeRange));

      res.json(formatResponse(true, '获取备份统计成功', {
        statistics,
        timeRange: parseInt(timeRange)
      }));
    } catch (error) {
      logger.error('获取备份统计失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 清理过期备份
   */
  async cleanupExpiredBackups(req, res) {
    try {
      const result = await backupService.cleanupExpiredBackups();

      res.json(formatResponse(true, '清理过期备份完成', {
        cleanup: result
      }));
    } catch (error) {
      logger.error('清理过期备份失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 创建备份调度
   */
  async createBackupSchedule(req, res) {
    try {
      const schema = Joi.object({
        name: Joi.string().min(2).max(200).required(),
        description: Joi.string().max(1000).optional(),
        cronExpression: Joi.string().required(),
        timezone: Joi.string().default('Asia/Shanghai'),
        backupType: Joi.string().valid('full', 'database_only', 'files_only', 'incremental', 'differential').required(),
        backupConfig: Joi.object().optional(),
        storageConfig: Joi.object().optional(),
        enabled: Joi.boolean().default(true),
        retryConfig: Joi.object({
          maxRetries: Joi.number().min(0).max(10).default(3),
          retryInterval: Joi.number().min(60).max(3600).default(300)
        }).optional(),
        notificationConfig: Joi.object({
          notifyOnSuccess: Joi.boolean().default(false),
          notifyOnFailure: Joi.boolean().default(true),
          recipients: Joi.array().items(Joi.string().email()).optional()
        }).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const scheduleData = {
        ...value,
        createdBy: req.user.id
      };

      const schedule = await models.BackupSchedule.create(scheduleData);

      res.status(201).json(formatResponse(true, '备份调度创建成功', {
        schedule: schedule.toJSON()
      }));
    } catch (error) {
      logger.error('创建备份调度失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取备份调度列表
   */
  async getBackupSchedules(req, res) {
    try {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        enabled: Joi.boolean().optional(),
        search: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const { page, limit, enabled, search } = value;
      const offset = (page - 1) * limit;

      const where = {};
      if (enabled !== undefined) where.enabled = enabled;
      if (search) {
        where[models.sequelize.Op.or] = [
          { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
          { description: { [models.sequelize.Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await models.BackupSchedule.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: models.User,
            as: 'creator',
            attributes: ['id', 'username', 'realName']
          }
        ]
      });

      const totalPages = Math.ceil(count / limit);

      res.json(formatResponse(true, '获取备份调度列表成功', {
        schedules: rows.map(schedule => schedule.toJSON()),
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
      logger.error('获取备份调度列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 更新备份调度
   */
  async updateBackupSchedule(req, res) {
    try {
      const { id } = req.params;
      
      const schedule = await models.BackupSchedule.findByPk(id);
      if (!schedule) {
        return res.status(404).json(formatResponse(false, '备份调度不存在'));
      }

      const schema = Joi.object({
        name: Joi.string().min(2).max(200).optional(),
        description: Joi.string().max(1000).optional(),
        cronExpression: Joi.string().optional(),
        timezone: Joi.string().optional(),
        backupType: Joi.string().valid('full', 'database_only', 'files_only', 'incremental', 'differential').optional(),
        backupConfig: Joi.object().optional(),
        storageConfig: Joi.object().optional(),
        enabled: Joi.boolean().optional(),
        retryConfig: Joi.object().optional(),
        notificationConfig: Joi.object().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(formatResponse(false, error.details[0].message));
      }

      const updateData = {
        ...value,
        updatedBy: req.user.id
      };

      await schedule.update(updateData);

      res.json(formatResponse(true, '备份调度更新成功', {
        schedule: schedule.toJSON()
      }));
    } catch (error) {
      logger.error('更新备份调度失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 删除备份调度
   */
  async deleteBackupSchedule(req, res) {
    try {
      const { id } = req.params;
      
      const schedule = await models.BackupSchedule.findByPk(id);
      if (!schedule) {
        return res.status(404).json(formatResponse(false, '备份调度不存在'));
      }

      await schedule.destroy();

      res.json(formatResponse(true, '备份调度已删除'));
    } catch (error) {
      logger.error('删除备份调度失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 获取存储配置列表
   */
  async getStorageConfigs(req, res) {
    try {
      const storages = await models.BackupStorage.findAll({
        order: [['priority', 'DESC'], ['name', 'ASC']]
      });

      res.json(formatResponse(true, '获取存储配置列表成功', {
        storages: storages.map(storage => storage.getStorageInfo())
      }));
    } catch (error) {
      logger.error('获取存储配置列表失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }

  /**
   * 测试存储连接
   */
  async testStorageConnection(req, res) {
    try {
      const { id } = req.params;
      
      const storage = await models.BackupStorage.findByPk(id);
      if (!storage) {
        return res.status(404).json(formatResponse(false, '存储配置不存在'));
      }

      const result = await storage.testConnection();

      res.json(formatResponse(true, '存储连接测试完成', {
        connectionTest: result
      }));
    } catch (error) {
      logger.error('测试存储连接失败:', error);
      res.status(500).json(formatResponse(false, error.message));
    }
  }
}

module.exports = new BackupController();