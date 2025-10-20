#!/usr/bin/env node
/**
 * 脚本：seedOperationalData
 * 用途：在存在基础图书与读者数据的前提下，批量生成借阅、积分、通知与书评等业务数据，
 *       让管理后台的关键模块拥有可演示的真实样例。
 * 使用条件：
 *   1. 已成功执行 RBAC、基础标签/馆藏、图书与普通用户的种子脚本；
 *   2. 数据库连接信息已通过 backend/.env 或环境变量正确配置；
 *   3. 当前数据库中尚未写入借阅记录（脚本会在发现已有数据时自动跳过，以保持幂等）。
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../src/utils/prisma');

// 统一的日期格式化，便于通知文案复用。
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 预置馆员账号，便于借阅记录引用 processed_by 字段。
const STAFF_DEFINITIONS = [
  {
    username: 'librarian01',
    email: 'librarian01@library.com',
    phone: '13900000081',
    realName: '李雯',
    password: 'Lib@123456',
    role: 'librarian'
  },
  {
    username: 'librarian02',
    email: 'librarian02@library.com',
    phone: '13900000082',
    realName: '陈立',
    password: 'Lib@123456',
    role: 'librarian'
  }
];

// 使用内存态结构维护积分累计值，避免多次查询。
const userPointsState = new Map();

async function ensureStaffAccounts() {
  const librarianRole = await prisma.roles.findUnique({ where: { code: 'Librarian' } });

  if (!librarianRole) {
    throw new Error('未找到 "Librarian" 角色，请先执行 npm run seed:rbac 同步 RBAC 数据');
  }

  const staffList = [];

  for (const staff of STAFF_DEFINITIONS) {
    const existing = await prisma.users.findUnique({ where: { username: staff.username } });
    let userRecord;

    if (existing) {
      userRecord = await prisma.users.update({
        where: { id: existing.id },
        data: {
          email: staff.email,
          phone: staff.phone,
          real_name: staff.realName,
          role: staff.role,
          status: 'active',
          is_deleted: false,
          updated_at: new Date()
        }
      });
    } else {
      const passwordHash = await bcrypt.hash(staff.password, 12);
      userRecord = await prisma.users.create({
        data: {
          username: staff.username,
          email: staff.email,
          phone: staff.phone,
          password_hash: passwordHash,
          real_name: staff.realName,
          role: staff.role,
          status: 'active',
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log(`  ✓ 新建馆员账号：${staff.realName} (${staff.username})`);
    }

    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: userRecord.id,
          role_id: librarianRole.id
        }
      },
      update: {},
      create: {
        user_id: userRecord.id,
        role_id: librarianRole.id,
        created_at: new Date()
      }
    });

    staffList.push(userRecord);
  }

  return staffList;
}

async function getUserPointsState(userId) {
  if (!userPointsState.has(userId)) {
    const now = new Date();
    let record = await prisma.user_points.findUnique({ where: { user_id: userId } });

    if (!record) {
      record = await prisma.user_points.create({
        data: {
          user_id: userId,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          level: 'NEWCOMER',
          level_name: '新手读者',
          progress_to_next_level: new Prisma.Decimal(0),
          created_at: now,
          updated_at: now
        }
      });
    }

    userPointsState.set(userId, {
      balance: record.balance || 0,
      totalEarned: record.total_earned || 0,
      totalSpent: record.total_spent || 0
    });
  }

  return userPointsState.get(userId);
}

async function applyPointsChange({
  userId,
  change,
  type,
  description,
  relatedBorrowId,
  processedBy,
  occurredAt
}) {
  const state = await getUserPointsState(userId);
  const previous = state.balance;
  const current = previous + change;

  state.balance = current;
  if (change > 0) state.totalEarned += change;
  if (change < 0) state.totalSpent += Math.abs(change);

  await prisma.points_transactions.create({
    data: {
      user_id: userId,
      points_change: change,
      current_balance: current,
      previous_balance: previous,
      transaction_type: type,
      description,
      related_entity_type: 'borrow',
      related_entity_id: relatedBorrowId,
      processed_by: processedBy,
      status: 'completed',
      created_at: occurredAt,
      updated_at: occurredAt
    }
  });

  const progress = Math.min(100, Math.max(0, (state.balance / 500) * 100));

  await prisma.user_points.upsert({
    where: { user_id: userId },
    update: {
      balance: current,
      total_earned: state.totalEarned,
      total_spent: state.totalSpent,
      last_transaction_at: occurredAt,
      progress_to_next_level: new Prisma.Decimal(progress.toFixed(2)),
      updated_at: new Date()
    },
    create: {
      user_id: userId,
      balance: current,
      total_earned: change > 0 ? change : 0,
      total_spent: change < 0 ? -change : 0,
      level: 'NEWCOMER',
      level_name: '新手读者',
      next_level_points: 500,
      progress_to_next_level: new Prisma.Decimal(progress.toFixed(2)),
      last_transaction_at: occurredAt,
      created_at: occurredAt,
      updated_at: occurredAt
    }
  });
}

async function seedBorrowsAndRelatedData({ patrons, staff, books }) {
  const borrowCount = await prisma.borrows.count();
  if (borrowCount > 0) {
    console.log('⚠️ 检测到数据库已有借阅记录，保持幂等，本次不重复写入。');
    return { createdBorrows: 0, createdReviews: 0, createdNotifications: 0, createdTransactions: 0 };
  }

  if (!patrons.length) {
    throw new Error('未找到任何读者（role=patron），请先执行 node scripts/addUsers.js');
  }

  if (!books.length) {
    throw new Error('未找到可用图书，请先执行 seedReferenceData 或其他导入脚本。');
  }

  const librarian = staff[0];
  const stats = {
    createdBorrows: 0,
    createdReviews: 0,
    createdNotifications: 0,
    createdTransactions: 0
  };

  let bookCursor = 0;
  const now = new Date();
  const reviewPhrases = [
    '情节紧凑，读起来非常过瘾。',
    '信息量很大，适合作为系统学习材料。',
    '作者观点新颖，拓宽了阅读视角。',
    '语言流畅，案例贴近生活。',
    '结构清晰，便于查阅和复习。'
  ];

  for (let i = 0; i < patrons.length; i += 1) {
    const patron = patrons[i];
    const scenarioStatuses = ['returned', 'borrowed', 'overdue'];

    for (let j = 0; j < scenarioStatuses.length; j += 1) {
      if (bookCursor >= books.length) break;
      const book = books[bookCursor];
      bookCursor += 1;

      const status = scenarioStatuses[j];
      const borrowDate = new Date(now);
      borrowDate.setDate(now.getDate() - (30 + i * 5 + j * 3));
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 30);

      let returnDate = null;
      let actualReturnDate = null;
      let overdueDays = 0;
      let fine = new Prisma.Decimal(0);
      let finePaid = false;

      if (status === 'returned') {
        actualReturnDate = new Date(dueDate);
        actualReturnDate.setDate(actualReturnDate.getDate() - 1);
        returnDate = actualReturnDate;
      }

      if (status === 'overdue') {
        overdueDays = 6 + (i % 3);
        const overdueFine = 2 * overdueDays; // 每日 2 分罚金
        fine = new Prisma.Decimal(overdueFine.toFixed(2));
        finePaid = false;
      }

      const borrowRecord = await prisma.borrows.create({
        data: {
          user_id: patron.id,
          book_id: book.id,
          borrow_date: borrowDate,
          due_date: dueDate,
          return_date: returnDate,
          actual_return_date: actualReturnDate,
          status,
          borrow_days: 30,
          renewal_count: status === 'borrowed' ? 1 : 0,
          max_renewals: 2,
          overdue_days: overdueDays,
          fine,
          fine_paid: finePaid,
          condition: 'good',
          borrow_notes: status === 'borrowed' ? '读者申请延长借阅时段，已批准一次续借。' : null,
          processed_by: librarian.id,
          is_deleted: false,
          created_at: borrowDate,
          updated_at: now
        }
      });

      stats.createdBorrows += 1;

      const updatedBorrowCount = (book.borrow_count || 0) + 1;
      let updatedAvailable = book.available_stock || 0;
      if (status !== 'returned') {
        updatedAvailable = Math.max(0, updatedAvailable - 1);
      }

      await prisma.books.update({
        where: { id: book.id },
        data: {
          borrow_count: updatedBorrowCount,
          available_stock: updatedAvailable,
          updated_at: now
        }
      });
      book.borrow_count = updatedBorrowCount;
      book.available_stock = updatedAvailable;

      if (status === 'borrowed') {
        const createdAt = new Date(now);
        await prisma.notifications.create({
          data: {
            user_id: patron.id,
            type: 'borrow_reminder',
            title: `《${book.title}》即将到期，请按时归还`,
            content: `您于 ${formatDate(borrowDate)} 借阅的《${book.title}》将在 ${formatDate(dueDate)} 到期，如需续借请尽快联系馆员。`,
            priority: 'normal',
            status: 'sent',
            is_read: false,
            related_id: borrowRecord.id,
            related_type: 'borrow',
            action_url: `/borrows/${borrowRecord.id}`,
            created_at: createdAt,
            updated_at: createdAt
          }
        });
        stats.createdNotifications += 1;

        await applyPointsChange({
          userId: patron.id,
          change: 10,
          type: 'BORROW_BOOK',
          description: `借阅《${book.title}》奖励积分`,
          relatedBorrowId: borrowRecord.id,
          processedBy: librarian.id,
          occurredAt: borrowDate
        });
        stats.createdTransactions += 1;
      }

      if (status === 'returned') {
        const reviewRating = 4 + ((i + j) % 2);
        const reviewCreatedAt = actualReturnDate || dueDate;
        const reviewContent = `【读后感】${reviewPhrases[(i + j) % reviewPhrases.length]}`;

        await prisma.reviews.create({
          data: {
            user_id: patron.id,
            book_id: book.id,
            borrow_id: borrowRecord.id,
            rating: reviewRating,
            title: `《${book.title}》读后感`,
            content: reviewContent,
            tags: ['内容扎实', '值得推荐'],
            is_recommended: reviewRating >= 4,
            helpful_count: 3 + ((i + j) % 4),
            unhelpful_count: (i + j) % 2,
            status: 'published',
            language: 'zh-CN',
            created_at: reviewCreatedAt,
            updated_at: reviewCreatedAt
          }
        });
        stats.createdReviews += 1;

        const prevCount = book.review_count || 0;
        const prevAverage = book.average_rating ? Number(book.average_rating) : null;
        const newCount = prevCount + 1;
        const newAverage = prevAverage
          ? ((prevAverage * prevCount + reviewRating) / newCount)
          : reviewRating;

        await prisma.books.update({
          where: { id: book.id },
          data: {
            review_count: newCount,
            average_rating: new Prisma.Decimal(newAverage.toFixed(2)),
            updated_at: now
          }
        });
        book.review_count = newCount;
        book.average_rating = Number(newAverage.toFixed(2));

        const createdAt = new Date(reviewCreatedAt);
        await prisma.notifications.create({
          data: {
            user_id: patron.id,
            type: 'points_change',
            title: `《${book.title}》归还成功，积分已发放`,
            content: `感谢按时归还《${book.title}》，系统已额外奖励 5 积分，欢迎继续借阅。`,
            priority: 'normal',
            status: 'sent',
            is_read: false,
            related_id: borrowRecord.id,
            related_type: 'borrow',
            action_url: `/points/transactions`,
            created_at: createdAt,
            updated_at: createdAt
          }
        });
        stats.createdNotifications += 1;

        await applyPointsChange({
          userId: patron.id,
          change: 5,
          type: 'RETURN_ON_TIME',
          description: `按时归还《${book.title}》奖励积分`,
          relatedBorrowId: borrowRecord.id,
          processedBy: librarian.id,
          occurredAt: reviewCreatedAt
        });
        stats.createdTransactions += 1;
      }

      if (status === 'overdue') {
        const createdAt = new Date(now);
        await prisma.notifications.create({
          data: {
            user_id: patron.id,
            type: 'overdue_warning',
            title: `《${book.title}》已逾期 ${overdueDays} 天，请尽快归还`,
            content: `您借阅的《${book.title}》已逾期 ${overdueDays} 天，当前累计罚金 ${fine.toFixed(2)} 元，请联系馆员完成归还与缴费。`,
            priority: 'high',
            status: 'sent',
            is_read: false,
            related_id: borrowRecord.id,
            related_type: 'borrow',
            action_url: `/borrows/${borrowRecord.id}`,
            created_at: createdAt,
            updated_at: createdAt
          }
        });
        stats.createdNotifications += 1;

        await applyPointsChange({
          userId: patron.id,
          change: -10,
          type: 'RETURN_LATE',
          description: `《${book.title}》逾期扣减积分`,
          relatedBorrowId: borrowRecord.id,
          processedBy: librarian.id,
          occurredAt: now
        });
        stats.createdTransactions += 1;
      }
    }
  }

  return stats;
}

async function main() {
  console.log('🚀 开始执行业务数据种子脚本...');

  try {
    const staff = await ensureStaffAccounts();
    const patrons = await prisma.users.findMany({
      where: {
        role: 'patron',
        is_deleted: false,
        status: 'active'
      },
      orderBy: { id: 'asc' }
    });

    const books = await prisma.books.findMany({
      where: { is_deleted: false },
      orderBy: { borrow_count: 'desc' }
    });

    const stats = await seedBorrowsAndRelatedData({ patrons, staff, books });

    console.log('\n📊 种子写入完成：');
    console.table({
      借阅记录: stats.createdBorrows,
      书评数量: stats.createdReviews,
      通知数量: stats.createdNotifications,
      积分变动: stats.createdTransactions
    });

    console.log('✅ 业务数据已准备就绪，可在后台模块中直接演示。');
  } catch (error) {
    console.error('❌ 种子执行失败：', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
