// Test the actual reviews service with database connection
const reviewsService = require('./src/services/reviews.service');

async function testReviewsService() {
  console.log('🧪 Testing reviews service with actual database...\n');
  
  try {
    console.log('📥 Calling reviewsService.getUserReviews(1, { page: 1, limit: 10 })');
    
    const result = await reviewsService.getUserReviews(1, {
      page: 1,
      limit: 10,
      includeBook: true,
      requestingUser: { id: 1, role: 'admin' }
    });
    
    console.log('✅ Service call successful');
    console.log('📊 Result structure:', {
      hasReviews: !!result.reviews,
      reviewsCount: result.reviews?.length || 0,
      hasPagination: !!result.pagination,
      paginationProps: result.pagination ? Object.keys(result.pagination) : []
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Service call failed');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    
    if (error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
    
    // Check if it's a Prisma error
    if (error.name && error.name.includes('Prisma')) {
      console.log('\n🔍 This is a Prisma database error');
      console.log('Prisma error details:', {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });
    }
    
    return false;
  }
}

// Also test the underlying ReviewService
async function testUnderlyingReviewService() {
  console.log('\n🧪 Testing underlying ReviewService...\n');
  
  try {
    const ReviewService = require('./src/services/review.service');
    
    console.log('📥 Calling ReviewService.getUserReviews(1, { page: 1, limit: 10 })');
    
    const result = await ReviewService.getUserReviews(1, {
      page: 1,
      limit: 10
    });
    
    console.log('✅ Underlying service call successful');
    console.log('📊 Result structure:', {
      hasData: !!result.data,
      dataCount: result.data?.length || 0,
      hasPagination: !!result.pagination,
      paginationProps: result.pagination ? Object.keys(result.pagination) : []
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Underlying service call failed');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    
    if (error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
    
    return false;
  }
}

async function runAllServiceTests() {
  console.log('🔬 Running reviews service tests...\n');
  
  const test1 = await testUnderlyingReviewService();
  const test2 = await testReviewsService();
  
  const allPassed = test1 && test2;
  
  console.log(`\n📋 Overall test result: ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!allPassed) {
    console.log('\n💡 This might explain the "res.status is not a function" error in the middleware chain');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runAllServiceTests();