/**
 * 表单验证规则函数库（合并自 validate.js 和 validators.js）
 *
 * 功能：
 * 1. 基础验证函数（邮箱、手机号、URL等）
 * 2. Element Plus 表单验证规则生成器
 * 3. 可复用的验证规则
 * 4. 自定义验证规则
 *
 * @example
 * // 使用基础验证函数
 * if (!validateEmail(email)) { ... }
 *
 * // 使用规则生成器（Element Plus）
 * const rules = {
 *   username: [required('请输入用户名'), minLength(3)],
 *   email: [required(), email()],
 * }
 */

import { VALIDATION_CONFIG } from '@/constants/config'

// ==================== 基础验证函数（原 validate.js） ====================

/**
 * 判断是否为外部链接
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * 验证手机号格式（中国）
 */
export function validatePhone(phone) {
  const re = /^1[3-9]\d{9}$/
  return re.test(phone)
}

/**
 * 验证用户名格式
 */
export function validateUsername(username) {
  // 3-30个字符，字母、数字、下划线
  const re = /^[a-zA-Z0-9_]{3,30}$/
  return re.test(username)
}

/**
 * 验证密码强度
 */
export function validatePassword(password) {
  // 至少6位，包含字母和数字
  const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,128}$/
  return re.test(password)
}

/**
 * 验证ISBN格式
 */
export function validateISBN(isbn) {
  const re = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/
  return re.test(isbn.replace(/[-\s]/g, ''))
}

/**
 * 验证IP地址
 */
export function validateIP(ip) {
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return re.test(ip)
}

/**
 * 验证URL格式
 */
export function validateURL(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证身份证号码（中国）
 */
export function validateIdCard(idCard) {
  const re = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
  return re.test(idCard)
}

/**
 * 验证银行卡号
 */
export function validateBankCard(cardNumber) {
  const re = /^[1-9]\d{12,18}$/
  return re.test(cardNumber)
}

/**
 * 验证数字范围
 */
export function validateNumberRange(value, min, max) {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

/**
 * 验证文件大小
 */
export function validateFileSize(file, maxSize) {
  if (!file) return false
  const maxSizeInBytes = maxSize * 1024 * 1024
  return file.size <= maxSizeInBytes
}

/**
 * 验证文件类型
 */
export function validateFileType(file, allowedTypes) {
  if (!file) return false
  const fileExtension = file.name.split('.').pop().toLowerCase()
  return allowedTypes.includes(fileExtension)
}

/**
 * 验证图片文件
 */
export function validateImageFile(file) {
  const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return validateFileType(file, allowedTypes)
}

/**
 * 验证文档文件
 */
export function validateDocumentFile(file) {
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf']
  return validateFileType(file, allowedTypes)
}

// ==================== Element Plus 验证规则生成器 ====================

/**
 * 必填验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式，默认'blur'
 * @returns {Object} 验证规则对象
 */
export function required(message = '此项为必填项', trigger = 'blur') {
  return {
    required: true,
    message,
    trigger,
  }
}

/**
 * 最小长度验证
 * @param {number} min - 最小长度
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function minLength(min, message = null, trigger = 'blur') {
  return {
    min,
    message: message || `长度不能少于${min}个字符`,
    trigger,
  }
}

/**
 * 最大长度验证
 * @param {number} max - 最大长度
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function maxLength(max, message = null, trigger = 'blur') {
  return {
    max,
    message: message || `长度不能超过${max}个字符`,
    trigger,
  }
}

/**
 * 长度范围验证
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function length(min, max, message = null, trigger = 'blur') {
  return {
    min,
    max,
    message: message || `长度必须在${min}到${max}个字符之间`,
    trigger,
  }
}

/**
 * 邮箱验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function email(message = '请输入有效的邮箱地址', trigger = 'blur') {
  return {
    type: 'email',
    message,
    trigger,
  }
}

/**
 * 手机号验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function phone(message = '请输入有效的手机号', trigger = 'blur') {
  return {
    pattern: VALIDATION_CONFIG.PHONE.PATTERN,
    message,
    trigger,
  }
}

/**
 * URL验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function url(message = '请输入有效的URL', trigger = 'blur') {
  return {
    type: 'url',
    message,
    trigger,
  }
}

/**
 * 数字验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function number(message = '请输入数字', trigger = 'blur') {
  return {
    type: 'number',
    message,
    trigger,
  }
}

/**
 * 整数验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function integer(message = '请输入整数', trigger = 'blur') {
  return {
    pattern: /^-?\d+$/,
    message,
    trigger,
  }
}

/**
 * 正整数验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function positiveInteger(message = '请输入正整数', trigger = 'blur') {
  return {
    pattern: /^[1-9]\d*$/,
    message,
    trigger,
  }
}

/**
 * 数字范围验证
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function range(min, max, message = null, trigger = 'blur') {
  return {
    type: 'number',
    min,
    max,
    message: message || `数值必须在${min}到${max}之间`,
    trigger,
  }
}

/**
 * 正则表达式验证
 * @param {RegExp} pattern - 正则表达式
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function pattern(pattern, message = '格式不正确', trigger = 'blur') {
  return {
    pattern,
    message,
    trigger,
  }
}

/**
 * 用户名验证（字母、数字、下划线）
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function username(message = '用户名只能包含字母、数字和下划线', trigger = 'blur') {
  return {
    pattern: VALIDATION_CONFIG.USERNAME.PATTERN,
    message,
    trigger,
  }
}

/**
 * 密码验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function password(message = null, trigger = 'blur') {
  const { MIN_LENGTH, MAX_LENGTH } = VALIDATION_CONFIG.PASSWORD
  return {
    min: MIN_LENGTH,
    max: MAX_LENGTH,
    message: message || `密码长度必须在${MIN_LENGTH}到${MAX_LENGTH}个字符之间`,
    trigger,
  }
}

/**
 * 确认密码验证
 * @param {Function|Object} getPassword - 获取密码的函数或响应式对象
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function confirmPassword(getPassword, message = '两次输入的密码不一致', trigger = 'blur') {
  return {
    validator: (rule, value, callback) => {
      const password = typeof getPassword === 'function' ? getPassword() : getPassword
      if (value !== password) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger,
  }
}

/**
 * 自定义验证器
 * @param {Function} validator - 验证函数 (rule, value, callback) => void
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function custom(validator, trigger = 'blur') {
  return {
    validator,
    trigger,
  }
}

/**
 * 数组非空验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function arrayNotEmpty(message = '请至少选择一项', trigger = 'change') {
  return {
    type: 'array',
    min: 1,
    message,
    trigger,
  }
}

/**
 * 日期验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function date(message = '请选择日期', trigger = 'change') {
  return {
    type: 'date',
    required: true,
    message,
    trigger,
  }
}

/**
 * 日期范围验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function dateRange(message = '请选择日期范围', trigger = 'change') {
  return {
    type: 'array',
    min: 2,
    max: 2,
    message,
    trigger,
  }
}

/**
 * 身份证号验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function idCard(message = '请输入有效的身份证号', trigger = 'blur') {
  return {
    pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
    message,
    trigger,
  }
}

/**
 * IP地址验证
 * @param {string} message - 错误消息
 * @param {string} trigger - 触发方式
 * @returns {Object} 验证规则对象
 */
export function ipAddress(message = '请输入有效的IP地址', trigger = 'blur') {
  return {
    pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    message,
    trigger,
  }
}

/**
 * 组合多个验证规则
 * @param {...Object} rules - 验证规则对象
 * @returns {Array} 验证规则数组
 */
export function combine(...rules) {
  return rules.filter(Boolean)
}

/**
 * 常用组合验证规则
 */
export const commonRules = {
  // 必填 + 用户名格式
  username: [
    required('请输入用户名'),
    minLength(VALIDATION_CONFIG.USERNAME.MIN_LENGTH),
    maxLength(VALIDATION_CONFIG.USERNAME.MAX_LENGTH),
    username(),
  ],

  // 必填 + 密码格式
  password: [required('请输入密码'), password()],

  // 必填 + 邮箱格式
  email: [required('请输入邮箱'), email()],

  // 必填 + 手机号格式
  phone: [required('请输入手机号'), phone()],

  // 必填项
  required: [required()],

  // 必填 + 数组非空
  requiredArray: [required(), arrayNotEmpty()],
}

/**
 * 创建条件验证规则
 * @param {Function} condition - 条件函数，返回boolean
 * @param {Object} rule - 验证规则
 * @returns {Object} 条件验证规则
 */
export function conditional(condition, rule) {
  return {
    validator: (r, value, callback) => {
      if (!condition()) {
        callback()
        return
      }

      if (rule.validator) {
        rule.validator(r, value, callback)
      } else if (rule.required && !value) {
        callback(new Error(rule.message || '此项为必填项'))
      } else if (rule.pattern && !rule.pattern.test(value)) {
        callback(new Error(rule.message || '格式不正确'))
      } else {
        callback()
      }
    },
    trigger: rule.trigger || 'blur',
  }
}

// ==================== 兼容旧版 createValidationRules（原 validate.js） ====================

/**
 * Element Plus 表单验证规则生成器（对象形式，兼容旧代码）
 * @deprecated 建议使用上面的函数式API（required, email, phone等）
 */
export const createValidationRules = {
  // 必填规则
  required: (message = '此字段为必填项') => required(message),

  // 邮箱规则
  email: (message = '请输入正确的邮箱地址') => ({
    validator: (rule, value, callback) => {
      if (!value) {
        callback()
      } else if (!validateEmail(value)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur']
  }),

  // 手机号规则
  phone: (message = '请输入正确的手机号码') => ({
    validator: (rule, value, callback) => {
      if (!value) {
        callback()
      } else if (!validatePhone(value)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur']
  }),

  // 用户名规则
  username: (message = '用户名为3-30位字母、数字或下划线') => ({
    validator: (rule, value, callback) => {
      if (!value) {
        callback()
      } else if (!validateUsername(value)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur']
  }),

  // 密码规则
  password: (message = '密码至少6位，包含字母和数字') => ({
    validator: (rule, value, callback) => {
      if (!value) {
        callback()
      } else if (!validatePassword(value)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur']
  }),

  // 长度规则
  length: (min, max, message) => length(min, max, message),

  // 数字范围规则
  numberRange: (min, max, message) => range(min, max, message),

  // 确认密码规则
  confirmPassword: (passwordField, message = '两次输入的密码不一致') => ({
    validator: (rule, value, callback, source) => {
      if (!value) {
        callback()
      } else if (value !== source[passwordField]) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur']
  })
}
