const prisma = require('../utils/prisma');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

/**
 * 获取Dashboard统计数据
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    // 获取当前日期和上个月的日期
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. 图书统计
    const [totalBooks, lastMonthBooks] = await Promise.all([
      prisma.books.count({ where: { is_deleted: false } }),
      prisma.books.count({
        where: {
          is_deleted: false,
          created_at: { lt: currentMonth }
        }
      })
    ]);

    // 2. 用户统计
    const [activeUsers, lastMonthActiveUsers] = await Promise.all([
      prisma.users.count({
        where: {
          status: 'active',
          role: 'patron',
          is_deleted: false
        }
      }),
      prisma.users.count({
        where: {
          status: 'active',
          role: 'patron',
          is_deleted: false,
          last_login_at: { gte: lastMonth, lt: currentMonth }
        }
      })
    ]);

    // 3. 借阅统计
    const [currentMonthBorrows, lastMonthBorrows] = await Promise.all([
      prisma.borrows.count({
        where: {
          created_at: { gte: currentMonth }
        }
      }),
      prisma.borrows.count({
        where: {
          created_at: { gte: lastMonth, lt: currentMonth }
        }
      })
    ]);

    // 4. 收入统计（基于积分交易 - 统计所有正向积分）
    const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
      prisma.points_transactions.aggregate({
        _sum: { points_change: true },
        where: {
          points_change: { gt: 0 },  // 只统计积分增加的交易
          created_at: { gte: currentMonth }
        }
      }),
      prisma.points_transactions.aggregate({
        _sum: { points_change: true },
        where: {
          points_change: { gt: 0 },  // 只统计积分增加的交易
          created_at: { gte: lastMonth, lt: currentMonth }
        }
      })
    ]);

    // 计算变化百分比
    const calculateChange = (current, last) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return Number(((current - last) / last * 100).toFixed(1));
    };

    // 统计卡片数据
    const statsData = [
      {
        key: 'totalBooks',
        label: '图书总数',
        value: totalBooks,
        change: calculateChange(totalBooks, lastMonthBooks),
        period: '较上月',
        type: 'primary'
      },
      {
        key: 'activeUsers',
        label: '活跃用户',
        value: activeUsers,
        change: calculateChange(activeUsers, lastMonthActiveUsers),
        period: '较上月',
        type: 'success'
      },
      {
        key: 'borrowings',
        label: '当月借阅',
        value: currentMonthBorrows,
        change: calculateChange(currentMonthBorrows, lastMonthBorrows),
        period: '较上月',
        type: 'warning'
      },
      {
        key: 'revenue',
        label: '系统积分',
        value: currentMonthRevenue._sum.points_change || 0,
        change: calculateChange(
          currentMonthRevenue._sum.points_change || 0,
          lastMonthRevenue._sum.points_change || 0
        ),
        period: '较上月',
        type: 'danger'
      }
    ];

    success(res, { stats: statsData }, '获取仪表盘统计数据成功');
});

/**
 * 获取借阅趋势数据
 */
const getBorrowTrend = asyncHandler(async (req, res) => {
    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate;
    let groupBy;
    let categories = [];

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          categories.push(`${i}日`);
        }
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        categories = ['第1月', '第2月', '第3月'];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        categories = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    }

    // 获取借阅数据
    const borrows = await prisma.borrows.findMany({
      where: {
        created_at: { gte: startDate }
      },
      select: {
        created_at: true,
        status: true
      }
    });

    // 处理数据
    const borrowData = new Array(categories.length).fill(0);
    const returnData = new Array(categories.length).fill(0);

    borrows.forEach(borrow => {
      const date = new Date(borrow.created_at);
      let index;

      switch (period) {
        case 'week':
          index = (date.getDay() + 6) % 7; // 周一为0
          break;
        case 'month':
          index = date.getDate() - 1;
          break;
        case 'quarter':
          index = date.getMonth() % 3;
          break;
        case 'year':
          index = date.getMonth();
          break;
        default:
          index = (date.getDay() + 6) % 7;
      }

      if (index >= 0 && index < categories.length) {
        borrowData[index]++;
        if (borrow.status === 'RETURNED') {
          returnData[index]++;
        }
      }
    });

    success(res, { categories, borrowData, returnData }, '获取借阅趋势成功');
});

/**
 * 获取图书分类统计
 */
const getCategoryStats = asyncHandler(async (req, res) => {
    const categories = await prisma.book_categories.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: { books: true }
        }
      }
    });

    const data = categories
      .filter(cat => cat._count.books > 0)
      .map(cat => ({
        value: cat._count.books,
        name: cat.name
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // 只取前6个分类

    success(res, data, '获取分类统计成功');
});

/**
 * 获取系统通知
 */
const getSystemNotifications = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;
    const userId = req.user?.id;

    const notifications = await prisma.notifications.findMany({
      where: {
        OR: [
          { user_id: userId },
          { user_id: null } // 系统通知
        ],
        is_read: false
      },
      take: parseInt(limit),
      orderBy: { created_at: 'desc' }
    });

    const formattedNotifications = notifications.map(notif => {
      let type = 'info';
      if (notif.type === 'WARNING') type = 'warning';
      if (notif.type === 'SUCCESS') type = 'success';
      if (notif.type === 'ERROR') type = 'error';

      return {
        id: notif.id,
        title: notif.title,
        description: notif.content,
        type,
        time: notif.created_at
      };
    });

    success(res, formattedNotifications, '获取系统通知成功');
});

module.exports = {
  getDashboardStats,
  getBorrowTrend,
  getCategoryStats,
  getSystemNotifications
};