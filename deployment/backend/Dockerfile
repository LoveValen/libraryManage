# 使用官方Node.js LTS版本作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs \
    && adduser -S library -u 1001

# 复制package文件
COPY backend/package*.json ./

# 开发依赖安装阶段
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# 开发阶段
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY backend/ .
USER library
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 构建阶段
FROM deps AS build
COPY backend/ .
RUN npm run build 2>/dev/null || echo "No build script defined"

# 生产阶段
FROM base AS production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 复制生产依赖
COPY --from=deps --chown=library:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=library:nodejs backend/ .

# 复制启动脚本
COPY --chown=library:nodejs deployment/backend/start.sh ./start.sh

# 创建必要的目录并设置脚本权限
RUN mkdir -p public/uploads public/ebooks public/pdf-viewer logs \
    && chown -R library:nodejs public logs \
    && chmod +x start.sh

# 切换到非root用户
USER library

# 暴露端口
EXPOSE 3000

# 健康检查已禁用
# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#   CMD curl -f http://localhost:3000/api/v1/health || exit 1

# 使用dumb-init作为PID 1进程
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["./start.sh"]