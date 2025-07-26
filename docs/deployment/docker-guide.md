# 🐳 Docker部署指南

本指南详细介绍如何使用Docker和Docker Compose部署图书馆管理系统，包括开发环境和生产环境的完整配置。

## 📋 系统要求

### 硬件要求
- **CPU**: 2核心以上
- **内存**: 4GB以上 (生产环境推荐8GB)
- **存储**: 20GB以上可用空间
- **网络**: 稳定的互联网连接

### 软件要求
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: >= 2.0.0

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd library-management-system
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 3. 启动服务
```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 开发环境部署

### docker-compose.dev.yml
```yaml
version: '3.8'

services:
  # MySQL数据库
  mysql:
    image: mysql:8.0
    container_name: library-mysql-dev
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: library-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # 后端API服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: library-backend-dev
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DB_HOST: mysql
      REDIS_HOST: redis
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mysql
      - redis
    command: npm run dev

  # 前端管理平台
  admin-panel:
    build:
      context: ./admin-panel
      dockerfile: Dockerfile.dev
    container_name: library-admin-dev
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./admin-panel:/app
      - /app/node_modules
    environment:
      VUE_APP_API_BASE_URL: http://localhost:3000/api/v1
    command: npm run dev

volumes:
  mysql_data:
  redis_data:

networks:
  default:
    name: library-dev-network
```

### 启动开发环境
```bash
# 启动所有服务
docker-compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker-compose -f docker-compose.dev.yml ps

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f backend

# 停止服务
docker-compose -f docker-compose.dev.yml down
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

## 🔧 环境变量配置

### .env.example
```env
# 应用配置
NODE_ENV=production
PORT=3000
APP_NAME=Library Management System

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=library_management
DB_USER=root
DB_PASSWORD=your_secure_password
DB_ROOT_PASSWORD=your_root_password

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 微信配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,pdf

# 日志配置
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# API限流配置
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
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

## 🚨 故障排除

### 常见问题

1. **容器启动失败**
```bash
# 查看详细错误信息
docker-compose -f docker-compose.prod.yml logs backend

# 检查配置文件
docker-compose -f docker-compose.prod.yml config
```

2. **数据库连接失败**
```bash
# 检查数据库容器状态
docker exec library-mysql mysql -u root -p -e "SHOW DATABASES;"

# 检查网络连接
docker exec library-backend ping mysql
```

3. **内存不足**
```bash
# 查看内存使用
docker stats --no-stream

# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

📝 **注意**: 生产环境部署前请确保所有密码和密钥都已正确配置，并定期备份数据。