const axios = require('axios');

async function testBooksSearchWorkaround() {
  console.log('🧪 Testing books search with alternative parameter names...\n');
  
  const testCases = [
    { name: 'Using q parameter (problematic)', url: '/api/v1/books/search?q=test&page=1&limit=5' },
    { name: 'Using query parameter', url: '/api/v1/books/search?query=test&page=1&limit=5' },
    { name: 'Using search parameter', url: '/api/v1/books/search?search=test&page=1&limit=5' },
    { name: 'Using keyword parameter', url: '/api/v1/books/search?keyword=test&page=1&limit=5' },
    { name: 'Chinese query with alternative param', url: '/api/v1/books/search?query=三体&page=1&limit=5' }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`📡 ${testCase.name}: ${testCase.url}`);
      
      const response = await axios.get(`http://localhost:3000${testCase.url}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data?.message || 'No message'}`);
      
      if (response.status === 200) {
        console.log(`   ✅ SUCCESS - Found ${response.data?.data?.books?.length || 0} books`);
        console.log(`   Query echoed: ${response.data?.data?.query}`);
      } else {
        console.log(`   ❌ FAILED - ${response.data?.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('💡 If alternative parameters work, users can use ?query=... instead of ?q=...');
}

testBooksSearchWorkaround();