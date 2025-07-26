# 👥 用户API文档

用户模块提供完整的用户管理功能，包括用户信息管理、权限控制、用户统计等功能。主要用于管理员对用户账户的管理操作。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/users` | 获取用户列表 | Admin |
| GET | `/users/:id` | 获取用户详情 | Admin/Owner |
| PUT | `/users/:id` | 更新用户信息 | Admin |
| DELETE | `/users/:id` | 删除用户 | Admin |
| PUT | `/users/:id/status` | 更新用户状态 | Admin |
| PUT | `/users/:id/role` | 更改用户角色 | Admin |
| GET | `/users/:id/borrows` | 获取用户借阅记录 | Admin/Owner |
| GET | `/users/:id/points` | 获取用户积分详情 | Admin/Owner |
| GET | `/users/statistics` | 获取用户统计信息 | Admin |
| POST | `/users/:id/reset-password` | 重置用户密码 | Admin |

## 📊 获取用户列表

### 请求
```http
GET /api/v1/users?page=1&limit=20&role=patron&status=active&sortBy=createdAt
Authorization: Bearer <admin_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| page | number | ❌ | 页码 | 1 |
| limit | number | ❌ | 每页数量 | 20 |
| role | string | ❌ | 用户角色 (patron/admin) | - |
| status | string | ❌ | 用户状态 | - |
| search | string | ❌ | 搜索关键词 | - |
| sortBy | string | ❌ | 排序字段 | createdAt |
| sortOrder | string | ❌ | 排序方向 | desc |
| emailVerified | boolean | ❌ | 邮箱验证状态 | - |
| loginSince | string | ❌ | 最后登录时间过滤 | - |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 123,
      "username": "reader001",
      "email": "reader@example.com",
      "realName": "张三",
      "phone": "13800138000",
      "avatar": "https://example.com/avatars/123.jpg",
      "role": "patron",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "lastLoginAt": "2025-01-12T09:30:00.000Z",
      "loginCount": 45,
      "points": {
        "balance": 350,
        "level": "READER",
        "levelName": "普通读者"
      },
      "borrowStats": {
        "totalBorrows": 28,
        "currentBorrows": 2,
        "overdueCount": 0
      },
      "createdAt": "2024-11-15T08:00:00.000Z",
      "updatedAt": "2025-01-12T09:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 1245,
    "totalPages": 63,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 👤 获取用户详情

### 请求
```http
GET /api/v1/users/123
Authorization: Bearer <admin_token_or_owner_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User details retrieved successfully",
  "data": {
    "id": 123,
    "username": "reader001",
    "email": "reader@example.com",
    "realName": "张三",
    "phone": "13800138000",
    "avatar": "https://example.com/avatars/123.jpg",
    "bio": "热爱阅读的程序员，专注前端技术学习",
    "wechatOpenid": "oGZUI5Xxx...",
    "role": "patron",
    "status": "active",
    "emailVerified": true,
    "phoneVerified": false,
    "lastLoginAt": "2025-01-12T09:30:00.000Z",
    "lastLoginIp": "192.168.1.100",
    "loginCount": 45,
    "preferences": {
      "language": "zh-CN",
      "notifications": {
        "email": true,
        "push": true,
        "dueDateReminder": true,
        "pointsUpdate": false
      },
      "privacy": {
        "profileVisible": true,
        "readingHistoryVisible": false
      }
    },
    "points": {
      "balance": 350,
      "totalEarned": 580,
      "totalSpent": 230,
      "level": "READER",
      "levelName": "普通读者",
      "nextLevelPoints": 300,
      "progressToNextLevel": 16.67,
      "badgeCount": 5,
      "rankPosition": 156
    },
    "borrowStats": {
      "totalBorrows": 28,
      "currentBorrows": 2,
      "completedBorrows": 26,
      "overdueCount": 0,
      "totalFines": 0.00,
      "averageBorrowDays": 18.5,
      "favoriteCategory": "技术"
    },
    "recentActivity": [
      {
        "type": "borrow",
        "description": "借阅了《Vue.js实战》",
        "timestamp": "2025-01-10T14:30:00.000Z"
      },
      {
        "type": "review",
        "description": "评价了《JavaScript高级程序设计》",
        "timestamp": "2025-01-08T16:45:00.000Z"
      }
    ],
    "createdAt": "2024-11-15T08:00:00.000Z",
    "updatedAt": "2025-01-12T09:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ✏️ 更新用户信息

### 请求
```http
PUT /api/v1/users/123
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "realName": "张三丰",
  "phone": "13900139000",
  "bio": "武当山图书管理员",
  "preferences": {
    "notifications": {
      "email": false,
      "push": true
    }
  }
}
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "id": 123,
    "username": "reader001",
    "realName": "张三丰",
    "phone": "13900139000",
    "bio": "武当山图书管理员",
    "updatedAt": "2025-01-12T10:35:00.000Z"
  },
  "timestamp": "2025-01-12T10:35:00.000Z"
}
```

## 🗑️ 删除用户

### 请求
```http
DELETE /api/v1/users/123
Authorization: Bearer <admin_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User deleted successfully",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔄 更新用户状态

### 请求
```http
PUT /api/v1/users/123/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "违反图书馆规定",
  "expiresAt": "2025-02-12T00:00:00.000Z"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | string | ✅ | 新状态 (active/inactive/suspended/banned) |
| reason | string | ❌ | 状态变更原因 |
| expiresAt | string | ❌ | 状态过期时间 (适用于suspended) |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User status updated successfully",
  "data": {
    "userId": 123,
    "username": "reader001",
    "previousStatus": "active",
    "newStatus": "suspended",
    "reason": "违反图书馆规定",
    "expiresAt": "2025-02-12T00:00:00.000Z",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 👑 更改用户角色

### 请求
```http
PUT /api/v1/users/123/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "admin",
  "reason": "晋升为图书管理员"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| role | string | ✅ | 新角色 (patron/admin) |
| reason | string | ❌ | 角色变更原因 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User role updated successfully",
  "data": {
    "userId": 123,
    "username": "reader001",
    "previousRole": "patron",
    "newRole": "admin",
    "reason": "晋升为图书管理员",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📚 获取用户借阅记录

### 请求
```http
GET /api/v1/users/123/borrows?status=borrowed&page=1&limit=10
Authorization: Bearer <admin_token_or_owner_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | string | ❌ | 借阅状态 |
| page | number | ❌ | 页码 |
| limit | number | ❌ | 每页数量 |
| sortBy | string | ❌ | 排序字段 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User borrows retrieved successfully",
  "data": [
    {
      "id": 456,
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "coverImage": "https://example.com/covers/js-book.jpg"
      },
      "borrowDate": "2025-01-05T10:00:00.000Z",
      "dueDate": "2025-02-04T23:59:59.000Z",
      "status": "borrowed",
      "renewalCount": 1,
      "pointsEarned": 10,
      "borrowDays": 30
    }
  ],
  "borrowStats": {
    "totalBorrows": 28,
    "currentBorrows": 2,
    "completedBorrows": 26,
    "overdueCount": 0
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 28,
    "totalPages": 3
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎮 获取用户积分详情

### 请求
```http
GET /api/v1/users/123/points?includeTransactions=true&page=1&limit=20
Authorization: Bearer <admin_token_or_owner_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| includeTransactions | boolean | ❌ | 是否包含交易记录 |
| page | number | ❌ | 页码 |
| limit | number | ❌ | 每页数量 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User points retrieved successfully",
  "data": {
    "userId": 123,
    "balance": 350,
    "totalEarned": 580,
    "totalSpent": 230,
    "level": "READER",
    "levelName": "普通读者",
    "nextLevelPoints": 300,
    "progressToNextLevel": 16.67,
    "badgeCount": 5,
    "rankPosition": 156,
    "pointsBreakdown": {
      "borrowPoints": 280,
      "reviewPoints": 200,
      "bonusPoints": 100,
      "penaltyPoints": 50
    },
    "transactions": [
      {
        "id": 789,
        "pointsChange": 25,
        "currentBalance": 350,
        "transactionType": "WRITE_REVIEW",
        "description": "评价图书《JavaScript高级程序设计》",
        "createdAt": "2025-01-08T16:45:00.000Z"
      },
      {
        "id": 788,
        "pointsChange": 10,
        "currentBalance": 325,
        "transactionType": "BORROW_BOOK",
        "description": "借阅图书《Vue.js实战》",
        "createdAt": "2025-01-05T10:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📊 获取用户统计信息

### 请求
```http
GET /api/v1/users/statistics?period=month
Authorization: Bearer <admin_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| period | string | ❌ | 统计周期 (day/week/month/year) |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User statistics retrieved successfully",
  "data": {
    "overview": {
      "totalUsers": 1245,
      "activeUsers": 1180,
      "newUsersThisPeriod": 45,
      "inactiveUsers": 65
    },
    "usersByRole": {
      "patron": 1234,
      "admin": 11
    },
    "usersByStatus": {
      "active": 1180,
      "inactive": 50,
      "suspended": 10,
      "banned": 5
    },
    "registrationTrend": [
      {
        "date": "2025-01-01",
        "count": 8
      },
      {
        "date": "2025-01-02",
        "count": 12
      }
    ],
    "loginActivity": {
      "dailyLogins": 245,
      "weeklyLogins": 890,
      "monthlyLogins": 1180
    },
    "topActiveUsers": [
      {
        "id": 123,
        "username": "reader001",
        "totalBorrows": 28,
        "pointsBalance": 350,
        "lastLoginAt": "2025-01-12T09:30:00.000Z"
      }
    ],
    "verificationStats": {
      "emailVerified": 1100,
      "phoneVerified": 450,
      "bothVerified": 420
    }
  },
  "periodInfo": {
    "period": "month",
    "startDate": "2024-12-12",
    "endDate": "2025-01-12"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔄 重置用户密码

### 请求
```http
POST /api/v1/users/123/reset-password
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newPassword": "NewPassword123",
  "notifyUser": true,
  "reason": "用户申请重置密码"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| newPassword | string | ❌ | 新密码(不提供则系统生成) |
| notifyUser | boolean | ❌ | 是否通知用户 |
| reason | string | ❌ | 重置原因 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": {
    "userId": 123,
    "username": "reader001",
    "temporaryPassword": "Temp123456",
    "passwordExpiry": "2025-01-19T10:30:00.000Z",
    "notificationSent": true,
    "resetAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `USER_NOT_FOUND` | 404 | 用户不存在 | 检查用户ID |
| `CANNOT_DELETE_ADMIN` | 403 | 不能删除管理员 | 先降级为普通用户 |
| `USER_HAS_ACTIVE_BORROWS` | 409 | 用户有未归还图书 | 等待图书归还后删除 |
| `INVALID_STATUS` | 400 | 无效的用户状态 | 使用有效的状态值 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 | 确认管理员权限 |
| `CANNOT_MODIFY_SELF` | 409 | 不能修改自己的角色/状态 | 请其他管理员操作 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 获取用户列表
const getUsers = async (filters = {}) => {
  const params = new URLSearchParams({
    page: 1,
    limit: 20,
    ...filters
  });
  
  const response = await fetchWithAuth(`/api/v1/users?${params}`);
  const data = await response.json();
  
  return data.success ? data.data : [];
};

// 更新用户状态
const updateUserStatus = async (userId, status, reason) => {
  const response = await fetchWithAuth(`/api/v1/users/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status,
      reason
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};
```

### 搜索用户
```javascript
// 搜索用户
const searchUsers = async (query) => {
  const response = await fetchWithAuth(`/api/v1/users?search=${encodeURIComponent(query)}`);
  const data = await response.json();
  
  return data.success ? data.data : [];
};
```

---

📝 **注意**: 用户管理功能仅限管理员使用。用户只能查看和修改自己的信息，不能访问其他用户的详细信息。