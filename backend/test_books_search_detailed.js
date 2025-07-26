const axios = require('axios');
const fs = require('fs');

async function testBooksSearchDetailed() {
  console.log('🧪 Testing books search with detailed error analysis...\n');
  
  try {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    console.log('📡 Making request to: GET /api/v1/books/search?q=三体&page=1&limit=5');
    
    const response = await axios.get('http://localhost:3000/api/v1/books/search?q=三体&page=1&limit=5', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log('📊 Response details:');
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Success:', response.data.success);
    console.log('   Message:', response.data.message);
    console.log('   Code:', response.data.code);
    
    if (response.data.errors) {
      console.log('\n🔍 Validation errors:');
      console.log(JSON.stringify(response.data.errors, null, 2));
    }
    
    if (response.data.stack) {
      console.log('\n📄 Stack trace:');
      console.log(response.data.stack.split('\n').slice(0, 8).join('\n'));
    }
    
    // Test without authentication to see if it's auth-related
    console.log('\n📡 Testing without authentication...');
    const responseNoAuth = await axios.get('http://localhost:3000/api/v1/books/search?q=test&page=1&limit=5', {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log('   Status without auth:', responseNoAuth.status);
    console.log('   Message without auth:', responseNoAuth.data?.message);
    
  } catch (error) {
    console.log('❌ Request failed with exception');
    console.log('   Error:', error.message);
    
    if (error.response) {
      console.log('   Response data:', error.response.data);
    }
  }
}

testBooksSearchDetailed();