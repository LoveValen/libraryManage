const prisma = require('../utils/prisma');

class PermissionsService {
  async list(params = {}) {
    const { keyword, group_name } = params;
    
    // 构建查询条件
    const where = {};
    
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    
    if (group_name) {
      where.group_name = { contains: group_name, mode: 'insensitive' };
    }
    
    return prisma.permissions.findMany({
      where,
      orderBy: [{ group_name: 'asc' }, { code: 'asc' }],
    });
  }

  async create(data) {
    const { code, name, group_name = null, description = null } = data;
    if (!code || !name) throw new Error('code 和 name 必填');
    return prisma.permissions.create({
      data: { code, name, group_name, description },
    });
  }

  async update(id, data) {
    return prisma.permissions.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        group_name: data.group_name ?? null,
        description: data.description ?? null,
      },
    });
  }

  async remove(id) {
    // also deletes role_permissions via FK onDelete: Cascade
    return prisma.permissions.delete({ where: { id: Number(id) } });
  }
}

module.exports = new PermissionsService();


