# 📋 借阅API文档

借阅模块是图书馆管理系统的核心功能，处理所有与图书借阅相关的操作，包括借书、还书、续借、逾期管理等完整的借阅流程。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/borrows` | 借阅图书 | Authenticated |
| GET | `/borrows` | 获取借阅列表 | Admin |
| GET | `/borrows/:id` | 获取借阅详情 | Admin/Owner |
| PUT | `/borrows/:id/return` | 归还图书 | Admin/Owner |
| PUT | `/borrows/:id/renew` | 续借图书 | Admin/Owner |
| GET | `/borrows/my` | 获取我的借阅记录 | Authenticated |
| GET | `/borrows/overdue` | 获取逾期借阅 | Admin |
| PUT | `/borrows/:id/extend` | 延期借阅 | Admin |
| POST | `/borrows/:id/fine` | 处理罚金 | Admin |
| GET | `/borrows/statistics` | 借阅统计 | Admin |

## 📚 借阅图书

### 请求
```http
POST /api/v1/borrows
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "bookId": 1,
  "borrowDays": 30,
  "notes": "急需参考，希望优先处理"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| bookId | number | ✅ | 图书ID |
| borrowDays | number | ❌ | 借阅天数 (默认30天) |
| notes | string | ❌ | 借阅备注 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 201,
  "message": "Book borrowed successfully",
  "data": {
    "id": 456,
    "userId": 123,
    "bookId": 1,
    "book": {
      "title": "JavaScript高级程序设计",
      "authors": ["马特·弗里斯比"],
      "isbn": "9787115545381",
      "coverImage": "https://example.com/covers/js-book.jpg"
    },
    "borrowDate": "2025-01-12T10:30:00.000Z",
    "dueDate": "2025-02-11T23:59:59.000Z",
    "status": "borrowed",
    "borrowDays": 30,
    "renewalCount": 0,
    "maxRenewals": 2,
    "pointsEarned": 10,
    "borrowLocation": "总台",
    "notes": "急需参考，希望优先处理"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📖 获取借阅列表

### 请求
```http
GET /api/v1/borrows?status=borrowed&page=1&limit=20&sortBy=borrowDate
Authorization: Bearer <admin_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| page | number | ❌ | 页码 | 1 |
| limit | number | ❌ | 每页数量 | 20 |
| status | string | ❌ | 借阅状态 | - |
| userId | number | ❌ | 用户ID | - |
| bookId | number | ❌ | 图书ID | - |
| startDate | string | ❌ | 开始日期 | - |
| endDate | string | ❌ | 结束日期 | - |
| sortBy | string | ❌ | 排序字段 | borrowDate |
| sortOrder | string | ❌ | 排序方向 | desc |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Borrows retrieved successfully",
  "data": [
    {
      "id": 456,
      "userId": 123,
      "user": {
        "username": "reader001",
        "realName": "张三",
        "phone": "13800138000"
      },
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "isbn": "9787115545381",
        "coverImage": "https://example.com/covers/js-book.jpg"
      },
      "borrowDate": "2025-01-12T10:30:00.000Z",
      "dueDate": "2025-02-11T23:59:59.000Z",
      "status": "borrowed",
      "borrowDays": 30,
      "renewalCount": 0,
      "maxRenewals": 2,
      "overdueStatus": "none",
      "remainingDays": 30,
      "pointsEarned": 10,
      "borrowLocation": "总台"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📄 获取借阅详情

### 请求
```http
GET /api/v1/borrows/456
Authorization: Bearer <admin_token_or_owner_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Borrow details retrieved successfully",
  "data": {
    "id": 456,
    "userId": 123,
    "user": {
      "id": 123,
      "username": "reader001",
      "realName": "张三",
      "email": "reader@example.com",
      "phone": "13800138000",
      "avatar": "https://example.com/avatars/123.jpg"
    },
    "bookId": 1,
    "book": {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "subtitle": "第4版",
      "authors": ["马特·弗里斯比"],
      "isbn": "9787115545381",
      "publisher": "人民邮电出版社",
      "coverImage": "https://example.com/covers/js-book.jpg",
      "location": "A区2层技术书架001",
      "callNumber": "TP312/M123"
    },
    "borrowDate": "2025-01-12T10:30:00.000Z",
    "dueDate": "2025-02-11T23:59:59.000Z",
    "returnDate": null,
    "actualReturnDate": null,
    "status": "borrowed",
    "borrowDays": 30,
    "renewalCount": 0,
    "maxRenewals": 2,
    "overdueStatus": "none",
    "remainingDays": 30,
    "fine": 0.00,
    "finePaid": false,
    "condition": "good",
    "pointsEarned": 10,
    "pointsDeducted": 0,
    "borrowLocation": "总台",
    "borrowNotes": "急需参考，希望优先处理",
    "notificationsSent": [
      {
        "type": "borrow_confirmation",
        "sentAt": "2025-01-12T10:30:00.000Z",
        "method": "email"
      }
    ],
    "renewalHistory": [],
    "timeline": [
      {
        "action": "borrowed",
        "timestamp": "2025-01-12T10:30:00.000Z",
        "description": "用户成功借阅图书",
        "processedBy": null
      }
    ],
    "createdAt": "2025-01-12T10:30:00.000Z",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📤 归还图书

### 请求
```http
PUT /api/v1/borrows/456/return
Authorization: Bearer <admin_token_or_owner_token>
Content-Type: application/json

{
  "returnLocation": "总台",
  "condition": "good",
  "notes": "图书状态良好，按时归还"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| returnLocation | string | ❌ | 归还地点 |
| condition | string | ❌ | 图书状态 (good/damaged/lost) |
| notes | string | ❌ | 归还备注 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book returned successfully",
  "data": {
    "id": 456,
    "userId": 123,
    "bookId": 1,
    "borrowDate": "2025-01-12T10:30:00.000Z",
    "dueDate": "2025-02-11T23:59:59.000Z",
    "returnDate": "2025-01-20T14:30:00.000Z",
    "actualReturnDate": "2025-01-20T14:30:00.000Z",
    "status": "returned",
    "isOnTime": true,
    "returnDays": 8,
    "pointsEarned": 15,
    "condition": "good",
    "returnLocation": "总台",
    "returnNotes": "图书状态良好，按时归还"
  },
  "timestamp": "2025-01-20T14:30:00.000Z"
}
```

## 🔄 续借图书

### 请求
```http
PUT /api/v1/borrows/456/renew
Authorization: Bearer <admin_token_or_owner_token>
Content-Type: application/json

{
  "renewalDays": 30,
  "reason": "继续深入学习"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| renewalDays | number | ❌ | 续借天数 (默认30天) |
| reason | string | ❌ | 续借原因 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book renewed successfully",
  "data": {
    "id": 456,
    "userId": 123,
    "bookId": 1,
    "previousDueDate": "2025-02-11T23:59:59.000Z",
    "newDueDate": "2025-03-13T23:59:59.000Z",
    "renewalCount": 1,
    "maxRenewals": 2,
    "renewalDays": 30,
    "remainingRenewals": 1,
    "renewalDate": "2025-01-20T14:30:00.000Z",
    "reason": "继续深入学习"
  },
  "timestamp": "2025-01-20T14:30:00.000Z"
}
```

## 📱 获取我的借阅记录

### 请求
```http
GET /api/v1/borrows/my?status=all&page=1&limit=10
Authorization: Bearer <user_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | string | ❌ | 借阅状态 (all/borrowed/returned/overdue) |
| page | number | ❌ | 页码 |
| limit | number | ❌ | 每页数量 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "My borrows retrieved successfully",
  "data": [
    {
      "id": 456,
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "coverImage": "https://example.com/covers/js-book.jpg",
        "hasEbook": true
      },
      "borrowDate": "2025-01-12T10:30:00.000Z",
      "dueDate": "2025-02-11T23:59:59.000Z",
      "status": "borrowed",
      "renewalCount": 0,
      "maxRenewals": 2,
      "canRenew": true,
      "remainingDays": 30,
      "overdueStatus": "none",
      "pointsEarned": 10
    }
  ],
  "summary": {
    "totalBorrows": 28,
    "currentBorrows": 2,
    "completedBorrows": 26,
    "overdueCount": 0,
    "totalFines": 0.00,
    "totalPointsEarned": 340
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ⚠️ 获取逾期借阅

### 请求
```http
GET /api/v1/borrows/overdue?page=1&limit=20&sortBy=overduedays
Authorization: Bearer <admin_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Overdue borrows retrieved successfully",
  "data": [
    {
      "id": 789,
      "userId": 456,
      "user": {
        "username": "reader002",
        "realName": "李四",
        "phone": "13900139000",
        "email": "li@example.com"
      },
      "bookId": 2,
      "book": {
        "title": "深入理解计算机系统",
        "authors": ["兰德尔·布莱恩特"],
        "isbn": "9787111234568"
      },
      "borrowDate": "2024-12-01T10:00:00.000Z",
      "dueDate": "2024-12-31T23:59:59.000Z",
      "status": "overdue",
      "overdueDays": 12,
      "fine": 12.00,
      "finePaid": false,
      "lastNotificationSent": "2025-01-10T09:00:00.000Z",
      "notificationsSent": [
        {
          "type": "overdue_reminder",
          "sentAt": "2025-01-05T09:00:00.000Z",
          "method": "email"
        },
        {
          "type": "final_notice",
          "sentAt": "2025-01-10T09:00:00.000Z",
          "method": "sms"
        }
      ]
    }
  ],
  "overdueStats": {
    "totalOverdue": 15,
    "totalFines": 180.00,
    "averageOverdueDays": 8.5,
    "unpaidFines": 165.00
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ⏰ 延期借阅

### 请求
```http
PUT /api/v1/borrows/456/extend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "extensionDays": 7,
  "reason": "学生考试期间特殊情况",
  "waiveFine": true
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| extensionDays | number | ✅ | 延期天数 |
| reason | string | ✅ | 延期原因 |
| waiveFine | boolean | ❌ | 是否免除罚金 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Borrow extended successfully",
  "data": {
    "id": 456,
    "previousDueDate": "2025-02-11T23:59:59.000Z",
    "newDueDate": "2025-02-18T23:59:59.000Z",
    "extensionDays": 7,
    "reason": "学生考试期间特殊情况",
    "waiveFine": true,
    "processedBy": 1,
    "processedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 💰 处理罚金

### 请求
```http
POST /api/v1/borrows/456/fine
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "pay",
  "amount": 12.00,
  "paymentMethod": "cash",
  "notes": "现金支付逾期罚金"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| action | string | ✅ | 操作类型 (pay/waive/adjust) |
| amount | number | ❌ | 金额 (action为pay时必填) |
| paymentMethod | string | ❌ | 支付方式 |
| notes | string | ❌ | 处理备注 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Fine processed successfully",
  "data": {
    "borrowId": 456,
    "action": "pay",
    "previousFine": 12.00,
    "currentFine": 0.00,
    "amountProcessed": 12.00,
    "paymentMethod": "cash",
    "finePaid": true,
    "processedBy": 1,
    "processedAt": "2025-01-12T10:30:00.000Z",
    "notes": "现金支付逾期罚金"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📊 借阅统计

### 请求
```http
GET /api/v1/borrows/statistics?period=month&includeOverdue=true
Authorization: Bearer <admin_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| period | string | ❌ | 统计周期 (day/week/month/year) |
| includeOverdue | boolean | ❌ | 是否包含逾期统计 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Borrow statistics retrieved successfully",
  "data": {
    "overview": {
      "totalBorrows": 1245,
      "activeBorrows": 456,
      "completedBorrows": 789,
      "overdueBorrows": 15,
      "borrowsThisPeriod": 89
    },
    "borrowTrend": [
      {
        "date": "2025-01-01",
        "borrows": 12,
        "returns": 8
      },
      {
        "date": "2025-01-02",
        "borrows": 15,
        "returns": 12
      }
    ],
    "popularBooks": [
      {
        "bookId": 1,
        "title": "JavaScript高级程序设计",
        "borrowCount": 156,
        "rank": 1
      }
    ],
    "userActivity": {
      "activeUsers": 234,
      "averageBorrowsPerUser": 2.3,
      "topBorrowers": [
        {
          "userId": 123,
          "username": "reader001",
          "borrowCount": 8
        }
      ]
    },
    "overdueStats": {
      "totalOverdue": 15,
      "totalFines": 180.00,
      "averageOverdueDays": 8.5,
      "overdueRate": 3.3
    },
    "categoryStats": [
      {
        "category": "技术",
        "borrowCount": 345,
        "percentage": 38.5
      }
    ]
  },
  "periodInfo": {
    "period": "month",
    "startDate": "2024-12-12",
    "endDate": "2025-01-12"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `BOOK_NOT_AVAILABLE` | 409 | 图书不可借阅 | 等待图书归还或选择其他图书 |
| `USER_BORROW_LIMIT_EXCEEDED` | 409 | 超出借阅限制 | 归还部分图书后再借阅 |
| `BOOK_ALREADY_BORROWED` | 409 | 图书已被借阅 | 选择其他图书或预约 |
| `BORROW_NOT_FOUND` | 404 | 借阅记录不存在 | 检查借阅记录ID |
| `CANNOT_RENEW` | 409 | 无法续借 | 检查续借次数限制 |
| `BOOK_OVERDUE` | 409 | 图书已逾期 | 先处理逾期罚金 |
| `INVALID_RETURN_CONDITION` | 400 | 无效的归还状态 | 使用正确的状态值 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 借阅图书
const borrowBook = async (bookId, borrowDays = 30) => {
  const response = await fetchWithAuth('/api/v1/borrows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bookId,
      borrowDays
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};

// 续借图书
const renewBook = async (borrowId, reason) => {
  const response = await fetchWithAuth(`/api/v1/borrows/${borrowId}/renew`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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

### 小程序示例
```javascript
// 获取我的借阅记录
const getMyBorrows = () => {
  uni.request({
    url: '/api/v1/borrows/my',
    method: 'GET',
    header: {
      'Authorization': `Bearer ${this.token}`
    },
    success: (res) => {
      if (res.data.success) {
        this.borrowList = res.data.data;
        this.borrowSummary = res.data.summary;
      }
    }
  });
};
```

---

📝 **注意**: 借阅操作会自动更新图书库存和用户积分。逾期图书需要处理罚金后才能继续借阅新书。