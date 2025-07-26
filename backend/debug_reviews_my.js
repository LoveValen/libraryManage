const axios = require('axios');
const fs = require('fs');

async function debugReviewsMy() {
  console.log('🔍 Debugging reviews/my endpoint in detail...\n');
  
  try {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    console.log('📡 Making request to /api/v1/reviews/my...');
    
    const response = await axios.get('http://localhost:3000/api/v1/reviews/my', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000,
      validateStatus: () => true // Don't throw errors on non-2xx status
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, response.headers);
    console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data?.stack) {
      console.log(`\n🔍 Stack Trace Analysis:`);
      const lines = response.data.stack.split('\n');
      lines.slice(0, 10).forEach((line, index) => {
        console.log(`   ${index + 1}: ${line}`);
      });
    }
    
    if (response.status === 500) {
      console.log('\n❌ 500 ERROR - Detailed Analysis:');
      console.log(`   Original Error: ${response.data?.originalError}`);
      console.log(`   Message Type: ${typeof response.data?.message}`);
      console.log(`   Message: ${response.data?.message}`);
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception:');
    console.log(`   Error message: ${error.message}`);
    console.log(`   Error response:`, error.response?.data);
  }
}

debugReviewsMy();