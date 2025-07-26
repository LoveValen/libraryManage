const express = require('express');
const { attachResponseMethods } = require('./src/utils/apiResponse');
const { setupErrorHandlers } = require('./src/middlewares/error.middleware');
const { sanitizeInput } = require('./src/middlewares/validation.middleware');
const { createHttpLogger } = require('./src/utils/logger');
const reviewsController = require('./src/controllers/reviews.controller');
const { authenticateToken } = require('./src/middlewares/auth.middleware');

async function testHttpLogger() {
  console.log('🔍 Testing HTTP Logger Impact on res.status functionality\n');
  
  const tests = [
    {
      name: 'Without HTTP Logger',
      includeLogger: false
    },
    {
      name: 'With HTTP Logger',
      includeLogger: true
    }
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const port = 3010 + i;
    
    console.log(`🧪 ${test.name}:`);
    
    const result = await new Promise((resolve) => {
      const app = express();
      
      // Standard middleware
      app.use(express.json());
      app.use(sanitizeInput);
      
      // Conditionally add HTTP logger
      if (test.includeLogger) {
        try {
          app.use(createHttpLogger());
          console.log('   ✓ HTTP Logger added');
        } catch (error) {
          console.log(`   ❌ HTTP Logger failed to load: ${error.message}`);
          resolve({ success: false, error: 'Logger load failed' });
          return;
        }
      }
      
      // Response methods and route
      app.use(attachResponseMethods);
      app.get('/test-reviews-my', authenticateToken, reviewsController.getMyReviews);
      setupErrorHandlers(app);
      
      const server = app.listen(port, async () => {
        try {
          const axios = require('axios');
          const fs = require('fs');
          
          const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
          
          const response = await axios.get(`http://localhost:${port}/test-reviews-my`, {
            headers: { 'Authorization': `Bearer ${token}` },
            validateStatus: () => true,
            timeout: 5000
          });
          
          const success = response.status === 200;
          const resStatusError = response.status === 500 && 
            response.data?.message?.includes('res.status is not a function');
          
          console.log(`   Status: ${response.status}`);
          console.log(`   Result: ${success ? '✅ SUCCESS' : resStatusError ? '❌ res.status ERROR' : '⚠️  OTHER ERROR'}`);
          
          if (!success && response.data?.message) {
            const errorMsg = response.data.message.substring(0, 80);
            console.log(`   Error: ${errorMsg}${response.data.message.length > 80 ? '...' : ''}`);
          }
          
          server.close();
          resolve({ success, resStatusError, status: response.status });
          
        } catch (error) {
          console.log(`   Result: ❌ REQUEST FAILED - ${error.message.substring(0, 50)}`);
          server.close();
          resolve({ success: false, requestFailed: true });
        }
      });
      
      setTimeout(() => {
        server.close();
        resolve({ success: false, timeout: true });
      }, 8000);
    });
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n✅ HTTP Logger test completed');
}

testHttpLogger().catch(console.error);