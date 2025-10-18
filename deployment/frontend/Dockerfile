# 前端生产环境Dockerfile - 多阶段构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制前端package文件
COPY admin-panel/package*.json ./

# 安装依赖（包含构建所需的开发依赖）
RUN npm ci

# 复制前端源代码
COPY admin-panel/ .

# 构建生产版本
RUN npm run build

# 生产阶段 - Nginx
FROM nginx:alpine AS production

# 复制构建好的静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY deployment/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查（使用镜像自带 wget 避免额外安装 curl）
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]