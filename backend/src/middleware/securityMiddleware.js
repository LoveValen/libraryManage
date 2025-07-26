const securityMonitoringService = require('../services/securityMonitoring.service');
const auditLoggingService = require('../services/auditLogging.service');
const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * 安全中间件 - 实时安全监控和威胁检测
 */
class SecurityMiddleware {
  static blockedIPs = new Set();
  static suspiciousIPs = new Map(); // IP -> { count, lastSeen, reasons }
  static rateLimiters = new Map();

  /**
   * 基础安全检查中间件
   */
  static basicSecurity() {
    return async (req, res, next) => {
      try {
        const clientIP = SecurityMiddleware.getClientIP(req);
        
        // 检查IP黑名单
        if (SecurityMiddleware.blockedIPs.has(clientIP)) {
          SecurityMiddleware.logSecurityEvent('blocked_ip_access', req, {
            reason: 'IP in blocklist',
            ipAddress: clientIP
          });
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied',
            code: 'IP_BLOCKED'
          });
        }

        // 基础威胁检测
        const threatAnalysis = await SecurityMiddleware.performBasicThreatAnalysis(req);
        if (threatAnalysis.blocked) {
          SecurityMiddleware.logSecurityEvent('threat_detected', req, threatAnalysis);
          return res.status(403).json({
            success: false,
            message: 'Security threat detected',
            code: 'THREAT_DETECTED'
          });
        }

        // 添加安全头
        SecurityMiddleware.setSecurityHeaders(res);

        next();
      } catch (error) {
        logger.error('安全检查失败:', error);
        next(); // 继续执行，不因安全检查失败而阻断正常请求
      }
    };
  }

  /**
   * 登录安全中间件
   */
  static loginSecurity() {
    return async (req, res, next) => {
      try {
        const clientIP = SecurityMiddleware.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';
        
        // 记录登录尝试开始
        const attemptData = {
          ipAddress: clientIP,
          userAgent: userAgent,
          username: req.body?.username || req.body?.email,
          attemptTime: new Date(),
          deviceFingerprint: SecurityMiddleware.generateDeviceFingerprint(req)
        };

        // 检测暴力破解
        const recentAttempts = await prisma.login_attempts.count({
          where: {
            ip_address: clientIP,
            created_at: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // 15分钟内
            success: false
          }
        });
        
        const isBruteForce = recentAttempts >= 5;
        if (isBruteForce) {
          SecurityMiddleware.addToBlacklist(clientIP, 3600000); // 1小时
          SecurityMiddleware.logSecurityEvent('brute_force_detected', req, {
            ipAddress: clientIP,
            failedAttempts: recentAttempts
          });
          return res.status(429).json({
            success: false,
            message: 'Too many failed attempts. Please try again later.',
            code: 'BRUTE_FORCE_DETECTED'
          });
        }

        // 检测撞库攻击
        const uniqueUsernames = await prisma.login_attempts.groupBy({
          by: ['username'],
          where: {
            ip_address: clientIP,
            created_at: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // 1小时内
            success: false
          },
          _count: true
        });
        
        const isCredentialStuffing = uniqueUsernames.length >= 10;
        if (isCredentialStuffing) {
          SecurityMiddleware.logSecurityEvent('credential_stuffing_detected', req, {
            ipAddress: clientIP,
            uniqueUsernames: uniqueUsernames.length
          });
          // 不阻断，但增加监控
          SecurityMiddleware.markIPAsSuspicious(clientIP, 'credential_stuffing');
        }

        // 保存尝试数据供后续使用
        req.securityContext = { attemptData, clientIP };

        next();
      } catch (error) {
        logger.error('登录安全检查失败:', error);
        next();
      }
    };
  }

  /**
   * API安全中间件
   */
  static apiSecurity() {
    return async (req, res, next) => {
      try {
        // SQL注入检测
        const sqlInjectionCheck = await securityMonitoringService.detectSQLInjection({
          query: req.query,
          body: req.body,
          params: req.params
        });

        if (sqlInjectionCheck.isInjection) {
          SecurityMiddleware.logSecurityEvent('sql_injection_attempt', req, sqlInjectionCheck);
          return res.status(400).json({
            success: false,
            message: 'Invalid request format',
            code: 'INVALID_REQUEST'
          });
        }

        // XSS攻击检测
        const xssCheck = await securityMonitoringService.detectXSSAttempt({
          query: req.query,
          body: req.body
        });

        if (xssCheck.isXSS) {
          SecurityMiddleware.logSecurityEvent('xss_attempt', req, xssCheck);
          return res.status(400).json({
            success: false,
            message: 'Invalid request content',
            code: 'INVALID_CONTENT'
          });
        }

        next();
      } catch (error) {
        logger.error('API安全检查失败:', error);
        next();
      }
    };
  }

  /**
   * 权限提升检测中间件
   */
  static privilegeEscalationDetection() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return next(); // 无用户信息时跳过检查
        }

        const requestedAction = SecurityMiddleware.mapRouteToAction(req.method, req.path);
        const targetEntity = SecurityMiddleware.extractTargetEntity(req);

        const escalationCheck = await securityMonitoringService.detectPrivilegeEscalation(
          req.user.id,
          requestedAction,
          targetEntity,
          {
            targetUserId: req.params.userId || req.body?.userId,
            requestPath: req.path,
            requestMethod: req.method
          }
        );

        if (escalationCheck.isEscalation) {
          SecurityMiddleware.logSecurityEvent('privilege_escalation_attempt', req, escalationCheck);
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            code: 'PRIVILEGE_ESCALATION_DETECTED'
          });
        }

        next();
      } catch (error) {
        logger.error('权限提升检测失败:', error);
        next();
      }
    };
  }

  /**
   * 数据泄露检测中间件
   */
  static dataExfiltrationDetection() {
    return async (req, res, next) => {
      try {
        // 拦截响应以检测大量数据导出
        const originalJson = res.json;
        const originalSend = res.send;

        res.json = function(data) {
          SecurityMiddleware.checkDataExfiltration(req, data);
          return originalJson.call(this, data);
        };

        res.send = function(data) {
          SecurityMiddleware.checkDataExfiltration(req, data);
          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('数据泄露检测失败:', error);
        next();
      }
    };
  }

  /**
   * 异常访问模式检测中间件
   */
  static abnormalAccessDetection() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return next();
        }

        const entity = SecurityMiddleware.extractTargetEntity(req);
        const accessType = SecurityMiddleware.getAccessType(req);

        // 检测异常数据访问
        const anomalyCheck = await securityMonitoringService.detectAnomalousDataAccess(
          req.user.id,
          entity,
          accessType,
          {
            ipAddress: SecurityMiddleware.getClientIP(req),
            userAgent: req.get('User-Agent'),
            recordCount: SecurityMiddleware.estimateRecordCount(req),
            timeOfDay: new Date().getHours()
          }
        );

        if (anomalyCheck.isAnomalous) {
          SecurityMiddleware.logSecurityEvent('anomalous_data_access', req, anomalyCheck);
          
          // 高风险操作需要额外验证
          if (anomalyCheck.riskScore > 70) {
            return res.status(403).json({
              success: false,
              message: 'Unusual access pattern detected. Additional verification required.',
              code: 'ANOMALOUS_ACCESS'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('异常访问检测失败:', error);
        next();
      }
    };
  }

  /**
   * 创建动态速率限制器
   */
  static createDynamicRateLimit(keyGenerator, options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 最大请求数
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        SecurityMiddleware.logSecurityEvent('rate_limit_exceeded', req, {
          limit: options.max || 100,
          windowMs: options.windowMs || 900000
        });
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      },
      keyGenerator: keyGenerator || ((req) => SecurityMiddleware.getClientIP(req))
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  /**
   * 登录速率限制
   */
  static loginRateLimit() {
    return SecurityMiddleware.createDynamicRateLimit(
      (req) => {
        // 基于IP和用户名的组合键
        const ip = SecurityMiddleware.getClientIP(req);
        const username = req.body?.username || req.body?.email || 'unknown';
        return `login_${ip}_${username}`;
      },
      {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 5, // 每15分钟最多5次尝试
        skipSuccessfulRequests: true
      }
    );
  }

  /**
   * API速率限制
   */
  static apiRateLimit() {
    return SecurityMiddleware.createDynamicRateLimit(
      (req) => {
        // 已认证用户使用用户ID，未认证用户使用IP
        return req.user ? `user_${req.user.id}` : `ip_${SecurityMiddleware.getClientIP(req)}`;
      },
      {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: (req) => {
          // 管理员有更高的限制
          if (req.user?.role === 'admin') return 1000;
          if (req.user) return 500;
          return 100; // 未认证用户限制更严格
        }
      }
    );
  }

  /**
   * 创建速度减缓器
   */
  static createSlowDown(keyGenerator, options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15分钟
      delayAfter: 50, // 50个请求后开始延迟
      delayMs: 500, // 每个请求延迟500ms
      maxDelayMs: 20000, // 最大延迟20秒
      keyGenerator: keyGenerator || ((req) => SecurityMiddleware.getClientIP(req))
    };

    return slowDown({ ...defaultOptions, ...options });
  }

  /**
   * 可疑活动检测中间件
   */
  static suspiciousActivityDetection() {
    return async (req, res, next) => {
      try {
        const clientIP = SecurityMiddleware.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';

        // 检查可疑User-Agent
        if (SecurityMiddleware.isSuspiciousUserAgent(userAgent)) {
          SecurityMiddleware.markIPAsSuspicious(clientIP, 'suspicious_user_agent');
          SecurityMiddleware.logSecurityEvent('suspicious_user_agent_detected', req, {
            userAgent,
            ipAddress: clientIP
          });
        }

        // 检查快速连续请求
        if (SecurityMiddleware.isRapidRequests(clientIP)) {
          SecurityMiddleware.markIPAsSuspicious(clientIP, 'rapid_requests');
          SecurityMiddleware.logSecurityEvent('rapid_requests_detected', req, {
            ipAddress: clientIP
          });
        }

        // 检查地理位置异常
        if (req.user) {
          const geoAnomaly = await SecurityMiddleware.checkGeolocationAnomaly(req.user.id, clientIP);
          if (geoAnomaly.isAnomalous) {
            SecurityMiddleware.logSecurityEvent('geo_location_anomaly', req, geoAnomaly);
          }
        }

        next();
      } catch (error) {
        logger.error('可疑活动检测失败:', error);
        next();
      }
    };
  }

  /**
   * 恶意文件上传检测中间件
   */
  static maliciousFileDetection() {
    return async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return next();
        }

        for (const file of req.files) {
          const malwareCheck = SecurityMiddleware.scanFileForMalware(file);
          
          if (malwareCheck.isMalicious) {
            SecurityMiddleware.logSecurityEvent('malicious_file_upload', req, {
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
              threats: malwareCheck.threats
            });
            
            return res.status(400).json({
              success: false,
              message: 'File upload denied: security threat detected',
              code: 'MALICIOUS_FILE_DETECTED'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('恶意文件检测失败:', error);
        next();
      }
    };
  }

  /**
   * 工具方法
   */

  static getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  static generateDeviceFingerprint(req) {
    const crypto = require('crypto');
    const fingerprint = {
      userAgent: req.get('User-Agent') || '',
      acceptLanguage: req.get('Accept-Language') || '',
      acceptEncoding: req.get('Accept-Encoding') || '',
      connection: req.get('Connection') || ''
    };
    
    return crypto.createHash('md5')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  static setSecurityHeaders(res) {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
  }

  static async performBasicThreatAnalysis(req) {
    const analysis = {
      blocked: false,
      threats: [],
      riskScore: 0
    };

    const clientIP = SecurityMiddleware.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';

    // 检查可疑User-Agent
    if (SecurityMiddleware.isSuspiciousUserAgent(userAgent)) {
      analysis.threats.push('suspicious_user_agent');
      analysis.riskScore += 30;
    }

    // 检查黑名单IP
    if (SecurityMiddleware.isBlacklistedIP(clientIP)) {
      analysis.threats.push('blacklisted_ip');
      analysis.riskScore += 100;
      analysis.blocked = true;
    }

    // 检查可疑IP活动
    if (SecurityMiddleware.suspiciousIPs.has(clientIP)) {
      const suspiciousInfo = SecurityMiddleware.suspiciousIPs.get(clientIP);
      analysis.threats.push(...suspiciousInfo.reasons);
      analysis.riskScore += Math.min(suspiciousInfo.count * 10, 50);
    }

    return analysis;
  }

  static isSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http-client/i,
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /test/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  static isBlacklistedIP(ip) {
    // 检查已知的恶意IP范围
    const blacklistedRanges = [
      '192.0.2.0/24',    // RFC3330 测试网络
      '198.51.100.0/24', // RFC3330 测试网络
      '203.0.113.0/24'   // RFC3330 测试网络
    ];

    // 简化的IP范围检查
    return blacklistedRanges.some(range => {
      // 实际实现中应该使用更精确的IP范围检查
      return ip.startsWith(range.split('/')[0].substring(0, range.split('/')[0].lastIndexOf('.')));
    });
  }

  static addToBlacklist(ip, duration = 3600000) {
    SecurityMiddleware.blockedIPs.add(ip);
    
    // 设置自动移除
    setTimeout(() => {
      SecurityMiddleware.blockedIPs.delete(ip);
    }, duration);
  }

  static markIPAsSuspicious(ip, reason) {
    if (!SecurityMiddleware.suspiciousIPs.has(ip)) {
      SecurityMiddleware.suspiciousIPs.set(ip, {
        count: 0,
        reasons: [],
        lastSeen: new Date()
      });
    }

    const info = SecurityMiddleware.suspiciousIPs.get(ip);
    info.count++;
    info.lastSeen = new Date();
    
    if (!info.reasons.includes(reason)) {
      info.reasons.push(reason);
    }

    // 如果可疑活动过多，自动加入黑名单
    if (info.count >= 10) {
      SecurityMiddleware.addToBlacklist(ip, 7200000); // 2小时
    }
  }

  static isRapidRequests(ip) {
    // 简化的快速请求检测
    const now = Date.now();
    const requestWindow = 60000; // 1分钟
    
    if (!SecurityMiddleware.rateLimiters.has(ip)) {
      SecurityMiddleware.rateLimiters.set(ip, []);
    }

    const requests = SecurityMiddleware.rateLimiters.get(ip);
    
    // 清理过期请求
    const validRequests = requests.filter(time => now - time < requestWindow);
    SecurityMiddleware.rateLimiters.set(ip, validRequests);
    
    // 添加当前请求
    validRequests.push(now);
    
    // 检查是否超过阈值
    return validRequests.length > 60; // 每分钟超过60个请求
  }

  static async checkGeolocationAnomaly(userId, ip) {
    try {
      const geoip = require('geoip-lite');
      const currentGeo = geoip.lookup(ip);
      
      if (!currentGeo) {
        return { isAnomalous: false };
      }

      // 获取用户历史地理位置
      const loginHistory = await prisma.login_attempts.findMany({
        where: {
          user_id: userId,
          success: true,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30天内
        },
        select: {
          ip_address: true
        },
        distinct: ['ip_address']
      });
      
      const userGeoHistory = [];
      for (const login of loginHistory) {
        const geo = geoip.lookup(login.ip_address);
        if (geo && !userGeoHistory.includes(geo.country)) {
          userGeoHistory.push(geo.country);
        }
      }
      
      const isNewLocation = !userGeoHistory.includes(currentGeo.country);
      
      return {
        isAnomalous: isNewLocation,
        currentCountry: currentGeo.country,
        historicalCountries: userGeoHistory,
        riskScore: isNewLocation ? 25 : 0
      };
    } catch (error) {
      logger.error('地理位置异常检查失败:', error);
      return { isAnomalous: false };
    }
  }

  static scanFileForMalware(file) {
    const analysis = {
      isMalicious: false,
      threats: []
    };

    // 检查文件扩展名
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.jsp', '.pl', '.py', '.sh', '.ps1'
    ];

    const fileExt = file.originalname?.toLowerCase().split('.').pop();
    if (dangerousExtensions.includes(`.${fileExt}`)) {
      analysis.isMalicious = true;
      analysis.threats.push('dangerous_extension');
    }

    // 检查MIME类型
    const dangerousMimeTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-dosexec'
    ];

    if (dangerousMimeTypes.includes(file.mimetype)) {
      analysis.isMalicious = true;
      analysis.threats.push('dangerous_mime_type');
    }

    // 检查文件大小异常
    if (file.size > 100 * 1024 * 1024) { // 100MB
      analysis.isMalicious = true;
      analysis.threats.push('suspicious_file_size');
    }

    return analysis;
  }

  static mapRouteToAction(method, path) {
    const actionMap = {
      'GET': 'READ',
      'POST': 'CREATE',
      'PUT': 'UPDATE',
      'PATCH': 'UPDATE',
      'DELETE': 'DELETE'
    };

    let baseAction = actionMap[method.toUpperCase()] || 'UNKNOWN';

    // 特殊路径映射
    if (path.includes('/admin/')) baseAction = 'ADMIN_' + baseAction;
    if (path.includes('/users/') && method === 'PUT') baseAction = 'MODIFY_USER';
    if (path.includes('/permissions/')) baseAction = 'MODIFY_PERMISSIONS';
    if (path.includes('/audit/')) baseAction = 'ACCESS_AUDIT_LOGS';

    return baseAction;
  }

  static extractTargetEntity(req) {
    const pathParts = req.path.split('/').filter(Boolean);
    
    const entityMap = {
      'users': 'User',
      'books': 'Book',
      'borrows': 'Borrow',
      'reviews': 'Review',
      'audit': 'AuditLog',
      'security': 'SecurityEvent'
    };

    for (const part of pathParts) {
      if (entityMap[part]) {
        return entityMap[part];
      }
    }

    return 'Unknown';
  }

  static getAccessType(req) {
    if (req.path.includes('/export')) return 'export';
    if (req.path.includes('/download')) return 'download';
    if (req.method === 'GET') return 'view';
    if (req.method === 'POST') return 'create';
    if (req.method === 'PUT' || req.method === 'PATCH') return 'update';
    if (req.method === 'DELETE') return 'delete';
    return 'unknown';
  }

  static estimateRecordCount(req) {
    // 从查询参数估算可能返回的记录数
    const limit = parseInt(req.query.limit) || 20;
    const isExport = req.path.includes('/export');
    
    if (isExport) {
      return parseInt(req.query.maxRecords) || 1000;
    }
    
    return limit;
  }

  static checkDataExfiltration(req, responseData) {
    try {
      if (!responseData || typeof responseData !== 'object') {
        return;
      }

      let recordCount = 0;
      
      // 计算返回的记录数
      if (Array.isArray(responseData)) {
        recordCount = responseData.length;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        recordCount = responseData.data.length;
      } else if (responseData.rows && Array.isArray(responseData.rows)) {
        recordCount = responseData.rows.length;
      }

      // 检查是否为大量数据导出
      if (recordCount > 500) {
        SecurityMiddleware.logSecurityEvent('large_data_export', req, {
          recordCount,
          entity: SecurityMiddleware.extractTargetEntity(req),
          exportType: SecurityMiddleware.getAccessType(req)
        });
      }
    } catch (error) {
      logger.error('数据泄露检查失败:', error);
    }
  }

  static async logSecurityEvent(eventType, req, details = {}) {
    try {
      const clientIP = SecurityMiddleware.getClientIP(req);
      
      await auditLoggingService.logSystemEvent(
        'security_event',
        'SecurityEvent',
        `安全事件: ${eventType}`,
        {
          request: req,
          riskLevel: SecurityMiddleware.calculateEventRiskLevel(eventType),
          securityFlags: [eventType],
          changes: {
            eventType,
            ipAddress: clientIP,
            userAgent: req.get('User-Agent'),
            ...details
          }
        }
      );
    } catch (error) {
      logger.error('记录安全事件失败:', error);
    }
  }

  static calculateEventRiskLevel(eventType) {
    const riskMap = {
      'blocked_ip_access': 'high',
      'brute_force_detected': 'critical',
      'credential_stuffing_detected': 'high',
      'sql_injection_attempt': 'critical',
      'xss_attempt': 'high',
      'privilege_escalation_attempt': 'critical',
      'anomalous_data_access': 'medium',
      'malicious_file_upload': 'high',
      'large_data_export': 'medium',
      'rate_limit_exceeded': 'low',
      'suspicious_user_agent_detected': 'low',
      'rapid_requests_detected': 'medium',
      'geo_location_anomaly': 'medium'
    };

    return riskMap[eventType] || 'low';
  }
}

module.exports = SecurityMiddleware;