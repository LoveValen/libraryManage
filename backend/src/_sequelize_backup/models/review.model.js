const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

/**
 * Review模型定义
 * 图书评价系统
 */
const ReviewModel = (sequelize) => {
  const Review = sequelize.define(
    'Review',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: '评价ID',
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: '评价用户ID',
        validate: {
          notNull: {
            msg: '评价用户ID不能为空',
          },
          isInt: {
            msg: '评价用户ID必须是整数',
          },
        },
      },
      bookId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: '图书ID',
        validate: {
          notNull: {
            msg: '图书ID不能为空',
          },
          isInt: {
            msg: '图书ID必须是整数',
          },
        },
      },
      borrowId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: '相关借阅记录ID',
        validate: {
          isInt: {
            msg: '借阅记录ID必须是整数',
          },
        },
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '评分(1-5星)',
        validate: {
          notNull: {
            msg: '评分不能为空',
          },
          isInt: {
            min: 1,
            max: 5,
            msg: '评分必须是1-5之间的整数',
          },
        },
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '评价标题',
        validate: {
          len: {
            args: [1, 100],
            msg: '评价标题长度必须在1-100字符之间',
          },
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '评价内容',
        validate: {
          notEmpty: {
            msg: '评价内容不能为空',
          },
          len: {
            args: [10, 2000],
            msg: '评价内容长度必须在10-2000字符之间',
          },
        },
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '评价标签',
        defaultValue: [],
        validate: {
          isValidTags(value) {
            if (value && !Array.isArray(value)) {
              throw new Error('标签必须是数组格式');
            }
            if (value && value.length > 10) {
              throw new Error('标签数量不能超过10个');
            }
            if (value && value.some(tag => typeof tag !== 'string' || tag.length > 20)) {
              throw new Error('每个标签必须是字符串且长度不超过20字符');
            }
          },
        },
      },
      isRecommended: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否推荐此图书',
      },
      helpfulCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '有用评价数量',
        validate: {
          min: {
            args: 0,
            msg: '有用评价数量不能小于0',
          },
        },
      },
      unhelpfulCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '无用评价数量',
        validate: {
          min: {
            args: 0,
            msg: '无用评价数量不能小于0',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'published', 'hidden', 'deleted'),
        allowNull: false,
        defaultValue: 'published',
        comment: '评价状态: pending-待审核, published-已发布, hidden-已隐藏, deleted-已删除',
      },
      moderatorId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: '审核管理员ID',
      },
      moderatorNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '管理员审核备注',
      },
      moderatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '审核时间',
      },
      isVerifiedPurchase: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否为已借阅用户的评价',
      },
      readingProgress: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '阅读进度百分比(0-100)',
        validate: {
          min: {
            args: 0,
            msg: '阅读进度不能小于0',
          },
          max: {
            args: 100,
            msg: '阅读进度不能大于100',
          },
        },
      },
      readingTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '阅读时长(分钟)',
        validate: {
          min: {
            args: 0,
            msg: '阅读时长不能小于0',
          },
        },
      },
      spoilerAlert: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否包含剧透',
      },
      language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'zh-CN',
        comment: '评价语言',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '更新时间',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '软删除时间',
      },
    },
    {
      tableName: 'reviews',
      timestamps: true,
      paranoid: true, // 启用软删除
      underscored: true,
      indexes: [
        {
          fields: ['user_id'],
          name: 'idx_reviews_user_id',
        },
        {
          fields: ['book_id'],
          name: 'idx_reviews_book_id',
        },
        {
          fields: ['borrow_id'],
          name: 'idx_reviews_borrow_id',
        },
        {
          fields: ['rating'],
          name: 'idx_reviews_rating',
        },
        {
          fields: ['status'],
          name: 'idx_reviews_status',
        },
        {
          fields: ['created_at'],
          name: 'idx_reviews_created_at',
        },
        {
          fields: ['is_recommended'],
          name: 'idx_reviews_is_recommended',
        },
        {
          fields: ['user_id', 'book_id'],
          unique: true,
          name: 'uk_reviews_user_book',
          where: {
            deleted_at: null,
          },
        },
      ],
    }
  );

  // 实例方法
  Review.prototype.toSafeJSON = function () {
    const values = this.toJSON();
    
    // 移除敏感信息
    delete values.moderatorNotes;
    if (this.status !== 'published') {
      delete values.content;
    }
    
    return values;
  };

  Review.prototype.calculateHelpfulScore = function () {
    const total = this.helpfulCount + this.unhelpfulCount;
    if (total === 0) return 0;
    return (this.helpfulCount / total * 100).toFixed(1);
  };

  Review.prototype.markAsHelpful = async function () {
    await this.increment('helpfulCount');
    return this.reload();
  };

  Review.prototype.markAsUnhelpful = async function () {
    await this.increment('unhelpfulCount');
    return this.reload();
  };

  Review.prototype.moderate = async function (moderatorId, status, notes = null) {
    const updates = {
      status,
      moderatorId,
      moderatedAt: new Date(),
    };
    
    if (notes) {
      updates.moderatorNotes = notes;
    }
    
    return this.update(updates);
  };

  // 类方法
  Review.getAverageRating = async function (bookId) {
    const result = await this.findOne({
      where: {
        bookId,
        status: 'published',
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
      ],
      raw: true,
    });

    return {
      averageRating: result.averageRating ? parseFloat(result.averageRating).toFixed(1) : 0,
      totalReviews: parseInt(result.totalReviews) || 0,
    };
  };

  Review.getRatingDistribution = async function (bookId) {
    const distribution = await this.findAll({
      where: {
        bookId,
        status: 'published',
      },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['rating'],
      order: [['rating', 'DESC']],
      raw: true,
    });

    // 确保包含所有评分级别
    const result = {};
    for (let i = 5; i >= 1; i--) {
      result[i] = 0;
    }

    distribution.forEach(item => {
      result[item.rating] = parseInt(item.count);
    });

    return result;
  };

  Review.getTopReviews = async function (bookId, options = {}) {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'helpful',
      includeUser = true,
    } = options;

    let order;
    switch (sortBy) {
      case 'helpful':
        order = [
          [sequelize.literal('(helpful_count - unhelpful_count)'), 'DESC'],
          ['created_at', 'DESC'],
        ];
        break;
      case 'newest':
        order = [['created_at', 'DESC']];
        break;
      case 'oldest':
        order = [['created_at', 'ASC']];
        break;
      case 'rating_high':
        order = [['rating', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'rating_low':
        order = [['rating', 'ASC'], ['created_at', 'DESC']];
        break;
      default:
        order = [['created_at', 'DESC']];
    }

    const include = [];
    if (includeUser) {
      include.push({
        association: 'user',
        attributes: ['id', 'username', 'realName', 'avatar'],
      });
    }

    return this.findAndCountAll({
      where: {
        bookId,
        status: 'published',
      },
      include,
      order,
      limit,
      offset,
      distinct: true,
    });
  };

  Review.getUserReviews = async function (userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      includeBook = true,
    } = options;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const include = [];
    if (includeBook) {
      include.push({
        association: 'book',
        attributes: ['id', 'title', 'authors', 'coverImage'],
      });
    }

    return this.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });
  };

  Review.checkCanReview = async function (userId, bookId) {
    // 检查用户是否已经评价过这本书
    const existingReview = await this.findOne({
      where: {
        userId,
        bookId,
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'already_reviewed',
        existingReview,
      };
    }

    return {
      canReview: true,
      reason: null,
    };
  };

  Review.getStatistics = async function (options = {}) {
    const { startDate, endDate } = options;
    
    const whereCondition = {};
    if (startDate && endDate) {
      whereCondition.createdAt = {
        [Op.between]: [startDate, endDate],
      };
    }

    const [
      total,
      published,
      pending,
      averageRating,
      byRating,
      recentCount,
    ] = await Promise.all([
      // 总评价数
      this.count({ where: whereCondition }),
      
      // 已发布评价数
      this.count({
        where: { ...whereCondition, status: 'published' },
      }),
      
      // 待审核评价数
      this.count({
        where: { ...whereCondition, status: 'pending' },
      }),
      
      // 平均评分
      this.findOne({
        where: { ...whereCondition, status: 'published' },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        ],
        raw: true,
      }),
      
      // 按评分分布统计
      this.findAll({
        where: { ...whereCondition, status: 'published' },
        attributes: [
          'rating',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['rating'],
        order: [['rating', 'DESC']],
        raw: true,
      }),
      
      // 最近7天评价数
      this.count({
        where: {
          ...whereCondition,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // 处理评分分布
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    byRating.forEach(item => {
      ratingDistribution[item.rating] = parseInt(item.count);
    });

    return {
      total,
      published,
      pending,
      hidden: total - published - pending,
      averageRating: averageRating?.avgRating ? parseFloat(averageRating.avgRating).toFixed(1) : 0,
      ratingDistribution,
      recentCount,
      publishRate: total > 0 ? ((published / total) * 100).toFixed(1) : 0,
    };
  };

  Review.findRecommended = async function (options = {}) {
    const {
      limit = 10,
      minRating = 4,
      minHelpfulScore = 70,
    } = options;

    return this.findAll({
      where: {
        status: 'published',
        rating: { [Op.gte]: minRating },
        isRecommended: true,
      },
      include: [
        {
          association: 'user',
          attributes: ['id', 'username', 'realName', 'avatar'],
        },
        {
          association: 'book',
          attributes: ['id', 'title', 'authors', 'coverImage'],
        },
      ],
      order: [
        [sequelize.literal('(helpful_count - unhelpful_count)'), 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
    });
  };

  Review.searchReviews = async function (searchParams) {
    const {
      query,
      bookId,
      userId,
      rating,
      status = 'published',
      tags,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = searchParams;

    const where = {};
    const include = [
      {
        association: 'user',
        attributes: ['id', 'username', 'realName', 'avatar'],
      },
      {
        association: 'book',
        attributes: ['id', 'title', 'authors', 'coverImage'],
      },
    ];

    // 构建查询条件
    if (status) where.status = status;
    if (bookId) where.bookId = bookId;
    if (userId) where.userId = userId;
    if (rating) where.rating = rating;
    
    if (query) {
      where[Op.or] = [
        { title: { [Op.like]: `%${query}%` } },
        { content: { [Op.like]: `%${query}%` } },
      ];
    }
    
    if (tags && tags.length > 0) {
      where.tags = {
        [Op.overlap]: tags,
      };
    }

    // 排序
    let order;
    switch (sortBy) {
      case 'helpful':
        order = [
          [sequelize.literal('(helpful_count - unhelpful_count)'), 'DESC'],
          ['created_at', 'DESC'],
        ];
        break;
      case 'rating_high':
        order = [['rating', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'rating_low':
        order = [['rating', 'ASC'], ['created_at', 'DESC']];
        break;
      case 'newest':
      default:
        order = [['created_at', 'DESC']];
    }

    const offset = (page - 1) * limit;

    return this.findAndCountAll({
      where,
      include,
      order,
      limit,
      offset,
      distinct: true,
    });
  };

  return Review;
};

module.exports = ReviewModel;