// 直接测试搜索功能
const booksService = require('./src/services/books.service');

async function testSearchDirectly() {
  try {
    console.log('🔍 直接测试搜索服务...');
    
    const result = await booksService.searchBooks('test', { limit: 5 });
    console.log('✅ 搜索服务正常工作');
    console.log('结果:', result);
    
  } catch (error) {
    console.log('❌ 搜索服务错误:', error.message);
    console.log('堆栈:', error.stack);
  }
}

// 测试控制器方法
async function testControllerMethod() {
  try {
    console.log('\n🎮 测试控制器方法...');
    
    const booksController = require('./src/controllers/books.controller');
    
    // 模拟请求和响应对象
    const mockReq = {
      query: { q: 'test', page: 1, limit: 5 }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response status: ${code}`);
          console.log('Response data:', JSON.stringify(data, null, 2));
        }
      }),
      json: (data) => {
        console.log('Response data:', JSON.stringify(data, null, 2));
      }
    };
    
    await booksController.searchBooks(mockReq, mockRes);
    
  } catch (error) {
    console.log('❌ 控制器错误:', error.message);
    console.log('堆栈:', error.stack);
  }
}

async function runTests() {
  await testSearchDirectly();
  await testControllerMethod();
}

runTests().catch(console.error);