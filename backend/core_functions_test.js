const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let adminToken = null;

console.log('🔬 核心功能验证测试\n');

async function testCoreFunction(name, testFn) {
  try {
    const start = Date.now();
    const result = await testFn();
    const duration = Date.now() - start;
    
    if (result.success) {
      console.log(`✅ ${name} (${duration}ms) - ${result.message}`);
      return true;
    } else {
      console.log(`❌ ${name} (${duration}ms) - ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${name} - Exception: ${error.message}`);
    return false;
  }
}

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message
    };
  }
}

async function runCoreTests() {
  const results = [];
  
  // 1. 认证核心
  results.push(await testCoreFunction('管理员登录', async () => {
    const result = await makeRequest('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (result.success && result.data.success && result.data.data.tokens?.accessToken) {
      adminToken = result.data.data.tokens.accessToken;
      return { success: true, message: '登录成功，获取到access token' };
    }
    return { success: false, message: '登录失败或token格式错误' };
  }));

  // 2. 用户信息
  results.push(await testCoreFunction('获取用户信息', async () => {
    if (!adminToken) return { success: false, message: '需要先登录' };
    
    const result = await makeRequest('GET', '/api/v1/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && result.data.data.user) {
      return { success: true, message: `用户: ${result.data.data.user.username}` };
    }
    return { success: false, message: '获取用户信息失败' };
  }));

  // 3. 用户管理
  results.push(await testCoreFunction('用户列表', async () => {
    if (!adminToken) return { success: false, message: '需要先登录' };
    
    const result = await makeRequest('GET', '/api/v1/users', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data.users)) {
      return { success: true, message: `找到${result.data.data.users.length}个用户` };
    }
    return { success: false, message: '获取用户列表失败' };
  }));

  // 4. 图书管理
  results.push(await testCoreFunction('图书列表', async () => {
    const result = await makeRequest('GET', '/api/v1/books');
    
    if (result.success && result.data.success && Array.isArray(result.data.data.books)) {
      return { success: true, message: `找到${result.data.data.books.length}本图书` };
    }
    return { success: false, message: '获取图书列表失败' };
  }));

  // 5. 借阅管理
  results.push(await testCoreFunction('借阅列表', async () => {
    if (!adminToken) return { success: false, message: '需要先登录' };
    
    const result = await makeRequest('GET', '/api/v1/borrows', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data.borrows)) {
      return { success: true, message: `找到${result.data.data.borrows.length}条借阅记录` };
    }
    return { success: false, message: '获取借阅列表失败' };
  }));

  // 6. 积分系统
  results.push(await testCoreFunction('积分信息', async () => {
    if (!adminToken) return { success: false, message: '需要先登录' };
    
    const result = await makeRequest('GET', '/api/v1/points/my', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && result.data.data.points) {
      return { success: true, message: `当前积分: ${result.data.data.points.balance}` };
    }
    return { success: false, message: '获取积分信息失败' };
  }));

  // 7. 通知系统
  results.push(await testCoreFunction('通知列表', async () => {
    if (!adminToken) return { success: false, message: '需要先登录' };
    
    const result = await makeRequest('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data.notifications)) {
      return { success: true, message: `找到${result.data.data.notifications.length}条通知` };
    }
    return { success: false, message: '获取通知列表失败' };
  }));

  // 8. 系统健康
  results.push(await testCoreFunction('系统状态', async () => {
    const result = await makeRequest('GET', '/health');
    
    if (result.success && result.data.status === 'healthy') {
      return { success: true, message: `状态: ${result.data.status}` };
    }
    return { success: false, message: '系统状态检查失败' };
  }));

  // 结果统计
  const passed = results.filter(r => r).length;
  const total = results.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\n📊 核心功能测试结果:`);
  console.log(`   通过: ${passed}/${total}`);
  console.log(`   成功率: ${successRate}%`);
  
  if (successRate >= 90) {
    console.log(`\n🎉 核心功能迁移成功！Prisma工作正常。`);
  } else if (successRate >= 70) {
    console.log(`\n⚠️  大部分核心功能正常，需要解决剩余问题。`);
  } else {
    console.log(`\n❌ 需要进一步调试核心功能问题。`);
  }
  
  return successRate;
}

runCoreTests().catch(console.error);