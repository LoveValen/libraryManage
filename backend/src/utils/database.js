const prisma = require('./prisma');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_STATUS } = require('./constants');

/**
 * Database utility functions using Prisma
 */

/**
 * Health check for database connection
 */
async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      message: 'Database connection is working',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create initial admin user
 */
async function createInitialAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.users.findFirst({
      where: { role: USER_ROLES.ADMIN }
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists');
      return existingAdmin;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('admin123', salt);

    // Create admin user with transaction
    const admin = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          username: 'admin',
          email: 'admin@library.com',
          password_hash: passwordHash,
          real_name: '系统管理员',
          role: USER_ROLES.ADMIN,
          status: USER_STATUS.ACTIVE,
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
          preferences: {
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            notifications: {
              email: true,
              sms: false,
              push: true,
              dueDateReminder: true,
              overdueNotice: true,
              pointsUpdate: true
            },
            privacy: {
              profileVisible: true,
              readingHistoryVisible: false,
              pointsVisible: true
            }
          }
        }
      });

      // Create user points record
      await tx.user_points.create({
        data: {
          user_id: user.id,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          level: 'NEWCOMER',
          level_name: '新手读者',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      return user;
    });

    console.log('✅ Default admin account created successfully');
    console.log('📧 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the default password!');

    return admin;
  } catch (error) {
    console.error('❌ Failed to create admin account:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalBooks,
      availableBooks,
      totalBorrows,
      activeBorrows,
      totalReviews,
      totalPoints
    ] = await Promise.all([
      prisma.users.count({ where: { is_deleted: false } }),
      prisma.users.count({ 
        where: { 
          status: USER_STATUS.ACTIVE, 
          is_deleted: false 
        } 
      }),
      prisma.users.count({ 
        where: { 
          role: USER_ROLES.ADMIN, 
          is_deleted: false 
        } 
      }),
      prisma.books.count({ where: { is_deleted: false } }),
      prisma.books.count({ 
        where: { 
          status: 'available', 
          is_deleted: false 
        } 
      }),
      prisma.borrows.count({ where: { is_deleted: false } }),
      prisma.borrows.count({ 
        where: { 
          status: 'borrowed', 
          is_deleted: false 
        } 
      }),
      prisma.reviews.count(),
      prisma.userPoints.aggregate({
        _sum: { balance: true }
      })
    ]);

    const newUsersThisMonth = await prisma.users.count({
      where: {
        created_at: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        },
        is_deleted: false
      }
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        newThisMonth: newUsersThisMonth,
        inactiveRate: totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers * 100).toFixed(2) : 0
      },
      books: {
        total: totalBooks,
        available: availableBooks,
        borrowed: totalBooks - availableBooks
      },
      borrows: {
        total: totalBorrows,
        active: activeBorrows,
        returned: totalBorrows - activeBorrows
      },
      reviews: {
        total: totalReviews
      },
      points: {
        totalInCirculation: totalPoints._sum.balance || 0
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get database statistics:', error);
    throw error;
  }
}

/**
 * Initialize database (create initial data)
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // Create initial admin
    if (process.env.NODE_ENV !== 'test') {
      await createInitialAdmin();
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