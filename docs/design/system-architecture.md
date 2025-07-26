# 🏗️ 系统架构设计

现代化图书管理系统的企业级系统架构设计文档，采用微服务架构和云原生技术栈。

## 📋 目录

- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [系统组件](#系统组件)
- [数据架构](#数据架构)
- [安全架构](#安全架构)
- [部署架构](#部署架构)
- [扩展性设计](#扩展性设计)
- [性能设计](#性能设计)

## 🏛️ 架构概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend Layer)                    │
├─────────────────────────────────────────────────────────────────┤
│  Web App    │  Mobile App  │  Admin Panel │  API Docs  │  PWA  │
│  (React)    │  (React Native) │ (Vue.js)   │ (Swagger)  │       │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS/WSS
┌─────────────────┴───────────────────────────────────────────────┐
│                      API 网关层 (API Gateway)                   │
├─────────────────────────────────────────────────────────────────┤
│ • 路由和负载均衡  • 认证和授权  • 限流和熔断  • 监控和日志     │
│ • API版本管理     • 缓存策略    • 数据转换    • 安全防护       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────────┐
│                    业务服务层 (Business Services)                │
├─────────────────────────────────────────────────────────────────┤
│ User Service │ Book Service │ Borrow Service │ Notification    │
│              │              │                 │ Service         │
│ ─────────────┼──────────────┼─────────────────┼─────────────── │
│ Auth Service │ Search       │ Analytics       │ File           │
│              │ Service      │ Service         │ Service         │
│ ─────────────┼──────────────┼─────────────────┼─────────────── │
│ Recommendation│ Admin       │ Audit          │ Integration     │
│ Service       │ Service     │ Service        │ Service         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────────┐
│                   数据存储层 (Data Storage Layer)                │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL  │ Redis      │ Elasticsearch │ MinIO/S3 │ InfluxDB │
│ (主数据库)    │ (缓存)      │ (搜索引擎)      │ (文件存储) │ (时序数据) │
└─────────────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **微服务架构** - 服务拆分、独立部署、技术栈多样化
2. **云原生设计** - 容器化、自动扩缩容、服务发现
3. **高可用性** - 多副本、故障转移、优雅降级
4. **可观测性** - 全链路监控、日志聚合、性能追踪
5. **安全优先** - 零信任网络、数据加密、权限最小化

## 🛠️ 技术栈

### 前端技术栈
```typescript
// 主要框架和库
Frontend Framework: React 18 + TypeScript
State Management: Redux Toolkit + RTK Query
UI Framework: Ant Design + Tailwind CSS
Build Tool: Vite
Testing: Jest + React Testing Library

// 移动端
Mobile: React Native + Expo
State: Redux Toolkit
Navigation: React Navigation

// 管理端
Admin Panel: Vue.js 3 + TypeScript
UI: Element Plus
Build: Vite
```

### 后端技术栈
```typescript
// 核心框架
Runtime: Node.js 18+
Framework: Express.js + TypeScript
ORM: Prisma + PostgreSQL
Authentication: JWT + Passport.js
Validation: Joi + express-validator

// 实时通信
WebSocket: Socket.IO
Message Queue: Redis Pub/Sub

// 搜索和分析
Search Engine: Elasticsearch
Analytics: Custom Analytics Service
Recommendation: TensorFlow.js
```

### 基础设施技术栈
```yaml
# 容器化和编排
Containerization: Docker + Docker Compose
Orchestration: Kubernetes (生产环境)
Service Mesh: Istio (可选)

# 数据存储
Primary Database: PostgreSQL 15
Cache: Redis 7
Search: Elasticsearch 8
File Storage: MinIO (自部署) / AWS S3
Time Series: InfluxDB

# 监控和日志
Monitoring: Prometheus + Grafana
Logging: ELK Stack (Elasticsearch + Logstash + Kibana)
Tracing: Jaeger
APM: New Relic / DataDog (可选)

# CI/CD
Version Control: Git + GitHub/GitLab
CI/CD: GitHub Actions / GitLab CI
Registry: Docker Hub / GitHub Container Registry
```

## 🔧 系统组件

### 核心业务服务

#### 1. 用户服务 (User Service)
```typescript
interface UserService {
  // 用户管理
  createUser(userData: CreateUserDto): Promise<User>
  updateUser(userId: string, updateData: UpdateUserDto): Promise<User>
  deleteUser(userId: string): Promise<void>
  getUserById(userId: string): Promise<User>
  getUserByEmail(email: string): Promise<User>
  
  // 认证和授权
  authenticateUser(credentials: LoginDto): Promise<AuthResult>
  refreshToken(refreshToken: string): Promise<AuthResult>
  validateToken(token: string): Promise<User>
  
  // 用户状态管理
  activateUser(userId: string): Promise<void>
  suspendUser(userId: string, reason: string): Promise<void>
  updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void>
}

// 数据模型
interface User {
  id: string
  username: string
  email: string
  realName: string
  role: UserRole
  status: UserStatus
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}
```

#### 2. 图书服务 (Book Service)
```typescript
interface BookService {
  // 图书管理
  createBook(bookData: CreateBookDto): Promise<Book>
  updateBook(bookId: string, updateData: UpdateBookDto): Promise<Book>
  deleteBook(bookId: string): Promise<void>
  getBookById(bookId: string): Promise<Book>
  searchBooks(query: SearchBooksDto): Promise<SearchResult<Book>>
  
  // 库存管理
  updateStock(bookId: string, quantity: number): Promise<void>
  reserveBook(bookId: string, userId: string): Promise<Reservation>
  cancelReservation(reservationId: string): Promise<void>
  
  // 分类管理
  createCategory(categoryData: CreateCategoryDto): Promise<Category>
  updateCategory(categoryId: string, updateData: UpdateCategoryDto): Promise<Category>
  getCategories(): Promise<Category[]>
}

// 数据模型
interface Book {
  id: string
  title: string
  authors: string[]
  isbn: string
  publisher: string
  publicationYear: number
  category: Category
  description: string
  coverImage: string
  totalStock: number
  availableStock: number
  borrowCount: number
  averageRating: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

#### 3. 借阅服务 (Borrow Service)
```typescript
interface BorrowService {
  // 借阅管理
  borrowBook(borrowData: CreateBorrowDto): Promise<Borrow>
  returnBook(borrowId: string, returnData: ReturnBookDto): Promise<Borrow>
  renewBook(borrowId: string): Promise<Borrow>
  getBorrowById(borrowId: string): Promise<Borrow>
  getUserBorrows(userId: string, status?: BorrowStatus): Promise<Borrow[]>
  
  // 逾期管理
  getOverdueBooks(): Promise<Borrow[]>
  calculateFine(borrowId: string): Promise<number>
  payFine(borrowId: string, amount: number): Promise<Payment>
  
  // 统计分析
  getBorrowStatistics(params: StatisticsParams): Promise<BorrowStatistics>
}

// 数据模型
interface Borrow {
  id: string
  userId: string
  bookId: string
  borrowDate: Date
  dueDate: Date
  returnDate?: Date
  status: BorrowStatus
  renewCount: number
  fineAmount: number
  finePaid: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 支撑服务

#### 1. 通知服务 (Notification Service)
```typescript
interface NotificationService {
  // 通知发送
  sendNotification(notification: CreateNotificationDto): Promise<Notification>
  sendBulkNotification(notifications: CreateNotificationDto[]): Promise<Notification[]>
  
  // 通知管理
  getNotifications(userId: string, params: GetNotificationsParams): Promise<Notification[]>
  markAsRead(notificationId: string): Promise<void>
  deleteNotification(notificationId: string): Promise<void>
  
  // 通知设置
  updateNotificationSettings(userId: string, settings: NotificationSettings): Promise<void>
  getNotificationSettings(userId: string): Promise<NotificationSettings>
  
  // 模板管理
  createTemplate(templateData: CreateTemplateDto): Promise<NotificationTemplate>
  updateTemplate(templateId: string, updateData: UpdateTemplateDto): Promise<NotificationTemplate>
}

// 数据模型
interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  channels: NotificationChannel[]
  status: NotificationStatus
  readAt?: Date
  createdAt: Date
}
```

#### 2. 搜索服务 (Search Service)
```typescript
interface SearchService {
  // 搜索功能
  searchBooks(query: SearchQuery): Promise<SearchResult<Book>>
  searchUsers(query: SearchQuery): Promise<SearchResult<User>>
  searchGlobal(query: string): Promise<GlobalSearchResult>
  
  // 索引管理
  indexBook(book: Book): Promise<void>
  updateBookIndex(bookId: string, book: Partial<Book>): Promise<void>
  removeFromIndex(bookId: string): Promise<void>
  rebuildIndex(): Promise<void>
  
  // 搜索分析
  getSearchAnalytics(params: SearchAnalyticsParams): Promise<SearchAnalytics>
  getPopularSearches(): Promise<PopularSearch[]>
  
  // 智能建议
  getSuggestions(query: string): Promise<SearchSuggestion[]>
  getAutoComplete(query: string): Promise<string[]>
}

// 搜索配置
interface SearchConfiguration {
  elasticsearch: {
    hosts: string[]
    indexPrefix: string
    shards: number
    replicas: number
  }
  features: {
    fuzzySearch: boolean
    synonyms: boolean
    autocomplete: boolean
    analytics: boolean
  }
}
```

## 💾 数据架构

### 数据库设计

#### 主数据库 (PostgreSQL)
```sql
-- 核心表结构
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 图书表
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    authors TEXT[] NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(200),
    publication_year INTEGER,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    cover_image_url VARCHAR(500),
    total_stock INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER NOT NULL DEFAULT 0,
    borrow_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 借阅记录表
CREATE TABLE borrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    book_id UUID NOT NULL REFERENCES books(id),
    borrow_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP,
    status borrow_status NOT NULL DEFAULT 'active',
    renew_count INTEGER DEFAULT 0,
    fine_amount DECIMAL(10,2) DEFAULT 0,
    fine_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引策略
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_title_gin ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_borrows_user_status ON borrows(user_id, status);
CREATE INDEX idx_borrows_due_date ON borrows(due_date) WHERE status = 'active';
```

#### 缓存策略 (Redis)
```typescript
// 缓存键命名规范
interface CacheKeys {
  // 用户缓存
  user: `user:${userId}`
  userSession: `session:${sessionId}`
  userPermissions: `permissions:${userId}`
  
  // 图书缓存
  book: `book:${bookId}`
  bookList: `books:list:${page}:${limit}:${filters}`
  bookStock: `book:stock:${bookId}`
  popularBooks: `books:popular:${timeRange}`
  
  // 搜索缓存
  searchResult: `search:${hash(query)}`
  searchSuggestions: `suggestions:${prefix}`
  
  // 统计缓存
  statistics: `stats:${type}:${date}`
  dashboardData: `dashboard:${userId}:${date}`
}

// 缓存配置
interface CacheConfiguration {
  ttl: {
    user: 3600,           // 1小时
    book: 1800,           // 30分钟
    search: 600,          // 10分钟
    statistics: 86400     // 24小时
  },
  strategies: {
    writeThrough: boolean,
    writeBack: boolean,
    cacheAside: boolean
  }
}
```

#### 搜索引擎 (Elasticsearch)
```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "authors": {
        "type": "text",
        "analyzer": "standard"
      },
      "description": {
        "type": "text",
        "analyzer": "standard"
      },
      "category": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "isbn": {
        "type": "keyword"
      },
      "publication_year": {
        "type": "integer"
      },
      "rating": {
        "type": "float"
      },
      "borrow_count": {
        "type": "integer"
      },
      "available": {
        "type": "boolean"
      },
      "created_at": {
        "type": "date"
      }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "custom_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "stemmer"]
        }
      }
    }
  }
}
```

## 🔒 安全架构

### 认证和授权

#### JWT Token 策略
```typescript
interface JWTStrategy {
  // Token 配置
  accessToken: {
    secret: string
    expiresIn: '15m'
    algorithm: 'RS256'
  }
  refreshToken: {
    secret: string
    expiresIn: '7d'
    algorithm: 'RS256'
  }
  
  // Token 载荷
  payload: {
    sub: string,        // 用户ID
    username: string,
    role: string,
    permissions: string[],
    iat: number,
    exp: number
  }
}

// 权限控制
interface PermissionSystem {
  roles: {
    admin: {
      permissions: ['*']
    },
    librarian: {
      permissions: [
        'books:read', 'books:write', 'books:manage',
        'users:read', 'borrows:read', 'borrows:manage'
      ]
    },
    user: {
      permissions: [
        'books:read', 'borrows:own',
        'profile:read', 'profile:write'
      ]
    }
  }
}
```

#### API 安全
```typescript
// 安全中间件栈
interface SecurityMiddleware {
  // 速率限制
  rateLimiting: {
    windowMs: 15 * 60 * 1000,  // 15分钟
    max: 100,                   // 最大请求数
    standardHeaders: true,
    legacyHeaders: false
  }
  
  // CORS 配置
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
    optionsSuccessStatus: 200
  }
  
  // 安全头
  helmet: {
    contentSecurityPolicy: true,
    hsts: true,
    noSniff: true,
    frameguard: true,
    xssFilter: true
  }
  
  // 输入验证
  validation: {
    sanitizeInput: true,
    validateSchema: true,
    maxRequestSize: '10mb'
  }
}
```

## 🚀 部署架构

### 容器化部署

#### Docker 配置
```dockerfile
# 多阶段构建 - 生产镜像
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# 安全配置
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
```

#### Kubernetes 部署
```yaml
# 部署配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: library-api
  labels:
    app: library-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: library-api
  template:
    metadata:
      labels:
        app: library-api
    spec:
      containers:
      - name: api
        image: library/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 云部署方案

#### AWS 部署架构
```yaml
# 基础设施即代码 (Terraform)
provider "aws" {
  region = "us-west-2"
}

# EKS 集群
resource "aws_eks_cluster" "library_cluster" {
  name     = "library-management"
  role_arn = aws_iam_role.cluster_role.arn
  version  = "1.24"

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
  }
}

# RDS 数据库
resource "aws_db_instance" "postgres" {
  identifier     = "library-postgres"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp2"
  storage_encrypted    = true
  
  db_name  = "library"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "library-redis"
  description               = "Redis cluster for library management"
  
  node_type                 = "cache.t3.micro"
  port                      = 6379
  parameter_group_name      = "default.redis7"
  
  num_cache_clusters        = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}
```

## 📈 扩展性设计

### 水平扩展策略

#### 微服务扩展
```typescript
// 服务自动扩缩容配置
interface AutoScalingConfig {
  services: {
    userService: {
      minReplicas: 2,
      maxReplicas: 10,
      targetCPUUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpPolicy: {
        periodSeconds: 60,
        stabilizationWindowSeconds: 300
      },
      scaleDownPolicy: {
        periodSeconds: 60,
        stabilizationWindowSeconds: 900
      }
    },
    bookService: {
      minReplicas: 3,
      maxReplicas: 15,
      targetCPUUtilization: 70,
      customMetrics: [
        {
          name: 'search_requests_per_second',
          targetValue: 100
        }
      ]
    }
  }
}
```

#### 数据库扩展
```typescript
// 数据库扩展策略
interface DatabaseScaling {
  // 读写分离
  readReplicas: {
    count: 3,
    regions: ['us-west-1', 'us-west-2', 'us-east-1'],
    loadBalancing: 'round-robin'
  },
  
  // 分片策略
  sharding: {
    strategy: 'hash',
    shardKey: 'user_id',
    shards: 8,
    replicationFactor: 3
  },
  
  // 缓存层扩展
  caching: {
    l1Cache: 'application-level',
    l2Cache: 'redis-cluster',
    cdnCache: 'cloudflare',
    ttlStrategy: 'adaptive'
  }
}
```

### 性能优化

#### 性能监控指标
```typescript
interface PerformanceMetrics {
  // API 性能
  api: {
    responseTime: {
      p50: 100,    // 毫秒
      p95: 500,
      p99: 1000
    },
    throughput: {
      target: 1000,  // RPS
      max: 5000
    },
    errorRate: {
      target: 0.1,   // 百分比
      alert: 1.0
    }
  },
  
  // 数据库性能
  database: {
    connectionPool: {
      size: 20,
      maxWait: 5000
    },
    queryTime: {
      slow: 1000,    // 毫秒
      alert: 2000
    },
    cacheHitRate: {
      target: 90,    // 百分比
      alert: 80
    }
  },
  
  // 系统资源
  system: {
    cpu: {
      target: 70,    // 百分比
      alert: 85
    },
    memory: {
      target: 80,
      alert: 90
    },
    disk: {
      target: 80,
      alert: 90
    }
  }
}
```

## 🔗 相关文档

- [数据库设计文档](./database-design.md)
- [API设计规范](./api-design-guidelines.md)
- [安全架构详解](./security-architecture.md)
- [部署运维指南](../deployment/production-deployment.md)
- [性能优化指南](./performance-optimization.md)
- [监控和告警](./monitoring-alerting.md)
- [故障恢复计划](./disaster-recovery.md)

---

⚠️ **架构设计原则**:
- 始终考虑故障场景和降级策略
- 优先考虑数据一致性和用户体验
- 保持系统的可观测性和可维护性
- 设计时考虑未来的扩展和演进需求