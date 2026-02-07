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

/**
 * 注意：不要在此文件里注册 `process` 信号处理器。
 * - 应用层（如 graceful-shutdown）会统一管理退出流程。
 * - 否则会导致提前 `process.exit()`，跳过 HTTP 连接/后台任务的清理。
 */

module.exports = createPrismaClient();
