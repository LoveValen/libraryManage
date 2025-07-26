const healthController = require('./src/controllers/health.controller');

// Mock request and response objects
const req = {
  query: {},
  user: { id: 1, username: 'admin', role: 'admin' }
};

const res = {
  apiSuccess: (data) => {
    console.log('✅ Controller succeeded with data:', JSON.stringify(data, null, 2));
  },
  apiError: (message, statusCode, errors, code) => {
    console.log('❌ Controller failed with apiError:');
    console.log('   Message type:', typeof message);
    console.log('   Message constructor:', message?.constructor?.name);
    console.log('   Message content:', message);
    console.log('   Message JSON:', JSON.stringify(message));
    console.log('   StatusCode:', statusCode);
    console.log('   Errors:', errors);
    console.log('   Code:', code);
  }
};

async function testHealthOverviewController() {
  console.log('🧪 Testing health overview controller directly...\n');
  
  try {
    await healthController.getHealthOverview(req, res);
  } catch (error) {
    console.log('💥 Controller threw exception:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error?.constructor?.name);
    console.log('   Error message:', error?.message);
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
  }
}

testHealthOverviewController();