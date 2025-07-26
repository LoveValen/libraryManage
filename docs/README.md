# 📚 图书馆管理系统文档中心

欢迎来到现代图书馆管理系统的文档中心！这里包含了系统的完整技术文档、用户指南和开发资源。

## 📋 文档结构

### 🔌 [API文档](./api/)
- [认证API](./api/auth.md) - 用户认证、注册、登录接口
- [图书API](./api/books.md) - 图书管理相关接口
- [用户API](./api/users.md) - 用户管理接口
- [借阅API](./api/borrows.md) - 借阅管理接口
- [积分API](./api/points.md) - 积分系统接口

### 💾 [数据库文档](./database/)
- [数据库架构](./database/schema.md) - 完整的数据库设计说明
- [ER关系图](./database/er-diagram.png) - 实体关系图
- [数据迁移指南](./database/migration-guide.md) - 数据库迁移和升级

### 🚀 [部署文档](./deployment/)
- [服务器环境搭建](./deployment/server-setup.md) - 生产环境配置
- [Docker部署指南](./deployment/docker-guide.md) - 容器化部署
- [Nginx配置](./deployment/nginx-config.md) - 反向代理配置
- [SSL证书配置](./deployment/ssl-setup.md) - HTTPS安全配置

### 💻 [开发文档](./development/)
- [快速开始指南](./development/getting-started.md) - 开发环境搭建
- [编码规范](./development/coding-standards.md) - 代码风格指南
- [Git工作流程](./development/git-workflow.md) - 版本控制规范
- [测试指南](./development/testing-guide.md) - 测试策略和实践

### 👥 [用户手册](./user-manual/)
- [管理员指南](./user-manual/admin-guide.md) - PC管理平台使用指南
- [用户指南](./user-manual/user-guide.md) - 小程序使用指南
- [常见问题](./user-manual/faq.md) - FAQ和故障排除

### 🎨 [设计文档](./design/)
- [系统架构设计](./design/architecture.md) - 整体架构说明
- [游戏化设计](./design/gamification.md) - 积分系统设计理念
- [UI设计稿](./design/ui-mockups/) - 界面设计资源
- [用户流程图](./design/user-flows/) - 用户交互流程

## 🔧 技术栈概览

### 后端技术
- **Node.js 18+** - 服务器运行环境
- **Express.js** - Web应用框架
- **Sequelize** - ORM数据库操作
- **MySQL 8.0** - 关系型数据库
- **JWT** - 身份认证
- **Redis** - 缓存和会话管理
- **Docker** - 容器化部署

### 前端技术
- **Vue 3** - PC管理平台前端框架
- **Element Plus** - UI组件库
- **Vite** - 构建工具
- **Pinia** - 状态管理
- **uni-app** - 小程序跨平台框架

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Jest** - 单元测试框架
- **Swagger** - API文档生成

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0 (可选)
- Docker >= 20.0 (可选)

### 安装与启动

1. **克隆项目**
```bash
git clone <repository-url>
cd library-management-system
```

2. **后端启动**
```bash
cd backend
npm install
cp .env.example .env
# 配置数据库连接信息
npm run dev
```

3. **前端启动**
```bash
cd admin-panel
npm install
npm run dev
```

4. **数据库初始化**
```bash
# 后端会自动创建表结构和初始管理员账户
# 默认管理员: admin / admin123
```

## 📖 文档导航

### 新手入门
1. 📘 [快速开始指南](./development/getting-started.md)
2. 🏗️ [系统架构概览](./design/architecture.md)
3. 🔐 [认证API使用](./api/auth.md)

### 管理员
1. 👨‍💼 [管理员使用指南](./user-manual/admin-guide.md)
2. 📊 [用户管理](./api/users.md)
3. 📚 [图书管理](./api/books.md)

### 开发者
1. 💻 [开发环境搭建](./development/getting-started.md)
2. 📝 [编码规范](./development/coding-standards.md)
3. 🧪 [测试指南](./development/testing-guide.md)

### 运维人员
1. 🐳 [Docker部署](./deployment/docker-guide.md)
2. 🌐 [Nginx配置](./deployment/nginx-config.md)
3. 🔒 [SSL证书配置](./deployment/ssl-setup.md)

## 🆘 支持与反馈

### 获取帮助
- 📧 邮箱支持: [support@library.com](mailto:support@library.com)
- 💬 在线讨论: [GitHub Issues](https://github.com/yourname/library-management-system/issues)
- 📚 文档问题: [Documentation Issues](https://github.com/yourname/library-management-system/issues?q=label%3Adocumentation)

### 贡献指南
- 🐛 [报告Bug](https://github.com/yourname/library-management-system/issues/new?template=bug_report.md)
- 💡 [功能建议](https://github.com/yourname/library-management-system/issues/new?template=feature_request.md)
- 🔧 [提交代码](./development/git-workflow.md)

## 📋 更新日志

### v1.0.0 (2025-01-12)
- ✨ 初始版本发布
- 🔐 JWT认证系统
- 📚 图书管理功能
- 🎮 积分游戏化系统
- 📱 小程序支持
- 🐳 Docker部署支持

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

---

📝 **文档维护**: 如发现文档错误或需要更新，请提交 [Issue](https://github.com/yourname/library-management-system/issues) 或 [Pull Request](https://github.com/yourname/library-management-system/pulls)。

🔄 **最后更新**: 2025年1月12日