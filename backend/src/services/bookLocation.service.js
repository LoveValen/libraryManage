const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/apiError');

// Cache for active locations (refreshed periodically)
let activeLocationsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Format location data for response
 */
const formatLocation = (location) => ({
  id: location.id,
  name: location.name,
  code: location.code,
  area: location.area,
  floor: location.floor,
  shelf: location.shelf,
  description: location.description,
  capacity: location.capacity,
  sortOrder: location.sortOrder,
  isActive: location.isActive,
  createdAt: location.createdAt,
  updatedAt: location.updatedAt
});

/**
 * Build where clause for search
 */
const buildWhereClause = (keyword, isActive) => {
  const where = {};

  if (keyword?.trim()) {
    const normalizedKeyword = keyword.trim();
    where.OR = [
      { name: { contains: normalizedKeyword } },
      { code: { contains: normalizedKeyword } },
      { area: { contains: normalizedKeyword } },
      { shelf: { contains: normalizedKeyword } }
    ];
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  return where;
};

/**
 * Ensure unique name/code
 */
const ensureUnique = async (name, code, excludeId = null) => {
  const conditions = [];

  if (name?.trim()) {
    conditions.push({ name: name.trim() });
  }

  if (code?.trim()) {
    conditions.push({ code: code.trim() });
  }

  if (conditions.length === 0) return;

  const existing = await prisma.book_locations.findFirst({
    where: {
      OR: conditions,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  if (existing) {
    throw new ConflictError('存放位置名称或编码已存在');
  }
};

/**
 * Prepare location data for database
 */
const prepareLocationData = (payload, isUpdate = false) => {
  const data = {};

  // Handle name
  if (payload.name !== undefined) {
    data.name = payload.name?.trim() || null;
  }

  // Handle code
  if (payload.code !== undefined || (!isUpdate && !payload.code)) {
    data.code = payload.code?.trim() || (payload.name?.trim() || null);
  }

  // Handle other fields
  const fields = ['area', 'floor', 'shelf', 'description'];
  fields.forEach(field => {
    if (payload[field] !== undefined) {
      data[field] = payload[field] || null;
    }
  });

  // Handle capacity
  if (payload.capacity !== undefined) {
    data.capacity = payload.capacity ?? null;
  }

  // Handle sort order (support both camelCase and snake_case)
  if (payload.sortOrder !== undefined || payload.sort_order !== undefined) {
    data.sortOrder = payload.sortOrder ?? payload.sort_order ?? 0;
  }

  // Handle isActive (support both camelCase and snake_case)
  if (payload.isActive !== undefined || payload.is_active !== undefined) {
    data.isActive = payload.isActive ?? payload.is_active ?? true;
  }

  return data;
};

/**
 * Clear active locations cache
 */
const clearCache = () => {
  activeLocationsCache = null;
  cacheTimestamp = 0;
};

/**
 * 分页查询位置
 */
const list = async (params = {}) => {
  const {
    keyword,
    isActive,
    page = 1,
    size = 20
  } = params;

  const where = buildWhereClause(keyword, isActive);
  const skip = (Number(page) - 1) * Number(size);

  const [items, total] = await Promise.all([
    prisma.book_locations.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: Number(size)
    }),
    prisma.book_locations.count({ where })
  ]);

  return {
    locations: items.map(formatLocation),
    total,
    page: Number(page),
    size: Number(size)
  };
};

/**
 * 获取所有有效位置（带缓存）
 */
const listActive = async () => {
  const now = Date.now();

  // Check cache validity
  if (activeLocationsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return activeLocationsCache;
  }

  // Fetch fresh data
  const locations = await prisma.book_locations.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  });

  // Update cache
  activeLocationsCache = locations.map(formatLocation);
  cacheTimestamp = now;

  return activeLocationsCache;
};

/**
 * 根据ID获取位置
 */
const getById = async (id) => {
  const location = await prisma.book_locations.findUnique({
    where: { id: Number(id) }
  });

  if (!location) {
    throw new NotFoundError('存放位置不存在');
  }

  return formatLocation(location);
};

/**
 * 创建位置
 */
const create = async (payload) => {
  // Validate required fields
  if (!payload.name?.trim()) {
    throw new BadRequestError('位置名称不能为空');
  }

  await ensureUnique(payload.name, payload.code);

  const data = prepareLocationData(payload, false);
  const location = await prisma.book_locations.create({ data });

  // Clear cache on creation
  clearCache();

  return formatLocation(location);
};

/**
 * 更新位置
 */
const update = async (id, payload) => {
  const locationId = Number(id);

  // Check existence
  const existing = await prisma.book_locations.findUnique({
    where: { id: locationId }
  });

  if (!existing) {
    throw new NotFoundError('存放位置不存在');
  }

  // Check uniqueness if name or code changed
  if (payload.name && payload.name.trim() !== existing.name) {
    await ensureUnique(payload.name, null, locationId);
  }

  if (payload.code && payload.code.trim() !== existing.code) {
    await ensureUnique(null, payload.code, locationId);
  }

  const data = prepareLocationData(payload, true);

  // Only update if there are changes
  if (Object.keys(data).length === 0) {
    return formatLocation(existing);
  }

  const location = await prisma.book_locations.update({
    where: { id: locationId },
    data
  });

  // Clear cache on update
  clearCache();

  return formatLocation(location);
};

/**
 * 删除位置
 */
const remove = async (id) => {
  const locationId = Number(id);

  // Check existence
  const location = await prisma.book_locations.findUnique({
    where: { id: locationId }
  });

  if (!location) {
    throw new NotFoundError('存放位置不存在');
  }

  // Check for associated books
  const count = await prisma.books.count({
    where: { locationId: locationId, isDeleted: false }
  });

  if (count > 0) {
    throw new BadRequestError(`该存放位置仍有 ${count} 本关联图书，无法删除`);
  }

  await prisma.book_locations.delete({
    where: { id: locationId }
  });

  // Clear cache on deletion
  clearCache();

  return true;
};

/**
 * 根据ID获取原始数据
 */
const findByIdRaw = async (id) => {
  if (id === null || id === undefined) {
    return null;
  }

  return prisma.book_locations.findUnique({
    where: { id: Number(id) }
  });
};

/**
 * 根据名称查找位置
 */
const findByName = async (name) => {
  if (!name?.trim()) {
    return null;
  }

  const location = await prisma.book_locations.findFirst({
    where: { name: name.trim() }
  });

  return location ? formatLocation(location) : null;
};

/**
 * 批量获取位置信息
 */
const findManyByIds = async (ids = []) => {
  const validIds = [...new Set(ids.map(Number).filter(id => !isNaN(id)))];

  if (validIds.length === 0) {
    return [];
  }

  const locations = await prisma.book_locations.findMany({
    where: { id: { in: validIds } },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  });

  return locations.map(formatLocation);
};

/**
 * 获取位置统计信息
 */
const getStatistics = async () => {
  const [total, active, withBooks] = await Promise.all([
    prisma.book_locations.count(),
    prisma.book_locations.count({ where: { isActive: true } }),
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT location_id) as count
      FROM books
      WHERE location_id IS NOT NULL AND is_deleted = false
    `
  ]);

  return {
    total,
    active,
    withBooks: Number(withBooks[0]?.count || 0),
    empty: total - Number(withBooks[0]?.count || 0)
  };
};

module.exports = {
  list,
  listActive,
  getById,
  create,
  update,
  remove,
  findByIdRaw,
  findByName,
  findManyByIds,
  getStatistics,
  clearCache,
  formatLocation
};