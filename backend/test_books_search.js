const axios = require('axios');
const fs = require('fs');

async function testBooksSearch() {
  console.log('🧪 Testing books search endpoint for validation errors...\n');
  
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
    console.log('   Headers:', Object.keys(response.headers));
    
    if (response.status === 200) {
      console.log('✅ Books search successful');
      console.log('   Success:', response.data.success);
      console.log('   Message:', response.data.message);
      console.log('   Data structure:', {
        hasData: !!response.data.data,
        dataType: typeof response.data.data,
        hasHits: !!(response.data.data && response.data.data.hits),
        hitsCount: response.data.data?.hits?.length || 0,
        hasBooks: !!(response.data.data && Array.isArray(response.data.data)),
        booksCount: Array.isArray(response.data.data) ? response.data.data.length : 0
      });
      return true;
    } else {
      console.log('❌ Books search failed');
      console.log('   Error message:', response.data?.message || 'No message');
      console.log('   Error code:', response.data?.code || 'No code');
      
      if (response.data?.stack) {
        console.log('\n🔍 Error stack trace:');
        console.log(response.data.stack.split('\n').slice(0, 5).join('\n'));
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('❌ Request failed with exception');
    console.log('   Error type:', error.name);
    console.log('   Error message:', error.message);
    
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    } else if (error.request) {
      console.log('   Request timeout or connection error');
    }
    
    return false;
  }
}

async function testMultipleBooksSearchCases() {
  console.log('🔬 Testing multiple books search cases...\n');
  
  const testCases = [
    { name: 'Basic search', url: '/api/v1/books/search?q=三体&page=1&limit=5' },
    { name: 'Empty query', url: '/api/v1/books/search?q=&page=1&limit=5' },
    { name: 'English search', url: '/api/v1/books/search?q=book&page=1&limit=5' },
    { name: 'Invalid page', url: '/api/v1/books/search?q=test&page=0&limit=5' },
    { name: 'Large limit', url: '/api/v1/books/search?q=test&page=1&limit=1000' }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
      
      const response = await axios.get(`http://localhost:3000${testCase.url}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ Success');
        results.push({ name: testCase.name, status: 'success' });
      } else {
        console.log('   ❌ Failed');
        console.log('   Error:', response.data?.message || 'Unknown error');
        results.push({ name: testCase.name, status: 'failed', error: response.data?.message });
      }
      
    } catch (error) {
      console.log('   ❌ Exception:', error.message);
      results.push({ name: testCase.name, status: 'exception', error: error.message });
    }
  }
  
  console.log('\n📋 Test Results Summary:');
  results.forEach((result, index) => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${result.name}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\n📊 Success rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);
  
  return successCount === results.length;
}

async function runBooksSearchTests() {
  console.log('📚 Running books search validation tests...\n');
  
  const basicTest = await testBooksSearch();
  const comprehensiveTest = await testMultipleBooksSearchCases();
  
  const allPassed = basicTest && comprehensiveTest;
  
  console.log(`\n🎯 Overall result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('💡 Books search validation errors identified for fixing');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runBooksSearchTests();