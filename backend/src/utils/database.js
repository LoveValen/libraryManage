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

    const passwordHash = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.users.create({
      data: {
        username: 'admin',
        email: 'admin@library.com',
        password_hash: passwordHash,
        real_name: '系统管理员',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    console.log('✅ 默认管理员账户已创建 (admin/admin123)');
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
      prisma.users.count({ where: { is_deleted: false } }),
      prisma.users.count({ where: { status: 'active', is_deleted: false } }),
      prisma.users.count({ where: { role: 'admin', is_deleted: false } }),
      prisma.books.count({ where: { is_deleted: false } }),
      prisma.books.count({ where: { status: 'available', is_deleted: false } }),
      prisma.borrows.count({ where: { is_deleted: false } }),
      prisma.borrows.count({ where: { status: 'borrowed', is_deleted: false } }),
      prisma.reviews.count(),
      prisma.userPoints.aggregate({ _sum: { balance: true } })
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