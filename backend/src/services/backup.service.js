const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const { spawn } = require('child_process');
const cron = require('node-cron');

/**
 * 备份服务
 */
class BackupService {
  constructor() {
    this.activeJobs = new Map();
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * 启动备份服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('备份服务已在运行');
      return;
    }

    try {
      logger.info('🚀 启动备份服务...');
      
      // 初始化存储配置
      await this.initializeStorages();
      
      // 初始化调度任务
      await this.initializeSchedules();
      
      // 启动调度器
      this.startScheduler();
      
      this.isRunning = true;
      logger.info('✅ 备份服务启动成功');
    } catch (error) {
      logger.error('❌ 备份服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止备份服务
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 停止备份服务...');
    
    // 停止调度任务
    for (const [scheduleId, task] of this.scheduledTasks) {
      if (task.destroy) {
        task.destroy();
      }
    }
    this.scheduledTasks.clear();
    
    // 等待活跃任务完成或取消
    for (const [jobId, job] of this.activeJobs) {
      try {
        await this.cancelBackupJob(jobId);
      } catch (error) {
        logger.error(`取消备份任务失败 [${jobId}]:`, error);
      }
    }
    this.activeJobs.clear();
    
    this.isRunning = false;
    logger.info('✅ 备份服务已停止');
  }

  /**
   * 初始化存储配置
   */
  async initializeStorages() {
    try {
      const created = await models.BackupStorage.createDefaultStorages();
      if (created.length > 0) {
        logger.info(`✅ 创建了 ${created.length} 个默认存储配置`);
      }
      
      // 测试所有启用的存储连接
      const enabledStorages = await models.BackupStorage.getAvailable();
      for (const storage of enabledStorages) {
        try {
          await storage.testConnection();
        } catch (error) {
          logger.warn(`存储连接测试失败 [${storage.name}]:`, error);
        }
      }
    } catch (error) {
      logger.error('初始化存储配置失败:', error);
      throw error;
    }
  }

  /**
   * 初始化调度任务
   */
  async initializeSchedules() {
    try {
      const created = await models.BackupSchedule.createDefaultSchedules();
      if (created.length > 0) {
        logger.info(`✅ 创建了 ${created.length} 个默认备份调度`);
      }
      
      // 加载所有启用的调度
      const enabledSchedules = await models.BackupSchedule.getEnabledSchedules();
      for (const schedule of enabledSchedules) {
        this.addScheduledTask(schedule);
      }
      
      logger.info(`✅ 加载了 ${enabledSchedules.length} 个备份调度`);
    } catch (error) {
      logger.error('初始化调度任务失败:', error);
      throw error;
    }
  }

  /**
   * 启动调度器
   */
  startScheduler() {
    // 每分钟检查一次需要执行的调度
    this.masterScheduler = cron.schedule('* * * * *', async () => {
      try {
        const dueSchedules = await models.BackupSchedule.getDueSchedules();
        for (const schedule of dueSchedules) {
          this.executeScheduledBackup(schedule);
        }
      } catch (error) {
        logger.error('调度器执行失败:', error);
      }
    });
  }

  /**
   * 添加调度任务
   */
  addScheduledTask(schedule) {
    try {
      const task = cron.schedule(schedule.cronExpression, async () => {
        await this.executeScheduledBackup(schedule);
      }, {
        timezone: schedule.timezone,
        scheduled: false
      });
      
      this.scheduledTasks.set(schedule.id, task);
      task.start();
      
      logger.debug(`调度任务已添加: ${schedule.name}`);
    } catch (error) {
      logger.error(`添加调度任务失败 [${schedule.name}]:`, error);
    }
  }

  /**
   * 执行调度备份
   */
  async executeScheduledBackup(schedule) {
    try {
      // 检查执行条件
      const conditionCheck = await schedule.checkConditions();
      if (!conditionCheck.canRun) {
        logger.info(`跳过调度备份 [${schedule.name}]: ${conditionCheck.reasons.join(', ')}`);
        await schedule.updateRunResult('skipped', { reasons: conditionCheck.reasons });
        return;
      }
      
      // 创建备份任务
      const job = await models.BackupJob.create({
        name: `${schedule.name}_${Date.now()}`,
        description: `定时备份: ${schedule.name}`,
        backupType: schedule.backupType,
        scheduledAt: new Date(),
        trigger: 'scheduled',
        scheduleId: schedule.id,
        backupConfig: schedule.backupConfig,
        storageConfig: schedule.storageConfig
      });
      
      // 执行备份
      const result = await this.executeBackupJob(job);
      
      // 更新调度结果
      await schedule.updateRunResult(
        result.success ? 'success' : 'failed',
        result
      );
      
    } catch (error) {
      logger.error(`执行调度备份失败 [${schedule.name}]:`, error);
      await schedule.updateRunResult('failed', { error: error.message });
    }
  }

  /**
   * 创建备份任务
   */
  async createBackupJob(backupData) {
    try {
      const job = await models.BackupJob.create({
        ...backupData,
        status: 'pending',
        trigger: backupData.trigger || 'manual'
      });
      
      logger.info(`创建备份任务: ${job.name} [${job.id}]`);
      return job;
    } catch (error) {
      logger.error('创建备份任务失败:', error);
      throw error;
    }
  }

  /**
   * 执行备份任务
   */
  async executeBackupJob(job) {
    try {
      logger.info(`开始执行备份任务: ${job.name} [${job.id}]`);
      
      // 标记任务为运行状态
      await job.start();
      this.activeJobs.set(job.id, job);
      
      // 获取存储配置
      const storage = await this.getStorageForJob(job);
      if (!storage) {
        throw new Error('No available storage found');
      }
      
      // 执行备份
      const result = await this.performBackup(job, storage);
      
      // 完成备份
      await job.complete(result);
      this.activeJobs.delete(job.id);
      
      logger.info(`备份任务完成: ${job.name} [${job.id}]`);
      return { success: true, ...result };
      
    } catch (error) {
      logger.error(`备份任务失败 [${job.id}]:`, error);
      
      await job.fail(error);
      this.activeJobs.delete(job.id);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取任务的存储配置
   */
  async getStorageForJob(job) {
    if (job.storageConfig?.storageId) {
      return await models.BackupStorage.findByPk(job.storageConfig.storageId);
    }
    
    return await models.BackupStorage.getDefault();
  }

  /**
   * 执行实际备份
   */
  async performBackup(job, storage) {
    const backupDir = await this.createBackupDirectory(job, storage);
    const result = {
      filePath: null,
      fileSize: 0,
      fileCount: 0,
      compressedSize: 0,
      checksum: null,
      statistics: {
        totalFiles: 0,
        totalSize: 0,
        processedFiles: 0,
        processedSize: 0,
        transferRate: 0
      }
    };
    
    const startTime = Date.now();
    
    // 根据备份类型执行不同的备份操作
    switch (job.backupType) {
      case 'full':
        await this.performFullBackup(job, backupDir, result);
        break;
      case 'database_only':
        await this.performDatabaseBackup(job, backupDir, result);
        break;
      case 'files_only':
        await this.performFilesBackup(job, backupDir, result);
        break;
      case 'incremental':
        await this.performIncrementalBackup(job, backupDir, result);
        break;
      case 'differential':
        await this.performDifferentialBackup(job, backupDir, result);
        break;
      default:
        throw new Error(`Unsupported backup type: ${job.backupType}`);
    }
    
    // 创建压缩包
    if (job.backupConfig.compression) {
      await job.updateProgress(80, 'Creating compressed archive...');
      result.filePath = await this.createCompressedArchive(backupDir, job);
      result.compressedSize = (await fs.stat(result.filePath)).size;
    } else {
      result.filePath = backupDir;
    }
    
    // 计算校验和
    await job.updateProgress(90, 'Calculating checksum...');
    result.checksum = await this.calculateChecksum(result.filePath);
    
    // 上传到存储
    await job.updateProgress(95, 'Uploading to storage...');
    await this.uploadToStorage(result.filePath, storage, job);
    
    // 更新统计信息
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    result.statistics.transferRate = result.fileSize / duration;
    
    // 清理本地临时文件
    await this.cleanupTemporaryFiles(backupDir, job);
    
    return result;
  }

  /**
   * 执行完整备份
   */
  async performFullBackup(job, backupDir, result) {
    await job.updateProgress(10, 'Starting full backup...');
    
    // 备份数据库
    if (job.backupConfig.includeDatabases) {
      await job.updateProgress(20, 'Backing up database...');
      await this.backupDatabase(backupDir, job, result);
    }
    
    // 备份文件
    if (job.backupConfig.includeFiles) {
      await job.updateProgress(40, 'Backing up files...');
      await this.backupFiles(backupDir, job, result);
    }
    
    // 备份上传文件
    if (job.backupConfig.includeUploads) {
      await job.updateProgress(60, 'Backing up uploads...');
      await this.backupUploads(backupDir, job, result);
    }
    
    // 备份电子书
    if (job.backupConfig.includeEbooks) {
      await job.updateProgress(70, 'Backing up ebooks...');
      await this.backupEbooks(backupDir, job, result);
    }
  }

  /**
   * 执行数据库备份
   */
  async performDatabaseBackup(job, backupDir, result) {
    await job.updateProgress(20, 'Backing up database...');
    await this.backupDatabase(backupDir, job, result);
  }

  /**
   * 执行文件备份
   */
  async performFilesBackup(job, backupDir, result) {
    await job.updateProgress(20, 'Backing up files...');
    
    if (job.backupConfig.includeUploads) {
      await this.backupUploads(backupDir, job, result);
    }
    
    if (job.backupConfig.includeEbooks) {
      await this.backupEbooks(backupDir, job, result);
    }
  }

  /**
   * 执行增量备份
   */
  async performIncrementalBackup(job, backupDir, result) {
    // 获取父备份
    const parentBackup = await this.getParentBackup(job);
    if (!parentBackup) {
      throw new Error('No parent backup found for incremental backup');
    }
    
    await job.updateProgress(10, 'Performing incremental backup...');
    
    // 实现增量备份逻辑
    // 只备份自上次备份以来修改的文件
    const lastBackupTime = parentBackup.completedAt;
    await this.backupChangedFiles(backupDir, job, result, lastBackupTime);
  }

  /**
   * 执行差异备份
   */
  async performDifferentialBackup(job, backupDir, result) {
    // 获取最后一次完整备份
    const lastFullBackup = await this.getLastFullBackup(job);
    if (!lastFullBackup) {
      throw new Error('No full backup found for differential backup');
    }
    
    await job.updateProgress(10, 'Performing differential backup...');
    
    // 实现差异备份逻辑
    // 备份自上次完整备份以来所有修改的文件
    const lastFullBackupTime = lastFullBackup.completedAt;
    await this.backupChangedFiles(backupDir, job, result, lastFullBackupTime);
  }

  /**
   * 备份数据库
   */
  async backupDatabase(backupDir, job, result) {
    const dbBackupPath = path.join(backupDir, 'database');
    await fs.mkdir(dbBackupPath, { recursive: true });
    
    const config = require('../config');
    const dumpFile = path.join(dbBackupPath, 'database.sql');
    
    // 使用pg_dump备份PostgreSQL数据库
    const dumpCommand = spawn('pg_dump', [
      '-h', config.database.host,
      '-p', config.database.port,
      '-U', config.database.username,
      '-d', config.database.database,
      '-f', dumpFile,
      '--no-password',
      '--verbose'
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.database.password
      }
    });
    
    return new Promise((resolve, reject) => {
      let errorOutput = '';
      
      dumpCommand.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      dumpCommand.on('close', async (code) => {
        if (code === 0) {
          try {
            const stats = await fs.stat(dumpFile);
            result.fileSize += stats.size;
            result.fileCount += 1;
            result.statistics.processedFiles += 1;
            result.statistics.processedSize += stats.size;
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Database backup failed: ${errorOutput}`));
        }
      });
      
      dumpCommand.on('error', reject);
    });
  }

  /**
   * 备份文件
   */
  async backupFiles(backupDir, job, result) {
    const filesBackupPath = path.join(backupDir, 'files');
    await fs.mkdir(filesBackupPath, { recursive: true });
    
    // 备份配置文件、脚本等
    const filesToBackup = [
      { src: 'src/config', dest: 'config' },
      { src: 'package.json', dest: 'package.json' },
      { src: 'package-lock.json', dest: 'package-lock.json' }
    ];
    
    for (const file of filesToBackup) {
      try {
        await this.copyFileOrDirectory(file.src, path.join(filesBackupPath, file.dest), result);
      } catch (error) {
        logger.warn(`备份文件失败 [${file.src}]:`, error);
      }
    }
  }

  /**
   * 备份上传文件
   */
  async backupUploads(backupDir, job, result) {
    const uploadsPath = 'public/uploads';
    const uploadsBackupPath = path.join(backupDir, 'uploads');
    
    try {
      await this.copyFileOrDirectory(uploadsPath, uploadsBackupPath, result);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      logger.warn('上传目录不存在，跳过备份');
    }
  }

  /**
   * 备份电子书
   */
  async backupEbooks(backupDir, job, result) {
    const ebooksPath = 'public/ebooks';
    const ebooksBackupPath = path.join(backupDir, 'ebooks');
    
    try {
      await this.copyFileOrDirectory(ebooksPath, ebooksBackupPath, result);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      logger.warn('电子书目录不存在，跳过备份');
    }
  }

  /**
   * 备份自指定时间以来修改的文件
   */
  async backupChangedFiles(backupDir, job, result, since) {
    // 实现文件变更检测和备份逻辑
    // 这里需要比较文件修改时间或使用文件系统事件
    const paths = ['public/uploads', 'public/ebooks'];
    
    for (const srcPath of paths) {
      try {
        await this.copyChangedFiles(srcPath, backupDir, result, since);
      } catch (error) {
        logger.warn(`备份变更文件失败 [${srcPath}]:`, error);
      }
    }
  }

  /**
   * 复制文件或目录
   */
  async copyFileOrDirectory(src, dest, result) {
    try {
      const stats = await fs.stat(src);
      
      if (stats.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src);
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          await this.copyFileOrDirectory(srcPath, destPath, result);
        }
      } else {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
        
        result.fileSize += stats.size;
        result.fileCount += 1;
        result.statistics.processedFiles += 1;
        result.statistics.processedSize += stats.size;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 复制自指定时间以来修改的文件
   */
  async copyChangedFiles(src, destBase, result, since) {
    try {
      const stats = await fs.stat(src);
      
      if (stats.isDirectory()) {
        const entries = await fs.readdir(src);
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry);
          await this.copyChangedFiles(srcPath, destBase, result, since);
        }
      } else {
        if (stats.mtime > since) {
          const relativePath = path.relative(process.cwd(), src);
          const destPath = path.join(destBase, relativePath);
          
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(src, destPath);
          
          result.fileSize += stats.size;
          result.fileCount += 1;
          result.statistics.processedFiles += 1;
          result.statistics.processedSize += stats.size;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 创建备份目录
   */
  async createBackupDirectory(job, storage) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dirName = `${job.backupType}_${timestamp}_${job.name}`;
    const backupDir = path.join('/tmp/backups', dirName);
    
    await fs.mkdir(backupDir, { recursive: true });
    return backupDir;
  }

  /**
   * 创建压缩包
   */
  async createCompressedArchive(sourceDir, job) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${job.backupType}_${timestamp}_${job.name}.tar.gz`;
    const archivePath = path.join('/tmp/backups', archiveName);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(archivePath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: job.backupConfig.compressionLevel || 6
        }
      });
      
      output.on('close', () => resolve(archivePath));
      output.on('error', reject);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 计算文件校验和
   */
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * 上传到存储
   */
  async uploadToStorage(filePath, storage, job) {
    // 根据存储类型实现上传逻辑
    switch (storage.type) {
      case 'local':
        await this.uploadToLocalStorage(filePath, storage, job);
        break;
      case 's3':
        await this.uploadToS3Storage(filePath, storage, job);
        break;
      default:
        logger.warn(`存储类型 ${storage.type} 的上传功能未实现`);
    }
    
    // 更新存储使用统计
    const fileStats = await fs.stat(filePath);
    await storage.updateUsageStats('upload', fileStats.size);
  }

  /**
   * 上传到本地存储
   */
  async uploadToLocalStorage(filePath, storage, job) {
    const fileName = path.basename(filePath);
    const destPath = path.join(storage.connectionConfig.path, fileName);
    
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(filePath, destPath);
    
    // 更新任务的存储路径
    job.storagePath = destPath;
    await job.save();
  }

  /**
   * 上传到S3存储
   */
  async uploadToS3Storage(filePath, storage, job) {
    // 实现S3上传逻辑
    throw new Error('S3 upload not implemented');
  }

  /**
   * 清理临时文件
   */
  async cleanupTemporaryFiles(backupDir, job) {
    try {
      if (job.backupConfig.cleanupTempFiles !== false) {
        await fs.rm(backupDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 获取父备份（用于增量备份）
   */
  async getParentBackup(job) {
    if (job.parentBackupId) {
      return await models.BackupJob.findByPk(job.parentBackupId);
    }
    
    // 查找最近的成功备份
    return await models.BackupJob.findOne({
      where: {
        status: 'completed',
        backupType: ['full', 'incremental'],
        scheduleId: job.scheduleId
      },
      order: [['completedAt', 'DESC']]
    });
  }

  /**
   * 获取最后一次完整备份
   */
  async getLastFullBackup(job) {
    return await models.BackupJob.findOne({
      where: {
        status: 'completed',
        backupType: 'full',
        scheduleId: job.scheduleId
      },
      order: [['completedAt', 'DESC']]
    });
  }

  /**
   * 取消备份任务
   */
  async cancelBackupJob(jobId) {
    const job = await models.BackupJob.findByPk(jobId);
    if (job) {
      await job.cancel();
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * 获取活跃备份任务
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.values()).map(job => job.getSummary());
  }

  /**
   * 获取备份统计
   */
  async getBackupStatistics(timeRange = 30) {
    return await models.BackupJob.getStatistics(timeRange);
  }

  /**
   * 清理过期备份
   */
  async cleanupExpiredBackups() {
    return await models.BackupJob.cleanupExpiredBackups();
  }

  /**
   * 验证备份完整性
   */
  async verifyBackup(jobId) {
    const job = await models.BackupJob.findByPk(jobId);
    if (!job) {
      throw new Error('Backup job not found');
    }
    
    return await job.verify();
  }
}

// 创建单例实例
const backupService = new BackupService();

module.exports = backupService;