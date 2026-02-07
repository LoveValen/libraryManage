/**
 * 应用常量定义 - 遵循优秀源码的简洁设计
 */

// 核心业务状态
const USER_ROLES = {
  ADMIN: 'admin',
  LIBRARIAN: 'librarian', 
  PATRON: 'patron',
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
};

const BOOK_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
};

const BORROW_STATUS = {
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
};

// 积分和通知类型
const POINTS_TRANSACTION_TYPES = {
  BORROW_BOOK: 'BORROW_BOOK',
  RETURN_ON_TIME: 'RETURN_ON_TIME',
  WRITE_REVIEW: 'WRITE_REVIEW',
  PENALTY_DEDUCTION: 'PENALTY_DEDUCTION',
};

const NOTIFICATION_TYPES = {
  BORROW_REMINDER: 'borrow_reminder',
  DUE_DATE_REMINDER: 'due_date_reminder',
  OVERDUE_NOTICE: 'overdue_notice',
  RETURN_CONFIRMATION: 'return_confirmation',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
};

// 系统配置
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

const BORROW_RULES = {
  MAX_BOOKS_PER_USER: 5,
  DEFAULT_BORROW_DAYS: 30,
  MAX_RENEWAL_TIMES: 2,
};

// 时间范围常量（毫秒）
const TIME_RANGES = {
  ONE_DAY: 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
};

// 库存默认值
const STOCK_DEFAULTS = {
  TOTAL: 1,
  AVAILABLE: 1,
  RESERVED: 0,
};

// 排序默认值
const SORT_DEFAULTS = {
  ORDER: 'desc',
  ORDER_BY: 'createdAt',
};

// 注意: FIELD_MAPPINGS 已移除
// 现在使用 Prisma @map 指令处理字段命名映射
// 代码中统一使用 camelCase，数据库字段使用 snake_case

const POINTS_RULES = {
  BORROW_BOOK: 10,
  RETURN_ON_TIME: 5,
  WRITE_REVIEW: 25,
  OVERDUE_PENALTY: -10,
};

// 验证规则
const VALIDATION_RULES = {
  PASSWORD: { MIN_LENGTH: 6, MAX_LENGTH: 128 },
  USERNAME: { MIN_LENGTH: 3, MAX_LENGTH: 30, PATTERN: /^[a-zA-Z0-9_]+$/ },
  EMAIL: { PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  PHONE: { PATTERN: /^1[3-9]\d{9}$/ },
};

// 错误代码 - 核心错误
const ERROR_CODES = {
  // 认证
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // 业务
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  BOOK_NOT_AVAILABLE: 'BOOK_NOT_AVAILABLE',
  BORROW_LIMIT_EXCEEDED: 'BORROW_LIMIT_EXCEEDED',
  
  // 系统
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

// HTTP状态码 - 常用状态
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  BOOK_STATUS,
  BORROW_STATUS,
  POINTS_TRANSACTION_TYPES,
  NOTIFICATION_TYPES,
  PAGINATION_DEFAULTS,
  BORROW_RULES,
  POINTS_RULES,
  VALIDATION_RULES,
  ERROR_CODES,
  HTTP_STATUS,
  TIME_RANGES,
  STOCK_DEFAULTS,
  SORT_DEFAULTS,
};