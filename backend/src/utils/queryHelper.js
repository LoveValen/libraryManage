/**
 * QueryHelper - 统一的查询参数处理工具（函数式封装）
 *
 * 功能：
 * 1. 清理和标准化查询参数
 * 2. 参数类型转换和验证
 * 3. 分页参数处理
 *
 * 注意: 字段映射现在由 Prisma @map 指令处理，代码统一使用 camelCase
 *
 * @example
 * const cleaned = cleanParams(req.query, 'books');
 * const pagination = getPaginationParams(req.query);
 */

const { PAGINATION_DEFAULTS, SORT_DEFAULTS } = require('./constants');

/**
 * 清理查询参数
 * @param {Object} query - 原始查询参数
 * @param {string} resource - 资源类型: 'books', 'users', 'borrows' 等（保留参数兼容性）
 * @param {Object} options - 可选配置
 * @param {boolean} options.removeEmpty - 是否移除空字符串，默认 true
 * @returns {Object} 清理后的查询参数
 */
function cleanParams(query, resource = 'common', options = {}) {
  const { removeEmpty = true } = options;

  // 复制参数对象
  const cleanedQuery = { ...query };

  // 统一参数名称（兼容多种命名方式）
  if (cleanedQuery.keyword || cleanedQuery.search) {
    cleanedQuery.search = cleanedQuery.keyword || cleanedQuery.search;
    delete cleanedQuery.keyword;
  }

  if (cleanedQuery.size || cleanedQuery.limit) {
    cleanedQuery.limit = cleanedQuery.size || cleanedQuery.limit;
    delete cleanedQuery.size;
  }

  // 移除临时参数
  delete cleanedQuery._t; // 时间戳参数

  // 移除空字符串
  if (removeEmpty) {
    Object.keys(cleanedQuery).forEach(key => {
      if (cleanedQuery[key] === '') {
        delete cleanedQuery[key];
      }
    });
  }

  return cleanedQuery;
}

/**
 * 获取分页参数
 * @param {Object} query - 查询参数
 * @param {Object} options - 可选配置
 * @param {number} options.defaultPage - 默认页码
 * @param {number} options.defaultLimit - 默认每页条数
 * @param {number} options.maxLimit - 最大每页条数
 * @returns {Object} { page, limit, skip }
 */
function getPaginationParams(query, options = {}) {
  const {
    defaultPage = PAGINATION_DEFAULTS.PAGE,
    defaultLimit = PAGINATION_DEFAULTS.LIMIT,
    maxLimit = PAGINATION_DEFAULTS.MAX_LIMIT,
  } = options;

  const page = parseIntParam(query.page, defaultPage);
  const limit = Math.min(
    parseIntParam(query.limit, defaultLimit),
    maxLimit
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * 获取排序参数
 * @param {Object} query - 查询参数
 * @param {Object} options - 可选配置
 * @param {string} options.defaultOrderBy - 默认排序字段
 * @param {string} options.defaultOrder - 默认排序方向
 * @returns {Object} { orderBy, order }
 */
function getSortParams(query, options = {}) {
  const {
    defaultOrderBy = SORT_DEFAULTS.ORDER_BY,
    defaultOrder = SORT_DEFAULTS.ORDER,
  } = options;

  return {
    orderBy: query.orderBy || query.sortBy || defaultOrderBy,
    order: query.order || query.sortOrder || defaultOrder,
  };
}

/**
 * 解析整数参数
 * @param {any} value - 参数值
 * @param {number} defaultValue - 默认值
 * @returns {number}
 */
function parseIntParam(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 解析布尔参数
 * @param {any} value - 参数值
 * @param {boolean} defaultValue - 默认值
 * @returns {boolean}
 */
function parseBoolParam(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === true || value === 1 || value === '1';
}

/**
 * 解析数组参数
 * @param {any} value - 参数值（可能是字符串或数组）
 * @param {string} separator - 分隔符，默认逗号
 * @returns {Array}
 */
function parseArrayParam(value, separator = ',') {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 构建完整的查询选项（分页 + 排序）
 * @param {Object} query - 查询参数
 * @param {Object} options - 可选配置
 * @returns {Object} { page, limit, skip, orderBy, order }
 */
function buildQueryOptions(query, options = {}) {
  return {
    ...getPaginationParams(query, options),
    ...getSortParams(query, options),
  };
}

/**
 * 构建日期范围过滤
 * @param {Object} query - 查询参数
 * @param {string} startField - 开始日期字段名
 * @param {string} endField - 结束日期字段名
 * @returns {Object} Prisma where 条件对象
 */
function buildDateRangeFilter(query, startField = 'startDate', endField = 'endDate') {
  const filter = {};

  if (query[startField]) {
    filter.gte = new Date(query[startField]);
  }

  if (query[endField]) {
    const endDate = new Date(query[endField]);
    // 设置为当天的23:59:59
    endDate.setHours(23, 59, 59, 999);
    filter.lte = endDate;
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

/**
 * 构建搜索过滤（支持多字段模糊搜索）
 * @param {string} searchTerm - 搜索关键词
 * @param {Array<string>} fields - 搜索字段列表
 * @returns {Object} Prisma where 条件对象（OR 查询）
 */
function buildSearchFilter(searchTerm, fields = []) {
  if (!searchTerm || fields.length === 0) {
    return null;
  }

  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive', // 不区分大小写
      },
    })),
  };
}

module.exports = {
  cleanParams,
  getPaginationParams,
  getSortParams,
  parseIntParam,
  parseBoolParam,
  parseArrayParam,
  buildQueryOptions,
  buildDateRangeFilter,
  buildSearchFilter,
};
