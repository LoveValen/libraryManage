/**
 * 业务枚举常量
 * 集中管理所有下拉选项、状态枚举等
 */

/**
 * 用户角色选项
 */
export const ROLE_OPTIONS = [
  { label: '管理员', value: 'admin', description: '系统设置，用户管理，数据统计' },
  { label: '图书管理员', value: 'librarian', description: '管理图书信息，处理借还业务' },
  { label: '普通用户', value: 'user', description: '可借阅图书，查看个人信息' },
]

/**
 * 用户状态选项
 */
export const USER_STATUS_OPTIONS = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' },
]

/**
 * 图书状态选项
 */
export const BOOK_STATUS_OPTIONS = [
  { label: '可借阅', value: 'available' },
  { label: '已借出', value: 'borrowed' },
  { label: '维护中', value: 'maintenance' },
  { label: '已下架', value: 'offline' },
]

/**
 * 借阅状态选项
 */
export const BORROW_STATUS_OPTIONS = [
  { label: '借阅中', value: 'borrowed' },
  { label: '已归还', value: 'returned' },
  { label: '已逾期', value: 'overdue' },
]

/**
 * 性别选项
 */
export const GENDER_OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' },
]

/**
 * 是否选项（通用）
 */
export const YES_NO_OPTIONS = [
  { label: '是', value: true },
  { label: '否', value: false },
]

/**
 * 排序方向选项
 */
export const SORT_ORDER_OPTIONS = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' },
]

/**
 * 状态标签类型映射（用于Element Plus Tag组件）
 */
export const STATUS_TAG_TYPE = {
  // 用户状态
  active: 'success',
  inactive: 'info',
  suspended: 'warning',
  banned: 'danger',

  // 图书状态
  available: 'success',
  borrowed: 'warning',
  maintenance: 'info',
  offline: 'danger',

  // 借阅状态
  returned: 'success',
  overdue: 'danger',
}

/**
 * 状态文本映射（中文显示）
 */
export const STATUS_TEXT = {
  // 用户状态
  active: '启用',
  inactive: '禁用',
  suspended: '暂停',
  banned: '封禁',

  // 图书状态
  available: '可借阅',
  borrowed: '已借出',
  maintenance: '维护中',
  offline: '已下架',

  // 借阅状态
  returned: '已归还',
  overdue: '已逾期',

  // 角色
  admin: '管理员',
  librarian: '图书管理员',
  user: '普通用户',

  // 性别
  male: '男',
  female: '女',
  other: '其他',
}

/**
 * 根据枚举值获取标签类型
 * @param {string} status - 状态值
 * @param {string} defaultType - 默认类型
 * @returns {string}
 */
export function getStatusTagType(status, defaultType = 'info') {
  return STATUS_TAG_TYPE[status] || defaultType
}

/**
 * 根据枚举值获取文本
 * @param {string} value - 枚举值
 * @param {string} defaultText - 默认文本
 * @returns {string}
 */
export function getStatusText(value, defaultText = '-') {
  return STATUS_TEXT[value] || defaultText
}

/**
 * 从选项数组中获取标签
 * @param {Array} options - 选项数组
 * @param {string} value - 值
 * @param {string} defaultLabel - 默认标签
 * @returns {string}
 */
export function getOptionLabel(options, value, defaultLabel = '-') {
  const option = options.find(opt => opt.value === value)
  return option ? option.label : defaultLabel
}
