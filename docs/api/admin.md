# 👑 管理员 API

企业级管理员控制面板API，提供系统配置、用户管理、权限控制、系统监控、数据分析等全方位管理功能。

## 🌐 基础信息

**基础路径**: `/admin`  
**权限要求**: 管理员角色  
**认证方式**: Bearer Token (JWT)  
**特殊权限**: 超级管理员、系统管理员、业务管理员

## 👥 用户管理

### 获取用户列表
```http
GET /admin/users
```

**权限**: 管理员

**查询参数**:
```
search: 搜索关键词 (用户名/邮箱/姓名)
role: 角色过滤 (admin/librarian/user)
status: 状态过滤 (active/inactive/suspended/pending)
registrationDate: 注册日期范围
lastLoginDate: 最后登录日期范围
sortBy: 排序字段 (username/email/lastLogin/createdAt)
sortOrder: 排序方向 (asc/desc)
page: 页码
limit: 每页数量
includeStats: 包含统计信息 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "realName": "John Doe",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "avatar": "https://cdn.yourdomain.com/avatars/123.jpg",
      "lastLoginAt": "2025-01-12T10:30:00.000Z",
      "loginCount": 156,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "statistics": {
        "totalBorrows": 45,
        "activeBorrows": 3,
        "overdueBorrows": 1,
        "totalPoints": 1250,
        "averageRating": 4.3,
        "reviewCount": 12
      },
      "permissions": [
        "borrow_books",
        "submit_reviews",
        "view_ebooks"
      ],
      "flags": {
        "isVip": false,
        "isSuspended": false,
        "hasViolations": false,
        "needsAttention": true
      },
      "createdAt": "2024-06-15T09:00:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 2456,
    "totalPages": 123
  },
  "summary": {
    "totalUsers": 2456,
    "activeUsers": 2234,
    "suspendedUsers": 12,
    "newUsersThisMonth": 156,
    "byRole": {
      "admin": 5,
      "librarian": 12, 
      "user": 2439
    }
  }
}
```

### 获取用户详情
```http
GET /admin/users/{userId}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "basicInfo": {
      "id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "realName": "John Doe",
      "phone": "+86138****5678",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "avatar": "https://cdn.yourdomain.com/avatars/123.jpg",
      "bio": "热爱阅读的程序员",
      "preferences": {
        "language": "zh-CN",
        "notifications": {
          "email": true,
          "sms": false,
          "push": true
        },
        "privacy": {
          "profileVisible": true,
          "readingHistoryVisible": false
        }
      }
    },
    "accountInfo": {
      "createdAt": "2024-06-15T09:00:00.000Z",
      "lastLoginAt": "2025-01-12T10:30:00.000Z",
      "loginCount": 156,
      "passwordLastChanged": "2024-12-01T14:30:00.000Z",
      "accountLockCount": 0,
      "lastLockTime": null,
      "sessionCount": 2,
      "devices": [
        {
          "deviceId": "device_123",
          "platform": "Web",
          "userAgent": "Chrome 96.0",
          "lastUsed": "2025-01-12T10:30:00.000Z",
          "location": "Beijing, China"
        }
      ]
    },
    "borrowingInfo": {
      "totalBorrows": 45,
      "activeBorrows": 3,
      "overdueBorrows": 1,
      "returnedBorrows": 41,
      "maxSimultaneousBorrows": 5,
      "currentlyBorrowed": [
        {
          "borrowId": "borrow_456",
          "bookId": "book_789",
          "bookTitle": "JavaScript高级程序设计",
          "borrowDate": "2025-01-05T00:00:00.000Z",
          "dueDate": "2025-01-19T23:59:59.999Z",
          "isOverdue": false,
          "renewCount": 1
        }
      ],
      "overdueHistory": [
        {
          "borrowId": "borrow_123",
          "bookTitle": "Vue.js实战",
          "overdueDays": 3,
          "fineAmount": 3.00,
          "finePaid": true
        }
      ]
    },
    "pointsInfo": {
      "currentBalance": 1250,
      "totalEarned": 2890,
      "totalSpent": 1640,
      "level": "ADVANCED_READER",
      "levelName": "高级读者",
      "badgeCount": 8,
      "recentTransactions": [
        {
          "id": "pt_789",
          "type": "earn",
          "amount": 10,
          "reason": "完成借阅",
          "date": "2025-01-12T10:30:00.000Z"
        }
      ]
    },
    "activityInfo": {
      "reviewCount": 12,
      "averageRating": 4.3,
      "helpfulVotes": 45,
      "searchCount": 234,
      "favoriteCategories": ["技术", "科学", "历史"],
      "readingPattern": {
        "averageBooksPerMonth": 3.2,
        "preferredBorrowDuration": "14 days",
        "mostActiveHours": ["19:00-21:00", "14:00-16:00"]
      }
    },
    "violationInfo": {
      "totalViolations": 1,
      "activeWarnings": 0,
      "suspensionHistory": [],
      "violations": [
        {
          "type": "late_return",
          "description": "逾期归还图书",
          "date": "2024-11-15T00:00:00.000Z",
          "resolved": true,
          "penalty": "warning"
        }
      ]
    },
    "permissions": {
      "current": [
        "borrow_books",
        "submit_reviews",
        "view_ebooks",
        "reserve_books"
      ],
      "restricted": [],
      "customPermissions": []
    }
  }
}
```

### 创建用户
```http
POST /admin/users
```

**权限**: 管理员

**请求体**:
```json
{
  "username": "new_user",
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "realName": "新用户",
  "phone": "+86138****9999",
  "role": "user",
  "status": "active",
  "permissions": [
    "borrow_books",
    "submit_reviews"
  ],
  "initialPoints": 100,
  "sendWelcomeEmail": true,
  "forcePasswordChange": false,
  "notes": "系统管理员创建的测试账户"
}
```

### 更新用户信息
```http
PUT /admin/users/{userId}
```

**请求体**:
```json
{
  "role": "librarian",
  "status": "active",
  "permissions": [
    "borrow_books",
    "submit_reviews",
    "manage_books"
  ],
  "maxSimultaneousBorrows": 10,
  "notes": "升级为图书管理员",
  "notifyUser": true
}
```

### 用户状态管理
```http
POST /admin/users/{userId}/status
```

**请求体**:
```json
{
  "action": "suspend",
  "reason": "违反使用规定",
  "duration": "30d",
  "notifyUser": true,
  "revokeAccess": true,
  "details": {
    "violationType": "inappropriate_behavior",
    "evidence": "多次恶意评论",
    "appealAllowed": true
  }
}
```

**支持的操作**:
- `activate` - 激活用户
- `deactivate` - 停用用户
- `suspend` - 暂停用户
- `unsuspend` - 解除暂停
- `lock` - 锁定账户
- `unlock` - 解锁账户

### 重置用户密码
```http
POST /admin/users/{userId}/reset-password
```

**请求体**:
```json
{
  "newPassword": "NewSecurePassword456",
  "forceChange": true,
  "sendEmail": true,
  "logoutAllSessions": true
}
```

### 用户权限管理
```http
PUT /admin/users/{userId}/permissions
```

**请求体**:
```json
{
  "permissions": [
    "borrow_books",
    "submit_reviews",
    "manage_books",
    "view_statistics"
  ],
  "restrictedPermissions": [
    "delete_reviews"
  ],
  "effectiveDate": "2025-01-15T00:00:00.000Z",
  "expiryDate": null,
  "reason": "角色升级为图书管理员"
}
```

## 📚 图书管理

### 图书审核管理
```http
GET /admin/books/pending
```

**获取待审核图书**:
```json
{
  "success": true,
  "data": [
    {
      "id": "book_pending_123",
      "title": "新提交的图书",
      "submittedBy": {
        "id": 456,
        "username": "librarian1"
      },
      "submissionDate": "2025-01-12T09:00:00.000Z",
      "status": "pending_review",
      "reviewPriority": "normal",
      "changes": {
        "type": "new_book",
        "data": {
          "title": "Vue.js 3.0 完全指南",
          "authors": ["张三"],
          "isbn": "9787111234567"
        }
      }
    }
  ]
}
```

### 批准/拒绝图书
```http
POST /admin/books/{bookId}/review
```

**请求体**:
```json
{
  "action": "approve",
  "feedback": "图书信息完整，已通过审核",
  "modifications": {
    "category": "技术",
    "tags": ["Vue.js", "前端开发"]
  },
  "notifySubmitter": true
}
```

### 批量图书操作
```http
POST /admin/books/batch
```

**请求体**:
```json
{
  "action": "update_status",
  "bookIds": ["book_123", "book_456", "book_789"],
  "data": {
    "status": "available"
  },
  "reason": "维护完成，恢复可借状态"
}
```

## 🔍 系统监控

### 获取系统概览
```http
GET /admin/dashboard
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "timestamp": "2025-01-12T10:30:00.000Z",
      "systemStatus": "healthy",
      "uptime": "15d 8h 30m",
      "version": "1.0.0"
    },
    "statistics": {
      "users": {
        "total": 2456,
        "active": 2234,
        "new": 12,
        "online": 45
      },
      "books": {
        "total": 15678,
        "available": 12890,
        "borrowed": 2456,
        "maintenance": 332
      },
      "borrowing": {
        "activeBorrows": 2456,
        "overdueBorrows": 123,
        "todayReturns": 89,
        "todayBorrows": 134
      },
      "system": {
        "apiRequests": 15678,
        "errorRate": 0.02,
        "avgResponseTime": "125ms",
        "diskUsage": 67.3,
        "memoryUsage": 54.2
      }
    },
    "trends": {
      "userGrowth": "+5.2%",
      "borrowingActivity": "+12.3%",
      "systemLoad": "-2.1%"
    },
    "alerts": [
      {
        "type": "warning",
        "message": "磁盘使用率超过60%",
        "timestamp": "2025-01-12T09:15:00.000Z",
        "priority": "medium"
      }
    ],
    "recentActivities": [
      {
        "type": "user_registration",
        "description": "新用户 student123 注册",
        "timestamp": "2025-01-12T10:25:00.000Z"
      },
      {
        "type": "book_added",
        "description": "新增图书《深度学习入门》",
        "timestamp": "2025-01-12T10:20:00.000Z"
      }
    ]
  }
}
```

### 获取实时统计
```http
GET /admin/statistics/realtime
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-12T10:30:00.000Z",
    "liveStats": {
      "onlineUsers": 45,
      "activeConnections": 67,
      "requestsPerMinute": 234,
      "responseTimes": {
        "avg": "125ms",
        "p95": "250ms",
        "p99": "450ms"
      },
      "errorRates": {
        "current": 0.02,
        "last1h": 0.015,
        "last24h": 0.018
      }
    },
    "resourceUsage": {
      "cpu": 34.5,
      "memory": 54.2,
      "disk": 67.3,
      "bandwidth": {
        "inbound": "15 MB/s",
        "outbound": "28 MB/s"
      }
    },
    "serviceHealth": {
      "database": "healthy",
      "redis": "healthy",
      "elasticsearch": "healthy",
      "fileStorage": "healthy"
    }
  }
}
```

### 获取系统日志
```http
GET /admin/logs
```

**查询参数**:
```
level: 日志级别 (error/warn/info/debug)
service: 服务名称
startDate: 开始时间
endDate: 结束时间
search: 搜索关键词
limit: 数量限制
```

### 系统配置管理
```http
GET /admin/config
PUT /admin/config
```

**配置示例**:
```json
{
  "system": {
    "siteName": "图书管理系统",
    "siteDescription": "现代化图书管理解决方案",
    "maintenanceMode": false,
    "allowRegistration": true,
    "defaultUserRole": "user",
    "maxSimultaneousBorrows": 5,
    "borrowDuration": 14,
    "maxRenewals": 2
  },
  "email": {
    "enabled": true,
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpUser": "noreply@library.com",
    "useSSL": true
  },
  "notifications": {
    "enabled": true,
    "dueDateReminder": {
      "enabled": true,
      "daysBefore": [3, 1]
    },
    "overdueNotice": {
      "enabled": true,
      "frequency": "daily"
    }
  },
  "security": {
    "passwordMinLength": 8,
    "requireEmailVerification": true,
    "sessionTimeout": 3600,
    "maxLoginAttempts": 5,
    "lockoutDuration": 900
  },
  "features": {
    "enableRecommendations": true,
    "enableReviews": true,
    "enablePoints": true,
    "enableEbooks": true,
    "enableNotifications": true
  }
}
```

## 📊 数据分析

### 用户行为分析
```http
GET /admin/analytics/users
```

**查询参数**:
```
period: 分析周期 (7d/30d/90d/1y)
metric: 指标类型 (activity/borrowing/engagement)
groupBy: 分组方式 (date/hour/role/category)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "userActivity": {
      "totalUsers": 2456,
      "activeUsers": 1890,
      "newUsers": 234,
      "retentionRate": 0.77,
      "engagementScore": 0.82
    },
    "borrowingPatterns": {
      "totalBorrows": 5678,
      "averageBorrowsPerUser": 2.3,
      "mostPopularCategory": "技术",
      "peakBorrowingHours": ["14:00-16:00", "19:00-21:00"],
      "returnOnTimeRate": 0.94
    },
    "trends": [
      {
        "date": "2025-01-12",
        "activeUsers": 89,
        "newRegistrations": 5,
        "borrows": 23,
        "returns": 19
      }
    ],
    "segmentation": {
      "byRole": {
        "user": 2234,
        "librarian": 12,
        "admin": 5
      },
      "byActivity": {
        "highly_active": 345,
        "moderately_active": 1123,
        "low_activity": 988
      }
    }
  }
}
```

### 图书统计分析
```http
GET /admin/analytics/books
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "inventory": {
      "totalBooks": 15678,
      "totalCopies": 45234,
      "utilizationRate": 0.67,
      "averageRating": 4.2
    },
    "popularity": {
      "mostBorrowedBooks": [
        {
          "bookId": "book_123",
          "title": "JavaScript高级程序设计",
          "borrowCount": 156,
          "rating": 4.8
        }
      ],
      "trendingCategories": [
        {
          "category": "技术",
          "growth": "+15.2%",
          "borrowCount": 2345
        }
      ]
    },
    "performance": {
      "turnoverRate": 2.3,
      "averageBorrowDuration": "12.5 days",
      "overdueRate": 0.05,
      "reservationRate": 0.12
    }
  }
}
```

### 财务报告
```http
GET /admin/analytics/financial
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "revenue": {
      "totalRevenue": 25680.50,
      "fineRevenue": 2340.00,
      "membershipRevenue": 15600.00,
      "serviceRevenue": 7740.50
    },
    "costs": {
      "bookAcquisition": 45000.00,
      "maintenance": 8500.00,
      "staff": 120000.00,
      "utilities": 12000.00
    },
    "profitability": {
      "netIncome": -159819.50,
      "roi": -0.86,
      "costPerUser": 75.20,
      "revenuePerUser": 10.45
    },
    "trends": {
      "monthlyRevenue": [
        {
          "month": "2025-01",
          "revenue": 2568.05,
          "costs": 15650.00,
          "profit": -13081.95
        }
      ]
    }
  }
}
```

## 📋 报告管理

### 生成系统报告
```http
POST /admin/reports/generate
```

**请求体**:
```json
{
  "reportType": "monthly_summary",
  "period": {
    "start": "2024-12-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.999Z"
  },
  "sections": [
    "user_statistics",
    "book_statistics",
    "borrowing_analysis",
    "financial_summary",
    "system_performance"
  ],
  "format": "pdf",
  "recipients": ["director@library.com"],
  "includeCharts": true,
  "language": "zh-CN"
}
```

### 获取报告列表
```http
GET /admin/reports
```

### 下载报告
```http
GET /admin/reports/{reportId}/download
```

## ⚙️ 系统维护

### 备份管理
```http
GET /admin/backups
POST /admin/backups/create
```

**创建备份**:
```json
{
  "type": "full",
  "includeFiles": true,
  "compression": true,
  "encryption": true,
  "schedule": false,
  "description": "月度完整备份"
}
```

### 数据库维护
```http
POST /admin/maintenance/database
```

**请求体**:
```json
{
  "operations": [
    "optimize_tables",
    "rebuild_indexes", 
    "update_statistics",
    "cleanup_logs"
  ],
  "scheduleMaintenanceWindow": true,
  "notifyUsers": true
}
```

### 缓存管理
```http
DELETE /admin/cache
POST /admin/cache/warm-up
```

**清除缓存**:
```json
{
  "cacheTypes": ["redis", "application", "database"],
  "patterns": ["user:*", "book:*"],
  "forceFlush": false
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `ADMIN_PERMISSION_REQUIRED` | 403 | 需要管理员权限 | 确认用户角色 |
| `INSUFFICIENT_PRIVILEGES` | 403 | 权限级别不足 | 检查操作权限 |
| `USER_NOT_FOUND` | 404 | 用户不存在 | 验证用户ID |
| `INVALID_USER_STATUS` | 400 | 无效的用户状态 | 检查状态值 |
| `SYSTEM_MAINTENANCE` | 503 | 系统维护中 | 等待维护完成 |
| `CONFIGURATION_ERROR` | 500 | 配置错误 | 检查系统配置 |
| `BACKUP_FAILED` | 500 | 备份失败 | 检查存储空间 |

## 📊 权限矩阵

### 管理员角色权限

| 功能 | 超级管理员 | 系统管理员 | 业务管理员 | 图书管理员 |
|------|------------|------------|------------|------------|
| 用户管理 | ✅ | ✅ | ✅ | ❌ |
| 角色管理 | ✅ | ✅ | ❌ | ❌ |
| 系统配置 | ✅ | ✅ | ❌ | ❌ |
| 图书管理 | ✅ | ✅ | ✅ | ✅ |
| 数据分析 | ✅ | ✅ | ✅ | 📊部分 |
| 系统监控 | ✅ | ✅ | 📊只读 | ❌ |
| 备份恢复 | ✅ | ✅ | ❌ | ❌ |

## 🔗 相关文档

- [用户权限管理](../security/user-permissions.md)
- [系统监控配置](../monitoring/system-monitoring.md)
- [备份恢复策略](../operations/backup-recovery.md)
- [管理员操作手册](../user-guide/admin-manual.md)

---

⚠️ **管理员操作提醒**:
- 重要操作前务必确认影响范围
- 定期备份系统数据和配置
- 监控系统性能和安全状态
- 保护管理员账户的安全性