const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash',
    },
    realName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'real_name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^1[3-9]\d{9}$/,
      },
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'student_id',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pointsBalance: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      allowNull: false,
      field: 'points_balance',
    },
    borrowPermission: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['borrow', 'renew', 'reserve'],
      field: 'borrow_permission',
    },
    borrowLimit: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 10,
      allowNull: false,
      field: 'borrow_limit',
    },
    wechatOpenid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
      field: 'wechat_openid',
      comment: '微信用户唯一标识',
    },
    wechatUnionid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
      field: 'wechat_unionid',
      comment: '微信开放平台统一标识',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(USER_ROLES)),
      allowNull: false,
      defaultValue: USER_ROLES.PATRON,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(USER_STATUS)),
      allowNull: false,
      defaultValue: USER_STATUS.ACTIVE,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified',
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_verification_token',
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'phone_verified',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'last_login_ip',
    },
    loginCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'login_count',
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          sms: false,
          push: true,
          dueDateReminder: true,
          overdueNotice: true,
          pointsUpdate: true,
        },
        privacy: {
          profileVisible: true,
          readingHistoryVisible: false,
          pointsVisible: true,
        },
      },
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: false, // 使用软删除
    indexes: [
      {
        fields: ['username'],
      },
      {
        fields: ['email'],
      },
      {
        fields: ['wechat_openid'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['last_login_at'],
      },
      {
        fields: ['is_deleted'],
      },
    ],
    hooks: {
      beforeSave: async (user, options) => {
        // 如果密码字段被修改，则重新哈希
        if (user.changed('passwordHash') && user.passwordHash) {
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
      },
      beforeBulkUpdate: (options) => {
        // 批量更新时更新 updated_at 字段
        options.attributes.updated_at = new Date();
      },
    },
  });

  // 实例方法
  User.prototype.validatePassword = async function(password) {
    if (!this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  };

  User.prototype.updateLoginInfo = async function(ip) {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
    this.loginCount += 1;
    await this.save({ fields: ['lastLoginAt', 'lastLoginIp', 'loginCount'] });
  };

  User.prototype.toSafeJSON = function() {
    const user = this.toJSON();
    delete user.passwordHash;
    delete user.emailVerificationToken;
    delete user.isDeleted;
    delete user.deletedAt;
    return user;
  };

  User.prototype.isAdmin = function() {
    return this.role === USER_ROLES.ADMIN;
  };

  User.prototype.isActive = function() {
    return this.status === USER_STATUS.ACTIVE && !this.isDeleted;
  };

  User.prototype.canBorrow = function() {
    return this.isActive() && this.status !== USER_STATUS.SUSPENDED;
  };

  User.prototype.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.status = USER_STATUS.INACTIVE;
    await this.save();
  };

  // 类方法
  User.findByIdentifier = async function(identifier) {
    return this.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: identifier },
          { email: identifier },
        ],
        isDeleted: false,
      },
    });
  };

  User.findByWechatOpenid = async function(openid) {
    return this.findOne({
      where: {
        wechatOpenid: openid,
        isDeleted: false,
      },
    });
  };

  User.createWechatUser = async function(wechatData, userInfo = {}) {
    return this.create({
      username: `wx_${wechatData.openid.slice(-8)}`,
      wechatOpenid: wechatData.openid,
      wechatUnionid: wechatData.unionid,
      realName: userInfo.nickName,
      avatar: userInfo.avatarUrl,
      role: USER_ROLES.PATRON,
      status: USER_STATUS.ACTIVE,
    });
  };

  User.getActiveCount = async function() {
    return this.count({
      where: {
        status: USER_STATUS.ACTIVE,
        isDeleted: false,
      },
    });
  };

  User.getStatistics = async function() {
    const total = await this.count({ where: { isDeleted: false } });
    const active = await this.count({ 
      where: { 
        status: USER_STATUS.ACTIVE, 
        isDeleted: false 
      } 
    });
    const admins = await this.count({ 
      where: { 
        role: USER_ROLES.ADMIN, 
        isDeleted: false 
      } 
    });
    const newThisMonth = await this.count({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        isDeleted: false,
      },
    });

    return {
      total,
      active,
      admins,
      newThisMonth,
      inactiveRate: total > 0 ? ((total - active) / total * 100).toFixed(2) : 0,
    };
  };

  return User;
};