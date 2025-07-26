const express = require('express');
const booksController = require('./src/controllers/books.controller');

// 创建一个简单的测试服务器，绕过所有中间件
const app = express();
app.use(express.json());

// 直接挂载搜索路由，没有任何验证中间件
app.get('/test-search', booksController.searchBooks);

const server = app.listen(3030, () => {
  console.log('🧪 测试服务器启动在端口 3030');
  
  // 测试搜索
  const axios = require('axios');
  
  setTimeout(async () => {
    try {
      const response = await axios.get('http://localhost:3030/test-search?q=test', {
        validateStatus: () => true
      });
      
      console.log('\n📊 绕过中间件的搜索测试结果:');
      console.log(`   状态码: ${response.status}`);
      console.log(`   成功: ${response.data?.success}`);
      console.log(`   消息: ${response.data?.message}`);
      
      if (response.status === 200) {
        console.log('   ✅ 搜索功能本身正常工作!');
        console.log('   问题在于主服务器的验证中间件');
      } else {
        console.log('   ❌ 搜索功能仍有问题');
        console.log(`   错误: ${JSON.stringify(response.data, null, 2)}`);
      }
      
    } catch (error) {
      console.log('❌ 测试请求失败:', error.message);
    } finally {
      server.close();
      process.exit(0);
    }
  }, 1000);
});