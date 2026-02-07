const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/apiError');

// Cache for active tags (refreshed periodically)
let activeTagsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Format tag data for response
 */
const formatTag = (tag) => ({
  id: tag.id,
  name: tag.name,
  code: tag.code,
  color: tag.color,
  description: tag.description,
  sortOrder: tag.sortOrder,
  isActive: tag.isActive,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt
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
      { code: { contains: normalizedKeyword } }
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

  const existing = await prisma.book_tags.findFirst({
    where: {
      OR: conditions,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  if (existing) {
    throw new ConflictError('标签名称或编码已存在');
  }
};

/**
 * Prepare tag data for database
 */
const prepareTagData = (payload, isUpdate = false) => {
  const data = {};

  // Handle name
  if (payload.name !== undefined) {
    data.name = payload.name?.trim() || null;
  }

  // Handle code
  if (payload.code !== undefined || (!isUpdate && !payload.code)) {
    data.code = payload.code?.trim() || (payload.name?.trim() || null);
  }

  // Handle color
  if (payload.color !== undefined) {
    data.color = payload.color || null;
  }

  // Handle description
  if (payload.description !== undefined) {
    data.description = payload.description || null;
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
 * Clear active tags cache
 */
const clearCache = () => {
  activeTagsCache = null;
  cacheTimestamp = 0;
};

/**
 * Validate tag IDs
 */
const validateTagIds = (ids) => {
  return [...new Set((ids || []).map(Number).filter(id => !isNaN(id)))];
};

/**
 * Validate tag names
 */
const validateTagNames = (names) => {
  return [...new Set(
    (names || [])
      .map(name => (typeof name === 'string' ? name.trim() : ''))
      .filter(name => name.length > 0)
  )];
};

/**
 * 获取标签列表
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
    prisma.book_tags.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: Number(size)
    }),
    prisma.book_tags.count({ where })
  ]);

  return {
    tags: items.map(formatTag),
    total,
    page: Number(page),
    size: Number(size)
  };
};

/**
 * 获取可用标签（带缓存）
 */
const listActive = async () => {
  const now = Date.now();

  // Check cache validity
  if (activeTagsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return activeTagsCache;
  }

  // Fetch fresh data
  const tags = await prisma.book_tags.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  });

  // Update cache
  activeTagsCache = tags.map(formatTag);
  cacheTimestamp = now;

  return activeTagsCache;
};

/**
 * 根据ID获取标签
 */
const getById = async (id) => {
  const tag = await prisma.book_tags.findUnique({
    where: { id: Number(id) }
  });

  if (!tag) {
    throw new NotFoundError('标签不存在');
  }

  return formatTag(tag);
};

/**
 * 创建标签
 */
const create = async (payload) => {
  // Validate required fields
  if (!payload.name?.trim()) {
    throw new BadRequestError('标签名称不能为空');
  }

  await ensureUnique(payload.name, payload.code);

  const data = prepareTagData(payload, false);
  const tag = await prisma.book_tags.create({ data });

  // Clear cache on creation
  clearCache();

  return formatTag(tag);
};

/**
 * 更新标签
 */
const update = async (id, payload) => {
  const tagId = Number(id);

  // Check existence
  const existing = await prisma.book_tags.findUnique({
    where: { id: tagId }
  });

  if (!existing) {
    throw new NotFoundError('标签不存在');
  }

  // Check uniqueness if name or code changed
  if (payload.name && payload.name.trim() !== existing.name) {
    await ensureUnique(payload.name, null, tagId);
  }

  if (payload.code && payload.code.trim() !== existing.code) {
    await ensureUnique(null, payload.code, tagId);
  }

  const data = prepareTagData(payload, true);

  // Only update if there are changes
  if (Object.keys(data).length === 0) {
    return formatTag(existing);
  }

  const tag = await prisma.book_tags.update({
    where: { id: tagId },
    data
  });

  // Clear cache on update
  clearCache();

  return formatTag(tag);
};

/**
 * 删除标签
 */
const remove = async (id) => {
  const tagId = Number(id);

  // Check existence
  const tag = await prisma.book_tags.findUnique({
    where: { id: tagId }
  });

  if (!tag) {
    throw new NotFoundError('标签不存在');
  }

  // Check for associated books
  const count = await prisma.book_tag_relations.count({
    where: { tagId: tagId }
  });

  if (count > 0) {
    throw new BadRequestError(`该标签仍有 ${count} 本关联图书，无法删除`);
  }

  await prisma.book_tags.delete({
    where: { id: tagId }
  });

  // Clear cache on deletion
  clearCache();

  return true;
};

/**
 * 同步图书标签关联（优化版）
 */
const syncBookTags = async (bookId, tagIds = []) => {
  const numericIds = validateTagIds(tagIds);

  // Get current relations
  const existing = await prisma.book_tag_relations.findMany({
    where: { bookId: bookId },
    select: { tagId: true }
  });

  const existingIds = existing.map(item => item.tagId);
  const toAdd = numericIds.filter(id => !existingIds.includes(id));
  const toRemove = existingIds.filter(id => !numericIds.includes(id));

  // Use transaction for consistency
  await prisma.$transaction(async (tx) => {
    // Add new relations
    if (toAdd.length > 0) {
      await tx.book_tag_relations.createMany({
        data: toAdd.map(tagId => ({ bookId: bookId, tagId: tagId })),
        skipDuplicates: true
      });
    }

    // Remove old relations
    if (toRemove.length > 0) {
      await tx.book_tag_relations.deleteMany({
        where: {
          bookId: bookId,
          tagId: { in: toRemove }
        }
      });
    }
  });

  // Return updated tags
  if (numericIds.length > 0) {
    const tags = await prisma.book_tags.findMany({
      where: { id: { in: numericIds } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    return tags.map(formatTag);
  }

  return [];
};

/**
 * 批量获取标签（按ID）
 */
const findManyByIds = async (ids = []) => {
  const validIds = validateTagIds(ids);

  if (validIds.length === 0) {
    return [];
  }

  const tags = await prisma.book_tags.findMany({
    where: { id: { in: validIds } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });

  return tags.map(formatTag);
};

/**
 * 批量获取标签（按名称）
 */
const findManyByNames = async (names = []) => {
  const validNames = validateTagNames(names);

  if (validNames.length === 0) {
    return [];
  }

  const tags = await prisma.book_tags.findMany({
    where: { name: { in: validNames } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });

  return tags.map(formatTag);
};

/**
 * 获取标签统计信息
 */
const getStatistics = async () => {
  const [total, active, withBooks, topUsed] = await Promise.all([
    prisma.book_tags.count(),
    prisma.book_tags.count({ where: { isActive: true } }),
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT tag_id) as count
      FROM book_tag_relations
    `,
    prisma.$queryRaw`
      SELECT
        t.id,
        t.name,
        COUNT(r.book_id) as book_count
      FROM book_tags t
      LEFT JOIN book_tag_relations r ON t.id = r.tag_id
      GROUP BY t.id, t.name
      ORDER BY book_count DESC
      LIMIT 10
    `
  ]);

  return {
    total,
    active,
    used: Number(withBooks[0]?.count || 0),
    unused: total - Number(withBooks[0]?.count || 0),
    topUsed: topUsed.map(item => ({
      id: item.id,
      name: item.name,
      bookCount: Number(item.book_count)
    }))
  };
};

/**
 * 获取图书的所有标签
 */
const getBookTags = async (bookId) => {
  const relations = await prisma.book_tag_relations.findMany({
    where: { bookId: bookId },
    include: {
      tag: true
    },
    orderBy: {
      tag: {
        sortOrder: 'asc'
      }
    }
  });

  return relations.map(rel => formatTag(rel.tag));
};

/**
 * 批量同步多本图书的标签
 */
const batchSyncBookTags = async (bookTagPairs = []) => {
  // bookTagPairs: [{ bookId: 1, tagIds: [1,2,3] }, ...]
  const results = [];

  // Use transaction for consistency
  await prisma.$transaction(async (tx) => {
    for (const { bookId, tagIds } of bookTagPairs) {
      const numericIds = validateTagIds(tagIds);

      // Get current relations
      const existing = await tx.book_tag_relations.findMany({
        where: { bookId: bookId },
        select: { tagId: true }
      });

      const existingIds = existing.map(item => item.tagId);
      const toAdd = numericIds.filter(id => !existingIds.includes(id));
      const toRemove = existingIds.filter(id => !numericIds.includes(id));

      // Add new relations
      if (toAdd.length > 0) {
        await tx.book_tag_relations.createMany({
          data: toAdd.map(tagId => ({ bookId: bookId, tagId: tagId })),
          skipDuplicates: true
        });
      }

      // Remove old relations
      if (toRemove.length > 0) {
        await tx.book_tag_relations.deleteMany({
          where: {
            bookId: bookId,
            tagId: { in: toRemove }
          }
        });
      }

      results.push({ bookId, success: true });
    }
  });

  return results;
};

module.exports = {
  list,
  listActive,
  getById,
  create,
  update,
  remove,
  syncBookTags,
  findManyByIds,
  findManyByNames,
  getStatistics,
  getBookTags,
  batchSyncBookTags,
  clearCache,
  formatTag
};