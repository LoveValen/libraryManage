# 🛡️ 审计与安全监控 API

企业级审计日志和安全监控系统API，提供完整的操作审计、威胁检测、合规性报告等功能。

## 🌐 基础信息

**基础路径**: `/audit`  
**权限要求**: 管理员或安全分析师  
**认证方式**: Bearer Token (JWT)

## 📋 核心功能

### 🔍 审计日志查询

#### 搜索审计日志
```http
GET /audit/logs/search
```

**权限**: 管理员、安全分析师

**查询参数**:
```
userId: 用户ID (可选)
action: 操作类型 (可选)
entityType: 实体类型 (可选)
startDate: 开始日期 (ISO 8601)
endDate: 结束日期 (ISO 8601)
riskLevel: 风险级别 (low/medium/high/critical)
page: 页码 (默认: 1)
limit: 每页数量 (默认: 20, 最大: 100)
sortBy: 排序字段 (timestamp/riskLevel/action)
sortOrder: 排序方向 (asc/desc)
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "audit_123456",
      "userId": 100,
      "userIdentifier": "admin@library.com",
      "entityType": "User",
      "entityId": "user_789",
      "action": "user_login",
      "timestamp": "2025-01-12T10:30:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "method": "password",
        "loginTime": "2025-01-12T10:30:00.000Z",
        "deviceFingerprint": "abc123def456"
      },
      "changes": {
        "before": {},
        "after": {
          "lastLoginAt": "2025-01-12T10:30:00.000Z"
        }
      },
      "riskLevel": "low",
      "securityFlags": [],
      "checksum": "sha256:abc123...",
      "encryptedDetails": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 1247,
    "totalPages": 63,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 获取用户操作历史
```http
GET /audit/users/{userId}/history
```

**路径参数**:
- `userId`: 用户ID

**查询参数**:
```
days: 查询天数 (默认: 30, 最大: 90)
action: 操作类型过滤
includeDetails: 是否包含详细信息 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": 100,
    "username": "admin",
    "auditPeriod": {
      "startDate": "2024-12-13T00:00:00.000Z",
      "endDate": "2025-01-12T23:59:59.999Z",
      "totalDays": 30
    },
    "summary": {
      "totalActions": 156,
      "uniqueIPs": 3,
      "riskDistribution": {
        "low": 120,
        "medium": 30,
        "high": 5,
        "critical": 1
      },
      "topActions": [
        { "action": "book_view", "count": 45 },
        { "action": "user_login", "count": 28 },
        { "action": "book_search", "count": 23 }
      ]
    },
    "timeline": [
      {
        "date": "2025-01-12",
        "actions": 8,
        "riskEvents": 0,
        "topAction": "book_view"
      }
    ],
    "recentActivities": []
  }
}
```

### 📊 安全统计与分析

#### 获取安全统计
```http
GET /audit/statistics/security
```

**权限**: 管理员、安全分析师

**查询参数**:
```
period: 统计周期 (24h/7d/30d/90d)
includeDetails: 包含详细信息 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "generatedAt": "2025-01-12T10:30:00.000Z",
    "overview": {
      "totalEvents": 1247,
      "securityIncidents": 15,
      "blockedAttempts": 8,
      "threatLevel": "medium"
    },
    "riskDistribution": {
      "critical": 2,
      "high": 8,
      "medium": 45,
      "low": 1192
    },
    "incidentTypes": [
      {
        "type": "brute_force_attempt",
        "count": 5,
        "lastOccurrence": "2025-01-12T08:15:00.000Z",
        "trend": "decreasing"
      },
      {
        "type": "suspicious_login_location",
        "count": 3,
        "lastOccurrence": "2025-01-11T16:45:00.000Z",
        "trend": "stable"
      }
    ],
    "ipAnalysis": {
      "uniqueIPs": 234,
      "suspiciousIPs": 5,
      "blockedIPs": 2,
      "geoDistribution": {
        "CN": 180,
        "US": 30,
        "GB": 15,
        "others": 9
      }
    },
    "timePatterns": {
      "peakHours": ["09:00", "14:00", "20:00"],
      "unusualActivity": [
        {
          "time": "2025-01-11T03:30:00.000Z",
          "event": "bulk_data_access",
          "severity": "medium"
        }
      ]
    }
  }
}
```

#### 获取操作趋势分析
```http
GET /audit/trends/operations
```

**权限**: 管理员、安全分析师

**查询参数**:
```
period: 分析周期 (7d/30d/90d)
granularity: 数据粒度 (hour/day/week)
entities: 实体类型过滤 (逗号分隔)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "granularity": "day",
    "trends": [
      {
        "date": "2025-01-12",
        "totalOperations": 156,
        "uniqueUsers": 45,
        "entityBreakdown": {
          "User": 45,
          "Book": 78,
          "Borrow": 23,
          "Review": 10
        },
        "riskEvents": 2,
        "avgResponseTime": "125ms"
      }
    ],
    "patterns": {
      "growingTrends": [
        "book_search_frequency",
        "mobile_access_percentage"
      ],
      "decliningTrends": [
        "manual_data_entry"
      ],
      "anomalies": [
        {
          "date": "2025-01-10",
          "metric": "unusual_bulk_operations",
          "deviation": "300%",
          "investigation": "scheduled_maintenance"
        }
      ]
    },
    "recommendations": [
      "Consider implementing auto-logout for inactive sessions",
      "Review bulk operation permissions",
      "Enable additional monitoring for off-hours access"
    ]
  }
}
```

### 🔒 安全事件管理

#### 获取安全事件列表
```http
GET /audit/security/events
```

**权限**: 管理员、安全分析师

**查询参数**:
```
severity: 严重程度 (low/medium/high/critical)
status: 事件状态 (open/investigating/resolved/false_positive)
eventType: 事件类型
assignedTo: 分配给的用户ID
startDate: 开始日期
endDate: 结束日期
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "sec_event_789",
      "eventType": "brute_force_attempt",
      "severity": "high",
      "status": "investigating",
      "title": "暴力破解尝试检测",
      "description": "检测到来自IP 192.168.1.50的连续登录失败",
      "firstDetected": "2025-01-12T08:15:00.000Z",
      "lastUpdated": "2025-01-12T08:30:00.000Z",
      "affectedUser": {
        "id": 123,
        "username": "john_doe"
      },
      "sourceIP": "192.168.1.50",
      "evidence": {
        "failedAttempts": 15,
        "timeWindow": "5 minutes",
        "patterns": ["sequential_usernames", "common_passwords"]
      },
      "assignedTo": {
        "id": 5,
        "username": "security_analyst",
        "assignedAt": "2025-01-12T08:20:00.000Z"
      },
      "actions": [
        {
          "action": "ip_blocked",
          "timestamp": "2025-01-12T08:16:00.000Z",
          "automatic": true
        },
        {
          "action": "notification_sent",
          "timestamp": "2025-01-12T08:17:00.000Z",
          "recipient": "security_team"
        }
      ],
      "riskScore": 85,
      "tags": ["brute_force", "authentication", "automated"]
    }
  ]
}
```

#### 获取高优先级安全事件
```http
GET /audit/security/events/high-priority
```

**权限**: 管理员、安全分析师

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "critical": 1,
      "high": 2,
      "needsAttention": 2
    },
    "events": [
      {
        "id": "sec_event_001",
        "eventType": "privilege_escalation_attempt",
        "severity": "critical",
        "status": "open",
        "title": "权限提升尝试",
        "description": "用户尝试访问管理员功能",
        "urgencyScore": 95,
        "timeRemaining": "4 hours",
        "escalationLevel": 1
      }
    ],
    "alertingRules": [
      {
        "ruleName": "critical_event_immediate_alert",
        "triggered": true,
        "lastAlert": "2025-01-12T08:15:00.000Z"
      }
    ]
  }
}
```

#### 处理安全事件
```http
PUT /audit/security/events/{eventId}/handle
```

**路径参数**:
- `eventId`: 安全事件ID

**请求体**:
```json
{
  "status": "resolved",
  "resolution": "false_positive",
  "notes": "经调查确认为合法操作，系统误报",
  "actions": [
    {
      "type": "whitelist_ip",
      "target": "192.168.1.100",
      "duration": "7d"
    }
  ],
  "notifyTeam": true
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "安全事件处理成功",
  "data": {
    "eventId": "sec_event_789",
    "previousStatus": "investigating",
    "newStatus": "resolved",
    "handledBy": {
      "id": 5,
      "username": "security_analyst"
    },
    "handledAt": "2025-01-12T10:30:00.000Z",
    "summary": {
      "resolutionTime": "2.25 hours",
      "actionsApplied": 1,
      "teamNotified": true
    }
  }
}
```

#### 创建安全事件
```http
POST /audit/security/events
```

**权限**: 管理员、安全分析师

**请求体**:
```json
{
  "eventType": "manual_security_review",
  "severity": "medium",
  "title": "可疑用户行为调查",
  "description": "用户在短时间内进行了大量敏感操作",
  "affectedUserId": 123,
  "evidence": {
    "timeWindow": "1 hour",
    "operationsCount": 50,
    "suspiciousPatterns": ["bulk_export", "admin_functions"]
  },
  "assignTo": 5,
  "priority": "medium",
  "tags": ["manual", "investigation", "user_behavior"]
}
```

### 🔍 登录监控

#### 获取登录尝试记录
```http
GET /audit/login/attempts
```

**权限**: 管理员、安全分析师

**查询参数**:
```
success: 登录结果 (true/false)
ipAddress: IP地址过滤
userId: 用户ID过滤
startDate: 开始日期
endDate: 结束日期
suspicious: 仅显示可疑尝试 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "login_attempt_456",
      "userId": 123,
      "username": "john_doe",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "success": true,
      "timestamp": "2025-01-12T10:30:00.000Z",
      "method": "password",
      "deviceFingerprint": "abc123def456",
      "location": {
        "country": "CN",
        "city": "Beijing",
        "timezone": "Asia/Shanghai"
      },
      "riskFactors": [],
      "sessionId": "sess_789abc123",
      "duration": "45 minutes"
    }
  ],
  "summary": {
    "total": 156,
    "successful": 142,
    "failed": 14,
    "suspicious": 3,
    "uniqueIPs": 45,
    "timeRange": "7 days"
  }
}
```

#### 获取可疑IP列表
```http
GET /audit/security/suspicious-ips
```

**权限**: 管理员、安全分析师

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "ipAddress": "192.168.1.50",
      "suspicionScore": 85,
      "reasons": [
        "brute_force_attempts",
        "multiple_user_attempts",
        "unusual_access_pattern"
      ],
      "firstSeen": "2025-01-10T14:30:00.000Z",
      "lastSeen": "2025-01-12T08:15:00.000Z",
      "activityCount": 47,
      "failedAttempts": 15,
      "affectedUsers": 8,
      "location": {
        "country": "Unknown",
        "city": "Unknown",
        "organization": "Unknown"
      },
      "status": "monitoring",
      "actions": [
        {
          "type": "rate_limit",
          "applied": true,
          "timestamp": "2025-01-12T08:16:00.000Z"
        }
      ]
    }
  ],
  "summary": {
    "totalSuspiciousIPs": 5,
    "blockedIPs": 2,
    "monitoringIPs": 3,
    "averageSuspicionScore": 65
  }
}
```

### 🧠 威胁情报

#### 获取威胁情报
```http
GET /audit/security/threat-intelligence
```

**权限**: 管理员、安全分析师

**响应示例**:
```json
{
  "success": true,
  "data": {
    "generatedAt": "2025-01-12T10:30:00.000Z",
    "threatLevel": "medium",
    "activeThreats": [
      {
        "type": "brute_force_campaign",
        "severity": "high",
        "description": "检测到针对管理员账户的暴力破解活动",
        "affectedSystems": ["authentication"],
        "mitigations": [
          "账户锁定已启用",
          "IP黑名单已更新",
          "监控频率已提高"
        ],
        "timeline": "过去24小时",
        "status": "active"
      }
    ],
    "riskIndicators": [
      {
        "indicator": "unusual_login_times",
        "riskLevel": "medium",
        "description": "非工作时间登录增加",
        "impact": "可能的内部威胁或账户泄露",
        "recommendation": "加强非工作时间访问监控"
      }
    ],
    "securityMetrics": {
      "incidentResponseTime": "15 minutes",
      "falsePositiveRate": "5%",
      "detectionCoverage": "92%",
      "systemHardening": "85%"
    },
    "recommendations": [
      "实施多因素认证",
      "定期安全培训",
      "更新安全策略",
      "增强日志监控"
    ]
  }
}
```

#### 获取安全仪表板
```http
GET /audit/security/dashboard
```

**权限**: 管理员、安全分析师

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "securityStatus": "healthy",
      "threatLevel": "low",
      "activeIncidents": 0,
      "systemsMonitored": 15,
      "lastUpdated": "2025-01-12T10:30:00.000Z"
    },
    "realTimeStats": {
      "currentActiveUsers": 23,
      "requestsPerMinute": 45,
      "failedLoginsLast10Min": 2,
      "blockedIPs": 5
    },
    "alerts": {
      "critical": 0,
      "high": 1,
      "medium": 3,
      "low": 8,
      "total": 12
    },
    "trends": {
      "loginSuccess24h": [
        { "hour": 0, "count": 5 },
        { "hour": 1, "count": 2 }
      ],
      "securityEvents7d": [
        { "date": "2025-01-06", "count": 3 },
        { "date": "2025-01-07", "count": 5 }
      ]
    },
    "topRisks": [
      {
        "risk": "账户暴力破解",
        "severity": "medium",
        "affectedSystems": 1,
        "lastOccurrence": "2025-01-12T08:15:00.000Z"
      }
    ],
    "complianceStatus": {
      "gdpr": "compliant",
      "iso27001": "partial",
      "localRegulations": "compliant",
      "lastAssessment": "2024-12-15T00:00:00.000Z"
    }
  }
}
```

### 🔐 数据完整性

#### 验证数据完整性
```http
POST /audit/verify/integrity
```

**权限**: 仅管理员

**请求体**:
```json
{
  "scope": "all",
  "entities": ["User", "Book", "Borrow"],
  "checksum": true,
  "deepValidation": true,
  "timeRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-12T23:59:59.999Z"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "verificationId": "verify_123456",
    "status": "completed",
    "startTime": "2025-01-12T10:30:00.000Z",
    "endTime": "2025-01-12T10:35:00.000Z",
    "duration": "5 minutes",
    "scope": {
      "entitiesChecked": ["User", "Book", "Borrow"],
      "recordsVerified": 15678,
      "checksumValidated": true
    },
    "results": {
      "overall": "passed",
      "integrity": "intact",
      "anomaliesFound": 0,
      "corruptedRecords": 0,
      "checksumMismatches": 0
    },
    "details": {
      "User": {
        "recordsChecked": 1234,
        "issues": 0,
        "status": "passed"
      },
      "Book": {
        "recordsChecked": 5678,
        "issues": 0,
        "status": "passed"
      },
      "Borrow": {
        "recordsChecked": 8766,
        "issues": 0,
        "status": "passed"
      }
    },
    "recommendations": [
      "数据完整性良好",
      "建议定期执行完整性检查"
    ]
  }
}
```

### 📤 数据导出

#### 导出审计数据
```http
POST /audit/export
```

**权限**: 仅管理员

**请求体**:
```json
{
  "format": "json",
  "dateRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-12T23:59:59.999Z"
  },
  "filters": {
    "entities": ["User", "Book"],
    "riskLevels": ["medium", "high", "critical"],
    "includeDetails": true,
    "excludePersonalData": false
  },
  "encryption": {
    "enabled": true,
    "algorithm": "aes-256-cbc"
  },
  "compression": true,
  "maxRecords": 10000
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "exportId": "export_789abc",
    "status": "processing",
    "estimatedSize": "15MB",
    "recordCount": 8756,
    "format": "json",
    "encrypted": true,
    "downloadUrl": "/audit/exports/export_789abc/download",
    "expiresAt": "2025-01-19T10:30:00.000Z",
    "metadata": {
      "dateRange": "12 days",
      "filters": "applied",
      "compliance": "gdpr_compliant"
    }
  }
}
```

### 📋 合规性报告

#### 生成合规性报告
```http
POST /audit/compliance/reports
```

**权限**: 仅管理员

**请求体**:
```json
{
  "reportType": "gdpr_compliance",
  "period": {
    "start": "2024-12-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.999Z"
  },
  "sections": [
    "data_processing_activities",
    "user_consent_records",
    "data_breach_incidents",
    "user_rights_requests",
    "security_measures"
  ],
  "includeEvidence": true,
  "language": "zh-CN"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reportId": "compliance_report_2024_12",
    "reportType": "gdpr_compliance",
    "status": "generated",
    "generatedAt": "2025-01-12T10:30:00.000Z",
    "period": "December 2024",
    "summary": {
      "complianceScore": 95,
      "totalActivities": 1234,
      "issuesFound": 2,
      "resolutionStatus": "in_progress"
    },
    "sections": {
      "dataProcessingActivities": {
        "status": "compliant",
        "activities": 45,
        "lawfulBasis": "consent_contract",
        "issues": 0
      },
      "userConsentRecords": {
        "status": "compliant",
        "totalConsents": 567,
        "validConsents": 567,
        "withdrawnConsents": 23
      },
      "dataBreachIncidents": {
        "status": "compliant",
        "incidents": 0,
        "reportedToAuthority": 0,
        "userNotifications": 0
      },
      "userRightsRequests": {
        "status": "compliant",
        "totalRequests": 15,
        "fulfilledWithinTime": 15,
        "averageResponseTime": "18 hours"
      },
      "securityMeasures": {
        "status": "mostly_compliant",
        "implementedControls": 18,
        "pendingActions": 2,
        "effectiveness": "high"
      }
    },
    "recommendations": [
      "完善数据加密策略",
      "加强员工隐私培训",
      "定期审查数据处理协议"
    ],
    "downloadUrl": "/audit/compliance/reports/compliance_report_2024_12/download",
    "expiresAt": "2025-02-12T10:30:00.000Z"
  }
}
```

### 🎛️ 系统配置

#### 获取审计配置
```http
GET /audit/config/audit
```

**权限**: 仅管理员

**响应示例**:
```json
{
  "success": true,
  "data": {
    "retention": {
      "auditLogs": 2555,
      "securityEvents": 1095,
      "loginAttempts": 365
    },
    "encryption": {
      "enabled": true,
      "algorithm": "aes-256-cbc",
      "keyRotationPeriod": "90d"
    },
    "compliance": {
      "gdpr": true,
      "hipaa": false,
      "sox": false,
      "iso27001": true
    },
    "monitoring": {
      "realTimeAlerts": true,
      "emailNotifications": true,
      "smsNotifications": false,
      "webhookIntegration": true
    },
    "detection": {
      "bruteForceThreshold": 5,
      "anomalyDetectionEnabled": true,
      "mlBasedThreatDetection": true,
      "geoLocationTracking": true
    },
    "response": {
      "autoBlockSuspiciousIPs": true,
      "autoLockCompromisedAccounts": true,
      "escalationRules": [
        {
          "severity": "critical",
          "notifyWithin": "5 minutes",
          "escalateAfter": "15 minutes"
        }
      ]
    }
  }
}
```

#### 更新审计配置
```http
PUT /audit/config/audit
```

**权限**: 仅管理员

**请求体**:
```json
{
  "retention": {
    "auditLogs": 3650,
    "securityEvents": 1460
  },
  "monitoring": {
    "realTimeAlerts": true,
    "smsNotifications": true
  },
  "detection": {
    "bruteForceThreshold": 3,
    "mlBasedThreatDetection": true
  }
}
```

### 📊 实时监控

#### 获取实时安全状态
```http
GET /audit/security/status
```

**权限**: 管理员、安全分析师

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-12T10:30:00.000Z",
    "system": "operational",
    "threatLevel": "low",
    "threats": {
      "active": 0,
      "blocked": 5,
      "investigating": 2
    },
    "monitoring": {
      "enabled": true,
      "services": [
        "audit_logging",
        "security_monitoring", 
        "threat_detection",
        "anomaly_detection"
      ],
      "coverage": "95%"
    },
    "performance": {
      "avgResponseTime": "85ms",
      "logProcessingRate": "1,200/minute",
      "alertProcessingDelay": "< 30 seconds"
    }
  }
}
```

#### 手动触发安全扫描
```http
POST /audit/security/scan
```

**权限**: 仅管理员

**请求体**:
```json
{
  "scanType": "full_system",
  "priority": "high",
  "targets": [
    "authentication",
    "authorization",
    "data_access",
    "file_uploads"
  ],
  "options": {
    "deepScan": true,
    "includeUserBehavior": true,
    "checkCompliance": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_abc123def456",
    "status": "initiated",
    "scanType": "full_system",
    "startTime": "2025-01-12T10:30:00.000Z",
    "estimatedDuration": "15-20 minutes",
    "scope": {
      "systems": 4,
      "checkpoints": 156,
      "userAccounts": 1234
    },
    "progress": {
      "current": 0,
      "total": 156,
      "percentage": 0
    },
    "statusUrl": "/audit/security/scan/scan_abc123def456/status"
  }
}
```

### 🏥 健康检查

#### 审计系统健康检查
```http
GET /audit/health
```

**权限**: 公开访问

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-12T10:30:00.000Z",
    "services": {
      "auditLogging": "operational",
      "securityMonitoring": "operational",
      "database": "operational",
      "encryption": "operational",
      "alerting": "operational"
    },
    "metrics": {
      "logsPerMinute": 125,
      "eventsPerMinute": 15,
      "responseTime": "< 100ms",
      "diskUsage": "45%",
      "memoryUsage": "67%"
    },
    "dependencies": {
      "database": "healthy",
      "redis": "healthy",
      "elasticsearch": "healthy",
      "email": "healthy"
    },
    "uptime": "99.9%",
    "lastMaintenance": "2025-01-10T02:00:00.000Z"
  }
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `AUDIT_ACCESS_DENIED` | 403 | 审计数据访问被拒绝 | 检查用户权限 |
| `AUDIT_ENCRYPTION_ERROR` | 500 | 审计数据加密失败 | 检查加密配置 |
| `SECURITY_EVENT_NOT_FOUND` | 404 | 安全事件不存在 | 验证事件ID |
| `COMPLIANCE_REPORT_GENERATION_FAILED` | 500 | 合规报告生成失败 | 检查数据完整性 |
| `INTEGRITY_CHECK_FAILED` | 500 | 完整性检查失败 | 数据可能损坏 |
| `EXPORT_SIZE_EXCEEDED` | 413 | 导出数据量超限 | 缩小导出范围 |
| `SUSPICIOUS_ACTIVITY_DETECTED` | 429 | 检测到可疑活动 | 联系管理员 |

### 安全相关错误

特别注意以下安全相关的错误响应，这些可能表明系统正在受到攻击：

- `BRUTE_FORCE_DETECTED` - 暴力破解攻击
- `PRIVILEGE_ESCALATION_ATTEMPT` - 权限提升尝试  
- `ANOMALOUS_ACCESS_PATTERN` - 异常访问模式
- `THREAT_DETECTED` - 威胁检测
- `IP_BLOCKED` - IP被封禁

## 📈 监控与告警

### 关键指标监控
- 审计日志生成速率
- 安全事件触发频率
- 系统响应时间
- 数据完整性状态
- 威胁检测准确率

### 自动告警规则
- 关键安全事件立即通知
- 数据完整性异常告警
- 系统性能下降提醒
- 合规性问题告警
- 异常访问模式检测

## 🔗 相关文档

- [安全架构设计](../design/security-architecture.md)
- [合规性指南](../compliance/gdpr-guide.md)
- [事件响应流程](../security/incident-response.md)
- [监控部署指南](../deployment/monitoring-setup.md)

---

⚠️ **安全提醒**: 
- 审计和安全API包含敏感信息，请确保仅授权人员访问
- 定期轮换JWT密钥和加密密钥
- 监控API访问日志，及时发现异常行为
- 在生产环境中启用HTTPS和其他安全措施