# 🐳 Docker部署指南 - 企业级部署方案

本指南详细介绍如何使用Docker和Docker Compose部署图书馆管理系统的企业级架构，包括开发环境和生产环境的完整配置。

## 📋 系统要求

### 硬件要求
- **CPU**: 2核心以上 (生产环境推荐4核心)
- **内存**: 4GB以上 (生产环境推荐8GB+)
- **存储**: 20GB以上可用空间 (生产环境推荐50GB+)
- **网络**: 稳定的互联网连接 (生产环境推荐专线)

### 软件要求
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: >= 2.0.0
- **Node.js**: >= 18.0.0 (开发环境)

### 架构特性
- ✅ **86ms极速启动** - 优化的企业级Express.js架构
- ✅ **请求追踪** - UUID全链路追踪 + 性能监控
- ✅ **优雅关闭** - 零停机部署 + 连接管理
- ✅ **健康检查** - 多层次健康验证系统
- ✅ **安全强化** - Helmet + HSTS + 输入清理
- ✅ **Prisma ORM** - 类型安全的数据库操作

## 🚀 快速开始 (企业级部署)

### 1. 克隆项目
```bash
git clone <repository-url>
cd library-management-system
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑环境变量 (重要: 修改默认密码)
nano backend/.env
```

### 3. 数据库初始化 (Prisma)
```bash
# 进入后端目录
cd backend

# 生成Prisma客户端
npm run db:generate

# 推送数据库架构 (开发环境)
npm run db:push

# 或运行数据库迁移 (生产环境)
npm run db:migrate
```

### 4. 启动服务
```bash
# 开发环境 (推荐)
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 5. 验证部署
```bash
# 检查服务状态
docker-compose ps

# 访问健康检查端点
curl http://localhost:3000/health

# 访问前端管理界面
open http://localhost:8080
```

### 6. 默认账户
```
管理员登录:
用户名: admin
密码: admin123

前端界面: http://localhost:8080
后端API: http://localhost:3000
API文档: http://localhost:3000/api/docs
健康检查: http://localhost:3000/health
```

## 🔧 开发环境部署 (当前配置)

### docker-compose.yml (主配置文件)
```yaml
version: '3.8'

services:
  # MySQL 8.0 数据库 (端口3307避免冲突)
  mysql:
    image: mysql:8.0
    container_name: library-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: library_management
      MYSQL_USER: library_user
      MYSQL_PASSWORD: password
    ports:
      - "3307:3306"  # 避免与本地MySQL冲突
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - library-network

  # Redis 6.0+ 缓存 (会话存储)
  redis:
    image: redis:7-alpine
    container_name: library-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - library-network

  # 后端API服务 (企业级Express.js)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: library-backend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: "mysql://root:password@mysql:3306/library_management"
      JWT_SECRET: "your-super-secret-jwt-key"
      JWT_EXPIRES_IN: "7d"
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/logs:/app/logs  # 日志目录映射
    depends_on:
      - mysql
      - redis
    command: npm run dev
    networks:
      - library-network
    # 企业级健康检查
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Vue.js 3 前端管理平台
  admin-panel:
    build:
      context: ./admin-panel
      dockerfile: Dockerfile.dev
    container_name: library-admin-panel
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./admin-panel:/app
      - /app/node_modules
    environment:
      VITE_API_BASE_URL: http://localhost:3000/api/v1
    command: npm run dev
    networks:
      - library-network
    depends_on:
      - backend

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local

networks:
  library-network:
    driver: bridge
    name: library-dev-network
```

### 启动开发环境 (企业级工作流)
```bash
# 1. 启动数据库服务
docker-compose up -d mysql redis
echo "等待数据库启动..."
sleep 10

# 2. 初始化Prisma数据库
cd backend
npm install
npm run db:generate
npm run db:push
cd ..

# 3. 启动所有服务
docker-compose up -d

# 4. 验证企业级特性
echo "🔍 验证服务启动..."
sleep 30

# 健康检查
curl -f http://localhost:3000/health && echo "✅ 后端健康检查通过"

# 检查企业级启动日志
docker-compose logs backend | grep "启动成功"

# 验证请求追踪
curl -H "x-request-id: test-trace-id" http://localhost:3000/health
```

### 开发环境管理命令
```bash
# 查看服务状态 (带健康检查)
docker-compose ps

# 查看企业级日志 (结构化)
docker-compose logs -f backend | grep -E "(REQUEST|PERFORMANCE|ERROR)"

# 监控性能指标
docker stats library-backend library-mysql library-redis

# 重启后端服务 (优雅重启)
docker-compose restart backend

# 数据库管理
docker exec -it library-mysql mysql -u root -p library_management

# Redis 监控
docker exec -it library-redis redis-cli info memory

# 停止服务 (优雅关闭)
docker-compose down
```

### Prisma 数据库管理
```bash
# 进入后端容器
docker exec -it library-backend sh

# 在容器内执行Prisma命令
npx prisma studio                    # 打开数据库管理界面
npx prisma migrate dev               # 创建新迁移
npx prisma migrate deploy            # 部署迁移
npx prisma db seed                   # 填充种子数据
npx prisma generate                  # 重新生成客户端
```

## 🏭 生产环境部署

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  # MySQL数据库
  mysql:
    image: mysql:8.0
    container_name: library-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/conf:/etc/mysql/conf.d
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - backend-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: library-redis
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - backend-network

  # 后端API服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: library-backend
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      REDIS_HOST: redis
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mysql
      - redis
    networks:
      - backend-network
      - frontend-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 前端管理平台
  admin-panel:
    build:
      context: ./admin-panel
      dockerfile: Dockerfile
    container_name: library-admin
    restart: always
    environment:
      VUE_APP_API_BASE_URL: https://api.yourdomain.com/api/v1
    networks:
      - frontend-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: library-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
      - ./docker/ssl:/etc/nginx/ssl
      - nginx_logs:/var/log/nginx
    depends_on:
      - backend
      - admin-panel
    networks:
      - frontend-network

volumes:
  mysql_data:
  redis_data:
  nginx_logs:

networks:
  backend-network:
    driver: bridge
  frontend-network:
    driver: bridge
```

## 📁 Docker配置文件

### backend/Dockerfile
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生产阶段
FROM node:18-alpine

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# 更改所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["npm", "start"]
```

### backend/Dockerfile.dev
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装nodemon用于开发环境热重载
RUN npm install -g nodemon

# 复制依赖文件
COPY package*.json ./

# 安装依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "run", "dev"]
```

### admin-panel/Dockerfile
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 环境变量配置 (企业级配置)

### backend/.env.example (实际配置)
```env
# 应用配置
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
APP_NAME=Library Management System
APP_VERSION=1.0.0

# 数据库配置 (Prisma + MySQL)
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

# 第三方服务配置 (可选)
# ELASTICSEARCH_NODE=http://localhost:9200

# 邮件配置 (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# 安全配置 (企业级)
AUDIT_ENCRYPTION_KEY=your-encryption-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 外部服务配置
WEBHOOK_URL=https://your-webhook-url.com

# 开发配置
LOG_LEVEL=debug
ENABLE_CORS=true
ENABLE_SWAGGER=true
```

### 生产环境配置 (.env.production)
```env
# 生产环境配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_NAME=Library Management System
APP_VERSION=1.0.0

# 数据库配置 (生产级)
DATABASE_URL="mysql://username:secure_password@production-db:3306/library_management"

# Redis配置 (生产级)
REDIS_HOST=production-redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

# JWT配置 (生产级安全)
JWT_SECRET=extremely-secure-production-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# HTTPS配置
FORCE_HTTPS=true
TRUST_PROXY=true

# 邮件配置 (生产级)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=secure_email_password

# 安全配置 (生产级)
AUDIT_ENCRYPTION_KEY=production-encryption-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# 监控配置
ENABLE_LOGGING=true
LOG_LEVEL=warn
ENABLE_CORS=false
ENABLE_SWAGGER=false

# 备份配置
BACKUP_ENABLED=true
BACKUP_INTERVAL=daily
BACKUP_RETENTION=30
```

### Docker Compose 环境变量
```env
# docker-compose.yml 使用的环境变量
COMPOSE_PROJECT_NAME=library-management
MYSQL_ROOT_PASSWORD=password
MYSQL_DATABASE=library_management
MYSQL_USER=library_user
MYSQL_PASSWORD=password
```

## 🌐 Nginx配置

### docker/nginx/nginx.conf
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 包含虚拟主机配置
    include /etc/nginx/conf.d/*.conf;
}
```

### docker/nginx/conf.d/default.conf
```nginx
# API服务器配置
upstream backend {
    server backend:3000;
    keepalive 32;
}

# 主要服务器配置
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL配置
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 管理后台
    location / {
        proxy_pass http://admin-panel;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API接口
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }

    # 健康检查
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🗄️ 数据库初始化

### docker/mysql/init/01-init.sql
```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS library_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER IF NOT EXISTS 'library_user'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON library_management.* TO 'library_user'@'%';
FLUSH PRIVILEGES;

-- 设置时区
SET time_zone = '+8:00';
```

### docker/mysql/conf/my.cnf
```ini
[mysql]
default-character-set = utf8mb4

[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+8:00'

# InnoDB配置
innodb_buffer_pool_size = 128M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_lock_wait_timeout = 50

# 连接配置
max_connections = 200
max_connect_errors = 6000
open_files_limit = 65535
table_open_cache = 128
max_allowed_packet = 64M

# 查询缓存
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 5
```

## 🚀 部署脚本

### deploy.sh
```bash
#!/bin/bash

set -e

echo "🚀 开始部署图书馆管理系统..."

# 检查环境
if [ ! -f .env ]; then
    echo "❌ .env文件不存在，请先配置环境变量"
    exit 1
fi

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🔍 执行健康检查..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ 部署成功！服务运行正常"
else
    echo "❌ 部署失败！服务未正常启动"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "🎉 部署完成！"
echo "📍 访问地址: https://yourdomain.com"
```

## 📊 监控和日志

### 查看服务状态
```bash
# 查看所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend

# 查看资源使用情况
docker stats

# 进入容器调试
docker exec -it library-backend sh
```

### 备份数据库
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="library_backup_${DATE}.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker exec library-mysql mysqldump -u root -p${DB_ROOT_PASSWORD} library_management > $BACKUP_DIR/$BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_DIR/$BACKUP_FILE

# 清理30天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "数据库备份完成: $BACKUP_DIR/${BACKUP_FILE}.gz"
```

## 🔧 维护命令

### 常用维护命令
```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend

# 查看容器资源使用
docker exec library-backend top

# 清理未使用的镜像和容器
docker system prune -a

# 更新服务
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 扩展服务实例
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## 🚨 故障排除 (企业级诊断)

### 常见问题与解决方案

#### 1. 企业级后端启动失败
```bash
# 查看详细错误信息
docker-compose logs backend

# 检查Prisma连接
docker exec library-backend npx prisma db pull

# 验证环境变量
docker exec library-backend printenv | grep -E "(DATABASE_URL|JWT_SECRET)"

# 检查端口冲突 (3000端口)
netstat -tulpn | grep :3000
lsof -i :3000  # Mac/Linux
```

#### 2. MySQL数据库连接问题 (端口3307)
```bash
# 检查MySQL容器状态
docker exec library-mysql mysql -u root -p -e "SHOW DATABASES;"

# 测试连接字符串
docker exec library-backend sh -c 'mysql -h mysql -P 3306 -u root -p$DB_PASSWORD -e "SELECT 1;"'

# 检查端口映射
docker port library-mysql

# 重置数据库
docker-compose down mysql
docker volume rm library-mysql-data
docker-compose up -d mysql
```

#### 3. Vue.js前端连接问题 (端口8080)
```bash
# 检查前端构建
docker-compose logs admin-panel

# 验证API连接
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/health

# 检查CORS配置
curl -H "Origin: http://localhost:8080" -v http://localhost:3000/health

# 重新构建前端
docker-compose build admin-panel
```

#### 4. 企业级性能问题
```bash
# 检查86ms启动时间
docker-compose logs backend | grep "启动耗时"

# 监控慢请求 (>1000ms)
docker-compose logs backend | grep "慢请求检测"

# 内存使用监控
docker stats library-backend --no-stream

# 健康检查状态
curl -v http://localhost:3000/health
```

#### 5. Prisma相关问题
```bash
# 重新生成Prisma客户端
docker exec library-backend npx prisma generate

# 检查数据库架构同步
docker exec library-backend npx prisma db push --preview-feature

# 查看Prisma状态
docker exec library-backend npx prisma migrate status

# 重置Prisma
docker exec library-backend npx prisma migrate reset --force
```

#### 6. 企业级日志和监控
```bash
# 查看结构化日志
docker-compose logs backend | grep '"level":'

# 检查请求追踪
curl -H "x-request-id: debug-trace-123" http://localhost:3000/health

# 查看Winston日志文件
docker exec library-backend ls -la logs/
docker exec library-backend tail -f logs/combined.log

# 性能指标监控
docker exec library-backend sh -c 'ps aux && free -m'
```

#### 7. 网络和安全问题
```bash
# 检查Docker网络
docker network ls
docker network inspect library-dev-network

# 验证安全头
curl -I http://localhost:3000/health

# 检查CORS设置
curl -H "Origin: http://unauthorized-domain.com" -v http://localhost:3000/health

# 验证JWT配置
docker exec library-backend sh -c 'echo $JWT_SECRET'
```

### 🛠️ 快速诊断脚本
```bash
#!/bin/bash
# diagnose.sh - 企业级系统诊断

echo "🔍 企业级图书管理系统诊断开始..."

# 1. 检查Docker服务
echo "📦 检查Docker服务..."
docker --version
docker-compose --version

# 2. 检查容器状态
echo "🐳 检查容器状态..."
docker-compose ps

# 3. 检查端口占用
echo "🔌 检查端口占用..."
netstat -tulpn | grep -E ":(3000|3307|8080|6379)"

# 4. 检查健康状态
echo "❤️ 检查服务健康状态..."
curl -f http://localhost:3000/health && echo "✅ 后端健康" || echo "❌ 后端异常"
curl -f http://localhost:8080 && echo "✅ 前端正常" || echo "❌ 前端异常"

# 5. 检查数据库连接
echo "🗄️ 检查数据库连接..."
docker exec library-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1;" && echo "✅ 数据库正常" || echo "❌ 数据库异常"

# 6. 检查企业级特性
echo "🏢 检查企业级特性..."
docker-compose logs backend | grep -q "启动成功" && echo "✅ 企业级启动正常" || echo "❌ 启动异常"

echo "🎉 诊断完成！"
```

### 📞 获取支持
- **技术文档**: [后端架构详解](../../backend/README.md)
- **问题报告**: GitHub Issues
- **紧急联系**: support@library.com

---

⚡ **企业级部署建议**:
- 生产环境使用强密码和安全密钥
- 定期备份MySQL数据 (建议每日)
- 监控系统资源使用率
- 启用HTTPS和安全头配置
- 定期更新Docker镜像版本