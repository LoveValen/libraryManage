const { models } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { 
  NotFoundError, 
  BadRequestError,
  ForbiddenError 
} = require('../utils/apiError');

/**
 * 高级分析服务
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
      models.Book.count(),
      
      // 总用户数
      models.User.count({ where: { role: ['user', 'librarian'] } }),
      
      // 总借阅数
      models.Borrow.count(),
      
      // 当前活跃借阅
      models.Borrow.count({
        where: { status: ['borrowed', 'renewed'] }
      }),
      
      // 逾期借阅
      models.Borrow.count({
        where: { 
          status: ['borrowed', 'renewed'],
          dueDate: { [Op.lt]: new Date() }
        }
      }),
      
      // 总评价数
      models.Review.count(),
      
      // 总积分流通
      models.PointsTransaction.sum('amount', {
        where: { amount: { [Op.gt]: 0 } }
      }),
      
      // 期间新用户
      models.User.count({
        where: {
          role: ['user', 'librarian'],
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      }),
      
      // 期间新借阅
      models.Borrow.count({
        where: {
          borrowDate: { [Op.between]: [startDate, endDate] }
        }
      }),
      
      // 归还率计算
      this.calculateReturnRate(startDate, endDate)
    ]);

    // 计算趋势指标
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);
    const [prevNewUsers, prevNewBorrows] = await Promise.all([
      models.User.count({
        where: {
          role: ['user', 'librarian'],
          createdAt: { [Op.between]: [previousPeriod.start, previousPeriod.end] }
        }
      }),
      models.Borrow.count({
        where: {
          borrowDate: { [Op.between]: [previousPeriod.start, previousPeriod.end] }
        }
      })
    ]);

    return {
      totals: {
        books: totalBooks,
        users: totalUsers,
        borrows: totalBorrows,
        reviews: totalReviews,
        pointsCirculation: totalPoints || 0
      },
      current: {
        activeBorrows,
        overdueBorrows,
        overdueRate: activeBorrows > 0 ? (overdueBorrows / activeBorrows * 100).toFixed(2) : 0,
        returnRate: returnRate.toFixed(2)
      },
      period: {
        newUsers,
        newBorrows,
        userGrowth: prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers * 100).toFixed(2) : 0,
        borrowGrowth: prevNewBorrows > 0 ? ((newBorrows - prevNewBorrows) / prevNewBorrows * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * 获取趋势分析数据
   */
  async getTrendAnalytics(startDate, endDate, granularity) {
    const dateFormat = this.getDateFormat(granularity);
    const dateInterval = this.getDateInterval(granularity);

    const [borrowTrends, userTrends, pointsTrends, reviewTrends] = await Promise.all([
      // 借阅趋势
      models.Borrow.findAll({
        where: {
          borrowDate: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [fn('DATE_FORMAT', col('borrowDate'), dateFormat), 'date'],
          [fn('COUNT', col('id')), 'borrows'],
          [fn('COUNT', literal('CASE WHEN status = "returned" THEN 1 END')), 'returns']
        ],
        group: [fn('DATE_FORMAT', col('borrowDate'), dateFormat)],
        order: [[fn('DATE_FORMAT', col('borrowDate'), dateFormat), 'ASC']],
        raw: true
      }),

      // 用户注册趋势
      models.User.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] },
          role: ['user', 'librarian']
        },
        attributes: [
          [fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
          [fn('COUNT', col('id')), 'registrations']
        ],
        group: [fn('DATE_FORMAT', col('createdAt'), dateFormat)],
        order: [[fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']],
        raw: true
      }),

      // 积分活动趋势
      models.PointsTransaction.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
          [fn('COUNT', col('id')), 'transactions'],
          [fn('SUM', literal('CASE WHEN amount > 0 THEN amount ELSE 0 END')), 'pointsEarned'],
          [fn('SUM', literal('CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END')), 'pointsSpent']
        ],
        group: [fn('DATE_FORMAT', col('createdAt'), dateFormat)],
        order: [[fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']],
        raw: true
      }),

      // 评价趋势
      models.Review.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
          [fn('COUNT', col('id')), 'reviews'],
          [fn('AVG', col('rating')), 'avgRating']
        ],
        group: [fn('DATE_FORMAT', col('createdAt'), dateFormat)],
        order: [[fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']],
        raw: true
      })
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
      models.Book.findAll({
        include: [{
          model: models.Borrow,
          as: 'borrows',
          where: {
            borrowDate: { [Op.between]: [startDate, endDate] }
          },
          attributes: []
        }],
        attributes: [
          'id', 'title', 'author', 'category', 'coverUrl',
          [fn('COUNT', col('borrows.id')), 'borrowCount']
        ],
        group: ['Book.id'],
        order: [[fn('COUNT', col('borrows.id')), 'DESC']],
        limit,
        subQuery: false
      }),

      // 最多评价的图书
      models.Book.findAll({
        include: [{
          model: models.Review,
          as: 'reviews',
          where: {
            createdAt: { [Op.between]: [startDate, endDate] }
          },
          attributes: []
        }],
        attributes: [
          'id', 'title', 'author', 'category', 'coverUrl',
          [fn('COUNT', col('reviews.id')), 'reviewCount'],
          [fn('AVG', col('reviews.rating')), 'avgRating']
        ],
        group: ['Book.id'],
        order: [[fn('COUNT', col('reviews.id')), 'DESC']],
        limit,
        subQuery: false
      }),

      // 评分最高的图书
      models.Book.findAll({
        include: [{
          model: models.Review,
          as: 'reviews',
          attributes: []
        }],
        attributes: [
          'id', 'title', 'author', 'category', 'coverUrl',
          [fn('COUNT', col('reviews.id')), 'reviewCount'],
          [fn('AVG', col('reviews.rating')), 'avgRating']
        ],
        group: ['Book.id'],
        having: literal('COUNT(reviews.id) >= 5'), // 至少5个评价
        order: [[fn('AVG', col('reviews.rating')), 'DESC']],
        limit,
        subQuery: false
      }),

      // 趋势图书（最近借阅增长最快）
      this.getTrendingBooks(startDate, endDate, limit)
    ]);

    return {
      mostBorrowed: mostBorrowed.map(book => ({
        ...book.toJSON(),
        borrowCount: parseInt(book.getDataValue('borrowCount'))
      })),
      mostReviewed: mostReviewed.map(book => ({
        ...book.toJSON(),
        reviewCount: parseInt(book.getDataValue('reviewCount')),
        avgRating: parseFloat(book.getDataValue('avgRating')).toFixed(1)
      })),
      highestRated: highestRated.map(book => ({
        ...book.toJSON(),
        reviewCount: parseInt(book.getDataValue('reviewCount')),
        avgRating: parseFloat(book.getDataValue('avgRating')).toFixed(1)
      })),
      trending
    };
  }

  /**
   * 获取活跃用户分析
   */
  async getActiveUserAnalytics(startDate, endDate) {
    const [topBorrowers, activeReviewers, pointsLeaders, userEngagement] = await Promise.all([
      // 最活跃借阅用户
      models.User.findAll({
        include: [{
          model: models.Borrow,
          as: 'borrows',
          where: {
            borrowDate: { [Op.between]: [startDate, endDate] }
          },
          attributes: []
        }],
        where: { role: ['user', 'librarian'] },
        attributes: [
          'id', 'username', 'realName', 'avatar',
          [fn('COUNT', col('borrows.id')), 'borrowCount']
        ],
        group: ['User.id'],
        order: [[fn('COUNT', col('borrows.id')), 'DESC']],
        limit: 20,
        subQuery: false
      }),

      // 活跃评价用户
      models.User.findAll({
        include: [{
          model: models.Review,
          as: 'reviews',
          where: {
            createdAt: { [Op.between]: [startDate, endDate] }
          },
          attributes: []
        }],
        where: { role: ['user', 'librarian'] },
        attributes: [
          'id', 'username', 'realName', 'avatar',
          [fn('COUNT', col('reviews.id')), 'reviewCount'],
          [fn('AVG', col('reviews.rating')), 'avgRating']
        ],
        group: ['User.id'],
        order: [[fn('COUNT', col('reviews.id')), 'DESC']],
        limit: 20,
        subQuery: false
      }),

      // 积分排行榜
      models.UserPoints.findAll({
        include: [{
          model: models.User,
          as: 'user',
          where: { role: ['user', 'librarian'] },
          attributes: ['id', 'username', 'realName', 'avatar']
        }],
        order: [['totalPoints', 'DESC']],
        limit: 20
      }),

      // 用户参与度分析
      this.getUserEngagementMetrics(startDate, endDate)
    ]);

    return {
      topBorrowers: topBorrowers.map(user => ({
        ...user.toJSON(),
        borrowCount: parseInt(user.getDataValue('borrowCount'))
      })),
      activeReviewers: activeReviewers.map(user => ({
        ...user.toJSON(),
        reviewCount: parseInt(user.getDataValue('reviewCount')),
        avgRating: parseFloat(user.getDataValue('avgRating')).toFixed(1)
      })),
      pointsLeaders: pointsLeaders.map(userPoints => ({
        user: userPoints.user,
        totalPoints: userPoints.totalPoints,
        currentPoints: userPoints.currentPoints
      })),
      engagement: userEngagement
    };
  }

  /**
   * 获取分类统计分析
   */
  async getCategoryAnalytics(startDate, endDate) {
    const [borrowsByCategory, reviewsByCategory, stockByCategory, trendsbyCategory] = await Promise.all([
      // 按分类统计借阅
      models.Borrow.findAll({
        include: [{
          model: models.Book,
          as: 'book',
          attributes: ['category']
        }],
        where: {
          borrowDate: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [col('book.category'), 'category'],
          [fn('COUNT', col('Borrow.id')), 'borrowCount']
        ],
        group: [col('book.category')],
        order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
        raw: true
      }),

      // 按分类统计评价
      models.Review.findAll({
        include: [{
          model: models.Book,
          as: 'book',
          attributes: ['category']
        }],
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [col('book.category'), 'category'],
          [fn('COUNT', col('Review.id')), 'reviewCount'],
          [fn('AVG', col('Review.rating')), 'avgRating']
        ],
        group: [col('book.category')],
        order: [[fn('COUNT', col('Review.id')), 'DESC']],
        raw: true
      }),

      // 按分类统计库存
      models.Book.findAll({
        attributes: [
          'category',
          [fn('COUNT', col('id')), 'bookCount'],
          [fn('SUM', col('totalStock')), 'totalStock'],
          [fn('SUM', col('availableStock')), 'availableStock']
        ],
        group: ['category'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        raw: true
      }),

      // 分类趋势分析
      this.getCategoryTrends(startDate, endDate)
    ]);

    // 合并数据
    const categoryMap = new Map();
    
    borrowsByCategory.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { category: item.category });
      }
      categoryMap.get(item.category).borrowCount = parseInt(item.borrowCount);
    });

    reviewsByCategory.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { category: item.category });
      }
      const cat = categoryMap.get(item.category);
      cat.reviewCount = parseInt(item.reviewCount);
      cat.avgRating = parseFloat(item.avgRating).toFixed(1);
    });

    stockByCategory.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { category: item.category });
      }
      const cat = categoryMap.get(item.category);
      cat.bookCount = parseInt(item.bookCount);
      cat.totalStock = parseInt(item.totalStock);
      cat.availableStock = parseInt(item.availableStock);
      cat.utilizationRate = cat.totalStock > 0 ? 
        ((cat.totalStock - cat.availableStock) / cat.totalStock * 100).toFixed(2) : 0;
    });

    return {
      summary: Array.from(categoryMap.values()).map(cat => ({
        category: cat.category,
        borrowCount: cat.borrowCount || 0,
        reviewCount: cat.reviewCount || 0,
        avgRating: cat.avgRating || 0,
        bookCount: cat.bookCount || 0,
        totalStock: cat.totalStock || 0,
        availableStock: cat.availableStock || 0,
        utilizationRate: cat.utilizationRate || 0
      })),
      trends: trendsbyCategory
    };
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(startDate, endDate) {
    const [
      collectionTurnover,
      userRetention,
      systemUtilization,
      revenueMetrics
    ] = await Promise.all([
      this.calculateCollectionTurnover(startDate, endDate),
      this.calculateUserRetention(startDate, endDate),
      this.calculateSystemUtilization(startDate, endDate),
      this.calculateRevenueMetrics(startDate, endDate)
    ]);

    return {
      collection: collectionTurnover,
      retention: userRetention,
      utilization: systemUtilization,
      revenue: revenueMetrics
    };
  }

  /**
   * 获取预测性洞察
   */
  async getPredictiveInsights(startDate, endDate) {
    const [
      demandForecasting,
      capacityPlanning,
      riskAssessment,
      recommendations
    ] = await Promise.all([
      this.generateDemandForecast(startDate, endDate),
      this.generateCapacityPlanning(startDate, endDate),
      this.generateRiskAssessment(startDate, endDate),
      this.generateRecommendations(startDate, endDate)
    ]);

    return {
      demand: demandForecasting,
      capacity: capacityPlanning,
      risks: riskAssessment,
      recommendations
    };
  }

  // Helper methods for complex calculations

  async calculateReturnRate(startDate, endDate) {
    const [totalBorrows, returnedBorrows] = await Promise.all([
      models.Borrow.count({
        where: { borrowDate: { [Op.between]: [startDate, endDate] } }
      }),
      models.Borrow.count({
        where: { 
          borrowDate: { [Op.between]: [startDate, endDate] },
          status: 'returned'
        }
      })
    ]);
    
    return totalBorrows > 0 ? (returnedBorrows / totalBorrows * 100) : 0;
  }

  getPreviousPeriod(startDate, endDate) {
    const duration = endDate - startDate;
    return {
      start: new Date(startDate.getTime() - duration),
      end: new Date(endDate.getTime() - duration)
    };
  }

  getDateFormat(granularity) {
    switch (granularity) {
      case 'day': return '%Y-%m-%d';
      case 'week': return '%Y-%u';
      case 'month': return '%Y-%m';
      default: return '%Y-%m-%d';
    }
  }

  getDateInterval(granularity) {
    switch (granularity) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      default: return 1;
    }
  }

  mergeTrendData(borrowTrends, userTrends, pointsTrends, reviewTrends, startDate, endDate, granularity) {
    const dateMap = new Map();
    
    // 创建日期范围
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = this.formatDateByGranularity(current, granularity);
      dateMap.set(dateKey, {
        date: dateKey,
        borrows: 0,
        returns: 0,
        registrations: 0,
        transactions: 0,
        pointsEarned: 0,
        pointsSpent: 0,
        reviews: 0,
        avgRating: 0
      });
      
      if (granularity === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (granularity === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    // 填充数据
    borrowTrends.forEach(item => {
      if (dateMap.has(item.date)) {
        const data = dateMap.get(item.date);
        data.borrows = parseInt(item.borrows);
        data.returns = parseInt(item.returns);
      }
    });

    userTrends.forEach(item => {
      if (dateMap.has(item.date)) {
        dateMap.get(item.date).registrations = parseInt(item.registrations);
      }
    });

    pointsTrends.forEach(item => {
      if (dateMap.has(item.date)) {
        const data = dateMap.get(item.date);
        data.transactions = parseInt(item.transactions);
        data.pointsEarned = parseInt(item.pointsEarned) || 0;
        data.pointsSpent = parseInt(item.pointsSpent) || 0;
      }
    });

    reviewTrends.forEach(item => {
      if (dateMap.has(item.date)) {
        const data = dateMap.get(item.date);
        data.reviews = parseInt(item.reviews);
        data.avgRating = parseFloat(item.avgRating).toFixed(1);
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  formatDateByGranularity(date, granularity) {
    if (granularity === 'day') {
      return date.toISOString().split('T')[0];
    } else if (granularity === 'week') {
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      return `${year}-${week.toString().padStart(2, '0')}`;
    } else {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  async getTrendingBooks(startDate, endDate, limit) {
    // 计算前一个周期的借阅量来确定趋势
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);
    
    const currentBorrows = await models.Borrow.findAll({
      where: { borrowDate: { [Op.between]: [startDate, endDate] } },
      attributes: [
        'bookId',
        [fn('COUNT', col('id')), 'currentCount']
      ],
      group: ['bookId'],
      raw: true
    });

    const previousBorrows = await models.Borrow.findAll({
      where: { borrowDate: { [Op.between]: [previousPeriod.start, previousPeriod.end] } },
      attributes: [
        'bookId',
        [fn('COUNT', col('id')), 'previousCount']
      ],
      group: ['bookId'],
      raw: true
    });

    // 计算增长率
    const borrowMap = new Map();
    currentBorrows.forEach(item => {
      borrowMap.set(item.bookId, { current: parseInt(item.currentCount), previous: 0 });
    });

    previousBorrows.forEach(item => {
      if (borrowMap.has(item.bookId)) {
        borrowMap.get(item.bookId).previous = parseInt(item.previousCount);
      }
    });

    const trends = Array.from(borrowMap.entries()).map(([bookId, data]) => ({
      bookId,
      current: data.current,
      previous: data.previous,
      growth: data.previous > 0 ? ((data.current - data.previous) / data.previous * 100) : 100
    })).sort((a, b) => b.growth - a.growth).slice(0, limit);

    // 获取图书详情
    const bookIds = trends.map(t => t.bookId);
    const books = await models.Book.findAll({
      where: { id: { [Op.in]: bookIds } },
      attributes: ['id', 'title', 'author', 'category', 'coverUrl']
    });

    const bookMap = new Map(books.map(book => [book.id, book]));

    return trends.map(trend => ({
      ...bookMap.get(trend.bookId)?.toJSON(),
      currentBorrows: trend.current,
      previousBorrows: trend.previous,
      growthRate: trend.growth.toFixed(1)
    })).filter(item => item.id);
  }

  async getUserEngagementMetrics(startDate, endDate) {
    const [dau, wau, mau] = await Promise.all([
      // DAU - Daily Active Users (users who borrowed in the last day)
      models.User.count({
        include: [{
          model: models.Borrow,
          as: 'borrows',
          where: {
            borrowDate: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          attributes: []
        }],
        where: { role: ['user', 'librarian'] }
      }),

      // WAU - Weekly Active Users
      models.User.count({
        include: [{
          model: models.Borrow,
          as: 'borrows',
          where: {
            borrowDate: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          attributes: []
        }],
        where: { role: ['user', 'librarian'] }
      }),

      // MAU - Monthly Active Users
      models.User.count({
        include: [{
          model: models.Borrow,
          as: 'borrows',
          where: {
            borrowDate: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          attributes: []
        }],
        where: { role: ['user', 'librarian'] }
      })
    ]);

    return {
      dau,
      wau,
      mau,
      stickiness: wau > 0 ? (dau / wau * 100).toFixed(2) : 0
    };
  }

  async getCategoryTrends(startDate, endDate) {
    const granularity = 'week';
    const dateFormat = this.getDateFormat(granularity);

    return await models.Borrow.findAll({
      include: [{
        model: models.Book,
        as: 'book',
        attributes: ['category']
      }],
      where: {
        borrowDate: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [fn('DATE_FORMAT', col('borrowDate'), dateFormat), 'week'],
        [col('book.category'), 'category'],
        [fn('COUNT', col('Borrow.id')), 'borrowCount']
      ],
      group: [fn('DATE_FORMAT', col('borrowDate'), dateFormat), col('book.category')],
      order: [
        [fn('DATE_FORMAT', col('borrowDate'), dateFormat), 'ASC'],
        [fn('COUNT', col('Borrow.id')), 'DESC']
      ],
      raw: true
    });
  }

  // Placeholder methods for complex analytics - these would contain sophisticated algorithms
  async calculateCollectionTurnover(startDate, endDate) {
    const totalBorrows = await models.Borrow.count({
      where: { borrowDate: { [Op.between]: [startDate, endDate] } }
    });
    const totalBooks = await models.Book.count();
    
    return {
      turnoverRate: totalBooks > 0 ? (totalBorrows / totalBooks).toFixed(2) : 0,
      period: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    };
  }

  async calculateUserRetention(startDate, endDate) {
    // Simplified retention calculation
    const newUsers = await models.User.count({
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
        role: ['user', 'librarian']
      }
    });

    const activeNewUsers = await models.User.count({
      include: [{
        model: models.Borrow,
        as: 'borrows',
        where: {
          borrowDate: { [Op.between]: [startDate, endDate] }
        },
        attributes: []
      }],
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
        role: ['user', 'librarian']
      }
    });

    return {
      newUsers,
      activeNewUsers,
      retentionRate: newUsers > 0 ? (activeNewUsers / newUsers * 100).toFixed(2) : 0
    };
  }

  async calculateSystemUtilization(startDate, endDate) {
    const [totalStock, borrowedStock] = await Promise.all([
      models.Book.sum('totalStock'),
      models.Book.sum('totalStock') - models.Book.sum('availableStock')
    ]);

    return {
      totalCapacity: totalStock || 0,
      currentUtilization: borrowedStock || 0,
      utilizationRate: totalStock > 0 ? (borrowedStock / totalStock * 100).toFixed(2) : 0
    };
  }

  async calculateRevenueMetrics(startDate, endDate) {
    // Placeholder for potential revenue tracking (fines, fees, etc.)
    return {
      totalRevenue: 0,
      fineRevenue: 0,
      membershipRevenue: 0
    };
  }

  async generateDemandForecast(startDate, endDate) {
    // Simplified demand forecasting
    const borrowTrend = await models.Borrow.findAll({
      where: { borrowDate: { [Op.between]: [startDate, endDate] } },
      attributes: [
        [fn('DATE_FORMAT', col('borrowDate'), '%Y-%m-%d'), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [fn('DATE_FORMAT', col('borrowDate'), '%Y-%m-%d')],
      order: [[fn('DATE_FORMAT', col('borrowDate'), '%Y-%m-%d'), 'ASC']],
      raw: true
    });

    const avgDaily = borrowTrend.reduce((sum, day) => sum + parseInt(day.count), 0) / borrowTrend.length;

    return {
      forecastedDemand: Math.round(avgDaily * 30), // 30-day forecast
      confidence: 75,
      trend: borrowTrend.length > 1 ? 
        (parseInt(borrowTrend[borrowTrend.length - 1].count) > parseInt(borrowTrend[0].count) ? 'increasing' : 'decreasing') 
        : 'stable'
    };
  }

  async generateCapacityPlanning(startDate, endDate) {
    const peakUsage = await models.Borrow.count({
      where: { status: ['borrowed', 'renewed'] }
    });
    const totalCapacity = await models.Book.sum('totalStock');

    return {
      currentPeak: peakUsage,
      totalCapacity: totalCapacity || 0,
      recommendedCapacity: Math.round(peakUsage * 1.2), // 20% buffer
      utilizationThreshold: 80
    };
  }

  async generateRiskAssessment(startDate, endDate) {
    const [overdueCount, damagedBooks, inactiveUsers] = await Promise.all([
      models.Borrow.count({
        where: { 
          status: ['borrowed', 'renewed'],
          dueDate: { [Op.lt]: new Date() }
        }
      }),
      models.Book.count({
        where: { status: 'damaged' }
      }),
      models.User.count({
        where: {
          role: ['user', 'librarian'],
          updatedAt: { [Op.lt]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90 days
        }
      })
    ]);

    return {
      overdueRisk: { level: overdueCount > 10 ? 'high' : 'medium', count: overdueCount },
      inventoryRisk: { level: damagedBooks > 5 ? 'high' : 'low', count: damagedBooks },
      userEngagementRisk: { level: inactiveUsers > 50 ? 'high' : 'medium', count: inactiveUsers }
    };
  }

  async generateRecommendations(startDate, endDate) {
    // AI-like recommendations based on data patterns
    const recommendations = [];

    const overdueRate = await this.calculateReturnRate(startDate, endDate);
    if (overdueRate < 85) {
      recommendations.push({
        type: 'policy',
        priority: 'high',
        title: 'Improve Return Rate',
        description: 'Consider implementing automated reminders or adjusting borrowing policies'
      });
    }

    const topCategory = await models.Borrow.findOne({
      include: [{
        model: models.Book,
        as: 'book',
        attributes: ['category']
      }],
      where: { borrowDate: { [Op.between]: [startDate, endDate] } },
      attributes: [
        [col('book.category'), 'category'],
        [fn('COUNT', col('Borrow.id')), 'count']
      ],
      group: [col('book.category')],
      order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
      raw: true
    });

    if (topCategory) {
      recommendations.push({
        type: 'collection',
        priority: 'medium',
        title: 'Expand Popular Category',
        description: `Consider acquiring more books in ${topCategory.category} category`
      });
    }

    return recommendations;
  }
}

module.exports = new AnalyticsService();