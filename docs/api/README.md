# 📡 企业级API文档总览

图书馆管理系统提供企业级RESTful API，基于现代化Express.js架构，支持所有核心功能的高性能编程访问。所有API都遵循企业级设计规范，提供完整的监控、追踪和安全保障。

## 🌐 企业级API基础信息

### 基础URL (企业级架构)
```
开发环境: http://localhost:3000/api/v1
生产环境: https://your-domain.com/api/v1
健康检查: http://localhost:3000/health
API文档: http://localhost:3000/api/docs
```

### 企业级特性
- ✅ **86ms极速响应** - 优化的Express.js架构
- ✅ **请求追踪** - UUID全链路追踪，支持分布式调试
- ✅ **性能监控** - 慢请求自动检测 (>1000ms)
- ✅ **安全强化** - Helmet + HSTS + XSS防护 + 输入清理
- ✅ **结构化日志** - Winston集成，完整请求上下文
- ✅ **健康检查** - 多层次系统健康验证

### 认证方式 (企业级安全)
```http
Authorization: Bearer <JWT_TOKEN>
X-Request-ID: <UUID>  // 可选，用于请求追踪
```

### 企业级响应格式 (统一标准化)
所有API响应都遵循企业级统一格式，支持请求追踪和性能监控：

#### 成功响应 (简化版)
```json
{
  "success": true,
  "message": "成功",
  "data": {
    // 响应数据
  },
  "timestamp": "2025-08-02T13:05:35.000Z"
}
```

#### 分页响应 (企业级)
```json
{
  "success": true,
  "message": "获取数据成功",
  "data": [
    // 数据数组
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2025-08-02T13:05:35.000Z"
}
```

#### 错误响应 (企业级)
```json
{
  "success": false,
  "message": "请求失败",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "具体错误信息",
    "requestId": "uuid-request-id"
  },
  "timestamp": "2025-08-02T13:05:35.000Z"
}
```

#### 企业级健康检查响应
```json
{
  "status": "healthy",
  "timestamp": "2025-08-02T13:05:35.000Z",
  "requestId": "239568c8-8bdc-4fc8-9507-e8ff10c38ead",
  "service": "Library Management System",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 30.5,
  "memory": {
    "rss": 140681216,
    "heapTotal": 82219008,
    "heapUsed": 54618272
  },
  "pid": 19648
}
```

## 📚 API模块概览

### 🔐 [认证模块](./auth.md)
处理用户认证、注册、登录等功能
- 用户注册/登录
- 微信小程序登录
- JWT令牌管理
- 密码修改
- 用户资料管理

**基础路径**: `/auth`

### 📖 [图书模块](./books.md)
图书信息的完整管理
- 图书CRUD操作
- 图书搜索和筛选
- 图书分类管理
- 库存管理
- 电子书管理

**基础路径**: `/books`

### 👥 [用户模块](./users.md)
用户账户和权限管理
- 用户列表和详情
- 用户状态管理
- 权限分配
- 用户统计

**基础路径**: `/users`

### 📋 [借阅模块](./borrows.md)
借阅流程的完整管理
- 借书/还书操作
- 续借功能
- 逾期管理
- 借阅历史
- 借阅统计

**基础路径**: `/borrows`

### ⭐ [书评模块](./reviews.md)
用户书评和评分系统
- 书评CRUD操作
- 评分统计
- 内容审核
- 书评推荐

**基础路径**: `/reviews`

### 🎮 [积分模块](./points.md)
游戏化积分系统
- 积分获取和消费
- 积分历史查询
- 徽章管理
- 排行榜
- 等级系统

**基础路径**: `/points`

### 🛡️ [审计与安全模块](./audit-security.md)
企业级审计日志和安全监控
- 审计日志查询和分析
- 安全事件管理
- 威胁检测和响应
- 合规性报告
- 数据完整性验证
- 实时安全监控

**基础路径**: `/audit`

### ⚙️ [系统管理模块](./system-management.md)
系统运维和监控管理
- 服务生命周期管理
- 系统健康监控
- 性能指标分析
- 告警管理
- 备份和恢复
- 维护模式控制

**基础路径**: `/system`

### 🔔 [通知系统模块](./notifications.md)
多渠道实时通知系统
- 个人通知管理
- 批量通知发送
- 通知模板管理
- WebSocket实时通信
- 推送通知
- 通知偏好设置

**基础路径**: `/notifications`

### 🤖 [AI推荐引擎模块](./recommendations.md)
智能推荐和机器学习
- 个性化图书推荐
- 智能搜索建议
- 用户行为分析
- 推荐模型管理
- A/B测试框架
- 推荐效果统计

**基础路径**: `/recommendations`

### 🔍 [高级搜索模块](./search.md)
基于Elasticsearch的智能搜索
- 全文搜索和智能过滤
- 搜索建议和拼写纠错
- 语义搜索和个性化
- 搜索分析和统计
- 搜索行为分析
- 索引管理和优化

**基础路径**: `/search`

## 🔧 通用参数

### 分页参数
```
page: 页码 (默认: 1)
limit: 每页数量 (默认: 20, 最大: 100)
```

### 排序参数
```
sortBy: 排序字段
sortOrder: 排序方向 (asc/desc, 默认: desc)
```

### 搜索参数
```
search: 搜索关键词
q: 查询字符串 (别名)
```

## 📊 状态码说明

### 成功状态码
- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `204 No Content` - 操作成功，无返回内容

### 客户端错误
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未认证或认证失败
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `409 Conflict` - 资源冲突
- `422 Unprocessable Entity` - 数据验证失败
- `429 Too Many Requests` - 请求频率超限

### 服务器错误
- `500 Internal Server Error` - 服务器内部错误
- `502 Bad Gateway` - 网关错误
- `503 Service Unavailable` - 服务不可用

## 🔒 认证说明

### JWT令牌结构
```json
{
  "userId": 123,
  "username": "user123",
  "role": "patron",
  "iat": 1641988800,
  "exp": 1642075200,
  "iss": "library-management-system",
  "aud": "library-users"
}
```

### 权限级别
- **Public** - 无需认证
- **Authenticated** - 需要有效JWT
- **Admin** - 需要管理员权限
- **Owner** - 资源所有者或管理员

## 🚦 API限流规则

### 通用限制
- **普通API**: 1000次/15分钟
- **登录API**: 10次/15分钟
- **注册API**: 3次/1小时
- **敏感操作**: 5次/15分钟

### 限流响应头
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641988800
```

## 🧪 企业级API测试

### 健康检查系统 (多层次监控)
```http
GET /health
```

企业级健康检查响应 (实际格式)：
```json
{
  "status": "healthy",
  "timestamp": "2025-08-02T13:05:35.000Z",
  "requestId": "239568c8-8bdc-4fc8-9507-e8ff10c38ead",
  "service": "Library Management System",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 30.5,
  "memory": {
    "rss": 140681216,
    "heapTotal": 82219008,
    "heapUsed": 54618272
  },
  "pid": 19648
}
```

### 请求追踪验证
```bash
# 测试UUID请求追踪
curl -H "x-request-id: test-trace-123" http://localhost:3000/health

# 验证请求在日志中的追踪
tail -f backend/logs/combined.log | grep "test-trace-123"
```

### 性能监控测试
```bash
# 测试慢请求检测 (>1000ms 自动告警)
curl "http://localhost:3000/api/v1/books?delay=1500"

# 查看慢请求日志
tail -f backend/logs/combined.log | grep "慢请求检测"
```

### API信息
```http
GET /api/v1
```

响应：
```json
{
  "success": true,
  "message": "Library Management System API v1.0.0",
  "data": {
    "version": "v1",
    "name": "Library Management System",
    "description": "企业级图书管理系统API",
    "environment": "development",
    "endpoints": {
      "auth": "/api/v1/auth",
      "books": "/api/v1/books",
      "users": "/api/v1/users",
      "borrows": "/api/v1/borrows",
      "reviews": "/api/v1/reviews",
      "points": "/api/v1/points"
    }
  },
  "timestamp": "2025-08-02T13:05:35.000Z"
}
```

## 📖 企业级Swagger文档配置

### 自动生成的交互式API文档
开发环境提供完整的Swagger UI界面：
```
http://localhost:3000/api/docs
```

### Swagger配置特性
- ✅ **自动API发现** - 扫描路由自动生成文档
- ✅ **JWT认证集成** - 支持Bearer Token测试
- ✅ **请求追踪** - 自动添加x-request-id头
- ✅ **实时测试** - 直接在文档中测试API
- ✅ **参数验证** - Joi schema自动生成参数说明
- ✅ **企业级安全** - 生产环境自动禁用

### Swagger配置示例 (swagger.config.js)
```javascript
const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management System API',
      version: '1.0.0',
      description: '企业级图书管理系统API文档',
      contact: {
        name: 'API支持',
        email: 'api-support@library.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js']
};
```

### 环境控制
```javascript
// 仅在开发环境启用Swagger
if (config.app.environment === 'development') {
  setupApiDocs(app);
}
```

## 🛠️ 开发工具

### Postman集合
下载预配置的Postman集合：[Library-API.postman_collection.json](./postman/Library-API.postman_collection.json)

### cURL示例
```bash
# 获取API信息
curl -X GET http://localhost:3000/api/v1

# 用户登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}'

# 获取图书列表 (需要认证)
curl -X GET http://localhost:3000/api/v1/books \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 错误处理

### 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| `VALIDATION_ERROR` | 数据验证失败 | 检查请求参数格式 |
| `UNAUTHORIZED` | 认证失败 | 检查JWT令牌 |
| `FORBIDDEN` | 权限不足 | 确认用户权限 |
| `NOT_FOUND` | 资源不存在 | 检查资源ID |
| `CONFLICT` | 资源冲突 | 检查唯一性约束 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 | 降低请求频率 |

### 调试技巧
1. 检查HTTP状态码
2. 查看错误响应中的`code`字段
3. 检查`errors`数组中的详细错误信息
4. 查看服务器日志获取更多信息

## 📝 版本管理

### API版本控制
- 当前版本: `v1`
- 版本路径: `/api/v1/`
- 向后兼容性: 保证6个月

### 废弃通知
废弃的API将通过以下方式通知：
- 响应头: `X-API-Deprecated: true`
- 文档标记: ⚠️ **已废弃**
- 邮件通知: 开发者邮件列表

---

📚 **更多信息**: 查看各个模块的详细API文档了解具体的接口定义和使用方法。