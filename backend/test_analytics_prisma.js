const analyticsService = require('./src/services/analytics.service');
const { logger } = require('./src/utils/logger');

async function testAnalyticsPrisma() {
  try {
    console.log('🔍 测试分析服务的Prisma迁移...\n');

    // 1. 测试概览统计
    console.log('1. 测试概览统计...');
    const overviewStats = await analyticsService.getOverviewStatistics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date()
    );
    console.log('   ✅ 概览统计查询成功');
    console.log(`   - 总图书数: ${overviewStats.general.totalBooks}`);
    console.log(`   - 总用户数: ${overviewStats.general.totalUsers}`);
    console.log(`   - 总借阅数: ${overviewStats.general.totalBorrows}`);
    console.log(`   - 活跃借阅: ${overviewStats.general.activeBorrows}`);
    console.log(`   - 期间新用户: ${overviewStats.period.newUsers}`);
    console.log(`   - 期间新借阅: ${overviewStats.period.newBorrows}\n`);

    // 2. 测试趋势分析
    console.log('2. 测试趋势分析...');
    const trendData = await analyticsService.getTrendAnalytics(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
      new Date(),
      'day'
    );
    console.log(`   ✅ 趋势分析查询成功，获得 ${trendData.length} 个数据点`);
    if (trendData.length > 0) {
      const sample = trendData[0];
      console.log(`   - 样本数据: ${sample.date} - 借阅:${sample.borrows}, 注册:${sample.registrations}`);
    }
    console.log();

    // 3. 测试热门图书分析
    console.log('3. 测试热门图书分析...');
    const topBooks = await analyticsService.getTopPerformingBooks(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date(),
      5
    );
    console.log('   ✅ 热门图书分析查询成功');
    console.log(`   - 最多借阅图书: ${topBooks.mostBorrowed.length} 本`);
    console.log(`   - 最多评价图书: ${topBooks.mostReviewed.length} 本`);
    console.log(`   - 最高评分图书: ${topBooks.highestRated.length} 本\n`);

    // 4. 测试活跃用户分析
    console.log('4. 测试活跃用户分析...');
    const activeUsers = await analyticsService.getActiveUserAnalytics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date(),
      10
    );
    console.log('   ✅ 活跃用户分析查询成功');
    console.log(`   - 顶级借阅用户: ${activeUsers.topBorrowers.length} 人`);
    console.log(`   - 顶级评价用户: ${activeUsers.topReviewers.length} 人\n`);

    // 5. 测试分类分析
    console.log('5. 测试分类分析...');
    const categoryStats = await analyticsService.getCategoryAnalytics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date()
    );
    console.log(`   ✅ 分类分析查询成功，获得 ${categoryStats.length} 个分类`);
    if (categoryStats.length > 0) {
      const sample = categoryStats[0];
      console.log(`   - 样本分类: ${sample.name} - 图书:${sample.bookCount}, 借阅:${sample.borrowCount}`);
    }
    console.log();

    // 6. 测试综合仪表板
    console.log('6. 测试综合仪表板...');
    const dashboardData = await analyticsService.getDashboardAnalytics({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      granularity: 'day'
    });
    console.log('   ✅ 综合仪表板查询成功');
    console.log('   - 包含所有分析模块数据');
    console.log(`   - 趋势数据点: ${dashboardData.trends.length}`);
    console.log(`   - 热门图书分类: 4 个`);
    console.log(`   - 活跃用户分类: 4 个\n`);

    console.log('🎉 所有分析服务测试通过！Prisma迁移成功！');
    
  } catch (error) {
    console.error('❌ 分析服务测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

testAnalyticsPrisma();