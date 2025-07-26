const axios = require('axios');

async function debugHealthOverviewNoAuth() {
  console.log('🔍 Testing health overview endpoint WITHOUT authentication...\n');
  
  try {
    console.log('📡 Making request to /api/v1/health/overview (no auth)...');
    
    const response = await axios.get('http://localhost:3000/api/v1/health/overview', {
      timeout: 10000,
      validateStatus: () => true // Don't throw errors on non-2xx status
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data?.message) {
      console.log(`\n🔍 Message Analysis:`);
      console.log(`   Message Type: ${typeof response.data.message}`);
      console.log(`   Message Constructor: ${response.data.message?.constructor?.name}`);
      console.log(`   Message String: "${response.data.message}"`);
      console.log(`   Message JSON: ${JSON.stringify(response.data.message)}`);
    }
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS - Overview endpoint works without authentication!');
    } else {
      console.log('\n❌ FAILED - Issue persists even without authentication');
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception:');
    console.log(`   Error message: ${error.message}`);
    console.log(`   Error response:`, error.response?.data);
  }
}

debugHealthOverviewNoAuth();