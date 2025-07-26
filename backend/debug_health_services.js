const healthMonitoringService = require('./src/services/healthMonitoring.service');

async function debugHealthServices() {
  console.log('🔍 Debugging health services...\n');
  
  try {
    console.log('📊 Testing getOverallHealthStatus...');
    const overallHealth = await healthMonitoringService.getOverallHealthStatus();
    console.log('✅ getOverallHealthStatus succeeded:', JSON.stringify(overallHealth, null, 2));
  } catch (error) {
    console.log('❌ getOverallHealthStatus failed:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error.constructor.name);
    console.log('   Error message:', error?.message);
    console.log('   Error toString:', error?.toString());
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
    console.log('');
  }
  
  try {
    console.log('📈 Testing getSystemMetrics...');
    const metrics = healthMonitoringService.getSystemMetrics();
    console.log('✅ getSystemMetrics succeeded:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.log('❌ getSystemMetrics failed:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error.constructor.name);
    console.log('   Error message:', error?.message);
    console.log('   Error toString:', error?.toString());
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
    console.log('');
  }
  
  try {
    console.log('🚨 Testing getAlertStatistics...');
    const alertStats = await healthMonitoringService.getAlertStatistics(24);
    console.log('✅ getAlertStatistics succeeded:', JSON.stringify(alertStats, null, 2));
  } catch (error) {
    console.log('❌ getAlertStatistics failed:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error.constructor.name);
    console.log('   Error message:', error?.message);
    console.log('   Error toString:', error?.toString());
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
    console.log('');
  }
  
  process.exit(0);
}

debugHealthServices().catch(console.error);