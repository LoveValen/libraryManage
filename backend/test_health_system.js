const HealthCheckTemplateService = require('./src/services/healthCheckTemplate.service');
const SystemHealthService = require('./src/services/systemHealth.service');
const AlertService = require('./src/services/alert.service');
const { logger } = require('./src/utils/logger');

async function testHealthSystem() {
  try {
    console.log('🔍 测试健康监控系统的Prisma迁移...\n');

    // 1. 测试健康检查模板服务
    console.log('1. 测试健康检查模板服务...');
    
    // 创建默认模板
    const createdTemplates = await HealthCheckTemplateService.createDefaultTemplates();
    console.log(`   ✅ 创建了 ${createdTemplates.length} 个默认健康检查模板`);
    
    // 获取模板列表
    const templates = await HealthCheckTemplateService.findAll();
    console.log(`   ✅ 获取模板列表: ${templates.length} 个模板`);
    
    // 获取需要执行的模板
    const templatesToExecute = await HealthCheckTemplateService.getTemplatesForExecution();
    console.log(`   ✅ 需要执行的模板: ${templatesToExecute.length} 个\n`);

    // 2. 测试系统健康服务
    console.log('2. 测试系统健康服务...');
    
    // 创建健康检查记录
    await SystemHealthService.create({
      checkType: 'database',
      checkName: '数据库连接测试',
      status: 'healthy',
      responseTime: 25,
      details: { connectionStatus: 'connected', testQuery: true },
      metrics: { responseTime: 25, connectionPool: { max: 29, used: 1 } }
    });
    console.log('   ✅ 创建健康检查记录成功');
    
    // 获取最新健康状态
    const latestChecks = await SystemHealthService.getLatestHealthStatus();
    console.log(`   ✅ 获取最新健康状态: ${latestChecks.length} 条记录`);
    
    // 获取整体健康状态
    const overallHealth = await SystemHealthService.getOverallHealth();
    console.log(`   ✅ 整体健康状态: ${overallHealth.overallStatus} (${overallHealth.totalChecks} 项检查)\n`);

    // 3. 测试告警服务
    console.log('3. 测试告警服务...');
    
    // 创建告警
    const { alert, created } = await AlertService.findOrCreateAlert({
      alertType: 'health_check_failed',
      severity: 'medium',
      title: '测试告警',
      description: '这是一个测试告警',
      source: { templateId: 1, checkType: 'database' }
    });
    console.log(`   ✅ 创建告警: ${alert.title} (新建: ${created})`);
    
    // 获取活跃告警
    const activeAlerts = await AlertService.getActiveAlerts();
    console.log(`   ✅ 活跃告警数量: ${activeAlerts.length}`);
    
    // 获取告警统计
    const alertStats = await AlertService.getAlertStatistics(24);
    console.log(`   ✅ 告警统计: 总计 ${alertStats.totalAlerts}, 活跃 ${alertStats.activeAlerts}\n`);

    // 4. 测试健康趋势和性能统计
    console.log('4. 测试健康趋势和性能统计...');
    
    // 批量创建健康记录用于测试
    const healthRecords = [];
    for (let i = 0; i < 5; i++) {
      healthRecords.push({
        checkType: 'database',
        checkName: '数据库连接测试',
        status: i % 2 === 0 ? 'healthy' : 'warning',
        responseTime: 20 + Math.random() * 30,
        checkedAt: new Date(Date.now() - i * 60 * 1000) // 每分钟一条记录
      });
    }
    
    await SystemHealthService.createMany(healthRecords);
    console.log(`   ✅ 创建了 ${healthRecords.length} 条测试健康记录`);
    
    // 获取健康趋势
    const trend = await SystemHealthService.getHealthTrend('database', '数据库连接测试', 1);
    console.log(`   ✅ 健康趋势数据: ${trend.length} 个数据点`);
    
    // 获取性能统计
    const perfStats = await SystemHealthService.getPerformanceStats('database', '数据库连接测试', 1);
    console.log(`   ✅ 性能统计: 平均响应时间 ${perfStats.averageResponseTime}ms, 可用性 ${perfStats.uptime}%\n`);

    // 5. 测试告警操作
    console.log('5. 测试告警操作...');
    
    if (alert && alert.id) {
      // 确认告警
      await AlertService.acknowledgeAlert(alert.id, 1, '测试确认');
      console.log('   ✅ 告警确认成功');
      
      // 解决告警
      await AlertService.resolveAlert(alert.id, 1, '测试解决');
      console.log('   ✅ 告警解决成功');
    }

    // 6. 测试模板更新
    console.log('6. 测试模板更新...');
    
    if (templates.length > 0) {
      const template = templates[0];
      await HealthCheckTemplateService.updateTemplate(template.id, {
        description: '已更新的描述 - ' + new Date().toISOString()
      });
      console.log(`   ✅ 模板更新成功: ${template.name}`);
    }

    console.log('\n🎉 所有健康监控系统测试通过！Prisma迁移成功！');
    
  } catch (error) {
    console.error('❌ 健康监控系统测试失败:', error);
  }
}

testHealthSystem();