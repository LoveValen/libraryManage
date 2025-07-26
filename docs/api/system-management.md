# ⚙️ 系统管理 API

企业级系统管理和运维监控API，提供服务管理、健康监控、性能分析、系统配置等核心运维功能。

## 🌐 基础信息

**基础路径**: `/system`  
**权限要求**: 管理员、系统运维人员  
**认证方式**: Bearer Token (JWT)

## 🎛️ 核心功能

### 🚀 服务管理

#### 获取所有服务状态
```http
GET /system/services/status
```

**权限**: 管理员、运维人员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "manager": {
      "running": true,
      "servicesCount": 4,
      "startTime": "2025-01-12T08:00:00.000Z",
      "uptime": "2.5 hours"
    },
    "services": {
      "auditLogging": {
        "name": "Audit Logging Service",
        "running": true,
        "critical": true,
        "dependencies": [],
        "startTime": "2025-01-12T08:00:05.000Z",
        "status": "healthy",
        "metrics": {
          "logsProcessed": 1247,
          "queueSize": 0,
          "avgProcessingTime": "45ms"
        }
      },
      "securityMonitoring": {
        "name": "Security Monitoring Service", 
        "running": true,
        "critical": true,
        "dependencies": ["auditLogging"],
        "startTime": "2025-01-12T08:00:10.000Z",
        "status": "healthy",
        "metrics": {
          "threatsDetected": 15,
          "rulesetVersion": "2.1.3",
          "lastUpdate": "2025-01-12T07:30:00.000Z"
        }
      },
      "behaviorTracking": {
        "name": "Behavior Tracking Service",
        "running": true,
        "critical": false,
        "dependencies": [],
        "startTime": "2025-01-12T08:00:15.000Z",
        "status": "healthy",
        "metrics": {
          "behaviorEvents": 567,
          "userProfiles": 234,
          "predictionAccuracy": "85%"
        }
      },
      "recommendation": {
        "name": "Recommendation Service",
        "running": true,
        "critical": false,
        "dependencies": ["behaviorTracking"],
        "startTime": "2025-01-12T08:00:20.000Z",
        "status": "healthy",
        "metrics": {
          "recommendationsGenerated": 1456,
          "cacheHitRate": "92%",
          "modelVersion": "3.2.1"
        }
      }
    },
    "summary": {
      "totalServices": 4,
      "runningServices": 4,
      "criticalServices": 2,
      "failedServices": 0,
      "lastHealthCheck": "2025-01-12T10:29:00.000Z"
    }
  }
}
```

#### 启动所有服务
```http
POST /system/services/start
```

**权限**: 仅管理员

**请求体**:
```json
{
  "force": false,
  "services": [],
  "startupOptions": {
    "healthCheckInterval": 60000,
    "maxRetries": 3,
    "retryDelay": 5000
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "operation": "start_services",
    "status": "completed",
    "startTime": "2025-01-12T10:30:00.000Z",
    "endTime": "2025-01-12T10:30:45.000Z",
    "duration": "45 seconds",
    "results": {
      "totalServices": 4,
      "startedServices": 4,
      "failedServices": 0,
      "skippedServices": 0
    },
    "serviceResults": [
      {
        "serviceId": "auditLogging",
        "name": "Audit Logging Service",
        "status": "started",
        "startTime": "2025-01-12T10:30:05.000Z",
        "duration": "2.3 seconds"
      },
      {
        "serviceId": "securityMonitoring",
        "name": "Security Monitoring Service",
        "status": "started", 
        "startTime": "2025-01-12T10:30:10.000Z",
        "duration": "3.1 seconds"
      }
    ],
    "healthCheckEnabled": true,
    "nextHealthCheck": "2025-01-12T10:31:00.000Z"
  }
}
```

#### 停止所有服务
```http
POST /system/services/stop
```

**权限**: 仅管理员

**请求体**:
```json
{
  "graceful": true,
  "timeout": 30000,
  "force": false,
  "services": []
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "operation": "stop_services",
    "status": "completed",
    "stopTime": "2025-01-12T10:30:00.000Z",
    "endTime": "2025-01-12T10:30:25.000Z",
    "duration": "25 seconds",
    "graceful": true,
    "results": {
      "totalServices": 4,
      "stoppedServices": 4,
      "forcedStops": 0,
      "errors": 0
    },
    "serviceResults": [
      {
        "serviceId": "recommendation",
        "name": "Recommendation Service",
        "status": "stopped",
        "stopTime": "2025-01-12T10:30:05.000Z",
        "duration": "1.2 seconds",
        "graceful": true
      }
    ]
  }
}
```

#### 重启所有服务
```http
POST /system/services/restart
```

**权限**: 仅管理员

**请求体**:
```json
{
  "services": [],
  "restartDelay": 5000,
  "healthCheckAfterRestart": true
}
```

#### 单个服务操作
```http
POST /system/services/{serviceId}/start
POST /system/services/{serviceId}/stop
POST /system/services/{serviceId}/restart
```

**路径参数**:
- `serviceId`: 服务ID (auditLogging, securityMonitoring, behaviorTracking, recommendation)

### 🏥 健康监控

#### 系统整体健康状态
```http
GET /system/health
```

**权限**: 公开访问

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-12T10:30:00.000Z",
    "uptime": "2d 14h 30m",
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "application": "healthy",
      "database": "healthy",
      "redis": "healthy", 
      "elasticsearch": "healthy",
      "fileSystem": "healthy",
      "email": "healthy"
    },
    "performance": {
      "cpuUsage": "45%",
      "memoryUsage": "67%",
      "diskUsage": "52%",
      "loadAverage": [1.2, 1.1, 1.0],
      "responseTime": "85ms"
    },
    "dependencies": [
      {
        "name": "PostgreSQL",
        "status": "healthy",
        "responseTime": "15ms",
        "lastCheck": "2025-01-12T10:29:45.000Z"
      },
      {
        "name": "Redis",
        "status": "healthy",
        "responseTime": "5ms",
        "memoryUsage": "234MB"
      },
      {
        "name": "Elasticsearch",
        "status": "healthy",
        "responseTime": "35ms",
        "clusterHealth": "green"
      }
    ],
    "checks": [
      {
        "name": "database_connection",
        "status": "passed",
        "duration": "15ms",
        "lastRun": "2025-01-12T10:29:45.000Z"
      },
      {
        "name": "disk_space",
        "status": "passed",
        "value": "52%",
        "threshold": "80%"
      }
    ]
  }
}
```

#### 详细健康检查
```http
GET /system/health/detailed
```

**权限**: 管理员、运维人员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "status": "healthy",
      "score": 95,
      "timestamp": "2025-01-12T10:30:00.000Z",
      "lastFullCheck": "2025-01-12T10:25:00.000Z"
    },
    "system": {
      "hostname": "library-server-01",
      "platform": "linux",
      "architecture": "x64",
      "nodeVersion": "18.19.0",
      "uptime": "227850 seconds",
      "loadAverage": [1.2, 1.1, 1.0],
      "cpuCores": 8,
      "totalMemory": "16GB",
      "freeMemory": "5.2GB"
    },
    "application": {
      "name": "Library Management System",
      "version": "1.0.0",
      "environment": "production",
      "pid": 12345,
      "startTime": "2025-01-10T20:00:00.000Z",
      "memoryUsage": {
        "rss": "245MB",
        "heapUsed": "189MB",
        "heapTotal": "234MB",
        "external": "12MB"
      }
    },
    "services": {
      "webServer": {
        "status": "healthy",
        "port": 5000,
        "activeConnections": 23,
        "requestsPerMinute": 145,
        "avgResponseTime": "85ms"
      },
      "backgroundJobs": {
        "status": "healthy",
        "queues": {
          "email": { "waiting": 0, "active": 2, "completed": 1456, "failed": 3 },
          "notifications": { "waiting": 5, "active": 1, "completed": 867, "failed": 0 },
          "backup": { "waiting": 0, "active": 0, "completed": 24, "failed": 0 }
        }
      }
    },
    "storage": {
      "database": {
        "status": "healthy",
        "responseTime": "15ms",
        "activeConnections": 12,
        "maxConnections": 100,
        "slowQueries": 2,
        "replicationLag": "0ms"
      },
      "cache": {
        "status": "healthy",
        "responseTime": "5ms",
        "hitRate": "92%",
        "memoryUsage": "234MB",
        "evictedKeys": 156
      },
      "search": {
        "status": "healthy",
        "responseTime": "35ms",
        "clusterHealth": "green",
        "indexCount": 5,
        "documentCount": 12456
      },
      "fileSystem": {
        "status": "healthy",
        "uploads": {
          "path": "/uploads",
          "usage": "2.3GB",
          "available": "47.7GB"
        },
        "logs": {
          "path": "/logs", 
          "usage": "156MB",
          "available": "49.8GB"
        },
        "backups": {
          "path": "/backups",
          "usage": "5.2GB",
          "available": "44.8GB"
        }
      }
    },
    "security": {
      "status": "healthy",
      "sslCertificate": {
        "valid": true,
        "expiresAt": "2025-07-12T00:00:00.000Z",
        "daysUntilExpiry": 181
      },
      "firewall": {
        "status": "active",
        "blockedIPs": 25,
        "allowedPorts": [80, 443, 22]
      },
      "authentication": {
        "status": "healthy",
        "failedLogins24h": 12,
        "activeSessions": 67
      }
    },
    "integrations": {
      "email": {
        "status": "healthy",
        "provider": "SMTP",
        "lastTest": "2025-01-12T09:00:00.000Z",
        "sent24h": 45,
        "failed24h": 1
      },
      "backup": {
        "status": "healthy",
        "lastBackup": "2025-01-12T03:00:00.000Z",
        "backupSize": "2.1GB",
        "nextBackup": "2025-01-13T03:00:00.000Z"
      }
    },
    "alerts": [
      {
        "level": "warning",
        "message": "CPU usage above 70% for 10 minutes",
        "timestamp": "2025-01-12T10:20:00.000Z",
        "resolved": false
      }
    ],
    "recommendations": [
      "Consider increasing memory allocation",
      "Monitor disk usage trends",
      "Review slow database queries"
    ]
  }
}
```

#### 创建健康检查模板
```http
POST /system/health/templates
```

**权限**: 管理员

**请求体**:
```json
{
  "name": "Database Connection Check",
  "description": "检查数据库连接状态和响应时间",
  "category": "database",
  "checkType": "connection",
  "configuration": {
    "timeout": 10000,
    "retries": 3,
    "thresholds": {
      "responseTime": 100,
      "connectionCount": 80
    }
  },
  "schedule": {
    "enabled": true,
    "interval": 60000,
    "failureThreshold": 3
  },
  "alerts": {
    "onFailure": true,
    "onRecovery": true,
    "channels": ["email", "webhook"]
  }
}
```

### 📊 性能监控

#### 获取系统性能指标
```http
GET /system/metrics
```

**权限**: 管理员、运维人员

**查询参数**:
```
period: 时间周期 (1h/6h/24h/7d/30d)
metrics: 指标类型 (cpu,memory,disk,network,application)
granularity: 数据粒度 (1m/5m/1h/1d)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "granularity": "1h",
    "timestamp": "2025-01-12T10:30:00.000Z",
    "system": {
      "cpu": {
        "current": 45.2,
        "average": 38.7,
        "peak": 78.3,
        "trend": "stable",
        "data": [
          { "time": "2025-01-11T10:00:00.000Z", "value": 35.2 },
          { "time": "2025-01-11T11:00:00.000Z", "value": 42.1 }
        ]
      },
      "memory": {
        "current": 67.8,
        "average": 64.2,
        "peak": 82.1,
        "trend": "increasing",
        "details": {
          "total": "16GB",
          "used": "10.8GB",
          "free": "5.2GB",
          "cached": "3.2GB",
          "buffers": "1.1GB"
        }
      },
      "disk": {
        "current": 52.3,
        "average": 51.8,
        "peak": 55.1,
        "trend": "stable",
        "breakdown": {
          "root": { "usage": "45%", "available": "27.5GB" },
          "logs": { "usage": "23%", "available": "38.5GB" },
          "uploads": { "usage": "67%", "available": "16.5GB" }
        }
      },
      "network": {
        "inbound": {
          "current": "15.2 MB/s",
          "average": "12.8 MB/s",
          "peak": "45.1 MB/s"
        },
        "outbound": {
          "current": "8.7 MB/s", 
          "average": "7.2 MB/s",
          "peak": "23.4 MB/s"
        }
      }
    },
    "application": {
      "requestsPerSecond": {
        "current": 25.3,
        "average": 18.7,
        "peak": 67.2,
        "data": []
      },
      "responseTime": {
        "current": "85ms",
        "average": "92ms",
        "p95": "156ms",
        "p99": "234ms"
      },
      "errorRate": {
        "current": 0.12,
        "average": 0.08,
        "threshold": 1.0
      },
      "activeUsers": {
        "current": 67,
        "peak24h": 156,
        "average": 89
      }
    },
    "database": {
      "connections": {
        "active": 12,
        "idle": 8,
        "max": 100
      },
      "queries": {
        "perSecond": 45.2,
        "avgDuration": "25ms",
        "slowQueries": 2
      },
      "cache": {
        "hitRate": "92.3%",
        "size": "234MB",
        "evictions": 156
      }
    },
    "alerts": [
      {
        "metric": "cpu_usage",
        "threshold": 80,
        "current": 78.3,
        "status": "warning",
        "duration": "15 minutes"
      }
    ]
  }
}
```

#### 获取应用程序性能指标
```http
GET /system/metrics/application
```

**权限**: 管理员、运维人员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-12T10:30:00.000Z",
    "performance": {
      "requests": {
        "total24h": 45672,
        "successful": 45234,
        "failed": 438,
        "ratePerSecond": 25.3,
        "peakRatePerSecond": 67.2
      },
      "responseTime": {
        "average": "92ms",
        "median": "78ms",
        "p95": "156ms",
        "p99": "234ms",
        "max": "1.2s"
      },
      "endpoints": [
        {
          "path": "/api/books",
          "method": "GET",
          "requestCount": 8945,
          "avgResponseTime": "65ms",
          "errorRate": "0.02%"
        },
        {
          "path": "/api/users/login",
          "method": "POST", 
          "requestCount": 2345,
          "avgResponseTime": "145ms",
          "errorRate": "2.1%"
        }
      ],
      "errors": {
        "total24h": 438,
        "rate": "0.96%",
        "breakdown": {
          "400": 234,
          "401": 123,
          "403": 45,
          "404": 23,
          "500": 13
        },
        "recent": [
          {
            "timestamp": "2025-01-12T10:25:00.000Z",
            "status": 500,
            "path": "/api/books/search",
            "error": "Database connection timeout",
            "count": 3
          }
        ]
      }
    },
    "resources": {
      "memory": {
        "heapUsed": "189MB",
        "heapTotal": "234MB",
        "external": "12MB",
        "rss": "245MB"
      },
      "eventLoop": {
        "lag": "0.5ms",
        "utilization": "12%"
      },
      "gc": {
        "collections": 45,
        "pauseTime": "2.3ms",
        "heapGrowth": "5.2MB"
      }
    },
    "dependencies": {
      "database": {
        "connectionsActive": 12,
        "queryTime": "25ms",
        "slowQueries": 2
      },
      "redis": {
        "connectionsActive": 5,
        "hitRate": "92.3%",
        "avgResponseTime": "1.2ms"
      },
      "elasticsearch": {
        "searchTime": "35ms",
        "indexingRate": "15/sec",
        "clusterHealth": "green"
      }
    }
  }
}
```

### 📈 告警管理

#### 获取告警列表
```http
GET /system/alerts
```

**权限**: 管理员、运维人员

**查询参数**:
```
status: 告警状态 (active/resolved/acknowledged)
severity: 严重程度 (critical/high/medium/low)
category: 告警类别 (system/application/security/performance)
timeRange: 时间范围 (1h/6h/24h/7d)
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_12345",
      "title": "High CPU Usage",
      "description": "CPU usage has exceeded 80% for more than 15 minutes",
      "severity": "high",
      "category": "system",
      "status": "active",
      "createdAt": "2025-01-12T10:15:00.000Z",
      "updatedAt": "2025-01-12T10:15:00.000Z",
      "source": {
        "type": "metric",
        "metric": "cpu_usage",
        "threshold": 80,
        "currentValue": 85.2
      },
      "affectedSystems": ["web-server", "api-server"],
      "duration": "15 minutes",
      "acknowledgedBy": null,
      "actions": [
        {
          "type": "notification",
          "channel": "email",
          "sent": true,
          "timestamp": "2025-01-12T10:15:30.000Z"
        }
      ],
      "recommendations": [
        "Check for resource-intensive processes",
        "Consider scaling up resources",
        "Review recent deployments"
      ]
    }
  ],
  "summary": {
    "total": 23,
    "active": 5,
    "acknowledged": 12,
    "resolved": 6,
    "bySeverity": {
      "critical": 1,
      "high": 2,
      "medium": 8,
      "low": 12
    }
  }
}
```

#### 确认告警
```http
PUT /system/alerts/{alertId}/acknowledge
```

**路径参数**:
- `alertId`: 告警ID

**请求体**:
```json
{
  "notes": "正在调查CPU使用率过高的原因",
  "estimatedResolutionTime": "30 minutes",
  "assignTo": "ops_team"
}
```

#### 解决告警
```http
PUT /system/alerts/{alertId}/resolve
```

**请求体**:
```json
{
  "resolution": "增加了服务器资源，CPU使用率已恢复正常",
  "rootCause": "批量数据处理任务导致资源消耗过高",
  "preventionMeasures": [
    "调整批量任务调度时间",
    "增加资源监控阈值",
    "实施自动扩容策略"
  ]
}
```

#### 创建告警规则
```http
POST /system/alerts/rules
```

**权限**: 管理员

**请求体**:
```json
{
  "name": "High Memory Usage Alert",
  "description": "当内存使用率超过85%时触发告警",
  "enabled": true,
  "conditions": {
    "metric": "memory_usage",
    "operator": "greater_than",
    "threshold": 85,
    "duration": "10m",
    "aggregation": "average"
  },
  "severity": "high",
  "category": "system",
  "actions": [
    {
      "type": "email",
      "recipients": ["ops@company.com"],
      "template": "high_memory_usage"
    },
    {
      "type": "webhook",
      "url": "https://hooks.slack.com/services/...",
      "payload": {
        "channel": "#alerts",
        "username": "SystemBot"
      }
    }
  ],
  "escalation": {
    "enabled": true,
    "rules": [
      {
        "delay": "30m",
        "severity": "critical",
        "actions": ["sms", "phone_call"]
      }
    ]
  }
}
```

### 📝 日志管理

#### 获取系统日志
```http
GET /system/logs
```

**权限**: 管理员、运维人员

**查询参数**:
```
level: 日志级别 (error/warn/info/debug)
service: 服务名称
startTime: 开始时间
endTime: 结束时间
search: 搜索关键词
limit: 返回条数
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-12T10:30:00.000Z",
        "level": "error",
        "service": "database",
        "message": "Connection timeout after 10 seconds",
        "metadata": {
          "connection_id": "conn_123",
          "query": "SELECT * FROM users WHERE id = ?",
          "duration": "10.5s"
        },
        "stack": "Error: Connection timeout\n    at Database.query..."
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 50,
      "totalItems": 2456,
      "totalPages": 50
    },
    "summary": {
      "totalLogs": 2456,
      "byLevel": {
        "error": 23,
        "warn": 145,
        "info": 2145,
        "debug": 143
      },
      "timeRange": "24h"
    }
  }
}
```

#### 下载日志文件
```http
GET /system/logs/download
```

**权限**: 管理员

**查询参数**:
```
date: 日期 (YYYY-MM-DD)
service: 服务名称
format: 格式 (json/text)
compress: 是否压缩 (true/false)
```

### ⚙️ 系统配置

#### 获取系统配置
```http
GET /system/config
```

**权限**: 管理员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "application": {
      "name": "Library Management System",
      "version": "1.0.0",
      "environment": "production",
      "debug": false,
      "timezone": "Asia/Shanghai"
    },
    "server": {
      "port": 5000,
      "host": "0.0.0.0",
      "ssl": {
        "enabled": true,
        "cert": "/path/to/cert.pem",
        "key": "/path/to/key.pem"
      }
    },
    "database": {
      "host": "localhost",
      "port": 5432,
      "name": "library_management",
      "poolSize": 100,
      "connectionTimeout": 10000
    },
    "cache": {
      "host": "localhost",
      "port": 6379,
      "ttl": 3600,
      "maxMemory": "256MB"
    },
    "monitoring": {
      "enabled": true,
      "interval": 60000,
      "retention": "30d",
      "alerts": {
        "email": true,
        "webhook": true,
        "sms": false
      }
    },
    "security": {
      "rateLimit": {
        "enabled": true,
        "windowMs": 900000,
        "max": 100
      },
      "cors": {
        "enabled": true,
        "origins": ["https://app.library.com"]
      }
    },
    "features": {
      "recommendation": true,
      "notifications": true,
      "audit": true,
      "backup": true
    }
  }
}
```

#### 更新系统配置
```http
PUT /system/config
```

**权限**: 仅管理员

**请求体**:
```json
{
  "monitoring": {
    "interval": 30000,
    "alerts": {
      "sms": true
    }
  },
  "security": {
    "rateLimit": {
      "max": 200
    }
  }
}
```

### 🔄 备份管理

#### 获取备份列表
```http
GET /system/backups
```

**权限**: 管理员

**查询参数**:
```
type: 备份类型 (full/incremental)
status: 备份状态 (completed/failed/in_progress)
startDate: 开始日期
endDate: 结束日期
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "backup_20250112_030000",
      "type": "full",
      "status": "completed",
      "startTime": "2025-01-12T03:00:00.000Z",
      "endTime": "2025-01-12T03:15:23.000Z",
      "duration": "15 minutes 23 seconds",
      "size": "2.1GB",
      "compressed": true,
      "encrypted": true,
      "storage": {
        "type": "local",
        "path": "/backups/backup_20250112_030000.tar.gz",
        "checksum": "sha256:abc123def456..."
      },
      "verification": {
        "verified": true,
        "verifiedAt": "2025-01-12T03:20:00.000Z",
        "integrityCheck": "passed"
      },
      "metadata": {
        "tables": 15,
        "records": 125678,
        "files": 234,
        "version": "1.0.0"
      }
    }
  ],
  "summary": {
    "totalBackups": 45,
    "totalSize": "95.6GB",
    "lastBackup": "2025-01-12T03:00:00.000Z",
    "nextScheduledBackup": "2025-01-13T03:00:00.000Z"
  }
}
```

#### 创建手动备份
```http
POST /system/backups
```

**权限**: 管理员

**请求体**:
```json
{
  "type": "full",
  "description": "升级前的完整备份",
  "options": {
    "compression": true,
    "encryption": true,
    "verification": true,
    "includeFiles": true,
    "excludeTables": []
  },
  "storage": {
    "type": "local",
    "retention": "90d"
  }
}
```

#### 恢复数据
```http
POST /system/restore
```

**权限**: 仅管理员

**请求体**:
```json
{
  "backupId": "backup_20250112_030000",
  "restoreType": "full",
  "options": {
    "overwriteExisting": false,
    "preRestoreBackup": true,
    "verifyIntegrity": true
  },
  "approvalRequired": true
}
```

### 🔧 维护模式

#### 启用维护模式
```http
POST /system/maintenance/enable
```

**权限**: 仅管理员

**请求体**:
```json
{
  "reason": "系统升级维护",
  "estimatedDuration": "2 hours",
  "message": "系统正在进行重要更新，预计2小时后恢复服务",
  "allowedIPs": ["192.168.1.100", "10.0.0.50"],
  "allowedUsers": ["admin", "operator"]
}
```

#### 禁用维护模式
```http
POST /system/maintenance/disable
```

#### 获取维护状态
```http
GET /system/maintenance/status
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "reason": null,
    "startTime": null,
    "estimatedEndTime": null,
    "message": null,
    "allowedIPs": [],
    "allowedUsers": [],
    "lastMaintenanceWindow": {
      "startTime": "2025-01-10T02:00:00.000Z",
      "endTime": "2025-01-10T03:30:00.000Z",
      "duration": "1.5 hours",
      "reason": "数据库索引重建"
    }
  }
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `SERVICE_START_FAILED` | 500 | 服务启动失败 | 检查服务依赖和配置 |
| `SERVICE_STOP_TIMEOUT` | 500 | 服务停止超时 | 使用force参数强制停止 |
| `HEALTH_CHECK_FAILED` | 503 | 健康检查失败 | 检查系统状态和依赖 |
| `METRICS_UNAVAILABLE` | 503 | 性能指标不可用 | 检查监控服务状态 |
| `BACKUP_CREATION_FAILED` | 500 | 备份创建失败 | 检查存储空间和权限 |
| `RESTORE_OPERATION_FAILED` | 500 | 恢复操作失败 | 验证备份完整性 |
| `MAINTENANCE_MODE_ACTIVE` | 503 | 维护模式已启用 | 等待维护完成或联系管理员 |

## 📊 监控集成

### Prometheus指标端点
```http
GET /system/metrics/prometheus
```

### 日志集成
- **ELK Stack**: 支持Elasticsearch、Logstash、Kibana
- **Grafana**: 仪表板和可视化
- **Jaeger**: 分布式链路追踪

### 告警通道
- **Email**: SMTP邮件通知
- **Webhook**: HTTP回调通知
- **Slack**: 即时消息通知
- **SMS**: 短信告警（需配置）

## 🔗 相关文档

- [系统架构文档](../design/system-architecture.md)
- [监控部署指南](../deployment/monitoring-setup.md)
- [运维手册](../operations/maintenance-guide.md)
- [故障排除指南](../troubleshooting/system-issues.md)

---

⚠️ **运维提醒**:
- 定期检查系统健康状态和性能指标
- 及时处理告警和异常事件
- 保持备份策略的有效性
- 监控资源使用趋势，提前规划扩容