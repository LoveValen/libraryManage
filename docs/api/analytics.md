# 📈 数据分析统计 API

企业级数据分析和商业智能API，提供多维度数据统计、趋势分析、用户洞察、业务指标监控等功能。

## 🌐 基础信息

**基础路径**: `/analytics`  
**权限要求**: 基于数据敏感度的分级权限  
**认证方式**: Bearer Token (JWT)  
**数据范围**: 支持实时和历史数据分析

## 📊 概览统计

### 获取系统概览数据
```http
GET /analytics/overview
```

**权限**: 管理员或有统计权限的用户

**查询参数**:
```
period: 统计周期 (today/7d/30d/90d/1y/all)
timezone: 时区 (Asia/Shanghai)
includeComparison: 包含同比数据 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "generatedAt": "2025-01-12T10:30:00.000Z",
    "overview": {
      "users": {
        "total": 12456,
        "active": 8234,
        "new": 567,
        "growth": "+12.3%",
        "retentionRate": 0.76
      },
      "books": {
        "total": 45678,
        "available": 38912,
        "borrowed": 5234,
        "reserved": 1532,
        "utilizationRate": 0.67
      },
      "borrowing": {
        "totalBorrows": 23456,
        "activeBorrows": 5234,
        "completedBorrows": 18222,
        "overdueBorrows": 234,
        "overdueRate": 0.04,
        "averageBorrowDuration": "12.5 days"
      },
      "engagement": {
        "averageSessionDuration": "15.3 minutes",
        "pageViews": 234567,
        "searchQueries": 45678,
        "reviewsSubmitted": 1234,
        "averageRating": 4.3
      }
    },
    "trends": {
      "userGrowth": [
        {
          "date": "2025-01-12",
          "newUsers": 23,
          "activeUsers": 456,
          "totalUsers": 12456
        }
      ],
      "borrowingActivity": [
        {
          "date": "2025-01-12",
          "borrows": 89,
          "returns": 76,
          "renewals": 34
        }
      ]
    },
    "comparison": {
      "previousPeriod": {
        "users": {
          "total": 11123,
          "growth": "+11.9%"
        },
        "borrowing": {
          "totalBorrows": 20890,
          "growth": "+12.3%"
        }
      },
      "yearOverYear": {
        "users": {
          "growth": "+45.6%"
        },
        "borrowing": {
          "growth": "+23.4%"
        }
      }
    }
  }
}
```

## 👥 用户分析

### 用户统计分析
```http
GET /analytics/users
```

**权限**: 管理员

**查询参数**:
```
period: 分析周期
groupBy: 分组维度 (date/role/registration_source/activity_level)
segment: 用户细分 (new/active/inactive/churned)
includeDetails: 包含详细数据
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 12456,
      "activeUsers": 8234,
      "newUsers": 567,
      "churnedUsers": 123,
      "averageLifetimeValue": 156.78
    },
    "demographics": {
      "byRole": [
        {
          "role": "user",
          "count": 11890,
          "percentage": 95.5,
          "growth": "+12.1%"
        },
        {
          "role": "librarian",
          "count": 45,
          "percentage": 0.4,
          "growth": "+15.4%"
        },
        {
          "role": "admin",
          "count": 12,
          "percentage": 0.1,
          "growth": "0%"
        }
      ],
      "byRegistrationSource": [
        {
          "source": "website",
          "count": 8234,
          "percentage": 66.1
        },
        {
          "source": "wechat_miniprogram",
          "count": 3456,
          "percentage": 27.8
        },
        {
          "source": "admin_created",
          "count": 766,
          "percentage": 6.1
        }
      ],
      "byActivityLevel": [
        {
          "level": "highly_active",
          "count": 1245,
          "percentage": 10.0,
          "criteria": "10+ actions/month"
        },
        {
          "level": "moderately_active",
          "count": 4567,
          "percentage": 36.7,
          "criteria": "3-9 actions/month"
        },
        {
          "level": "low_activity",
          "count": 3456,
          "percentage": 27.8,
          "criteria": "1-2 actions/month"
        },
        {
          "level": "inactive",
          "count": 3188,
          "percentage": 25.6,
          "criteria": "0 actions/month"
        }
      ]
    },
    "engagement": {
      "averageSessionsPerUser": 8.3,
      "averageSessionDuration": "15.3 minutes",
      "averagePageViewsPerSession": 6.7,
      "bounceRate": 0.23,
      "retentionRates": {
        "day1": 0.89,
        "day7": 0.67,
        "day30": 0.45,
        "day90": 0.32
      }
    },
    "behavior": {
      "topActions": [
        {
          "action": "search_books",
          "count": 45678,
          "percentage": 34.2
        },
        {
          "action": "view_book_details",
          "count": 23456,
          "percentage": 17.6
        },
        {
          "action": "borrow_book",
          "count": 12345,
          "percentage": 9.3
        }
      ],
      "preferredCategories": [
        {
          "category": "技术",
          "users": 3456,
          "percentage": 27.8
        },
        {
          "category": "文学",
          "users": 2890,
          "percentage": 23.2
        },
        {
          "category": "科学",
          "users": 2234,
          "percentage": 17.9
        }
      ]
    },
    "cohortAnalysis": [
      {
        "cohort": "2024-12",
        "size": 567,
        "retention": {
          "month0": 1.0,
          "month1": 0.78,
          "month2": 0.65,
          "month3": 0.52
        }
      }
    ]
  }
}
```

### 用户行为分析
```http
GET /analytics/users/behavior
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userJourney": {
      "commonPaths": [
        {
          "path": "登录 → 搜索 → 查看详情 → 借阅",
          "frequency": 2345,
          "conversionRate": 0.67
        },
        {
          "path": "登录 → 推荐 → 查看详情 → 借阅",
          "frequency": 1876,
          "conversionRate": 0.78
        }
      ],
      "dropoffPoints": [
        {
          "step": "查看详情",
          "dropoffRate": 0.32,
          "reasons": ["书籍不可用", "评分较低", "内容不符"]
        }
      ]
    },
    "timePatterns": {
      "hourlyActivity": [
        {
          "hour": 9,
          "activeUsers": 234,
          "activities": 1456
        },
        {
          "hour": 14,
          "activeUsers": 567,
          "activities": 3456
        },
        {
          "hour": 20,
          "activeUsers": 789,
          "activities": 4567
        }
      ],
      "weeklyPattern": [
        {
          "day": "Monday",
          "averageActiveUsers": 1234,
          "peakHour": 14
        }
      ]
    },
    "featureUsage": [
      {
        "feature": "search",
        "usageRate": 0.89,
        "averageUsesPerUser": 12.3,
        "satisfactionScore": 4.2
      },
      {
        "feature": "recommendations",
        "usageRate": 0.67,
        "averageUsesPerUser": 8.7,
        "satisfactionScore": 4.5
      },
      {
        "feature": "reviews",
        "usageRate": 0.23,
        "averageUsesPerUser": 2.1,
        "satisfactionScore": 4.3
      }
    ]
  }
}
```

## 📚 图书分析

### 图书统计分析
```http
GET /analytics/books
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "inventory": {
      "totalBooks": 45678,
      "totalCopies": 123456,
      "averageCopiesPerBook": 2.7,
      "utilizationRate": 0.67,
      "turnoverRate": 2.3
    },
    "categories": [
      {
        "category": "技术",
        "bookCount": 12345,
        "percentage": 27.0,
        "averageRating": 4.3,
        "borrowCount": 23456,
        "popularityTrend": "+15.2%"
      },
      {
        "category": "文学",
        "bookCount": 8901,
        "percentage": 19.5,
        "averageRating": 4.5,
        "borrowCount": 18765,
        "popularityTrend": "+8.7%"
      }
    ],
    "popularity": {
      "mostBorrowedBooks": [
        {
          "bookId": "book_123",
          "title": "JavaScript高级程序设计",
          "author": "Nicholas C. Zakas",
          "borrowCount": 456,
          "rating": 4.8,
          "category": "技术"
        }
      ],
      "topRatedBooks": [
        {
          "bookId": "book_456",
          "title": "百年孤独",
          "author": "加西亚·马尔克斯",
          "rating": 4.9,
          "reviewCount": 234,
          "category": "文学"
        }
      ],
      "trendingBooks": [
        {
          "bookId": "book_789",
          "title": "深度学习入门",
          "trendScore": 89.5,
          "borrowGrowth": "+234%",
          "category": "技术"
        }
      ]
    },
    "performance": {
      "fastestTurnaround": [
        {
          "bookId": "book_321",
          "title": "快速阅读指南",
          "averageBorrowDuration": "3.2 days",
          "turnoverRate": 45.6
        }
      ],
      "longestHeld": [
        {
          "bookId": "book_654",
          "title": "计算机科学百科全书",
          "averageBorrowDuration": "25.8 days",
          "category": "参考书"
        }
      ]
    },
    "acquisition": {
      "newBooksThisMonth": 234,
      "averageAge": "3.2 years",
      "acquisitionSources": [
        {
          "source": "购买",
          "count": 12345,
          "percentage": 67.8
        },
        {
          "source": "捐赠",
          "count": 5678,
          "percentage": 31.2
        },
        {
          "source": "交换",
          "count": 234,
          "percentage": 1.0
        }
      ]
    }
  }
}
```

### 图书推荐分析
```http
GET /analytics/books/recommendations
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "recommendationPerformance": {
      "totalRecommendations": 45678,
      "clickThroughRate": 0.23,
      "conversionRate": 0.15,
      "averageRelevanceScore": 0.78
    },
    "algorithmComparison": [
      {
        "algorithm": "collaborative_filtering",
        "usage": 45.6,
        "clickRate": 0.25,
        "conversionRate": 0.18,
        "userSatisfaction": 4.2
      },
      {
        "algorithm": "content_based",
        "usage": 32.1,
        "clickRate": 0.21,
        "conversionRate": 0.14,
        "userSatisfaction": 3.9
      },
      {
        "algorithm": "hybrid",
        "usage": 22.3,
        "clickRate": 0.28,
        "conversionRate": 0.20,
        "userSatisfaction": 4.5
      }
    ],
    "categoryRecommendations": [
      {
        "category": "技术",
        "recommendationCount": 12345,
        "successRate": 0.67,
        "topRecommendedBooks": [
          {
            "bookId": "book_123",
            "title": "Vue.js实战",
            "recommendationCount": 234
          }
        ]
      }
    ]
  }
}
```

## 📖 借阅分析

### 借阅统计分析
```http
GET /analytics/borrowing
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalBorrows": 123456,
      "activeBorrows": 5234,
      "completedBorrows": 118222,
      "overdueItems": 456,
      "overdueRate": 0.037,
      "averageBorrowDuration": "12.8 days",
      "renewalRate": 0.23
    },
    "trends": {
      "dailyBorrows": [
        {
          "date": "2025-01-12",
          "borrows": 234,
          "returns": 189,
          "renewals": 45,
          "newBorrows": 234,
          "netChange": 45
        }
      ],
      "seasonalPatterns": [
        {
          "season": "春季",
          "averageBorrows": 456,
          "popularCategories": ["技术", "文学"]
        }
      ]
    },
    "performance": {
      "returnOnTimeRate": 0.96,
      "averageReturnDelay": "1.2 days",
      "fineCollection": {
        "totalFines": 2345.67,
        "collectionRate": 0.89,
        "averageFineAmount": 5.67
      }
    },
    "userSegmentation": {
      "byBorrowingFrequency": [
        {
          "segment": "heavy_borrowers",
          "criteria": "10+ borrows/month",
          "userCount": 234,
          "borrowCount": 3456,
          "contribution": 0.28
        },
        {
          "segment": "regular_borrowers",
          "criteria": "3-9 borrows/month",
          "userCount": 1234,
          "borrowCount": 6789,
          "contribution": 0.55
        },
        {
          "segment": "light_borrowers",
          "criteria": "1-2 borrows/month",
          "userCount": 2345,
          "borrowCount": 2345,
          "contribution": 0.19
        }
      ]
    },
    "categoryAnalysis": [
      {
        "category": "技术",
        "borrowCount": 23456,
        "percentage": 19.0,
        "averageDuration": "15.2 days",
        "renewalRate": 0.34,
        "overdueRate": 0.05
      }
    ]
  }
}
```

### 逾期分析
```http
GET /analytics/borrowing/overdue
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "currentOverdue": 456,
      "overdueRate": 0.037,
      "averageOverdueDays": 3.2,
      "totalFinesGenerated": 2345.67
    },
    "patterns": {
      "byCategory": [
        {
          "category": "技术",
          "overdueCount": 123,
          "overdueRate": 0.045,
          "averageOverdueDays": 4.1
        }
      ],
      "byUser": [
        {
          "userId": 123,
          "username": "frequent_borrower",
          "overdueCount": 12,
          "totalOverdueDays": 45,
          "fineAmount": 67.50
        }
      ],
      "byBook": [
        {
          "bookId": "book_123",
          "title": "厚重参考书",
          "overdueFrequency": 0.23,
          "averageOverdueDays": 8.5
        }
      ]
    },
    "prevention": {
      "reminderEffectiveness": 0.78,
      "renewalUtilization": 0.45,
      "recommendedActions": [
        "增加特定类别的借阅期限",
        "优化提醒通知时机",
        "提供自动续借选项"
      ]
    }
  }
}
```

## 🔍 搜索分析

### 搜索行为分析
```http
GET /analytics/search
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSearches": 45678,
      "uniqueQueries": 12345,
      "averageResultsPerSearch": 23.4,
      "zeroResultsRate": 0.08,
      "averageSearchTime": "145ms"
    },
    "topQueries": [
      {
        "query": "javascript",
        "searchCount": 1234,
        "clickThroughRate": 0.67,
        "resultCount": 45,
        "trend": "+12.3%"
      },
      {
        "query": "python",
        "searchCount": 987,
        "clickThroughRate": 0.72,
        "resultCount": 38,
        "trend": "+8.9%"
      }
    ],
    "failedQueries": [
      {
        "query": "quantam computing",
        "searchCount": 23,
        "suggestedQuery": "quantum computing",
        "reason": "spelling_error"
      }
    ],
    "searchSources": [
      {
        "source": "main_search",
        "count": 23456,
        "percentage": 51.3
      },
      {
        "source": "category_filter",
        "count": 12345,
        "percentage": 27.0
      },
      {
        "source": "autocomplete",
        "count": 9876,
        "percentage": 21.6
      }
    ],
    "performanceMetrics": {
      "averageResponseTime": "145ms",
      "p95ResponseTime": "280ms",
      "indexUpdateFrequency": "realtime",
      "searchAccuracy": 0.89
    }
  }
}
```

## 💰 财务分析

### 财务统计分析
```http
GET /analytics/financial
```

**权限**: 管理员或财务管理员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "revenue": {
      "totalRevenue": 125680.50,
      "breakdown": {
        "fines": {
          "amount": 12568.00,
          "percentage": 10.0,
          "trend": "+5.2%"
        },
        "membershipFees": {
          "amount": 89012.50,
          "percentage": 70.8,
          "trend": "+12.3%"
        },
        "servicesRevenue": {
          "amount": 24100.00,
          "percentage": 19.2,
          "trend": "+8.7%"
        }
      }
    },
    "costs": {
      "totalCosts": 234567.00,
      "breakdown": {
        "bookAcquisition": {
          "amount": 89000.00,
          "percentage": 38.0,
          "trend": "+15.2%"
        },
        "staffCosts": {
          "amount": 120000.00,
          "percentage": 51.2,
          "trend": "+3.1%"
        },
        "maintenance": {
          "amount": 15567.00,
          "percentage": 6.6,
          "trend": "-2.3%"
        },
        "utilities": {
          "amount": 10000.00,
          "percentage": 4.3,
          "trend": "+1.2%"
        }
      }
    },
    "profitability": {
      "grossProfit": -108886.50,
      "netMargin": -0.87,
      "roi": -0.46,
      "costPerUser": 18.83,
      "revenuePerUser": 10.08
    },
    "trends": {
      "monthlyRevenue": [
        {
          "month": "2025-01",
          "revenue": 12568.05,
          "costs": 23456.70,
          "profit": -10888.65
        }
      ],
      "fineCollection": [
        {
          "month": "2025-01",
          "finesGenerated": 1568.00,
          "finesCollected": 1234.50,
          "collectionRate": 0.79
        }
      ]
    },
    "forecasts": {
      "nextQuarterRevenue": 156780.50,
      "breakEvenPoint": "Q4 2025",
      "recommendedActions": [
        "提高会员费收入",
        "控制图书采购成本",
        "提升服务收入"
      ]
    }
  }
}
```

## 📊 自定义报表

### 创建自定义分析
```http
POST /analytics/custom
```

**请求体**:
```json
{
  "name": "技术图书借阅分析",
  "description": "分析技术类图书的借阅模式和用户偏好",
  "dataSource": "borrowing",
  "filters": {
    "bookCategory": "技术",
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2025-01-12T23:59:59.999Z"
    },
    "userRole": "user"
  },
  "metrics": [
    "total_borrows",
    "unique_users",
    "average_duration",
    "renewal_rate",
    "overdue_rate"
  ],
  "dimensions": [
    "month",
    "book_subcategory",
    "user_experience_level"
  ],
  "aggregations": [
    {
      "metric": "total_borrows",
      "method": "sum"
    },
    {
      "metric": "average_duration",
      "method": "avg"
    }
  ],
  "visualization": {
    "type": "line_chart",
    "xAxis": "month",
    "yAxis": "total_borrows",
    "groupBy": "book_subcategory"
  }
}
```

### 获取自定义报表
```http
GET /analytics/custom/{reportId}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reportId": "custom_tech_analysis_123",
    "name": "技术图书借阅分析",
    "generatedAt": "2025-01-12T10:30:00.000Z",
    "results": {
      "summary": {
        "totalBorrows": 12345,
        "uniqueUsers": 3456,
        "averageDuration": "16.2 days",
        "renewalRate": 0.34,
        "overdueRate": 0.05
      },
      "data": [
        {
          "month": "2024-01",
          "book_subcategory": "前端开发",
          "total_borrows": 234,
          "unique_users": 123,
          "average_duration": 15.2,
          "renewal_rate": 0.32
        }
      ],
      "insights": [
        "前端开发类图书最受欢迎",
        "技术图书的续借率高于平均水平",
        "周末借阅量显著下降"
      ]
    },
    "visualization": {
      "chartData": {
        "labels": ["2024-01", "2024-02", "2024-03"],
        "datasets": [
          {
            "label": "前端开发",
            "data": [234, 267, 289]
          },
          {
            "label": "后端开发", 
            "data": [189, 203, 234]
          }
        ]
      },
      "chartConfig": {
        "type": "line",
        "options": {
          "responsive": true,
          "scales": {
            "y": {
              "beginAtZero": true
            }
          }
        }
      }
    }
  }
}
```

## 📈 实时分析

### 实时数据流
```http
GET /analytics/realtime
```

**支持WebSocket连接获取实时数据**:
```javascript
const ws = new WebSocket('ws://api.yourdomain.com/analytics/realtime');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  // data.type: 'user_activity' | 'borrowing_event' | 'search_query' | 'system_metric'
  console.log('实时数据:', data);
};
```

**实时数据示例**:
```json
{
  "type": "borrowing_event",
  "timestamp": "2025-01-12T10:30:00.000Z",
  "data": {
    "event": "book_borrowed",
    "userId": 123,
    "bookId": "book_456",
    "category": "技术",
    "borrowDuration": 14
  }
}
```

### 实时指标仪表板
```http
GET /analytics/realtime/dashboard
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-12T10:30:00.000Z",
    "metrics": {
      "activeUsers": 234,
      "ongoingBorrows": 89,
      "searchesPerMinute": 45,
      "systemLoad": 0.67,
      "responseTime": "125ms"
    },
    "events": [
      {
        "time": "10:29:45",
        "event": "用户 john_doe 借阅了《JavaScript指南》"
      },
      {
        "time": "10:29:30", 
        "event": "用户 jane_smith 归还了《Python实战》"
      }
    ],
    "alerts": [
      {
        "level": "info",
        "message": "今日借阅量已达到本月平均水平",
        "timestamp": "2025-01-12T10:25:00.000Z"
      }
    ]
  }
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `ANALYTICS_ACCESS_DENIED` | 403 | 分析数据访问被拒绝 | 检查用户权限 |
| `INVALID_DATE_RANGE` | 400 | 无效的日期范围 | 检查日期格式和范围 |
| `INSUFFICIENT_DATA` | 400 | 数据不足以生成分析 | 扩大时间范围或降低精度 |
| `METRIC_NOT_FOUND` | 404 | 指标不存在 | 使用有效的指标名称 |
| `QUERY_TIMEOUT` | 408 | 查询超时 | 简化查询条件 |
| `VISUALIZATION_ERROR` | 500 | 可视化生成失败 | 检查数据格式 |

## 📊 性能优化

### 数据聚合策略
- **实时数据**: 15分钟内的原始数据
- **小时聚合**: 1小时粒度的预聚合数据
- **日聚合**: 1天粒度的汇总数据
- **月聚合**: 1月粒度的趋势数据

### 查询优化
- 使用预计算的聚合表
- 索引优化加速查询
- 缓存热点数据
- 异步处理复杂分析

### 数据存储
- OLTP数据库: 实时交易数据
- OLAP数据仓库: 历史分析数据
- 时序数据库: 指标和事件数据
- 缓存层: 频繁访问的统计结果

## 🔗 相关文档

- [数据仓库设计](../design/data-warehouse.md)
- [商业智能平台](../features/business-intelligence.md)
- [报表系统架构](../architecture/reporting-system.md)
- [性能监控指标](../monitoring/performance-metrics.md)

---

⚠️ **数据分析提醒**:
- 注意保护用户隐私，遵循数据使用规范
- 定期验证分析数据的准确性
- 监控分析查询的性能影响
- 建立数据质量检查机制