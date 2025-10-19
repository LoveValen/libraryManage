#!/usr/bin/env node
/**
 * RBAC 初始化脚本
 * 负责补充权限、角色、权限资源（路由/按钮）等基础数据
 * - 幂等执行，多次运行不会重复插入
 * - 自动为管理员账号绑定 Admin 角色
 */

const prisma = require('../src/utils/prisma');
const { seedRBAC } = require('../src/seeds/rbac.seed');

async function main() {
  try {
    console.log('🚀 开始 RBAC 数据初始化任务');
    await seedRBAC({ verbose: true });
    console.log('✅ RBAC seed completed');
  } catch (e) {
    console.error('❌ RBAC seed failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
