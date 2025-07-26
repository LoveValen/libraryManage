const { sequelize } = require('../config/database.config');

// 导入所有模型
const UserModel = require('./user.model');
const BookModel = require('./book.model');
const BookCategoryModel = require('./bookCategory.model');
const BorrowModel = require('./borrow.model');
const UserPointsModel = require('./userPoints.model');
const PointsTransactionModel = require('./pointsTransaction.model');
const ReviewModel = require('./review.model');
const ImportFileModel = require('./importFile.model');
const NotificationModel = require('./notification.model');
const NotificationTemplateModel = require('./notificationTemplate.model');
const SystemHealthModel = require('./systemHealth.model');
const AlertModel = require('./alert.model');
const HealthCheckTemplateModel = require('./healthCheckTemplate.model');
const BackupJobModel = require('./backupJob.model');
const BackupScheduleModel = require('./backupSchedule.model');
const RestoreOperationModel = require('./restoreOperation.model');
const BackupStorageModel = require('./backupStorage.model');
const UserBehaviorModel = require('./userBehavior.model');
const RecommendationModelModel = require('./recommendationModel.model');
const RecommendationModel = require('./recommendation.model');
const UserPreferenceModel = require('./userPreference.model');
const RecommendationFeedbackModel = require('./recommendationFeedback.model');
const AuditLogModel = require('./auditLog.model');
const SecurityEventModel = require('./securityEvent.model');
const LoginAttemptModel = require('./loginAttempt.model');

// 初始化模型
const models = {
  User: UserModel(sequelize),
  Book: BookModel(sequelize),
  BookCategory: BookCategoryModel(sequelize),
  Borrow: BorrowModel(sequelize),
  UserPoints: UserPointsModel(sequelize),
  PointsTransaction: PointsTransactionModel(sequelize),
  Review: ReviewModel(sequelize),
  ImportFile: ImportFileModel(sequelize),
  Notification: NotificationModel(sequelize),
  NotificationTemplate: NotificationTemplateModel(sequelize),
  SystemHealth: SystemHealthModel,
  Alert: AlertModel,
  HealthCheckTemplate: HealthCheckTemplateModel,
  BackupJob: BackupJobModel,
  BackupSchedule: BackupScheduleModel,
  RestoreOperation: RestoreOperationModel,
  BackupStorage: BackupStorageModel,
  UserBehavior: UserBehaviorModel,
  RecommendationModel: RecommendationModelModel,
  Recommendation: RecommendationModel,
  UserPreference: UserPreferenceModel,
  RecommendationFeedback: RecommendationFeedbackModel,
  AuditLog: AuditLogModel(sequelize),
  SecurityEvent: SecurityEventModel(sequelize),
  LoginAttempt: LoginAttemptModel(sequelize),
};

// 设置模型关联关系
const setupAssociations = () => {
  const { User, Book, BookCategory, Borrow, UserPoints, PointsTransaction, Review, ImportFile, Notification, NotificationTemplate, SystemHealth, Alert, HealthCheckTemplate, BackupJob, BackupSchedule, RestoreOperation, BackupStorage, UserBehavior, RecommendationModel, Recommendation, UserPreference, RecommendationFeedback, AuditLog, SecurityEvent, LoginAttempt } = models;

  // User 和 UserPoints 的一对一关系
  User.hasOne(UserPoints, {
    foreignKey: 'userId',
    as: 'points',
    onDelete: 'CASCADE',
  });
  UserPoints.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User 和 PointsTransaction 的一对多关系
  User.hasMany(PointsTransaction, {
    foreignKey: 'userId',
    as: 'pointsTransactions',
    onDelete: 'CASCADE',
  });
  PointsTransaction.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // 管理员处理的积分交易
  User.hasMany(PointsTransaction, {
    foreignKey: 'processedBy',
    as: 'processedTransactions',
    onDelete: 'SET NULL',
  });
  PointsTransaction.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processedByUser',
  });

  // User 和 Borrow 的一对多关系
  User.hasMany(Borrow, {
    foreignKey: 'userId',
    as: 'borrows',
    onDelete: 'CASCADE',
  });
  Borrow.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Book 和 Borrow 的一对多关系
  Book.hasMany(Borrow, {
    foreignKey: 'bookId',
    as: 'borrows',
    onDelete: 'CASCADE',
  });
  Borrow.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book',
  });

  // 管理员处理的借阅记录
  User.hasMany(Borrow, {
    foreignKey: 'processedBy',
    as: 'processedBorrows',
    onDelete: 'SET NULL',
  });
  Borrow.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processedByUser',
  });

  // User 和 Book 的多对多关系（通过 Borrow）
  User.belongsToMany(Book, {
    through: Borrow,
    foreignKey: 'userId',
    otherKey: 'bookId',
    as: 'borrowedBooks',
  });
  Book.belongsToMany(User, {
    through: Borrow,
    foreignKey: 'bookId',
    otherKey: 'userId',
    as: 'borrowers',
  });

  // PointsTransaction 的自引用关联（原始交易和冲正交易）
  PointsTransaction.belongsTo(PointsTransaction, {
    foreignKey: 'originalTransactionId',
    as: 'originalTransaction',
  });
  PointsTransaction.hasOne(PointsTransaction, {
    foreignKey: 'originalTransactionId',
    as: 'reversalTransaction',
  });

  PointsTransaction.belongsTo(PointsTransaction, {
    foreignKey: 'reversalTransactionId',
    as: 'reversalOfTransaction',
  });
  PointsTransaction.hasOne(PointsTransaction, {
    foreignKey: 'reversalTransactionId',
    as: 'reversedTransaction',
  });

  // Review 关联关系
  
  // User 和 Review 的一对多关系
  User.hasMany(Review, {
    foreignKey: 'userId',
    as: 'reviews',
    onDelete: 'CASCADE',
  });
  Review.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Book 和 Review 的一对多关系
  Book.hasMany(Review, {
    foreignKey: 'bookId',
    as: 'reviews',
    onDelete: 'CASCADE',
  });
  Review.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book',
  });

  // Borrow 和 Review 的一对一关系（可选）
  Borrow.hasOne(Review, {
    foreignKey: 'borrowId',
    as: 'review',
    onDelete: 'SET NULL',
  });
  Review.belongsTo(Borrow, {
    foreignKey: 'borrowId',
    as: 'borrow',
  });

  // 审核管理员关联
  User.hasMany(Review, {
    foreignKey: 'moderatorId',
    as: 'moderatedReviews',
    onDelete: 'SET NULL',
  });
  Review.belongsTo(User, {
    foreignKey: 'moderatorId',
    as: 'moderator',
  });

  // User 和 ImportFile 的一对多关系
  User.hasMany(ImportFile, {
    foreignKey: 'uploadedBy',
    as: 'importFiles',
    onDelete: 'CASCADE',
  });
  ImportFile.belongsTo(User, {
    foreignKey: 'uploadedBy',
    as: 'uploader',
  });

  // User 和 Notification 的一对多关系
  User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Borrow 和 Notification 的关联（可选，用于借阅相关通知）
  Borrow.hasMany(Notification, {
    foreignKey: 'relatedId',
    scope: { relatedType: 'borrow' },
    as: 'notifications',
    onDelete: 'CASCADE',
  });

  // Book 和 Notification 的关联（可选，用于图书相关通知）
  Book.hasMany(Notification, {
    foreignKey: 'relatedId',
    scope: { relatedType: 'book' },
    as: 'notifications',
    onDelete: 'CASCADE',
  });

  // Review 和 Notification 的关联（可选，用于评论相关通知）
  Review.hasMany(Notification, {
    foreignKey: 'relatedId',
    scope: { relatedType: 'review' },
    as: 'notifications',
    onDelete: 'CASCADE',
  });

  // Alert 关联关系
  // 确认者关联
  User.hasMany(Alert, {
    foreignKey: 'acknowledgedBy',
    as: 'acknowledgedAlerts',
    onDelete: 'SET NULL',
  });
  Alert.belongsTo(User, {
    foreignKey: 'acknowledgedBy',
    as: 'acknowledger',
  });

  // 解决者关联
  User.hasMany(Alert, {
    foreignKey: 'resolvedBy',
    as: 'resolvedAlerts',
    onDelete: 'SET NULL',
  });
  Alert.belongsTo(User, {
    foreignKey: 'resolvedBy',
    as: 'resolver',
  });

  // Alert 和 SystemHealth 的关联（移除，避免复杂关联问题）
  // Alert.hasMany(SystemHealth, {
  //   foreignKey: 'id',
  //   sourceKey: 'source.healthCheckId',
  //   as: 'relatedHealthChecks',
  //   constraints: false
  // });

  // Alert 和 HealthCheckTemplate 的关联（移除，避免复杂关联问题）
  // Alert.hasMany(HealthCheckTemplate, {
  //   foreignKey: 'id',
  //   sourceKey: 'source.templateId',
  //   as: 'relatedTemplates',
  //   constraints: false
  // });

  // Backup 相关关联关系
  
  // BackupJob 关联关系
  User.hasMany(BackupJob, {
    foreignKey: 'triggeredBy',
    as: 'triggeredBackupJobs',
    onDelete: 'SET NULL',
  });
  BackupJob.belongsTo(User, {
    foreignKey: 'triggeredBy',
    as: 'triggeredByUser',
  });

  BackupSchedule.hasMany(BackupJob, {
    foreignKey: 'scheduleId',
    as: 'backupJobs',
    onDelete: 'SET NULL',
  });
  BackupJob.belongsTo(BackupSchedule, {
    foreignKey: 'scheduleId',
    as: 'schedule',
  });

  // 父子备份关联（增量备份）
  BackupJob.belongsTo(BackupJob, {
    foreignKey: 'parentBackupId',
    as: 'parentBackup'
  });
  BackupJob.hasMany(BackupJob, {
    foreignKey: 'parentBackupId',
    as: 'childBackups'
  });

  // BackupSchedule 关联关系
  User.hasMany(BackupSchedule, {
    foreignKey: 'createdBy',
    as: 'createdBackupSchedules',
    onDelete: 'SET NULL',
  });
  BackupSchedule.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  User.hasMany(BackupSchedule, {
    foreignKey: 'updatedBy',
    as: 'updatedBackupSchedules',
    onDelete: 'SET NULL',
  });
  BackupSchedule.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updater',
  });

  // RestoreOperation 关联关系
  BackupJob.hasMany(RestoreOperation, {
    foreignKey: 'backupJobId',
    as: 'restoreOperations',
    onDelete: 'CASCADE',
  });
  RestoreOperation.belongsTo(BackupJob, {
    foreignKey: 'backupJobId',
    as: 'backupJob',
  });

  BackupJob.hasMany(RestoreOperation, {
    foreignKey: 'preRestoreBackupId',
    as: 'preRestoreOperations',
    onDelete: 'SET NULL',
  });
  RestoreOperation.belongsTo(BackupJob, {
    foreignKey: 'preRestoreBackupId',
    as: 'preRestoreBackup',
  });

  User.hasMany(RestoreOperation, {
    foreignKey: 'triggeredBy',
    as: 'triggeredRestoreOperations',
    onDelete: 'SET NULL',
  });
  RestoreOperation.belongsTo(User, {
    foreignKey: 'triggeredBy',
    as: 'triggeredByUser',
  });

  User.hasMany(RestoreOperation, {
    foreignKey: 'approvedBy',
    as: 'approvedRestoreOperations',
    onDelete: 'SET NULL',
  });
  RestoreOperation.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approvedByUser',
  });

  // BackupStorage 关联关系
  User.hasMany(BackupStorage, {
    foreignKey: 'createdBy',
    as: 'createdBackupStorages',
    onDelete: 'SET NULL',
  });
  BackupStorage.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  User.hasMany(BackupStorage, {
    foreignKey: 'updatedBy',
    as: 'updatedBackupStorages',
    onDelete: 'SET NULL',
  });
  BackupStorage.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updater',
  });

  // 推荐系统关联关系
  
  // UserBehavior 关联关系
  User.hasMany(UserBehavior, {
    foreignKey: 'userId',
    as: 'behaviors',
    onDelete: 'CASCADE',
  });
  UserBehavior.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Book.hasMany(UserBehavior, {
    foreignKey: 'bookId',
    as: 'behaviors',
    onDelete: 'CASCADE',
  });
  UserBehavior.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book',
  });

  // UserPreference 关联关系
  User.hasOne(UserPreference, {
    foreignKey: 'userId',
    as: 'userPreferences',
    onDelete: 'CASCADE',
  });
  UserPreference.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // RecommendationModel 关联关系
  User.hasMany(RecommendationModel, {
    foreignKey: 'createdBy',
    as: 'createdRecommendationModels',
    onDelete: 'SET NULL',
  });
  RecommendationModel.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  User.hasMany(RecommendationModel, {
    foreignKey: 'updatedBy',
    as: 'updatedRecommendationModels',
    onDelete: 'SET NULL',
  });
  RecommendationModel.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updater',
  });

  // Recommendation 关联关系
  User.hasMany(Recommendation, {
    foreignKey: 'userId',
    as: 'recommendations',
    onDelete: 'CASCADE',
  });
  Recommendation.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Book.hasMany(Recommendation, {
    foreignKey: 'bookId',
    as: 'recommendations',
    onDelete: 'CASCADE',
  });
  Recommendation.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book',
  });

  RecommendationModel.hasMany(Recommendation, {
    foreignKey: 'modelId',
    as: 'recommendations',
    onDelete: 'CASCADE',
  });
  Recommendation.belongsTo(RecommendationModel, {
    foreignKey: 'modelId',
    as: 'model',
  });

  // UserBehavior 和 Recommendation 的关联
  Recommendation.hasMany(UserBehavior, {
    foreignKey: 'recommendationId',
    as: 'behaviors',
    onDelete: 'SET NULL',
  });
  UserBehavior.belongsTo(Recommendation, {
    foreignKey: 'recommendationId',
    as: 'recommendation',
  });

  // RecommendationFeedback 关联关系
  User.hasMany(RecommendationFeedback, {
    foreignKey: 'userId',
    as: 'recommendationFeedbacks',
    onDelete: 'CASCADE',
  });
  RecommendationFeedback.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Book.hasMany(RecommendationFeedback, {
    foreignKey: 'bookId',
    as: 'recommendationFeedbacks',
    onDelete: 'CASCADE',
  });
  RecommendationFeedback.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book',
  });

  Recommendation.hasMany(RecommendationFeedback, {
    foreignKey: 'recommendationId',
    as: 'feedbacks',
    onDelete: 'SET NULL',
  });
  RecommendationFeedback.belongsTo(Recommendation, {
    foreignKey: 'recommendationId',
    as: 'recommendation',
  });

  // 审计和安全系统关联关系
  
  // AuditLog 关联关系
  User.hasMany(AuditLog, {
    foreignKey: 'userId',
    as: 'auditLogs',
    onDelete: 'SET NULL',
  });
  AuditLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // AuditLog 自引用关联 (父子日志)
  AuditLog.belongsTo(AuditLog, {
    foreignKey: 'parentLogId',
    as: 'parentLog',
  });
  AuditLog.hasMany(AuditLog, {
    foreignKey: 'parentLogId',
    as: 'childLogs',
  });

  // SecurityEvent 关联关系
  User.hasMany(SecurityEvent, {
    foreignKey: 'userId',
    as: 'securityEvents',
    onDelete: 'SET NULL',
  });
  SecurityEvent.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  User.hasMany(SecurityEvent, {
    foreignKey: 'assignedTo',
    as: 'assignedSecurityEvents',
    onDelete: 'SET NULL',
  });
  SecurityEvent.belongsTo(User, {
    foreignKey: 'assignedTo',
    as: 'assignee',
  });

  // SecurityEvent 自引用关联 (父子事件)
  SecurityEvent.belongsTo(SecurityEvent, {
    foreignKey: 'parentEventId',
    as: 'parentEvent',
  });
  SecurityEvent.hasMany(SecurityEvent, {
    foreignKey: 'parentEventId',
    as: 'childEvents',
  });

  // SecurityEvent 和 AuditLog 关联
  AuditLog.hasMany(SecurityEvent, {
    foreignKey: 'auditLogId',
    as: 'securityEvents',
    onDelete: 'SET NULL',
  });
  SecurityEvent.belongsTo(AuditLog, {
    foreignKey: 'auditLogId',
    as: 'auditLog',
  });

  // LoginAttempt 关联关系
  User.hasMany(LoginAttempt, {
    foreignKey: 'userId',
    as: 'loginAttempts',
    onDelete: 'SET NULL',
  });
  LoginAttempt.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // LoginAttempt 和 SecurityEvent 关联
  SecurityEvent.hasMany(LoginAttempt, {
    foreignKey: 'securityEventId',
    as: 'loginAttempts',
    onDelete: 'SET NULL',
  });
  LoginAttempt.belongsTo(SecurityEvent, {
    foreignKey: 'securityEventId',
    as: 'securityEvent',
  });

  // Book 和 BookCategory 的多对一关系
  BookCategory.hasMany(Book, {
    foreignKey: 'categoryId',
    as: 'books',
    onDelete: 'SET NULL',
  });
  Book.belongsTo(BookCategory, {
    foreignKey: 'categoryId',
    as: 'bookCategory',
  });

  // 调用模型的 associate 方法（如果存在）
  if (BookCategory.associate) {
    BookCategory.associate(models);
  }
};

// 执行关联设置
setupAssociations();

// 数据库同步函数
const syncDatabase = async (options = {}) => {
  try {
    console.log('🔄 开始同步数据库...');
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 禁用外键检查以避免约束问题
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { type: sequelize.QueryTypes.RAW });
    
    // 先用force模式清理数据库，避免无效日期问题
    if (options.force) {
      console.log('🗑️  强制清理数据库...');
      await sequelize.sync({ force: true });
    } else {
      // 同步模型
      await sequelize.sync(options);
    }
    
    // 重新启用外键检查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { type: sequelize.QueryTypes.RAW });
    console.log('✅ 数据库模型同步完成');

    return true;
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

// 创建初始管理员用户
const createInitialAdmin = async () => {
  try {
    const { User, UserPoints } = models;
    
    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({
      where: { role: 'admin' },
    });

    if (existingAdmin) {
      console.log('✅ 管理员账户已存在');
      return existingAdmin;
    }

    // 创建默认管理员
    const admin = await User.create({
      username: 'admin',
      email: 'admin@library.com',
      passwordHash: 'admin123', // 这会被 beforeSave hook 自动哈希
      realName: '系统管理员',
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });

    // 为管理员创建积分记录
    await UserPoints.findOrCreateForUser(admin.id);

    console.log('✅ 默认管理员账户创建成功');
    console.log('📧 用户名: admin');
    console.log('🔑 密码: admin123');
    console.log('⚠️  请及时修改默认密码！');

    return admin;
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error);
    throw error;
  }
};

// 修复数据类型不匹配问题 - 完全重建数据库
const fixDataTypeMismatches = async () => {
  try {
    console.log('🗑️  完全重建数据库以解决所有约束问题...');
    
    // 创建一个临时连接，不指定数据库名称
    const { Sequelize } = require('sequelize');
    const tempSequelize = new Sequelize('mysql', process.env.DB_USER || 'root', process.env.DB_PASSWORD || 'root', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      dialect: 'mysql',
      logging: false,
    });
    
    // 测试临时连接
    await tempSequelize.authenticate();
    
    // 先禁用外键检查
    await tempSequelize.query('SET FOREIGN_KEY_CHECKS = 0', { type: Sequelize.QueryTypes.RAW });
    
    // 直接删除并重新创建整个数据库
    await tempSequelize.query('DROP DATABASE IF EXISTS library_management', { type: Sequelize.QueryTypes.RAW });
    await tempSequelize.query('CREATE DATABASE library_management', { type: Sequelize.QueryTypes.RAW });
    
    // 重新启用外键检查
    await tempSequelize.query('SET FOREIGN_KEY_CHECKS = 1', { type: Sequelize.QueryTypes.RAW });
    
    // 关闭临时连接
    await tempSequelize.close();
    
    console.log('✅ 数据库完全重建完成');
  } catch (error) {
    console.log('⚠️  数据库重建跳过:', error.message);
  }
};

// 初始化数据库
const initializeDatabase = async (force = false) => {
  try {
    console.log('🚀 开始初始化数据库...');

    // 完全重建数据库以解决约束问题
    await fixDataTypeMismatches();

    // 同步数据库结构 - 强制重建
    await syncDatabase({ force: true });

    // 创建初始管理员
    if (process.env.NODE_ENV !== 'test') {
      await createInitialAdmin();
    }

    console.log('🎉 数据库初始化完成！');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};

// 关闭数据库连接
const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    throw error;
  }
};

// 数据库健康检查
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    return {
      status: 'healthy',
      message: 'Database connection is working',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// 获取数据库统计信息
const getDatabaseStats = async () => {
  try {
    const stats = await Promise.all([
      models.User.getStatistics(),
      models.Book.getStatistics(),
      models.Borrow.getStatistics(),
      models.UserPoints.getStatistics(),
      models.Review.getStatistics(),
    ]);

    return {
      users: stats[0],
      books: stats[1],
      borrows: stats[2],
      points: stats[3],
      reviews: stats[4],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  models,
  syncDatabase,
  initializeDatabase,
  closeDatabase,
  healthCheck,
  getDatabaseStats,
  createInitialAdmin,
};