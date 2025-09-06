#!/bin/bash

# Library Management System 部署脚本
# 作者: ultrathink

echo "开始部署图书管理系统..."

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose未安装${NC}"
    exit 1
fi

# 检查环境变量配置文件
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}警告: 未找到.env.production文件${NC}"
    echo "请创建.env.production文件并配置以下环境变量:"
    echo "DB_HOST=8.133.18.41"
    echo "DB_USER=root"
    echo "DB_PASSWORD=root"
    echo "REDIS_HOST=8.133.18.41"
    echo "JWT_SECRET=da555f549f113d99ee0b85fb180ba187d0ec4a6a47325ded9272a777d8271ed4"
    exit 1
fi

# 加载环境变量
set -a
source .env.production
set +a

echo -e "${GREEN}✓ 环境变量已加载${NC}"

# 停止旧的容器
echo "停止旧的容器..."
docker-compose down

# 构建前端
echo "构建前端..."
cd admin-panel
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "构建前端生产版本..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}错误: 前端构建失败${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✓ 前端构建完成${NC}"

# 检查后端依赖
echo "检查后端环境..."
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}错误: 后端项目文件不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 后端项目检查完成${NC}"

# 构建和启动容器
echo "构建并启动Docker容器..."
echo "- 构建后端服务（Node.js + Express）"
echo "- 启动Nginx反向代理"
echo "- 配置网络和存储卷"

docker-compose --env-file .env.production up -d --build

echo -e "${GREEN}✓ Docker容器部署完成${NC}"

# 初始化数据库
echo "初始化数据库..."
sleep 5
if docker exec library_backend_prod npm run db:push 2>/dev/null; then
    echo -e "${GREEN}✓ 数据库初始化成功${NC}"
else
    echo -e "${YELLOW}⚠ 数据库初始化可能需要手动执行${NC}"
    echo "请手动运行: docker exec library_backend_prod npm run db:push"
fi

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ 部署成功！${NC}"
    echo ""
    echo "服务访问地址:"
    echo "- 前端管理面板: http://8.133.18.41:8080"
    echo "- 备用访问地址: http://8.133.18.41"
    echo "- 后端API: http://8.133.18.41:3000"
    echo ""
    echo "查看服务状态: docker-compose ps"
    echo "查看日志: docker-compose logs -f"
else
    echo -e "${RED}✗ 部署失败，请检查日志${NC}"
    docker-compose logs
    exit 1
fi