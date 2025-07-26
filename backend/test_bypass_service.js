// Test if we can bypass the service call to isolate the validation issue
const express = require('express');
const axios = require('axios');

// Let's test with a minimal mock to see if validation happens before service call

async function testBypassService() {
  console.log('🧪 Testing if validation happens before service call...\n');
  
  // First, let's test with the actual endpoint
  console.log('1️⃣ Testing actual books search endpoint:');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/books/search?q=test', {
      timeout: 3000,
      validateStatus: () => true
    });
    console.log(`   Status: ${response.status}, Message: ${response.data?.message}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Now let's try to understand the route resolution by testing similar patterns
  console.log('\n2️⃣ Testing similar book routes:');
  
  const testRoutes = [
    '/api/v1/books',
    '/api/v1/books/popular', 
    '/api/v1/books/categories',
    '/api/v1/books/recent'
  ];
  
  for (const route of testRoutes) {
    try {
      const response = await axios.get(`http://localhost:3000${route}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      console.log(`   ${route}: Status ${response.status}`);
    } catch (error) {
      console.log(`   ${route}: Error ${error.message}`);
    }
  }
  
  console.log('\n3️⃣ Testing with different query parameter names:');
  
  const queryTests = [
    '/api/v1/books/search?query=test',
    '/api/v1/books/search?search=test',
    '/api/v1/books/search?keyword=test',
    '/api/v1/books/search?term=test'
  ];
  
  for (const route of queryTests) {
    try {
      const response = await axios.get(`http://localhost:3000${route}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      console.log(`   ${route}: Status ${response.status}, Message: ${response.data?.message || 'None'}`);
    } catch (error) {
      console.log(`   ${route}: Error ${error.message}`);
    }
  }
  
  console.log('\n💡 Analysis:');
  console.log('- If different query param names work, the issue is with "q" parameter validation');
  console.log('- If all fail the same way, the issue is in the route handler itself');
  console.log('- If other book routes work but search fails, it\'s specific to search route');
}

testBypassService();