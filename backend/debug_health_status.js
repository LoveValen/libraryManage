const axios = require('axios');

async function debugHealthStatus() {
  console.log('🔍 Testing health status endpoint (known to work)...\n');
  
  try {
    console.log('📡 Making request to /api/v1/health/status...');
    
    const response = await axios.get('http://localhost:3000/api/v1/health/status', {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS - Status endpoint works as expected');
    } else {
      console.log('\n❌ UNEXPECTED - Status endpoint also failing');
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception:');
    console.log(`   Error message: ${error.message}`);
  }
}

debugHealthStatus();