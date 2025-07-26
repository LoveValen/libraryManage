# 🚀 快速开始指南

欢迎加入图书馆管理系统的开发！本指南将帮助您快速搭建开发环境并开始贡献代码。

## 📋 环境要求

### 必需软件
- **Node.js** >= 16.0.0 ([下载地址](https://nodejs.org/))
- **MySQL** >= 8.0 ([下载地址](https://dev.mysql.com/downloads/mysql/))
- **Git** >= 2.0 ([下载地址](https://git-scm.com/downloads))

### 推荐软件
- **Redis** >= 6.0 (缓存和会话管理)
- **Docker** >= 20.0 (容器化开发)
- **Docker Compose** >= 1.29 (容器编排)

### 开发工具推荐
- **VS Code** - 推荐的代码编辑器
- **Postman** - API测试工具
- **MySQL Workbench** - 数据库管理工具
- **Redis Desktop Manager** - Redis可视化工具

## 📦 项目克隆与安装

### 1. 克隆项目
```bash
git clone https://github.com/yourname/library-management-system.git
cd library-management-system
```

### 2. 查看项目结构
```
library-management-system/
├── backend/           # 后端API服务
├── admin-panel/       # PC管理平台
├── mini-program/      # 小程序客户端
├── deployment/        # 部署配置
├── docs/             # 项目文档
└── assets/           # 共享资源
```

## 🔧 后端开发环境搭建

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
nano .env
```

### 3. 配置数据库连接
编辑 `.env` 文件，配置以下数据库信息：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=library_management
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here

# 微信小程序配置（可选）
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
```

### 4. 创建数据库
```sql
-- 登录MySQL后执行
CREATE DATABASE library_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动开发服务器
```bash
# 开发模式启动
npm run dev

# 或者正常启动
npm start
```

### 6. 验证安装
访问以下地址验证安装是否成功：
- **健康检查**: http://localhost:3000/health
- **API信息**: http://localhost:3000/api
- **API文档**: http://localhost:3000/api/docs

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T10:30:00.000Z",
  "service": "Library Management System",
  "version": "1.0.0"
}
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

## 🐳 Docker开发环境（推荐）

### 1. 使用Docker Compose启动
```bash
# 启动完整开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

### 2. 服务地址
- **后端API**: http://localhost:3000
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

### 3. 停止服务
```bash
docker-compose -f docker-compose.dev.yml down
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