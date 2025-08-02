# 🚀 企业级开发指南

欢迎加入图书馆管理系统的企业级开发团队！本指南将帮助您快速搭建开发环境并掌握企业级开发流程。

## 📋 环境要求 (企业级标准)

### 必需软件
- **Node.js** >= 18.0.0 LTS ([下载地址](https://nodejs.org/)) - 企业级LTS版本
- **MySQL** >= 8.0 ([下载地址](https://dev.mysql.com/downloads/mysql/)) - 高性能数据库
- **Git** >= 2.0 ([下载地址](https://git-scm.com/downloads)) - 版本控制

### 推荐软件 (企业级工具链)
- **Docker** >= 20.0 (容器化开发) - 推荐使用
- **Docker Compose** >= 2.0 (容器编排) - 企业级部署
- **Redis** >= 6.0 (会话存储和缓存) - 性能优化

### 开发工具推荐
- **VS Code** - 企业级代码编辑器 + 扩展包
- **Postman/Insomnia** - API测试工具
- **Prisma Studio** - 现代化数据库管理界面
- **Redis CLI/RedisInsight** - Redis管理工具
- **Docker Desktop** - 容器管理界面

### 企业级架构特性
- ✅ **86ms极速启动** - 优化的Express.js架构
- ✅ **请求追踪** - UUID全链路追踪 + 性能监控
- ✅ **优雅关闭** - 零停机部署支持
- ✅ **健康检查** - 多层次系统健康验证
- ✅ **安全强化** - Helmet + HSTS + 输入清理
- ✅ **Prisma ORM** - 类型安全的现代化数据库工具

## 📦 项目克隆与安装

### 1. 克隆项目
```bash
git clone https://github.com/yourname/library-management-system.git
cd library-management-system
```

### 2. 企业级项目结构 (模块化架构)
```
library-management-system/
├── backend/                    # 🏢 企业级Express.js后端
│   ├── src/
│   │   ├── app.js             # 应用工厂 (45行精简设计)
│   │   ├── server.js          # 服务器生命周期管理
│   │   ├── config/            # 配置模块 (分离关注点)
│   │   ├── middlewares/       # 企业级中间件栈
│   │   ├── controllers/       # 业务控制器
│   │   ├── services/          # 业务服务层
│   │   ├── routes/            # API路由定义
│   │   ├── utils/             # 工具库 (已优化)
│   │   └── prisma/            # Prisma ORM 配置
│   ├── logs/                  # 结构化日志目录
│   ├── uploads/               # 文件上传目录
│   ├── tests/                 # 测试套件
│   └── package.json           # 依赖配置
├── admin-panel/               # 🖥️ Vue.js 3 管理前端
│   ├── src/                   # Vue.js源代码
│   ├── public/                # 静态资源
│   └── package.json           # 前端依赖
├── mini-program/              # 📱 微信小程序 (预留)
├── docs/                      # 📚 完整技术文档
│   ├── api/                   # API接口文档
│   ├── database/              # 数据库设计文档
│   ├── deployment/            # 部署运维文档
│   ├── development/           # 开发指南
│   └── design/                # 系统设计文档
├── docker-compose.yml         # 🐳 Docker容器编排
├── CLAUDE.md                  # Claude Code 配置
└── README.md                  # 项目说明
```

## 🔧 企业级后端开发环境搭建

### 1. 安装依赖 (企业级包管理)
```bash
cd backend
npm install
```

### 2. 环境配置 (企业级安全)
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件 (重要: 修改默认密码)
nano .env
```

### 3. 企业级环境变量配置
编辑 `.env` 文件，配置以下信息：
```env
# 应用配置 (企业级)
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
APP_NAME=Library Management System
APP_VERSION=1.0.0

# 数据库配置 (Prisma + MySQL 8.0)
DB_HOST=localhost
DB_PORT=3307
DB_NAME=library_management
DB_USER=root
DB_PASSWORD=password
DATABASE_URL="mysql://root:password@localhost:3307/library_management"

# Redis配置 (会话存储)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置 (企业级安全)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 安全配置 (企业级)
AUDIT_ENCRYPTION_KEY=your-encryption-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 开发配置
LOG_LEVEL=debug
ENABLE_CORS=true
ENABLE_SWAGGER=true
```

### 4. Prisma数据库初始化 (现代化ORM)
```bash
# 生成Prisma客户端
npm run db:generate

# 推送数据库架构 (开发环境快速启动)
npm run db:push

# 或创建迁移 (生产环境标准流程)
npm run db:migrate

# 打开Prisma Studio (可视化数据库管理)
npm run db:studio
```

### 5. 启动企业级开发服务器
```bash
# 开发模式启动 (带热重载和调试)
npm run dev

# 启动成功标识 (86ms极速启动)
╔══════════════════════════════════════════════════════════╗
║          📚 Library Management System API 📚             ║
║                 现代图书馆管理系统 v1.0.0                   ║
║    🚀 企业级 • 🔒 安全 • ⚡ 高性能 • 🛡️ 可靠              ║
╚══════════════════════════════════════════════════════════╝

🎉 系统启动成功！
🌐 服务器地址: http://0.0.0.0:3000
📚 API基础URL: http://0.0.0.0:3000/api/v1  
🏥 健康检查: http://0.0.0.0:3000/health
📖 API文档: http://0.0.0.0:3000/api/docs
⚡ 启动耗时: 86ms
```

### 6. 验证企业级特性
访问以下地址验证企业级功能：

#### 健康检查系统
```bash
curl http://localhost:3000/health
```
预期响应 (多层次健康信息)：
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

#### 请求追踪验证
```bash
# 测试UUID请求追踪
curl -H "x-request-id: test-trace-123" http://localhost:3000/health

# 检查日志中的追踪信息
tail -f logs/combined.log | grep "test-trace-123"
```

#### API文档访问
- **Swagger文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/health  
- **API基础**: http://localhost:3000/api/v1

#### 性能监控验证
```bash
# 查看慢请求监控 (>1000ms 自动警告)
curl "http://localhost:3000/api/v1/books?delay=1500"

# 检查性能日志
tail -f logs/combined.log | grep "慢请求检测"
```

## 💻 前端开发环境搭建

### PC管理平台
```bash
cd admin-panel
npm install
npm run dev
```
访问: http://localhost:8080

### 小程序开发
```bash
cd mini-program
npm install
# 使用HBuilderX打开项目进行开发
```

## 🐳 Docker企业级开发环境（强烈推荐）

### 1. 企业级Docker工作流
```bash
# 1. 启动数据库服务 (MySQL 8.0 + Redis)
docker-compose up -d mysql redis
echo "等待数据库启动..."
sleep 10

# 2. 初始化Prisma数据库
cd backend
npm run db:generate
npm run db:push  # 开发环境快速启动
cd ..

# 3. 启动完整企业级开发环境
docker-compose up -d

# 4. 验证企业级特性
echo "🔍 验证服务启动..."
sleep 30

# 健康检查
curl -f http://localhost:3000/health && echo "✅ 后端健康检查通过"

# 验证请求追踪
curl -H "x-request-id: docker-test-trace" http://localhost:3000/health

# 检查企业级启动日志
docker-compose logs backend | grep "启动成功"
```

### 2. 企业级服务地址 (已优化端口配置)
- **后端API**: http://localhost:3000 (企业级Express.js)
- **前端管理**: http://localhost:8080 (Vue.js 3)
- **MySQL**: localhost:3307 (避免端口冲突)
- **Redis**: localhost:6379 (会话存储)
- **Prisma Studio**: http://localhost:5555 (数据库管理)

### 3. 企业级容器管理
```bash
# 查看服务状态 (带健康检查)
docker-compose ps

# 查看企业级日志 (结构化)
docker-compose logs -f backend | grep -E "(REQUEST|PERFORMANCE|ERROR)"

# 监控性能指标
docker stats library-backend library-mysql library-redis

# 进入容器调试
docker exec -it library-backend sh

# Prisma数据库管理
docker exec -it library-backend npx prisma studio

# 优雅停止服务
docker-compose down
```

### 4. 企业级开发调试
```bash
# 查看结构化日志
docker-compose logs backend | grep '"level":'

# 监控慢请求 (>1000ms)
docker-compose logs backend | grep "慢请求检测"

# 检查内存使用
docker exec library-backend sh -c 'ps aux && free -m'

# 测试健康检查
curl -v http://localhost:3000/health

# 验证安全头
curl -I http://localhost:3000/health
```

## 🔧 开发工具配置

### VS Code扩展推荐
创建 `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### VS Code设置
创建 `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "files.eol": "\n",
  "javascript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.preferences.includePackageJsonAutoImports": "auto"
}
```

### ESLint配置
后端项目已包含ESLint配置，运行以下命令检查代码：
```bash
# 检查代码风格
npm run lint

# 自动修复
npm run lint:fix
```

### Prettier配置
项目已包含Prettier配置，运行以下命令格式化代码：
```bash
npm run format
```

## 🧪 运行测试

### 单元测试
```bash
cd backend
npm test
```

### 测试覆盖率
```bash
npm run test:coverage
```

### API测试
使用Postman导入测试集合：
```bash
# 位置: docs/api/postman/Library-API.postman_collection.json
```

## 🔍 调试指南

### 后端调试
1. **VS Code调试配置**
创建 `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "node",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

2. **日志调试**
```javascript
// 使用项目内置的logger
const { logger } = require('./utils/logger');

logger.debug('调试信息', { data: someData });
logger.info('一般信息');
logger.warn('警告信息');
logger.error('错误信息', error);
```

### 数据库调试
```bash
# 查看SQL查询日志
tail -f logs/debug-*.log | grep SQL

# 或者在代码中启用Sequelize日志
// config/database.config.js
logging: console.log
```

## 📊 开发工作流

### 1. 创建功能分支
```bash
git checkout -b feature/new-feature-name
```

### 2. 开发流程
1. 编写代码
2. 运行测试 `npm test`
3. 检查代码风格 `npm run lint`
4. 提交代码 `git commit -m "feat: add new feature"`

### 3. 代码提交规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
```bash
# 功能开发
git commit -m "feat: add user authentication"

# Bug修复
git commit -m "fix: resolve login validation issue"

# 文档更新
git commit -m "docs: update API documentation"

# 样式修改
git commit -m "style: format code with prettier"

# 重构代码
git commit -m "refactor: improve error handling"

# 性能优化
git commit -m "perf: optimize database queries"

# 测试相关
git commit -m "test: add unit tests for auth service"
```

### 4. 创建Pull Request
```bash
git push origin feature/new-feature-name
# 然后在GitHub上创建PR
```

## 🚨 常见问题解决

### 1. 数据库连接失败
```bash
# 检查MySQL是否运行
sudo systemctl status mysql

# 检查端口占用
netstat -tlnp | grep 3306

# 测试连接
mysql -h localhost -u root -p
```

### 2. 端口占用问题
```bash
# 查找占用3000端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用不同端口
PORT=3001 npm run dev
```

### 3. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. JWT密钥未设置
```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 添加到.env文件
JWT_SECRET=生成的密钥
```

## 📚 学习资源

### 技术文档
- [Node.js官方文档](https://nodejs.org/docs/)
- [Express.js指南](https://expressjs.com/guide/)
- [Sequelize文档](https://sequelize.org/docs/)
- [MySQL文档](https://dev.mysql.com/doc/)

### 项目相关
- [API文档](../api/README.md)
- [数据库设计](../database/schema.md)
- [编码规范](./coding-standards.md)
- [测试指南](./testing-guide.md)

## 🤝 获取帮助

### 社区支持
- **GitHub Issues**: [提交问题](https://github.com/yourname/library-management-system/issues)
- **讨论区**: [参与讨论](https://github.com/yourname/library-management-system/discussions)
- **邮件支持**: [发送邮件](mailto:dev@library.com)

### 开发团队
- **技术负责人**: [@tech-lead](https://github.com/tech-lead)
- **后端开发**: [@backend-dev](https://github.com/backend-dev)
- **前端开发**: [@frontend-dev](https://github.com/frontend-dev)

## ✅ 开发环境检查清单

完成以下检查确保开发环境正确搭建：

- [ ] Node.js版本 >= 16.0.0
- [ ] MySQL服务正常运行
- [ ] 后端项目依赖安装成功
- [ ] 环境变量文件配置完成
- [ ] 数据库连接测试通过
- [ ] 后端服务启动成功
- [ ] API接口响应正常
- [ ] 代码格式化工具配置完成
- [ ] Git提交规范了解
- [ ] 测试命令执行成功

恭喜！您已经成功搭建了开发环境，可以开始贡献代码了！🎉

---

💡 **提示**: 如果遇到任何问题，请先查看[常见问题解决](#🚨-常见问题解决)部分，或在Issues中搜索类似问题。