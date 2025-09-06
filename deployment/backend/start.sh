#!/bin/sh

# 启动脚本 - 确保Prisma客户端正确生成并启动应用
set -e

echo "🔄 生成Prisma客户端..."
npx prisma generate

echo "📊 检查数据库连接..."
# 等待数据库连接可用，最多等待60秒
for i in $(seq 1 60); do
  if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "✅ 数据库连接成功"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ 数据库连接超时"
    exit 1
  fi
  echo "⏳ 等待数据库连接... ($i/60)"
  sleep 1
done

echo "🚀 启动应用..."
exec node src/server.js