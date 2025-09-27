const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/apiError');

/**
 * 图书存放位置服务
 * 负责位置数据的维护及校验
 */
class BookLocationService {
  /**
   * 分页查询位置
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
        { code: { contains: normalizedKeyword } },
        { area: { contains: normalizedKeyword } },
        { shelf: { contains: normalizedKeyword } }
      ];
    }
    if (typeof isActive === 'boolean') {
      where.is_active = isActive;
    }

    const skip = (Number(page) - 1) * Number(size);
    const [items, total] = await Promise.all([
      prisma.book_locations.findMany({
        where,
        orderBy: [
          { sort_order: 'asc' },
          { created_at: 'desc' }
        ],
        skip,
        take: Number(size)
      }),
      prisma.book_locations.count({ where })
    ]);

    return {
      locations: items.map(this._formatLocation),
      total,
      page: Number(page),
      size: Number(size)
    };
  }

  /**
   * 获取所有有效位置（下拉使用）
   */
  async listActive() {
    const locations = await prisma.book_locations.findMany({
      where: { is_active: true },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });
    return locations.map(this._formatLocation);
  }

  async getById(id) {
    const location = await prisma.book_locations.findUnique({ where: { id: Number(id) } });
    if (!location) {
      throw new NotFoundError('存放位置不存在');
    }
    return this._formatLocation(location);
  }

  async create(payload) {
    await this._ensureUnique(payload.name, payload.code);

    const location = await prisma.book_locations.create({
      data: {
        name: payload.name.trim(),
        code: payload.code?.trim() || payload.name.trim(),
        area: payload.area || null,
        floor: payload.floor || null,
        shelf: payload.shelf || null,
        description: payload.description || null,
        capacity: payload.capacity ?? null,
        sort_order: payload.sortOrder ?? payload.sort_order ?? 0,
        is_active: payload.isActive ?? payload.is_active ?? true
      }
    });

    return this._formatLocation(location);
  }

  async update(id, payload) {
    const locationId = Number(id);
    const existing = await prisma.book_locations.findUnique({ where: { id: locationId } });
    if (!existing) {
      throw new NotFoundError('存放位置不存在');
    }

    if (payload.name && payload.name.trim() !== existing.name) {
      await this._ensureUnique(payload.name, null, locationId);
    }
    if (payload.code && payload.code.trim() !== existing.code) {
      await this._ensureUnique(null, payload.code, locationId);
    }

    const data = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.code !== undefined) data.code = payload.code ? payload.code.trim() : null;
    if (payload.area !== undefined) data.area = payload.area || null;
    if (payload.floor !== undefined) data.floor = payload.floor || null;
    if (payload.shelf !== undefined) data.shelf = payload.shelf || null;
    if (payload.description !== undefined) data.description = payload.description || null;
    if (payload.capacity !== undefined) data.capacity = payload.capacity;
    if (payload.sortOrder !== undefined) data.sort_order = payload.sortOrder;
    if (payload.sort_order !== undefined) data.sort_order = payload.sort_order;
    if (payload.isActive !== undefined) data.is_active = payload.isActive;
    if (payload.is_active !== undefined) data.is_active = payload.is_active;

    const location = await prisma.book_locations.update({
      where: { id: locationId },
      data
    });

    return this._formatLocation(location);
  }

  async remove(id) {
    const locationId = Number(id);
    const location = await prisma.book_locations.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundError('存放位置不存在');
    }

    const count = await prisma.books.count({ where: { location_id: locationId } });
    if (count > 0) {
      throw new BadRequestError('该存放位置仍有关联图书，无法删除');
    }

    await prisma.book_locations.delete({ where: { id: locationId } });
    return true;
  }

  async findByIdRaw(id) {
    if (id === null || id === undefined) {
      return null;
    }
    return prisma.book_locations.findUnique({ where: { id: Number(id) } });
  }

  async findByName(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const location = await prisma.book_locations.findFirst({
      where: {
        name: trimmedName
      }
    });

    return location ? this._formatLocation(location) : null;
  }

  _formatLocation(location) {
    return {
      id: location.id,
      name: location.name,
      code: location.code,
      area: location.area,
      floor: location.floor,
      shelf: location.shelf,
      description: location.description,
      capacity: location.capacity,
      sortOrder: location.sort_order,
      isActive: location.is_active,
      createdAt: location.created_at,
      updatedAt: location.updated_at
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

    const existing = await prisma.book_locations.findFirst({
      where: {
        OR: conditions,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
    if (existing) {
      throw new ConflictError('存放位置名称或编码已存在');
    }
  }
}

module.exports = new BookLocationService();
