const { DataTypes } = require('sequelize');

/**
 * 登录尝试模型 - 专门记录和监控用户登录尝试，用于安全分析和暴力破解检测
 */
module.exports = (sequelize) => {
  const LoginAttempt = sequelize.define('LoginAttempt', {
    // 基本信息
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '登录尝试唯一标识'
    },
    
    // 用户信息
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '用户ID (成功登录时有值)'
    },
    
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '尝试登录的用户名'
    },
    
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '尝试登录的邮箱'
    },
    
    // 登录结果
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: '登录是否成功'
    },
    
    failureReason: {
      type: DataTypes.ENUM(
        'invalid_credentials',    // 凭据无效
        'user_not_found',        // 用户不存在
        'account_disabled',      // 账户被禁用
        'account_locked',        // 账户被锁定
        'password_expired',      // 密码过期
        'too_many_attempts',     // 尝试次数过多
        'suspicious_activity',   // 可疑活动
        'geo_location_blocked',  // 地理位置被阻止
        'device_not_trusted',    // 设备不受信任
        'mfa_required',          // 需要多重身份验证
        'mfa_failed',            // 多重身份验证失败
        'session_expired',       // 会话过期
        'maintenance_mode',      // 维护模式
        'rate_limited',          // 频率限制
        'captcha_failed',        // 验证码失败
        'other'                  // 其他原因
      ),
      allowNull: true,
      comment: '失败原因 (仅在失败时有值)'
    },
    
    // 网络信息
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: 'IP地址 (支持IPv6)'
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理字符串'
    },
    
    // 地理位置信息
    geoLocation: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '地理位置信息 (国家、城市、ISP等)',
      validate: {
        isValidGeoLocation(value) {
          if (value && typeof value !== 'object') {
            throw new Error('地理位置信息必须是对象格式');
          }
        }
      }
    },
    
    // 设备信息
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '设备信息 (浏览器、操作系统等)'
    },
    
    deviceFingerprint: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '设备指纹'
    },
    
    // 登录方式
    loginMethod: {
      type: DataTypes.ENUM('password', 'oauth', 'sso', 'api_key', 'token', 'biometric', 'other'),
      allowNull: false,
      defaultValue: 'password',
      comment: '登录方式'
    },
    
    // OAuth信息 (如果使用OAuth登录)
    oauthProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'OAuth提供商 (google, github等)'
    },
    
    // 会话信息
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '会话ID (成功登录时有值)'
    },
    
    sessionDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '会话持续时间 (秒)'
    },
    
    // 安全标记
    isSuspicious: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否可疑'
    },
    
    suspiciousReasons: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '可疑原因列表'
    },
    
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: '风险评分 (0-100)'
    },
    
    // 威胁检测
    threatDetected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否检测到威胁'
    },
    
    threatType: {
      type: DataTypes.ENUM('brute_force', 'credential_stuffing', 'dictionary_attack', 'bot', 'malware', 'other'),
      allowNull: true,
      comment: '威胁类型'
    },
    
    // 多重身份验证
    mfaUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否使用了多重身份验证'
    },
    
    mfaMethod: {
      type: DataTypes.ENUM('sms', 'email', 'app', 'hardware_token', 'biometric'),
      allowNull: true,
      comment: '多重身份验证方式'
    },
    
    // 时间信息
    attemptTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '尝试时间'
    },
    
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '响应时间 (毫秒)'
    },
    
    // 频率统计
    previousAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '该IP在过去时间窗口内的尝试次数'
    },
    
    userPreviousAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '该用户在过去时间窗口内的尝试次数'
    },
    
    // 阻断状态
    blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否被阻断'
    },
    
    blockReason: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '阻断原因'
    },
    
    blockDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '阻断持续时间 (秒)'
    },
    
    // 验证码信息
    captchaRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否需要验证码'
    },
    
    captchaSolved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: '验证码是否解决'
    },
    
    // 外部系统信息
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '来源页面'
    },
    
    utmSource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'UTM来源'
    },
    
    // 关联信息
    correlationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '关联ID (用于关联相关事件)'
    },
    
    securityEventId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '关联的安全事件ID'
    },
    
    // 注释信息
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员备注'
    },
    
    // 数据保护
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '敏感数据是否已加密'
    }
  }, {
    sequelize,
    modelName: 'LoginAttempt',
    tableName: 'login_attempts',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['username']
      },
      {
        fields: ['ip_address']
      },
      {
        fields: ['success']
      },
      {
        fields: ['attempt_time']
      },
      {
        fields: ['is_suspicious']
      },
      {
        fields: ['threat_detected']
      },
      {
        fields: ['blocked']
      },
      {
        fields: ['device_fingerprint']
      },
      {
        fields: ['correlation_id']
      },
      {
        name: 'login_attempts_security_monitoring',
        fields: ['ip_address', 'attempt_time', 'success']
      },
      {
        name: 'login_attempts_user_analysis',
        fields: ['username', 'attempt_time', 'success']
      },
      {
        name: 'login_attempts_threat_detection',
        fields: ['threat_detected', 'is_suspicious', 'attempt_time']
      }
    ],
    comment: '用户登录尝试记录表'
  });

  // 静态方法
  
  /**
   * 记录登录尝试
   */
  LoginAttempt.recordAttempt = async function(attemptData) {
    try {
      // 自动计算风险评分
      attemptData.riskScore = await this.calculateRiskScore(attemptData);
      
      // 检查是否可疑
      const suspiciousAnalysis = await this.analyzeSuspiciousActivity(attemptData);
      attemptData.isSuspicious = suspiciousAnalysis.isSuspicious;
      attemptData.suspiciousReasons = suspiciousAnalysis.reasons;
      
      // 统计之前的尝试次数
      attemptData.previousAttempts = await this.countRecentAttempts('ip', attemptData.ipAddress);
      if (attemptData.username) {
        attemptData.userPreviousAttempts = await this.countRecentAttempts('username', attemptData.username);
      }
      
      // 生成关联ID
      if (!attemptData.correlationId) {
        attemptData.correlationId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      return await this.create(attemptData);
    } catch (error) {
      console.error('记录登录尝试失败:', error);
      throw error;
    }
  };
  
  /**
   * 检测暴力破解攻击
   */
  LoginAttempt.detectBruteForceAttack = async function(ipAddress, timeWindow = 300) {
    const since = new Date(Date.now() - timeWindow * 1000);
    
    const failedAttempts = await this.count({
      where: {
        ipAddress,
        success: false,
        attemptTime: { [sequelize.Op.gte]: since }
      }
    });
    
    const threshold = 5; // 5分钟内失败5次视为暴力破解
    const isBruteForce = failedAttempts >= threshold;
    
    if (isBruteForce) {
      // 创建安全事件
      await this.createSecurityEvent({
        eventType: 'brute_force_attack',
        severity: 'high',
        sourceIp: ipAddress,
        title: '检测到暴力破解攻击',
        description: `IP ${ipAddress} 在 ${timeWindow} 秒内失败登录 ${failedAttempts} 次`,
        threatIndicators: [{ type: 'ip', value: ipAddress }],
        detectionMethod: 'rule_based',
        confidenceScore: Math.min(1.0, failedAttempts / 10)
      });
    }
    
    return {
      isBruteForce,
      failedAttempts,
      threshold,
      timeWindow
    };
  };
  
  /**
   * 检测撞库攻击
   */
  LoginAttempt.detectCredentialStuffing = async function(ipAddress, timeWindow = 3600) {
    const since = new Date(Date.now() - timeWindow * 1000);
    
    const uniqueUsernames = await this.findAll({
      where: {
        ipAddress,
        attemptTime: { [sequelize.Op.gte]: since }
      },
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('username')), 'username']
      ],
      raw: true
    });
    
    const threshold = 10; // 1小时内尝试10个不同用户名视为撞库
    const isCredentialStuffing = uniqueUsernames.length >= threshold;
    
    if (isCredentialStuffing) {
      await this.createSecurityEvent({
        eventType: 'credential_stuffing',
        severity: 'high',
        sourceIp: ipAddress,
        title: '检测到撞库攻击',
        description: `IP ${ipAddress} 在 ${timeWindow} 秒内尝试 ${uniqueUsernames.length} 个不同用户名`,
        threatIndicators: [{ type: 'ip', value: ipAddress }],
        detectionMethod: 'rule_based',
        confidenceScore: Math.min(1.0, uniqueUsernames.length / 50)
      });
    }
    
    return {
      isCredentialStuffing,
      uniqueUsernames: uniqueUsernames.length,
      threshold,
      timeWindow
    };
  };
  
  /**
   * 获取登录统计
   */
  LoginAttempt.getLoginStatistics = async function(timeRange = 24) {
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const [totalAttempts, successfulLogins, failedLogins, uniqueIPs, suspiciousAttempts, threatsDetected] = await Promise.all([
      // 总尝试次数
      this.count({
        where: { attemptTime: { [sequelize.Op.gte]: since } }
      }),
      
      // 成功登录
      this.count({
        where: {
          attemptTime: { [sequelize.Op.gte]: since },
          success: true
        }
      }),
      
      // 失败登录
      this.count({
        where: {
          attemptTime: { [sequelize.Op.gte]: since },
          success: false
        }
      }),
      
      // 独特IP数量
      this.count({
        where: { attemptTime: { [sequelize.Op.gte]: since } },
        distinct: true,
        col: 'ipAddress'
      }),
      
      // 可疑尝试
      this.count({
        where: {
          attemptTime: { [sequelize.Op.gte]: since },
          isSuspicious: true
        }
      }),
      
      // 检测到威胁
      this.count({
        where: {
          attemptTime: { [sequelize.Op.gte]: since },
          threatDetected: true
        }
      })
    ]);
    
    return {
      totalAttempts,
      successfulLogins,
      failedLogins,
      successRate: totalAttempts > 0 ? ((successfulLogins / totalAttempts) * 100).toFixed(2) : 0,
      uniqueIPs,
      suspiciousAttempts,
      threatsDetected,
      period: `${timeRange} hours`,
      calculatedAt: new Date()
    };
  };
  
  /**
   * 获取可疑IP列表
   */
  LoginAttempt.getSuspiciousIPs = async function(timeRange = 24, limit = 50) {
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const suspiciousIPs = await this.findAll({
      where: {
        attemptTime: { [sequelize.Op.gte]: since },
        [sequelize.Op.or]: [
          { isSuspicious: true },
          { threatDetected: true },
          { blocked: true }
        ]
      },
      attributes: [
        'ipAddress',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalAttempts'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN success = true THEN 1 ELSE 0 END')), 'successfulAttempts'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN success = false THEN 1 ELSE 0 END')), 'failedAttempts'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('username'))), 'uniqueUsernames'],
        [sequelize.fn('AVG', sequelize.col('riskScore')), 'avgRiskScore'],
        [sequelize.fn('MAX', sequelize.col('attemptTime')), 'lastAttempt']
      ],
      group: ['ipAddress'],
      order: [[sequelize.fn('AVG', sequelize.col('riskScore')), 'DESC']],
      limit,
      raw: true
    });
    
    return suspiciousIPs.map(ip => ({
      ...ip,
      totalAttempts: parseInt(ip.totalAttempts),
      successfulAttempts: parseInt(ip.successfulAttempts),
      failedAttempts: parseInt(ip.failedAttempts),
      uniqueUsernames: parseInt(ip.uniqueUsernames),
      avgRiskScore: parseFloat(ip.avgRiskScore).toFixed(2)
    }));
  };
  
  /**
   * 获取用户登录历史
   */
  LoginAttempt.getUserLoginHistory = async function(userId, limit = 20) {
    return await this.findAll({
      where: { userId },
      order: [['attemptTime', 'DESC']],
      limit,
      attributes: [
        'id',
        'success',
        'failureReason',
        'ipAddress',
        'geoLocation',
        'deviceInfo',
        'loginMethod',
        'attemptTime',
        'riskScore',
        'isSuspicious'
      ]
    });
  };
  
  /**
   * 计算风险评分
   */
  LoginAttempt.calculateRiskScore = async function(attemptData) {
    let riskScore = 0;
    
    // 基础分数
    if (!attemptData.success) {
      riskScore += 20; // 失败登录基础风险
    }
    
    // IP地址历史
    const ipHistory = await this.countRecentAttempts('ip', attemptData.ipAddress);
    if (ipHistory > 10) riskScore += 30;
    else if (ipHistory > 5) riskScore += 15;
    
    // 用户名历史
    if (attemptData.username) {
      const userHistory = await this.countRecentAttempts('username', attemptData.username);
      if (userHistory > 5) riskScore += 20;
      else if (userHistory > 3) riskScore += 10;
    }
    
    // 地理位置异常
    if (attemptData.geoLocation?.country) {
      const userGeoHistory = await this.getUserGeoHistory(attemptData.username);
      if (userGeoHistory.length > 0 && !userGeoHistory.includes(attemptData.geoLocation.country)) {
        riskScore += 25; // 新地理位置
      }
    }
    
    // 设备指纹异常
    if (attemptData.deviceFingerprint) {
      const deviceHistory = await this.getUserDeviceHistory(attemptData.username);
      if (deviceHistory.length > 0 && !deviceHistory.includes(attemptData.deviceFingerprint)) {
        riskScore += 15; // 新设备
      }
    }
    
    // 时间异常 (非工作时间)
    const hour = new Date(attemptData.attemptTime || new Date()).getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 10; // 非正常时间
    }
    
    return Math.min(100, riskScore);
  };
  
  /**
   * 分析可疑活动
   */
  LoginAttempt.analyzeSuspiciousActivity = async function(attemptData) {
    const reasons = [];
    
    // 检查暴力破解
    const bruteForceCheck = await this.detectBruteForceAttack(attemptData.ipAddress);
    if (bruteForceCheck.isBruteForce) {
      reasons.push('brute_force_pattern');
    }
    
    // 检查撞库攻击
    const credentialStuffingCheck = await this.detectCredentialStuffing(attemptData.ipAddress);
    if (credentialStuffingCheck.isCredentialStuffing) {
      reasons.push('credential_stuffing_pattern');
    }
    
    // 异常User-Agent
    if (attemptData.userAgent) {
      const suspiciousUserAgents = ['curl', 'wget', 'python', 'bot', 'crawler'];
      if (suspiciousUserAgents.some(ua => attemptData.userAgent.toLowerCase().includes(ua))) {
        reasons.push('suspicious_user_agent');
      }
    }
    
    // 高风险评分
    if (attemptData.riskScore > 50) {
      reasons.push('high_risk_score');
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  };
  
  /**
   * 统计最近尝试次数
   */
  LoginAttempt.countRecentAttempts = async function(type, value, timeWindow = 3600) {
    const since = new Date(Date.now() - timeWindow * 1000);
    const whereCondition = { attemptTime: { [sequelize.Op.gte]: since } };
    
    if (type === 'ip') {
      whereCondition.ipAddress = value;
    } else if (type === 'username') {
      whereCondition.username = value;
    }
    
    return await this.count({ where: whereCondition });
  };
  
  /**
   * 获取用户地理位置历史
   */
  LoginAttempt.getUserGeoHistory = async function(username, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const geoHistory = await this.findAll({
      where: {
        username,
        success: true,
        attemptTime: { [sequelize.Op.gte]: since }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.literal("geoLocation->>'country'")), 'country']],
      raw: true
    });
    
    return geoHistory.map(item => item.country).filter(Boolean);
  };
  
  /**
   * 获取用户设备历史
   */
  LoginAttempt.getUserDeviceHistory = async function(username, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const deviceHistory = await this.findAll({
      where: {
        username,
        success: true,
        attemptTime: { [sequelize.Op.gte]: since }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('deviceFingerprint')), 'deviceFingerprint']],
      raw: true
    });
    
    return deviceHistory.map(item => item.deviceFingerprint).filter(Boolean);
  };
  
  /**
   * 创建关联的安全事件
   */
  LoginAttempt.createSecurityEvent = async function(eventData) {
    try {
      const { SecurityEvent } = require('./index').models;
      return await SecurityEvent.createEvent(eventData);
    } catch (error) {
      console.error('创建安全事件失败:', error);
    }
  };
  
  /**
   * 搜索登录尝试
   */
  LoginAttempt.searchAttempts = async function(searchParams) {
    const {
      username = '',
      ipAddress = '',
      success = null,
      isSuspicious = null,
      threatDetected = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = searchParams;
    
    const whereConditions = {};
    
    if (username) {
      whereConditions.username = { [sequelize.Op.iLike]: `%${username}%` };
    }
    
    if (ipAddress) {
      whereConditions.ipAddress = { [sequelize.Op.iLike]: `%${ipAddress}%` };
    }
    
    if (success !== null) {
      whereConditions.success = success;
    }
    
    if (isSuspicious !== null) {
      whereConditions.isSuspicious = isSuspicious;
    }
    
    if (threatDetected !== null) {
      whereConditions.threatDetected = threatDetected;
    }
    
    if (startDate || endDate) {
      whereConditions.attemptTime = {};
      if (startDate) whereConditions.attemptTime[sequelize.Op.gte] = startDate;
      if (endDate) whereConditions.attemptTime[sequelize.Op.lte] = endDate;
    }
    
    return await this.findAndCountAll({
      where: whereConditions,
      order: [['attemptTime', 'DESC']],
      limit,
      offset
    });
  };
  
  // 实例方法
  
  /**
   * 标记为可疑
   */
  LoginAttempt.prototype.markAsSuspicious = async function(reason) {
    await this.update({
      isSuspicious: true,
      suspiciousReasons: [...(this.suspiciousReasons || []), reason]
    });
    
    return this;
  };
  
  /**
   * 阻断用户/IP
   */
  LoginAttempt.prototype.block = async function(reason, duration = 3600) {
    await this.update({
      blocked: true,
      blockReason: reason,
      blockDuration: duration
    });
    
    return this;
  };
  
  /**
   * 获取相关尝试
   */
  LoginAttempt.prototype.getRelatedAttempts = async function() {
    const conditions = [];
    
    // 同一IP的尝试
    conditions.push({ ipAddress: this.ipAddress });
    
    // 同一用户名的尝试
    if (this.username) {
      conditions.push({ username: this.username });
    }
    
    // 同一设备指纹的尝试
    if (this.deviceFingerprint) {
      conditions.push({ deviceFingerprint: this.deviceFingerprint });
    }
    
    return await LoginAttempt.findAll({
      where: {
        [sequelize.Op.or]: conditions,
        id: { [sequelize.Op.ne]: this.id }
      },
      order: [['attemptTime', 'DESC']],
      limit: 20
    });
  };

  return LoginAttempt;
};