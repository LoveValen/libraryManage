const analyticsService = require('../services/analytics.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * 分析控制器
 * 处理所有分析和报告相关的HTTP请求
 */
class AnalyticsController {
  /**
   * 获取综合仪表板数据
   * GET /api/v1/analytics/dashboard
   */
  getDashboard = asyncHandler(async (req, res) => {
    const { 
      startDate, 
      endDate, 
      granularity = 'day' 
    } = req.query;

    const options = {};
    
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    if (granularity) {
      options.granularity = granularity;
    }

    const dashboardData = await analyticsService.getDashboardAnalytics(options);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Dashboard analytics retrieved successfully',
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取图书分析报告
   * GET /api/v1/analytics/books
   */
  getBooksAnalytics = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      limit = 20,
      category
    } = req.query;

    const analytics = await analyticsService.getTopPerformingBooks(
      new Date(startDate), 
      new Date(endDate), 
      parseInt(limit)
    );

    // 如果指定了分类，过滤结果
    if (category) {
      Object.keys(analytics).forEach(key => {
        analytics[key] = analytics[key].filter(book => 
          book.category?.toLowerCase().includes(category.toLowerCase())
        );
      });
    }
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Books analytics retrieved successfully',
      data: analytics,
      filters: { startDate, endDate, limit, category },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取用户分析报告
   * GET /api/v1/analytics/users
   */
  getUsersAnalytics = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      includeEngagement = true
    } = req.query;

    const userAnalytics = await analyticsService.getActiveUserAnalytics(
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'User analytics retrieved successfully',
      data: userAnalytics,
      filters: { startDate, endDate, includeEngagement },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取分类分析报告
   * GET /api/v1/analytics/categories
   */
  getCategoriesAnalytics = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      includeTrends = true
    } = req.query;

    const categoryAnalytics = await analyticsService.getCategoryAnalytics(
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Category analytics retrieved successfully',
      data: categoryAnalytics,
      filters: { startDate, endDate, includeTrends },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取性能指标
   * GET /api/v1/analytics/performance
   */
  getPerformanceMetrics = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const performanceMetrics = await analyticsService.getPerformanceMetrics(
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Performance metrics retrieved successfully',
      data: performanceMetrics,
      filters: { startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取预测性洞察
   * GET /api/v1/analytics/insights
   */
  getPredictiveInsights = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90天历史数据
      endDate = new Date()
    } = req.query;

    const insights = await analyticsService.getPredictiveInsights(
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Predictive insights retrieved successfully',
      data: insights,
      filters: { startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取趋势数据
   * GET /api/v1/analytics/trends
   */
  getTrendsAnalytics = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      granularity = 'day',
      metrics = 'all'
    } = req.query;

    const trendsData = await analyticsService.getTrendAnalytics(
      new Date(startDate), 
      new Date(endDate),
      granularity
    );

    // 根据请求的指标过滤数据
    let filteredData = trendsData;
    if (metrics !== 'all') {
      const requestedMetrics = metrics.split(',');
      filteredData = trendsData.map(item => {
        const filtered = { date: item.date };
        requestedMetrics.forEach(metric => {
          if (item[metric] !== undefined) {
            filtered[metric] = item[metric];
          }
        });
        return filtered;
      });
    }
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Trends analytics retrieved successfully',
      data: filteredData,
      filters: { startDate, endDate, granularity, metrics },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取概览统计
   * GET /api/v1/analytics/overview
   */
  getOverview = asyncHandler(async (req, res) => {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const overview = await analyticsService.getOverviewStatistics(
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Overview statistics retrieved successfully',
      data: overview,
      filters: { startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 导出分析报告
   * POST /api/v1/analytics/export
   */
  exportReport = asyncHandler(async (req, res) => {
    const { 
      reportType = 'dashboard',
      format = 'excel',
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      includeCharts = false
    } = req.body;

    // 根据报告类型获取数据
    let reportData;
    switch (reportType) {
      case 'dashboard':
        reportData = await analyticsService.getDashboardAnalytics({
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });
        break;
      case 'books':
        reportData = await analyticsService.getTopPerformingBooks(
          new Date(startDate), 
          new Date(endDate)
        );
        break;
      case 'users':
        reportData = await analyticsService.getActiveUserAnalytics(
          new Date(startDate), 
          new Date(endDate)
        );
        break;
      case 'categories':
        reportData = await analyticsService.getCategoryAnalytics(
          new Date(startDate), 
          new Date(endDate)
        );
        break;
      default:
        reportData = await analyticsService.getDashboardAnalytics({
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });
    }

    // 生成报告文件
    const reportBuffer = await this.generateReportFile(reportData, format, includeCharts);
    const fileName = `analytics_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', this.getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(reportBuffer);
  });

  /**
   * 获取实时统计
   * GET /api/v1/analytics/realtime
   */
  getRealTimeStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const realtimeStats = await analyticsService.getOverviewStatistics(today, now);
    
    // 添加实时指标
    const additionalStats = {
      timestamp: now.toISOString(),
      onlineUsers: 0, // 这里可以集成WebSocket连接数
      activeTransactions: realtimeStats.current.activeBorrows,
      systemHealth: 'healthy'
    };
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Real-time statistics retrieved successfully',
      data: {
        ...realtimeStats,
        realtime: additionalStats
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取自定义查询结果
   * POST /api/v1/analytics/query
   */
  customQuery = asyncHandler(async (req, res) => {
    const { 
      query,
      parameters = {},
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.body;

    // 这里可以实现自定义查询功能
    // 为了安全，需要严格验证查询内容
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Valid query is required',
        timestamp: new Date().toISOString(),
      });
    }

    // 简化实现，仅支持预定义查询
    const predefinedQueries = {
      'top_categories_by_borrows': await analyticsService.getCategoryAnalytics(
        new Date(startDate), 
        new Date(endDate)
      ),
      'user_engagement_metrics': await analyticsService.getActiveUserAnalytics(
        new Date(startDate), 
        new Date(endDate)
      )
    };

    const result = predefinedQueries[query];
    
    if (!result) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Query not supported',
        timestamp: new Date().toISOString(),
      });
    }
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Custom query executed successfully',
      data: result,
      query: { query, parameters, startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  });

  // Helper methods

  async generateReportFile(data, format, includeCharts) {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    }
    
    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // 创建概览工作表
      const worksheet = workbook.addWorksheet('Analytics Overview');
      
      // 添加数据到Excel
      if (data.overview) {
        worksheet.addRow(['Metric', 'Value']);
        worksheet.addRow(['Total Books', data.overview.totals.books]);
        worksheet.addRow(['Total Users', data.overview.totals.users]);
        worksheet.addRow(['Total Borrows', data.overview.totals.borrows]);
        worksheet.addRow(['Active Borrows', data.overview.current.activeBorrows]);
        worksheet.addRow(['Overdue Rate (%)', data.overview.current.overdueRate]);
        worksheet.addRow(['Return Rate (%)', data.overview.current.returnRate]);
      }
      
      return await workbook.xlsx.writeBuffer();
    }
    
    if (format === 'csv') {
      const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
      const csvStringifier = createCsvStringifier({
        header: [
          { id: 'metric', title: 'Metric' },
          { id: 'value', title: 'Value' }
        ]
      });
      
      const records = [
        { metric: 'Total Books', value: data.overview?.totals.books || 0 },
        { metric: 'Total Users', value: data.overview?.totals.users || 0 },
        { metric: 'Active Borrows', value: data.overview?.current.activeBorrows || 0 }
      ];
      
      return Buffer.from(csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records), 'utf8');
    }
    
    // 默认返回JSON
    return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  }

  getContentType(format) {
    const contentTypes = {
      'json': 'application/json',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'pdf': 'application/pdf'
    };
    
    return contentTypes[format] || 'application/json';
  }
}

module.exports = new AnalyticsController();