const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const tar = require('tar');

/**
 * 恢复服务
 */
class RestoreService {
  constructor() {
    this.activeOperations = new Map();
    this.isRunning = false;
  }

  /**
   * 启动恢复服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('恢复服务已在运行');
      return;
    }

    try {
      logger.info('🚀 启动恢复服务...');
      
      // 检查待处理的恢复操作
      await this.resumePendingOperations();
      
      // 启动清理任务
      this.startCleanupScheduler();
      
      this.isRunning = true;
      logger.info('✅ 恢复服务启动成功');
    } catch (error) {
      logger.error('❌ 恢复服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止恢复服务
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 停止恢复服务...');
    
    // 等待活跃操作完成或取消
    for (const [operationId, operation] of this.activeOperations) {
      try {
        await this.cancelRestoreOperation(operationId);
      } catch (error) {
        logger.error(`取消恢复操作失败 [${operationId}]:`, error);
      }
    }
    this.activeOperations.clear();
    
    this.isRunning = false;
    logger.info('✅ 恢复服务已停止');
  }

  /**
   * 恢复待处理的操作
   */
  async resumePendingOperations() {
    const pendingOperations = await models.RestoreOperation.findAll({
      where: {
        status: ['pending', 'preparing', 'running']
      }
    });

    if (pendingOperations.length > 0) {
      logger.info(`发现 ${pendingOperations.length} 个待处理的恢复操作`);
      
      for (const operation of pendingOperations) {
        if (operation.status === 'running') {
          // 标记为失败，因为服务重启了
          await operation.fail(new Error('Service restarted during operation'));
        }
      }
    }
  }

  /**
   * 启动清理调度器
   */
  startCleanupScheduler() {
    // 每小时清理一次过期的测试恢复
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredTestRestores();
      } catch (error) {
        logger.error('清理过期测试恢复失败:', error);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * 创建恢复操作
   */
  async createRestoreOperation(restoreData) {
    try {
      // 验证备份任务存在
      const backupJob = await models.BackupJob.findByPk(restoreData.backupJobId);
      if (!backupJob) {
        throw new Error('Backup job not found');
      }

      if (backupJob.status !== 'completed') {
        throw new Error('Cannot restore from incomplete backup');
      }

      const operation = await models.RestoreOperation.create({
        ...restoreData,
        status: 'pending',
        trigger: restoreData.trigger || 'manual'
      });

      logger.info(`创建恢复操作: ${operation.name} [${operation.id}]`);
      return operation;
    } catch (error) {
      logger.error('创建恢复操作失败:', error);
      throw error;
    }
  }

  /**
   * 执行恢复操作
   */
  async executeRestoreOperation(operation) {
    try {
      logger.info(`开始执行恢复操作: ${operation.name} [${operation.id}]`);
      
      // 检查是否需要审批
      if (this.requiresApproval(operation) && !operation.approvedBy) {
        logger.info(`恢复操作需要审批: ${operation.name} [${operation.id}]`);
        return { success: false, message: 'Approval required' };
      }

      // 标记操作为运行状态
      await operation.start();
      this.activeOperations.set(operation.id, operation);

      // 执行预检查
      await operation.updateProgress(5, 'Performing pre-checks...');
      const preCheckResult = await this.performPreChecks(operation);
      if (!preCheckResult.canRestore) {
        throw new Error(`Pre-check failed: ${preCheckResult.errors.join(', ')}`);
      }

      // 创建恢复前备份（如果需要）
      if (operation.restoreConfig.createBackupBeforeRestore) {
        await operation.updateProgress(10, 'Creating pre-restore backup...');
        const preBackup = await this.createPreRestoreBackup(operation);
        operation.preRestoreBackupId = preBackup.id;
        await operation.save();
      }

      // 执行恢复
      const result = await this.performRestore(operation);

      // 验证恢复结果
      if (operation.restoreConfig.verifyAfterRestore) {
        await operation.updateProgress(95, 'Verifying restore...');
        await this.verifyRestore(operation);
      }

      // 完成恢复
      await operation.complete(result);
      this.activeOperations.delete(operation.id);

      logger.info(`恢复操作完成: ${operation.name} [${operation.id}]`);
      return { success: true, ...result };

    } catch (error) {
      logger.error(`恢复操作失败 [${operation.id}]:`, error);
      
      await operation.fail(error);
      this.activeOperations.delete(operation.id);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查是否需要审批
   */
  requiresApproval(operation) {
    return operation.priority === 'high' || 
           operation.priority === 'critical' ||
           operation.restoreType === 'full' ||
           !operation.isTestRestore;
  }

  /**
   * 执行预检查
   */
  async performPreChecks(operation) {
    const checks = {
      canRestore: true,
      warnings: [],
      errors: []
    };

    try {
      // 检查备份文件是否存在
      const backupJob = await models.BackupJob.findByPk(operation.backupJobId);
      if (!backupJob.filePath) {
        checks.errors.push('Backup file path not found');
        checks.canRestore = false;
      } else {
        try {
          await fs.access(backupJob.filePath);
        } catch (error) {
          checks.errors.push('Backup file does not exist');
          checks.canRestore = false;
        }
      }

      // 检查磁盘空间
      const diskSpace = await this.checkDiskSpace();
      const requiredSpace = backupJob.fileSize * 2; // 解压需要额外空间
      if (diskSpace.available < requiredSpace) {
        checks.errors.push('Insufficient disk space');
        checks.canRestore = false;
      }

      // 检查目标路径权限
      const targetPaths = operation.targetPaths || {};
      for (const [type, targetPath] of Object.entries(targetPaths)) {
        if (targetPath) {
          try {
            await fs.access(path.dirname(targetPath), fs.constants.W_OK);
          } catch (error) {
            checks.errors.push(`No write permission for ${type} path: ${targetPath}`);
            checks.canRestore = false;
          }
        }
      }

      // 检查是否会覆盖现有数据
      if (operation.restoreConfig.overwriteExisting) {
        checks.warnings.push('This operation will overwrite existing data');
      }

      // 检查服务状态
      if (operation.restoreConfig.stopServicesBeforeRestore) {
        checks.warnings.push('Services will be stopped during restore');
      }

      operation.preCheckResults = checks;
      await operation.save();

    } catch (error) {
      checks.errors.push(`Pre-check failed: ${error.message}`);
      checks.canRestore = false;
    }

    return checks;
  }

  /**
   * 创建恢复前备份
   */
  async createPreRestoreBackup(operation) {
    // 备份功能已删除 - 跳过预还原备份
    console.log('预还原备份功能已禁用');
    return null;
  }

  /**
   * 执行实际恢复
   */
  async performRestore(operation) {
    const result = {
      statistics: {
        restoredFiles: 0,
        restoredSize: 0,
        restoredTables: 0,
        skippedFiles: 0,
        errors: []
      }
    };

    // 获取备份文件
    const backupJob = await models.BackupJob.findByPk(operation.backupJobId);
    const workDir = await this.prepareWorkDirectory(operation);

    // 解压备份文件
    await operation.updateProgress(20, 'Extracting backup...');
    await this.extractBackup(backupJob.filePath, workDir);

    // 根据恢复类型执行不同的恢复操作
    switch (operation.restoreType) {
      case 'full':
        await this.performFullRestore(operation, workDir, result);
        break;
      case 'database_only':
        await this.performDatabaseRestore(operation, workDir, result);
        break;
      case 'files_only':
        await this.performFilesRestore(operation, workDir, result);
        break;
      case 'selective':
        await this.performSelectiveRestore(operation, workDir, result);
        break;
      case 'point_in_time':
        await this.performPointInTimeRestore(operation, workDir, result);
        break;
      default:
        throw new Error(`Unsupported restore type: ${operation.restoreType}`);
    }

    // 清理工作目录
    await this.cleanupWorkDirectory(workDir);

    return result;
  }

  /**
   * 执行完整恢复
   */
  async performFullRestore(operation, workDir, result) {
    // 停止服务（如果需要）
    if (operation.restoreConfig.stopServicesBeforeRestore) {
      await operation.updateProgress(25, 'Stopping services...');
      await this.stopServices();
    }

    try {
      // 恢复数据库
      if (operation.restoreConfig.restoreDatabases) {
        await operation.updateProgress(40, 'Restoring database...');
        await this.restoreDatabase(workDir, operation, result);
      }

      // 恢复文件
      if (operation.restoreConfig.restoreFiles) {
        await operation.updateProgress(60, 'Restoring files...');
        await this.restoreFiles(workDir, operation, result);
      }

      // 恢复权限
      if (operation.restoreConfig.restorePermissions) {
        await operation.updateProgress(80, 'Restoring permissions...');
        await this.restorePermissions(workDir, operation, result);
      }

    } finally {
      // 重启服务（如果之前停止了）
      if (operation.restoreConfig.stopServicesBeforeRestore) {
        await operation.updateProgress(90, 'Starting services...');
        await this.startServices();
      }
    }
  }

  /**
   * 执行数据库恢复
   */
  async performDatabaseRestore(operation, workDir, result) {
    await operation.updateProgress(30, 'Restoring database...');
    await this.restoreDatabase(workDir, operation, result);
  }

  /**
   * 执行文件恢复
   */
  async performFilesRestore(operation, workDir, result) {
    await operation.updateProgress(30, 'Restoring files...');
    await this.restoreFiles(workDir, operation, result);
  }

  /**
   * 执行选择性恢复
   */
  async performSelectiveRestore(operation, workDir, result) {
    const scope = operation.restoreScope;

    if (scope.databases && scope.databases.length > 0) {
      await operation.updateProgress(30, 'Restoring selected databases...');
      await this.restoreSelectedDatabases(workDir, operation, result, scope.databases);
    }

    if (scope.directories && scope.directories.length > 0) {
      await operation.updateProgress(60, 'Restoring selected directories...');
      await this.restoreSelectedDirectories(workDir, operation, result, scope.directories);
    }

    if (scope.files && scope.files.length > 0) {
      await operation.updateProgress(80, 'Restoring selected files...');
      await this.restoreSelectedFiles(workDir, operation, result, scope.files);
    }
  }

  /**
   * 执行时间点恢复
   */
  async performPointInTimeRestore(operation, workDir, result) {
    if (!operation.targetTimestamp) {
      throw new Error('Target timestamp required for point-in-time restore');
    }

    // 实现时间点恢复逻辑
    // 这通常需要事务日志和特定的数据库功能
    throw new Error('Point-in-time restore not implemented');
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(workDir, operation, result) {
    const dbBackupPath = path.join(workDir, 'database');
    const sqlFile = path.join(dbBackupPath, 'database.sql');

    try {
      await fs.access(sqlFile);
    } catch (error) {
      throw new Error('Database backup file not found');
    }

    const config = require('../config');

    // 使用psql恢复PostgreSQL数据库
    const restoreCommand = spawn('psql', [
      '-h', config.database.host,
      '-p', config.database.port,
      '-U', config.database.username,
      '-d', config.database.database,
      '-f', sqlFile,
      '--quiet'
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.database.password
      }
    });

    return new Promise((resolve, reject) => {
      let errorOutput = '';

      restoreCommand.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      restoreCommand.on('close', (code) => {
        if (code === 0) {
          result.statistics.restoredTables += 1;
          resolve();
        } else {
          reject(new Error(`Database restore failed: ${errorOutput}`));
        }
      });

      restoreCommand.on('error', reject);
    });
  }

  /**
   * 恢复文件
   */
  async restoreFiles(workDir, operation, result) {
    const filesToRestore = [
      { src: 'uploads', dest: 'public/uploads' },
      { src: 'ebooks', dest: 'public/ebooks' },
      { src: 'files', dest: '.' }
    ];

    for (const file of filesToRestore) {
      const srcPath = path.join(workDir, file.src);
      const destPath = file.dest;

      try {
        await fs.access(srcPath);
        await this.copyDirectory(srcPath, destPath, operation, result);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn(`恢复文件失败 [${file.src}]:`, error);
          result.statistics.errors.push(`Failed to restore ${file.src}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 恢复权限
   */
  async restorePermissions(workDir, operation, result) {
    // 实现权限恢复逻辑
    // 这里应该根据备份的权限信息恢复文件和目录权限
    logger.info('权限恢复功能暂未实现');
  }

  /**
   * 恢复选择的数据库
   */
  async restoreSelectedDatabases(workDir, operation, result, databases) {
    // 实现选择性数据库恢复
    throw new Error('Selective database restore not implemented');
  }

  /**
   * 恢复选择的目录
   */
  async restoreSelectedDirectories(workDir, operation, result, directories) {
    for (const dir of directories) {
      const srcPath = path.join(workDir, dir);
      const destPath = dir;

      try {
        await this.copyDirectory(srcPath, destPath, operation, result);
      } catch (error) {
        logger.warn(`恢复目录失败 [${dir}]:`, error);
        result.statistics.errors.push(`Failed to restore directory ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * 恢复选择的文件
   */
  async restoreSelectedFiles(workDir, operation, result, files) {
    for (const file of files) {
      const srcPath = path.join(workDir, file);
      const destPath = file;

      try {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(srcPath, destPath);
        
        const stats = await fs.stat(destPath);
        result.statistics.restoredFiles += 1;
        result.statistics.restoredSize += stats.size;
      } catch (error) {
        logger.warn(`恢复文件失败 [${file}]:`, error);
        result.statistics.errors.push(`Failed to restore file ${file}: ${error.message}`);
      }
    }
  }

  /**
   * 准备工作目录
   */
  async prepareWorkDirectory(operation) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workDir = path.join('/tmp/restores', `restore_${operation.id}_${timestamp}`);
    
    await fs.mkdir(workDir, { recursive: true });
    return workDir;
  }

  /**
   * 解压备份文件
   */
  async extractBackup(backupFilePath, workDir) {
    if (backupFilePath.endsWith('.tar.gz')) {
      await tar.extract({
        file: backupFilePath,
        cwd: workDir
      });
    } else {
      // 假设是目录，直接复制
      await this.copyDirectory(backupFilePath, workDir);
    }
  }

  /**
   * 复制目录
   */
  async copyDirectory(src, dest, operation = null, result = null) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);

    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      const stats = await fs.stat(srcPath);

      if (stats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath, operation, result);
      } else {
        await fs.copyFile(srcPath, destPath);
        
        if (result) {
          result.statistics.restoredFiles += 1;
          result.statistics.restoredSize += stats.size;
        }
      }
    }
  }

  /**
   * 验证恢复结果
   */
  async verifyRestore(operation) {
    const verificationResult = {
      verified: true,
      checks: [],
      errors: []
    };

    try {
      // 验证数据库连接
      if (operation.restoreConfig.restoreDatabases) {
        const dbCheck = await this.verifyDatabaseRestore();
        verificationResult.checks.push(dbCheck);
        if (!dbCheck.success) {
          verificationResult.verified = false;
          verificationResult.errors.push(dbCheck.error);
        }
      }

      // 验证关键文件
      const fileChecks = await this.verifyFileRestore(operation);
      verificationResult.checks.push(...fileChecks);
      
      const failedFileChecks = fileChecks.filter(check => !check.success);
      if (failedFileChecks.length > 0) {
        verificationResult.verified = false;
        verificationResult.errors.push(...failedFileChecks.map(check => check.error));
      }

      operation.verificationResult = verificationResult;
      await operation.save();

    } catch (error) {
      verificationResult.verified = false;
      verificationResult.errors.push(error.message);
    }

    return verificationResult;
  }

  /**
   * 验证数据库恢复
   */
  async verifyDatabaseRestore() {
    try {
      await models.sequelize.authenticate();
      
      // 执行简单查询测试
      const testResult = await models.sequelize.query('SELECT 1 as test', {
        type: models.sequelize.QueryTypes.SELECT
      });
      
      if (testResult[0]?.test === 1) {
        return { success: true, message: 'Database connection verified' };
      } else {
        return { success: false, error: 'Database test query failed' };
      }
    } catch (error) {
      return { success: false, error: `Database verification failed: ${error.message}` };
    }
  }

  /**
   * 验证文件恢复
   */
  async verifyFileRestore(operation) {
    const checks = [];
    const criticalPaths = [
      'public/uploads',
      'public/ebooks'
    ];

    for (const criticalPath of criticalPaths) {
      try {
        await fs.access(criticalPath);
        checks.push({ success: true, path: criticalPath, message: 'Path exists' });
      } catch (error) {
        checks.push({ success: false, path: criticalPath, error: `Path not accessible: ${error.message}` });
      }
    }

    return checks;
  }

  /**
   * 检查磁盘空间
   */
  async checkDiskSpace() {
    // 简化的磁盘空间检查
    // 实际项目中应该使用系统调用获取准确信息
    return {
      total: 100 * 1024 * 1024 * 1024, // 100GB
      available: 50 * 1024 * 1024 * 1024  // 50GB
    };
  }

  /**
   * 停止服务
   */
  async stopServices() {
    logger.info('停止服务功能暂未实现');
  }

  /**
   * 启动服务
   */
  async startServices() {
    logger.info('启动服务功能暂未实现');
  }

  /**
   * 清理工作目录
   */
  async cleanupWorkDirectory(workDir) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('清理工作目录失败:', error);
    }
  }

  /**
   * 取消恢复操作
   */
  async cancelRestoreOperation(operationId) {
    const operation = await models.RestoreOperation.findByPk(operationId);
    if (operation) {
      await operation.cancel();
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * 清理过期的测试恢复
   */
  async cleanupExpiredTestRestores() {
    const expiredRestores = await models.RestoreOperation.getTestRestoresForCleanup();
    let cleanedCount = 0;

    for (const restore of expiredRestores) {
      try {
        await restore.cleanup();
        cleanedCount++;
      } catch (error) {
        logger.error(`清理过期测试恢复失败 [${restore.id}]:`, error);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`清理了 ${cleanedCount} 个过期测试恢复`);
    }

    return cleanedCount;
  }

  /**
   * 获取活跃恢复操作
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.values()).map(op => op.getSummary());
  }

  /**
   * 获取恢复统计
   */
  async getRestoreStatistics(timeRange = 30) {
    return await models.RestoreOperation.getStatistics(timeRange);
  }

  /**
   * 测试恢复（不实际执行）
   */
  async testRestore(operation) {
    const testOperation = await models.RestoreOperation.create({
      ...operation.toJSON(),
      id: undefined,
      name: `TEST_${operation.name}`,
      isTestRestore: true,
      restoreConfig: {
        ...operation.restoreConfig,
        overwriteExisting: false,
        createBackupBeforeRestore: false,
        stopServicesBeforeRestore: false
      }
    });

    return await this.executeRestoreOperation(testOperation);
  }
}

// 创建单例实例
const restoreService = new RestoreService();

module.exports = restoreService;