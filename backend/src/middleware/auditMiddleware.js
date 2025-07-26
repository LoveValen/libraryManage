const auditLoggingService = require('../services/auditLogging.service');
const { logger } = require('../utils/logger');

/**
 * 审计中间件 - 自动记录API请求的审计日志
 */
class AuditMiddleware {
  /**
   * 基础审计中间件
   */
  static basic() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // 保存原始的res.json方法
      const originalJson = res.json;
      const originalSend = res.send;
      const originalEnd = res.end;
      
      let responseBody = null;
      let responseSize = 0;

      // 拦截响应
      res.json = function(data) {
        responseBody = data;
        responseSize = JSON.stringify(data).length;
        return originalJson.call(this, data);
      };

      res.send = function(data) {
        if (!responseBody) {
          responseBody = data;
          responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
        }
        return originalSend.call(this, data);
      };

      res.end = function(data) {
        if (!responseBody && data) {
          responseBody = data;
          responseSize = typeof data === 'string' ? data.length : Buffer.byteLength(data);
        }
        return originalEnd.call(this, data);
      };

      // 当响应完成时记录审计日志
      res.on('finish', async () => {
        try {
          const endTime = Date.now();
          const executionTime = endTime - startTime;
          
          await AuditMiddleware.logRequest(req, res, {
            executionTime,
            responseSize,
            responseBody: AuditMiddleware.sanitizeResponse(responseBody, req.path)
          });
        } catch (error) {
          logger.error('记录审计日志失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 敏感操作审计中间件
   */
  static sensitive() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // 记录敏感操作开始
      const correlationId = AuditMiddleware.generateCorrelationId();
      req.auditCorrelationId = correlationId;

      try {
        await auditLoggingService.log(
          'sensitive_operation_start',
          AuditMiddleware.extractEntity(req),
          AuditMiddleware.extractEntityId(req),
          `开始执行敏感操作: ${req.method} ${req.path}`,
          {
            userId: req.user?.id,
            userRole: req.user?.role,
            request: req,
            correlationId,
            riskLevel: 'high'
          }
        );
      } catch (error) {
        logger.error('记录敏感操作开始失败:', error);
      }

      // 拦截响应以记录结果
      res.on('finish', async () => {
        try {
          const endTime = Date.now();
          const executionTime = endTime - startTime;
          const success = res.statusCode < 400;

          await auditLoggingService.log(
            'sensitive_operation_end',
            AuditMiddleware.extractEntity(req),
            AuditMiddleware.extractEntityId(req),
            `敏感操作${success ? '成功' : '失败'}: ${req.method} ${req.path}`,
            {
              userId: req.user?.id,
              userRole: req.user?.role,
              request: req,
              correlationId,
              result: success ? 'success' : 'failure',
              executionTime,
              riskLevel: 'high'
            }
          );
        } catch (error) {
          logger.error('记录敏感操作结束失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 数据访问审计中间件
   */
  static dataAccess() {
    return async (req, res, next) => {
      // 只记录成功的响应
      res.on('finish', async () => {
        try {
          if (res.statusCode < 400 && req.method === 'GET') {
            const entity = AuditMiddleware.extractEntity(req);
            const entityId = AuditMiddleware.extractEntityId(req);

            if (entity) {
              await auditLoggingService.logDataAccess(
                req.user?.id,
                entity,
                entityId,
                AuditMiddleware.getAccessType(req),
                {
                  request: req,
                  complianceFlags: AuditMiddleware.getComplianceFlags(entity, req.path)
                }
              );
            }
          }
        } catch (error) {
          logger.error('记录数据访问失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 管理员操作审计中间件
   */
  static adminAction() {
    return async (req, res, next) => {
      // 检查是否是管理员
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      const startTime = Date.now();
      const correlationId = AuditMiddleware.generateCorrelationId();
      req.auditCorrelationId = correlationId;

      // 记录管理员操作
      res.on('finish', async () => {
        try {
          const endTime = Date.now();
          const executionTime = endTime - startTime;
          const success = res.statusCode < 400;

          await auditLoggingService.logAdminAction(
            AuditMiddleware.mapMethodToAction(req.method),
            req.user.id,
            AuditMiddleware.extractEntity(req),
            AuditMiddleware.extractEntityId(req),
            `管理员操作: ${req.method} ${req.path}`,
            {
              request: req,
              result: success ? 'success' : 'failure',
              executionTime,
              correlationId,
              changes: AuditMiddleware.extractChanges(req, res)
            }
          );
        } catch (error) {
          logger.error('记录管理员操作失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 权限变更审计中间件
   */
  static permissionChange() {
    return async (req, res, next) => {
      // 保存原始数据以比较变更
      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          const entityId = AuditMiddleware.extractEntityId(req);
          if (entityId && AuditMiddleware.isPermissionRelated(req.path)) {
            // 获取原始数据
            req.auditOriginalData = await AuditMiddleware.getOriginalData(req);
          }
        } catch (error) {
          logger.error('获取原始数据失败:', error);
        }
      }

      res.on('finish', async () => {
        try {
          if (res.statusCode < 400 && req.auditOriginalData) {
            const changes = AuditMiddleware.calculatePermissionChanges(
              req.auditOriginalData,
              req.body
            );

            if (changes.hasPermissionChanges) {
              await auditLoggingService.logPermissionChange(
                req.user.id,
                AuditMiddleware.extractEntityId(req),
                changes.oldPermissions,
                changes.newPermissions,
                {
                  request: req,
                  changes: changes.details
                }
              );
            }
          }
        } catch (error) {
          logger.error('记录权限变更失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 批量操作审计中间件
   */
  static batchOperation() {
    return async (req, res, next) => {
      const batchId = AuditMiddleware.generateBatchId();
      req.auditBatchId = batchId;

      res.on('finish', async () => {
        try {
          if (res.statusCode < 400) {
            const batchSize = AuditMiddleware.getBatchSize(req);
            
            await auditLoggingService.log(
              'batch_operation',
              AuditMiddleware.extractEntity(req),
              null,
              `批量操作: ${req.method} ${req.path} (${batchSize} 项)`,
              {
                userId: req.user?.id,
                userRole: req.user?.role,
                request: req,
                correlationId: batchId,
                changes: {
                  batchSize,
                  operationType: req.method,
                  affectedItems: AuditMiddleware.extractAffectedItems(req, res)
                },
                riskLevel: batchSize > 100 ? 'high' : 'medium'
              }
            );
          }
        } catch (error) {
          logger.error('记录批量操作失败:', error);
        }
      });

      next();
    };
  }

  /**
   * 记录API请求
   */
  static async logRequest(req, res, options = {}) {
    try {
      const action = AuditMiddleware.mapMethodToAction(req.method);
      const entity = AuditMiddleware.extractEntity(req);
      const entityId = AuditMiddleware.extractEntityId(req);
      const success = res.statusCode < 400;

      // 跳过不需要记录的请求
      if (AuditMiddleware.shouldSkipLogging(req)) {
        return;
      }

      const description = `${action} ${entity || 'API'}: ${req.path}`;
      
      await auditLoggingService.log(
        action,
        entity || 'API',
        entityId,
        description,
        {
          userId: req.user?.id,
          userRole: req.user?.role,
          request: req,
          result: success ? 'success' : 'failure',
          riskLevel: AuditMiddleware.calculateRiskLevel(req, res),
          executionTime: options.executionTime,
          resourceUsage: {
            responseSize: options.responseSize,
            statusCode: res.statusCode
          },
          correlationId: req.auditCorrelationId,
          parentLogId: req.auditParentLogId
        }
      );
    } catch (error) {
      logger.error('记录API请求失败:', error);
    }
  }

  /**
   * 工具方法
   */

  static generateCorrelationId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static mapMethodToAction(method) {
    const actionMap = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    return actionMap[method.toUpperCase()] || 'unknown';
  }

  static extractEntity(req) {
    // 从路径中提取实体名称
    const pathParts = req.path.split('/').filter(part => part && !part.match(/^\d+$/));
    
    // 常见的实体映射
    const entityMap = {
      'users': 'User',
      'books': 'Book',
      'borrows': 'Borrow',
      'reviews': 'Review',
      'points': 'UserPoints',
      'notifications': 'Notification',
      'audit': 'AuditLog',
      'security': 'SecurityEvent'
    };

    for (const part of pathParts) {
      if (entityMap[part]) {
        return entityMap[part];
      }
    }

    return pathParts[0] || null;
  }

  static extractEntityId(req) {
    // 从参数中提取ID
    if (req.params.id) return req.params.id;
    if (req.params.userId) return req.params.userId;
    if (req.params.bookId) return req.params.bookId;
    if (req.params.borrowId) return req.params.borrowId;
    if (req.params.reviewId) return req.params.reviewId;

    // 从路径中提取数字ID
    const pathParts = req.path.split('/');
    for (const part of pathParts) {
      if (part.match(/^\d+$/)) {
        return part;
      }
    }

    return null;
  }

  static getAccessType(req) {
    if (req.path.includes('/export')) return 'export';
    if (req.path.includes('/download')) return 'download';
    if (req.query.download) return 'download';
    return 'view';
  }

  static getComplianceFlags(entity, path) {
    const flags = [];
    
    // 个人数据相关
    const personalDataEntities = ['User', 'UserPoints', 'Review'];
    if (personalDataEntities.includes(entity)) {
      flags.push('gdpr', 'personal_data');
    }

    // 敏感操作
    if (path.includes('/admin/')) {
      flags.push('admin_access');
    }

    // 导出操作
    if (path.includes('/export')) {
      flags.push('data_export');
    }

    return flags;
  }

  static sanitizeResponse(responseBody, path) {
    // 不记录敏感路径的响应体
    const sensitivePatterns = ['/login', '/auth', '/password', '/token'];
    if (sensitivePatterns.some(pattern => path.includes(pattern))) {
      return '[REDACTED]';
    }

    // 限制响应体大小
    if (typeof responseBody === 'string' && responseBody.length > 1000) {
      return responseBody.substring(0, 1000) + '... [TRUNCATED]';
    }

    if (typeof responseBody === 'object') {
      try {
        const jsonStr = JSON.stringify(responseBody);
        if (jsonStr.length > 1000) {
          return '[LARGE_RESPONSE]';
        }
        return responseBody;
      } catch {
        return '[COMPLEX_OBJECT]';
      }
    }

    return responseBody;
  }

  static extractChanges(req, res) {
    const changes = {};

    // 提取请求体变更
    if (req.body && Object.keys(req.body).length > 0) {
      changes.requestData = AuditMiddleware.sanitizeRequestData(req.body);
    }

    // 提取查询参数
    if (req.query && Object.keys(req.query).length > 0) {
      changes.queryParams = req.query;
    }

    // 提取文件上传信息
    if (req.files && req.files.length > 0) {
      changes.uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    return changes;
  }

  static sanitizeRequestData(data) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  static calculateRiskLevel(req, res) {
    let riskScore = 0;

    // 管理员操作
    if (req.user?.role === 'admin') {
      riskScore += 30;
    }

    // 删除操作
    if (req.method === 'DELETE') {
      riskScore += 40;
    }

    // 批量操作
    if (AuditMiddleware.isBatchOperation(req)) {
      riskScore += 20;
    }

    // 失败的操作
    if (res.statusCode >= 400) {
      riskScore += 15;
    }

    // 敏感路径
    if (AuditMiddleware.isSensitivePath(req.path)) {
      riskScore += 25;
    }

    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  static shouldSkipLogging(req) {
    // 跳过健康检查和静态资源
    const skipPatterns = [
      '/health',
      '/ping',
      '/favicon.ico',
      '/static/',
      '/assets/',
      '/.well-known/'
    ];

    return skipPatterns.some(pattern => req.path.includes(pattern));
  }

  static isBatchOperation(req) {
    return req.path.includes('/batch') || 
           (Array.isArray(req.body) && req.body.length > 1) ||
           (req.body?.items && Array.isArray(req.body.items));
  }

  static isSensitivePath(path) {
    const sensitivePatterns = [
      '/admin/',
      '/users/',
      '/auth/',
      '/permissions/',
      '/roles/',
      '/audit/',
      '/security/'
    ];

    return sensitivePatterns.some(pattern => path.includes(pattern));
  }

  static isPermissionRelated(path) {
    return path.includes('/permission') || 
           path.includes('/role') || 
           path.includes('/access');
  }

  static getBatchSize(req) {
    if (Array.isArray(req.body)) return req.body.length;
    if (req.body?.items && Array.isArray(req.body.items)) return req.body.items.length;
    return 1;
  }

  static extractAffectedItems(req, res) {
    // 从响应中提取受影响的项目信息
    try {
      if (res.locals?.affectedItems) {
        return res.locals.affectedItems;
      }
      
      // 从请求中推断
      if (Array.isArray(req.body)) {
        return req.body.map(item => item.id || item._id).filter(Boolean);
      }
      
      return [];
    } catch {
      return [];
    }
  }

  // 占位符方法 (需要根据实际业务逻辑实现)
  static async getOriginalData(req) {
    // 根据实体类型和ID获取原始数据
    return {};
  }

  static calculatePermissionChanges(oldData, newData) {
    // 计算权限变更
    return {
      hasPermissionChanges: false,
      oldPermissions: [],
      newPermissions: [],
      details: {}
    };
  }
}

module.exports = AuditMiddleware;