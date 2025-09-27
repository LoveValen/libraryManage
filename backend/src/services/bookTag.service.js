const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/apiError');

/**
 * 图书标签服务
 * 负责标签的增删改查以及与图书的关联同步
 */
class BookTagService {
  /**
   * 获取标签列表
   * @param {Object} params 查询参数
   */
  async list(params = {}) {
    const {
      keyword,
      isActive,
      page = 1,
      size = 20
    } = params;

    const where = {};
    const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
    if (normalizedKeyword) {
      where.OR = [
        { name: { contains: normalizedKeyword } },
        { code: { contains: normalizedKeyword } }
      ];
    }
    if (typeof isActive === 'boolean') {
      where.is_active = isActive;
    }

    const skip = (Number(page) - 1) * Number(size);
    const [items, total] = await Promise.all([
      prisma.book_tags.findMany({
        where,
        orderBy: [
          { sort_order: 'asc' },
          { created_at: 'desc' }
        ],
        skip,
        take: Number(size)
      }),
      prisma.book_tags.count({ where })
    ]);

    return {
      tags: items.map(this._formatTag),
      total,
      page: Number(page),
      size: Number(size)
    };
  }

  /**
   * 获取可用标签（下拉使用）
   */
  async listActive() {
    const tags = await prisma.book_tags.findMany({
      where: { is_active: true },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    return tags.map(tag => this._formatTag(tag));
  }

  /**
   * 根据ID获取标签
   */
  async getById(id) {
    const tag = await prisma.book_tags.findUnique({ where: { id: Number(id) } });
    if (!tag) {
      throw new NotFoundError('标签不存在');
    }
    return this._formatTag(tag);
  }

  /**
   * 创建标签
   */
  async create(payload) {
    await this._ensureUnique(payload.name, payload.code);

    const tag = await prisma.book_tags.create({
      data: {
        name: payload.name.trim(),
        code: payload.code?.trim() || payload.name.trim(),
        color: payload.color || null,
        description: payload.description || null,
        sort_order: typeof payload.sortOrder === 'number' ? payload.sortOrder : (payload.sort_order ?? 0),
        is_active: payload.isActive ?? payload.is_active ?? true
      }
    });

    return this._formatTag(tag);
  }

  /**
   * 更新标签
   */
  async update(id, payload) {
    const tagId = Number(id);
    const existing = await prisma.book_tags.findUnique({ where: { id: tagId } });
    if (!existing) {
      throw new NotFoundError('标签不存在');
    }

    if (payload.name && payload.name.trim() !== existing.name) {
      await this._ensureUnique(payload.name, null, tagId);
    }
    if (payload.code && payload.code.trim() !== existing.code) {
      await this._ensureUnique(null, payload.code, tagId);
    }

    const data = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.code !== undefined) data.code = payload.code ? payload.code.trim() : null;
    if (payload.color !== undefined) data.color = payload.color || null;
    if (payload.description !== undefined) data.description = payload.description || null;
    if (payload.sortOrder !== undefined) data.sort_order = payload.sortOrder;
    if (payload.sort_order !== undefined) data.sort_order = payload.sort_order;
    if (payload.isActive !== undefined) data.is_active = payload.isActive;
    if (payload.is_active !== undefined) data.is_active = payload.is_active;

    const tag = await prisma.book_tags.update({
      where: { id: tagId },
      data
    });

    return this._formatTag(tag);
  }

  /**
   * 删除标签（若仍有关联图书则拒绝）
   */
  async remove(id) {
    const tagId = Number(id);
    const tag = await prisma.book_tags.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundError('标签不存在');
    }

    const count = await prisma.book_tag_relations.count({ where: { tag_id: tagId } });
    if (count > 0) {
      throw new BadRequestError('该标签仍有关联图书，无法删除');
    }

    await prisma.book_tags.delete({ where: { id: tagId } });
    return true;
  }

  /**
   * 同步图书标签关联
   */
  async syncBookTags(bookId, tagIds = []) {
    const numericIds = Array.from(new Set((tagIds || []).map(Number).filter(id => !Number.isNaN(id))));

    const existing = await prisma.book_tag_relations.findMany({
      where: { book_id: bookId },
      select: { tag_id: true }
    });
    const existingIds = existing.map(item => item.tag_id);

    const toAdd = numericIds.filter(id => !existingIds.includes(id));
    const toRemove = existingIds.filter(id => !numericIds.includes(id));

    if (toAdd.length > 0) {
      await prisma.book_tag_relations.createMany({
        data: toAdd.map(tagId => ({ book_id: bookId, tag_id: tagId })),
        skipDuplicates: true
      });
    }

    if (toRemove.length > 0) {
      await prisma.book_tag_relations.deleteMany({
        where: {
          book_id: bookId,
          tag_id: { in: toRemove }
        }
      });
    }

    const tags = await prisma.book_tags.findMany({
      where: { id: { in: numericIds } },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }]
    });

    return tags.map(this._formatTag);
  }

  /**
   * 批量获取标签
   */
  async findManyByIds(ids = []) {
    const numericIds = Array.from(new Set((ids || []).map(Number).filter(id => !Number.isNaN(id))));
    if (numericIds.length === 0) {
      return [];
    }
    const tags = await prisma.book_tags.findMany({
      where: { id: { in: numericIds } }
    });
    return tags.map(this._formatTag);
  }

  async findManyByNames(names = []) {
    const normalizedNames = Array.from(new Set(
      (names || [])
        .map(name => (typeof name === 'string' ? name.trim() : ''))
        .filter(name => name.length > 0)
    ));

    if (normalizedNames.length === 0) {
      return [];
    }

    const tags = await prisma.book_tags.findMany({
      where: {
        name: { in: normalizedNames }
      }
    });

    return tags.map(this._formatTag);
  }

  _formatTag(tag) {
    return {
      id: tag.id,
      name: tag.name,
      code: tag.code,
      color: tag.color,
      description: tag.description,
      sortOrder: tag.sort_order,
      isActive: tag.is_active,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at
    };
  }

  async _ensureUnique(name, code, excludeId = null) {
    const conditions = [];
    if (name) {
      conditions.push({ name: name.trim() });
    }
    if (code) {
      conditions.push({ code: code.trim() });
    }
    if (conditions.length === 0) {
      return;
    }

    const existing = await prisma.book_tags.findFirst({
      where: {
        OR: conditions,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
    if (existing) {
      throw new ConflictError('标签名称或编码已存在');
    }
  }
}

module.exports = new BookTagService();
