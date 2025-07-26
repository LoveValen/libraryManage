# 🔍 高级搜索 API

基于Elasticsearch的企业级搜索系统API，提供全文搜索、智能过滤、搜索分析和个性化搜索体验。

## 🌐 基础信息

**基础路径**: `/search`  
**权限要求**: 公开搜索，高级功能需认证  
**认证方式**: Bearer Token (JWT)  
**搜索引擎**: Elasticsearch 7.x/8.x

## 🎯 核心功能

### 📚 图书搜索

#### 基础搜索
```http
GET /search/books
```

**查询参数**:
```
q: 搜索关键词 (支持多关键词和短语搜索)
page: 页码 (默认: 1)
limit: 每页数量 (默认: 20, 最大: 100)
sort: 排序方式 (relevance/title/author/year/rating/popularity)
order: 排序方向 (asc/desc)
highlight: 是否高亮匹配词 (true/false)
explain: 返回评分解释 (true/false, 仅管理员)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "query": "JavaScript 高级程序设计",
    "total": 156,
    "took": 15,
    "results": [
      {
        "id": "book_123",
        "title": "JavaScript高级程序设计",
        "author": "Nicholas C. Zakas",
        "isbn": "9787115275790",
        "category": "technology",
        "publishYear": 2012,
        "publisher": "人民邮电出版社",
        "pages": 886,
        "language": "中文",
        "averageRating": 4.6,
        "ratingsCount": 234,
        "borrowCount": 156,
        "available": true,
        "availableCopies": 3,
        "totalCopies": 5,
        "location": "A区3层 - 计算机科学",
        "callNumber": "TP312.JS/Z123",
        "coverImage": "/images/books/book_123.jpg",
        "description": "JavaScript技术经典名著，ECMAScript 5和HTML5权威指南...",
        "tags": ["JavaScript", "前端开发", "Web开发"],
        "score": 8.95,
        "highlights": {
          "title": "<em>JavaScript</em><em>高级</em><em>程序设计</em>",
          "description": "...最全面的<em>JavaScript</em>技术..."
        },
        "metadata": {
          "indexedAt": "2025-01-12T10:30:00.000Z",
          "lastUpdated": "2025-01-10T15:20:00.000Z"
        }
      }
    ],
    "aggregations": {
      "categories": [
        { "key": "technology", "count": 89, "selected": false },
        { "key": "science", "count": 34, "selected": false },
        { "key": "literature", "count": 23, "selected": false }
      ],
      "authors": [
        { "key": "Nicholas C. Zakas", "count": 5 },
        { "key": "Robert C. Martin", "count": 3 }
      ],
      "publishYears": [
        { "key": "2020-2025", "count": 45 },
        { "key": "2015-2019", "count": 67 },
        { "key": "2010-2014", "count": 44 }
      ],
      "availability": [
        { "key": "available", "count": 123 },
        { "key": "borrowed", "count": 33 }
      ],
      "ratings": [
        { "key": "4.5+", "count": 89 },
        { "key": "4.0-4.5", "count": 45 },
        { "key": "3.5-4.0", "count": 22 }
      ]
    },
    "suggestions": {
      "didYouMean": "JavaScript 高级程序设计第四版",
      "relatedQueries": [
        "JavaScript权威指南",
        "前端开发实战",
        "Vue.js实战"
      ]
    },
    "searchTime": "15ms",
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalItems": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 高级搜索
```http
POST /search/books/advanced
```

**请求体**:
```json
{
  "query": {
    "text": "机器学习算法",
    "fields": ["title^2", "description", "tags"],
    "operator": "and",
    "fuzziness": "AUTO",
    "minimumShouldMatch": "75%"
  },
  "filters": {
    "categories": ["technology", "science"],
    "authors": ["周志华", "李航"],
    "publishYear": {
      "gte": 2015,
      "lte": 2025
    },
    "rating": {
      "gte": 4.0
    },
    "availability": "available",
    "language": ["中文", "英文"],
    "pages": {
      "gte": 200,
      "lte": 800
    },
    "location": "A区",
    "tags": ["入门", "实战"]
  },
  "sort": [
    { "relevance": "desc" },
    { "rating": "desc" },
    { "publishYear": "desc" }
  ],
  "highlight": {
    "enabled": true,
    "fields": ["title", "description"],
    "preTags": ["<mark>"],
    "postTags": ["</mark>"],
    "fragmentSize": 150
  },
  "aggregations": {
    "categories": { "enabled": true, "size": 10 },
    "authors": { "enabled": true, "size": 15 },
    "publishYears": { "enabled": true, "interval": "year" },
    "ratings": { "enabled": true, "ranges": [3.0, 3.5, 4.0, 4.5] }
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "options": {
    "explain": false,
    "includeAll": false,
    "timeout": "30s"
  }
}
```

**响应格式与基础搜索相同，但包含更精确的结果。**

### 🔍 智能搜索功能

#### 搜索建议（自动补全）
```http
GET /search/suggestions
```

**查询参数**:
```
q: 搜索前缀 (最少2个字符)
type: 建议类型 (books/authors/categories/all)
limit: 建议数量 (默认: 10, 最大: 20)
personalized: 个性化建议 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "query": "java",
    "suggestions": [
      {
        "text": "JavaScript高级程序设计",
        "type": "book",
        "highlight": "<em>Java</em>Script高级程序设计",
        "category": "technology",
        "score": 9.2,
        "metadata": {
          "bookId": "book_123",
          "author": "Nicholas C. Zakas",
          "popularity": 0.89
        }
      },
      {
        "text": "Java核心技术",
        "type": "book",
        "highlight": "<em>Java</em>核心技术",
        "score": 8.8,
        "metadata": {
          "bookId": "book_456",
          "author": "Cay S. Horstmann"
        }
      },
      {
        "text": "James Gosling",
        "type": "author",
        "highlight": "<em>Ja</em>mes Gosling",
        "score": 7.5,
        "metadata": {
          "bookCount": 8,
          "averageRating": 4.3
        }
      },
      {
        "text": "Java编程",
        "type": "category",
        "highlight": "<em>Java</em>编程",
        "score": 6.9,
        "metadata": {
          "bookCount": 47,
          "subcategories": ["Java基础", "Java进阶", "Java框架"]
        }
      }
    ],
    "personalized": true,
    "responseTime": "8ms"
  }
}
```

#### 拼写纠错
```http
GET /search/spell-check
```

**查询参数**:
```
q: 可能有拼写错误的查询
confidence: 置信度阈值 (0-1, 默认: 0.75)
maxSuggestions: 最大建议数 (默认: 5)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "originalQuery": "javascirpt 设计模式",
    "corrections": [
      {
        "term": "javascirpt",
        "suggestions": [
          {
            "text": "javascript",
            "score": 0.92,
            "frequency": 156
          },
          {
            "text": "java",
            "score": 0.78,
            "frequency": 89
          }
        ],
        "confidence": 0.92
      }
    ],
    "correctedQuery": "javascript 设计模式",
    "hasCorrestions": true,
    "confidence": 0.92
  }
}
```

#### 语义搜索
```http
POST /search/semantic
```

**请求体**:
```json
{
  "query": "我想学习深度学习和神经网络相关的书籍",
  "context": {
    "userLevel": "beginner",
    "interests": ["人工智能", "机器学习"],
    "previousBooks": ["Python基础教程"]
  },
  "options": {
    "expandQuery": true,
    "includeRelated": true,
    "personalize": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "originalQuery": "我想学习深度学习和神经网络相关的书籍",
    "semanticAnalysis": {
      "intent": "learning_recommendation",
      "entities": [
        {
          "text": "深度学习",
          "type": "topic",
          "confidence": 0.95
        },
        {
          "text": "神经网络",
          "type": "topic",
          "confidence": 0.91
        }
      ],
      "keywords": ["深度学习", "神经网络", "机器学习", "人工智能"],
      "expandedTerms": ["deep learning", "neural networks", "CNN", "RNN", "PyTorch", "TensorFlow"]
    },
    "results": [
      {
        "book": {
          "id": "book_789",
          "title": "深度学习入门",
          "author": "斋藤康毅"
        },
        "relevanceScore": 0.94,
        "semanticMatch": 0.89,
        "reasons": [
          "完全匹配用户查询意图",
          "适合初学者水平",
          "与用户兴趣高度相关"
        ]
      }
    ],
    "recommendations": {
      "learningPath": [
        "Python基础 → 机器学习基础 → 深度学习入门 → 神经网络实战",
        "建议先学习线性代数和概率论基础"
      ],
      "relatedTopics": ["计算机视觉", "自然语言处理", "强化学习"]
    }
  }
}
```

### 📊 搜索分析

#### 搜索统计
```http
GET /search/analytics
```

**权限**: 管理员

**查询参数**:
```
period: 统计周期 (24h/7d/30d/90d)
groupBy: 分组方式 (hour/day/week/month)
includeQueries: 包含查询详情 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "summary": {
      "totalSearches": 15678,
      "uniqueUsers": 1234,
      "avgResultsPerSearch": 12.5,
      "avgResponseTime": "28ms",
      "zeroResultsRate": 0.05,
      "clickThroughRate": 0.78
    },
    "trends": [
      {
        "date": "2025-01-06",
        "searches": 2234,
        "users": 189,
        "avgResponseTime": "25ms",
        "zeroResults": 89
      }
    ],
    "topQueries": [
      {
        "query": "javascript",
        "count": 567,
        "clickRate": 0.89,
        "avgPosition": 1.2,
        "trend": "stable"
      },
      {
        "query": "机器学习",
        "count": 456,
        "clickRate": 0.82,
        "avgPosition": 1.5,
        "trend": "rising"
      }
    ],
    "failedQueries": [
      {
        "query": "quantam computing",
        "count": 23,
        "suggestions": ["quantum computing"],
        "reason": "spelling_error"
      }
    ],
    "categories": [
      {
        "category": "technology",
        "searches": 5678,
        "percentage": 36.2
      }
    ],
    "performance": {
      "avgIndexingTime": "2.3s",
      "indexSize": "2.3GB",
      "documentsCount": 45678,
      "shardsHealth": "green"
    }
  }
}
```

#### 用户搜索历史
```http
GET /search/history
```

**权限**: 已认证用户（查看自己的历史）

**查询参数**:
```
limit: 历史记录数量 (默认: 50, 最大: 200)
startDate: 开始日期
endDate: 结束日期
includeClicks: 包含点击信息
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "totalSearches": 234,
    "history": [
      {
        "id": "search_789",
        "query": "JavaScript设计模式",
        "timestamp": "2025-01-12T10:30:00.000Z",
        "results": {
          "total": 23,
          "clicked": [
            {
              "bookId": "book_456",
              "title": "JavaScript设计模式",
              "position": 1,
              "clickTime": "2025-01-12T10:30:15.000Z"
            }
          ]
        },
        "filters": {
          "category": "technology",
          "availability": "available"
        },
        "responseTime": "32ms",
        "source": "manual_search"
      }
    ],
    "insights": {
      "topCategories": ["technology", "science"],
      "searchPatterns": ["primarily_technical", "prefers_newer_books"],
      "avgSessionDuration": "8.5 minutes",
      "preferredFilters": ["available_only", "high_rating"]
    }
  }
}
```

#### 搜索行为分析
```http
GET /search/behavior/{userId}
```

**权限**: 管理员或用户本人

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "profile": {
      "searchFrequency": "high",
      "averageQueryLength": 3.2,
      "preferredCategories": [
        {
          "category": "technology",
          "percentage": 45.6,
          "trend": "increasing"
        }
      ],
      "searchPatterns": {
        "timeOfDay": {
          "morning": 0.2,
          "afternoon": 0.5,
          "evening": 0.3
        },
        "queryTypes": {
          "specific": 0.6,
          "broad": 0.4
        },
        "interactionStyle": "explorer"
      },
      "preferences": {
        "resultsPerPage": 20,
        "sortPreference": "relevance",
        "useFilters": true,
        "clickPosition": {
          "first": 0.45,
          "top3": 0.78,
          "top10": 0.92
        }
      }
    },
    "performance": {
      "querySuccessRate": 0.89,
      "avgTimeToClick": "15.6s",
      "refinementRate": 0.23,
      "abandonmentRate": 0.12
    }
  }
}
```

### 🎯 个性化搜索

#### 个性化搜索结果
```http
GET /search/personalized
```

**权限**: 已认证用户

**查询参数**:
```
q: 搜索查询
personalizeLevel: 个性化程度 (low/medium/high)
useHistory: 使用搜索历史 (true/false)
useBehavior: 使用行为数据 (true/false)
usePreferences: 使用用户偏好 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "query": "编程",
    "personalization": {
      "level": "high",
      "factors": [
        {
          "type": "reading_history",
          "weight": 0.4,
          "description": "基于您阅读过的技术类图书"
        },
        {
          "type": "search_history",
          "weight": 0.3,
          "description": "基于您的搜索偏好"
        },
        {
          "type": "category_preference",
          "weight": 0.2,
          "description": "您偏好技术和计算机科学类"
        },
        {
          "type": "difficulty_level",
          "weight": 0.1,
          "description": "匹配您的技术水平"
        }
      ]
    },
    "results": [
      {
        "book": {
          "id": "book_123",
          "title": "JavaScript高级程序设计"
        },
        "baseScore": 7.2,
        "personalizedScore": 8.9,
        "boost": 1.24,
        "boostReasons": [
          "您曾借阅过同作者的其他书籍",
          "与您的技术水平匹配",
          "同类读者高度评价"
        ]
      }
    ],
    "alternatives": {
      "genericResults": "/search/books?q=编程&personalize=false",
      "explanation": "个性化搜索为您优化了结果排序"
    }
  }
}
```

#### 搜索偏好设置
```http
PUT /search/preferences
```

**权限**: 已认证用户

**请求体**:
```json
{
  "defaultSort": "relevance",
  "resultsPerPage": 20,
  "enablePersonalization": true,
  "categories": {
    "preferred": ["technology", "science"],
    "excluded": ["romance", "children"]
  },
  "filters": {
    "defaultAvailabilityFilter": true,
    "defaultRatingFilter": 3.5,
    "defaultLanguage": ["中文", "英文"]
  },
  "display": {
    "showHighlights": true,
    "showDescriptions": true,
    "showCoverImages": true,
    "compactView": false
  },
  "privacy": {
    "saveSearchHistory": true,
    "useForPersonalization": true,
    "shareWithRecommendations": true
  }
}
```

### 🔧 搜索管理

#### 重新索引
```http
POST /search/admin/reindex
```

**权限**: 管理员

**请求体**:
```json
{
  "scope": "all",
  "entities": ["books", "authors", "categories"],
  "options": {
    "fullReindex": false,
    "batchSize": 1000,
    "parallel": true,
    "validateData": true
  },
  "schedule": {
    "immediate": true,
    "scheduledTime": null
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "重新索引任务已创建",
  "data": {
    "taskId": "reindex_task_123",
    "status": "started",
    "entities": ["books", "authors", "categories"],
    "estimatedDuration": "15-20 minutes",
    "progress": {
      "total": 45678,
      "processed": 0,
      "failed": 0,
      "percentage": 0
    },
    "monitorUrl": "/search/admin/reindex/reindex_task_123/status"
  }
}
```

#### 搜索配置
```http
GET /search/admin/config
PUT /search/admin/config
```

**权限**: 管理员

**配置示例**:
```json
{
  "elasticsearch": {
    "nodes": ["http://localhost:9200"],
    "indexPrefix": "library",
    "shards": 5,
    "replicas": 1,
    "refreshInterval": "1s"
  },
  "search": {
    "defaultPageSize": 20,
    "maxPageSize": 100,
    "defaultSort": "relevance",
    "timeout": "30s",
    "highlightFragmentSize": 150
  },
  "indexing": {
    "batchSize": 500,
    "autoRefresh": true,
    "validateBeforeIndex": true,
    "retryFailedDocs": true
  },
  "analysis": {
    "language": "chinese",
    "analyzers": {
      "text": "ik_max_word",
      "search": "ik_smart"
    },
    "synonyms": {
      "enabled": true,
      "file": "synonyms.txt"
    }
  },
  "performance": {
    "cacheEnabled": true,
    "cacheTTL": "5m",
    "requestCacheSize": "10%",
    "fieldDataCacheSize": "20%"
  }
}
```

#### 搜索健康检查
```http
GET /search/admin/health
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "elasticsearch": {
      "cluster": {
        "name": "library-search",
        "status": "green",
        "nodes": 3,
        "activeShards": 15,
        "relocatingShards": 0,
        "unassignedShards": 0
      },
      "indices": {
        "books": {
          "status": "green",
          "documents": 45678,
          "size": "1.2GB",
          "lastUpdated": "2025-01-12T10:25:00.000Z"
        },
        "authors": {
          "status": "green",
          "documents": 2345,
          "size": "45MB"
        }
      }
    },
    "performance": {
      "avgQueryTime": "28ms",
      "queryRate": "150/min",
      "indexingRate": "5/min",
      "cacheHitRate": "85%"
    },
    "monitoring": {
      "slowQueries": 2,
      "failedQueries": 0,
      "queueSize": 0
    }
  }
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `INVALID_QUERY` | 400 | 查询语法错误 | 检查查询格式和语法 |
| `SEARCH_TIMEOUT` | 408 | 搜索超时 | 简化查询或增加超时时间 |
| `INDEX_NOT_FOUND` | 404 | 搜索索引不存在 | 检查索引状态或重建索引 |
| `ELASTICSEARCH_UNAVAILABLE` | 503 | ES服务不可用 | 检查ES集群状态 |
| `QUERY_TOO_COMPLEX` | 400 | 查询过于复杂 | 简化查询条件 |
| `INVALID_AGGREGATION` | 400 | 聚合参数错误 | 检查聚合配置 |
| `SEARCH_LIMIT_EXCEEDED` | 429 | 搜索频率超限 | 降低搜索频率 |

### 搜索质量问题

1. **无搜索结果**:
   - 检查拼写错误
   - 尝试更宽泛的查询
   - 使用同义词扩展
   - 降低过滤条件

2. **结果不相关**:
   - 优化查询权重
   - 调整相关性算法
   - 使用短语搜索
   - 增加字段权重

3. **搜索速度慢**:
   - 优化索引结构
   - 使用缓存
   - 限制结果数量
   - 优化聚合查询

## 📊 性能优化

### 索引优化
- **分片策略**: 根据数据量合理设置分片数
- **映射优化**: 精确定义字段类型和分析器
- **索引模板**: 统一索引配置和映射
- **别名管理**: 支持索引热切换

### 查询优化
- **查询缓存**: 缓存常见查询结果
- **过滤优先**: 先过滤后查询
- **分页深度**: 限制深度分页
- **字段选择**: 只返回需要的字段

### 监控指标
- **查询延迟**: P95 < 100ms
- **索引速度**: > 1000 docs/s
- **缓存命中率**: > 80%
- **集群健康**: 保持绿色状态

## 🔗 相关文档

- [Elasticsearch集成指南](../development/elasticsearch-setup.md)
- [搜索算法优化](../algorithms/search-relevance.md)
- [中文分词配置](../deployment/chinese-analyzer.md)
- [搜索性能调优](../performance/search-optimization.md)

---

⚠️ **搜索提醒**:
- 定期监控Elasticsearch集群健康状态
- 及时清理和优化索引以保持性能
- 根据用户反馈持续优化搜索相关性
- 注意控制搜索请求频率，避免集群过载