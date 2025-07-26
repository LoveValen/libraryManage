const axios = require('axios');
const fs = require('fs');

async function testActualEndpoint() {
  console.log('🧪 Testing actual HTTP endpoint with detailed analysis...\n');
  
  try {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    console.log('📡 Making HTTP request to: GET /api/v1/reviews/my');
    console.log('🔑 Using token:', token.substring(0, 20) + '...');
    
    const startTime = Date.now();
    
    const response = await axios.get('http://localhost:3000/api/v1/reviews/my?page=1&limit=10', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      validateStatus: () => true // Accept any status code
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📊 Response details:');
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.keys(response.headers));
    console.log('   Data type:', typeof response.data);
    
    if (response.status === 200) {
      console.log('✅ Request successful');
      console.log('   Success:', response.data.success);
      console.log('   Message:', response.data.message);
      console.log('   Data type:', typeof response.data.data);
      
      if (response.data.data && response.data.data.reviews) {
        console.log('   Reviews count:', response.data.data.reviews.length);
      }
      
      return true;
    } else {
      console.log('❌ Request failed');
      console.log('   Error message:', response.data?.message || 'No message');
      console.log('   Error details:', response.data?.code || 'No code');
      
      if (response.data?.stack && response.data.stack.includes('res.status is not a function')) {
        console.log('\\n🔍 Found the "res.status is not a function" error!');
        console.log('Stack trace preview:', response.data.stack.split('\\n').slice(0, 5).join('\\n'));
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception');
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('Request timeout or connection error');
    }
    
    return false;
  }
}

async function testServerAvailability() {
  console.log('🔍 Checking server availability...');
  
  try {
    const response = await axios.get('http://localhost:3000/health', {
      timeout: 5000
    });
    
    console.log('✅ Server is responding');
    console.log('   Status:', response.data.status);
    console.log('   Environment:', response.data.environment);
    return true;
    
  } catch (error) {
    console.log('❌ Server not responding');
    console.log('   Error:', error.message);
    return false;
  }
}

async function runEndpointTest() {
  console.log('🌐 Testing actual HTTP endpoint vs isolated components..\\n');
  
  const serverOk = await testServerAvailability();
  if (!serverOk) {
    console.log('\\n💡 Server is not running. Start with: npm run dev');
    process.exit(1);
  }
  
  console.log('');
  const success = await testActualEndpoint();
  
  console.log(`\\n📋 Endpoint test result: ${success ? 'PASSED' : 'FAILED'}`);
  
  if (!success) {
    console.log('\\n💡 This explains the difference between isolated tests and actual HTTP requests');
    console.log('💡 The issue occurs only in the full HTTP request flow');
  }
  
  process.exit(success ? 0 : 1);
}

runEndpointTest();