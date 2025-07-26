const express = require('express');
const { attachResponseMethods } = require('./src/utils/apiResponse');
const healthController = require('./src/controllers/health.controller');

// Create minimal Express app to simulate the exact request path
const app = express();

// Add the response methods middleware (crucial for res.apiSuccess/apiError)
app.use(attachResponseMethods);

// Add error handling middleware (simulating the error middleware chain)
app.use((err, req, res, next) => {
  console.log('🔥 Error middleware caught error:');
  console.log('   Error type:', typeof err);
  console.log('   Error constructor:', err?.constructor?.name);
  console.log('   Error message:', err?.message);
  console.log('   Error toString:', err?.toString());
  console.log('   Full error:', err);
  console.log('   Error keys:', Object.keys(err));
  console.log('   Error JSON:', JSON.stringify(err));
  
  // Simulate the error response format
  res.status(500).json({
    success: false,
    status: 'error',
    statusCode: 500,
    message: err, // This might be where the empty object comes from!
    code: 'INTERNAL_SERVER_ERROR',
    errors: null,
    timestamp: new Date().toISOString()
  });
});

// Add the problematic route
app.get('/test-overview', healthController.getHealthOverview);

const server = app.listen(3001, () => {
  console.log('🧪 Minimal test server running on port 3001');
  
  // Make test request
  const axios = require('axios');
  
  setTimeout(async () => {
    try {
      console.log('\n📡 Making test request...');
      const response = await axios.get('http://localhost:3001/test-overview', {
        validateStatus: () => true
      });
      
      console.log('\n📊 Test Results:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data?.message && typeof response.data.message === 'object') {
        console.log('\n🎯 FOUND THE ISSUE - Empty object in message field!');
      }
      
    } catch (error) {
      console.log('❌ Test request failed:', error.message);
    } finally {
      server.close();
      process.exit(0);
    }
  }, 1000);
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  console.log('💥 Uncaught exception:');
  console.log('   Error type:', typeof error);
  console.log('   Error constructor:', error?.constructor?.name);
  console.log('   Error:', error);
});