const axios = require('axios');

async function getFullStackTrace() {
  console.log('🔍 Getting full stack trace for books search validation error...\n');
  
  try {
    const response = await axios.get('http://localhost:3000/api/v1/books/search?q=test&page=1&limit=5', {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.stack) {
      console.log('\n🔍 Full Stack Trace:');
      console.log(response.data.stack);
    }
    
    if (response.data?.errors) {
      console.log('\n🔍 Validation Errors:');
      console.log(JSON.stringify(response.data.errors, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    
    if (error.response?.data) {
      console.log('\n📊 Error Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getFullStackTrace();