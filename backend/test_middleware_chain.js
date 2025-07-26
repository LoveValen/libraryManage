const fs = require('fs');

// Test the middleware chain step by step
async function testMiddlewareChain() {
  console.log('🧪 Testing middleware chain components...\n');
  
  try {
    // Test 1: Authentication middleware
    console.log('1️⃣ Testing authentication middleware...');
    const { authenticateToken } = require('./src/middlewares/auth.middleware');
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    
    const mockReq = {
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      url: '/api/v1/reviews/my'
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('   Auth middleware response:', { statusCode: this.statusCode, success: data.success });
        return this;
      }
    };
    
    let authError = null;
    const mockNext = (error) => {
      if (error) {
        authError = error;
        console.log('   ❌ Auth middleware error:', error.message);
      } else {
        console.log('   ✅ Auth middleware passed');
        console.log('   User set:', { id: mockReq.user?.id, username: mockReq.user?.username });
      }
    };
    
    await new Promise((resolve) => {
      authenticateToken(mockReq, mockRes, (error) => {
        mockNext(error);
        resolve();
      });
    });
    
    if (authError) return false;
    
    // Test 2: Controller method with asyncHandler
    console.log('\n2️⃣ Testing controller with asyncHandler...');
    const { asyncHandler } = require('./src/middlewares/error.middleware');
    const reviewsController = require('./src/controllers/reviews.controller');
    
    const mockReq2 = {
      user: mockReq.user,
      query: { page: 1, limit: 10, includeBook: 'true' }
    };
    
    const mockRes2 = {
      status: function(code) {
        console.log('   📍 res.status() called with:', code);
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('   📍 res.json() called with success:', data.success);
        return this;
      }
    };
    
    let controllerError = null;
    const mockNext2 = (error) => {
      if (error) {
        controllerError = error;
        console.log('   ❌ Controller error:', error.message);
        console.log('   Error stack:', error.stack?.split('\\n')[0]);
      } else {
        console.log('   ✅ Controller completed successfully');
      }
    };
    
    // Wrap the controller method in asyncHandler (like it's done in routes)
    const wrappedController = asyncHandler(reviewsController.getMyReviews);
    
    await new Promise((resolve) => {
      wrappedController(mockReq2, mockRes2, (error) => {
        mockNext2(error);
        resolve();
      });
    });
    
    if (controllerError) return false;
    
    console.log('\n✅ All middleware chain tests passed');
    return true;
    
  } catch (error) {
    console.log('\n❌ Middleware chain test failed');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

// Test 3: Check for response object corruption
async function testResponseObjectIntegrity() {
  console.log('\n3️⃣ Testing response object integrity...');
  
  const mockRes = {
    status: function(code) {
      console.log('   📍 Original status method called with:', code);
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('   📍 Original json method called');
      return this;
    }
  };
  
  console.log('   Initial res methods:', {
    hasStatus: typeof mockRes.status === 'function',
    hasJson: typeof mockRes.json === 'function'
  });
  
  // Simulate the attachResponseMethods middleware
  const { attachResponseMethods } = require('./src/utils/apiResponse');
  attachResponseMethods({}, mockRes, () => {});
  
  console.log('   After attachResponseMethods:', {
    hasStatus: typeof mockRes.status === 'function',
    hasJson: typeof mockRes.json === 'function',
    hasApiSuccess: typeof mockRes.apiSuccess === 'function',
    hasApiError: typeof mockRes.apiError === 'function'
  });
  
  // Test if the status method still works
  try {
    const result = mockRes.status(200);
    console.log('   ✅ status() method works after middleware');
    console.log('   Returns res object:', result === mockRes);
  } catch (error) {
    console.log('   ❌ status() method corrupted:', error.message);
    return false;
  }
  
  return true;
}

async function runAllTests() {
  console.log('🔬 Running comprehensive middleware chain tests...\n');
  
  const test1 = await testMiddlewareChain();
  const test2 = await testResponseObjectIntegrity();
  
  const allPassed = test1 && test2;
  
  console.log(`\\n📋 Overall test result: ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!allPassed) {
    console.log('💡 The "res.status is not a function" error is likely in the middleware chain');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests();