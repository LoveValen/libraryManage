#!/usr/bin/env node
/*
 * 脚本：seedReferenceData
 * 作用：为图书标签与图书存放位置写入一批默认基础数据。
 * 可重复执行（通过 upsert 保证幂等）。
 */

const prisma = require('../src/utils/prisma');

const defaultTags = [
  {
    name: '文学',
    code: 'LITERATURE',
    color: '#409EFF',
    description: '经典文学、小说、诗歌等相关图书',
    sortOrder: 1
  },
  {
    name: '科技',
    code: 'TECH',
    color: '#67C23A',
    description: '科学技术、工程与计算机类图书',
    sortOrder: 2
  },
  {
    name: '艺术',
    code: 'ART',
    color: '#E6A23C',
    description: '艺术史、设计、摄影、绘画等艺术类图书',
    sortOrder: 3
  },
  {
    name: '儿童',
    code: 'KIDS',
    color: '#F56C6C',
    description: '儿童文学、绘本与早教读物',
    sortOrder: 4
  },
  {
    name: '历史',
    code: 'HISTORY',
    color: '#909399',
    description: '历史、人文与社会科学类图书',
    sortOrder: 5
  }
];

const defaultLocations = [
  {
    name: '文学区 A 排',
    code: 'A-ROW-1',
    area: '文学区',
    floor: '1F',
    shelf: 'A-1',
    capacity: 200,
    sortOrder: 1,
    description: '文学类图书主书架'
  },
  {
    name: '科技区 B 排',
    code: 'B-ROW-1',
    area: '科技区',
    floor: '2F',
    shelf: 'B-1',
    capacity: 180,
    sortOrder: 2,
    description: '科技、工程类图书'
  },
  {
    name: '艺术区阅览室',
    code: 'ART-READ',
    area: '艺术区',
    floor: '3F',
    shelf: '阅览室-1',
    capacity: 80,
    sortOrder: 3,
    description: '艺术类图书阅览专架'
  },
  {
    name: '少儿区绘本角',
    code: 'KIDS-CORNER',
    area: '少儿区',
    floor: '1F',
    shelf: '儿童-1',
    capacity: 150,
    sortOrder: 4,
    description: '少儿绘本与益智读物'
  },
  {
    name: '综合区新书架',
    code: 'NEW-ARRIVALS',
    area: '综合区',
    floor: '1F',
    shelf: '新书-1',
    capacity: 120,
    sortOrder: 5,
    description: '最新上架的热门图书'
  }
];

async function seedTags() {
  console.log('🌱 开始写入默认图书标签...');
  for (const tag of defaultTags) {
    await prisma.book_tags.upsert({
      where: { name: tag.name },
      update: {
        code: tag.code,
        color: tag.color,
        description: tag.description,
        sort_order: tag.sortOrder,
        is_active: true
      },
      create: {
        name: tag.name,
        code: tag.code,
        color: tag.color,
        description: tag.description,
        sort_order: tag.sortOrder,
        is_active: true
      }
    });
    console.log(`  ✓ 标签：“${tag.name}” 已准备就绪`);
  }
}

async function seedLocations() {
  console.log('🌱 开始写入默认图书存放位置...');
  for (const location of defaultLocations) {
    await prisma.book_locations.upsert({
      where: { code: location.code },
      update: {
        name: location.name,
        area: location.area,
        floor: location.floor,
        shelf: location.shelf,
        capacity: location.capacity,
        sort_order: location.sortOrder,
        is_active: true,
        description: location.description
      },
      create: {
        name: location.name,
        code: location.code,
        area: location.area,
        floor: location.floor,
        shelf: location.shelf,
        capacity: location.capacity,
        sort_order: location.sortOrder,
        is_active: true,
        description: location.description
      }
    });
    console.log(`  ✓ 存放位置：“${location.name}” 已准备就绪`);
  }
}

async function main() {
  try {
    await seedTags();
    await seedLocations();
    console.log('\n✅ 默认基础数据已写入完成');
  } catch (error) {
    console.error('❌ 写入默认数据失败:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
