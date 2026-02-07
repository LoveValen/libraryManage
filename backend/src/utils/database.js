const prisma = require('./prisma');
const bcrypt = require('bcryptjs');
const { formatDateTime } = require('./date');
const { seedRBAC } = require('../seeds/rbac.seed');

/**
 * 数据库工具 - 遵循优秀源码的简洁设计
 */

/**
 * 数据库健康检查
 */
async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: formatDateTime(new Date()) };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: formatDateTime(new Date()) };
  }
}

/**
 * 创建初始管理员用户
 */
async function createInitialAdmin() {
  try {
    const existingAdmin = await prisma.users.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    // 默认密码仅用于开发/首次启动演示；生产环境应通过环境变量或运维流程注入。
    const defaultPassword = process.env.INIT_ADMIN_PASSWORD || 'admin123';
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
    
    const now = new Date();
    const admin = await prisma.users.create({
      data: {
        username: 'admin',
        email: 'admin@library.com',
        passwordHash: passwordHash,
        realName: '系统管理员',
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ 默认管理员账户已创建 (admin/${defaultPassword})`);
    } else {
      console.log('✅ 初始管理员账户已创建');
    }
    return admin;
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error.message);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 */
async function getDatabaseStats() {
  try {
    const stats = await Promise.all([
      prisma.users.count({ where: { isDeleted: false } }),
      prisma.users.count({ where: { status: 'active', isDeleted: false } }),
      prisma.users.count({ where: { role: 'admin', isDeleted: false } }),
      prisma.books.count({ where: { isDeleted: false } }),
      prisma.books.count({ where: { status: 'available', isDeleted: false } }),
      prisma.borrows.count({ where: { isDeleted: false } }),
      prisma.borrows.count({ where: { status: 'borrowed', isDeleted: false } }),
      prisma.reviews.count(),
      prisma.user_points.aggregate({ _sum: { balance: true } })
    ]);

    const [totalUsers, activeUsers, adminUsers, totalBooks, availableBooks, 
           totalBorrows, activeBorrows, totalReviews, totalPoints] = stats;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers
      },
      books: {
        total: totalBooks,
        available: availableBooks,
        borrowed: totalBooks - availableBooks
      },
      borrows: {
        total: totalBorrows,
        active: activeBorrows
      },
      reviews: totalReviews,
      points: totalPoints._sum.balance || 0,
      timestamp: formatDateTime(new Date())
    };
  } catch (error) {
    console.error('❌ 获取数据库统计失败:', error.message);
    throw error;
  }
}

/**
 * Initialize database (create initial data)
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // 确保数据库可连接（避免 seed 阶段报错不直观）
    // prisma 单例在多数查询前会自动连接，但这里显式连接能更快暴露连接问题。
    try {
      await prisma.$connect();
    } catch (_) {
      // ignore
    }

    // Create initial admin 并同步 RBAC 基础数据
    if (process.env.NODE_ENV !== 'test') {
      await createInitialAdmin();
      console.log('🌱 同步 RBAC 基础数据...');
      await seedRBAC();
      console.log('✅ RBAC 基础数据同步完成');
    }

    console.log('🎉 Database initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Failed to close database connection:', error);
    throw error;
  }
}

/**
 * Execute raw query
 */
async function executeRawQuery(query, params = []) {
  return prisma.$queryRawUnsafe(query, ...params);
}

/**
 * Transaction helper
 */
async function withTransaction(callback) {
  return prisma.$transaction(callback);
}

module.exports = {
  prisma,
  healthCheck,
  createInitialAdmin,
  getDatabaseStats,
  initializeDatabase,
  closeDatabase,
  executeRawQuery,
  withTransaction
};
