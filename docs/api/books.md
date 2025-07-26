# 📚 图书API文档

图书模块提供完整的图书管理功能，包括图书的增删改查、搜索筛选、库存管理和电子书管理等核心功能。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/books` | 获取图书列表 | Public |
| GET | `/books/:id` | 获取图书详情 | Public |
| POST | `/books` | 添加新图书 | Admin |
| PUT | `/books/:id` | 更新图书信息 | Admin |
| DELETE | `/books/:id` | 删除图书 | Admin |
| GET | `/books/search` | 搜索图书 | Public |
| GET | `/books/categories` | 获取图书分类 | Public |
| POST | `/books/:id/stock` | 更新库存 | Admin |
| GET | `/books/popular` | 热门图书 | Public |
| GET | `/books/recommendations` | 推荐图书 | Authenticated |

## 📖 获取图书列表

### 请求
```http
GET /api/v1/books?page=1&limit=20&category=技术&sortBy=createdAt&sortOrder=desc
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| page | number | ❌ | 页码 | 1 |
| limit | number | ❌ | 每页数量 | 20 |
| category | string | ❌ | 图书分类 | - |
| language | string | ❌ | 图书语言 | - |
| status | string | ❌ | 图书状态 | - |
| hasEbook | boolean | ❌ | 是否有电子书 | - |
| sortBy | string | ❌ | 排序字段 | createdAt |
| sortOrder | string | ❌ | 排序方向 | desc |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Books retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "subtitle": "第4版",
      "isbn": "9787115545381",
      "authors": ["马特·弗里斯比"],
      "publisher": "人民邮电出版社",
      "publicationYear": 2020,
      "language": "zh-CN",
      "category": "技术",
      "subcategory": "前端开发",
      "tags": ["JavaScript", "编程", "前端"],
      "summary": "JavaScript编程的经典教程，全面深入地讲解JavaScript语言...",
      "coverImage": "https://example.com/covers/js-book.jpg",
      "totalStock": 5,
      "availableStock": 3,
      "reservedStock": 1,
      "status": "available",
      "price": 89.00,
      "pages": 896,
      "hasEbook": true,
      "borrowCount": 156,
      "averageRating": 4.8,
      "reviewCount": 24,
      "createdAt": "2024-12-01T08:00:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📕 获取图书详情

### 请求
```http
GET /api/v1/books/1
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book details retrieved successfully",
  "data": {
    "id": 1,
    "title": "JavaScript高级程序设计",
    "subtitle": "第4版",
    "isbn": "9787115545381",
    "authors": ["马特·弗里斯比"],
    "publisher": "人民邮电出版社",
    "publicationYear": 2020,
    "publicationDate": "2020-09-01",
    "language": "zh-CN",
    "category": "技术",
    "subcategory": "前端开发",
    "tags": ["JavaScript", "编程", "前端"],
    "summary": "JavaScript编程的经典教程，全面深入地讲解JavaScript语言核心概念和高级特性。",
    "description": "本书是JavaScript超级畅销书的新版。ECMAScript 2019全面讲解，从JavaScript语言实现的各个组成部分——语言核心、DOM、BOM、事件模型讲起，深入浅出地探讨了面向对象编程、Ajax与Comet服务器端通信，HTML5表单、媒体、Canvas（包括WebGL）及Web Workers、地理定位、跨文档传递消息、客户端存储（包括IndexedDB）等新API，还介绍了离线应用和与维护、性能、部署相关的最佳开发实践。",
    "tableOfContents": "第1章 JavaScript简介\n第2章 HTML中的JavaScript\n第3章 语言基础\n...",
    "coverImage": "https://example.com/covers/js-book.jpg",
    "backCoverImage": "https://example.com/covers/js-book-back.jpg",
    "totalStock": 5,
    "availableStock": 3,
    "reservedStock": 1,
    "status": "available",
    "location": "A区2层技术书架001",
    "callNumber": "TP312/M123",
    "price": 89.00,
    "pages": 896,
    "format": "平装",
    "dimensions": "185×260mm",
    "weight": 1240,
    "ebookUrl": "/ebooks/js-advanced-programming.pdf",
    "ebookFormat": "PDF",
    "ebookFileSize": 52428800,
    "hasEbook": true,
    "borrowCount": 156,
    "reserveCount": 8,
    "viewCount": 2340,
    "downloadCount": 89,
    "averageRating": 4.8,
    "reviewCount": 24,
    "acquiredDate": "2024-12-01",
    "acquiredFrom": "人民邮电出版社",
    "condition": "new",
    "notes": "技术类热门图书，需重点推荐",
    "reviews": [
      {
        "id": 1,
        "userId": 123,
        "username": "tech_reader",
        "rating": 5,
        "title": "JavaScript学习必备",
        "content": "这本书对JavaScript的讲解非常全面和深入，是前端开发者的必读经典。",
        "isAnonymous": false,
        "likesCount": 12,
        "createdAt": "2024-12-15T14:30:00.000Z"
      }
    ],
    "relatedBooks": [
      {
        "id": 2,
        "title": "深入理解JavaScript",
        "coverImage": "https://example.com/covers/js-deep.jpg",
        "averageRating": 4.6
      }
    ],
    "createdAt": "2024-12-01T08:00:00.000Z",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📝 添加新图书

### 请求
```http
POST /api/v1/books
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Vue.js实战",
  "subtitle": "从入门到精通",
  "isbn": "9787111234567",
  "authors": ["张三", "李四"],
  "publisher": "机械工业出版社",
  "publicationYear": 2023,
  "publicationDate": "2023-06-01",
  "language": "zh-CN",
  "category": "技术",
  "subcategory": "前端开发",
  "tags": ["Vue.js", "前端", "JavaScript"],
  "summary": "全面介绍Vue.js 3.x版本的实战开发指南",
  "description": "本书从Vue.js基础知识开始，逐步深入到高级特性和实战项目...",
  "coverImage": "https://example.com/covers/vuejs-book.jpg",
  "totalStock": 10,
  "price": 79.00,
  "pages": 456,
  "format": "平装",
  "location": "A区2层技术书架002",
  "callNumber": "TP312/Z001",
  "acquiredFrom": "机械工业出版社",
  "hasEbook": false
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| title | string | ✅ | 图书标题 |
| isbn | string | ✅ | 国际标准书号 |
| authors | array | ✅ | 作者列表 |
| publisher | string | ✅ | 出版社 |
| category | string | ✅ | 图书分类 |
| totalStock | number | ✅ | 总库存 |
| price | number | ❌ | 价格 |
| hasEbook | boolean | ❌ | 是否有电子书 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 201,
  "message": "Book created successfully",
  "data": {
    "id": 156,
    "title": "Vue.js实战",
    "isbn": "9787111234567",
    "authors": ["张三", "李四"],
    "totalStock": 10,
    "availableStock": 10,
    "status": "available",
    "createdAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ✏️ 更新图书信息

### 请求
```http
PUT /api/v1/books/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "price": 99.00,
  "status": "available",
  "notes": "价格已调整"
}
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book updated successfully",
  "data": {
    "id": 1,
    "title": "JavaScript高级程序设计",
    "price": 99.00,
    "status": "available",
    "updatedAt": "2025-01-12T10:35:00.000Z"
  },
  "timestamp": "2025-01-12T10:35:00.000Z"
}
```

## 🗑️ 删除图书

### 请求
```http
DELETE /api/v1/books/1
Authorization: Bearer <admin_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book deleted successfully",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔍 搜索图书

### 请求
```http
GET /api/v1/books/search?q=JavaScript&category=技术&hasEbook=true
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| q | string | ✅ | 搜索关键词 |
| category | string | ❌ | 图书分类 |
| author | string | ❌ | 作者名称 |
| publisher | string | ❌ | 出版社 |
| hasEbook | boolean | ❌ | 是否有电子书 |
| minRating | number | ❌ | 最低评分 |
| maxPrice | number | ❌ | 最高价格 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Search completed successfully",
  "data": [
    {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "authors": ["马特·弗里斯比"],
      "coverImage": "https://example.com/covers/js-book.jpg",
      "averageRating": 4.8,
      "availableStock": 3,
      "hasEbook": true,
      "highlightSnippet": "...全面深入地讲解<em>JavaScript</em>语言核心概念..."
    }
  ],
  "searchInfo": {
    "query": "JavaScript",
    "totalResults": 15,
    "searchTime": 0.045,
    "filters": {
      "category": "技术",
      "hasEbook": true
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📂 获取图书分类

### 请求
```http
GET /api/v1/books/categories
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "name": "技术",
      "bookCount": 450,
      "subcategories": [
        {
          "name": "前端开发",
          "bookCount": 120
        },
        {
          "name": "后端开发",
          "bookCount": 95
        },
        {
          "name": "数据库",
          "bookCount": 68
        }
      ]
    },
    {
      "name": "文学",
      "bookCount": 380,
      "subcategories": [
        {
          "name": "中国文学",
          "bookCount": 180
        },
        {
          "name": "外国文学",
          "bookCount": 150
        }
      ]
    }
  ],
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📦 更新库存

### 请求
```http
POST /api/v1/books/1/stock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operation": "increase",
  "quantity": 5,
  "reason": "新采购入库"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| operation | string | ✅ | 操作类型 (increase/decrease) |
| quantity | number | ✅ | 变更数量 |
| reason | string | ✅ | 变更原因 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Stock updated successfully",
  "data": {
    "bookId": 1,
    "previousStock": 5,
    "currentStock": 10,
    "operation": "increase",
    "quantity": 5,
    "reason": "新采购入库",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔥 热门图书

### 请求
```http
GET /api/v1/books/popular?period=month&limit=10
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| period | string | ❌ | 统计周期 (week/month/year) | month |
| limit | number | ❌ | 返回数量 | 10 |
| category | string | ❌ | 分类筛选 | - |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Popular books retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "authors": ["马特·弗里斯比"],
      "coverImage": "https://example.com/covers/js-book.jpg",
      "borrowCount": 156,
      "averageRating": 4.8,
      "popularityScore": 95.2,
      "rank": 1
    }
  ],
  "periodInfo": {
    "period": "month",
    "startDate": "2024-12-12",
    "endDate": "2025-01-12"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎯 个性化推荐

### 请求
```http
GET /api/v1/books/recommendations
Authorization: Bearer <user_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Recommendations retrieved successfully",
  "data": [
    {
      "id": 2,
      "title": "深入理解JavaScript",
      "authors": ["李明"],
      "coverImage": "https://example.com/covers/js-deep.jpg",
      "averageRating": 4.6,
      "reason": "基于你对《JavaScript高级程序设计》的评分",
      "recommendationScore": 0.89
    }
  ],
  "recommendationInfo": {
    "algorithm": "collaborative_filtering",
    "basedOn": ["借阅历史", "评分记录", "偏好分析"],
    "lastUpdated": "2025-01-12T08:00:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `BOOK_NOT_FOUND` | 404 | 图书不存在 | 检查图书ID |
| `ISBN_EXISTS` | 409 | ISBN已存在 | 使用不同的ISBN |
| `INSUFFICIENT_STOCK` | 400 | 库存不足 | 检查可用库存 |
| `INVALID_CATEGORY` | 400 | 无效的图书分类 | 使用有效的分类名称 |
| `BOOK_IN_USE` | 409 | 图书正在被借阅 | 等待归还后再删除 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 搜索图书
const searchBooks = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters
  });
  
  const response = await fetch(`/api/v1/books/search?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  
  throw new Error(data.message);
};

// 获取图书详情
const getBookDetails = async (bookId) => {
  const response = await fetchWithAuth(`/api/v1/books/${bookId}`);
  const data = await response.json();
  
  return data.success ? data.data : null;
};
```

### 小程序示例
```javascript
// 获取热门图书
const getPopularBooks = () => {
  uni.request({
    url: '/api/v1/books/popular',
    method: 'GET',
    success: (res) => {
      if (res.data.success) {
        this.popularBooks = res.data.data;
      }
    }
  });
};
```

---

📝 **注意**: 管理员功能需要相应的权限。图书搜索支持全文检索和多种筛选条件。