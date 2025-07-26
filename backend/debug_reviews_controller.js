const reviewsController = require('./src/controllers/reviews.controller');

// Mock request and response objects
const req = {
  query: {},
  user: { id: 1, username: 'admin', role: 'admin' }
};

const res = {
  status: (code) => {
    console.log('✅ res.status() called with:', code);
    return {
      json: (data) => {
        console.log('✅ Response sent:', JSON.stringify(data, null, 2));
      }
    };
  },
  json: (data) => {
    console.log('✅ Response sent via res.json():', JSON.stringify(data, null, 2));
  }
};

// Add ApiResponse methods to res object
const { attachResponseMethods } = require('./src/utils/apiResponse');
attachResponseMethods(req, res, () => {});

async function testReviewsController() {
  console.log('🧪 Testing reviews controller getMyReviews directly...\n');
  
  try {
    await reviewsController.getMyReviews(req, res);
    console.log('✅ Controller method completed successfully');
  } catch (error) {
    console.log('❌ Controller method threw exception:');
    console.log('   Error type:', typeof error);
    console.log('   Error constructor:', error?.constructor?.name);
    console.log('   Error message:', error?.message);
    console.log('   Full error:', error);
    console.log('   Error keys:', Object.keys(error));
  }
}

testReviewsController();