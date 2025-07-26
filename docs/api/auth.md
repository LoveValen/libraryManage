# 🔐 认证API文档

认证模块负责处理用户注册、登录、权限验证等核心安全功能。支持传统密码登录和微信小程序一键登录。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | Public |
| POST | `/auth/login` | 用户登录 | Public |
| POST | `/auth/wechat-login` | 微信登录 | Public |
| POST | `/auth/refresh` | 刷新令牌 | Public |
| POST | `/auth/reset-password` | 重置密码 | Public |
| GET | `/auth/me` | 获取当前用户 | Authenticated |
| GET | `/auth/verify` | 验证令牌 | Authenticated |
| POST | `/auth/logout` | 用户登出 | Authenticated |
| PUT | `/auth/password` | 修改密码 | Authenticated |
| PUT | `/auth/profile` | 更新资料 | Authenticated |

## 🔑 用户注册

### 请求
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "realName": "张三",
  "phone": "13800138000"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 | 验证规则 |
|------|------|------|------|----------|
| username | string | ✅ | 用户名 | 3-30字符，字母数字下划线 |
| email | string | ❌ | 邮箱地址 | 有效邮箱格式 |
| password | string | ✅ | 密码 | 6-128字符 |
| confirmPassword | string | ✅ | 确认密码 | 必须与password相同 |
| realName | string | ❌ | 真实姓名 | 2-50字符 |
| phone | string | ❌ | 手机号 | 11位中国手机号 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 123,
      "username": "user123",
      "email": "user@example.com",
      "realName": "张三",
      "phone": "13800138000",
      "role": "patron",
      "status": "active",
      "createdAt": "2025-01-12T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "status": "error",
  "statusCode": 409,
  "message": "Username already exists",
  "code": "CONFLICT",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚪 用户登录

### 请求
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "user123",
  "password": "SecurePass123"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| identifier | string | ✅ | 用户名或邮箱 |
| password | string | ✅ | 密码 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 123,
      "username": "user123",
      "email": "user@example.com",
      "realName": "张三",
      "role": "patron",
      "status": "active",
      "lastLoginAt": "2025-01-12T10:30:00.000Z",
      "points": {
        "balance": 100,
        "level": "NEWCOMER",
        "levelName": "新手读者"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📱 微信登录

### 请求
```http
POST /api/v1/auth/wechat-login
Content-Type: application/json

{
  "code": "wx_login_code_from_miniprogram",
  "userInfo": {
    "nickName": "微信用户",
    "avatarUrl": "https://wx.qlogo.cn/...",
    "gender": 1,
    "country": "China",
    "province": "Beijing",
    "city": "Beijing"
  }
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| code | string | ✅ | 微信登录凭证 |
| userInfo | object | ❌ | 微信用户信息 |
| userInfo.nickName | string | ❌ | 微信昵称 |
| userInfo.avatarUrl | string | ❌ | 头像URL |
| userInfo.gender | number | ❌ | 性别 (0未知/1男/2女) |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "WeChat login successful",
  "data": {
    "user": {
      "id": 124,
      "username": "wx_12345678",
      "realName": "微信用户",
      "avatar": "https://wx.qlogo.cn/...",
      "role": "patron",
      "status": "active",
      "wechatOpenid": "oGZUI5...",
      "points": {
        "balance": 50,
        "level": "NEWCOMER",
        "levelName": "新手读者"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    },
    "isNewUser": true
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔄 刷新令牌

### 请求
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 👤 获取当前用户

### 请求
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "User information retrieved successfully",
  "data": {
    "user": {
      "id": 123,
      "username": "user123",
      "email": "user@example.com",
      "realName": "张三",
      "phone": "13800138000",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "热爱阅读的图书馆用户",
      "role": "patron",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "lastLoginAt": "2025-01-12T10:30:00.000Z",
      "loginCount": 25,
      "preferences": {
        "language": "zh-CN",
        "notifications": {
          "email": true,
          "push": true,
          "dueDateReminder": true
        }
      },
      "points": {
        "balance": 350,
        "level": "READER",
        "levelName": "普通读者",
        "totalEarned": 500,
        "totalSpent": 150,
        "badgeCount": 3
      },
      "createdAt": "2024-12-01T08:00:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔓 用户登出

### 请求
```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Logout successful",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔑 修改密码

### 请求
```http
PUT /api/v1/auth/password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| currentPassword | string | ✅ | 当前密码 |
| newPassword | string | ✅ | 新密码 |
| confirmPassword | string | ✅ | 确认新密码 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Password changed successfully",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 👤 更新用户资料

### 请求
```http
PUT /api/v1/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "realName": "张三丰",
  "phone": "13900139000",
  "avatar": "https://example.com/new-avatar.jpg",
  "bio": "武当山图书管理员，热爱太极和阅读",
  "preferences": {
    "language": "zh-CN",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true,
      "dueDateReminder": true,
      "pointsUpdate": false
    },
    "privacy": {
      "profileVisible": true,
      "readingHistoryVisible": false
    }
  }
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| realName | string | ❌ | 真实姓名 |
| phone | string | ❌ | 手机号 |
| avatar | string | ❌ | 头像URL |
| bio | string | ❌ | 个人简介 (最长500字符) |
| preferences | object | ❌ | 用户偏好设置 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 123,
      "username": "user123",
      "realName": "张三丰",
      "phone": "13900139000",
      "avatar": "https://example.com/new-avatar.jpg",
      "bio": "武当山图书管理员，热爱太极和阅读",
      "preferences": {
        "language": "zh-CN",
        "notifications": {
          "email": true,
          "sms": false,
          "push": true
        }
      },
      "updatedAt": "2025-01-12T10:35:00.000Z"
    }
  },
  "timestamp": "2025-01-12T10:35:00.000Z"
}
```

## 🔍 验证令牌

### 请求
```http
GET /api/v1/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": 123,
      "username": "user123",
      "role": "patron",
      "status": "active"
    },
    "tokenInfo": {
      "userId": 123,
      "role": "patron",
      "iat": 1641988800,
      "exp": 1642075200
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔄 重置密码

### 请求
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "If the email exists, a reset link has been sent",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 | 检查参数格式和必填字段 |
| `INVALID_CREDENTIALS` | 401 | 用户名密码错误 | 确认用户名和密码 |
| `TOKEN_EXPIRED` | 401 | JWT令牌已过期 | 使用refresh token刷新 |
| `INVALID_TOKEN` | 401 | JWT令牌无效 | 重新登录获取新令牌 |
| `USER_NOT_FOUND` | 401 | 用户不存在 | 检查用户标识符 |
| `ACCOUNT_INACTIVE` | 401 | 账户未激活或被禁用 | 联系管理员激活账户 |
| `CONFLICT` | 409 | 用户名/邮箱已存在 | 使用不同的用户名或邮箱 |
| `WECHAT_ERROR` | 400 | 微信登录失败 | 检查微信配置和code有效性 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 | 等待后重试 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 用户登录
const login = async (username, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      identifier: username,
      password: password
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 保存token
    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    return data.data.user;
  }
  
  throw new Error(data.message);
};

// 带认证的API调用
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
};
```

### 小程序示例
```javascript
// 微信登录
const wechatLogin = () => {
  uni.login({
    provider: 'weixin',
    success: (loginRes) => {
      uni.request({
        url: '/api/v1/auth/wechat-login',
        method: 'POST',
        data: {
          code: loginRes.code
        },
        success: (res) => {
          if (res.data.success) {
            // 保存token
            uni.setStorageSync('accessToken', res.data.data.tokens.accessToken);
            uni.setStorageSync('refreshToken', res.data.data.tokens.refreshToken);
          }
        }
      });
    }
  });
};
```

## 🔒 安全说明

### JWT安全
- 访问令牌有效期：7天
- 刷新令牌有效期：30天
- 令牌包含用户基本信息，不包含敏感数据
- 建议在HTTPS环境下使用

### 密码安全
- 密码使用bcrypt进行哈希处理，salt rounds = 12
- 不存储明文密码
- 支持密码强度检查

### 频率限制
- 登录：10次/15分钟
- 注册：3次/1小时
- 密码修改：5次/15分钟
- 重置密码：5次/15分钟

### 微信登录安全
- 使用微信官方code2session接口
- 验证微信返回的session_key
- 支持unionid绑定多个小程序

---

📝 **注意**: 所有涉及密码的操作都需要在HTTPS环境下进行，以确保数据传输安全。