// Debug the search route to understand where validation is happening
const express = require('express');
const axios = require('axios');
const fs = require('fs');

// Test with a minimal reproduction of the issue
async function debugSearchRoute() {
  console.log('🔍 Debugging books search route validation...\n');
  
  // Test 1: Check if it's a query parameter issue
  const testCases = [
    { name: 'Basic query', params: 'q=test' },
    { name: 'Query + pagination', params: 'q=test&page=1&limit=5' },
    { name: 'Only pagination', params: 'page=1&limit=5' },
    { name: 'Empty params', params: '' },
    { name: 'Chinese query', params: 'q=三体' },
    { name: 'Special chars', params: 'q=test%20book&page=1' }
  ];
  
  console.log('📝 Testing different parameter combinations:');
  
  for (const testCase of testCases) {
    try {
      const url = `http://localhost:3000/api/v1/books/search${testCase.params ? '?' + testCase.params : ''}`;
      console.log(`\n   ${testCase.name}: ${testCase.params}`);
      
      const response = await axios.get(url, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      console.log(`   → Status: ${response.status}, Message: ${response.data?.message || 'No message'}`);
      
      if (response.data?.errors && Array.isArray(response.data.errors)) {
        console.log(`   → Validation errors:`);
        response.data.errors.forEach(error => {
          console.log(`     * ${error.field}: ${error.message}`);
        });
      }
      
    } catch (error) {
      console.log(`   → Exception: ${error.message}`);
    }
  }
  
  // Test 2: Check if it's middleware-related by testing other book routes
  console.log('\n📚 Testing other book routes for comparison:');
  
  const otherRoutes = [
    { name: 'Book list', path: '/api/v1/books?page=1&limit=5' },
    { name: 'Popular books', path: '/api/v1/books/popular?limit=5' },
    { name: 'Book categories', path: '/api/v1/books/categories' }
  ];
  
  for (const route of otherRoutes) {
    try {
      console.log(`\n   ${route.name}: ${route.path}`);
      
      const response = await axios.get(`http://localhost:3000${route.path}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      console.log(`   → Status: ${response.status}, Message: ${response.data?.message || 'No message'}`);
      
    } catch (error) {
      console.log(`   → Exception: ${error.message}`);
    }
  }
  
  console.log('\n💡 Analysis complete. Check the patterns above to identify the validation issue.');
}

debugSearchRoute();