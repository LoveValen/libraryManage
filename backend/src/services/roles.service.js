const prisma = require('../utils/prisma');
const permissionResourcesService = require('./permissionResources.service');

class RolesService {
  async list(params = {}) {
    const { keyword, is_system } = params;
    
    // 构建查询条件
    const where = {};
    
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    
    if (is_system !== undefined && is_system !== null && is_system !== '') {
      where.is_system = is_system === 'true' || is_system === true;
    }
    
    const roles = await prisma.roles.findMany({
      where,
      orderBy: [{ is_system: 'desc' }, { code: 'asc' }],
      include: { rolePermissions: { include: { permission: true } } },
    });

    return roles.map((role) => {
      const permissionIds = [];
      const permissionCodes = new Set();

      (role.rolePermissions || []).forEach((rp) => {
        const permission = rp?.permission;
        const pid = permission?.id ?? rp?.permission_id;
        if (pid !== undefined && pid !== null) {
          permissionIds.push(Number(pid));
        }
        if (permission?.code) {
          permissionCodes.add(permission.code);
        }
      });

      const uniquePermissionIds = Array.from(new Set(permissionIds));

      return {
        ...role,
        permissionIds: uniquePermissionIds,
        permissionCodes: Array.from(permissionCodes),
      };

    });
  }

  async create(data) {
    const { code, name, description = null, is_system = false, permissionIds = [] } = data;
    if (!code || !name) throw new Error('code 和 name 必填');

    const role = await prisma.roles.create({
      data: { code, name, description, is_system },
    });

    if (Array.isArray(permissionIds) && permissionIds.length) {
      await prisma.$transaction(
        permissionIds.map((pid) =>
          prisma.role_permissions.create({
            data: { role_id: role.id, permission_id: Number(pid) },
          })
        )
      );
    }

    return role;
  }

  async update(id, data) {
    const { name, description = null, is_system, permissionIds } = data;
    const roleId = Number(id);

    const role = await prisma.roles.update({
      where: { id: roleId },
      data: { name, description, is_system },
    });

    if (Array.isArray(permissionIds)) {
      await prisma.$transaction([
        prisma.role_permissions.deleteMany({ where: { role_id: roleId } }),
        ...permissionIds.map((pid) =>
          prisma.role_permissions.create({ data: { role_id: roleId, permission_id: Number(pid) } })
        ),
      ]);
    }

    return role;
  }

  async remove(id) {
    const roleId = Number(id);
    await prisma.role_permissions.deleteMany({ where: { role_id: roleId } });
    return prisma.roles.delete({ where: { id: roleId } });
  }

  async setUserRoles(userId, roleIds) {
    const uid = Number(userId);
    const ids = Array.isArray(roleIds) ? roleIds : [];

    await prisma.$transaction([
      prisma.user_roles.deleteMany({ where: { user_id: uid } }),
      ...ids.map((rid) =>
        prisma.user_roles.create({ data: { user_id: uid, role_id: Number(rid) } })
      ),
    ]);

    const context = await this.getUserAccessContext(uid);
    return { success: true, ...context };
  }

  async getUserAccessContext(userId) {
    const uid = Number(userId);
    if (!uid || Number.isNaN(uid)) {
      return { roles: [], permissions: [] };
    }

    const assignments = await prisma.user_roles.findMany({
      where: { user_id: uid },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    const roleCodes = [];
    const permissionCodes = new Set();

    assignments.forEach((item) => {
      const role = item?.role;
      if (!role) return;

      if (role.code) {
        roleCodes.push(role.code);
      }

      if (role.code && role.code.toLowerCase() === 'admin') {
        permissionCodes.clear();
        permissionCodes.add('*');
        return;
      }

      (role.rolePermissions || []).forEach((rp) => {
        const code = rp?.permission?.code;
        if (code) {
          permissionCodes.add(code);
        }
      });
    });

    const uniqueRoles = Array.from(new Set(roleCodes.map((code) => code.trim()))).filter(Boolean);
    const permissions = permissionCodes.has('*')
      ? ['*']
      : Array.from(permissionCodes);

    const resources = await permissionResourcesService.getAccessibleResources(permissions);

    return {
      roles: uniqueRoles,
      permissions,
      resources,
    };
  }

  async getUserPermissions(userId) {
    const context = await this.getUserAccessContext(userId);
    return context.permissions;
  }
}

module.exports = new RolesService();


