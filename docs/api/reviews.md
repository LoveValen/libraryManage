# ⭐ 书评API文档

书评模块提供完整的图书评价功能，用户可以对借阅过的图书进行评分和评论，同时支持书评的管理、审核和推荐功能。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/reviews` | 发表书评 | Authenticated |
| GET | `/reviews` | 获取书评列表 | Public |
| GET | `/reviews/:id` | 获取书评详情 | Public |
| PUT | `/reviews/:id` | 更新书评 | Owner |
| DELETE | `/reviews/:id` | 删除书评 | Owner/Admin |
| GET | `/reviews/book/:bookId` | 获取图书的书评 | Public |
| GET | `/reviews/my` | 获取我的书评 | Authenticated |
| POST | `/reviews/:id/like` | 点赞书评 | Authenticated |
| POST | `/reviews/:id/helpful` | 标记有用 | Authenticated |
| PUT | `/reviews/:id/moderate` | 审核书评 | Admin |
| GET | `/reviews/featured` | 获取精选书评 | Public |

## ✍️ 发表书评

### 请求
```http
POST /api/v1/reviews
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "bookId": 1,
  "rating": 5,
  "title": "JavaScript学习的绝佳指南",
  "content": "这本书对JavaScript的讲解非常全面和深入，从基础语法到高级特性都有详细的介绍。特别是闭包、原型链等概念的解释很清晰，代码示例也很实用。强烈推荐给所有想要深入学习JavaScript的开发者。",
  "isAnonymous": false,
  "isSpoiler": false
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| bookId | number | ✅ | 图书ID |
| rating | number | ✅ | 评分 (1-5星) |
| title | string | ❌ | 书评标题 |
| content | string | ✅ | 书评内容 |
| isAnonymous | boolean | ❌ | 是否匿名发表 |
| isSpoiler | boolean | ❌ | 是否包含剧透 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 201,
  "message": "Review created successfully",
  "data": {
    "id": 789,
    "userId": 123,
    "bookId": 1,
    "book": {
      "title": "JavaScript高级程序设计",
      "authors": ["马特·弗里斯比"],
      "coverImage": "https://example.com/covers/js-book.jpg"
    },
    "rating": 5,
    "title": "JavaScript学习的绝佳指南",
    "content": "这本书对JavaScript的讲解非常全面和深入...",
    "isAnonymous": false,
    "isSpoiler": false,
    "status": "approved",
    "likesCount": 0,
    "helpfulCount": 0,
    "pointsAwarded": 25,
    "createdAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📖 获取书评列表

### 请求
```http
GET /api/v1/reviews?page=1&limit=20&sortBy=createdAt&rating=5&status=approved
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| page | number | ❌ | 页码 | 1 |
| limit | number | ❌ | 每页数量 | 20 |
| bookId | number | ❌ | 图书ID筛选 | - |
| userId | number | ❌ | 用户ID筛选 | - |
| rating | number | ❌ | 评分筛选 | - |
| status | string | ❌ | 审核状态 | approved |
| sortBy | string | ❌ | 排序字段 | createdAt |
| sortOrder | string | ❌ | 排序方向 | desc |
| search | string | ❌ | 搜索关键词 | - |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Reviews retrieved successfully",
  "data": [
    {
      "id": 789,
      "userId": 123,
      "user": {
        "username": "reader001",
        "realName": "张三",
        "avatar": "https://example.com/avatars/123.jpg",
        "isAnonymous": false
      },
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "coverImage": "https://example.com/covers/js-book.jpg"
      },
      "rating": 5,
      "title": "JavaScript学习的绝佳指南",
      "content": "这本书对JavaScript的讲解非常全面和深入...",
      "isAnonymous": false,
      "isSpoiler": false,
      "status": "approved",
      "likesCount": 12,
      "helpfulCount": 8,
      "userLiked": false,
      "userMarkedHelpful": false,
      "createdAt": "2025-01-12T10:30:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "averageRating": 4.6,
    "totalReviews": 156,
    "ratingDistribution": {
      "5": 89,
      "4": 45,
      "3": 15,
      "2": 5,
      "1": 2
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📄 获取书评详情

### 请求
```http
GET /api/v1/reviews/789
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review details retrieved successfully",
  "data": {
    "id": 789,
    "userId": 123,
    "user": {
      "id": 123,
      "username": "reader001",
      "realName": "张三",
      "avatar": "https://example.com/avatars/123.jpg",
      "isAnonymous": false,
      "reviewCount": 14,
      "averageRating": 4.3
    },
    "bookId": 1,
    "book": {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "subtitle": "第4版",
      "authors": ["马特·弗里斯比"],
      "isbn": "9787115545381",
      "coverImage": "https://example.com/covers/js-book.jpg",
      "averageRating": 4.8,
      "reviewCount": 24
    },
    "rating": 5,
    "title": "JavaScript学习的绝佳指南",
    "content": "这本书对JavaScript的讲解非常全面和深入，从基础语法到高级特性都有详细的介绍。特别是闭包、原型链等概念的解释很清晰，代码示例也很实用。强烈推荐给所有想要深入学习JavaScript的开发者。",
    "isAnonymous": false,
    "isSpoiler": false,
    "status": "approved",
    "likesCount": 12,
    "helpfulCount": 8,
    "userLiked": false,
    "userMarkedHelpful": false,
    "pointsAwarded": 25,
    "moderatedBy": null,
    "moderatedAt": null,
    "moderationReason": null,
    "likedUsers": [
      {
        "userId": 456,
        "username": "bookworm",
        "avatar": "https://example.com/avatars/456.jpg"
      }
    ],
    "relatedReviews": [
      {
        "id": 790,
        "userId": 456,
        "username": "bookworm",
        "rating": 4,
        "title": "实用的技术参考书",
        "createdAt": "2025-01-10T14:20:00.000Z"
      }
    ],
    "createdAt": "2025-01-12T10:30:00.000Z",
    "updatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ✏️ 更新书评

### 请求
```http
PUT /api/v1/reviews/789
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "rating": 5,
  "title": "JavaScript学习的最佳选择",
  "content": "更新后的书评内容...",
  "isSpoiler": false
}
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review updated successfully",
  "data": {
    "id": 789,
    "rating": 5,
    "title": "JavaScript学习的最佳选择",
    "content": "更新后的书评内容...",
    "status": "pending",
    "updatedAt": "2025-01-12T10:35:00.000Z"
  },
  "timestamp": "2025-01-12T10:35:00.000Z"
}
```

## 🗑️ 删除书评

### 请求
```http
DELETE /api/v1/reviews/789
Authorization: Bearer <user_token_or_admin>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review deleted successfully",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📚 获取图书的书评

### 请求
```http
GET /api/v1/reviews/book/1?page=1&limit=10&sortBy=helpful&rating=5
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| limit | number | ❌ | 每页数量 |
| sortBy | string | ❌ | 排序字段 (createdAt/rating/helpful/likes) |
| rating | number | ❌ | 评分筛选 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Book reviews retrieved successfully",
  "data": {
    "book": {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "authors": ["马特·弗里斯比"],
      "coverImage": "https://example.com/covers/js-book.jpg",
      "averageRating": 4.8,
      "reviewCount": 24
    },
    "reviews": [
      {
        "id": 789,
        "userId": 123,
        "user": {
          "username": "reader001",
          "realName": "张三",
          "avatar": "https://example.com/avatars/123.jpg"
        },
        "rating": 5,
        "title": "JavaScript学习的绝佳指南",
        "content": "这本书对JavaScript的讲解非常全面...",
        "likesCount": 12,
        "helpfulCount": 8,
        "createdAt": "2025-01-12T10:30:00.000Z"
      }
    ],
    "statistics": {
      "averageRating": 4.8,
      "totalReviews": 24,
      "ratingDistribution": {
        "5": 15,
        "4": 6,
        "3": 2,
        "2": 1,
        "1": 0
      },
      "recommendationRate": 87.5
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📝 获取我的书评

### 请求
```http
GET /api/v1/reviews/my?page=1&limit=10&status=all
Authorization: Bearer <user_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | string | ❌ | 状态筛选 (all/approved/pending/rejected) |
| page | number | ❌ | 页码 |
| limit | number | ❌ | 每页数量 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "My reviews retrieved successfully",
  "data": [
    {
      "id": 789,
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "coverImage": "https://example.com/covers/js-book.jpg"
      },
      "rating": 5,
      "title": "JavaScript学习的绝佳指南",
      "content": "这本书对JavaScript的讲解非常全面...",
      "status": "approved",
      "likesCount": 12,
      "helpfulCount": 8,
      "pointsAwarded": 25,
      "canEdit": true,
      "createdAt": "2025-01-12T10:30:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  ],
  "summary": {
    "totalReviews": 14,
    "approvedReviews": 12,
    "pendingReviews": 2,
    "rejectedReviews": 0,
    "totalLikes": 145,
    "totalPointsEarned": 350,
    "averageRating": 4.3
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 👍 点赞书评

### 请求
```http
POST /api/v1/reviews/789/like
Authorization: Bearer <user_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review liked successfully",
  "data": {
    "reviewId": 789,
    "liked": true,
    "likesCount": 13,
    "likedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎯 标记有用

### 请求
```http
POST /api/v1/reviews/789/helpful
Authorization: Bearer <user_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review marked as helpful successfully",
  "data": {
    "reviewId": 789,
    "helpful": true,
    "helpfulCount": 9,
    "markedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🔍 审核书评

### 请求
```http
PUT /api/v1/reviews/789/moderate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "approve",
  "reason": "内容符合规范"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| action | string | ✅ | 审核操作 (approve/reject/hide) |
| reason | string | ❌ | 审核原因 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Review moderated successfully",
  "data": {
    "reviewId": 789,
    "previousStatus": "pending",
    "newStatus": "approved",
    "action": "approve",
    "reason": "内容符合规范",
    "moderatedBy": 1,
    "moderatedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ⭐ 获取精选书评

### 请求
```http
GET /api/v1/reviews/featured?limit=10&category=技术
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| limit | number | ❌ | 返回数量 |
| category | string | ❌ | 图书分类 |
| period | string | ❌ | 时间周期 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Featured reviews retrieved successfully",
  "data": [
    {
      "id": 789,
      "userId": 123,
      "user": {
        "username": "reader001",
        "realName": "张三",
        "avatar": "https://example.com/avatars/123.jpg"
      },
      "bookId": 1,
      "book": {
        "title": "JavaScript高级程序设计",
        "authors": ["马特·弗里斯比"],
        "coverImage": "https://example.com/covers/js-book.jpg"
      },
      "rating": 5,
      "title": "JavaScript学习的绝佳指南",
      "content": "这本书对JavaScript的讲解非常全面...",
      "likesCount": 12,
      "helpfulCount": 8,
      "featuredReason": "高质量书评，获得众多用户认可",
      "featuredAt": "2025-01-11T09:00:00.000Z",
      "createdAt": "2025-01-12T10:30:00.000Z"
    }
  ],
  "selectionCriteria": {
    "minRating": 4,
    "minLikes": 5,
    "minHelpful": 3,
    "contentQuality": "高质量内容",
    "diversityFactor": "涵盖不同分类"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `BOOK_NOT_BORROWED` | 403 | 未借阅过该图书 | 只能评价已借阅的图书 |
| `REVIEW_ALREADY_EXISTS` | 409 | 已评价过该图书 | 每本图书只能评价一次 |
| `INVALID_RATING` | 400 | 无效的评分 | 评分必须是1-5的整数 |
| `CONTENT_TOO_SHORT` | 400 | 评论内容过短 | 评论内容至少50字符 |
| `REVIEW_NOT_FOUND` | 404 | 书评不存在 | 检查书评ID |
| `CANNOT_EDIT_REVIEW` | 403 | 无法编辑书评 | 只能编辑自己的书评 |
| `REVIEW_UNDER_MODERATION` | 409 | 书评正在审核中 | 等待审核完成 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 发表书评
const createReview = async (bookId, rating, title, content) => {
  const response = await fetchWithAuth('/api/v1/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bookId,
      rating,
      title,
      content
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};

// 点赞书评
const likeReview = async (reviewId) => {
  const response = await fetchWithAuth(`/api/v1/reviews/${reviewId}/like`, {
    method: 'POST'
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};
```

### 小程序示例
```javascript
// 获取图书书评
const getBookReviews = (bookId) => {
  uni.request({
    url: `/api/v1/reviews/book/${bookId}`,
    method: 'GET',
    data: {
      page: 1,
      limit: 10,
      sortBy: 'helpful'
    },
    success: (res) => {
      if (res.data.success) {
        this.reviews = res.data.data.reviews;
        this.bookStats = res.data.data.statistics;
      }
    }
  });
};
```

---

📝 **注意**: 只能对已借阅过的图书发表书评，每本图书限评价一次。书评内容需要符合社区规范，可能需要审核。