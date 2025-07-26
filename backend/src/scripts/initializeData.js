/**
 * 初始化数据脚本
 * 用于初始化系统的基础数据，包括分类和示例图书
 */

require('dotenv').config();
const { initializeDatabase } = require('../utils/database');
const bookImportService = require('../services/bookImport.service');
const prisma = require('../utils/prisma');

async function initializeData() {
  try {
    console.log('🚀 开始初始化数据...');
    
    // 初始化数据库
    await initializeDatabase();
    
    console.log('📚 初始化图书分类...');
    await BookCategory.initializeDefaultCategories();
    
    // 获取管理员用户
    const adminUser = await models.User.findOne({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.error('❌ 未找到管理员用户，请先确保系统已初始化');
      process.exit(1);
    }
    
    console.log('📖 导入示例图书数据...');
    const importResult = await bookImportService.importSampleBooks(adminUser);
    
    console.log(`✅ 成功导入 ${importResult.success} 本图书`);
    if (importResult.failed > 0) {
      console.log(`⚠️  ${importResult.failed} 本图书导入失败`);
      importResult.errors.forEach(error => {
        console.log(`  - ${error.title}: ${error.error}`);
      });
    }
    
    // 显示分类统计
    const categories = await BookCategory.findAll({
      include: [{
        model: models.Book,
        as: 'books',
        attributes: ['id'],
      }],
    });
    
    console.log('\n📊 分类统计:');
    for (const category of categories) {
      if (category.parentId === null) {
        console.log(`  ${category.name}: ${category.books.length} 本图书`);
      }
    }
    
    console.log('\n🎉 数据初始化完成!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initializeData();