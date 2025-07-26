const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');
const geoip = require('geoip-lite');

/**
 * 安全监控服务 - 实时安全事件检测和威胁分析 (Prisma版本)
 */
class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.threatRules = new Map();
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Set();
    this.whitelistedIPs = new Set();
    this.monitoringIntervals = [];
    this.alertThresholds = {
      bruteForce: 5,           // 5次失败登录
      rapidRequests: 100,      // 100个请求/分钟
      suspiciousIPs: 10,       // 10个可疑IP/小时
      failedOperations: 20,    // 20次失败操作/小时
      dataExfiltration: 1000   // 1000条记录导出
    };
  }

  /**
   * 启动安全监控服务
   */
  async start() {
    try {
      logger.info('🛡️ 启动安全监控服务...');
      
      // 初始化威胁检测规则
      await this.initializeThreatRules();
      
      // 加载IP白名单和黑名单
      await this.loadIPLists();
      
      // 启动实时监控
      this.startRealTimeMonitoring();
      
      // 启动定期扫描
      this.startPeriodicScans();
      
      // 设置事件监听
      this.setupEventListeners();
      
      this.isRunning = true;
      logger.info('✅ 安全监控服务启动成功');
    } catch (error) {
      logger.error('❌ 安全监控服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止安全监控服务
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      logger.info('🛑 停止安全监控服务...');
      
      // 清理监控定时器
      this.monitoringIntervals.forEach(interval => clearInterval(interval));
      this.monitoringIntervals = [];
      
      this.isRunning = false;
      logger.info('✅ 安全监控服务已停止');
    } catch (error) {
      logger.error('❌ 停止安全监控服务失败:', error);
    }
  }

  /**
   * 分析登录尝试
   */
  async analyzeLoginAttempt(attemptData) {
    try {
      const analysis = {
        riskScore: 0,
        threats: [],
        recommendations: [],
        shouldBlock: false
      };

      // 地理位置分析
      const geoAnalysis = await this.analyzeGeolocation(attemptData.ipAddress, attemptData.username);
      analysis.riskScore += geoAnalysis.riskScore;
      if (geoAnalysis.isAnomalous) {
        analysis.threats.push('geo_location_anomaly');
        analysis.recommendations.push('verify_user_location');
      }

      // 频率分析
      const frequencyAnalysis = await this.analyzeLoginFrequency(attemptData.ipAddress, attemptData.username);
      analysis.riskScore += frequencyAnalysis.riskScore;
      if (frequencyAnalysis.isBruteForce) {
        analysis.threats.push('brute_force_attack');
        analysis.shouldBlock = true;
      }

      // 设备指纹分析
      const deviceAnalysis = await this.analyzeDeviceFingerprint(attemptData);
      analysis.riskScore += deviceAnalysis.riskScore;
      if (deviceAnalysis.isNewDevice) {
        analysis.threats.push('new_device_login');
        analysis.recommendations.push('verify_device');
      }

      // User-Agent分析
      const uaAnalysis = this.analyzeUserAgent(attemptData.userAgent);
      analysis.riskScore += uaAnalysis.riskScore;
      if (uaAnalysis.isSuspicious) {
        analysis.threats.push('suspicious_user_agent');
      }

      // 时间模式分析
      const timeAnalysis = this.analyzeTimePattern(attemptData.username);
      analysis.riskScore += timeAnalysis.riskScore;
      if (timeAnalysis.isUnusual) {
        analysis.threats.push('unusual_time_pattern');
      }

      // 创建安全事件（如果需要）
      if (analysis.riskScore > 50 || analysis.threats.length > 0) {
        await this.createSecurityEvent('suspicious_login', analysis, attemptData);
      }

      return analysis;
    } catch (error) {
      logger.error('分析登录尝试失败:', error);
      return { riskScore: 0, threats: [], recommendations: [], shouldBlock: false };
    }
  }

  /**
   * 检测异常数据访问
   */
  async detectAnomalousDataAccess(userId, entity, accessType, options = {}) {
    try {
      const analysis = {
        isAnomalous: false,
        reasons: [],
        riskScore: 0
      };

      // 获取用户历史访问模式
      const accessPattern = await this.getUserAccessPattern(userId, entity);
      
      // 时间异常检测
      if (this.isOutsideNormalHours()) {
        analysis.isAnomalous = true;
        analysis.reasons.push('access_outside_normal_hours');
        analysis.riskScore += 20;
      }

      // 访问频率异常
      const recentAccess = await this.getRecentAccessCount(userId, entity, 3600); // 1小时内
      if (recentAccess > accessPattern.averageHourlyAccess * 3) {
        analysis.isAnomalous = true;
        analysis.reasons.push('excessive_access_frequency');
        analysis.riskScore += 30;
      }

      // 大量数据访问
      if (accessType === 'export' && options.recordCount > 1000) {
        analysis.isAnomalous = true;
        analysis.reasons.push('large_data_export');
        analysis.riskScore += 40;
      }

      // 敏感数据访问
      const sensitiveEntities = ['User', 'UserPoints', 'Review'];
      if (sensitiveEntities.includes(entity)) {
        analysis.riskScore += 10;
        if (!accessPattern.hasAccessToSensitiveData) {
          analysis.isAnomalous = true;
          analysis.reasons.push('unusual_sensitive_data_access');
          analysis.riskScore += 25;
        }
      }

      // 创建安全事件
      if (analysis.isAnomalous) {
        await this.createSecurityEvent('data_access_violation', analysis, {
          userId,
          entity,
          accessType,
          ...options
        });
      }

      return analysis;
    } catch (error) {
      logger.error('检测异常数据访问失败:', error);
      return { isAnomalous: false, reasons: [], riskScore: 0 };
    }
  }

  /**
   * 检测权限提升尝试
   */
  async detectPrivilegeEscalation(userId, requestedAction, targetEntity, options = {}) {
    try {
      const analysis = {
        isEscalation: false,
        reasons: [],
        riskScore: 0
      };

      // 获取用户信息
      const user = await prisma.users.findUnique({
        where: { id: parseInt(userId) }
      });

      if (!user) {
        analysis.isEscalation = true;
        analysis.reasons.push('user_not_found');
        analysis.riskScore = 100;
        return analysis;
      }

      // 检查用户是否有权限执行该操作
      const hasPermission = await this.checkUserPermission(user, requestedAction, targetEntity);
      if (!hasPermission) {
        analysis.isEscalation = true;
        analysis.reasons.push('insufficient_permissions');
        analysis.riskScore += 60;
      }

      // 检查是否尝试修改更高权限的用户
      if (options.targetUserId && parseInt(options.targetUserId) !== userId) {
        const targetUser = await prisma.users.findUnique({
          where: { id: parseInt(options.targetUserId) }
        });

        if (targetUser && this.isHigherRole(targetUser.role, user.role)) {
          analysis.isEscalation = true;
          analysis.reasons.push('modify_higher_role_user');
          analysis.riskScore += 80;
        }
      }

      // 检查敏感操作
      const sensitiveActions = ['DELETE_USER', 'MODIFY_PERMISSIONS', 'ACCESS_AUDIT_LOGS', 'SYSTEM_CONFIG'];
      if (sensitiveActions.includes(requestedAction)) {
        if (user.role !== 'admin') {
          analysis.isEscalation = true;
          analysis.reasons.push('sensitive_action_attempt');
          analysis.riskScore += 70;
        }
      }

      // 检查最近的权限提升尝试
      const recentAttempts = await this.getRecentEscalationAttempts(userId, 3600); // 1小时内
      if (recentAttempts > 3) {
        analysis.reasons.push('multiple_escalation_attempts');
        analysis.riskScore += 30;
      }

      // 创建安全事件
      if (analysis.isEscalation) {
        await this.createSecurityEvent('privilege_escalation', analysis, {
          userId,
          userRole: user.role,
          requestedAction,
          targetEntity,
          ...options
        });
      }

      return analysis;
    } catch (error) {
      logger.error('检测权限提升失败:', error);
      return { isEscalation: false, reasons: [], riskScore: 0 };
    }
  }

  /**
   * 检测SQL注入尝试
   */
  async detectSQLInjection(requestData) {
    try {
      const analysis = {
        isInjection: false,
        patterns: [],
        suspiciousFields: []
      };

      // SQL注入模式列表
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|script|declare|cast|convert)\b)/gi,
        /(--|#|\/\*|\*\/)/g,
        /(\bor\b\s*\d+\s*=\s*\d+)/gi,
        /(\band\b\s*\d+\s*=\s*\d+)/gi,
        /(';|";|`)/g,
        /(\bexec\s*\(|\bexecute\s*\()/gi,
        /(\bwaitfor\s+delay\b)/gi,
        /(\bconcat\s*\(|\bgroup_concat\s*\()/gi,
        /(\binformation_schema\b)/gi,
        /(\bsleep\s*\(|\bbenchmark\s*\()/gi
      ];

      // 检查所有输入数据
      const checkData = (data, path = '') => {
        if (typeof data === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(data)) {
              analysis.isInjection = true;
              analysis.patterns.push(pattern.toString());
              analysis.suspiciousFields.push(path);
              break;
            }
          }
        } else if (typeof data === 'object' && data !== null) {
          for (const [key, value] of Object.entries(data)) {
            checkData(value, path ? `${path}.${key}` : key);
          }
        }
      };

      if (requestData.query) checkData(requestData.query, 'query');
      if (requestData.body) checkData(requestData.body, 'body');
      if (requestData.params) checkData(requestData.params, 'params');

      // 创建安全事件
      if (analysis.isInjection) {
        await this.createSecurityEvent('sql_injection_attempt', analysis, requestData);
      }

      return analysis;
    } catch (error) {
      logger.error('检测SQL注入失败:', error);
      return { isInjection: false, patterns: [], suspiciousFields: [] };
    }
  }

  /**
   * 检测XSS尝试
   */
  async detectXSSAttempt(requestData) {
    try {
      const analysis = {
        isXSS: false,
        patterns: [],
        suspiciousFields: []
      };

      // XSS模式列表
      const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
        /<object[^>]*>[\s\S]*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /<[^>]+on\w+\s*=\s*["'][^"']*["']/gi,
        /javascript\s*:/gi,
        /vbscript\s*:/gi,
        /<img[^>]+src[\\s]*=[\\s]*["']javascript:/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /<[^>]+style\s*=\s*["'][^"']*expression/gi
      ];

      // 检查所有输入数据
      const checkData = (data, path = '') => {
        if (typeof data === 'string') {
          for (const pattern of xssPatterns) {
            if (pattern.test(data)) {
              analysis.isXSS = true;
              analysis.patterns.push(pattern.toString());
              analysis.suspiciousFields.push(path);
              break;
            }
          }
        } else if (typeof data === 'object' && data !== null) {
          for (const [key, value] of Object.entries(data)) {
            checkData(value, path ? `${path}.${key}` : key);
          }
        }
      };

      if (requestData.query) checkData(requestData.query, 'query');
      if (requestData.body) checkData(requestData.body, 'body');

      // 创建安全事件
      if (analysis.isXSS) {
        await this.createSecurityEvent('xss_attempt', analysis, requestData);
      }

      return analysis;
    } catch (error) {
      logger.error('检测XSS失败:', error);
      return { isXSS: false, patterns: [], suspiciousFields: [] };
    }
  }

  /**
   * 分析系统入侵迹象
   */
  async analyzeSystemIntrusion() {
    try {
      const indicators = {
        suspiciousProcesses: [],
        unauthorizedAccess: [],
        configChanges: [],
        anomalousTraffic: [],
        intrusionScore: 0
      };

      // 检测可疑登录模式
      const suspiciousLogins = await this.detectSuspiciousLoginPatterns();
      if (suspiciousLogins.length > 0) {
        indicators.unauthorizedAccess.push(...suspiciousLogins);
        indicators.intrusionScore += suspiciousLogins.length * 10;
      }

      // 检测权限提升尝试
      const escalationAttempts = await this.getRecentEscalationAttempts(null, 3600);
      if (escalationAttempts > 5) {
        indicators.unauthorizedAccess.push({
          type: 'privilege_escalation_attempts',
          count: escalationAttempts
        });
        indicators.intrusionScore += 30;
      }

      // 检测异常数据访问模式
      const anomalousAccess = await this.detectAnomalousAccessPatterns();
      if (anomalousAccess.length > 0) {
        indicators.anomalousTraffic.push(...anomalousAccess);
        indicators.intrusionScore += anomalousAccess.length * 15;
      }

      // 检测配置变更
      const configChanges = await this.getRecentConfigChanges();
      if (configChanges.length > 0) {
        indicators.configChanges.push(...configChanges);
        indicators.intrusionScore += configChanges.length * 20;
      }

      // 创建安全事件（如果检测到入侵迹象）
      if (indicators.intrusionScore > 50) {
        await this.createSecurityEvent('system_intrusion_detected', indicators, {
          severity: indicators.intrusionScore > 100 ? 'critical' : 'high'
        });
      }

      return indicators;
    } catch (error) {
      logger.error('分析系统入侵失败:', error);
      return {
        suspiciousProcesses: [],
        unauthorizedAccess: [],
        configChanges: [],
        anomalousTraffic: [],
        intrusionScore: 0
      };
    }
  }

  /**
   * 获取威胁情报
   */
  async getThreatIntelligence() {
    try {
      const intelligence = {
        knownThreats: [],
        emergingThreats: [],
        blockedIPs: Array.from(this.blockedIPs),
        suspiciousActivities: [],
        recommendations: []
      };

      // 获取已知威胁
      this.threatRules.forEach((rule, threatType) => {
        intelligence.knownThreats.push({
          type: threatType,
          severity: rule.severity,
          description: rule.description
        });
      });

      // 获取可疑活动
      this.suspiciousActivities.forEach((activity, key) => {
        if (activity.count > 3) {
          intelligence.suspiciousActivities.push({
            identifier: key,
            count: activity.count,
            lastSeen: activity.lastSeen
          });
        }
      });

      // 生成建议
      if (intelligence.blockedIPs.length > 50) {
        intelligence.recommendations.push('考虑实施更严格的访问控制策略');
      }
      if (intelligence.suspiciousActivities.length > 10) {
        intelligence.recommendations.push('增强实时监控和告警机制');
      }

      return intelligence;
    } catch (error) {
      logger.error('获取威胁情报失败:', error);
      return {
        knownThreats: [],
        emergingThreats: [],
        blockedIPs: [],
        suspiciousActivities: [],
        recommendations: []
      };
    }
  }

  /**
   * 初始化威胁检测规则
   */
  async initializeThreatRules() {
    // 暴力破解规则
    this.threatRules.set('brute_force', {
      type: 'login_attempts',
      threshold: 5,
      timeWindow: 300, // 5分钟
      severity: 'high',
      description: '短时间内多次登录失败'
    });

    // 扫描探测规则
    this.threatRules.set('port_scan', {
      type: 'connection_attempts',
      threshold: 50,
      timeWindow: 60, // 1分钟
      severity: 'medium',
      description: '大量端口连接尝试'
    });

    // 数据泄露规则
    this.threatRules.set('data_exfiltration', {
      type: 'data_access',
      threshold: 1000,
      timeWindow: 3600, // 1小时
      severity: 'critical',
      description: '大量数据导出'
    });

    // SQL注入规则
    this.threatRules.set('sql_injection', {
      type: 'malicious_input',
      patterns: ['union select', 'drop table', 'exec('],
      severity: 'critical',
      description: 'SQL注入攻击尝试'
    });

    // XSS攻击规则
    this.threatRules.set('xss_attack', {
      type: 'malicious_input',
      patterns: ['<script', 'javascript:', 'onerror='],
      severity: 'high',
      description: 'XSS攻击尝试'
    });
  }

  /**
   * 加载IP黑白名单
   */
  async loadIPLists() {
    try {
      // 从环境变量或配置文件加载白名单
      const whitelistEnv = process.env.WHITELISTED_IPS || '';
      if (whitelistEnv) {
        whitelistEnv.split(',').forEach(ip => this.whitelistedIPs.add(ip.trim()));
      }

      // 添加本地IP到白名单
      this.whitelistedIPs.add('127.0.0.1');
      this.whitelistedIPs.add('::1');

      // 从数据库加载黑名单
      const blockedIPs = await prisma.security_events.findMany({
        where: {
          event_type: 'ip_blocked',
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
          }
        },
        select: {
          event_data: true
        }
      });

      blockedIPs.forEach(event => {
        if (event.event_data?.ipAddress) {
          this.blockedIPs.add(event.event_data.ipAddress);
        }
      });
    } catch (error) {
      logger.error('加载IP名单失败:', error);
    }
  }

  /**
   * 启动实时监控
   */
  startRealTimeMonitoring() {
    // 监控登录尝试
    const loginMonitor = setInterval(() => this.monitorLoginAttempts(), 60000); // 每分钟
    this.monitoringIntervals.push(loginMonitor);

    // 监控可疑活动
    const activityMonitor = setInterval(() => this.monitorSuspiciousActivities(), 300000); // 每5分钟
    this.monitoringIntervals.push(activityMonitor);

    // 监控系统入侵
    const intrusionMonitor = setInterval(() => this.monitorSystemIntrusion(), 600000); // 每10分钟
    this.monitoringIntervals.push(intrusionMonitor);
  }

  /**
   * 启动定期扫描
   */
  startPeriodicScans() {
    // 威胁分析扫描
    const threatScan = setInterval(() => this.performThreatAnalysis(), 3600000); // 每小时
    this.monitoringIntervals.push(threatScan);

    // 安全评估扫描
    const securityScan = setInterval(() => this.performSecurityAssessment(), 86400000); // 每天
    this.monitoringIntervals.push(securityScan);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听关键安全事件
    this.on('critical_threat', async (threat) => {
      await this.handleCriticalEvent(threat);
    });

    // 监听IP封禁事件
    this.on('block_ip', (ip) => {
      this.blockedIPs.add(ip);
    });

    // 监听威胁检测事件
    this.on('threat_detected', async (threat) => {
      await this.blockThreatSource(threat);
    });
  }

  /**
   * 创建安全事件
   */
  async createSecurityEvent(eventType, eventData, contextData = {}) {
    try {
      const severity = this.calculateSeverity(eventType, eventData);
      
      const securityEvent = await this.createEvent({
        event_type: eventType,
        severity,
        event_data: eventData,
        context_data: contextData,
        ip_address: contextData.ipAddress || null,
        user_id: contextData.userId || null,
        user_agent: contextData.userAgent || null,
        risk_score: eventData.riskScore || 0,
        is_blocked: eventData.shouldBlock || false,
        created_at: new Date()
      });

      // 发送告警
      if (severity === 'critical' || severity === 'high') {
        this.emit('critical_threat', securityEvent);
      }

      return securityEvent;
    } catch (error) {
      logger.error('创建安全事件失败:', error);
      throw error;
    }
  }

  /**
   * 创建事件到数据库
   */
  async createEvent(eventData) {
    return prisma.security_events.create({
      data: eventData
    });
  }

  /**
   * 分析地理位置
   */
  async analyzeGeolocation(ipAddress, username) {
    try {
      const geo = geoip.lookup(ipAddress);
      if (!geo) {
        return { riskScore: 0, isAnomalous: false };
      }

      const userGeoHistory = await this.getUserGeoHistory(username, 30);
      
      // 检查是否为新的地理位置
      const isNewLocation = !userGeoHistory.some(h => 
        h.country === geo.country && h.region === geo.region
      );

      // 检查地理位置跳跃
      if (userGeoHistory.length > 0) {
        const lastLocation = userGeoHistory[0];
        const timeDiff = Date.now() - new Date(lastLocation.created_at).getTime();
        const distance = this.calculateDistance(
          lastLocation.latitude, 
          lastLocation.longitude,
          geo.ll[0], 
          geo.ll[1]
        );
        
        // 不可能的旅行速度检测
        const speed = distance / (timeDiff / 3600000); // km/h
        if (speed > 1000) { // 超过1000km/h
          return { 
            riskScore: 80, 
            isAnomalous: true, 
            reason: 'impossible_travel' 
          };
        }
      }

      return {
        riskScore: isNewLocation ? 30 : 0,
        isAnomalous: isNewLocation,
        currentLocation: geo
      };
    } catch (error) {
      logger.error('地理位置分析失败:', error);
      return { riskScore: 0, isAnomalous: false };
    }
  }

  /**
   * 获取用户地理位置历史
   */
  async getUserGeoHistory(username, days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const history = await prisma.login_attempts.findMany({
      where: {
        username,
        created_at: { gte: cutoffDate },
        location: { not: null }
      },
      select: {
        location: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      distinct: ['location']
    });

    return history.map(h => ({
      ...h.location,
      created_at: h.created_at
    }));
  }

  /**
   * 分析登录频率
   */
  async analyzeLoginFrequency(ipAddress, username) {
    try {
      const rule = this.threatRules.get('brute_force');
      const recentAttempts = await this.countRecentAttempts('ip', ipAddress, rule.timeWindow);
      
      const analysis = {
        riskScore: 0,
        isBruteForce: false,
        attemptCount: recentAttempts
      };

      if (recentAttempts >= rule.threshold) {
        analysis.isBruteForce = true;
        analysis.riskScore = 70;
      } else if (recentAttempts >= rule.threshold * 0.6) {
        analysis.riskScore = 30;
      }

      return analysis;
    } catch (error) {
      logger.error('登录频率分析失败:', error);
      return { riskScore: 0, isBruteForce: false, attemptCount: 0 };
    }
  }

  /**
   * 统计最近的尝试次数
   */
  async countRecentAttempts(type, identifier, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    
    const where = {
      created_at: { gte: cutoffTime },
      success: false
    };

    if (type === 'ip') {
      where.ip_address = identifier;
    } else if (type === 'username') {
      where.username = identifier;
    }

    return prisma.login_attempts.count({ where });
  }

  /**
   * 分析设备指纹
   */
  async analyzeDeviceFingerprint(attemptData) {
    try {
      const deviceHistory = await this.getUserDeviceHistory(attemptData.username, 30);
      
      const currentFingerprint = attemptData.deviceFingerprint;
      const isNewDevice = !deviceHistory.some(d => d.device_fingerprint === currentFingerprint);

      return {
        riskScore: isNewDevice ? 20 : 0,
        isNewDevice,
        deviceCount: deviceHistory.length
      };
    } catch (error) {
      logger.error('设备指纹分析失败:', error);
      return { riskScore: 0, isNewDevice: false, deviceCount: 0 };
    }
  }

  /**
   * 获取用户设备历史
   */
  async getUserDeviceHistory(username, days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return prisma.login_attempts.findMany({
      where: {
        username,
        created_at: { gte: cutoffDate },
        device_fingerprint: { not: null },
        success: true
      },
      select: {
        device_fingerprint: true,
        user_agent: true,
        created_at: true
      },
      distinct: ['device_fingerprint']
    });
  }

  /**
   * 分析User-Agent
   */
  analyzeUserAgent(userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    return {
      riskScore: isSuspicious ? 25 : 0,
      isSuspicious
    };
  }

  /**
   * 分析时间模式
   */
  analyzeTimePattern(username) {
    const currentHour = new Date().getHours();
    const isUnusualTime = currentHour < 6 || currentHour > 22;

    return {
      riskScore: isUnusualTime ? 15 : 0,
      isUnusual: isUnusualTime,
      currentHour
    };
  }

  /**
   * 判断是否在正常工作时间外
   */
  isOutsideNormalHours() {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    // 周末
    if (day === 0 || day === 6) return true;
    
    // 工作日非工作时间
    return hour < 8 || hour > 18;
  }

  /**
   * 获取用户访问模式
   */
  async getUserAccessPattern(userId, entity) {
    // 简化实现 - 实际应该从审计日志中分析
    return {
      averageHourlyAccess: 10,
      hasAccessToSensitiveData: false
    };
  }

  /**
   * 获取最近的访问次数
   */
  async getRecentAccessCount(userId, entity, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    
    return prisma.audit_logs.count({
      where: {
        user_id: parseInt(userId),
        entity,
        action: 'view',
        created_at: { gte: cutoffTime }
      }
    });
  }

  /**
   * 检查用户权限
   */
  async checkUserPermission(user, action, entity) {
    // 简化的权限检查 - 实际应该有更复杂的权限系统
    const adminActions = ['DELETE_USER', 'MODIFY_PERMISSIONS', 'ACCESS_AUDIT_LOGS', 'SYSTEM_CONFIG'];
    
    if (adminActions.includes(action)) {
      return user.role === 'admin';
    }
    
    return true;
  }

  /**
   * 判断角色等级
   */
  isHigherRole(role1, role2) {
    const roleHierarchy = {
      'admin': 3,
      'librarian': 2,
      'patron': 1
    };
    
    return (roleHierarchy[role1] || 0) > (roleHierarchy[role2] || 0);
  }

  /**
   * 获取最近的权限提升尝试
   */
  async getRecentEscalationAttempts(userId, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    
    const where = {
      event_type: 'privilege_escalation',
      created_at: { gte: cutoffTime }
    };
    
    if (userId) {
      where.user_id = parseInt(userId);
    }
    
    return prisma.security_events.count({ where });
  }

  /**
   * 检测可疑登录模式
   */
  async detectSuspiciousLoginPatterns() {
    const patterns = [];
    
    // 检测分布式暴力破解
    const distributedAttacks = await prisma.login_attempts.groupBy({
      by: ['username'],
      where: {
        created_at: { gte: new Date(Date.now() - 3600000) }, // 1小时内
        success: false
      },
      _count: {
        ip_address: true
      },
      having: {
        ip_address: {
          _count: { gt: 5 } // 超过5个不同IP
        }
      }
    });
    
    distributedAttacks.forEach(attack => {
      patterns.push({
        type: 'distributed_brute_force',
        username: attack.username,
        ipCount: attack._count.ip_address
      });
    });
    
    return patterns;
  }

  /**
   * 检测异常访问模式
   */
  async detectAnomalousAccessPatterns() {
    const patterns = [];
    
    // 检测大量数据访问
    const bulkAccess = await prisma.audit_logs.groupBy({
      by: ['user_id', 'entity'],
      where: {
        created_at: { gte: new Date(Date.now() - 3600000) }, // 1小时内
        action: { in: ['view', 'export'] }
      },
      _count: true,
      having: {
        _count: { gt: 100 } // 超过100次访问
      }
    });
    
    bulkAccess.forEach(access => {
      patterns.push({
        type: 'bulk_data_access',
        userId: access.user_id,
        entity: access.entity,
        count: access._count
      });
    });
    
    return patterns;
  }

  /**
   * 获取最近的配置变更
   */
  async getRecentConfigChanges() {
    const changes = await prisma.audit_logs.findMany({
      where: {
        created_at: { gte: new Date(Date.now() - 86400000) }, // 24小时内
        entity: { in: ['SystemConfig', 'Permission', 'Role'] },
        action: { in: ['create', 'update', 'delete'] }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });
    
    return changes;
  }

  /**
   * 计算严重性
   */
  calculateSeverity(eventType, eventData) {
    const severityMap = {
      'system_intrusion_detected': 'critical',
      'sql_injection_attempt': 'critical',
      'privilege_escalation': 'high',
      'brute_force_attack': 'high',
      'xss_attempt': 'high',
      'data_access_violation': 'medium',
      'suspicious_login': 'medium',
      'geo_location_anomaly': 'low'
    };
    
    return severityMap[eventType] || 'low';
  }

  /**
   * 计算两点之间的距离（公里）
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 角度转弧度
   */
  toRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * 监控登录尝试
   */
  async monitorLoginAttempts() {
    // 实现监控逻辑
  }

  /**
   * 监控可疑活动
   */
  async monitorSuspiciousActivities() {
    // 实现监控逻辑
  }

  /**
   * 监控系统入侵
   */
  async monitorSystemIntrusion() {
    // 实现监控逻辑
  }

  /**
   * 执行威胁分析
   */
  async performThreatAnalysis() {
    // 实现威胁分析逻辑
  }

  /**
   * 执行安全评估
   */
  async performSecurityAssessment() {
    // 实现安全评估逻辑
  }

  /**
   * 处理关键事件
   */
  async handleCriticalEvent(event) {
    // 实现关键事件处理逻辑
  }

  /**
   * 阻止威胁源
   */
  async blockThreatSource(threat) {
    // 实现威胁源阻止逻辑
  }

  /**
   * 搜索安全事件
   */
  async searchEvents(searchParams) {
    const {
      keyword = '',
      eventType,
      severity,
      startDate,
      endDate,
      userId,
      ipAddress,
      limit = 20,
      offset = 0
    } = searchParams;

    const where = {};

    if (keyword) {
      where.OR = [
        { event_type: { contains: keyword } },
        { event_data: { string_contains: keyword } }
      ];
    }

    if (eventType) where.event_type = eventType;
    if (severity) where.severity = severity;
    if (userId) where.user_id = parseInt(userId);
    if (ipAddress) where.ip_address = ipAddress;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [rows, count] = await Promise.all([
      prisma.security_events.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              real_name: true
            }
          }
        }
      }),
      prisma.security_events.count({ where })
    ]);

    return { rows, count };
  }

  /**
   * 获取高优先级事件
   */
  async getHighPriorityEvents(limit = 10) {
    return prisma.security_events.findMany({
      where: {
        severity: { in: ['critical', 'high'] }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            real_name: true
          }
        }
      }
    });
  }

  /**
   * 查找事件
   */
  async findByPk(eventId) {
    return prisma.security_events.findUnique({
      where: { id: parseInt(eventId) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            real_name: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * 搜索登录尝试
   */
  async searchAttempts(searchParams) {
    const {
      keyword = '',
      username,
      ipAddress,
      success,
      startDate,
      endDate,
      limit = 20,
      offset = 0
    } = searchParams;

    const where = {};

    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { ip_address: { contains: keyword } },
        { user_agent: { contains: keyword } }
      ];
    }

    if (username) where.username = username;
    if (ipAddress) where.ip_address = ipAddress;
    if (success !== undefined) where.success = success === 'true' || success === true;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [rows, count] = await Promise.all([
      prisma.login_attempts.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.login_attempts.count({ where })
    ]);

    return { rows, count };
  }

  /**
   * 获取可疑IP
   */
  async getSuspiciousIPs(timeRange = 24, limit = 10) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const suspiciousIPs = await prisma.login_attempts.groupBy({
      by: ['ip_address'],
      where: {
        created_at: { gte: cutoffTime },
        success: false
      },
      _count: true,
      orderBy: {
        _count: {
          ip_address: 'desc'
        }
      },
      take: limit
    });

    return suspiciousIPs.map(item => ({
      ipAddress: item.ip_address,
      failedAttempts: item._count
    }));
  }

  /**
   * 获取威胁趋势
   */
  async getThreatTrends(days = 7) {
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const startDate = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      const count = await prisma.security_events.count({
        where: {
          created_at: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      
      trends.push({
        date: startDate.toISOString().split('T')[0],
        count
      });
    }
    
    return trends.reverse();
  }

  /**
   * 获取操作趋势
   */
  async getOperationTrends(days = 7) {
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const startDate = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.audit_logs.groupBy({
        by: ['action'],
        where: {
          created_at: {
            gte: startDate,
            lt: endDate
          }
        },
        _count: true
      });
      
      const operations = {};
      stats.forEach(stat => {
        operations[stat.action] = stat._count;
      });
      
      trends.push({
        date: startDate.toISOString().split('T')[0],
        operations
      });
    }
    
    return trends.reverse();
  }
}

module.exports = new SecurityMonitoringService();