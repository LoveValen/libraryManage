const { DataTypes } = require('sequelize');

/**
 * 安全事件模型 - 专门记录和监控系统安全相关事件
 */
module.exports = (sequelize) => {
  const SecurityEvent = sequelize.define('SecurityEvent', {
    // 基本信息
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '安全事件唯一标识'
    },
    
    // 事件分类
    eventType: {
      type: DataTypes.ENUM(
        'authentication_failure',     // 认证失败
        'authorization_failure',      // 授权失败
        'suspicious_login',           // 可疑登录
        'account_lockout',           // 账户锁定
        'privilege_escalation',      // 权限提升
        'data_access_violation',     // 数据访问违规
        'brute_force_attack',        // 暴力破解攻击
        'sql_injection_attempt',     // SQL注入尝试
        'xss_attempt',               // XSS攻击尝试
        'csrf_attempt',              // CSRF攻击尝试
        'malicious_file_upload',     // 恶意文件上传
        'suspicious_user_agent',     // 可疑用户代理
        'rate_limit_exceeded',       // 频率限制超出
        'geo_location_anomaly',      // 地理位置异常
        'unusual_access_pattern',    // 异常访问模式
        'data_exfiltration',         // 数据泄露
        'configuration_change',      // 配置变更
        'system_intrusion',          // 系统入侵
        'malware_detected',          // 恶意软件检测
        'security_policy_violation', // 安全策略违规
        'other'                      // 其他
      ),
      allowNull: false,
      comment: '安全事件类型'
    },
    
    // 严重程度
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      comment: '事件严重程度'
    },
    
    // 事件状态
    status: {
      type: DataTypes.ENUM('new', 'investigating', 'confirmed', 'false_positive', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'new',
      comment: '事件处理状态'
    },
    
    // 关联用户
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '相关用户ID (如果适用)'
    },
    
    // 网络信息
    sourceIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: '源IP地址'
    },
    
    targetIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: '目标IP地址'
    },
    
    // 请求信息
    requestMethod: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP请求方法'
    },
    
    requestUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '请求URL'
    },
    
    requestHeaders: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '请求头信息'
    },
    
    requestBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '请求体内容 (敏感信息已脱敏)'
    },
    
    // 响应信息
    responseCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP响应状态码'
    },
    
    // 设备和环境信息
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理字符串'
    },
    
    deviceFingerprint: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '设备指纹'
    },
    
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '会话标识'
    },
    
    // 地理位置信息
    geoLocation: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '地理位置信息',
      validate: {
        isValidGeoLocation(value) {
          if (value && typeof value !== 'object') {
            throw new Error('地理位置信息必须是对象格式');
          }
        }
      }
    },
    
    // 事件详情
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '事件标题'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '事件详细描述'
    },
    
    // 检测信息
    detectionMethod: {
      type: DataTypes.ENUM('rule_based', 'ml_based', 'manual', 'third_party', 'automated'),
      allowNull: false,
      defaultValue: 'rule_based',
      comment: '检测方法'
    },
    
    detectionRule: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '触发的检测规则'
    },
    
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
      validate: {
        min: 0,
        max: 1
      },
      comment: '置信度分数 (0-1)'
    },
    
    // 威胁情报
    threatIndicators: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '威胁指标 (IoCs)'
    },
    
    mitreTactics: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'MITRE ATT&CK 战术'
    },
    
    mitreTechniques: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'MITRE ATT&CK 技术'
    },
    
    // 影响评估
    affectedSystems: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '受影响的系统'
    },
    
    affectedData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '受影响的数据'
    },
    
    businessImpact: {
      type: DataTypes.ENUM('none', 'minimal', 'moderate', 'significant', 'severe'),
      allowNull: false,
      defaultValue: 'minimal',
      comment: '业务影响程度'
    },
    
    // 响应信息
    responseActions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '响应措施'
    },
    
    assignedTo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '分配给的安全分析师ID'
    },
    
    investigationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '调查笔记'
    },
    
    // 时间信息
    detectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '检测时间'
    },
    
    firstSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '首次发现时间'
    },
    
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后发现时间'
    },
    
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '确认时间'
    },
    
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '解决时间'
    },
    
    // 关联信息
    parentEventId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '父事件ID (事件关联)'
    },
    
    correlationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '关联ID'
    },
    
    auditLogId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '关联的审计日志ID'
    },
    
    // 外部系统信息
    externalEventId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '外部系统事件ID'
    },
    
    externalSystem: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '外部系统名称'
    },
    
    // 统计信息
    occurrenceCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '发生次数'
    },
    
    // 通知状态
    notificationSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已发送通知'
    },
    
    escalated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已升级'
    },
    
    // 数据保护
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '敏感数据是否已加密'
    },
    
    retentionPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2555, // 7年
      comment: '保留天数'
    }
  }, {
    sequelize,
    modelName: 'SecurityEvent',
    tableName: 'security_events',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['event_type']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['status']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['source_ip']
      },
      {
        fields: ['detected_at']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['correlation_id']
      },
      {
        name: 'security_events_monitoring',
        fields: ['severity', 'status', 'detected_at']
      },
      {
        name: 'security_events_investigation',
        fields: ['assigned_to', 'status', 'severity']
      },
      {
        name: 'security_events_correlation',
        fields: ['correlation_id', 'parent_event_id']
      }
    ],
    comment: '安全事件表'
  });

  // 静态方法
  
  /**
   * 创建安全事件
   */
  SecurityEvent.createEvent = async function(eventData) {
    try {
      // 自动设置检测时间
      if (!eventData.detectedAt) {
        eventData.detectedAt = new Date();
      }
      
      // 自动生成关联ID
      if (!eventData.correlationId) {
        eventData.correlationId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      return await this.create(eventData);
    } catch (error) {
      console.error('创建安全事件失败:', error);
      throw error;
    }
  };
  
  /**
   * 获取高优先级事件
   */
  SecurityEvent.getHighPriorityEvents = async function(limit = 20) {
    return await this.findAll({
      where: {
        severity: { [sequelize.Op.in]: ['high', 'critical'] },
        status: { [sequelize.Op.notIn]: ['resolved', 'closed', 'false_positive'] }
      },
      order: [
        ['severity', 'DESC'],
        ['detectedAt', 'DESC']
      ],
      limit
    });
  };
  
  /**
   * 获取待处理事件
   */
  SecurityEvent.getPendingEvents = async function(assignedTo = null) {
    const whereConditions = {
      status: { [sequelize.Op.in]: ['new', 'investigating', 'confirmed'] }
    };
    
    if (assignedTo) {
      whereConditions.assignedTo = assignedTo;
    }
    
    return await this.findAll({
      where: whereConditions,
      order: [
        ['severity', 'DESC'],
        ['detectedAt', 'DESC']
      ]
    });
  };
  
  /**
   * 获取事件统计
   */
  SecurityEvent.getEventStatistics = async function(timeRange = 24) {
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    const [total, bySeverity, byType, byStatus] = await Promise.all([
      // 总事件数
      this.count({
        where: { detectedAt: { [sequelize.Op.gte]: since } }
      }),
      
      // 按严重程度分组
      this.findAll({
        where: { detectedAt: { [sequelize.Op.gte]: since } },
        attributes: [
          'severity',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['severity'],
        raw: true
      }),
      
      // 按事件类型分组
      this.findAll({
        where: { detectedAt: { [sequelize.Op.gte]: since } },
        attributes: [
          'eventType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['eventType'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      }),
      
      // 按状态分组
      this.findAll({
        where: { detectedAt: { [sequelize.Op.gte]: since } },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      })
    ]);
    
    return {
      total,
      bySeverity: this.formatGroupedStats(bySeverity),
      byType: this.formatGroupedStats(byType),
      byStatus: this.formatGroupedStats(byStatus),
      period: `${timeRange} hours`,
      calculatedAt: new Date()
    };
  };
  
  /**
   * 检测重复事件
   */
  SecurityEvent.findDuplicateEvents = async function(eventData, timeWindow = 3600) {
    const windowStart = new Date(Date.now() - timeWindow * 1000);
    
    const similarEvents = await this.findAll({
      where: {
        eventType: eventData.eventType,
        sourceIp: eventData.sourceIp,
        userId: eventData.userId,
        detectedAt: { [sequelize.Op.gte]: windowStart }
      },
      order: [['detectedAt', 'DESC']]
    });
    
    return similarEvents;
  };
  
  /**
   * 自动关联事件
   */
  SecurityEvent.correlateEvents = async function(eventId) {
    const event = await this.findByPk(eventId);
    if (!event) return [];
    
    const correlationCriteria = [];
    
    // 同一用户的事件
    if (event.userId) {
      correlationCriteria.push({
        userId: event.userId,
        detectedAt: {
          [sequelize.Op.between]: [
            new Date(event.detectedAt.getTime() - 30 * 60 * 1000), // 30分钟前
            new Date(event.detectedAt.getTime() + 30 * 60 * 1000)  // 30分钟后
          ]
        }
      });
    }
    
    // 同一IP的事件
    if (event.sourceIp) {
      correlationCriteria.push({
        sourceIp: event.sourceIp,
        detectedAt: {
          [sequelize.Op.between]: [
            new Date(event.detectedAt.getTime() - 60 * 60 * 1000), // 1小时前
            new Date(event.detectedAt.getTime() + 60 * 60 * 1000)  // 1小时后
          ]
        }
      });
    }
    
    if (correlationCriteria.length === 0) return [];
    
    const correlatedEvents = await this.findAll({
      where: {
        [sequelize.Op.or]: correlationCriteria,
        id: { [sequelize.Op.ne]: eventId }
      },
      order: [['detectedAt', 'ASC']]
    });
    
    return correlatedEvents;
  };
  
  /**
   * 威胁趋势分析
   */
  SecurityEvent.getThreatTrends = async function(days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const trends = await this.findAll({
      where: {
        detectedAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('detectedAt')), 'date'],
        'eventType',
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('detectedAt')),
        'eventType',
        'severity'
      ],
      order: [
        [sequelize.fn('DATE', sequelize.col('detectedAt')), 'ASC']
      ],
      raw: true
    });
    
    return this.formatTrendData(trends, days);
  };
  
  /**
   * 搜索安全事件
   */
  SecurityEvent.searchEvents = async function(searchParams) {
    const {
      keyword = '',
      eventType = null,
      severity = null,
      status = null,
      userId = null,
      sourceIp = null,
      assignedTo = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = searchParams;
    
    const whereConditions = {};
    
    // 关键词搜索
    if (keyword) {
      whereConditions[sequelize.Op.or] = [
        { title: { [sequelize.Op.iLike]: `%${keyword}%` } },
        { description: { [sequelize.Op.iLike]: `%${keyword}%` } },
        { sourceIp: { [sequelize.Op.iLike]: `%${keyword}%` } }
      ];
    }
    
    // 具体字段过滤
    if (eventType) whereConditions.eventType = eventType;
    if (severity) whereConditions.severity = severity;
    if (status) whereConditions.status = status;
    if (userId) whereConditions.userId = userId;
    if (sourceIp) whereConditions.sourceIp = sourceIp;
    if (assignedTo) whereConditions.assignedTo = assignedTo;
    
    // 时间范围
    if (startDate || endDate) {
      whereConditions.detectedAt = {};
      if (startDate) whereConditions.detectedAt[sequelize.Op.gte] = startDate;
      if (endDate) whereConditions.detectedAt[sequelize.Op.lte] = endDate;
    }
    
    return await this.findAndCountAll({
      where: whereConditions,
      order: [['detectedAt', 'DESC']],
      limit,
      offset
    });
  };
  
  // 实例方法
  
  /**
   * 确认事件
   */
  SecurityEvent.prototype.acknowledge = async function(userId) {
    await this.update({
      status: 'investigating',
      assignedTo: userId,
      acknowledgedAt: new Date()
    });
    
    return this;
  };
  
  /**
   * 标记为误报
   */
  SecurityEvent.prototype.markAsFalsePositive = async function(reason = '') {
    await this.update({
      status: 'false_positive',
      investigationNotes: (this.investigationNotes || '') + `\n误报原因: ${reason}`,
      resolvedAt: new Date()
    });
    
    return this;
  };
  
  /**
   * 解决事件
   */
  SecurityEvent.prototype.resolve = async function(resolution) {
    await this.update({
      status: 'resolved',
      investigationNotes: (this.investigationNotes || '') + `\n解决方案: ${resolution}`,
      resolvedAt: new Date()
    });
    
    return this;
  };
  
  /**
   * 升级事件
   */
  SecurityEvent.prototype.escalate = async function(newSeverity, reason) {
    await this.update({
      severity: newSeverity,
      escalated: true,
      investigationNotes: (this.investigationNotes || '') + `\n升级原因: ${reason}`
    });
    
    return this;
  };
  
  /**
   * 添加调查笔记
   */
  SecurityEvent.prototype.addInvestigationNote = async function(note, analyst) {
    const timestamp = new Date().toISOString();
    const noteWithMetadata = `[${timestamp}] ${analyst}: ${note}`;
    
    await this.update({
      investigationNotes: (this.investigationNotes || '') + '\n' + noteWithMetadata
    });
    
    return this;
  };
  
  /**
   * 获取事件时间线
   */
  SecurityEvent.prototype.getTimeline = function() {
    const timeline = [
      { event: 'detected', timestamp: this.detectedAt, description: '事件检测' }
    ];
    
    if (this.acknowledgedAt) {
      timeline.push({ event: 'acknowledged', timestamp: this.acknowledgedAt, description: '事件确认' });
    }
    
    if (this.resolvedAt) {
      timeline.push({ event: 'resolved', timestamp: this.resolvedAt, description: '事件解决' });
    }
    
    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };
  
  // 辅助方法
  SecurityEvent.formatGroupedStats = function(stats) {
    const formatted = {};
    stats.forEach(stat => {
      const key = stat.severity || stat.eventType || stat.status;
      formatted[key] = parseInt(stat.count);
    });
    return formatted;
  };
  
  SecurityEvent.formatTrendData = function(trends, days) {
    const dateRange = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }
    
    const formatted = {};
    dateRange.forEach(date => {
      formatted[date] = {
        total: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
      };
    });
    
    trends.forEach(trend => {
      const date = trend.date;
      if (formatted[date]) {
        const count = parseInt(trend.count);
        formatted[date].total += count;
        formatted[date].byType[trend.eventType] = (formatted[date].byType[trend.eventType] || 0) + count;
        formatted[date].bySeverity[trend.severity] += count;
      }
    });
    
    return formatted;
  };

  return SecurityEvent;
};