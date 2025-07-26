const { DataTypes } = require('sequelize');

/**
 * 通知模板模型定义
 * @param {Sequelize} sequelize - Sequelize实例
 * @returns {Model} NotificationTemplate模型
 */
module.exports = (sequelize) => {
  const NotificationTemplate = sequelize.define('NotificationTemplate', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '模板ID'
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '模板代码（唯一标识）'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '模板名称'
    },
    type: {
      type: DataTypes.ENUM([
        'system',
        'borrow_reminder',
        'return_reminder',
        'overdue_warning',
        'reservation',
        'review_reply',
        'points_change',
        'book_available',
        'maintenance',
        'announcement',
        'chat_message',
        'admin_alert'
      ]),
      allowNull: false,
      comment: '通知类型'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '通知标题模板（支持变量替换）'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '通知内容模板（支持变量替换）'
    },
    emailSubject: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '邮件主题模板'
    },
    emailContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '邮件内容模板（HTML格式）'
    },
    smsContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '短信内容模板'
    },
    pushTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '推送标题模板'
    },
    pushContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '推送内容模板'
    },
    priority: {
      type: DataTypes.ENUM(['low', 'normal', 'high', 'urgent']),
      defaultValue: 'normal',
      comment: '默认优先级'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
    },
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '可用变量列表',
      get() {
        const value = this.getDataValue('variables');
        return value || [];
      }
    },
    defaultChannels: {
      type: DataTypes.JSON,
      defaultValue: {
        inApp: true,
        email: false,
        sms: false,
        push: false
      },
      comment: '默认发送渠道',
      get() {
        const value = this.getDataValue('defaultChannels');
        return value || { inApp: true, email: false, sms: false, push: false };
      }
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '触发条件配置',
      get() {
        const value = this.getDataValue('conditions');
        return value || {};
      }
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '模板元数据',
      get() {
        const value = this.getDataValue('metadata');
        return value || {};
      }
    }
  }, {
    tableName: 'notification_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['code'],
        unique: true
      },
      {
        fields: ['type']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // 实例方法
  NotificationTemplate.prototype.render = function(variables = {}) {
    const renderText = (template, vars) => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
      });
    };

    return {
      title: renderText(this.title, variables),
      content: renderText(this.content, variables),
      emailSubject: this.emailSubject ? renderText(this.emailSubject, variables) : null,
      emailContent: this.emailContent ? renderText(this.emailContent, variables) : null,
      smsContent: this.smsContent ? renderText(this.smsContent, variables) : null,
      pushTitle: this.pushTitle ? renderText(this.pushTitle, variables) : null,
      pushContent: this.pushContent ? renderText(this.pushContent, variables) : null
    };
  };

  NotificationTemplate.prototype.validateVariables = function(variables = {}) {
    const requiredVars = this.variables.filter(v => v.required);
    const missingVars = requiredVars.filter(v => !variables.hasOwnProperty(v.name));
    
    return {
      isValid: missingVars.length === 0,
      missingVariables: missingVars.map(v => v.name)
    };
  };

  // 类方法
  NotificationTemplate.findByCode = async function(code) {
    return await this.findOne({
      where: { 
        code, 
        isActive: true 
      }
    });
  };

  NotificationTemplate.findByType = async function(type) {
    return await this.findAll({
      where: { 
        type, 
        isActive: true 
      },
      order: [['name', 'ASC']]
    });
  };

  NotificationTemplate.createFromConfig = async function(config) {
    const template = await this.create(config);
    return template;
  };

  return NotificationTemplate;
};