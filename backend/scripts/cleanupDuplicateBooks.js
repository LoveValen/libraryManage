#!/usr/bin/env node
/**
 * 脚本：cleanupDuplicateBooks
 * 目标：针对相同书名的重复馆藏记录，仅保留一条主记录，并合并其余记录的
 *       借阅、书评、标签等关联数据，确保最终每个书名只对应一家出版社版本。
 * 使用方式：
 *   1. 先确认数据库中已存在重复书名（来自抓取或导入脚本）；
 *   2. 在项目根目录执行 `node backend/scripts/cleanupDuplicateBooks.js`；
 *   3. 脚本会输出处理明细，并对被保留的记录做库存/评分等统计更新。
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = require('../src/utils/prisma');

function normalizeArray(jsonValue) {
  if (!jsonValue) return [];
  if (Array.isArray(jsonValue)) return jsonValue;
  try {
    const parsed = JSON.parse(jsonValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function mergeTagRelations(sourceBookId, targetBookId) {
  const relations = await prisma.book_tag_relations.findMany({
    where: { book_id: sourceBookId }
  });

  for (const relation of relations) {
    await prisma.book_tag_relations.upsert({
      where: {
        book_id_tag_id: {
          book_id: targetBookId,
          tag_id: relation.tag_id
        }
      },
      update: {},
      create: {
        book_id: targetBookId,
        tag_id: relation.tag_id,
        assigned_at: relation.assigned_at
      }
    });
  }
}

async function reassignRelations(sourceBookId, targetBookId) {
  await mergeTagRelations(sourceBookId, targetBookId);

  const genericHandlers = [
    {
      label: 'book_files',
      fetch: () => prisma.book_files.findMany({ where: { book_id: sourceBookId }, select: { id: true } }),
      update: (record) => prisma.book_files.update({ where: { id: record.id }, data: { book_id: targetBookId } }),
      remove: (record) => prisma.book_files.delete({ where: { id: record.id } })
    },
    {
      label: 'recommendation_feedbacks',
      fetch: () => prisma.recommendation_feedbacks.findMany({ where: { book_id: sourceBookId }, select: { id: true } }),
      update: (record) => prisma.recommendation_feedbacks.update({ where: { id: record.id }, data: { book_id: targetBookId } }),
      remove: (record) => prisma.recommendation_feedbacks.delete({ where: { id: record.id } })
    },
    {
      label: 'recommendations',
      fetch: () => prisma.recommendations.findMany({ where: { book_id: sourceBookId }, select: { id: true } }),
      update: (record) => prisma.recommendations.update({ where: { id: record.id }, data: { book_id: targetBookId } }),
      remove: (record) => prisma.recommendations.delete({ where: { id: record.id } })
    },
    {
      label: 'user_behaviors',
      fetch: () => prisma.user_behaviors.findMany({ where: { book_id: sourceBookId }, select: { id: true } }),
      update: (record) => prisma.user_behaviors.update({ where: { id: record.id }, data: { book_id: targetBookId } }),
      remove: (record) => prisma.user_behaviors.delete({ where: { id: record.id } })
    }
  ];

  for (const handler of genericHandlers) {
    const records = await handler.fetch();
    if (!records.length) continue;

    let updated = 0;
    for (const record of records) {
      try {
        await handler.update(record);
        updated += 1;
      } catch (error) {
        if (error.code === 'P2002') {
          await handler.remove(record);
          console.log(`    ⚠️ 删除 ${handler.label} 冲突记录 ID ${record.id}`);
        } else {
          throw error;
        }
      }
    }

    if (updated > 0) {
      console.log(`    ↪ 关联表 ${handler.label} 更新 ${updated} 条`);
    }
  }

  const borrows = await prisma.borrows.findMany({ where: { book_id: sourceBookId } });
  for (const borrow of borrows) {
    try {
      await prisma.borrows.update({ where: { id: borrow.id }, data: { book_id: targetBookId } });
    } catch (error) {
      if (error.code === 'P2002') {
        await prisma.borrows.delete({ where: { id: borrow.id } });
        console.log(`    ⚠️ 删除重复借阅记录 ID ${borrow.id}`);
      } else {
        throw error;
      }
    }
  }

  const reviews = await prisma.reviews.findMany({ where: { book_id: sourceBookId } });
  for (const review of reviews) {
    try {
      await prisma.reviews.update({ where: { id: review.id }, data: { book_id: targetBookId } });
    } catch (error) {
      if (error.code === 'P2002') {
        await prisma.reviews.delete({ where: { id: review.id } });
        console.log(`    ⚠️ 删除重复书评 ID ${review.id}`);
      } else {
        throw error;
      }
    }
  }
}

async function updateCanonicalStats(bookId) {
  const [borrowCount, reviewAgg] = await Promise.all([
    prisma.borrows.count({ where: { book_id: bookId } }),
    prisma.reviews.aggregate({
      where: { book_id: bookId },
      _count: { _all: true },
      _avg: { rating: true }
    })
  ]);

  await prisma.books.update({
    where: { id: bookId },
    data: {
      borrow_count: borrowCount,
      review_count: reviewAgg._count._all,
      average_rating: reviewAgg._count._all ? Number(reviewAgg._avg.rating?.toFixed(2)) : null
    }
  });
}

async function cleanupDuplicates() {
  const duplicateGroups = await prisma.books.groupBy({
    by: ['title'],
    _count: { id: true },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  if (duplicateGroups.length === 0) {
    console.log('✅ 未检测到重复书名，无需处理。');
    return;
  }

  console.log(`🔍 检测到 ${duplicateGroups.length} 个重复书名，开始处理...`);

  for (const group of duplicateGroups) {
    const books = await prisma.books.findMany({
      where: { title: group.title },
      orderBy: { id: 'asc' }
    });

    if (books.length <= 1) continue;

    const canonical = books[0];
    const duplicates = books.slice(1);

    console.log(`\n📘 书名：「${canonical.title}」`);
    console.log(`    保留ID：${canonical.id}（出版社：${canonical.publisher || '未知'}）`);

    let totalStock = canonical.total_stock || 0;
    let availableStock = canonical.available_stock || 0;
    let reservedStock = canonical.reserved_stock || 0;
    let viewCount = canonical.view_count || 0;
    let downloadCount = canonical.download_count || 0;

    let tagSet = new Set(normalizeArray(canonical.tags));

    for (const dup of duplicates) {
      console.log(`    合并重复ID：${dup.id}（出版社：${dup.publisher || '未知'}）`);

      await reassignRelations(dup.id, canonical.id);

      totalStock += dup.total_stock || 0;
      availableStock += dup.available_stock || 0;
      reservedStock += dup.reserved_stock || 0;
      viewCount += dup.view_count || 0;
      downloadCount += dup.download_count || 0;

      for (const tag of normalizeArray(dup.tags)) {
        tagSet.add(tag);
      }

      await prisma.books.delete({ where: { id: dup.id } });
    }

    await prisma.books.update({
      where: { id: canonical.id },
      data: {
        total_stock: totalStock,
        available_stock: Math.max(0, availableStock),
        reserved_stock: Math.max(0, reservedStock),
        view_count: viewCount,
        download_count: downloadCount,
        tags: Array.from(tagSet),
        updated_at: new Date()
      }
    });

    await updateCanonicalStats(canonical.id);
  }

  console.log('\n✅ 重复图书清理完成。');
}

cleanupDuplicates()
  .catch((error) => {
    console.error('❌ 清理过程失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
