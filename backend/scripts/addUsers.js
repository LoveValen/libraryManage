#!/usr/bin/env node
/**
 * 脚本：addUsers
 * 作用：为系统添加普通用户账号
 * 说明：可重复执行，已存在的用户会被跳过
 */

const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

// 定义要添加的普通用户列表
const normalUsers = [
  {
    username: 'student001',
    email: 'student001@library.com',
    password: '123456', // 默认密码，建议首次登录修改
    realName: '张三',
    phone: '13800138001',
    role: 'patron'
  },
  {
    username: 'student002',
    email: 'student002@library.com',
    password: '123456',
    realName: '李四',
    phone: '13800138002',
    role: 'patron'
  },
  {
    username: 'student003',
    email: 'student003@library.com',
    password: '123456',
    realName: '王五',
    phone: '13800138003',
    role: 'patron'
  },
  {
    username: 'student004',
    email: 'student004@library.com',
    password: '123456',
    realName: '赵六',
    phone: '13800138004',
    role: 'patron'
  },
  {
    username: 'student005',
    email: 'student005@library.com',
    password: '123456',
    realName: '钱七',
    phone: '13800138005',
    role: 'patron'
  },
  {
    username: 'reader001',
    email: 'reader001@library.com',
    password: '123456',
    realName: '孙八',
    phone: '13800138006',
    role: 'patron'
  },
  {
    username: 'reader002',
    email: 'reader002@library.com',
    password: '123456',
    realName: '周九',
    phone: '13800138007',
    role: 'patron'
  },
  {
    username: 'reader003',
    email: 'reader003@library.com',
    password: '123456',
    realName: '吴十',
    phone: '13800138008',
    role: 'patron'
  }
];

/**
 * 添加用户到数据库
 */
async function addUsers() {
  console.log('👥 开始添加普通用户...\n');

  let addedCount = 0;
  let skippedCount = 0;

  for (const userData of normalUsers) {
    try {
      // 检查用户名是否已存在
      const existingUser = await prisma.users.findUnique({
        where: { username: userData.username }
      });

      if (existingUser) {
        console.log(`  ↺ 用户 "${userData.username}" (${userData.realName}) 已存在，跳过`);
        skippedCount++;
        continue;
      }

      // 检查邮箱是否已存在
      if (userData.email) {
        const existingEmail = await prisma.users.findUnique({
          where: { email: userData.email }
        });

        if (existingEmail) {
          console.log(`  ⚠️  邮箱 "${userData.email}" 已被使用，跳过用户 "${userData.username}"`);
          skippedCount++;
          continue;
        }
      }

      // 检查手机号是否已存在
      if (userData.phone) {
        const existingPhone = await prisma.users.findFirst({
          where: { 
            phone: userData.phone,
            is_deleted: false 
          }
        });

        if (existingPhone) {
          console.log(`  ⚠️  手机号 "${userData.phone}" 已被使用，跳过用户 "${userData.username}"`);
          skippedCount++;
          continue;
        }
      }

      // 使用事务创建用户和积分记录
      await prisma.$transaction(async (tx) => {
        // 哈希密码
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(userData.password, salt);

        // 创建用户
        const newUser = await tx.users.create({
          data: {
            username: userData.username,
            email: userData.email,
            password_hash: passwordHash,
            real_name: userData.realName,
            phone: userData.phone,
            role: userData.role || 'patron',
            status: 'active',
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // 为新用户创建积分记录
        await tx.user_points.create({
          data: {
            user_id: newUser.id,
            balance: 100, // 初始积分
            total_earned: 100,
            total_spent: 0,
            level: 'NEWCOMER',
            level_name: '新手读者',
            next_level_points: 500,
            progress_to_next_level: 20.0,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // 创建初始积分交易记录
        await tx.points_transactions.create({
          data: {
            user_id: newUser.id,
            points_change: 100,
            current_balance: 100,
            previous_balance: 0,
            transaction_type: 'BONUS_REWARD',
            description: '新用户注册奖励',
            status: 'completed',
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        console.log(`  ✓ 成功添加用户："${userData.username}" (${userData.realName}) - 邮箱: ${userData.email}`);
        addedCount++;
      });

    } catch (error) {
      console.error(`  ❌ 添加用户 "${userData.username}" 失败:`, error.message);
    }
  }

  console.log(`\n📊 统计结果:`);
  console.log(`   - 新增用户: ${addedCount} 个`);
  console.log(`   - 跳过用户: ${skippedCount} 个`);
  console.log(`   - 总计处理: ${normalUsers.length} 个`);
  console.log(`\n💡 提示: 所有用户的默认密码为 "123456"，建议提醒用户首次登录后修改密码。\n`);
}

/**
 * 主函数
 */
async function main() {
  try {
    await addUsers();
    console.log('✅ 用户添加完成！\n');
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

