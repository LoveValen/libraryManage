const express = require('express');
const { attachResponseMethods } = require('./src/utils/apiResponse');
const { setupErrorHandlers } = require('./src/middlewares/error.middleware');
const reviewsController = require('./src/controllers/reviews.controller');
const { authenticateToken } = require('./src/middlewares/auth.middleware');

// Create minimal Express app to test middleware chain
const app = express();
app.use(express.json());

// Add response methods middleware
app.use(attachResponseMethods);

// Add a test route with authentication
app.get('/test-reviews-my', authenticateToken, reviewsController.getMyReviews);

// Add error handling middleware
setupErrorHandlers(app);

const server = app.listen(3002, () => {
  console.log('🧪 Minimal middleware test server running on port 3002');
  
  // Make test request
  const axios = require('axios');
  const fs = require('fs');
  
  setTimeout(async () => {
    try {
      console.log('\n📡 Making test request to minimal server...');
      const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
      
      const response = await axios.get('http://localhost:3002/test-reviews-my', {
        headers: { 'Authorization': `Bearer ${token}` },
        validateStatus: () => true
      });
      
      console.log('\n📊 Minimal Test Results:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data?.message}`);
      console.log(`   Message Type: ${typeof response.data?.message}`);
      
      if (response.status === 500) {
        console.log('\n🔍 Middleware Chain Error Analysis:');
        console.log(`   Error: ${response.data?.message}`);
        if (response.data?.stack) {
          console.log('   Stack (first 3 lines):');
          response.data.stack.split('\n').slice(0, 3).forEach(line => {
            console.log(`     ${line}`);
          });
        }
      } else {
        console.log('\n✅ Minimal server works! Issue is elsewhere.');
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
  console.log('💥 Uncaught exception in minimal test:');
  console.log('   Error:', error.message);
  console.log('   Type:', typeof error);
});