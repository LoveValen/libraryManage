const axios = require('axios');
const fs = require('fs');

async function testAllSearchRoutes() {
  console.log('🔍 Testing all search routes to identify validation patterns...\n');
  
  const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
  
  const searchRoutes = [
    { name: 'Books search', url: '/api/v1/books/search?q=test&page=1&limit=5', needsAuth: false },
    { name: 'Users search', url: '/api/v1/users/search?q=admin&page=1&limit=5', needsAuth: true },
    { name: 'Reviews search', url: '/api/v1/reviews/search?q=test&page=1&limit=5', needsAuth: false }
  ];
  
  console.log('📝 Testing search routes:');
  
  for (const route of searchRoutes) {
    try {
      console.log(`\n🧪 ${route.name}: ${route.url}`);
      
      const headers = route.needsAuth ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`http://localhost:3000${route.url}`, {
        headers,
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data?.message || 'No message'}`);
      console.log(`   Code: ${response.data?.code || 'No code'}`);
      
      if (response.data?.errors && Array.isArray(response.data.errors)) {
        console.log(`   Validation errors:`);
        response.data.errors.forEach(error => {
          console.log(`     * ${error.field}: ${error.message}`);
        });
      }
      
      // Test the same route without query to see difference
      const baseUrl = route.url.split('?')[0];
      const responseNoQuery = await axios.get(`http://localhost:3000${baseUrl}`, {
        headers,
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Without query - Status: ${responseNoQuery.status}, Message: ${responseNoQuery.data?.message || 'No message'}`);
      
    } catch (error) {
      console.log(`   Exception: ${error.message}`);
    }
  }
  
  console.log('\n💡 Analysis:');
  console.log('If all search routes return 422 "Validation failed", it suggests global search validation.');
  console.log('If only books search fails, the issue is specific to that route.');
}

testAllSearchRoutes();