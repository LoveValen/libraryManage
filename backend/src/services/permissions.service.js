const prisma = require('../utils/prisma');

class PermissionsService {
  async list(params = {}) {
    const { keyword, group_name, groupName } = params;
    const normalizedGroupName = groupName ?? group_name;
    
    // 构建查询条件
    const where = {};
    
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    
    if (normalizedGroupName) {
      where.groupName = { contains: normalizedGroupName, mode: 'insensitive' };
    }
    
    return prisma.permissions.findMany({
      where,
      orderBy: [{ groupName: 'asc' }, { code: 'asc' }],
    });
  }

  async create(data) {
    const { code, name, group_name = null, groupName = null, description = null } = data;
    const normalizedGroupName = groupName ?? group_name;
    if (!code || !name) throw new Error('code 和 name 必填');
    return prisma.permissions.create({
      data: { code, name, groupName: normalizedGroupName, description },
    });
  }

  async update(id, data) {
    return prisma.permissions.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        groupName: data.groupName ?? data.group_name ?? null,
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


