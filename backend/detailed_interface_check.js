const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let adminToken = null;

console.log('🔍 详细接口问题检查\n');

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json', ...headers },
      validateStatus: () => true
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    const response = await axios(config);
    return { 
      success: response.status >= 200 && response.status < 300, 
      status: response.status, 
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || { message: error.message },
      error: error.message
    };
  }
}

async function getAuthToken() {
  console.log('🔐 获取认证token...');
  const result = await makeRequest('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (result.success && result.data.success && result.data.data.tokens?.accessToken) {
    adminToken = result.data.data.tokens.accessToken;
    console.log('✅ 认证成功');
    return true;
  } else {
    console.log('❌ 认证失败:', result.data);
    return false;
  }
}

async function checkInterface(name, method, path, requiresAuth = true, data = null, expectedStatus = 200) {
  console.log(`\n📡 检查接口: ${method} ${path}`);
  
  const headers = {};
  if (requiresAuth && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  
  const result = await makeRequest(method, path, data, headers);
  
  console.log(`   状态码: ${result.status} (期望: ${expectedStatus})`);
  
  if (result.status === expectedStatus) {
    console.log(`   ✅ ${name} - 正常`);
    return true;
  } else {
    console.log(`   ❌ ${name} - 错误`);
    console.log(`   错误信息: ${JSON.stringify(result.data?.message || result.data, null, 2)}`);
    
    // 详细错误分析
    if (result.status === 500) {
      console.log(`   🔍 500错误详情:`);
      if (result.data?.stack) {
        console.log(`      堆栈: ${result.data.stack.split('\\n')[0]}`);
      }
      if (result.data?.originalError) {
        console.log(`      原始错误: ${result.data.originalError}`);
      }
    } else if (result.status === 422) {
      console.log(`   🔍 422验证错误:`);
      if (result.data?.errors) {
        console.log(`      验证错误: ${JSON.stringify(result.data.errors, null, 2)}`);
      }
    }
    
    return false;
  }
}

async function runDetailedCheck() {
  console.log('开始详细接口检查...\n');
  
  // 1. 获取认证token
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.log('❌ 无法获取认证token，停止检查');
    return;
  }
  
  const results = [];
  
  // 2. 检查失败的接口
  console.log('\n=== 检查之前失败的接口 ===');
  
  // 图书搜索
  results.push(await checkInterface(
    '图书搜索', 'GET', '/api/v1/books/search?q=test', false
  ));
  
  results.push(await checkInterface(
    '图书搜索(带分页)', 'GET', '/api/v1/books/search?q=三体&page=1&limit=5', false
  ));
  
  // 评论相关
  results.push(await checkInterface(
    '获取我的评论', 'GET', '/api/v1/reviews/my', true
  ));
  
  results.push(await checkInterface(
    '评论统计', 'GET', '/api/v1/reviews/statistics', true
  ));
  
  // 健康监控
  results.push(await checkInterface(
    '健康概览', 'GET', '/api/v1/health/overview', true
  ));
  
  results.push(await checkInterface(
    '系统指标', 'GET', '/api/v1/health/metrics', true
  ));
  
  // 3. 检查一些可能的替代路径
  console.log('\n=== 检查替代路径 ===');
  
  results.push(await checkInterface(
    '图书搜索(keyword)', 'GET', '/api/v1/books/search?keyword=test', false
  ));
  
  results.push(await checkInterface(
    '图书搜索(query)', 'GET', '/api/v1/books/search?query=test', false
  ));
  
  // 4. 检查其他可能的问题接口
  console.log('\n=== 检查其他潜在问题接口 ===');
  
  results.push(await checkInterface(
    '获取图书详情', 'GET', '/api/v1/books/1', false, null, 422
  ));
  
  results.push(await checkInterface(
    '创建借阅记录', 'POST', '/api/v1/borrows', true, { bookId: 1 }, 400
  ));
  
  results.push(await checkInterface(
    '创建评论', 'POST', '/api/v1/reviews', true, { 
      bookId: 1, 
      rating: 5, 
      content: '测试评论' 
    }, 400
  ));
  
  // 5. 验证数据库连接相关接口
  console.log('\n=== 验证数据库操作接口 ===');
  
  results.push(await checkInterface(
    '用户详情', 'GET', '/api/v1/users/1', true
  ));
  
  results.push(await checkInterface(
    '书籍分类', 'GET', '/api/v1/books/categories', false
  ));
  
  results.push(await checkInterface(
    '积分历史', 'GET', '/api/v1/points/my/history', true
  ));
  
  // 统计结果
  const passed = results.filter(r => r).length;
  const total = results.length;
  const failedCount = total - passed;
  
  console.log(`\n📊 详细检查结果:`);
  console.log(`   总接口数: ${total}`);
  console.log(`   通过: ${passed}`);
  console.log(`   失败: ${failedCount}`);
  console.log(`   成功率: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failedCount > 0) {
    console.log(`\n⚠️  发现 ${failedCount} 个问题接口需要修复`);
  } else {
    console.log(`\n🎉 所有检查的接口都正常运行！`);
  }
}

runDetailedCheck().catch(console.error);