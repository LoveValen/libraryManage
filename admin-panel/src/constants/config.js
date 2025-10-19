/**
 * 应用配置常量
 * 集中管理配置项、默认值等
 */

/**
 * 分页默认配置
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  LAYOUT: 'total, sizes, prev, pager, next, jumper',
}

/**
 * 表格默认配置
 */
export const TABLE_CONFIG = {
  // 高度偏移量（用于计算表格高度）
  DEFAULT_HEADER_OFFSET: 200,
  DEFAULT_FOOTER_OFFSET: 80,

  // 默认空文本
  EMPTY_TEXT: '暂无数据',

  // 斑马纹
  STRIPE: true,

  // 边框
  BORDER: false,
}

/**
 * 上传配置
 */
export const UPLOAD_CONFIG = {
  // 文件大小限制（MB）
  MAX_FILE_SIZE: 5,

  // 图片类型
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],

  // 文档类型
  DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
}

/**
 * 日期格式配置
 */
export const DATE_FORMAT = {
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  MONTH: 'YYYY-MM',
}

/**
 * 请求配置
 */
export const REQUEST_CONFIG = {
  // 超时时间（毫秒）
  TIMEOUT: 10000,

  // 重试次数
  RETRY_COUNT: 3,

  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
}

/**
 * 主题颜色预设
 */
export const THEME_COLORS = [
  '#409EFF', // Element Plus 默认蓝
  '#67C23A', // 绿色
  '#E6A23C', // 橙色
  '#F56C6C', // 红色
  '#909399', // 灰色
  '#1890ff', // Ant Design 蓝
  '#722ed1', // 紫色
  '#eb2f96', // 粉红
]

/**
 * 通知配置
 */
export const NOTIFICATION_CONFIG = {
  // 默认显示时长（毫秒）
  DURATION: 3000,

  // 位置
  POSITION: 'top-right',

  // 最大显示数量
  MAX_COUNT: 3,
}

/**
 * 验证规则配置
 */
export const VALIDATION_CONFIG = {
  // 用户名
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },

  // 密码
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },

  // 手机号
  PHONE: {
    PATTERN: /^1[3-9]\d{9}$/,
  },

  // 邮箱
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
}

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  // 默认缓存时间（毫秒）
  DEFAULT_TTL: 5 * 60 * 1000, // 5分钟

  // 各类数据缓存时间
  TTL: {
    USER_INFO: 30 * 60 * 1000, // 30分钟
    MENU: 60 * 60 * 1000, // 1小时
    DICT: 24 * 60 * 60 * 1000, // 24小时
  },
}
