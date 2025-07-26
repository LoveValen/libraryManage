# 📁 文件管理 API

企业级文件管理系统API，支持安全的文件上传、下载、版本控制、批量处理和云存储集成。

## 🌐 基础信息

**基础路径**: `/files`  
**权限要求**: 基于文件类型的动态权限  
**认证方式**: Bearer Token (JWT)  
**支持格式**: 图片、文档、音视频、电子书等

## 📤 文件上传

### 单文件上传
```http
POST /files/upload
```

**权限**: 已认证用户

**请求格式**: `multipart/form-data`

**请求示例**:
```javascript
const formData = new FormData();
formData.append('file', fileBlob, 'document.pdf');
formData.append('category', 'book_cover');
formData.append('description', '图书封面图片');
formData.append('tags', JSON.stringify(['图书', '封面']));
formData.append('visibility', 'public');

fetch('/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  body: formData
});
```

**表单字段**:
| 字段 | 类型 | 必填 | 描述 | 限制 |
|------|------|------|------|------|
| file | File | ✅ | 文件对象 | 最大100MB |
| category | string | ✅ | 文件分类 | book_cover/ebook/avatar/document |
| description | string | ❌ | 文件描述 | 最长500字符 |
| tags | string | ❌ | 标签JSON数组 | 最多10个标签 |
| visibility | string | ❌ | 可见性 | public/private/restricted |
| folder | string | ❌ | 目标文件夹 | 路径格式: /books/covers |

**响应示例**:
```json
{
  "success": true,
  "message": "文件上传成功",
  "data": {
    "fileId": "file_abc123def456",
    "filename": "document.pdf",
    "originalName": "JavaScript高级程序设计.pdf",
    "mimeType": "application/pdf",
    "size": 5242880,
    "sizeFormatted": "5.0 MB",
    "category": "ebook",
    "path": "/uploads/ebooks/2025/01/file_abc123def456.pdf",
    "url": "https://cdn.yourdomain.com/files/file_abc123def456",
    "thumbnailUrl": "https://cdn.yourdomain.com/thumbnails/file_abc123def456_thumb.jpg",
    "checksum": {
      "md5": "d41d8cd98f00b204e9800998ecf8427e",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb924..."
    },
    "metadata": {
      "width": 1920,
      "height": 1080,
      "duration": null,
      "pageCount": 456,
      "hasPreview": true
    },
    "security": {
      "scanned": true,
      "virusFree": true,
      "scanTimestamp": "2025-01-12T10:30:00.000Z"
    },
    "storage": {
      "provider": "local",
      "region": "us-east-1",
      "encrypted": true
    },
    "uploadedBy": {
      "id": 123,
      "username": "admin"
    },
    "createdAt": "2025-01-12T10:30:00.000Z",
    "expiresAt": null
  }
}
```

### 多文件上传
```http
POST /files/upload/batch
```

**请求示例**:
```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('files', file3);
formData.append('category', 'book_covers');
formData.append('folder', '/books/covers/2025');
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量上传完成",
  "data": {
    "uploadId": "upload_batch_789",
    "totalFiles": 3,
    "successful": 2,
    "failed": 1,
    "results": [
      {
        "filename": "cover1.jpg",
        "status": "success",
        "fileId": "file_001",
        "url": "https://cdn.yourdomain.com/files/file_001"
      },
      {
        "filename": "cover2.jpg", 
        "status": "success",
        "fileId": "file_002",
        "url": "https://cdn.yourdomain.com/files/file_002"
      },
      {
        "filename": "invalid.exe",
        "status": "failed",
        "error": "不支持的文件类型"
      }
    ],
    "summary": {
      "totalSize": 8388608,
      "uploadDuration": "2.3s",
      "averageSpeed": "3.6 MB/s"
    }
  }
}
```

### 分片上传 (大文件)
```http
POST /files/upload/chunked/init
```

**初始化分片上传**:
```json
{
  "filename": "large_video.mp4",
  "totalSize": 524288000,
  "chunkSize": 1048576,
  "totalChunks": 500,
  "mimeType": "video/mp4",
  "category": "video",
  "checksum": "sha256:abc123def456..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "uploadId": "upload_chunked_456",
    "chunkUrls": [
      "https://api.yourdomain.com/files/upload/chunked/upload_chunked_456/0",
      "https://api.yourdomain.com/files/upload/chunked/upload_chunked_456/1"
    ],
    "expiresAt": "2025-01-12T12:30:00.000Z"
  }
}
```

**上传分片**:
```http
POST /files/upload/chunked/{uploadId}/{chunkIndex}
Content-Type: application/octet-stream

[二进制数据]
```

**完成分片上传**:
```http
POST /files/upload/chunked/{uploadId}/complete
```

## 📥 文件下载

### 基础下载
```http
GET /files/{fileId}/download
```

**权限**: 基于文件可见性和用户权限

**查询参数**:
```
quality: 质量等级 (original/high/medium/low)
format: 输出格式 (original/pdf/jpg)
watermark: 是否添加水印 (true/false)
```

**响应**: 直接返回文件流

**响应头**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 5242880
Cache-Control: public, max-age=3600
ETag: "abc123def456"
```

### 在线预览
```http
GET /files/{fileId}/preview
```

**查询参数**:
```
page: 页码 (PDF文档)
size: 预览尺寸 (thumbnail/small/medium/large)
quality: 图片质量 (1-100)
```

**响应示例** (图片文件):
```json
{
  "success": true,
  "data": {
    "fileId": "file_123",
    "previewUrl": "https://cdn.yourdomain.com/previews/file_123_medium.jpg",
    "thumbnailUrl": "https://cdn.yourdomain.com/thumbnails/file_123_thumb.jpg",
    "metadata": {
      "width": 800,
      "height": 600,
      "pages": 1,
      "canPreview": true
    }
  }
}
```

### 流式下载
```http
GET /files/{fileId}/stream
```

**支持断点续传**:
```
Range: bytes=0-1023
```

**响应**:
```
Status: 206 Partial Content
Content-Range: bytes 0-1023/5242880
Content-Length: 1024
```

## 📋 文件管理

### 获取文件列表
```http
GET /files
```

**查询参数**:
```
category: 文件分类
mimeType: MIME类型
uploadedBy: 上传者ID  
folder: 文件夹路径
tags: 标签过滤
dateFrom: 开始日期
dateTo: 结束日期
size: 文件大小范围 (small/medium/large)
status: 文件状态 (active/deleted/quarantine)
sortBy: 排序字段 (name/size/date/downloads)
sortOrder: 排序方向 (asc/desc)
page: 页码
limit: 每页数量
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "fileId": "file_123",
      "filename": "document.pdf",
      "originalName": "用户手册.pdf",
      "category": "document",
      "mimeType": "application/pdf",
      "size": 5242880,
      "sizeFormatted": "5.0 MB",
      "folder": "/documents/manuals",
      "url": "https://cdn.yourdomain.com/files/file_123",
      "thumbnailUrl": "https://cdn.yourdomain.com/thumbnails/file_123_thumb.jpg",
      "downloads": 156,
      "views": 2340,
      "isPublic": true,
      "status": "active",
      "uploadedBy": {
        "id": 123,
        "username": "admin",
        "realName": "管理员"
      },
      "createdAt": "2025-01-12T10:30:00.000Z",
      "lastAccessed": "2025-01-12T15:45:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 156,
    "totalPages": 8
  },
  "statistics": {
    "totalFiles": 156,
    "totalSize": 1073741824,
    "totalSizeFormatted": "1.0 GB",
    "byCategory": {
      "document": 89,
      "image": 45,
      "video": 12,
      "ebook": 10
    }
  }
}
```

### 获取文件详情
```http
GET /files/{fileId}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "fileId": "file_123",
    "filename": "document.pdf",
    "originalName": "JavaScript高级程序设计.pdf",
    "mimeType": "application/pdf",
    "size": 5242880,
    "category": "ebook",
    "folder": "/ebooks/programming",
    "description": "JavaScript编程经典教材",
    "tags": ["JavaScript", "编程", "前端"],
    "visibility": "public",
    "path": "/uploads/ebooks/2025/01/file_123.pdf",
    "url": "https://cdn.yourdomain.com/files/file_123",
    "downloadUrl": "https://api.yourdomain.com/files/file_123/download",
    "previewUrl": "https://cdn.yourdomain.com/previews/file_123.jpg",
    "thumbnailUrl": "https://cdn.yourdomain.com/thumbnails/file_123_thumb.jpg",
    "checksum": {
      "md5": "d41d8cd98f00b204e9800998ecf8427e",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb924..."
    },
    "metadata": {
      "width": null,
      "height": null,
      "duration": null,
      "pageCount": 896,
      "hasText": true,
      "hasImages": true,
      "isSearchable": true,
      "language": "zh-CN",
      "author": "Nicholas C. Zakas",
      "title": "JavaScript高级程序设计",
      "creationDate": "2020-09-01T00:00:00.000Z"
    },
    "security": {
      "scanned": true,
      "virusFree": true,
      "scanDate": "2025-01-12T10:30:00.000Z",
      "quarantined": false,
      "encryptionLevel": "AES-256"
    },
    "access": {
      "downloads": 156,
      "views": 2340,
      "lastDownload": "2025-01-12T15:45:00.000Z",
      "lastView": "2025-01-12T16:20:00.000Z",
      "topDownloaders": [
        {
          "userId": 456,
          "username": "student1",
          "downloads": 3
        }
      ]
    },
    "storage": {
      "provider": "aws_s3",
      "region": "us-east-1",
      "bucket": "library-files",
      "key": "ebooks/2025/01/file_123.pdf",
      "storageClass": "STANDARD",
      "encrypted": true,
      "redundancy": "multi-az"
    },
    "versions": [
      {
        "version": "1.0",
        "fileId": "file_123",
        "uploadDate": "2025-01-12T10:30:00.000Z",
        "isCurrent": true
      },
      {
        "version": "0.9",
        "fileId": "file_122",
        "uploadDate": "2025-01-10T09:15:00.000Z",
        "isCurrent": false
      }
    ],
    "permissions": {
      "canDownload": true,
      "canEdit": false,
      "canDelete": false,
      "canShare": true
    },
    "uploadedBy": {
      "id": 123,
      "username": "admin",
      "realName": "管理员"
    },
    "createdAt": "2025-01-12T10:30:00.000Z",
    "updatedAt": "2025-01-12T10:30:00.000Z",
    "expiresAt": null
  }
}
```

### 更新文件信息
```http
PUT /files/{fileId}
```

**权限**: 文件所有者或管理员

**请求体**:
```json
{
  "filename": "新的文件名.pdf",
  "description": "更新后的描述",
  "tags": ["新标签1", "新标签2"],
  "visibility": "private",
  "folder": "/documents/updated",
  "expiresAt": "2025-12-31T23:59:59.999Z"
}
```

### 移动文件
```http
POST /files/{fileId}/move
```

**请求体**:
```json
{
  "targetFolder": "/documents/archived",
  "newFilename": "archived_document.pdf"
}
```

### 复制文件
```http
POST /files/{fileId}/copy
```

**请求体**:
```json
{
  "targetFolder": "/documents/copies",
  "newFilename": "document_copy.pdf",
  "copyMetadata": true
}
```

### 删除文件
```http
DELETE /files/{fileId}
```

**权限**: 文件所有者或管理员

**查询参数**:
```
permanent: 是否永久删除 (true/false)
```

**响应示例**:
```json
{
  "success": true,
  "message": "文件已删除",
  "data": {
    "fileId": "file_123",
    "deletedAt": "2025-01-12T10:30:00.000Z",
    "permanent": false,
    "recoveryDeadline": "2025-02-12T10:30:00.000Z"
  }
}
```

## 📁 文件夹管理

### 创建文件夹
```http
POST /files/folders
```

**请求体**:
```json
{
  "name": "新文件夹",
  "path": "/documents",
  "description": "文档存储文件夹",
  "visibility": "private",
  "permissions": {
    "allowUpload": true,
    "allowList": false,
    "inheritParent": true
  }
}
```

### 获取文件夹内容
```http
GET /files/folders/{folderPath}
```

**路径编码示例**: `/documents/manuals` → `/files/folders/documents%2Fmanuals`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "folder": {
      "path": "/documents/manuals",
      "name": "manuals",
      "description": "用户手册文件夹",
      "visibility": "private",
      "fileCount": 25,
      "totalSize": 104857600,
      "createdAt": "2024-12-01T00:00:00.000Z"
    },
    "subfolders": [
      {
        "name": "user_guides",
        "path": "/documents/manuals/user_guides",
        "fileCount": 10,
        "size": 52428800
      }
    ],
    "files": [
      {
        "fileId": "file_456",
        "filename": "quick_start.pdf",
        "size": 2097152,
        "mimeType": "application/pdf",
        "createdAt": "2025-01-10T14:30:00.000Z"
      }
    ]
  }
}
```

## 🔍 文件搜索

### 搜索文件
```http
GET /files/search
```

**查询参数**:
```
q: 搜索关键词
type: 搜索类型 (filename/content/metadata)
category: 文件分类
mimeType: MIME类型
sizeMin: 最小文件大小 (bytes)
sizeMax: 最大文件大小 (bytes)
dateFrom: 创建日期范围开始
dateTo: 创建日期范围结束
tags: 标签过滤
uploadedBy: 上传者过滤
hasPreview: 是否有预览
isPublic: 是否公开
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "query": "JavaScript",
    "results": [
      {
        "fileId": "file_123",
        "filename": "javascript_guide.pdf",
        "relevanceScore": 0.95,
        "highlights": [
          "这是一本关于<em>JavaScript</em>开发的指南",
          "<em>JavaScript</em>是现代web开发的核心技术"
        ],
        "matchType": "content",
        "snippet": "...介绍了JavaScript的核心概念和高级特性..."
      }
    ],
    "facets": {
      "categories": [
        { "name": "document", "count": 45 },
        { "name": "ebook", "count": 23 }
      ],
      "mimeTypes": [
        { "name": "application/pdf", "count": 38 },
        { "name": "text/plain", "count": 15 }
      ],
      "sizes": [
        { "range": "0-1MB", "count": 25 },
        { "range": "1-10MB", "count": 30 }
      ]
    },
    "totalResults": 68,
    "searchTime": "0.245s"
  }
}
```

## 📊 文件统计

### 获取存储统计
```http
GET /files/statistics
```

**权限**: 管理员

**查询参数**:
```
period: 统计周期 (day/week/month/year)
groupBy: 分组方式 (category/user/date/size)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalFiles": 12456,
      "totalSize": 10737418240,
      "totalSizeFormatted": "10.0 GB",
      "uniqueUsers": 234,
      "averageFileSize": 862061,
      "storageUsagePercent": 45.2
    },
    "byCategory": [
      {
        "category": "ebook",
        "fileCount": 5678,
        "totalSize": 5368709120,
        "percentage": 50.0
      },
      {
        "category": "image",
        "fileCount": 3456,
        "totalSize": 2147483648,
        "percentage": 20.0
      }
    ],
    "byMimeType": [
      {
        "mimeType": "application/pdf",
        "fileCount": 4567,
        "totalSize": 4294967296
      }
    ],
    "byUser": [
      {
        "userId": 123,
        "username": "admin",
        "fileCount": 567,
        "totalSize": 536870912
      }
    ],
    "trends": {
      "daily": [
        {
          "date": "2025-01-12",
          "uploads": 45,
          "downloads": 234,
          "storage": 104857600
        }
      ]
    },
    "quotas": {
      "perUser": 1073741824,
      "total": 107374182400,
      "used": 48318382080,
      "available": 59055800320
    }
  }
}
```

## 🔧 批量操作

### 批量下载
```http
POST /files/download/batch
```

**请求体**:
```json
{
  "fileIds": ["file_123", "file_456", "file_789"],
  "format": "zip",
  "compression": "medium",
  "includeMetadata": true
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "downloadId": "download_batch_456",
    "status": "preparing",
    "estimatedSize": 52428800,
    "fileCount": 3,
    "downloadUrl": "https://api.yourdomain.com/files/download/batch/download_batch_456",
    "expiresAt": "2025-01-13T10:30:00.000Z"
  }
}
```

### 批量删除
```http
DELETE /files/batch
```

**请求体**:
```json
{
  "fileIds": ["file_123", "file_456"],
  "permanent": false
}
```

### 批量移动
```http
POST /files/move/batch
```

**请求体**:
```json
{
  "fileIds": ["file_123", "file_456"],
  "targetFolder": "/documents/archived"
}
```

## 🔒 文件权限

### 设置文件权限
```http
PUT /files/{fileId}/permissions
```

**权限**: 文件所有者或管理员

**请求体**:
```json
{
  "visibility": "restricted",
  "permissions": [
    {
      "type": "user",
      "id": 456,
      "permissions": ["read", "download"]
    },
    {
      "type": "role",
      "id": "librarian",
      "permissions": ["read", "download", "edit"]
    },
    {
      "type": "group",
      "id": "premium_users",
      "permissions": ["read", "download"]
    }
  ],
  "inheritFolder": false,
  "allowPublicLink": false
}
```

### 创建分享链接
```http
POST /files/{fileId}/share
```

**请求体**:
```json
{
  "type": "public",
  "expiresAt": "2025-01-19T10:30:00.000Z",
  "password": "optional_password",
  "downloadLimit": 100,
  "allowPreview": true,
  "trackAccess": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "shareId": "share_abc123",
    "shareUrl": "https://yourdomain.com/shared/share_abc123",
    "qrCodeUrl": "https://api.yourdomain.com/files/share_abc123/qr",
    "expiresAt": "2025-01-19T10:30:00.000Z",
    "isPasswordProtected": true,
    "downloadLimit": 100,
    "accessCount": 0
  }
}
```

## 🚨 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 描述 | 解决方案 |
|--------|----------|------|----------|
| `FILE_NOT_FOUND` | 404 | 文件不存在 | 检查文件ID |
| `FILE_TOO_LARGE` | 413 | 文件过大 | 使用分片上传或压缩文件 |
| `UNSUPPORTED_FORMAT` | 400 | 不支持的文件格式 | 使用支持的格式 |
| `STORAGE_QUOTA_EXCEEDED` | 413 | 存储配额超限 | 清理旧文件或升级配额 |
| `VIRUS_DETECTED` | 400 | 检测到病毒 | 使用安全的文件 |
| `PERMISSION_DENIED` | 403 | 权限不足 | 联系文件所有者 |
| `FOLDER_NOT_EXISTS` | 404 | 文件夹不存在 | 先创建文件夹 |
| `INVALID_FILENAME` | 400 | 无效的文件名 | 使用合法的文件名 |

## 📊 性能优化

### 上传优化
- 使用分片上传处理大文件
- 启用并行上传提高速度
- 客户端压缩减少传输时间
- 预处理文件（缩略图、预览）

### 下载优化
- CDN加速文件分发
- 支持断点续传
- 智能缓存策略
- 压缩传输

### 存储优化
- 自动文件压缩
- 冷存储归档
- 重复文件检测
- 定期清理临时文件

## 🔗 相关文档

- [文件存储架构](../design/file-storage-architecture.md)
- [CDN配置指南](../deployment/cdn-setup.md)
- [安全扫描配置](../security/file-scanning.md)
- [存储配额管理](../administration/storage-quota.md)

---

⚠️ **文件管理提醒**:
- 定期备份重要文件到多个位置
- 监控存储使用量，及时清理无用文件
- 启用病毒扫描保护系统安全
- 设置适当的访问权限保护敏感文件