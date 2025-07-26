const axios = require('axios');
const fs = require('fs');

async function testReviewsEndpoint() {
  try {
    // Read the saved token
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    console.log('🧪 Testing reviews endpoint...');
    
    // Test the reviews/my endpoint
    const response = await axios.get('http://localhost:3000/api/v1/reviews/my?page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000
    });
    
    console.log('✅ Reviews endpoint test successful');
    console.log('Status:', response.status);
    console.log('Response structure:', {
      success: response.data?.success,
      dataType: typeof response.data?.data,
      hasReviews: Array.isArray(response.data?.data?.reviews),
      message: response.data?.message
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Reviews endpoint test failed');
    console.log('Status:', error.response?.status || 'No status');
    console.log('Error message:', error.response?.data?.message || error.message);
    
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

testReviewsEndpoint().then(success => {
  process.exit(success ? 0 : 1);
});