const prisma = require('../utils/prisma');
const { 
  NotFoundError, 
  BadRequestError,
  ForbiddenError 
} = require('../utils/apiError');

/**
 * 高级分析服务 (Prisma版本)
 * 提供全面的图书馆运营分析和预测
 */
class AnalyticsService {
  /**
   * 获取综合仪表板数据
   */
  async getDashboardAnalytics(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 默认30天
      endDate = new Date(),
      granularity = 'day' // day, week, month
    } = options;

    const [
      overviewStats,
      trendData,
      topBooks,
      activeUsers,
      categoryStats,
      performanceMetrics,
      predictiveInsights
    ] = await Promise.all([
      this.getOverviewStatistics(startDate, endDate),
      this.getTrendAnalytics(startDate, endDate, granularity),
      this.getTopPerformingBooks(startDate, endDate),
      this.getActiveUserAnalytics(startDate, endDate),
      this.getCategoryAnalytics(startDate, endDate),
      this.getPerformanceMetrics(startDate, endDate),
      this.getPredictiveInsights(startDate, endDate)
    ]);

    return {
      overview: overviewStats,
      trends: trendData,
      topBooks,
      activeUsers,
      categories: categoryStats,
      performance: performanceMetrics,
      predictions: predictiveInsights,
      period: { startDate, endDate, granularity }
    };
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStatistics(startDate, endDate) {
    const [
      totalBooks,
      totalUsers,
      totalBorrows,
      activeBorrows,
      overdueBorrows,
      totalReviews,
      totalPoints,
      newUsers,
      newBorrows,
      returnRate
    ] = await Promise.all([
      // 总图书数
      prisma.books.count(),
      
      // 总用户数 (排除管理员)
      prisma.users.count({ 
        where: { 
          role: { in: ['patron', 'librarian'] } 
        } 
      }),
      
      // 总借阅数
      prisma.borrows.count(),
      
      // 当前活跃借阅
      prisma.borrows.count({
        where: { 
          status: 'borrowed'
        }
      }),
      
      // 逾期借阅
      prisma.borrows.count({
        where: { 
          status: 'overdue'
        }
      }),
      
      // 总评价数
      prisma.reviews.count(),
      
      // 总积分流通 (只计算正积分)
      prisma.points_transactions.aggregate({
        where: { points_change: { gt: 0 } },
        _sum: { points_change: true }
      }).then(result => Number(result._sum.points_change || 0)),
      
      // 期间新用户
      prisma.users.count({
        where: {
          role: { in: ['patron', 'librarian'] },
          created_at: { 
            gte: startDate,
            lte: endDate 
          }
        }
      }),
      
      // 期间新借阅
      prisma.borrows.count({
        where: {
          borrow_date: { 
            gte: startDate,
            lte: endDate 
          }
        }
      }),
      
      // 归还率计算
      this.calculateReturnRate(startDate, endDate)
    ]);

    // 计算趋势指标
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);
    const [prevNewUsers, prevNewBorrows] = await Promise.all([
      prisma.users.count({
        where: {
          role: { in: ['patron', 'librarian'] },
          created_at: { 
            gte: previousPeriod.start,
            lte: previousPeriod.end 
          }
        }
      }),
      prisma.borrows.count({
        where: {
          borrow_date: { 
            gte: previousPeriod.start,
            lte: previousPeriod.end 
          }
        }
      })
    ]);

    return {
      general: {
        totalBooks,
        totalUsers,
        totalBorrows,
        activeBorrows,
        overdueBorrows,
        totalReviews,
        totalPoints,
        returnRate: Math.round(returnRate * 100) / 100
      },
      period: {
        newUsers,
        newBorrows,
        userGrowth: prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers * 100) : 0,
        borrowGrowth: prevNewBorrows > 0 ? ((newBorrows - prevNewBorrows) / prevNewBorrows * 100) : 0
      },
      health: {
        utilizationRate: totalBooks > 0 ? (activeBorrows / totalBooks * 100) : 0,
        overdueRate: activeBorrows > 0 ? (overdueBorrows / activeBorrows * 100) : 0,
        reviewEngagement: totalBorrows > 0 ? (totalReviews / totalBorrows * 100) : 0
      }
    };
  }

  /**
   * 获取趋势分析数据
   */
  async getTrendAnalytics(startDate, endDate, granularity = 'day') {
    // 确定日期格式
    const dateFormat = this.getDateFormat(granularity);
    
    const [borrowTrends, userTrends, pointsTrends, reviewTrends] = await Promise.all([
      // 借阅趋势 - 使用原生SQL查询
      prisma.$queryRaw`
        SELECT 
          date_group as date,
          COUNT(*) as borrows,
          COUNT(DISTINCT user_id) as uniqueUsers
        FROM (
          SELECT 
            DATE_FORMAT(borrow_date, ${dateFormat}) as date_group,
            user_id
          FROM borrows 
          WHERE borrow_date BETWEEN ${startDate} AND ${endDate}
        ) as grouped_data
        GROUP BY date_group
        ORDER BY date_group ASC
      `,

      // 用户注册趋势
      prisma.$queryRaw`
        SELECT 
          date_group as date,
          COUNT(*) as registrations
        FROM (
          SELECT 
            DATE_FORMAT(created_at, ${dateFormat}) as date_group
          FROM users 
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
            AND role IN ('patron', 'librarian')
        ) as grouped_data
        GROUP BY date_group
        ORDER BY date_group ASC
      `,

      // 积分活动趋势
      prisma.$queryRaw`
        SELECT 
          date_group as date,
          COUNT(*) as transactions,
          SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END) as pointsEarned,
          SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END) as pointsSpent
        FROM (
          SELECT 
            DATE_FORMAT(created_at, ${dateFormat}) as date_group,
            points_change
          FROM points_transactions 
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
        ) as grouped_data
        GROUP BY date_group
        ORDER BY date_group ASC
      `,

      // 评价趋势
      prisma.$queryRaw`
        SELECT 
          date_group as date,
          COUNT(*) as reviews,
          AVG(rating) as avgRating
        FROM (
          SELECT 
            DATE_FORMAT(created_at, ${dateFormat}) as date_group,
            rating
          FROM reviews 
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
        ) as grouped_data
        GROUP BY date_group
        ORDER BY date_group ASC
      `
    ]);

    // 合并趋势数据
    return this.mergeTrendData(borrowTrends, userTrends, pointsTrends, reviewTrends, startDate, endDate, granularity);
  }

  /**
   * 获取热门图书分析
   */
  async getTopPerformingBooks(startDate, endDate, limit = 20) {
    const [mostBorrowed, mostReviewed, highestRated, trending] = await Promise.all([
      // 最多借阅的图书
      prisma.$queryRaw`
        SELECT 
          b.*,
          COUNT(br.id) as borrowCount,
          COUNT(DISTINCT br.user_id) as uniqueBorrowers,
          AVG(r.rating) as avgRating,
          COUNT(r.id) as reviewCount
        FROM books b
        LEFT JOIN borrows br ON b.id = br.book_id 
          AND br.borrow_date BETWEEN ${startDate} AND ${endDate}
        LEFT JOIN reviews r ON b.id = r.book_id
        WHERE br.id IS NOT NULL
        GROUP BY b.id
        ORDER BY borrowCount DESC, uniqueBorrowers DESC
        LIMIT ${limit}
      `,

      // 最多评价的图书
      prisma.$queryRaw`
        SELECT 
          b.*,
          COUNT(r.id) as reviewCount,
          AVG(r.rating) as avgRating,
          COUNT(DISTINCT br.user_id) as uniqueBorrowers
        FROM books b
        INNER JOIN reviews r ON b.id = r.book_id 
          AND r.created_at BETWEEN ${startDate} AND ${endDate}
        LEFT JOIN borrows br ON b.id = br.book_id
        GROUP BY b.id
        ORDER BY reviewCount DESC, avgRating DESC
        LIMIT ${limit}
      `,

      // 评分最高的图书 (至少有3个评价)
      prisma.$queryRaw`
        SELECT 
          b.*,
          AVG(r.rating) as avgRating,
          COUNT(r.id) as reviewCount,
          COUNT(DISTINCT br.user_id) as uniqueBorrowers
        FROM books b
        INNER JOIN reviews r ON b.id = r.book_id
        LEFT JOIN borrows br ON b.id = br.book_id
          AND br.borrow_date BETWEEN ${startDate} AND ${endDate}
        GROUP BY b.id
        HAVING COUNT(r.id) >= 3
        ORDER BY avgRating DESC, reviewCount DESC
        LIMIT ${limit}
      `,

      // 趋势图书 (最近借阅增长最快)
      this.getTrendingBooks(startDate, endDate, limit)
    ]);

    return {
      mostBorrowed: mostBorrowed.map(book => ({
        ...book,
        borrowCount: Number(book.borrowCount),
        uniqueBorrowers: Number(book.uniqueBorrowers),
        avgRating: book.avgRating ? Number(book.avgRating) : null,
        reviewCount: Number(book.reviewCount)
      })),
      mostReviewed: mostReviewed.map(book => ({
        ...book,
        reviewCount: Number(book.reviewCount),
        avgRating: book.avgRating ? Number(book.avgRating) : null,
        uniqueBorrowers: Number(book.uniqueBorrowers)
      })),
      highestRated: highestRated.map(book => ({
        ...book,
        avgRating: Number(book.avgRating),
        reviewCount: Number(book.reviewCount),
        uniqueBorrowers: Number(book.uniqueBorrowers)
      })),
      trending
    };
  }

  /**
   * 获取活跃用户分析
   */
  async getActiveUserAnalytics(startDate, endDate, limit = 50) {
    const [topBorrowers, topReviewers, engagedUsers, userSegments] = await Promise.all([
      // 最活跃借阅用户
      prisma.$queryRaw`
        SELECT 
          u.id, u.username, u.real_name, u.email,
          COUNT(b.id) as borrowCount,
          COUNT(DISTINCT b.book_id) as uniqueBooks,
          AVG(DATEDIFF(b.return_date, b.borrow_date)) as avgBorrowDays,
          COUNT(r.id) as reviewCount,
          AVG(r.rating) as avgRating
        FROM users u
        INNER JOIN borrows b ON u.id = b.user_id 
          AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
        LEFT JOIN reviews r ON u.id = r.user_id
        WHERE u.role IN ('patron', 'librarian')
        GROUP BY u.id
        ORDER BY borrowCount DESC, uniqueBooks DESC
        LIMIT ${limit}
      `,

      // 最活跃评价用户
      prisma.$queryRaw`
        SELECT 
          u.id, u.username, u.real_name, u.email,
          COUNT(r.id) as reviewCount,
          AVG(r.rating) as avgRating,
          COUNT(DISTINCT r.book_id) as uniqueBooks,
          COUNT(b.id) as borrowCount
        FROM users u
        INNER JOIN reviews r ON u.id = r.user_id 
          AND r.created_at BETWEEN ${startDate} AND ${endDate}
        LEFT JOIN borrows b ON u.id = b.user_id
        WHERE u.role IN ('patron', 'librarian')
        GROUP BY u.id
        ORDER BY reviewCount DESC, avgRating DESC
        LIMIT ${limit}
      `,

      // 高参与度用户 (综合指标)
      this.getEngagedUsers(startDate, endDate, limit),

      // 用户分群分析
      this.getUserSegmentAnalysis(startDate, endDate)
    ]);

    return {
      topBorrowers: topBorrowers.map(user => ({
        ...user,
        borrowCount: Number(user.borrowCount),
        uniqueBooks: Number(user.uniqueBooks),
        avgBorrowDays: user.avgBorrowDays ? Number(user.avgBorrowDays) : null,
        reviewCount: Number(user.reviewCount),
        avgRating: user.avgRating ? Number(user.avgRating) : null
      })),
      topReviewers: topReviewers.map(user => ({
        ...user,
        reviewCount: Number(user.reviewCount),
        avgRating: user.avgRating ? Number(user.avgRating) : null,
        uniqueBooks: Number(user.uniqueBooks),
        borrowCount: Number(user.borrowCount)
      })),
      engagedUsers,
      segments: userSegments
    };
  }

  /**
   * 获取分类分析数据
   */
  async getCategoryAnalytics(startDate, endDate) {
    const categoryStats = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(DISTINCT b.id) as bookCount,
        COUNT(br.id) as borrowCount,
        COUNT(DISTINCT br.user_id) as uniqueBorrowers,
        AVG(r.rating) as avgRating,
        COUNT(r.id) as reviewCount,
        COUNT(DISTINCT ub.user_id) as viewCount
      FROM book_categories c
      LEFT JOIN books b ON c.id = b.category_id
      LEFT JOIN borrows br ON b.id = br.book_id 
        AND br.borrow_date BETWEEN ${startDate} AND ${endDate}
      LEFT JOIN reviews r ON b.id = r.book_id
      LEFT JOIN user_behaviors ub ON b.id = ub.book_id 
        AND ub.behavior_type = 'view'
        AND ub.created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY c.id, c.name, c.description
      ORDER BY borrowCount DESC, bookCount DESC
    `;

    return categoryStats.map(category => ({
      ...category,
      bookCount: Number(category.bookCount),
      borrowCount: Number(category.borrowCount),
      uniqueBorrowers: Number(category.uniqueBorrowers),
      avgRating: category.avgRating ? Number(category.avgRating) : null,
      reviewCount: Number(category.reviewCount),
      viewCount: Number(category.viewCount),
      popularity: this.calculateCategoryPopularity(category)
    }));
  }

  // 辅助方法

  /**
   * 计算归还率
   */
  async calculateReturnRate(startDate, endDate) {
    const result = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalBorrows,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returnedBorrows
      FROM borrows 
      WHERE borrow_date BETWEEN ${startDate} AND ${endDate}
    `;

    const stats = result[0];
    return stats.totalBorrows > 0 ? (Number(stats.returnedBorrows) / Number(stats.totalBorrows)) : 0;
  }

  /**
   * 获取上一个相同时间段
   */
  getPreviousPeriod(startDate, endDate) {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      start: new Date(startDate.getTime() - duration),
      end: new Date(startDate.getTime())
    };
  }

  /**
   * 获取日期格式
   */
  getDateFormat(granularity) {
    switch (granularity) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%u';
      case 'month':
        return '%Y-%m';
      case 'year':
        return '%Y';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * 合并趋势数据
   */
  mergeTrendData(borrowTrends, userTrends, pointsTrends, reviewTrends, startDate, endDate, granularity) {
    // 创建完整的日期范围
    const dateRange = this.generateDateRange(startDate, endDate, granularity);
    
    // 转换数据为Map便于查找
    const borrowMap = new Map(borrowTrends.map(item => [item.date, item]));
    const userMap = new Map(userTrends.map(item => [item.date, item]));
    const pointsMap = new Map(pointsTrends.map(item => [item.date, item]));
    const reviewMap = new Map(reviewTrends.map(item => [item.date, item]));

    return dateRange.map(date => ({
      date,
      borrows: Number(borrowMap.get(date)?.borrows || 0),
      uniqueUsers: Number(borrowMap.get(date)?.uniqueUsers || 0),
      registrations: Number(userMap.get(date)?.registrations || 0),
      pointsTransactions: Number(pointsMap.get(date)?.transactions || 0),
      pointsEarned: Number(pointsMap.get(date)?.pointsEarned || 0),
      pointsSpent: Number(pointsMap.get(date)?.pointsSpent || 0),
      reviews: Number(reviewMap.get(date)?.reviews || 0),
      avgRating: reviewMap.get(date)?.avgRating ? Number(reviewMap.get(date).avgRating) : null
    }));
  }

  /**
   * 生成日期范围
   */
  generateDateRange(startDate, endDate, granularity) {
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      switch (granularity) {
        case 'day':
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          dates.push(`${current.getFullYear()}-${Math.ceil((current.getDate() + current.getDay()) / 7)}`);
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          dates.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  }

  /**
   * 计算分类受欢迎程度
   */
  calculateCategoryPopularity(category) {
    const borrowWeight = 0.4;
    const viewWeight = 0.3;
    const ratingWeight = 0.2;
    const reviewWeight = 0.1;

    const borrowScore = Number(category.borrowCount) || 0;
    const viewScore = Number(category.viewCount) || 0;
    const ratingScore = (Number(category.avgRating) || 0) * 20; // 转换为100分制
    const reviewScore = Number(category.reviewCount) || 0;

    return (
      borrowScore * borrowWeight +
      viewScore * viewWeight +
      ratingScore * ratingWeight +
      reviewScore * reviewWeight
    );
  }

  /**
   * 获取性能指标分析
   */
  async getPerformanceMetrics(startDate, endDate) {
    try {
      const [systemMetrics, userMetrics, collectionMetrics] = await Promise.all([
        // 系统性能指标
        prisma.$queryRaw`
          SELECT 
            AVG(CASE WHEN status = 'returned' 
                THEN DATEDIFF(return_date, borrow_date) 
                ELSE DATEDIFF(NOW(), borrow_date) 
            END) as avgTurnoverTime,
            COUNT(CASE WHEN status = 'overdue' THEN 1 END) / COUNT(*) * 100 as overdueRate,
            COUNT(CASE WHEN DATEDIFF(NOW(), borrow_date) <= 7 THEN 1 END) / COUNT(*) * 100 as weeklyUtilizationRate
          FROM borrows 
          WHERE borrow_date BETWEEN ${startDate} AND ${endDate}
        `,

        // 用户参与度指标
        prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT u.id) as activeUsers,
            AVG(user_activity.borrow_count) as avgBorrowsPerUser,
            AVG(user_activity.review_count) as avgReviewsPerUser
          FROM users u
          INNER JOIN (
            SELECT 
              u2.id as user_id,
              COUNT(DISTINCT b.id) as borrow_count,
              COUNT(DISTINCT r.id) as review_count
            FROM users u2
            LEFT JOIN borrows b ON u2.id = b.user_id 
              AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
            LEFT JOIN reviews r ON u2.id = r.user_id 
              AND r.created_at BETWEEN ${startDate} AND ${endDate}
            WHERE u2.role IN ('patron', 'librarian')
            GROUP BY u2.id
          ) as user_activity ON u.id = user_activity.user_id
          WHERE u.role IN ('patron', 'librarian')
        `,

        // 藏书利用率
        prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT book_id) / (SELECT COUNT(*) FROM books) * 100 as collectionUtilizationRate,
            AVG(borrow_frequency.frequency) as avgBookBorrowFrequency
          FROM (
            SELECT 
              book_id,
              COUNT(*) as frequency
            FROM borrows 
            WHERE borrow_date BETWEEN ${startDate} AND ${endDate}
            GROUP BY book_id
          ) as borrow_frequency
        `
      ]);

      return {
        system: {
          avgTurnoverTime: systemMetrics[0]?.avgTurnoverTime ? Number(systemMetrics[0].avgTurnoverTime) : 0,
          overdueRate: systemMetrics[0]?.overdueRate ? Number(systemMetrics[0].overdueRate) : 0,
          weeklyUtilizationRate: systemMetrics[0]?.weeklyUtilizationRate ? Number(systemMetrics[0].weeklyUtilizationRate) : 0
        },
        user: {
          activeUsers: userMetrics[0]?.activeUsers ? Number(userMetrics[0].activeUsers) : 0,
          avgBorrowsPerUser: userMetrics[0]?.avgBorrowsPerUser ? Number(userMetrics[0].avgBorrowsPerUser) : 0,
          avgReviewsPerUser: userMetrics[0]?.avgReviewsPerUser ? Number(userMetrics[0].avgReviewsPerUser) : 0
        },
        collection: {
          utilizationRate: collectionMetrics[0]?.collectionUtilizationRate ? Number(collectionMetrics[0].collectionUtilizationRate) : 0,
          avgBorrowFrequency: collectionMetrics[0]?.avgBookBorrowFrequency ? Number(collectionMetrics[0].avgBookBorrowFrequency) : 0
        }
      };
    } catch (error) {
      console.error('获取性能指标失败:', error);
      return {};
    }
  }

  /**
   * 获取预测分析洞察
   */
  async getPredictiveInsights(startDate, endDate) {
    try {
      // 基于历史数据进行简单的趋势预测
      const [borrowTrend, userGrowthTrend, popularityTrend] = await Promise.all([
        // 借阅趋势预测
        prisma.$queryRaw`
          SELECT 
            DATE_FORMAT(borrow_date, '%Y-%m') as month,
            COUNT(*) as borrows
          FROM borrows 
          WHERE borrow_date >= DATE_SUB(${endDate}, INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(borrow_date, '%Y-%m')
          ORDER BY month ASC
        `,

        // 用户增长趋势
        prisma.$queryRaw`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as newUsers
          FROM users 
          WHERE created_at >= DATE_SUB(${endDate}, INTERVAL 6 MONTH)
            AND role IN ('patron', 'librarian')
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month ASC
        `,

        // 热门度变化趋势
        prisma.$queryRaw`
          SELECT 
            c.name as category,
            COUNT(b.id) as recentBorrows
          FROM book_categories c
          LEFT JOIN books bk ON c.id = bk.category_id
          LEFT JOIN borrows b ON bk.id = b.book_id 
            AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
          GROUP BY c.id, c.name
          ORDER BY recentBorrows DESC
          LIMIT 5
        `
      ]);

      // 简单的线性回归预测（仅用于演示）
      const predictNextMonthBorrows = this.calculateTrendPrediction(borrowTrend, 'borrows');
      const predictNextMonthUsers = this.calculateTrendPrediction(userGrowthTrend, 'newUsers');

      return {
        borrowingTrend: {
          historical: borrowTrend.map(item => ({
            month: item.month,
            value: Number(item.borrows)
          })),
          prediction: predictNextMonthBorrows
        },
        userGrowthTrend: {
          historical: userGrowthTrend.map(item => ({
            month: item.month,
            value: Number(item.newUsers)
          })),
          prediction: predictNextMonthUsers
        },
        categoryTrends: popularityTrend.map(item => ({
          category: item.category,
          recentBorrows: Number(item.recentBorrows)
        })),
        recommendations: this.generateRecommendations(borrowTrend, userGrowthTrend, popularityTrend)
      };
    } catch (error) {
      console.error('获取预测洞察失败:', error);
      return {};
    }
  }

  /**
   * 获取趋势图书分析
   */
  async getTrendingBooks(startDate, endDate, limit = 20) {
    try {
      // 计算图书的趋势分数（基于最近活动增长）
      const trendingBooks = await prisma.$queryRaw`
        SELECT 
          b.*,
          recent_activity.recentBorrows,
          recent_activity.recentReviews,
          recent_activity.trendScore,
          historical_activity.historicalBorrows
        FROM books b
        INNER JOIN (
          SELECT 
            b2.id as book_id,
            COUNT(DISTINCT br.id) as recentBorrows,
            COUNT(DISTINCT r.id) as recentReviews,
            (COUNT(DISTINCT br.id) * 2 + COUNT(DISTINCT r.id) * 1.5) as trendScore
          FROM books b2
          LEFT JOIN borrows br ON b2.id = br.book_id 
            AND br.borrow_date BETWEEN ${startDate} AND ${endDate}
          LEFT JOIN reviews r ON b2.id = r.book_id 
            AND r.created_at BETWEEN ${startDate} AND ${endDate}
          GROUP BY b2.id
          HAVING trendScore > 0
        ) as recent_activity ON b.id = recent_activity.book_id
        LEFT JOIN (
          SELECT 
            book_id,
            COUNT(*) as historicalBorrows
          FROM borrows 
          WHERE borrow_date < ${startDate}
          GROUP BY book_id
        ) as historical_activity ON b.id = historical_activity.book_id
        ORDER BY recent_activity.trendScore DESC, recent_activity.recentBorrows DESC
        LIMIT ${limit}
      `;

      return trendingBooks.map(book => ({
        ...book,
        recentBorrows: Number(book.recentBorrows),
        recentReviews: Number(book.recentReviews),
        trendScore: Number(book.trendScore),
        historicalBorrows: Number(book.historicalBorrows || 0),
        trendGrowth: book.historicalBorrows > 0 
          ? ((Number(book.recentBorrows) - Number(book.historicalBorrows)) / Number(book.historicalBorrows) * 100)
          : Number(book.recentBorrows) > 0 ? 100 : 0
      }));
    } catch (error) {
      console.error('获取趋势图书失败:', error);
      return [];
    }
  }

  /**
   * 获取高参与度用户分析
   */
  async getEngagedUsers(startDate, endDate, limit = 50) {
    try {
      const engagedUsers = await prisma.$queryRaw`
        SELECT 
          u.id,
          u.username,
          u.real_name,
          u.email,
          user_activity.borrowCount,
          user_activity.reviewCount,
          user_activity.uniqueBooks,
          user_activity.avgRating,
          user_activity.engagementScore
        FROM users u
        INNER JOIN (
          SELECT 
            u2.id as user_id,
            COUNT(DISTINCT b.id) as borrowCount,
            COUNT(DISTINCT r.id) as reviewCount,
            COUNT(DISTINCT COALESCE(b.book_id, r.book_id)) as uniqueBooks,
            AVG(r.rating) as avgRating,
            (
              COUNT(DISTINCT b.id) * 3 + 
              COUNT(DISTINCT r.id) * 2 + 
              COUNT(DISTINCT COALESCE(b.book_id, r.book_id)) * 1
            ) as engagementScore
          FROM users u2
          LEFT JOIN borrows b ON u2.id = b.user_id 
            AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
          LEFT JOIN reviews r ON u2.id = r.user_id 
            AND r.created_at BETWEEN ${startDate} AND ${endDate}
          WHERE u2.role IN ('patron', 'librarian')
          GROUP BY u2.id
          HAVING engagementScore > 0
        ) as user_activity ON u.id = user_activity.user_id
        ORDER BY user_activity.engagementScore DESC, user_activity.borrowCount DESC
        LIMIT ${limit}
      `;

      return engagedUsers.map(user => ({
        ...user,
        borrowCount: Number(user.borrowCount),
        reviewCount: Number(user.reviewCount),
        uniqueBooks: Number(user.uniqueBooks),
        avgRating: user.avgRating ? Number(user.avgRating) : null,
        engagementScore: Number(user.engagementScore),
        engagementLevel: this.calculateEngagementLevel(Number(user.engagementScore))
      }));
    } catch (error) {
      console.error('获取高参与度用户失败:', error);
      return [];
    }
  }

  /**
   * 获取用户分群分析
   */
  async getUserSegmentAnalysis(startDate, endDate) {
    try {
      const [activeSegments, behaviorSegments, valueSegments] = await Promise.all([
        // 按活跃度分群
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN activity_score >= 20 THEN 'highly_active'
              WHEN activity_score >= 10 THEN 'moderately_active'
              WHEN activity_score >= 5 THEN 'low_active'
              ELSE 'inactive'
            END as segment,
            COUNT(*) as userCount,
            AVG(activity_score) as avgActivityScore
          FROM (
            SELECT 
              u.id,
              (COUNT(DISTINCT b.id) * 2 + COUNT(DISTINCT r.id)) as activity_score
            FROM users u
            LEFT JOIN borrows b ON u.id = b.user_id 
              AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
            LEFT JOIN reviews r ON u.id = r.user_id 
              AND r.created_at BETWEEN ${startDate} AND ${endDate}
            WHERE u.role IN ('patron', 'librarian')
            GROUP BY u.id
          ) as user_activity
          GROUP BY segment
        `,

        // 按行为类型分群
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN review_ratio >= 0.5 THEN 'reviewers'
              WHEN borrow_frequency >= 5 THEN 'frequent_borrowers'
              WHEN borrow_frequency >= 2 THEN 'regular_borrowers'
              ELSE 'casual_borrowers'
            END as segment,
            COUNT(*) as userCount,
            AVG(borrow_frequency) as avgBorrowFrequency,
            AVG(review_ratio) as avgReviewRatio
          FROM (
            SELECT 
              u.id,
              COUNT(DISTINCT b.id) as borrow_frequency,
              CASE 
                WHEN COUNT(DISTINCT b.id) > 0 
                THEN COUNT(DISTINCT r.id) / COUNT(DISTINCT b.id)
                ELSE 0 
              END as review_ratio
            FROM users u
            LEFT JOIN borrows b ON u.id = b.user_id 
              AND b.borrow_date BETWEEN ${startDate} AND ${endDate}
            LEFT JOIN reviews r ON u.id = r.user_id 
              AND r.created_at BETWEEN ${startDate} AND ${endDate}
            WHERE u.role IN ('patron', 'librarian')
            GROUP BY u.id
            HAVING borrow_frequency > 0 OR COUNT(DISTINCT r.id) > 0
          ) as user_behavior
          GROUP BY segment
        `,

        // 按价值分群（基于积分活动）
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN total_points >= 100 THEN 'high_value'
              WHEN total_points >= 50 THEN 'medium_value'
              WHEN total_points >= 20 THEN 'low_value'
              ELSE 'minimal_value'
            END as segment,
            COUNT(*) as userCount,
            AVG(total_points) as avgPoints
          FROM (
            SELECT 
              u.id,
              COALESCE(SUM(pt.points_change), 0) as total_points
            FROM users u
            LEFT JOIN points_transactions pt ON u.id = pt.user_id 
              AND pt.created_at BETWEEN ${startDate} AND ${endDate}
            WHERE u.role IN ('patron', 'librarian')
            GROUP BY u.id
          ) as user_value
          GROUP BY segment
        `
      ]);

      return {
        activity: activeSegments.map(segment => ({
          segment: segment.segment,
          userCount: Number(segment.userCount),
          avgActivityScore: Number(segment.avgActivityScore)
        })),
        behavior: behaviorSegments.map(segment => ({
          segment: segment.segment,
          userCount: Number(segment.userCount),
          avgBorrowFrequency: Number(segment.avgBorrowFrequency),
          avgReviewRatio: Number(segment.avgReviewRatio)
        })),
        value: valueSegments.map(segment => ({
          segment: segment.segment,
          userCount: Number(segment.userCount),
          avgPoints: Number(segment.avgPoints)
        }))
      };
    } catch (error) {
      console.error('获取用户分群分析失败:', error);
      return {};
    }
  }

  /**
   * 辅助方法：计算趋势预测
   */
  calculateTrendPrediction(data, valueField) {
    if (data.length < 2) return 0;
    
    // 简单线性回归
    const n = data.length;
    const xValues = data.map((_, index) => index);
    const yValues = data.map(item => Number(item[valueField]));
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 预测下一个时间点
    const nextValue = slope * n + intercept;
    return Math.max(0, Math.round(nextValue));
  }

  /**
   * 辅助方法：生成业务建议
   */
  generateRecommendations(borrowTrend, userGrowthTrend, popularityTrend) {
    const recommendations = [];
    
    // 基于借阅趋势的建议
    if (borrowTrend.length >= 2) {
      const recentBorrows = Number(borrowTrend[borrowTrend.length - 1].borrows);
      const previousBorrows = Number(borrowTrend[borrowTrend.length - 2].borrows);
      
      if (recentBorrows < previousBorrows * 0.9) {
        recommendations.push({
          type: 'alert',
          message: '借阅量呈下降趋势，建议加强用户互动和推广活动'
        });
      }
    }
    
    // 基于用户增长的建议
    if (userGrowthTrend.length >= 2) {
      const recentUsers = Number(userGrowthTrend[userGrowthTrend.length - 1].newUsers);
      if (recentUsers < 5) {
        recommendations.push({
          type: 'suggestion',
          message: '新用户注册较少，建议优化用户注册流程和推广策略'
        });
      }
    }
    
    // 基于热门分类的建议
    if (popularityTrend.length > 0) {
      const topCategory = popularityTrend[0];
      if (Number(topCategory.recentBorrows) > 0) {
        recommendations.push({
          type: 'opportunity',
          message: `${topCategory.category} 分类最受欢迎，建议增加此类图书的采购`
        });
      }
    }
    
    return recommendations;
  }

  /**
   * 辅助方法：计算参与度等级
   */
  calculateEngagementLevel(score) {
    if (score >= 20) return 'high';
    if (score >= 10) return 'medium';
    if (score >= 5) return 'low';
    return 'minimal';
  }
}

module.exports = new AnalyticsService();