/*
 * 中文图书分类数量报告脚本
 * 功能：统计“中文精选”分类下图书数量，便于验证导入结果。
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.books.count({
      where: { category: '中文精选' }
    })

    console.log(`中文精选分类当前共有 ${count} 本图书。`)
  } catch (error) {
    console.error('统计失败:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
