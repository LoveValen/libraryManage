#!/bin/sh

# 启动脚本 - 确保Prisma客户端正确生成并启动应用
set -e

echo "🔄 生成Prisma客户端..."
npx prisma generate

echo "📊 检查数据库连接..."
# 测试数据库连接，最多等待30秒
for i in $(seq 1 30); do
  if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "✅ 数据库连接成功，Schema已同步"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "⚠️ 数据库连接或Schema同步失败，但继续启动应用"
    echo "请确保外部数据库可访问且Schema正确"
    break
  fi
  echo "⏳ 等待数据库连接... ($i/30)"
  sleep 2
done

echo "🚀 启动应用..."
exec node src/server.js