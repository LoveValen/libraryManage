console.log('🧪 启动全面API端点测试 (Prisma迁移验证)...\n');

const axios = require('axios');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  concurrency: 5
};

// 测试状态跟踪
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// 认证令牌存储
let authTokens = {
  admin: null,
  librarian: null,
  patron: null
};

// 测试数据
const testData = {
  adminUser: { username: 'admin', password: 'admin123' },
  testBook: { id: null, isbn: '9787544374665' },
  testUser: { id: 1 },
  testBorrow: { id: null }
};

/**
 * 格式化错误信息
 */
function formatError(error) {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error.message || JSON.stringify(error);
  }
  return String(error);
}

/**
 * HTTP请求包装器
 */
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      message: error.message
    };
  }
}

/**
 * 执行单个测试
 */
async function runTest(testName, testFn, category = 'general', priority = 'medium') {
  testResults.total++;
  
  try {
    console.log(`${colors.blue}[${category.toUpperCase()}]${colors.reset} 测试: ${testName}`);
    
    const startTime = Date.now();
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      testResults.passed++;
      console.log(`  ${colors.green}✅ 通过${colors.reset} (${duration}ms) - ${result.message || ''}`);
    } else {
      testResults.failed++;
      console.log(`  ${colors.red}❌ 失败${colors.reset} (${duration}ms) - ${result.message || result.error}`);
      testResults.errors.push({
        test: testName,
        category,
        error: result.error,
        message: result.message
      });
    }
  } catch (error) {
    testResults.failed++;
    console.log(`  ${colors.red}❌ 异常${colors.reset} - ${error.message}`);
    testResults.errors.push({
      test: testName,
      category,
      error: error.message,
      message: 'Test execution failed'
    });
  }
}

/**
 * ==================== 核心认证测试 ====================
 */
async function testAuthentication() {
  console.log(`\n${colors.bright}${colors.cyan}=== 认证系统测试 ===${colors.reset}`);

  // 测试管理员登录
  await runTest('管理员登录', async () => {
    const result = await makeRequest('POST', '/api/v1/auth/login', testData.adminUser);
    
    if (!result.success) {
      return { success: false, message: `登录失败: ${formatError(result.error)}` };
    }
    
    if (result.data.success && result.data.data.tokens?.accessToken) {
      authTokens.admin = result.data.data.tokens.accessToken;
      return { success: true, message: '管理员登录成功，获取到token' };
    }
    
    return { success: false, message: '响应格式不正确或缺少token' };
  }, 'auth', 'high');

  // 测试获取当前用户信息
  await runTest('获取当前用户信息', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要先登录' };
    }
    
    const result = await makeRequest('GET', '/api/v1/auth/me', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data.user && result.data.data.user.username === 'admin') {
      return { success: true, message: '成功获取用户信息' };
    }
    
    return { success: false, message: '用户信息不正确' };
  }, 'auth', 'high');

  // 测试token验证
  await runTest('Token验证', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要先登录' };
    }
    
    const result = await makeRequest('GET', '/api/v1/auth/verify', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    return result.success 
      ? { success: true, message: 'Token验证通过' }
      : { success: false, message: `Token验证失败: ${formatError(result.error)}` };
  }, 'auth', 'high');
}

/**
 * ==================== 图书管理测试 ====================
 */
async function testBooks() {
  console.log(`\n${colors.bright}${colors.cyan}=== 图书管理测试 ===${colors.reset}`);

  // 测试获取图书列表
  await runTest('获取图书列表', async () => {
    const result = await makeRequest('GET', '/api/v1/books?page=1&limit=10');
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && Array.isArray(result.data.data.books)) {
      return { success: true, message: `获取到${result.data.data.books.length}本图书` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'books', 'high');

  // 测试图书搜索
  await runTest('图书搜索功能', async () => {
    const result = await makeRequest('GET', '/api/v1/books/search?q=三体&page=1&limit=5');
    
    if (!result.success) {
      return { success: false, message: `搜索失败: ${formatError(result.error)}` };
    }
    
    if (result.data.success) {
      const books = result.data.data?.hits || result.data.data;
      return { success: true, message: `搜索到${Array.isArray(books) ? books.length : 0}本相关图书` };
    }
    
    return { success: false, message: '搜索响应格式不正确' };
  }, 'books', 'high');

  // 测试热门图书
  await runTest('获取热门图书', async () => {
    const result = await makeRequest('GET', '/api/v1/books/popular?limit=5');
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data && Array.isArray(result.data.data.books)) {
      return { success: true, message: `获取到${result.data.data.books.length}本热门图书` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'books', 'medium');

  // 测试图书分类
  await runTest('获取图书分类', async () => {
    const result = await makeRequest('GET', '/api/v1/books/categories');
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data && Array.isArray(result.data.data.categories)) {
      return { success: true, message: `获取到${result.data.data.categories.length}个分类` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'books', 'medium');

  // 测试图书详情
  await runTest('获取图书详情', async () => {
    // 先获取一本图书ID
    const listResult = await makeRequest('GET', '/api/v1/books?limit=1');
    if (!listResult.success || !listResult.data.data.books?.length) {
      return { success: false, message: '无法获取图书列表用于测试' };
    }
    
    const bookId = listResult.data.data.books[0].id;
    testData.testBook.id = bookId;
    
    const result = await makeRequest('GET', `/api/v1/books/${bookId}`);
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data.id === bookId) {
      return { success: true, message: '成功获取图书详情' };
    }
    
    return { success: false, message: '图书详情不正确' };
  }, 'books', 'high');
}

/**
 * ==================== 用户管理测试 ====================
 */
async function testUsers() {
  console.log(`\n${colors.bright}${colors.cyan}=== 用户管理测试 ===${colors.reset}`);

  // 测试获取用户列表 (需要管理员权限)
  await runTest('获取用户列表', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/users?page=1&limit=10', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data.users) {
      return { success: true, message: `获取到${result.data.data.users.length}个用户` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'users', 'high');

  // 测试用户统计
  await runTest('获取用户统计', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/users/statistics', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data.statistics && typeof result.data.data.statistics.total === 'number') {
      return { success: true, message: `统计信息: 总用户${result.data.data.statistics.total}人` };
    }
    
    return { success: false, message: '统计信息格式不正确' };
  }, 'users', 'medium'); 

  // 测试用户搜索
  await runTest('搜索用户', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/users/search?q=admin&limit=5', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `搜索失败: ${formatError(result.error)}` };
    }
    
    if (result.data.success) {
      const users = result.data.data?.users || result.data.data;
      return { success: true, message: `搜索到${Array.isArray(users) ? users.length : 0}个用户` };
    }
    
    return { success: false, message: '搜索响应格式不正确' };
  }, 'users', 'medium');
}

/**
 * ==================== 借阅管理测试 ====================
 */
async function testBorrows() {
  console.log(`\n${colors.bright}${colors.cyan}=== 借阅管理测试 ===${colors.reset}`);

  // 测试获取借阅列表
  await runTest('获取借阅列表', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/borrows?page=1&limit=10', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const borrows = result.data.data?.borrows || result.data.data;
      return { success: true, message: `获取到${Array.isArray(borrows) ? borrows.length : 0}条借阅记录` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'borrows', 'high');

  // 测试借阅统计
  await runTest('获取借阅统计', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/borrows/statistics', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取借阅统计信息' };
    }
    
    return { success: false, message: '统计信息格式不正确' };
  }, 'borrows', 'medium');

  // 测试逾期记录
  await runTest('获取逾期记录', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/borrows/overdue', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const overdue = result.data.data;
      return { success: true, message: `获取到${Array.isArray(overdue) ? overdue.length : 0}条逾期记录` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'borrows', 'high');
}

/**
 * ==================== 评论系统测试 ====================
 */
async function testReviews() {
  console.log(`\n${colors.bright}${colors.cyan}=== 评论系统测试 ===${colors.reset}`);

  // 测试获取我的评论
  await runTest('获取我的评论', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/reviews/my?page=1&limit=10', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const reviews = result.data.data?.reviews || result.data.data;
      return { success: true, message: `获取到${Array.isArray(reviews) ? reviews.length : 0}条评论` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'reviews', 'medium');

  // 测试评论统计 (管理员)
  await runTest('获取评论统计', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/reviews/statistics', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取评论统计信息' };
    }
    
    return { success: false, message: '统计信息格式不正确' };
  }, 'reviews', 'medium');
}

/**
 * ==================== 积分系统测试 ====================
 */
async function testPoints() {
  console.log(`\n${colors.bright}${colors.cyan}=== 积分系统测试 ===${colors.reset}`);

  // 测试获取积分规则
  await runTest('获取积分规则', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/points/rules', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      return { success: true, message: '成功获取积分规则' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'points', 'medium');

  // 测试获取我的积分
  await runTest('获取我的积分', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/points/me', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const points = result.data.data;
      return { success: true, message: `当前积分: ${points.balance || 0}` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'points', 'medium');

  // 测试积分排行榜
  await runTest('获取积分排行榜', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/points/leaderboard?limit=10', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const leaderboard = result.data.data;
      return { success: true, message: `获取到${Array.isArray(leaderboard) ? leaderboard.length : 0}个排行记录` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'points', 'medium');
}

/**
 * ==================== 分析统计测试 ====================
 */
async function testAnalytics() {
  console.log(`\n${colors.bright}${colors.cyan}=== 分析统计测试 ===${colors.reset}`);

  // 测试仪表板数据
  await runTest('获取仪表板数据', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/analytics/dashboard', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取仪表板数据' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'analytics', 'high');

  // 测试概览统计
  await runTest('获取概览统计', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/analytics/overview', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取概览统计' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'analytics', 'high');

  // 测试趋势分析
  await runTest('获取趋势分析', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/analytics/trends?period=30d', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      return { success: true, message: '成功获取趋势分析' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'analytics', 'medium');
}

/**
 * ==================== 通知系统测试 ====================
 */
async function testNotifications() {
  console.log(`\n${colors.bright}${colors.cyan}=== 通知系统测试 ===${colors.reset}`);

  // 测试获取通知列表
  await runTest('获取通知列表', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/notifications?page=1&limit=10', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success) {
      const notifications = result.data.data?.notifications || result.data.data;
      return { success: true, message: `获取到${Array.isArray(notifications) ? notifications.length : 0}条通知` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'notifications', 'medium');

  // 测试未读消息数量
  await runTest('获取未读消息数量', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要认证' };
    }
    
    const result = await makeRequest('GET', '/api/v1/notifications/unread-count', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data.count === 'number') {
      return { success: true, message: `未读消息: ${result.data.data.count}条` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'notifications', 'medium');
}

/**
 * ==================== 系统健康测试 ====================
 */
async function testHealth() {
  console.log(`\n${colors.bright}${colors.cyan}=== 系统健康测试 ===${colors.reset}`);

  // 测试系统状态
  await runTest('检查系统状态', async () => {
    const result = await makeRequest('GET', '/api/v1/health/status');
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && result.data.data.overall?.overallStatus) {
      return { success: true, message: `系统状态: ${result.data.data.overall.overallStatus}` };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'health', 'high');

  // 测试健康概览
  await runTest('获取健康概览', async () => {
    const result = await makeRequest('GET', '/api/v1/health/overview');
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取健康概览' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'health', 'high');

  // 测试系统指标 (需要管理员权限)
  await runTest('获取系统指标', async () => {
    if (!authTokens.admin) {
      return { success: false, message: '需要管理员权限' };
    }
    
    const result = await makeRequest('GET', '/api/v1/health/metrics', null, {
      'Authorization': `Bearer ${authTokens.admin}`
    });
    
    if (!result.success) {
      return { success: false, message: `请求失败: ${result.message || 'Unknown error'}`, error: result.error };
    }
    
    if (result.data.success && typeof result.data.data === 'object') {
      return { success: true, message: '成功获取系统指标' };
    }
    
    return { success: false, message: '响应格式不正确' };
  }, 'health', 'medium');
}

/**
 * ==================== 错误处理测试 ====================
 */
async function testErrorHandling() {
  console.log(`\n${colors.bright}${colors.cyan}=== 错误处理测试 ===${colors.reset}`);

  // 测试404错误
  await runTest('测试404错误处理', async () => {
    const result = await makeRequest('GET', '/api/v1/nonexistent-endpoint');
    
    if (result.status === 404) {
      return { success: true, message: '404错误处理正常' };
    }
    
    return { success: false, message: `期望404，实际: ${result.status}`, error: result.error };
  }, 'error', 'medium');

  // 测试未授权访问
  await runTest('测试未授权访问', async () => {
    const result = await makeRequest('GET', '/api/v1/users');
    
    if (result.status === 401) {
      return { success: true, message: '未授权访问处理正常' };
    }
    
    return { success: false, message: `期望401，实际: ${result.status}` };
  }, 'error', 'medium');

  // 测试无效ID格式
  await runTest('测试无效ID格式', async () => {
    const result = await makeRequest('GET', '/api/v1/books/invalid-id');
    
    if (result.status >= 400 && result.status < 500) {
      return { success: true, message: '无效ID错误处理正常' };
    }
    
    return { success: false, message: `期望4xx错误，实际: ${result.status}` };
  }, 'error', 'medium');
}

/**
 * ==================== 主测试执行器 ====================
 */
async function runAllTests() {
  const startTime = Date.now();
  
  console.log(`${colors.bright}${colors.blue}开始执行全面API端点测试...${colors.reset}`);
  console.log(`目标服务器: ${BASE_URL}`);
  console.log(`测试配置: 超时${TEST_CONFIG.timeout}ms, 重试${TEST_CONFIG.retries}次\n`);

  try {
    // 按优先级执行测试
    await testAuthentication();  // 必须先执行，获取认证token
    await testBooks();
    await testUsers();
    await testBorrows();
    await testReviews();
    await testPoints();
    await testAnalytics();
    await testNotifications();
    await testHealth();
    await testErrorHandling();

  } catch (error) {
    console.error(`${colors.red}测试执行异常: ${error.message}${colors.reset}`);
    testResults.failed++;
  }

  // 输出测试结果总结
  const duration = Date.now() - startTime;
  
  console.log(`\n${colors.bright}${colors.cyan}=== 测试结果总结 ===${colors.reset}`);
  console.log(`总测试数: ${colors.blue}${testResults.total}${colors.reset}`);
  console.log(`通过: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`失败: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`跳过: ${colors.yellow}${testResults.skipped}${colors.reset}`);
  console.log(`总耗时: ${colors.cyan}${duration}ms${colors.reset}`);
  console.log(`成功率: ${colors.bright}${((testResults.passed / testResults.total) * 100).toFixed(1)}%${colors.reset}`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n${colors.red}${colors.bright}失败详情:${colors.reset}`);
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.category}] ${error.test}`);
      console.log(`   错误: ${error.message}`);
      if (error.error) {
        if (typeof error.error === 'object') {
          console.log(`   详情: ${JSON.stringify(error.error, null, 2)}`);
        } else {
          console.log(`   详情: ${error.error}`);
        }
      }
    });
  }

  const overallStatus = testResults.failed === 0 ? 'SUCCESS' : 'FAILED';
  const statusColor = testResults.failed === 0 ? colors.green : colors.red;
  
  console.log(`\n${colors.bright}${statusColor}=== 测试${overallStatus} ===${colors.reset}`);
  
  // 返回退出码
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// 启动测试
runAllTests().catch(error => {
  console.error(`${colors.red}测试启动失败: ${error.message}${colors.reset}`);
  process.exit(1);
});