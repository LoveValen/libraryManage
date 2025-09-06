# 前端生产环境Dockerfile - 多阶段构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production=false

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 生产阶段 - Nginx
FROM nginx:alpine AS production

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制构建好的静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY ../deployment/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]