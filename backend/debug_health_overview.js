const axios = require('axios');
const fs = require('fs');

async function debugHealthOverview() {
  console.log('🔍 Debugging health overview endpoint in detail...\n');
  
  try {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    console.log('📡 Making request to /api/v1/health/overview...');
    
    const response = await axios.get('http://localhost:3000/api/v1/health/overview', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000,
      validateStatus: () => true // Don't throw errors on non-2xx status
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, response.headers);
    console.log(`📊 Response Data Type:`, typeof response.data);
    console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data?.message) {
      console.log(`\n🔍 Message Analysis:`);
      console.log(`   Message Type: ${typeof response.data.message}`);
      console.log(`   Message Constructor: ${response.data.message?.constructor?.name}`);
      console.log(`   Message Keys (if object): ${typeof response.data.message === 'object' ? Object.keys(response.data.message) : 'N/A'}`);
      console.log(`   Message String: "${response.data.message}"`);
      console.log(`   Message JSON: ${JSON.stringify(response.data.message)}`);
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception:');
    console.log(`   Error message: ${error.message}`);
    console.log(`   Error response:`, error.response?.data);
  }
}

debugHealthOverview();