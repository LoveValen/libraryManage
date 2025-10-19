/**
 * FieldMapper - 字段名称转换工具（函数式封装）
 *
 * 功能：
 * 1. camelCase <-> snake_case 双向转换
 * 2. 批量对象字段转换
 * 3. 嵌套对象和数组支持
 * 4. 基于配置的字段映射
 *
 * @example
 * // 单个对象转换
 * const snakeObj = toSnakeCase({ userId: 1, userName: 'John' });
 * // 结果: { user_id: 1, user_name: 'John' }
 *
 * // 数组转换
 * const camelArray = toCamelCase([{ user_id: 1 }, { user_id: 2 }]);
 * // 结果: [{ userId: 1 }, { userId: 2 }]
 *
 * // 基于映射表转换
 * const mapped = applyMapping(obj, FIELD_MAPPINGS.BOOK);
 */

const { FIELD_MAPPINGS } = require('./constants');

/**
 * 将 camelCase 转换为 snake_case
 * @param {string} str - camelCase 字符串
 * @returns {string} snake_case 字符串
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 将 snake_case 转换为 camelCase
 * @param {string} str - snake_case 字符串
 * @returns {string} camelCase 字符串
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 转换对象的所有键为 snake_case
 * @param {Object|Array} data - 输入数据
 * @param {Object} options - 可选配置
 * @param {boolean} options.deep - 是否深度转换，默认 false
 * @param {Array<string>} options.exclude - 排除的字段列表
 * @returns {Object|Array} 转换后的数据
 */
function toSnakeCase(data, options = {}) {
  const { deep = false, exclude = [] } = options;

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => toSnakeCase(item, options));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const result = {};

  Object.keys(data).forEach(key => {
    if (exclude.includes(key)) {
      result[key] = data[key];
      return;
    }

    const snakeKey = camelToSnake(key);
    const value = data[key];

    if (deep && typeof value === 'object' && value !== null) {
      result[snakeKey] = toSnakeCase(value, options);
    } else {
      result[snakeKey] = value;
    }
  });

  return result;
}

/**
 * 转换对象的所有键为 camelCase
 * @param {Object|Array} data - 输入数据
 * @param {Object} options - 可选配置
 * @param {boolean} options.deep - 是否深度转换，默认 false
 * @param {Array<string>} options.exclude - 排除的字段列表
 * @returns {Object|Array} 转换后的数据
 */
function toCamelCase(data, options = {}) {
  const { deep = false, exclude = [] } = options;

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => toCamelCase(item, options));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const result = {};

  Object.keys(data).forEach(key => {
    if (exclude.includes(key)) {
      result[key] = data[key];
      return;
    }

    const camelKey = snakeToCamel(key);
    const value = data[key];

    if (deep && typeof value === 'object' && value !== null) {
      result[camelKey] = toCamelCase(value, options);
    } else {
      result[camelKey] = value;
    }
  });

  return result;
}

/**
 * 基于映射表应用字段转换
 * @param {Object} data - 输入数据
 * @param {Object} mapping - 字段映射表 { oldKey: newKey }
 * @param {Object} options - 可选配置
 * @param {boolean} options.keepOriginal - 是否保留原始字段，默认 false
 * @returns {Object} 转换后的数据
 */
function applyMapping(data, mapping, options = {}) {
  const { keepOriginal = false } = options;

  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => applyMapping(item, mapping, options));
  }

  const result = keepOriginal ? { ...data } : {};

  // 复制未映射的字段
  Object.keys(data).forEach(key => {
    if (!mapping[key] && !keepOriginal) {
      result[key] = data[key];
    }
  });

  // 应用映射
  Object.entries(mapping).forEach(([oldKey, newKey]) => {
    if (data[oldKey] !== undefined) {
      result[newKey] = data[oldKey];
      if (!keepOriginal) {
        delete result[oldKey];
      }
    }
  });

  return result;
}

/**
 * 反向应用映射表（用于响应数据转换）
 * @param {Object} data - 输入数据
 * @param {Object} mapping - 字段映射表 { oldKey: newKey }
 * @param {Object} options - 可选配置
 * @returns {Object} 转换后的数据
 */
function reverseMapping(data, mapping, options = {}) {
  // 反转映射表
  const reversedMapping = {};
  Object.entries(mapping).forEach(([key, value]) => {
    reversedMapping[value] = key;
  });

  return applyMapping(data, reversedMapping, options);
}

/**
 * 智能字段转换（自动检测并应用合适的映射）
 * @param {Object} data - 输入数据
 * @param {string} resource - 资源类型: 'books', 'users', 'borrows' 等
 * @param {string} direction - 转换方向: 'toDb' | 'toApi'
 * @returns {Object} 转换后的数据
 */
function smartConvert(data, resource = 'common', direction = 'toDb') {
  const resourceUpper = resource.toUpperCase();
  const mapping = {
    ...FIELD_MAPPINGS.COMMON,
    ...(FIELD_MAPPINGS[resourceUpper] || {}),
  };

  if (direction === 'toDb') {
    // 前端 -> 数据库（camelCase -> snake_case）
    return applyMapping(data, mapping);
  } else {
    // 数据库 -> 前端（snake_case -> camelCase）
    return reverseMapping(data, mapping);
  }
}

/**
 * 安全获取字段值（支持 camelCase 和 snake_case 双重检查）
 * @param {Object} obj - 对象
 * @param {string} camelKey - camelCase 字段名
 * @param {any} defaultValue - 默认值
 * @returns {any} 字段值
 */
function safeGet(obj, camelKey, defaultValue = null) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const snakeKey = camelToSnake(camelKey);

  return obj[camelKey] !== undefined
    ? obj[camelKey]
    : obj[snakeKey] !== undefined
      ? obj[snakeKey]
      : defaultValue;
}

/**
 * 批量安全获取字段值
 * @param {Object} obj - 对象
 * @param {Array<string>} keys - 字段名列表（camelCase）
 * @param {Object} defaults - 默认值对象
 * @returns {Object} 包含所有字段值的对象
 */
function safeGetMultiple(obj, keys, defaults = {}) {
  const result = {};

  keys.forEach(key => {
    result[key] = safeGet(obj, key, defaults[key]);
  });

  return result;
}

/**
 * 规范化对象字段（确保同时存在 camelCase 和 snake_case 版本）
 * @param {Object} obj - 对象
 * @param {string} resource - 资源类型
 * @returns {Object} 规范化后的对象
 */
function normalize(obj, resource = 'common') {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const resourceUpper = resource.toUpperCase();
  const mapping = {
    ...FIELD_MAPPINGS.COMMON,
    ...(FIELD_MAPPINGS[resourceUpper] || {}),
  };

  const result = { ...obj };

  // 为每个映射添加双向字段
  Object.entries(mapping).forEach(([camelKey, snakeKey]) => {
    if (obj[camelKey] !== undefined) {
      result[snakeKey] = obj[camelKey];
    } else if (obj[snakeKey] !== undefined) {
      result[camelKey] = obj[snakeKey];
    }
  });

  return result;
}

module.exports = {
  camelToSnake,
  snakeToCamel,
  toSnakeCase,
  toCamelCase,
  applyMapping,
  reverseMapping,
  smartConvert,
  safeGet,
  safeGetMultiple,
  normalize,
};
