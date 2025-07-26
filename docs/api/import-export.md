# 📊 数据导入导出 API

企业级数据交换系统API，支持大批量数据导入导出、格式转换、增量同步和数据验证功能。

## 🌐 基础信息

**基础路径**: `/import-export`  
**权限要求**: 管理员或有数据操作权限的用户  
**认证方式**: Bearer Token (JWT)  
**支持格式**: CSV, Excel, JSON, XML, PDF报告

## 📤 数据导出

### 导出图书数据
```http
POST /import-export/books/export
```

**权限**: 管理员或图书管理员

**请求体**:
```json
{
  "format": "excel",
  "filters": {
    "categories": ["技术", "文学"],
    "publishYear": {
      "from": 2020,
      "to": 2025
    },
    "availability": "all",
    "includeDeleted": false
  },
  "fields": [
    "id", "title", "authors", "isbn", "publisher", 
    "publicationYear", "category", "totalStock", 
    "availableStock", "borrowCount", "averageRating"
  ],
  "options": {
    "includeImages": false,
    "includeRelatedData": true,
    "compression": "zip",
    "encryption": {
      "enabled": true,
      "password": "export_password_123"
    },
    "splitFiles": {
      "enabled": true,
      "maxRecordsPerFile": 10000
    }
  },
  "delivery": {
    "method": "download",
    "email": "admin@library.com",
    "notification": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "导出任务已创建",
  "data": {
    "exportId": "export_books_20250112_103000",
    "taskId": "task_abc123def456",
    "status": "processing",
    "estimatedDuration": "5-10 minutes",
    "estimatedSize": "25 MB",
    "recordCount": 15678,
    "format": "excel",
    "progress": {
      "current": 0,
      "total": 15678,
      "percentage": 0,
      "stage": "preparing"
    },
    "downloadUrl": null,
    "expiresAt": "2025-01-19T10:30:00.000Z",
    "statusUrl": "/import-export/exports/export_books_20250112_103000/status",
    "createdAt": "2025-01-12T10:30:00.000Z"
  }
}
```

### 导出用户数据
```http
POST /import-export/users/export
```

**权限**: 仅管理员

**请求体**:
```json
{
  "format": "csv",
  "filters": {
    "roles": ["user", "librarian"],
    "status": ["active", "inactive"],
    "registrationDate": {
      "from": "2024-01-01",
      "to": "2025-01-12"
    },
    "hasActivity": true
  },
  "fields": [
    "id", "username", "email", "realName", "role", 
    "status", "lastLoginAt", "borrowCount", "points"
  ],
  "options": {
    "anonymize": {
      "enabled": true,
      "fields": ["email", "realName"],
      "method": "hash"
    },
    "excludePersonalData": false,
    "includeStatistics": true
  }
}
```

### 导出借阅记录
```http
POST /import-export/borrows/export
```

**请求体**:
```json
{
  "format": "excel",
  "filters": {
    "dateRange": {
      "from": "2024-01-01T00:00:00.000Z",
      "to": "2025-01-12T23:59:59.999Z"
    },
    "status": ["returned", "overdue", "active"],
    "userIds": [123, 456, 789],
    "bookCategories": ["技术", "科学"]
  },
  "fields": [
    "id", "userId", "bookId", "borrowDate", "dueDate", 
    "returnDate", "status", "renewCount", "fineAmount"
  ],
  "groupBy": "month",
  "includeAnalytics": true
}
```

### 导出系统报告
```http
POST /import-export/reports/export
```

**请求体**:
```json
{
  "reportType": "comprehensive",
  "format": "pdf",
  "sections": [
    "user_statistics",
    "book_statistics", 
    "borrowing_trends",
    "popular_books",
    "system_performance",
    "financial_summary"
  ],
  "period": {
    "type": "custom",
    "from": "2024-12-01T00:00:00.000Z",
    "to": "2025-01-12T23:59:59.999Z"
  },
  "options": {
    "includeCharts": true,
    "chartFormat": "svg",
    "template": "executive_summary",
    "language": "zh-CN",
    "branding": {
      "logo": true,
      "colors": "corporate"
    }
  }
}
```

### 获取导出状态
```http
GET /import-export/exports/{exportId}/status
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "exportId": "export_books_20250112_103000",
    "status": "completed",
    "progress": {
      "current": 15678,
      "total": 15678,
      "percentage": 100,
      "stage": "completed",
      "processedRecords": 15678,
      "skippedRecords": 0,
      "errorRecords": 0
    },
    "result": {
      "fileCount": 2,
      "totalSize": 26214400,
      "totalSizeFormatted": "25.0 MB",
      "files": [
        {
          "filename": "books_export_part1.xlsx",
          "size": 13107200,
          "recordCount": 10000,
          "downloadUrl": "https://api.yourdomain.com/downloads/books_export_part1.xlsx"
        },
        {
          "filename": "books_export_part2.xlsx", 
          "size": 13107200,
          "recordCount": 5678,
          "downloadUrl": "https://api.yourdomain.com/downloads/books_export_part2.xlsx"
        }
      ],
      "compressionRatio": 0.65,
      "checksum": "sha256:abc123def456..."
    },
    "duration": "4 minutes 32 seconds",
    "completedAt": "2025-01-12T10:34:32.000Z",
    "expiresAt": "2025-01-19T10:34:32.000Z"
  }
}
```

### 下载导出文件
```http
GET /import-export/exports/{exportId}/download
```

**查询参数**:
```
fileIndex: 文件索引 (多文件导出时)
```

## 📥 数据导入

### 导入图书数据
```http
POST /import-export/books/import
```

**权限**: 管理员或图书管理员

**请求格式**: `multipart/form-data`

**请求示例**:
```javascript
const formData = new FormData();
formData.append('file', fileBlob, 'books_import.xlsx');
formData.append('options', JSON.stringify({
  format: 'excel',
  sheetName: 'Books',
  skipRows: 1,
  mapping: {
    'A': 'title',
    'B': 'authors',
    'C': 'isbn',
    'D': 'publisher',
    'E': 'publicationYear',
    'F': 'category',
    'G': 'totalStock'
  },
  validation: {
    strict: true,
    allowPartialFailure: false,
    duplicateHandling: 'skip'
  },
  processing: {
    batchSize: 100,
    generateMissingData: true,
    autoAssignCategories: true
  }
}));
```

**响应示例**:
```json
{
  "success": true,
  "message": "导入任务已创建",
  "data": {
    "importId": "import_books_20250112_103000",
    "taskId": "task_def456ghi789",
    "status": "processing",
    "estimatedDuration": "3-8 minutes",
    "totalRecords": 2500,
    "validRecords": 2450,
    "invalidRecords": 50,
    "progress": {
      "current": 0,
      "total": 2450,
      "percentage": 0,
      "stage": "validating"
    },
    "validation": {
      "errors": [
        {
          "row": 15,
          "field": "isbn",
          "error": "ISBN格式无效",
          "value": "invalid-isbn"
        }
      ],
      "warnings": [
        {
          "row": 23,
          "field": "category",
          "warning": "未知分类，已自动分配到'其他'",
          "value": "unknown_category"
        }
      ]
    },
    "statusUrl": "/import-export/imports/import_books_20250112_103000/status",
    "previewUrl": "/import-export/imports/import_books_20250112_103000/preview",
    "createdAt": "2025-01-12T10:30:00.000Z"
  }
}
```

### 导入用户数据
```http
POST /import-export/users/import
```

**权限**: 仅管理员

**高级导入选项**:
```json
{
  "format": "csv",
  "encoding": "utf-8",
  "delimiter": ",",
  "mapping": {
    "username": "用户名",
    "email": "邮箱",
    "realName": "真实姓名",
    "role": "角色"
  },
  "validation": {
    "emailFormat": true,
    "usernameUniqueness": true,
    "passwordGeneration": {
      "enabled": true,
      "length": 12,
      "sendEmail": true
    }
  },
  "processing": {
    "welcomeEmail": true,
    "defaultRole": "user",
    "assignDefaultPoints": 100
  }
}
```

### 批量数据更新
```http
POST /import-export/books/update
```

**请求体**:
```json
{
  "updates": [
    {
      "identifier": {
        "type": "isbn",
        "value": "9787115545381"
      },
      "data": {
        "price": 99.00,
        "status": "available",
        "totalStock": 8
      }
    },
    {
      "identifier": {
        "type": "id", 
        "value": "book_123"
      },
      "data": {
        "category": "技术进阶",
        "tags": ["JavaScript", "前端", "高级"]
      }
    }
  ],
  "options": {
    "createIfNotExists": false,
    "validateBeforeUpdate": true,
    "skipErrors": true,
    "auditChanges": true
  }
}
```

### 获取导入状态
```http
GET /import-export/imports/{importId}/status
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "importId": "import_books_20250112_103000",
    "status": "completed",
    "progress": {
      "current": 2450,
      "total": 2450,
      "percentage": 100,
      "stage": "completed"
    },
    "result": {
      "totalRecords": 2500,
      "processedRecords": 2450,
      "successfulRecords": 2380,
      "failedRecords": 70,
      "skippedRecords": 50,
      "createdRecords": 2300,
      "updatedRecords": 80,
      "duplicateRecords": 70
    },
    "summary": {
      "newBooks": 2300,
      "updatedBooks": 80,
      "errors": [
        {
          "type": "validation_error",
          "count": 45,
          "examples": [
            {
              "row": 15,
              "field": "isbn",
              "error": "ISBN已存在",
              "value": "9787115545381"
            }
          ]
        },
        {
          "type": "data_error",
          "count": 25,
          "examples": [
            {
              "row": 45,
              "field": "publicationYear",
              "error": "年份格式无效",
              "value": "invalid_year"
            }
          ]
        }
      ]
    },
    "files": {
      "errorReport": {
        "filename": "import_errors_report.xlsx",
        "downloadUrl": "https://api.yourdomain.com/downloads/import_errors_report.xlsx"
      },
      "successSummary": {
        "filename": "import_success_summary.pdf",
        "downloadUrl": "https://api.yourdomain.com/downloads/import_success_summary.pdf"
      }
    },
    "duration": "6 minutes 45 seconds",
    "completedAt": "2025-01-12T10:36:45.000Z"
  }
}
```

### 导入预览
```http
GET /import-export/imports/{importId}/preview
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "importId": "import_books_20250112_103000",
    "previewData": [
      {
        "row": 1,
        "data": {
          "title": "Vue.js 3.0实战指南",
          "authors": ["张三", "李四"],
          "isbn": "9787111234567",
          "category": "技术"
        },
        "mapping": {
          "title": "A1",
          "authors": "B1", 
          "isbn": "C1",
          "category": "D1"
        },
        "validation": {
          "valid": true,
          "warnings": []
        }
      }
    ],
    "statistics": {
      "totalRows": 2500,
      "validRows": 2450,
      "invalidRows": 50,
      "previewRows": 10
    },
    "fieldMapping": {
      "detected": {
        "A": "title",
        "B": "authors", 
        "C": "isbn",
        "D": "category"
      },
      "suggested": {
        "E": "publisher",
        "F": "publicationYear"
      }
    }
  }
}
```

## 🔄 增量同步

### 配置同步任务
```http
POST /import-export/sync/configure
```

**请求体**:
```json
{
  "name": "外部图书库同步",
  "source": {
    "type": "api",
    "url": "https://external-library.com/api/books",
    "authentication": {
      "type": "api_key",
      "key": "your_api_key"
    },
    "format": "json"
  },
  "target": {
    "entity": "books",
    "updateStrategy": "merge"
  },
  "schedule": {
    "enabled": true,
    "cron": "0 2 * * *",
    "timezone": "Asia/Shanghai"
  },
  "mapping": {
    "id": "external_id",
    "title": "book_title",
    "author": "book_author",
    "isbn": "book_isbn"
  },
  "options": {
    "incrementalSync": true,
    "lastSyncField": "updated_at",
    "conflictResolution": "source_wins",
    "validation": true,
    "notifications": {
      "onSuccess": false,
      "onError": true,
      "recipients": ["admin@library.com"]
    }
  }
}
```

### 手动触发同步
```http
POST /import-export/sync/{syncId}/trigger
```

### 获取同步历史
```http
GET /import-export/sync/{syncId}/history
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "syncId": "sync_external_books",
      "executionId": "exec_123456",
      "status": "completed",
      "startTime": "2025-01-12T02:00:00.000Z",
      "endTime": "2025-01-12T02:15:23.000Z",
      "duration": "15 minutes 23 seconds",
      "result": {
        "recordsChecked": 15000,
        "recordsAdded": 45,
        "recordsUpdated": 123,
        "recordsSkipped": 14832,
        "errors": 0
      },
      "details": {
        "lastSyncTimestamp": "2025-01-11T23:45:00.000Z",
        "nextSyncTimestamp": "2025-01-13T02:00:00.000Z",
        "incrementalSync": true
      }
    }
  ]
}
```

## 📋 模板管理

### 获取导入模板
```http
GET /import-export/templates
```

**查询参数**:
```
entity: 实体类型 (books/users/borrows)
format: 文件格式 (excel/csv)
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "templateId": "books_import_template",
      "name": "图书导入模板",
      "entity": "books",
      "format": "excel",
      "description": "标准图书信息导入模板",
      "fields": [
        {
          "name": "title",
          "label": "书名",
          "type": "string",
          "required": true,
          "maxLength": 255,
          "example": "JavaScript高级程序设计"
        },
        {
          "name": "authors",
          "label": "作者",
          "type": "array",
          "required": true,
          "separator": ",",
          "example": "Nicholas C. Zakas"
        },
        {
          "name": "isbn",
          "label": "ISBN",
          "type": "string",
          "required": true,
          "pattern": "^978[0-9]{10}$",
          "example": "9787115545381"
        }
      ],
      "downloadUrl": "https://api.yourdomain.com/templates/books_import_template.xlsx",
      "version": "1.2",
      "lastUpdated": "2025-01-10T00:00:00.000Z"
    }
  ]
}
```

### 下载模板文件
```http
GET /import-export/templates/{templateId}/download
```

### 创建自定义模板
```http
POST /import-export/templates
```

**权限**: 管理员

**请求体**:
```json
{
  "name": "自定义图书模板",
  "entity": "books",
  "format": "excel",
  "description": "包含扩展字段的图书模板",
  "fields": [
    {
      "name": "title",
      "label": "书名",
      "type": "string",
      "required": true,
      "column": "A"
    },
    {
      "name": "custom_field",
      "label": "自定义字段",
      "type": "string",
      "required": false,
      "column": "Z"
    }
  ],
  "styling": {
    "headerColor": "#4CAF50",
    "requiredFieldColor": "#FF5722",
    "includeInstructions": true
  }
}
```

## 📊 数据验证

### 验证导入数据
```http
POST /import-export/validate
```

**请求体**:
```json
{
  "entity": "books",
  "data": [
    {
      "title": "测试图书",
      "isbn": "9787115545381",
      "authors": ["作者1"],
      "category": "技术"
    }
  ],
  "rules": {
    "strictValidation": true,
    "checkDuplicates": true,
    "validateReferences": true,
    "customRules": [
      {
        "field": "publicationYear",
        "rule": "range",
        "min": 1900,
        "max": 2025
      }
    ]
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "validationResult": "passed",
    "totalRecords": 1,
    "validRecords": 1,
    "invalidRecords": 0,
    "warnings": 0,
    "errors": [],
    "summary": {
      "duplicateCheck": "passed",
      "referenceCheck": "passed",
      "formatValidation": "passed",
      "businessRules": "passed"
    }
  }
}
```

## 📈 任务监控

### 获取所有任务
```http
GET /import-export/tasks
```

**查询参数**:
```
type: 任务类型 (import/export/sync)
status: 任务状态 (pending/processing/completed/failed)
dateFrom: 开始日期
dateTo: 结束日期
userId: 用户过滤
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "taskId": "task_abc123",
      "type": "export",
      "entity": "books",
      "status": "completed",
      "progress": 100,
      "createdBy": {
        "id": 123,
        "username": "admin"
      },
      "createdAt": "2025-01-12T10:30:00.000Z",
      "completedAt": "2025-01-12T10:35:00.000Z",
      "duration": "5 minutes",
      "resultSize": "25.0 MB",
      "recordCount": 15678
    }
  ],
  "statistics": {
    "totalTasks": 156,
    "completedTasks": 142,
    "failedTasks": 8,
    "activeTasks": 6,
    "averageDuration": "8.5 minutes"
  }
}
```

### 取消任务
```http
POST /import-export/tasks/{taskId}/cancel
```

**权限**: 任务创建者或管理员

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `INVALID_FILE_FORMAT` | 400 | 不支持的文件格式 | 使用支持的格式 |
| `FILE_SIZE_EXCEEDED` | 413 | 文件大小超限 | 分割文件或使用流式处理 |
| `VALIDATION_FAILED` | 400 | 数据验证失败 | 检查数据格式和内容 |
| `MAPPING_ERROR` | 400 | 字段映射错误 | 检查字段映射配置 |
| `DUPLICATE_RECORDS` | 409 | 重复记录 | 处理重复数据或跳过 |
| `PERMISSION_DENIED` | 403 | 权限不足 | 确认操作权限 |
| `TASK_NOT_FOUND` | 404 | 任务不存在 | 检查任务ID |
| `QUOTA_EXCEEDED` | 429 | 配额超限 | 等待或联系管理员 |

## 📊 性能优化

### 大文件处理
- 使用流式处理避免内存溢出
- 分批处理提高稳定性
- 并行处理提高速度
- 断点续传支持

### 数据库优化
- 批量操作减少数据库压力
- 索引优化加快查询
- 事务管理保证一致性
- 连接池管理

### 系统资源
- 监控CPU和内存使用
- 磁盘空间管理
- 网络带宽优化
- 缓存策略

## 🔗 相关文档

- [数据格式规范](../specifications/data-formats.md)
- [批量操作最佳实践](../best-practices/bulk-operations.md)
- [系统集成指南](../integration/external-systems.md)
- [性能调优指南](../performance/import-export-optimization.md)

---

⚠️ **数据操作提醒**:
- 大批量操作前务必备份数据
- 验证数据完整性和格式正确性
- 监控系统资源使用情况
- 定期清理临时文件和过期任务