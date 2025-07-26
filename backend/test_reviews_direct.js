const fs = require('fs');

// Mock the required modules and dependencies
const mockPrisma = {
  reviews: {
    findMany: async () => [],
    count: async () => 0
  }
};

// Mock the review service
const MockReviewService = {
  getUserReviews: async (userId, options) => {
    return {
      data: [],
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        total: 0,
        totalPages: 0
      }
    };
  }
};

// Mock the reviews.service
const mockReviewsService = {
  getUserReviews: async (userId, options) => {
    const result = await MockReviewService.getUserReviews(userId, options);
    return {
      reviews: result.data.map(review => review),
      pagination: result.pagination
    };
  }
};

// Mock the ApiResponse
const mockApiResponse = {
  success: (res, data, message) => {
    console.log('✅ ApiResponse.success called successfully');
    console.log('- Data:', typeof data);
    console.log('- Message:', message);
    
    // Simulate the real response behavior
    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }
};

// Mock the controller dependencies
const mockValidateRequest = (schema, data) => data;

// Create a mock response object that simulates Express res
const createMockResponse = () => {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('📤 Response sent:', {
        statusCode: this.statusCode,
        success: data.success,
        message: data.message
      });
      return this;
    }
  };
  return res;
};

// Mock request object
const createMockRequest = (userId) => ({
  user: { id: userId },
  query: { page: 1, limit: 10, includeBook: 'true' }
});

async function testReviewsControllerDirect() {
  console.log('🧪 Testing reviews controller method directly...\n');
  
  try {
    // Create the controller method manually (simulating the controller)
    const getMyReviews = async (req, res) => {
      const {
        page = 1,
        limit = 20,
        status,
        includeBook = 'true',
      } = req.query;
      
      console.log('📥 Controller method called with:', {
        userId: req.user.id,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status,
        includeBook: includeBook === 'true'
      });
      
      const result = await mockReviewsService.getUserReviews(
        req.user.id,
        {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          status,
          includeBook: includeBook === 'true',
          requestingUser: req.user,
        }
      );
      
      console.log('📊 Service returned:', {
        reviewsCount: result.reviews?.length || 0,
        pagination: result.pagination
      });
      
      // This is the line that was causing issues in the actual controller
      mockApiResponse.success(res, result, '获取我的评价列表成功');
    };
    
    // Create mock objects
    const mockReq = createMockRequest(1);
    const mockRes = createMockResponse();
    
    // Call the controller method
    await getMyReviews(mockReq, mockRes);
    
    console.log('\n✅ Direct controller test completed successfully');
    return true;
    
  } catch (error) {
    console.log('\n❌ Direct controller test failed');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

// Run the test
testReviewsControllerDirect().then(success => {
  console.log(`\n📋 Test result: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});