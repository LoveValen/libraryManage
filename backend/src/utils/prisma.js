const { PrismaClient } = require('@prisma/client');

/**
 * Prisma数据库客户端 - 遵循优秀源码的单例模式
 */

// 全局单例实例
let prisma;

/**
 * 创建和配置Prisma客户端
 */
function createPrismaClient() {
  if (prisma) return prisma;

  const isDev = process.env.NODE_ENV === 'development';
  
  prisma = new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
  });

  // 开发环境连接测试
  if (isDev) {
    prisma.$connect()
      .then(() => console.log('🗄️  Database connected'))
      .catch(err => console.error('❌ Database connection failed:', err.message));
  }

  return prisma;
}

/**
 * 优雅关闭数据库连接
 */
async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// 进程退出时自动清理
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    await disconnectPrisma();
    process.exit(0);
  });
});

module.exports = createPrismaClient();