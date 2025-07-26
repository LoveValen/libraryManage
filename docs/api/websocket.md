# 🔗 WebSocket实时通信 API

基于Socket.IO的企业级实时通信系统，支持双向实时数据交换、房间管理、连接状态监控等功能。

## 🌐 基础信息

**连接端点**: `ws://localhost:5000` (开发) / `wss://yourdomain.com` (生产)  
**协议**: Socket.IO 4.x  
**认证**: JWT Token验证  
**命名空间**: 支持多命名空间隔离

## 🔌 连接管理

### 客户端连接
```javascript
// 基础连接
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your_jwt_token_here'
  },
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// 带命名空间的连接
const notificationSocket = io('/notifications', {
  auth: { token: 'your_jwt_token' }
});

const adminSocket = io('/admin', {
  auth: { token: 'admin_jwt_token' }
});
```

### 连接事件处理
```javascript
// 连接成功
socket.on('connect', () => {
  console.log('WebSocket连接已建立:', socket.id);
  console.log('用户认证状态:', socket.auth);
});

// 认证成功
socket.on('authenticated', (data) => {
  console.log('用户认证成功:', data);
  // data: { userId: 123, username: 'user123', role: 'user' }
});

// 认证失败
socket.on('authentication_error', (error) => {
  console.error('认证失败:', error);
  socket.disconnect();
});

// 连接断开
socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
  if (reason === 'io server disconnect') {
    // 服务器主动断开，需要重新连接
    socket.connect();
  }
});

// 连接错误
socket.on('connect_error', (error) => {
  console.error('连接错误:', error);
});

// 重连尝试
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`第${attemptNumber}次重连尝试...`);
});

// 重连成功
socket.on('reconnect', (attemptNumber) => {
  console.log(`第${attemptNumber}次重连成功`);
});
```

## 📨 通知系统事件

### 接收通知
```javascript
// 新通知
socket.on('notification:new', (notification) => {
  console.log('收到新通知:', notification);
  /*
  notification: {
    id: "notif_12345",
    type: "borrow_reminder",
    title: "图书即将到期",
    message: "您借阅的《JavaScript高级程序设计》将于明天到期",
    priority: "medium",
    timestamp: "2025-01-12T10:30:00.000Z",
    actions: [
      {
        type: "button",
        label: "立即续借",
        action: "renew_book",
        data: { borrowId: "borrow_789" }
      }
    ]
  }
  */
  
  // 显示通知UI
  showNotification(notification);
  
  // 自动确认收到
  socket.emit('notification:acknowledge', {
    notificationId: notification.id,
    timestamp: new Date().toISOString()
  });
});

// 通知状态更新
socket.on('notification:status_update', (data) => {
  console.log('通知状态更新:', data);
  /*
  data: {
    notificationId: "notif_12345",
    status: "read",
    readAt: "2025-01-12T10:35:00.000Z"
  }
  */
});

// 批量通知
socket.on('notification:batch', (notifications) => {
  console.log(`收到${notifications.length}条批量通知`);
  notifications.forEach(notification => {
    showNotification(notification);
  });
});
```

### 发送通知操作
```javascript
// 标记通知为已读
socket.emit('notification:mark_read', {
  notificationId: 'notif_12345'
}, (response) => {
  if (response.success) {
    console.log('通知已标记为已读');
  }
});

// 执行通知动作
socket.emit('notification:action', {
  notificationId: 'notif_12345',
  action: 'renew_book',
  data: { borrowId: 'borrow_789' }
}, (response) => {
  console.log('动作执行结果:', response);
});

// 订阅特定类型通知
socket.emit('notification:subscribe', {
  types: ['borrow_reminder', 'system_announcement'],
  categories: ['urgent', 'high']
});

// 取消订阅
socket.emit('notification:unsubscribe', {
  types: ['low_priority_updates']
});
```

## 📚 图书相关事件

### 图书状态更新
```javascript
// 图书库存变化
socket.on('book:stock_update', (data) => {
  console.log('图书库存更新:', data);
  /*
  data: {
    bookId: "book_123",
    title: "JavaScript高级程序设计",
    previousStock: 3,
    currentStock: 2,
    changeType: "borrowed",
    timestamp: "2025-01-12T10:30:00.000Z"
  }
  */
  
  // 更新界面库存显示
  updateBookStock(data.bookId, data.currentStock);
});

// 新书上架
socket.on('book:new_arrival', (book) => {
  console.log('新书上架:', book);
  showNewBookNotification(book);
});

// 图书状态变更
socket.on('book:status_change', (data) => {
  /*
  data: {
    bookId: "book_123",
    previousStatus: "available",
    currentStatus: "maintenance",
    reason: "损坏维修"
  }
  */
});
```

### 图书操作
```javascript
// 预约图书
socket.emit('book:reserve', {
  bookId: 'book_123',
  userId: 456
}, (response) => {
  if (response.success) {
    console.log('预约成功:', response.data);
  } else {
    console.error('预约失败:', response.error);
  }
});

// 取消预约
socket.emit('book:cancel_reservation', {
  bookId: 'book_123',
  userId: 456
});
```

## 👥 用户状态事件

### 用户在线状态
```javascript
// 用户上线
socket.on('user:online', (data) => {
  console.log('用户上线:', data);
  /*
  data: {
    userId: 123,
    username: "user123",
    lastSeen: "2025-01-12T10:30:00.000Z"
  }
  */
});

// 用户下线
socket.on('user:offline', (data) => {
  console.log('用户下线:', data);
});

// 用户状态变更
socket.on('user:status_change', (data) => {
  /*
  data: {
    userId: 123,
    previousStatus: "active",
    currentStatus: "away",
    timestamp: "2025-01-12T10:30:00.000Z"
  }
  */
});
```

### 用户操作广播
```javascript
// 用户借书
socket.on('user:book_borrowed', (data) => {
  /*
  data: {
    userId: 123,
    username: "user123",
    bookId: "book_456",
    bookTitle: "Vue.js实战",
    borrowDate: "2025-01-12T10:30:00.000Z",
    dueDate: "2025-02-12T23:59:59.999Z"
  }
  */
});

// 用户还书
socket.on('user:book_returned', (data) => {
  /*
  data: {
    userId: 123,
    bookId: "book_456",
    returnDate: "2025-01-15T14:30:00.000Z",
    isOverdue: false
  }
  */
});
```

## 🎯 推荐系统事件

### 实时推荐
```javascript
// 新推荐生成
socket.on('recommendation:new', (recommendations) => {
  console.log('收到新推荐:', recommendations);
  /*
  recommendations: [
    {
      bookId: "book_789",
      title: "深度学习入门",
      score: 0.89,
      reason: "基于您的阅读历史",
      algorithm: "collaborative_filtering"
    }
  ]
  */
  
  updateRecommendationUI(recommendations);
});

// 推荐反馈
socket.emit('recommendation:feedback', {
  recommendationId: 'rec_123',
  bookId: 'book_789',
  feedback: 'positive',
  action: 'clicked'
});
```

## 🔍 搜索协作事件

### 实时搜索
```javascript
// 搜索建议
socket.on('search:suggestions', (suggestions) => {
  updateSearchSuggestions(suggestions);
});

// 热门搜索更新
socket.on('search:trending', (trendingQueries) => {
  updateTrendingSearches(trendingQueries);
});

// 搜索协作
socket.emit('search:query', {
  query: 'JavaScript',
  userId: 123,
  timestamp: new Date().toISOString()
});
```

## 🏛️ 管理员事件

### 系统监控
```javascript
// 仅管理员可接收
socket.on('admin:system_alert', (alert) => {
  console.log('系统告警:', alert);
  /*
  alert: {
    id: "alert_456",
    type: "performance",
    severity: "high",
    message: "数据库响应时间过长",
    timestamp: "2025-01-12T10:30:00.000Z",
    metrics: {
      responseTime: "2.5s",
      threshold: "1.0s"
    }
  }
  */
});

// 用户活动监控
socket.on('admin:user_activity', (activity) => {
  /*
  activity: {
    type: "login",
    userId: 123,
    username: "user123",
    ipAddress: "192.168.1.100",
    timestamp: "2025-01-12T10:30:00.000Z"
  }
  */
});

// 实时统计
socket.on('admin:statistics', (stats) => {
  updateDashboardStats(stats);
});
```

### 管理员操作
```javascript
// 发送系统广播
socket.emit('admin:broadcast', {
  type: 'system_announcement',
  title: '系统维护通知',
  message: '系统将于今晚22:00进行维护',
  priority: 'high',
  targetUsers: 'all' // 或指定用户ID数组
});

// 用户管理操作
socket.emit('admin:user_action', {
  action: 'suspend',
  userId: 456,
  reason: '违反使用规定'
});
```

## 🏠 房间管理

### 加入和离开房间
```javascript
// 加入用户专属房间
socket.emit('room:join', {
  roomName: 'user_123',
  type: 'personal'
});

// 加入公共房间
socket.emit('room:join', {
  roomName: 'general_discussion',
  type: 'public'
});

// 离开房间
socket.emit('room:leave', {
  roomName: 'user_123'
});

// 房间成员变化
socket.on('room:member_joined', (data) => {
  /*
  data: {
    roomName: "general_discussion",
    userId: 456,
    username: "newuser",
    memberCount: 25
  }
  */
});

socket.on('room:member_left', (data) => {
  /*
  data: {
    roomName: "general_discussion",
    userId: 456,
    memberCount: 24
  }
  */
});
```

### 房间消息
```javascript
// 发送房间消息
socket.emit('room:message', {
  roomName: 'general_discussion',
  message: '大家好，有什么好书推荐吗？',
  type: 'text'
});

// 接收房间消息
socket.on('room:message', (data) => {
  /*
  data: {
    roomName: "general_discussion",
    userId: 789,
    username: "bookworm",
    message: "推荐《深度学习》这本书",
    timestamp: "2025-01-12T10:30:00.000Z"
  }
  */
});
```

## 📊 数据同步事件

### 实时数据更新
```javascript
// 数据库数据变更
socket.on('data:updated', (data) => {
  /*
  data: {
    table: "books",
    operation: "update",
    recordId: "book_123",
    changes: {
      title: "JavaScript高级程序设计（第五版）",
      updatedAt: "2025-01-12T10:30:00.000Z"
    }
  }
  */
  
  // 更新本地数据
  updateLocalData(data);
});

// 缓存失效通知
socket.on('cache:invalidate', (data) => {
  /*
  data: {
    keys: ["books:popular", "categories:list"],
    timestamp: "2025-01-12T10:30:00.000Z"
  }
  */
  
  // 清除本地缓存
  invalidateCache(data.keys);
});
```

## 🔧 连接配置和优化

### 高级配置
```javascript
const socket = io('ws://localhost:5000', {
  // 认证配置
  auth: {
    token: localStorage.getItem('accessToken')
  },
  
  // 传输配置
  transports: ['websocket', 'polling'],
  upgrade: true,
  
  // 超时配置
  timeout: 20000,
  
  // 重连配置
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  
  // 性能配置
  forceNew: false,
  rememberUpgrade: true,
  
  // 自定义解析器
  parser: require('socket.io-msgpack-parser')
});
```

### 连接状态监控
```javascript
// 连接状态检查
const checkConnectionStatus = () => {
  return {
    connected: socket.connected,
    id: socket.id,
    transport: socket.io.engine.transport.name,
    upgraded: socket.io.engine.upgraded,
    ping: socket.io.engine.ping,
    readyState: socket.io.engine.readyState
  };
};

// 定期检查连接状态
setInterval(() => {
  const status = checkConnectionStatus();
  console.log('连接状态:', status);
  
  // 如果连接状态异常，尝试重连
  if (!status.connected && status.readyState !== 'opening') {
    socket.connect();
  }
}, 30000);
```

### 心跳检测
```javascript
let heartbeatInterval;

socket.on('connect', () => {
  // 开始心跳
  heartbeatInterval = setInterval(() => {
    socket.emit('heartbeat', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
  }, 30000);
});

socket.on('disconnect', () => {
  // 停止心跳
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
});

// 服务器心跳响应
socket.on('heartbeat_response', (data) => {
  console.log('心跳响应:', data);
  /*
  data: {
    serverTime: 1642075200000,
    latency: 15
  }
  */
});
```

## 🚨 错误处理

### 常见错误处理
```javascript
// 通用错误处理
socket.on('error', (error) => {
  console.error('Socket错误:', error);
  
  switch(error.type) {
    case 'authentication':
      // 认证错误，重新登录
      redirectToLogin();
      break;
    case 'rate_limit':
      // 频率限制，延迟重试
      setTimeout(() => socket.connect(), 5000);
      break;
    case 'server_error':
      // 服务器错误，显示错误信息
      showErrorMessage('服务器暂时不可用，请稍后重试');
      break;
  }
});

// 权限错误
socket.on('permission_denied', (data) => {
  console.error('权限不足:', data);
  showErrorMessage('您没有权限执行此操作');
});

// 业务逻辑错误
socket.on('business_error', (error) => {
  console.error('业务错误:', error);
  /*
  error: {
    code: "BOOK_NOT_AVAILABLE",
    message: "图书当前不可借阅",
    details: {
      bookId: "book_123",
      status: "maintenance"
    }
  }
  */
});
```

### 错误重试机制
```javascript
const retryOperation = (operation, maxRetries = 3) => {
  let retries = 0;
  
  const execute = () => {
    socket.emit(operation.event, operation.data, (response) => {
      if (response.success) {
        operation.onSuccess(response);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(execute, 1000 * retries);
      } else {
        operation.onError(response.error);
      }
    });
  };
  
  execute();
};

// 使用示例
retryOperation({
  event: 'book:reserve',
  data: { bookId: 'book_123', userId: 456 },
  onSuccess: (response) => console.log('预约成功', response),
  onError: (error) => console.error('预约失败', error)
});
```

## 📊 性能监控

### 客户端性能监控
```javascript
// 消息统计
let messageStats = {
  sent: 0,
  received: 0,
  errors: 0,
  averageLatency: 0
};

// 监控发送消息
const originalEmit = socket.emit;
socket.emit = function(...args) {
  messageStats.sent++;
  const startTime = Date.now();
  
  // 如果有回调，计算延迟
  if (typeof args[args.length - 1] === 'function') {
    const originalCallback = args[args.length - 1];
    args[args.length - 1] = function(...callbackArgs) {
      const latency = Date.now() - startTime;
      messageStats.averageLatency = (messageStats.averageLatency + latency) / 2;
      originalCallback.apply(this, callbackArgs);
    };
  }
  
  return originalEmit.apply(this, args);
};

// 监控接收消息
const originalOn = socket.on;
socket.on = function(event, callback) {
  return originalOn.call(this, event, function(...args) {
    messageStats.received++;
    callback.apply(this, args);
  });
};

// 定期报告统计信息
setInterval(() => {
  console.log('WebSocket统计:', messageStats);
  
  // 发送统计到服务器
  socket.emit('client:stats', messageStats);
}, 60000);
```

## 🔗 相关文档

- [Socket.IO官方文档](https://socket.io/docs/v4/)
- [WebSocket协议规范](https://tools.ietf.org/html/rfc6455)
- [实时通知系统架构](../design/realtime-notification.md)
- [性能优化指南](../performance/websocket-optimization.md)

---

⚠️ **实时通信提醒**:
- 确保在HTTPS环境下使用WSS协议
- 适当处理连接断开和重连逻辑
- 监控连接状态和消息传输性能
- 注意服务器端的连接数限制和资源消耗