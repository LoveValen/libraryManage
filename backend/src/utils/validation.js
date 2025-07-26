const Joi = require('joi');
const { VALIDATION_RULES, USER_ROLES, BOOK_STATUS, BORROW_STATUS } = require('./constants');

/**
 * 通用验证规则
 */
const commonSchemas = {
  id: Joi.number().integer().positive().required(),
  optionalId: Joi.number().integer().positive(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  adminLimit: Joi.number().integer().min(1).max(1000).default(20),
  search: Joi.string().trim().min(1).max(100),
  sortBy: Joi.string().valid('id', 'name', 'created_at', 'updated_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  email: Joi.string().email().trim().lowercase(),
  password: Joi.string()
    .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH)
    .max(VALIDATION_RULES.PASSWORD.MAX_LENGTH),
  username: Joi.string()
    .min(VALIDATION_RULES.USERNAME.MIN_LENGTH)
    .max(VALIDATION_RULES.USERNAME.MAX_LENGTH)
    .pattern(VALIDATION_RULES.USERNAME.PATTERN)
    .trim(),
  phone: Joi.string().pattern(VALIDATION_RULES.PHONE.PATTERN),
  isbn: Joi.string().pattern(VALIDATION_RULES.ISBN.PATTERN),
  url: Joi.string().uri(),
  dateString: Joi.string().isoDate(),
  role: Joi.string().valid(...Object.values(USER_ROLES)),
  bookStatus: Joi.string().valid(...Object.values(BOOK_STATUS)),
  borrowStatus: Joi.string().valid(...Object.values(BORROW_STATUS)),
};

/**
 * 用户相关验证模式
 */
const userSchemas = {
  // 用户注册
  register: Joi.object({
    username: commonSchemas.username.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    phone: commonSchemas.phone,
    realName: Joi.string().trim().min(2).max(50),
  }),

  // 用户登录
  login: Joi.object({
    username: Joi.alternatives()
      .try(commonSchemas.email, commonSchemas.username)
      .required(),
    password: commonSchemas.password.required(),
  }),

  // 微信登录
  wechatLogin: Joi.object({
    code: Joi.string().required(),
    userInfo: Joi.object({
      nickName: Joi.string().max(50),
      avatarUrl: Joi.string().uri(),
      gender: Joi.number().valid(0, 1, 2),
      country: Joi.string(),
      province: Joi.string(),
      city: Joi.string(),
    }),
  }),

  // 更新用户信息
  updateProfile: Joi.object({
    realName: Joi.string().trim().min(2).max(50),
    phone: commonSchemas.phone,
    avatar: commonSchemas.url,
    bio: Joi.string().max(500),
    preferences: Joi.object({
      categories: Joi.array().items(Joi.string()),
      notificationSettings: Joi.object({
        email: Joi.boolean(),
        sms: Joi.boolean(),
        push: Joi.boolean(),
      }),
    }),
  }),

  // 修改密码
  changePassword: Joi.object({
    currentPassword: commonSchemas.password.required(),
    newPassword: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),

  // 用户列表查询
  getUserList: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    size: commonSchemas.limit, // 兼容前端参数
    search: commonSchemas.search.allow(''),
    keyword: commonSchemas.search.allow(''), // 兼容前端参数
    role: commonSchemas.role.allow(''),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'banned', ''),
    sortBy: Joi.string().valid('id', 'username', 'email', 'created_at', 'last_login', ''),
    sortOrder: commonSchemas.sortOrder.allow(''),
    _t: Joi.string().optional(), // 时间戳参数，防止缓存
  }),
};

/**
 * 图书相关验证模式
 */
const bookSchemas = {
  // 创建图书
  createBook: Joi.object({
    title: Joi.string().trim().min(1).max(255).required(),
    isbn: commonSchemas.isbn.required(),
    authors: Joi.array().items(Joi.string().trim().min(1).max(100)).min(1).required(),
    publisher: Joi.string().trim().max(100),
    publicationYear: Joi.number().integer().min(1000).max(new Date().getFullYear()),
    category: Joi.string().trim().max(50),
    summary: Joi.string().max(2000),
    language: Joi.string().max(20).default('zh-CN'),
    totalStock: Joi.number().integer().min(0).required(),
    location: Joi.string().max(50),
    coverImage: commonSchemas.url,
    ebookUrl: commonSchemas.url,
    tags: Joi.array().items(Joi.string().trim().max(30)),
  }),

  // 更新图书
  updateBook: Joi.object({
    title: Joi.string().trim().min(1).max(255),
    isbn: commonSchemas.isbn,
    authors: Joi.array().items(Joi.string().trim().min(1).max(100)).min(1),
    publisher: Joi.string().trim().max(100),
    publicationYear: Joi.number().integer().min(1000).max(new Date().getFullYear()),
    category: Joi.string().trim().max(50),
    summary: Joi.string().max(2000),
    language: Joi.string().max(20),
    totalStock: Joi.number().integer().min(0),
    location: Joi.string().max(50),
    status: commonSchemas.bookStatus,
    coverImage: commonSchemas.url,
    ebookUrl: commonSchemas.url,
    tags: Joi.array().items(Joi.string().trim().max(30)),
  }),

  // 图书列表查询
  getBookList: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    search: commonSchemas.search,
    category: Joi.string().trim(),
    author: Joi.string().trim(),
    publisher: Joi.string().trim(),
    status: commonSchemas.bookStatus,
    language: Joi.string(),
    hasEbook: Joi.boolean(),
    sortBy: Joi.string().valid('id', 'title', 'author', 'publication_year', 'created_at', 'borrow_count'),
    sortOrder: commonSchemas.sortOrder,
    minYear: Joi.number().integer().min(1000),
    maxYear: Joi.number().integer().max(new Date().getFullYear()),
  }),

  // 管理员图书列表查询（允许更高的limit）
  adminGetBookList: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.adminLimit,
    search: commonSchemas.search,
    category: Joi.string().trim(),
    author: Joi.string().trim(),
    publisher: Joi.string().trim(),
    status: commonSchemas.bookStatus,
    language: Joi.string(),
    hasEbook: Joi.boolean(),
    sortBy: Joi.string().valid('id', 'title', 'author', 'publication_year', 'created_at', 'borrow_count'),
    sortOrder: commonSchemas.sortOrder,
    minYear: Joi.number().integer().min(1000),
    maxYear: Joi.number().integer().max(new Date().getFullYear()),
  }),

  // 图书搜索查询
  searchBooks: Joi.object({
    q: Joi.string().trim().min(1).max(100).required()
      .messages({
        'string.empty': 'Search query cannot be empty',
        'string.min': 'Search query must be at least 1 character',
        'string.max': 'Search query cannot exceed 100 characters',
        'any.required': 'Search query is required'
      }),
    page: commonSchemas.page.optional(),
    limit: commonSchemas.limit.optional(),
    category_id: commonSchemas.optionalId,
    sortBy: Joi.string().valid('title', 'author', 'publication_year', 'borrow_count', 'rating').optional(),
    sortOrder: commonSchemas.sortOrder.optional(),
  }),
};

/**
 * 借阅相关验证模式
 */
const borrowSchemas = {
  // 借书
  borrowBook: Joi.object({
    bookId: commonSchemas.id.required(),
    borrowDays: Joi.number().integer().min(1).max(90).default(30),
  }),

  // 还书
  returnBook: Joi.object({
    borrowId: commonSchemas.id.required(),
    condition: Joi.string().valid('good', 'damaged', 'lost'),
    notes: Joi.string().max(500),
  }),

  // 续借
  renewBook: Joi.object({
    borrowId: commonSchemas.id.required(),
    days: Joi.number().integer().min(1).max(30).default(15),
  }),

  // 借阅记录查询
  getBorrowList: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    userId: Joi.alternatives().try(
      Joi.string().allow(''),
      commonSchemas.optionalId
    ).optional(),
    bookId: Joi.alternatives().try(
      Joi.string().allow(''),
      commonSchemas.optionalId
    ).optional(),
    status: Joi.alternatives().try(
      Joi.string().allow(''),
      commonSchemas.borrowStatus
    ).optional(),
    isOverdue: Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.boolean()
    ).optional(),
    sortBy: Joi.string().valid('id', 'borrow_date', 'due_date', 'return_date').optional(),
    sortOrder: commonSchemas.sortOrder,
    startDate: Joi.alternatives().try(
      Joi.string().allow(''),
      commonSchemas.dateString
    ).optional(),
    endDate: Joi.alternatives().try(
      Joi.string().allow(''),
      commonSchemas.dateString
    ).optional(),
    keyword: Joi.string().allow('').optional(),
  }),
};

/**
 * 书评相关验证模式
 */
const reviewSchemas = {
  // 创建书评
  createReview: Joi.object({
    bookId: commonSchemas.id.required(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().trim().min(1).max(100),
    content: Joi.string().trim().min(10).max(2000).required(),
    isAnonymous: Joi.boolean().default(false),
  }),

  // 更新书评
  updateReview: Joi.object({
    rating: Joi.number().min(1).max(5),
    title: Joi.string().trim().min(1).max(100),
    content: Joi.string().trim().min(10).max(2000),
    isAnonymous: Joi.boolean(),
  }),

  // 书评列表查询
  getReviewList: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    bookId: commonSchemas.optionalId,
    userId: commonSchemas.optionalId,
    rating: Joi.number().min(1).max(5),
    sortBy: Joi.string().valid('id', 'rating', 'created_at', 'likes_count'),
    sortOrder: commonSchemas.sortOrder,
  }),
};

/**
 * 积分相关验证模式
 */
const pointsSchemas = {
  // 积分记录查询
  getPointsHistory: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    userId: commonSchemas.optionalId,
    transactionType: Joi.string(),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    sortBy: Joi.string().valid('id', 'created_at', 'points_change'),
    sortOrder: commonSchemas.sortOrder,
  }),

  // 管理员调整积分
  adjustPoints: Joi.object({
    userId: commonSchemas.id.required(),
    pointsChange: Joi.number().integer().required(),
    description: Joi.string().trim().min(1).max(255).required(),
    reason: Joi.string().valid('bonus', 'penalty', 'correction', 'promotion').required(),
  }),
};

/**
 * 文件上传验证模式
 */
const fileSchemas = {
  // 图片上传
  uploadImage: Joi.object({
    purpose: Joi.string().valid('avatar', 'book_cover', 'general').required(),
    category: Joi.string().max(50),
  }),

  // 文档上传
  uploadDocument: Joi.object({
    purpose: Joi.string().valid('ebook', 'attachment', 'general').required(),
    category: Joi.string().max(50),
  }),
};

/**
 * 通知相关验证模式
 */
const notificationSchemas = {
  // 创建通知
  createNotification: Joi.object({
    userId: commonSchemas.id.required(),
    type: Joi.string().valid(
      'system', 'borrow_reminder', 'return_reminder', 'overdue_warning',
      'reservation', 'review_reply', 'points_change', 'book_available',
      'maintenance', 'announcement', 'chat_message', 'admin_alert'
    ).required(),
    title: Joi.string().trim().min(1).max(255).required(),
    content: Joi.string().trim().min(1).max(2000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    channel: Joi.object({
      inApp: Joi.boolean().default(true),
      email: Joi.boolean().default(false),
      sms: Joi.boolean().default(false),
      push: Joi.boolean().default(false)
    }).default({ inApp: true, email: false, sms: false, push: false }),
    metadata: Joi.object().default({}),
    relatedId: commonSchemas.optionalId,
    relatedType: Joi.string().max(50),
    actionUrl: Joi.string().uri().max(500),
    expiresAt: commonSchemas.dateString,
    scheduledAt: commonSchemas.dateString
  }),

  // 批量创建通知
  createBulkNotifications: Joi.object({
    notifications: Joi.array().items(
      Joi.object({
        userId: commonSchemas.id.required(),
        type: Joi.string().valid(
          'system', 'borrow_reminder', 'return_reminder', 'overdue_warning',
          'reservation', 'review_reply', 'points_change', 'book_available',
          'maintenance', 'announcement', 'chat_message', 'admin_alert'
        ).required(),
        title: Joi.string().trim().min(1).max(255).required(),
        content: Joi.string().trim().min(1).max(2000).required(),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
        channel: Joi.object().default({}),
        metadata: Joi.object().default({}),
        relatedId: commonSchemas.optionalId,
        relatedType: Joi.string().max(50),
        actionUrl: Joi.string().uri().max(500),
        expiresAt: commonSchemas.dateString,
        scheduledAt: commonSchemas.dateString
      })
    ).min(1).max(100).required()
  }),

  // 使用模板创建通知
  createFromTemplate: Joi.object({
    templateCode: Joi.string().trim().min(1).max(100).required(),
    userId: commonSchemas.id.required(),
    variables: Joi.object().default({}),
    options: Joi.object({
      priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
      channel: Joi.object(),
      metadata: Joi.object(),
      relatedId: commonSchemas.optionalId,
      relatedType: Joi.string().max(50),
      actionUrl: Joi.string().uri().max(500),
      expiresAt: commonSchemas.dateString,
      scheduledAt: commonSchemas.dateString
    }).default({})
  }),

  // 处理待发送通知
  processPending: Joi.object({
    batchSize: Joi.number().integer().min(1).max(100).default(50)
  }),

  // 广播系统消息
  broadcastMessage: Joi.object({
    message: Joi.object({
      type: Joi.string().required(),
      title: Joi.string().required(),
      content: Joi.string().required(),
      priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
    }).required(),
    excludeUsers: Joi.array().items(commonSchemas.id).default([])
  })
};

/**
 * 分析相关验证模式
 */
const analyticsSchemas = {
  // 仪表板查询
  getDashboard: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    granularity: Joi.string().valid('day', 'week', 'month').default('day'),
  }),

  // 概览统计查询
  getOverview: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
  }),

  // 趋势分析查询
  getTrends: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    granularity: Joi.string().valid('day', 'week', 'month').default('day'),
    metrics: Joi.string().default('all'), // all, borrows, users, points, reviews
  }),

  // 图书分析查询
  getBooksAnalytics: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().trim(),
  }),

  // 用户分析查询
  getUsersAnalytics: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    includeEngagement: Joi.boolean().default(true),
  }),

  // 分类分析查询
  getCategoriesAnalytics: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    includeTrends: Joi.boolean().default(true),
  }),

  // 性能指标查询
  getPerformance: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
  }),

  // 预测洞察查询
  getInsights: Joi.object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
  }),

  // 导出报告
  exportReport: Joi.object({
    reportType: Joi.string().valid('dashboard', 'books', 'users', 'categories', 'performance').default('dashboard'),
    format: Joi.string().valid('excel', 'csv', 'json', 'pdf').default('excel'),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    includeCharts: Joi.boolean().default(false),
  }),

  // 自定义查询
  customQuery: Joi.object({
    query: Joi.string().trim().min(1).max(200).required(),
    parameters: Joi.object().default({}),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
  }),
};

/**
 * 验证中间件工厂函数
 * @param {Joi.Schema} schema - Joi验证模式
 * @param {string} target - 验证目标 ('body', 'query', 'params')
 * @returns {Function} Express中间件函数
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.apiValidationError(errors, 'Validation failed');
    }

    // 将验证后的值替换原始值
    req[target] = value;
    next();
  };
};

/**
 * 验证请求参数中的ID
 */
const validateId = validate(Joi.object({ id: commonSchemas.id }), 'params');

/**
 * 验证分页参数
 */
const validatePagination = validate(Joi.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
}), 'query');

module.exports = {
  // 验证模式
  userSchemas,
  bookSchemas,
  borrowSchemas,
  reviewSchemas,
  pointsSchemas,
  fileSchemas,
  notificationSchemas,
  analyticsSchemas,
  commonSchemas,

  // 验证中间件
  validate,
  validateId,
  validatePagination,
  
  // 验证函数
  validateRequest: (schema, data) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value,
      }));
      
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.details = details;
      throw validationError;
    }
    
    return value;
  },
};