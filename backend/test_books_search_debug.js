const axios = require('axios');

async function testBooksSearch() {
  try {
    console.log('🔍 Testing books search functionality...');
    
    const response = await axios.get('http://localhost:3000/api/v1/books/search', {
      params: { q: 'test' },
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.message && response.data.message.includes('[object Object]')) {
      console.log('\n🎯 Found [object Object] error!');
      console.log('Message:', response.data.message);
      console.log('Message type:', typeof response.data.message);
    }
    
  } catch (error) {
    console.log('Request error:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

testBooksSearch();