const AlertService = require('./src/services/alert.service');

async function debugAlertService() {
  console.log('🔍 Testing AlertService.getActiveAlerts() directly...\n');
  
  try {
    console.log('📊 Calling AlertService.getActiveAlerts()...');
    const activeAlerts = await AlertService.getActiveAlerts();
    console.log('✅ AlertService.getActiveAlerts() succeeded:', JSON.stringify(activeAlerts, null, 2));
  } catch (error) {
    console.log('❌ AlertService.getActiveAlerts() failed:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error?.constructor?.name);
    console.log('   Error message:', error?.message);
    console.log('   Error toString:', error?.toString());
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
    console.log('   Error JSON:', JSON.stringify(error));
  }
  
  process.exit(0);
}

debugAlertService();