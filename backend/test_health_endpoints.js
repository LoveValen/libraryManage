const axios = require('axios');
const fs = require('fs');

async function testHealthEndpoints() {
  console.log('🏥 Testing health endpoints for error handling issues...\n');
  
  const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
  
  const healthEndpoints = [
    { name: 'System Status', url: '/api/v1/health/status', needsAuth: false },
    { name: 'Health Overview', url: '/api/v1/health/overview', needsAuth: false },
    { name: 'Health Report', url: '/api/v1/health/report', needsAuth: true },
    { name: 'System Metrics', url: '/api/v1/health/metrics', needsAuth: true },
    { name: 'Basic Health Check', url: '/health', needsAuth: false }
  ];
  
  console.log('📋 Testing health endpoints:');
  
  for (const endpoint of healthEndpoints) {
    try {
      console.log(`\n🧪 ${endpoint.name}: ${endpoint.url}`);
      
      const headers = endpoint.needsAuth ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`http://localhost:3000${endpoint.url}`, {
        headers,
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${response.data?.success}`);
      console.log(`   Message: ${response.data?.message || 'No message'}`);
      
      if (response.status >= 400) {
        console.log(`   ❌ ERROR DETECTED`);
        console.log(`   Error code: ${response.data?.code || 'No code'}`);
        
        if (response.data?.stack) {
          console.log(`   Stack preview: ${response.data.stack.split('\\n')[0]}`);
        }
        
        // Check for empty error messages
        if (!response.data?.message || response.data.message.trim() === '') {
          console.log(`   🚨 EMPTY ERROR MESSAGE DETECTED`);
        }
      } else {
        console.log(`   ✅ Success`);
        
        // Check response structure for health endpoints
        if (response.data?.data) {
          console.log(`   Data keys: ${Object.keys(response.data.data).join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
      
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  console.log('\n💡 Analysis: Look for endpoints with empty error messages or error handling issues.');
}

testHealthEndpoints();