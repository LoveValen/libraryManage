/**
 * 验证工具函数
 */

/**
 * 判断是否为外部链接
 * @param {string} path - 路径
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * 验证手机号格式（中国）
 * @param {string} phone - 手机号
 */
export function validatePhone(phone) {
  const re = /^1[3-9]\d{9}$/
  return re.test(phone)
}

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 */
export function validateUsername(username) {
  // 3-30个字符，字母、数字、下划线
  const re = /^[a-zA-Z0-9_]{3,30}$/
  return re.test(username)
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 */
export function validatePassword(password) {
  // 至少6位，包含字母和数字
  const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,128}$/
  return re.test(password)
}

/**
 * 验证ISBN格式
 * @param {string} isbn - ISBN号
 */
export function validateISBN(isbn) {
  // ISBN-10 或 ISBN-13
  const re =
    /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/
  return re.test(isbn.replace(/[-\s]/g, ''))
}

/**
 * 验证IP地址
 * @param {string} ip - IP地址
 */
export function validateIP(ip) {
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return re.test(ip)
}

/**
 * 验证URL格式
 * @param {string} url - URL地址
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
 * @param {string} idCard - 身份证号
 */
export function validateIdCard(idCard) {
  const re = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
  return re.test(idCard)
}

/**
 * 验证银行卡号
 * @param {string} cardNumber - 银行卡号
 */
export function validateBankCard(cardNumber) {
  const re = /^[1-9]\d{12,18}$/
  return re.test(cardNumber)
}

/**
 * 验证数字范围
 * @param {number} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 */
export function validateNumberRange(value, min, max) {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（MB）
 */
export function validateFileSize(file, maxSize) {
  if (!file) return false
  const maxSizeInBytes = maxSize * 1024 * 1024
  return file.size <= maxSizeInBytes
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {Array} allowedTypes - 允许的类型
 */
export function validateFileType(file, allowedTypes) {
  if (!file) return false
  const fileExtension = file.name.split('.').pop().toLowerCase()
  return allowedTypes.includes(fileExtension)
}

/**
 * 验证图片文件
 * @param {File} file - 文件对象
 */
export function validateImageFile(file) {
  const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return validateFileType(file, allowedTypes)
}

/**
 * 验证文档文件
 * @param {File} file - 文件对象
 */
export function validateDocumentFile(file) {
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf']
  return validateFileType(file, allowedTypes)
}

/**
 * 验证表单字段
 * @param {Object} rules - 验证规则
 * @param {any} value - 值
 */
export function validateField(rules, value) {
  const errors = []

  // 必填验证
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(rules.requiredMessage || '此字段为必填项')
  }

  // 如果值为空且不是必填，跳过其他验证
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return { valid: true, errors: [] }
  }

  // 最小长度验证
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(rules.minLengthMessage || `最少需要${rules.minLength}个字符`)
  }

  // 最大长度验证
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(rules.maxLengthMessage || `最多允许${rules.maxLength}个字符`)
  }

  // 正则表达式验证
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || '格式不正确')
  }

  // 自定义验证函数
  if (rules.validator && typeof rules.validator === 'function') {
    const result = rules.validator(value)
    if (result !== true) {
      errors.push(result || '验证失败')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证整个表单
 * @param {Object} formData - 表单数据
 * @param {Object} formRules - 表单验证规则
 */
export function validateForm(formData, formRules) {
  const errors = {}
  let hasError = false

  for (const field in formRules) {
    const fieldRules = formRules[field]
    const fieldValue = formData[field]

    const result = validateField(fieldRules, fieldValue)

    if (!result.valid) {
      errors[field] = result.errors
      hasError = true
    }
  }

  return {
    valid: !hasError,
    errors
  }
}

/**
 * Element Plus 表单验证规则生成器
 */
export const createValidationRules = {
  // 必填规则
  required: (message = '此字段为必填项') => ({
    required: true,
    message,
    trigger: ['blur', 'change']
  }),

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
  length: (min, max, message) => ({
    min,
    max,
    message: message || `长度在 ${min} 到 ${max} 个字符`,
    trigger: ['blur']
  }),

  // 数字范围规则
  numberRange: (min, max, message) => ({
    type: 'number',
    min,
    max,
    message: message || `数值在 ${min} 到 ${max} 之间`,
    trigger: ['blur', 'change']
  }),

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
