const recommendationEngine = require('./src/services/recommendationEngine.service.prisma');

async function simpleTest() {
  console.log('🧪 简单推荐引擎测试...');
  
  try {
    // 测试初始化
    await recommendationEngine.initialize();
    console.log('✅ 推荐引擎初始化成功');
    
    // 测试生成推荐
    const recs = await recommendationEngine.generateRecommendations(1, { limit: 5 });
    console.log(`✅ 生成推荐成功: ${recs.recommendations.length} 个`);
    console.log(`🔮 使用算法: ${recs.algorithm}`);
    
    console.log('🎉 测试完成！推荐引擎工作正常');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

simpleTest();