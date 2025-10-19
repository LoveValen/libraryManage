#!/bin/bash

# Library Management System Docker部署脚本
# 完全基于Docker的部署，无需手动安装Node.js等环境

echo "🚀 开始Docker部署图书管理系统..."

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker未安装${NC}"
    echo "请先安装Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker Compose未安装${NC}"
    echo "请先安装Docker Compose"
    exit 1
fi

# 使用兼容的docker-compose命令
DOCKER_COMPOSE_CMD="docker-compose -f docker-compose.yml"
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose -f docker-compose.yml"
fi

echo -e "${GREEN}✅ Docker环境检查通过${NC}"

# 检查环境变量配置文件
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️ 创建生产环境配置文件${NC}"
    cat > .env.production << EOF
# 数据库配置
DB_HOST=mysql
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=library_db

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# JWT配置
JWT_SECRET=da555f549f113d99ee0b85fb180ba187d0ec4a6a47325ded9272a777d8271ed4
JWT_EXPIRES_IN=7d

# 应用配置
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:8080

# 外部访问地址（根据实际情况修改）
EXTERNAL_HOST=8.133.18.41
EOF
    echo -e "${GREEN}✅ 已创建.env.production配置文件${NC}"
fi

# 加载环境变量
set -a
source .env.production
set +a

echo -e "${GREEN}✅ 环境变量已加载${NC}"

# 停止旧的容器
echo -e "${BLUE}🛑 停止旧的容器...${NC}"
$DOCKER_COMPOSE_CMD down --remove-orphans

# 清理旧的镜像（可选）
echo -e "${BLUE}🧹 清理未使用的Docker镜像...${NC}"
docker image prune -f

# 拉取最新代码（如果是git仓库）
if [ -d ".git" ]; then
    echo -e "${BLUE}📥 拉取最新代码...${NC}"
    # 设置远程仓库地址
    git remote set-url origin https://github.com/LoveValen/libraryManage.git
    git pull origin main || echo -e "${YELLOW}⚠️ Git拉取失败，继续使用本地代码${NC}"
else
    echo -e "${BLUE}📥 克隆代码仓库...${NC}"
    git clone https://github.com/LoveValen/libraryManage.git /tmp/library_source
    if [ $? -eq 0 ]; then
        cp -r /tmp/library_source/* ./
        cp -r /tmp/library_source/.* ./ 2>/dev/null || true
        rm -rf /tmp/library_source
        echo -e "${GREEN}✅ 代码克隆成功${NC}"
    else
        echo -e "${YELLOW}⚠️ Git克隆失败，继续使用本地代码${NC}"
    fi
fi

# 构建和启动所有服务
echo -e "${BLUE}🔨 构建并启动所有Docker服务...${NC}"
echo "包含服务:"
echo "  - MySQL 8.4数据库"
echo "  - Redis 7.2缓存"
echo "  - Node.js后端API"
echo "  - Vue.js前端应用"
echo "  - Nginx反向代理"

$DOCKER_COMPOSE_CMD up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker容器启动完成${NC}"

# 等待数据库启动
echo -e "${BLUE}⏳ 等待数据库启动...${NC}"
sleep 30

# 初始化数据库
echo -e "${BLUE}💾 初始化数据库...${NC}"
# 等待后端服务完全启动
echo -e "${BLUE}⏳ 等待后端服务启动...${NC}"
for i in {1..30}; do
    if $DOCKER_COMPOSE_CMD exec -T backend curl -f http://localhost:3000/api >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务已启动${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# 推送数据库架构
$DOCKER_COMPOSE_CMD exec -T backend npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库初始化成功${NC}"
else
    echo -e "${YELLOW}⚠️ 数据库初始化失败，请手动执行:${NC}"
    echo "  $DOCKER_COMPOSE_CMD exec backend npm run db:push"
fi

# 等待所有服务就绪
echo -e "${BLUE}⏳ 等待所有服务就绪...${NC}"
sleep 10

# 检查服务状态
echo -e "${BLUE}🔍 检查服务状态...${NC}"
$DOCKER_COMPOSE_CMD ps

# 服务检查
echo -e "${BLUE}🔍 执行服务检查...${NC}"
BACKEND_HEALTH=$($DOCKER_COMPOSE_CMD exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000")

if [ "$BACKEND_HEALTH" = "200" ] && [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}🎉 部署成功！所有服务正常运行${NC}"
    echo ""
    echo "📱 服务访问地址:"
    echo "  🌐 前端管理面板: http://${EXTERNAL_HOST:-localhost}:8080"
    echo "  🔧 后端API: http://${EXTERNAL_HOST:-localhost}:3000"
    echo "  📊 API文档: http://${EXTERNAL_HOST:-localhost}:3000/api/docs"
    echo ""
    echo "🛠️  管理命令:"
    echo "  查看服务状态: $DOCKER_COMPOSE_CMD ps"
    echo "  查看日志: $DOCKER_COMPOSE_CMD logs -f"
    echo "  停止服务: $DOCKER_COMPOSE_CMD down"
    echo "  重启服务: $DOCKER_COMPOSE_CMD restart"
    echo ""
    echo "🔑 默认登录信息:"
    echo "  用户名: admin"
    echo "  密码: admin123"
else
    echo -e "${RED}❌ 部署失败，请检查日志${NC}"
    echo "后端服务检查: $BACKEND_HEALTH (期望: 200)"
    echo "前端服务检查: $FRONTEND_HEALTH (期望: 200)"
    echo ""
    echo "查看详细日志:"
    echo "  $DOCKER_COMPOSE_CMD logs backend"
    echo "  $DOCKER_COMPOSE_CMD logs frontend"
    exit 1
fi