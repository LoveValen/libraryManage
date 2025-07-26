# 🎮 积分API文档

积分系统是图书馆管理系统的游戏化核心，通过积分奖励机制鼓励用户积极参与图书馆活动，包括借阅图书、撰写书评、按时归还等行为。

## 📋 接口列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/points/my` | 获取我的积分信息 | Authenticated |
| GET | `/points/transactions` | 获取积分交易记录 | Authenticated |
| GET | `/points/leaderboard` | 获取积分排行榜 | Public |
| GET | `/points/badges` | 获取徽章系统 | Public |
| GET | `/points/my/badges` | 获取我的徽章 | Authenticated |
| POST | `/points/redeem` | 积分兑换 | Authenticated |
| GET | `/points/rewards` | 获取奖励商城 | Public |
| POST | `/points/admin/adjust` | 管理员调整积分 | Admin |
| GET | `/points/statistics` | 积分统计数据 | Admin |
| GET | `/points/rules` | 获取积分规则 | Public |

## 🎯 获取我的积分信息

### 请求
```http
GET /api/v1/points/my
Authorization: Bearer <user_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Points information retrieved successfully",
  "data": {
    "userId": 123,
    "balance": 650,
    "totalEarned": 1250,
    "totalSpent": 600,
    "level": "BOOKWORM",
    "levelName": "书虫",
    "nextLevel": "SCHOLAR",
    "nextLevelName": "学者",
    "nextLevelPoints": 700,
    "pointsToNextLevel": 50,
    "progressToNextLevel": 92.86,
    "badgeCount": 8,
    "rankPosition": 42,
    "totalUsers": 1245,
    "rankPercentile": 96.6,
    "pointsBreakdown": {
      "borrowPoints": 480,
      "reviewPoints": 350,
      "bonusPoints": 200,
      "penaltyPoints": 120,
      "redeemPoints": 260
    },
    "recentTransactions": [
      {
        "id": 1001,
        "pointsChange": 25,
        "transactionType": "WRITE_REVIEW",
        "description": "评价图书《JavaScript高级程序设计》",
        "createdAt": "2025-01-10T16:45:00.000Z"
      },
      {
        "id": 1000,
        "pointsChange": 10,
        "transactionType": "BORROW_BOOK",
        "description": "借阅图书《Vue.js实战》",
        "createdAt": "2025-01-08T10:30:00.000Z"
      }
    ],
    "achievements": [
      {
        "badgeId": 1,
        "name": "阅读新手",
        "description": "首次借阅图书",
        "icon": "📚",
        "earnedAt": "2024-11-15T10:30:00.000Z"
      },
      {
        "badgeId": 5,
        "name": "书评家",
        "description": "撰写10篇书评",
        "icon": "✍️",
        "earnedAt": "2024-12-20T14:20:00.000Z"
      }
    ],
    "levelPrivileges": [
      "借阅期限延长至45天",
      "优先预约热门图书",
      "专属书评置顶权限"
    ],
    "lastTransactionAt": "2025-01-10T16:45:00.000Z",
    "lastRankUpdate": "2025-01-12T06:00:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📜 获取积分交易记录

### 请求
```http
GET /api/v1/points/transactions?page=1&limit=20&type=all&startDate=2024-12-01
Authorization: Bearer <user_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| page | number | ❌ | 页码 | 1 |
| limit | number | ❌ | 每页数量 | 20 |
| type | string | ❌ | 交易类型过滤 | all |
| startDate | string | ❌ | 开始日期 | - |
| endDate | string | ❌ | 结束日期 | - |
| pointsChange | string | ❌ | 积分变化 (positive/negative) | - |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Points transactions retrieved successfully",
  "data": [
    {
      "id": 1001,
      "pointsChange": 25,
      "currentBalance": 650,
      "previousBalance": 625,
      "transactionType": "WRITE_REVIEW",
      "description": "评价图书《JavaScript高级程序设计》",
      "relatedEntityType": "review",
      "relatedEntityId": 789,
      "relatedEntity": {
        "bookTitle": "JavaScript高级程序设计",
        "rating": 5
      },
      "status": "completed",
      "metadata": {
        "bookId": 1,
        "reviewRating": 5,
        "reviewLength": 256
      },
      "createdAt": "2025-01-10T16:45:00.000Z"
    },
    {
      "id": 1000,
      "pointsChange": 10,
      "currentBalance": 625,
      "previousBalance": 615,
      "transactionType": "BORROW_BOOK",
      "description": "借阅图书《Vue.js实战》",
      "relatedEntityType": "borrow",
      "relatedEntityId": 456,
      "relatedEntity": {
        "bookTitle": "Vue.js实战",
        "borrowDate": "2025-01-08T10:30:00.000Z"
      },
      "status": "completed",
      "createdAt": "2025-01-08T10:30:00.000Z"
    },
    {
      "id": 999,
      "pointsChange": -50,
      "currentBalance": 615,
      "previousBalance": 665,
      "transactionType": "REDEEM_REWARD",
      "description": "兑换优惠券：图书购买9折",
      "relatedEntityType": "redemption",
      "relatedEntityId": 123,
      "status": "completed",
      "createdAt": "2025-01-05T15:20:00.000Z"
    }
  ],
  "summary": {
    "totalTransactions": 45,
    "totalEarned": 1250,
    "totalSpent": 600,
    "currentBalance": 650,
    "averageTransaction": 14.4
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🏆 获取积分排行榜

### 请求
```http
GET /api/v1/points/leaderboard?period=month&limit=100&category=all
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|-------|
| period | string | ❌ | 排行周期 (week/month/year/all) | month |
| limit | number | ❌ | 返回数量 | 50 |
| category | string | ❌ | 排行类型 (balance/earned/level) | balance |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Leaderboard retrieved successfully",
  "data": [
    {
      "rank": 1,
      "userId": 456,
      "username": "bookmaster",
      "realName": "王五",
      "avatar": "https://example.com/avatars/456.jpg",
      "balance": 2850,
      "level": "GRANDMASTER",
      "levelName": "宗师",
      "badgeCount": 15,
      "totalBorrows": 156,
      "totalReviews": 89,
      "isAnonymous": false
    },
    {
      "rank": 2,
      "userId": 789,
      "username": "reader_pro",
      "realName": "赵六",
      "avatar": "https://example.com/avatars/789.jpg",
      "balance": 2340,
      "level": "MASTER",
      "levelName": "大师",
      "badgeCount": 12,
      "totalBorrows": 134,
      "totalReviews": 67,
      "isAnonymous": false
    },
    {
      "rank": 42,
      "userId": 123,
      "username": "reader001",
      "realName": "张三",
      "avatar": "https://example.com/avatars/123.jpg",
      "balance": 650,
      "level": "BOOKWORM",
      "levelName": "书虫",
      "badgeCount": 8,
      "totalBorrows": 28,
      "totalReviews": 14,
      "isCurrentUser": true,
      "isAnonymous": false
    }
  ],
  "leaderboardInfo": {
    "period": "month",
    "category": "balance",
    "startDate": "2024-12-12",
    "endDate": "2025-01-12",
    "totalParticipants": 1245,
    "lastUpdated": "2025-01-12T06:00:00.000Z"
  },
  "currentUser": {
    "rank": 42,
    "balance": 650,
    "percentile": 96.6
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🏅 获取徽章系统

### 请求
```http
GET /api/v1/points/badges?category=all
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| category | string | ❌ | 徽章分类 (reading/review/activity/special) |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Badges retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "阅读新手",
      "description": "首次借阅图书",
      "icon": "📚",
      "category": "reading",
      "rarity": "common",
      "pointsReward": 50,
      "condition": {
        "type": "borrow_count",
        "target": 1
      },
      "earnedCount": 1200,
      "totalUsers": 1245,
      "earnRate": 96.4
    },
    {
      "id": 2,
      "name": "阅读达人",
      "description": "累计借阅50本图书",
      "icon": "📖",
      "category": "reading",
      "rarity": "uncommon",
      "pointsReward": 100,
      "condition": {
        "type": "borrow_count",
        "target": 50
      },
      "earnedCount": 234,
      "totalUsers": 1245,
      "earnRate": 18.8
    },
    {
      "id": 15,
      "name": "书评家",
      "description": "撰写10篇书评",
      "icon": "✍️",
      "category": "review",
      "rarity": "rare",
      "pointsReward": 200,
      "condition": {
        "type": "review_count",
        "target": 10
      },
      "earnedCount": 89,
      "totalUsers": 1245,
      "earnRate": 7.1
    },
    {
      "id": 25,
      "name": "守时模范",
      "description": "连续10次按时归还图书",
      "icon": "⏰",
      "category": "activity",
      "rarity": "epic",
      "pointsReward": 300,
      "condition": {
        "type": "consecutive_on_time",
        "target": 10
      },
      "earnedCount": 45,
      "totalUsers": 1245,
      "earnRate": 3.6
    }
  ],
  "categories": [
    {
      "name": "reading",
      "displayName": "阅读类",
      "badgeCount": 8,
      "icon": "📚"
    },
    {
      "name": "review",
      "displayName": "书评类",
      "badgeCount": 5,
      "icon": "✍️"
    },
    {
      "name": "activity",
      "displayName": "活动类",
      "badgeCount": 6,
      "icon": "🎯"
    },
    {
      "name": "special",
      "displayName": "特殊类",
      "badgeCount": 3,
      "icon": "⭐"
    }
  ],
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎖️ 获取我的徽章

### 请求
```http
GET /api/v1/points/my/badges?earned=true
Authorization: Bearer <user_token>
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| earned | boolean | ❌ | 只显示已获得的徽章 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "My badges retrieved successfully",
  "data": {
    "earnedBadges": [
      {
        "id": 1,
        "name": "阅读新手",
        "description": "首次借阅图书",
        "icon": "📚",
        "category": "reading",
        "rarity": "common",
        "pointsReward": 50,
        "earnedAt": "2024-11-15T10:30:00.000Z",
        "progress": {
          "current": 1,
          "target": 1,
          "percentage": 100
        }
      },
      {
        "id": 15,
        "name": "书评家",
        "description": "撰写10篇书评",
        "icon": "✍️",
        "category": "review",
        "rarity": "rare",
        "pointsReward": 200,
        "earnedAt": "2024-12-20T14:20:00.000Z",
        "progress": {
          "current": 14,
          "target": 10,
          "percentage": 100
        }
      }
    ],
    "inProgressBadges": [
      {
        "id": 2,
        "name": "阅读达人",
        "description": "累计借阅50本图书",
        "icon": "📖",
        "category": "reading",
        "rarity": "uncommon",
        "pointsReward": 100,
        "progress": {
          "current": 28,
          "target": 50,
          "percentage": 56
        },
        "estimatedCompletion": "2025-03-15T00:00:00.000Z"
      },
      {
        "id": 25,
        "name": "守时模范",
        "description": "连续10次按时归还图书",
        "icon": "⏰",
        "category": "activity",
        "rarity": "epic",
        "pointsReward": 300,
        "progress": {
          "current": 7,
          "target": 10,
          "percentage": 70
        }
      }
    ],
    "stats": {
      "totalBadges": 22,
      "earnedBadges": 8,
      "completionRate": 36.4,
      "totalPointsFromBadges": 850,
      "rareEarned": 2,
      "epicEarned": 1,
      "legendaryEarned": 0
    }
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🛒 积分兑换

### 请求
```http
POST /api/v1/points/redeem
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "rewardId": 5,
  "quantity": 1,
  "deliveryInfo": {
    "address": "北京市朝阳区图书馆路123号",
    "phone": "13800138000",
    "recipient": "张三"
  }
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| rewardId | number | ✅ | 奖励ID |
| quantity | number | ❌ | 兑换数量 (默认1) |
| deliveryInfo | object | ❌ | 配送信息 (实物奖励需要) |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 201,
  "message": "Reward redeemed successfully",
  "data": {
    "redemptionId": 789,
    "rewardId": 5,
    "reward": {
      "name": "图书购买9折优惠券",
      "description": "适用于所有实体图书购买，有效期30天",
      "type": "voucher",
      "pointsCost": 50
    },
    "quantity": 1,
    "totalPointsCost": 50,
    "previousBalance": 650,
    "currentBalance": 600,
    "status": "completed",
    "redemptionCode": "LIB-9OFF-2025012",
    "expiresAt": "2025-02-11T23:59:59.000Z",
    "deliveryInfo": null,
    "estimatedDelivery": null,
    "redemptionDate": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎁 获取奖励商城

### 请求
```http
GET /api/v1/points/rewards?category=all&available=true
```

### 查询参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| category | string | ❌ | 奖励分类 |
| available | boolean | ❌ | 只显示可兑换的奖励 |
| maxPoints | number | ❌ | 最大积分限制 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Rewards retrieved successfully",
  "data": [
    {
      "id": 5,
      "name": "图书购买9折优惠券",
      "description": "适用于所有实体图书购买，有效期30天",
      "image": "https://example.com/rewards/voucher-9off.jpg",
      "type": "voucher",
      "category": "discount",
      "pointsCost": 50,
      "originalValue": 10.00,
      "stock": 100,
      "soldCount": 234,
      "isAvailable": true,
      "validityDays": 30,
      "terms": [
        "仅限实体图书购买使用",
        "不可与其他优惠叠加",
        "单笔订单限用一张"
      ]
    },
    {
      "id": 12,
      "name": "精美书签套装",
      "description": "精装书签5枚套装，精美包装",
      "image": "https://example.com/rewards/bookmark-set.jpg",
      "type": "physical",
      "category": "merchandise",
      "pointsCost": 150,
      "originalValue": 25.00,
      "stock": 50,
      "soldCount": 45,
      "isAvailable": true,
      "shippingRequired": true,
      "estimatedDelivery": "7-15个工作日"
    },
    {
      "id": 18,
      "name": "VIP借阅特权（1个月）",
      "description": "借阅期限延长至60天，优先预约权限",
      "image": "https://example.com/rewards/vip-privilege.jpg",
      "type": "privilege",
      "category": "service",
      "pointsCost": 200,
      "isAvailable": true,
      "validityDays": 30,
      "benefits": [
        "借阅期限延长至60天",
        "最多可借阅10本图书",
        "热门图书优先预约",
        "专属客服支持"
      ]
    }
  ],
  "categories": [
    {
      "name": "discount",
      "displayName": "优惠券",
      "rewardCount": 8
    },
    {
      "name": "merchandise",
      "displayName": "实物商品",
      "rewardCount": 12
    },
    {
      "name": "service",
      "displayName": "服务特权",
      "rewardCount": 5
    }
  ],
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## ⚙️ 管理员调整积分

### 请求
```http
POST /api/v1/points/admin/adjust
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": 123,
  "pointsChange": 100,
  "reason": "参与图书馆活动奖励",
  "transactionType": "ADMIN_ADJUSTMENT"
}
```

### 参数说明
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| userId | number | ✅ | 用户ID |
| pointsChange | number | ✅ | 积分变化（正数增加，负数减少） |
| reason | string | ✅ | 调整原因 |
| transactionType | string | ❌ | 交易类型 |

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Points adjusted successfully",
  "data": {
    "userId": 123,
    "username": "reader001",
    "pointsChange": 100,
    "previousBalance": 650,
    "currentBalance": 750,
    "reason": "参与图书馆活动奖励",
    "processedBy": 1,
    "transactionId": 1002,
    "adjustedAt": "2025-01-12T10:30:00.000Z"
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📊 积分统计数据

### 请求
```http
GET /api/v1/points/statistics?period=month
Authorization: Bearer <admin_token>
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Points statistics retrieved successfully",
  "data": {
    "overview": {
      "totalUsers": 1245,
      "activeUsers": 890,
      "totalPointsIssued": 125000,
      "totalPointsRedeemed": 45000,
      "totalTransactions": 5678,
      "averageBalance": 285.4
    },
    "transactionStats": {
      "borrowRewards": {
        "count": 2340,
        "points": 23400
      },
      "reviewRewards": {
        "count": 567,
        "points": 14175
      },
      "bonusRewards": {
        "count": 123,
        "points": 6150
      },
      "redemptions": {
        "count": 456,
        "points": 45000
      }
    },
    "levelDistribution": {
      "NEWCOMER": 450,
      "READER": 520,
      "BOOKWORM": 180,
      "SCHOLAR": 75,
      "EXPERT": 15,
      "MASTER": 4,
      "GRANDMASTER": 1
    },
    "topEarners": [
      {
        "userId": 456,
        "username": "bookmaster",
        "totalEarned": 3450,
        "level": "GRANDMASTER"
      }
    ],
    "popularRewards": [
      {
        "rewardId": 5,
        "name": "图书购买9折优惠券",
        "redemptionCount": 234,
        "pointsSpent": 11700
      }
    ],
    "trend": [
      {
        "date": "2025-01-01",
        "pointsIssued": 1250,
        "pointsRedeemed": 450
      }
    ]
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 📜 获取积分规则

### 请求
```http
GET /api/v1/points/rules
```

### 响应
```json
{
  "success": true,
  "status": "success",
  "statusCode": 200,
  "message": "Points rules retrieved successfully",
  "data": {
    "earningRules": [
      {
        "action": "BORROW_BOOK",
        "points": 10,
        "description": "借阅图书",
        "limit": "每天最多50分",
        "conditions": ["账户状态正常", "图书可借阅"]
      },
      {
        "action": "RETURN_ON_TIME",
        "points": 5,
        "description": "按时归还图书",
        "limit": "无限制",
        "conditions": ["在到期日前归还"]
      },
      {
        "action": "WRITE_REVIEW",
        "points": 25,
        "description": "撰写书评",
        "limit": "每本书限一次",
        "conditions": ["评论字数≥50字", "评分1-5星"]
      },
      {
        "action": "COMPLETE_TUTORIAL",
        "points": 50,
        "description": "完成新手引导",
        "limit": "仅一次",
        "conditions": ["新注册用户"]
      }
    ],
    "penaltyRules": [
      {
        "action": "RETURN_LATE",
        "points": -10,
        "description": "逾期归还图书",
        "calculation": "每逾期1天扣除10分",
        "maxPenalty": -100
      }
    ],
    "levelSystem": {
      "levels": [
        {
          "code": "NEWCOMER",
          "name": "新手读者",
          "pointsRequired": 0,
          "pointsToNext": 100,
          "privileges": ["基础借阅权限"]
        },
        {
          "code": "READER",
          "name": "普通读者",
          "pointsRequired": 100,
          "pointsToNext": 200,
          "privileges": ["延长借阅期限至45天"]
        },
        {
          "code": "BOOKWORM",
          "name": "书虫",
          "pointsRequired": 300,
          "pointsToNext": 400,
          "privileges": ["优先预约热门图书", "专属书评置顶"]
        }
      ]
    },
    "badgeSystem": {
      "totalBadges": 22,
      "categories": 4,
      "rarityLevels": ["common", "uncommon", "rare", "epic", "legendary"]
    },
    "generalRules": [
      "积分有效期为2年，过期自动清零",
      "违规行为可能导致积分扣除或账户限制",
      "积分不可转让给其他用户",
      "系统故障导致的积分异常会及时修正"
    ]
  },
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|---------|-----------|------|----------|
| `INSUFFICIENT_POINTS` | 400 | 积分不足 | 确认积分余额或选择其他奖励 |
| `REWARD_NOT_AVAILABLE` | 409 | 奖励不可兑换 | 选择其他可用奖励 |
| `REWARD_OUT_OF_STOCK` | 409 | 奖励库存不足 | 等待补货或选择其他奖励 |
| `INVALID_QUANTITY` | 400 | 无效的兑换数量 | 检查兑换数量限制 |
| `REDEMPTION_LIMIT_EXCEEDED` | 409 | 超出兑换限制 | 查看兑换规则限制 |
| `DELIVERY_INFO_REQUIRED` | 400 | 需要配送信息 | 提供完整的配送信息 |

## 💡 使用示例

### JavaScript/Node.js
```javascript
// 获取我的积分信息
const getMyPoints = async () => {
  const response = await fetchWithAuth('/api/v1/points/my');
  const data = await response.json();
  
  return data.success ? data.data : null;
};

// 积分兑换
const redeemReward = async (rewardId, quantity = 1) => {
  const response = await fetchWithAuth('/api/v1/points/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rewardId,
      quantity
    })
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
// 获取积分排行榜
const getLeaderboard = () => {
  uni.request({
    url: '/api/v1/points/leaderboard',
    method: 'GET',
    data: {
      period: 'month',
      limit: 50
    },
    success: (res) => {
      if (res.data.success) {
        this.leaderboard = res.data.data;
        this.myRank = res.data.currentUser;
      }
    }
  });
};
```

---

📝 **注意**: 积分系统自动处理大部分积分奖励，管理员调整功能仅用于特殊情况。积分有效期为2年，请及时使用。