const prisma = require('../utils/prisma');

class PermissionsService {
  async list() {
    return prisma.permissions.findMany({
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


