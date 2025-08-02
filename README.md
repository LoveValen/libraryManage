# 📚 Enterprise Library Management System

> 现代化企业级图书管理系统 - 集成AI推荐、实时通知、安全监控于一体的完整解决方案

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vue Version](https://img.shields.io/badge/vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

## 🌟 项目概述

这是一个功能完整的企业级图书管理系统，采用现代化技术栈构建，提供从图书管理到智能推荐的全方位解决方案。系统支持多用户角色、实时通知、AI推荐、安全监控等企业级功能。

### ✨ 核心特性

#### 📖 图书管理
- **智能图书管理** - 完整的CRUD操作，支持批量导入/导出
- **高级搜索** - 基于Elasticsearch的全文搜索和智能过滤
- **分类管理** - 灵活的图书分类体系
- **库存跟踪** - 实时库存状态和可用性管理

#### 👥 用户系统
- **多角色权限** - 管理员、用户、访客等多级权限控制
- **用户档案** - 完整的用户信息管理
- **借阅历史** - 详细的借阅记录和统计
- **个性化设置** - 用户偏好和通知设置

#### 🔄 借阅管理
- **智能借阅** - 自动化借阅流程和规则引擎
- **到期提醒** - 多渠道自动提醒系统
- **续借管理** - 灵活的续借策略
- **罚金计算** - 自动化罚金计算和处理

#### ⭐ 评价系统
- **多维评价** - 评分、评论、标签等多元化评价
- **情感分析** - AI驱动的评论情感分析
- **内容审核** - 智能内容过滤和人工审核
- **评价统计** - 实时评价数据统计和分析

#### 🎯 积分奖励
- **积分规则** - 灵活可配置的积分获取规则
- **奖励兑换** - 多样化的积分兑换机制
- **积分历史** - 详细的积分变动记录
- **等级系统** - 基于积分的用户等级体系

#### 🔔 实时通知
- **WebSocket支持** - 实时双向通信
- **多渠道通知** - 站内信、邮件、短信等多渠道
- **通知模板** - 可自定义的通知模板系统
- **消息队列** - 高性能消息处理

#### 🤖 AI推荐引擎
- **多算法支持** - 协同过滤、内容推荐、混合推荐
- **实时学习** - 基于用户行为的实时推荐优化
- **个性化推荐** - 深度个性化推荐算法
- **A/B测试** - 推荐算法效果测试框架

#### 🛡️ 安全监控
- **审计日志** - 全面的操作审计和日志记录
- **威胁检测** - 实时安全威胁检测和防护
- **访问控制** - 细粒度的访问控制和权限管理
- **合规支持** - GDPR、HIPAA等法规合规支持

#### 🏢 企业级特性 (已实现)
- **请求追踪** - UUID请求ID、全链路追踪
- **性能监控** - 响应时间监控、慢请求检测
- **优雅关闭** - 零停机升级、连接跟踪、资源清理
- **健康检查** - 启动验证、系统资源监控
- **模块化架构** - 关注点分离、企业级可维护性
- **结构化日志** - Winston集成、请求上下文追踪
- **安全强化** - Helmet、HSTS、XSS防护、输入清理

#### 📊 系统监控
- **健康检查** - 实时系统健康状态监控
- **性能监控** - 详细的性能指标和分析
- **告警系统** - 智能告警和通知机制
- **仪表板** - 可视化监控仪表板

#### 💾 备份恢复
- **自动备份** - 定时自动备份策略
- **增量备份** - 高效的增量备份机制
- **一键恢复** - 简单快速的数据恢复
- **备份验证** - 备份完整性验证

## 🏗️ 技术架构

### 前端技术栈
```
Vue.js 3.x          # 渐进式前端框架
├── Composition API  # 组合式API
├── Vue Router      # 路由管理
├── Pinia          # 状态管理
├── Element Plus   # UI组件库
├── Axios          # HTTP客户端
├── Socket.io      # WebSocket客户端
├── ECharts        # 数据可视化
└── PWA Support    # 渐进式Web应用
```

### 后端技术栈 (企业级架构)
```
Node.js 18+         # 运行时环境
├── Express.js      # 企业级Web框架
├── Prisma ORM      # 现代化数据库工具
├── MySQL 8.0       # 高性能关系型数据库
├── Redis          # 缓存和会话存储
├── Socket.io      # WebSocket实时通信
├── JWT            # 无状态身份认证
├── Bcrypt         # 安全密码加密
├── Joi            # 严格数据验证
├── Helmet         # 企业级安全中间件
├── Winston        # 结构化日志管理
├── UUID           # 企业级请求追踪
├── Compression    # 响应压缩优化
├── CORS           # 跨域安全配置
└── Jest           # 全面单元测试
```

### 基础设施
```
Docker              # 容器化部署
├── Docker Compose  # 多容器编排
├── Nginx          # 反向代理
├── PM2            # 进程管理
├── Let's Encrypt  # SSL证书
└── GitHub Actions # CI/CD流水线
```

## 🚀 快速开始

### 环境要求

- **Node.js** 18.0.0 或更高版本 (推荐 v18.x LTS)
- **NPM** 8.0.0 或更高版本
- **MySQL** 8.0 或更高版本 
- **Redis** 6.0 或更高版本 (可选，用于缓存)
- **Docker** 20.0+ 和 Docker Compose (推荐)

### 克隆项目
```bash
git clone https://github.com/your-org/library-management-system.git
cd library-management-system
```

### 后端设置

1. **安装依赖**
```bash
cd backend
npm install
```

2. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

3. **数据库初始化**
```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库架构 (开发环境)
npm run db:push

# 查看数据库 (可选)
npm run db:studio
```

4. **启动开发服务器**
```bash
npm run dev
```

### 前端设置

1. **安装依赖**
```bash
cd admin-panel
npm install
```

2. **环境配置**
```bash
# 前端无需额外配置，默认连接后端 API
# 如需自定义，可编辑 vite.config.js
```

3. **启动开发服务器**
```bash
npm run dev
```

### 访问应用

- **前端界面**: http://localhost:8080
- **后端API**: http://localhost:3000
- **API文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/health
- **系统监控**: http://localhost:8080/system-health

### 默认账户

```
管理员账户:
用户名: admin
密码: admin123

普通用户:
用户名: user
密码: user123
```

## 📁 项目结构 (企业级架构)

```
library-management-system/
├── backend/                    # 后端 - 企业级Express.js架构
│   ├── src/
│   │   ├── app.js             # 应用工厂 (企业级模块化)
│   │   ├── server.js          # 服务器生命周期管理
│   │   ├── config/            # 配置模块
│   │   │   ├── index.js       # 主配置
│   │   │   ├── routes.config.js      # 路由配置
│   │   │   ├── swagger.config.js     # API文档配置
│   │   │   └── graceful-shutdown.config.js  # 优雅关闭
│   │   ├── middlewares/       # 企业级中间件
│   │   │   ├── app.middleware.js     # 应用中间件管理
│   │   │   ├── auth.middleware.js    # 认证中间件
│   │   │   ├── error.middleware.js   # 错误处理
│   │   │   └── validation.middleware.js # 验证中间件
│   │   ├── controllers/       # 业务控制器
│   │   ├── routes/           # API路由
│   │   ├── services/         # 业务服务层
│   │   ├── utils/            # 工具库 (已优化)
│   │   │   ├── prisma.js     # 数据库连接
│   │   │   ├── logger.js     # 结构化日志
│   │   │   ├── validation.js # 验证工具
│   │   │   └── response.js   # 响应工具
│   │   └── prisma/           # 数据库模式
│   ├── tests/                # 全面测试套件
│   ├── logs/                 # 结构化日志
│   └── package.json
├── admin-panel/              # Vue.js 3 管理前端
│   ├── src/
│   │   ├── components/       # Vue 组件
│   │   ├── views/           # 页面视图
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── router/          # Vue Router 配置
│   │   ├── api/             # API 接口封装
│   │   ├── utils/           # 前端工具函数
│   │   └── styles/          # 样式文件
│   ├── public/              # 静态资源
│   └── package.json
├── docs/                    # 完整技术文档
│   ├── api/                 # API 接口文档
│   ├── database/            # 数据库设计文档
│   ├── deployment/          # 部署运维文档
│   ├── design/              # 系统设计文档
│   └── development/         # 开发指南
├── mini-program/            # 微信小程序 (预留)
├── docker-compose.yml       # 容器编排
├── CLAUDE.md               # Claude Code 项目配置
└── README.md               # 项目说明
```

## 📚 文档导航

### 开发者文档
- [API 接口文档](./docs/api/README.md) - 详细的API接口说明
- [数据库设计](./docs/development/database.md) - 数据库架构和设计
- [架构设计](./docs/development/architecture.md) - 系统架构和设计理念
- [开发指南](./docs/development/guide.md) - 开发环境设置和代码规范
- [测试指南](./docs/development/testing.md) - 测试策略和用例

### 功能文档
- [推荐系统](./docs/features/recommendation.md) - AI推荐引擎详解
- [安全系统](./docs/features/security.md) - 安全架构和监控
- [通知系统](./docs/features/notification.md) - 实时通知机制
- [搜索系统](./docs/features/search.md) - Elasticsearch集成
- [监控系统](./docs/features/monitoring.md) - 系统监控和告警

### 部署文档
- [部署指南](./docs/deployment/guide.md) - 生产环境部署
- [Docker部署](./docs/deployment/docker.md) - 容器化部署
- [性能优化](./docs/deployment/performance.md) - 性能调优指南
- [安全配置](./docs/deployment/security.md) - 生产环境安全配置

### 用户文档
- [用户手册](./docs/user-guide/user-manual.md) - 用户使用指南
- [管理员指南](./docs/user-guide/admin-guide.md) - 管理员操作手册
- [FAQ](./docs/user-guide/faq.md) - 常见问题解答

## 🔧 环境变量

### 后端环境变量 (.env)

```bash
# 应用配置
NODE_ENV=development
PORT=3000
APP_NAME=Library Management System
APP_VERSION=1.0.0
HOST=0.0.0.0

# 数据库配置 (MySQL)
DB_HOST=localhost
DB_PORT=3307
DB_NAME=library_management
DB_USER=root
DB_PASSWORD=password
DATABASE_URL="mysql://root:password@localhost:3307/library_management"

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 第三方服务配置 (可选)
# ELASTICSEARCH_NODE=http://localhost:9200

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# 安全配置
AUDIT_ENCRYPTION_KEY=your-encryption-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 外部服务
WEBHOOK_URL=https://your-webhook-url.com
```

### 前端环境变量 (vite.config.js)

```javascript
// admin-panel 项目已配置代理，无需额外环境变量
export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})

// 可选配置 (.env.local)
VITE_APP_TITLE=图书管理系统
VITE_APP_VERSION=1.0.0
```

## 🐳 Docker 部署

### 开发环境

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 生产环境

```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d

# 扩展后端服务
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## 🧪 测试

### 运行测试

```bash
# 后端单元测试
cd backend
npm test

# 前端单元测试
cd frontend
npm test

# E2E测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

### 测试数据

```bash
# 插入测试数据
npm run seed:test

# 清理测试数据
npm run clean:test
```

## 📊 性能指标

### 系统性能目标

- **响应时间**: < 200ms (95th percentile)
- **并发用户**: 支持1000+并发用户
- **数据库查询**: < 100ms (平均查询时间)
- **文件上传**: 支持100MB文件上传
- **系统可用性**: 99.9% SLA

### 监控指标

- CPU使用率
- 内存使用率
- 数据库连接数
- API响应时间
- 错误率
- 用户活跃度

## 🔐 安全特性

### 身份认证与授权
- JWT Token认证
- 基于角色的访问控制 (RBAC)
- 多因素认证 (MFA) 支持
- 会话管理

### 数据保护
- 密码加密存储
- 敏感数据加密
- SQL注入防护
- XSS攻击防护
- CSRF防护

### 审计与监控
- 操作审计日志
- 安全事件监控
- 威胁检测
- 异常行为分析

## 🤝 贡献指南

### 开发流程

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 编写单元测试
- 更新相关文档

### 提交消息规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工程化相关
```

## 🚀 项目进展 & 重构成果

### ✅ 核心功能 (已完成)
- [x] **企业级架构重构** - Express.js模块化架构、关注点分离
- [x] **数据库现代化** - Prisma ORM + MySQL 8.0 高性能方案
- [x] **用户认证系统** - JWT认证、角色权限、安全中间件
- [x] **图书管理模块** - CRUD操作、分类管理、库存跟踪
- [x] **借阅管理系统** - 智能借阅流程、续借、罚金计算
- [x] **积分奖励系统** - 游戏化积分规则、等级体系、交易记录
- [x] **评价系统** - 多维评价、内容审核、统计分析
- [x] **实时通知系统** - WebSocket、多渠道通知、模板管理

### 🏢 企业级特性 (已完成)
- [x] **请求追踪系统** - UUID请求ID、全链路性能监控
- [x] **优雅关闭机制** - 零停机升级、连接跟踪、资源清理
- [x] **健康检查系统** - 多层次健康验证、系统资源监控
- [x] **结构化日志** - Winston集成、请求上下文、性能追踪
- [x] **安全强化** - Helmet防护、HSTS、XSS防护、输入清理
- [x] **模块化中间件** - 企业级中间件管理、配置分离
- [x] **性能监控** - 慢请求检测、响应时间分析、内存监控
- [x] **错误处理** - 统一错误处理、异常捕获、优雅降级

### 🔄 进行中
- [ ] **搜索功能增强** - Elasticsearch集成、全文搜索
- [ ] **AI推荐引擎** - 机器学习推荐、用户行为分析
- [ ] **备份恢复系统** - 自动备份、增量备份、灾难恢复

### 📋 计划中
- [ ] **移动端PWA** - 渐进式Web应用、离线支持
- [ ] **微信小程序** - 跨平台移动端支持
- [ ] **CI/CD流水线** - 自动化测试、部署
- [ ] **测试覆盖** - 单元测试、集成测试、E2E测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

## 📞 联系我们

- **项目主页**: https://github.com/your-org/library-management-system
- **问题反馈**: https://github.com/your-org/library-management-system/issues
- **邮箱**: support@yourdomain.com
- **文档网站**: https://docs.yourdomain.com

---

⭐ 如果这个项目对你有帮助，请给我们一个Star！