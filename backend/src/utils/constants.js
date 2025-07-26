/**
 * 应用程序常量定义
 */

// 用户角色
const USER_ROLES = {
  ADMIN: 'admin',
  LIBRARIAN: 'librarian',
  PATRON: 'patron',
};

// 用户状态
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
};

// 图书状态
const BOOK_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
};

// 借阅状态
const BORROW_STATUS = {
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
  LOST: 'lost',
  DAMAGED: 'damaged',
};

// 积分交易类型
const POINTS_TRANSACTION_TYPES = {
  BORROW_BOOK: 'BORROW_BOOK',
  RETURN_ON_TIME: 'RETURN_ON_TIME',
  RETURN_LATE: 'RETURN_LATE',
  WRITE_REVIEW: 'WRITE_REVIEW',
  COMPLETE_TUTORIAL: 'COMPLETE_TUTORIAL',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  PENALTY_DEDUCTION: 'PENALTY_DEDUCTION',
  BONUS_REWARD: 'BONUS_REWARD',
  REDEEM_REWARD: 'REDEEM_REWARD',
};

// 徽章类型
const BADGE_TYPES = {
  READING: 'reading',
  PARTICIPATION: 'participation',
  ACHIEVEMENT: 'achievement',
  SPECIAL: 'special',
};

// 徽章稀有度
const BADGE_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

// 通知类型
const NOTIFICATION_TYPES = {
  BORROW_REMINDER: 'borrow_reminder',
  DUE_DATE_REMINDER: 'due_date_reminder',
  OVERDUE_NOTICE: 'overdue_notice',
  RETURN_CONFIRMATION: 'return_confirmation',
  POINTS_EARNED: 'points_earned',
  BADGE_EARNED: 'badge_earned',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
};

// 文件类型
const FILE_TYPES = {
  IMAGE: {
    MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif'],
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
  },
  DOCUMENT: {
    MIME_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    EXTENSIONS: ['.pdf', '.doc', '.docx'],
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
  },
  EBOOK: {
    MIME_TYPES: ['application/pdf', 'application/epub+zip'],
    EXTENSIONS: ['.pdf', '.epub'],
    MAX_SIZE: 100 * 1024 * 1024, // 100MB
  },
};

// 图书分类
const BOOK_CATEGORIES = {
  LITERATURE: 'literature',
  SCIENCE: 'science',
  TECHNOLOGY: 'technology',
  HISTORY: 'history',
  PHILOSOPHY: 'philosophy',
  ART: 'art',
  RELIGION: 'religion',
  EDUCATION: 'education',
  CHILDREN: 'children',
  REFERENCE: 'reference',
};

// 搜索排序选项
const SEARCH_SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  TITLE_ASC: 'title_asc',
  TITLE_DESC: 'title_desc',
  AUTHOR_ASC: 'author_asc',
  AUTHOR_DESC: 'author_desc',
  PUBLISH_DATE_ASC: 'publish_date_asc',
  PUBLISH_DATE_DESC: 'publish_date_desc',
  POPULARITY: 'popularity',
  RATING: 'rating',
  CREATED_ASC: 'created_asc',
  CREATED_DESC: 'created_desc',
};

// API响应状态
const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// HTTP状态码
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// 错误代码
const ERROR_CODES = {
  // 认证相关
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // 用户相关
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_BANNED: 'USER_BANNED',
  
  // 图书相关
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  BOOK_NOT_AVAILABLE: 'BOOK_NOT_AVAILABLE',
  BOOK_ALREADY_BORROWED: 'BOOK_ALREADY_BORROWED',
  
  // 借阅相关
  BORROW_LIMIT_EXCEEDED: 'BORROW_LIMIT_EXCEEDED',
  BORROW_NOT_FOUND: 'BORROW_NOT_FOUND',
  ALREADY_BORROWED: 'ALREADY_BORROWED',
  CANNOT_RETURN: 'CANNOT_RETURN',
  
  // 积分相关
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  POINTS_TRANSACTION_FAILED: 'POINTS_TRANSACTION_FAILED',
  
  // 文件相关
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  
  // 微信相关
  WECHAT_LOGIN_FAILED: 'WECHAT_LOGIN_FAILED',
  INVALID_WECHAT_CODE: 'INVALID_WECHAT_CODE',
  
  // 系统相关
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
};

// 默认分页设置
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

// 借阅规则默认值
const BORROW_RULES = {
  MAX_BOOKS_PER_USER: 5,
  DEFAULT_BORROW_DAYS: 30,
  MAX_RENEWAL_TIMES: 2,
  RENEWAL_DAYS: 15,
  OVERDUE_GRACE_DAYS: 3,
};

// 积分规则默认值
const POINTS_RULES = {
  BORROW_BOOK: 10,
  RETURN_ON_TIME: 5,
  WRITE_REVIEW: 25,
  COMPLETE_TUTORIAL: 50,
  OVERDUE_PENALTY: -10,
  DAMAGE_PENALTY: -50,
  LOST_PENALTY: -100,
};

// 用户等级配置
const USER_LEVELS = {
  NEWCOMER: { min: 0, max: 99, name: '新手读者' },
  READER: { min: 100, max: 299, name: '普通读者' },
  BOOKWORM: { min: 300, max: 699, name: '书虫' },
  SCHOLAR: { min: 700, max: 1499, name: '学者' },
  EXPERT: { min: 1500, max: 2999, name: '专家' },
  MASTER: { min: 3000, max: 5999, name: '大师' },
  GRANDMASTER: { min: 6000, max: Infinity, name: '宗师' },
};

// 数据验证规则
const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SYMBOLS: false,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^1[3-9]\d{9}$/,
  },
  ISBN: {
    PATTERN: /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
  },
};

// 时间常量
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  BOOK_STATUS,
  BORROW_STATUS,
  POINTS_TRANSACTION_TYPES,
  BADGE_TYPES,
  BADGE_RARITY,
  NOTIFICATION_TYPES,
  FILE_TYPES,
  BOOK_CATEGORIES,
  SEARCH_SORT_OPTIONS,
  API_STATUS,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION_DEFAULTS,
  BORROW_RULES,
  POINTS_RULES,
  USER_LEVELS,
  VALIDATION_RULES,
  TIME_CONSTANTS,
};