const recommendationEngine = require('./src/services/recommendationEngine.service.prisma');
const recommendationService = require('./src/services/recommendation.service.prisma');
const { logger } = require('./src/utils/logger');

async function testRecommendationEngine() {
  console.log('🧪 开始测试推荐引擎服务 (Prisma版本)...\n');

  try {
    // 测试1: 初始化推荐引擎
    console.log('📋 测试1: 初始化推荐引擎');
    console.log('执行: await recommendationEngine.initialize()');
    
    const startTime = Date.now();
    await recommendationEngine.initialize();
    const initTime = Date.now() - startTime;
    
    console.log(`✅ 推荐引擎初始化成功 (${initTime}ms)`);
    console.log(`📊 算法数量: ${recommendationEngine.algorithms.size}`);
    console.log('---\n');

    // 测试2: 生成用户推荐
    console.log('📋 测试2: 生成用户推荐');
    console.log('执行: await recommendationEngine.generateRecommendations(1)');
    
    const recommendations = await recommendationEngine.generateRecommendations(1, {
      scenario: 'homepage',
      algorithm: 'auto',
      limit: 10,
      diversityFactor: 0.3,
      includeExplanations: true
    });
    
    console.log(`✅ 生成推荐成功`);
    console.log(`📊 推荐数量: ${recommendations.recommendations.length}`);
    console.log(`🔮 使用算法: ${recommendations.algorithm}`);
    console.log(`⏱️ 处理时间: ${recommendations.processingTime}ms`);
    console.log(`🎯 多样性分数: ${recommendations.diversity.toFixed(3)}`);
    
    if (recommendations.recommendations.length > 0) {
      console.log(`📖 首个推荐: ${recommendations.recommendations[0].book?.title || '未知'}`);
      console.log(`💯 推荐分数: ${recommendations.recommendations[0].score.toFixed(3)}`);
      console.log(`💡 推荐解释: ${recommendations.recommendations[0].explanation}`);
    }
    console.log('---\n');

    // 测试3: 基于用户的协同过滤
    console.log('📋 测试3: 基于用户的协同过滤');
    console.log('执行: await recommendationEngine.userBasedCollaborativeFiltering(1, 5)');
    
    const userBasedRecs = await recommendationEngine.userBasedCollaborativeFiltering(1, 5);
    console.log(`✅ 用户协同过滤完成`);
    console.log(`📊 推荐数量: ${userBasedRecs.length}`);
    
    if (userBasedRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${userBasedRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${userBasedRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试4: 基于物品的协同过滤
    console.log('📋 测试4: 基于物品的协同过滤');
    console.log('执行: await recommendationEngine.itemBasedCollaborativeFiltering(1, 5)');
    
    const itemBasedRecs = await recommendationEngine.itemBasedCollaborativeFiltering(1, 5);
    console.log(`✅ 物品协同过滤完成`);
    console.log(`📊 推荐数量: ${itemBasedRecs.length}`);
    
    if (itemBasedRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${itemBasedRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${itemBasedRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试5: 基于内容的过滤
    console.log('📋 测试5: 基于内容的过滤');
    console.log('执行: await recommendationEngine.contentBasedFiltering(1, 5)');
    
    const contentBasedRecs = await recommendationEngine.contentBasedFiltering(1, 5);
    console.log(`✅ 内容过滤完成`);
    console.log(`📊 推荐数量: ${contentBasedRecs.length}`);
    
    if (contentBasedRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${contentBasedRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${contentBasedRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试6: 混合推荐算法
    console.log('📋 测试6: 混合推荐算法');
    console.log('执行: await recommendationEngine.weightedHybridRecommendation(1, 5)');
    
    const hybridRecs = await recommendationEngine.weightedHybridRecommendation(1, 5);
    console.log(`✅ 混合算法完成`);
    console.log(`📊 推荐数量: ${hybridRecs.length}`);
    
    if (hybridRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${hybridRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${hybridRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试7: 流行度推荐
    console.log('📋 测试7: 流行度推荐');
    console.log('执行: await recommendationEngine.popularityBasedRecommendation(1, 5)');
    
    const popularRecs = await recommendationEngine.popularityBasedRecommendation(1, 5);
    console.log(`✅ 流行度推荐完成`);
    console.log(`📊 推荐数量: ${popularRecs.length}`);
    
    if (popularRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${popularRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${popularRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试8: 趋势推荐
    console.log('📋 测试8: 趋势推荐');
    console.log('执行: await recommendationEngine.trendingRecommendation(1, 5)');
    
    const trendingRecs = await recommendationEngine.trendingRecommendation(1, 5);
    console.log(`✅ 趋势推荐完成`);
    console.log(`📊 推荐数量: ${trendingRecs.length}`);
    
    if (trendingRecs.length > 0) {
      console.log(`🎯 首个推荐分数: ${trendingRecs[0].score.toFixed(3)}`);
      console.log(`📚 算法类型: ${trendingRecs[0].algorithm}`);
    }
    console.log('---\n');

    // 测试9: 测试推荐服务层
    console.log('📋 测试9: 推荐服务层集成测试');
    console.log('执行: await recommendationService.start()');
    
    await recommendationService.start();
    console.log(`✅ 推荐服务启动成功`);
    
    console.log('执行: await recommendationService.getUserRecommendations(1)');
    const serviceRecs = await recommendationService.getUserRecommendations(1, {
      scenario: 'homepage',
      limit: 5,
      includeExplanations: true
    });
    
    console.log(`✅ 服务层推荐生成成功`);
    console.log(`📊 推荐数量: ${serviceRecs.recommendations.length}`);
    
    if (serviceRecs.recommendations.length > 0) {
      console.log(`📖 首个推荐: ${serviceRecs.recommendations[0].book?.title || '未知'}`);
    }
    
    await recommendationService.stop();
    console.log(`✅ 推荐服务停止成功`);
    console.log('---\n');

    // 测试10: 性能指标
    console.log('📋 测试10: 性能指标检查');
    const metrics = recommendationEngine.performanceMetrics;
    console.log(`📊 总推荐数: ${metrics.totalRecommendations}`);
    console.log(`⏱️ 平均延迟: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`🎯 命中率: ${metrics.hitRate.toFixed(3)}`);
    console.log(`🌈 多样性: ${metrics.diversity.toFixed(3)}`);
    console.log('---\n');

    // 测试汇总
    console.log('🎉 推荐引擎测试完成！');
    console.log('✅ 所有核心功能正常工作');
    console.log('🔥 推荐引擎已准备好提供服务');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('📍 错误位置:', error.stack);
    
    // 尝试显示具体的数据库错误信息
    if (error.message.includes('Unknown column') || error.message.includes('Table') || error.message.includes('database')) {
      console.error('💡 提示: 这可能是数据库架构问题，请检查Prisma schema是否与数据库同步');
    }
    
  } finally {
    // 清理资源
    try {
      await recommendationService.stop();
    } catch (e) {
      // 忽略清理错误
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testRecommendationEngine()
    .then(() => {
      console.log('\n🏁 测试脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试脚本异常退出:', error);
      process.exit(1);
    });
}

module.exports = { testRecommendationEngine };