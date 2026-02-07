const prisma = require('../utils/prisma');
const { BadRequestError, NotFoundError } = require('../utils/apiError');

/**
 * 权限资源服务：负责维护路由、菜单、按钮与权限的绑定关系
 */
class PermissionResourcesService {
  /**
   * 列出所有资源，支持基础筛选
   * @param {Object} filters
   */
  async list(filters = {}) {
    const {
      type,
      keyword,
      isActive,
    } = filters;

    const where = {};

    if (type) {
      where.type = type;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (keyword) {
      where.OR = [
        { resourceKey: { contains: keyword } },
        { resourceName: { contains: keyword } },
        { routePath: { contains: keyword } },
        { routeName: { contains: keyword } },
      ];
    }

    const items = await prisma.permission_resources.findMany({
      where,
      include: { permission: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return items.map((item) => this.#formatResource(item));
  }

  /**
   * 新建权限资源
   */
  async create(data) {
    const payload = await this.#validatePayload(data);
    const item = await prisma.permission_resources.create({
      data: {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { permission: true },
    });
    return this.#formatResource(item);
  }

  /**
   * 更新权限资源
   */
  async update(id, data) {
    const resourceId = Number(id);
    if (!resourceId || Number.isNaN(resourceId)) {
      throw new BadRequestError('资源编号无效');
    }

    const exists = await prisma.permission_resources.findUnique({
      where: { id: resourceId },
    });

    if (!exists) {
      throw new NotFoundError('资源不存在');
    }

    const payload = await this.#validatePayload(data, { partial: true });
    const item = await prisma.permission_resources.update({
      where: { id: resourceId },
      data: {
        ...payload,
        updatedAt: new Date(),
      },
      include: { permission: true },
    });

    return this.#formatResource(item);
  }

  /**
   * 删除权限资源
   */
  async remove(id) {
    const resourceId = Number(id);
    if (!resourceId || Number.isNaN(resourceId)) {
      throw new BadRequestError('资源编号无效');
    }

    await prisma.permission_resources.delete({
      where: { id: resourceId },
    });

    return { success: true };
  }

  /**
   * 根据权限代码集合计算可访问的路由与按钮资源
   * @param {string[]} permissionCodes
   */
  async getAccessibleResources(permissionCodes = []) {
    const normalizedCodes = Array.isArray(permissionCodes)
      ? permissionCodes.filter((code) => typeof code === 'string' && code.trim().length > 0)
      : [];

    const hasWildcard = normalizedCodes.includes('*');

    const whereClause = {
      isActive: true,
    };

    if (!hasWildcard) {
      whereClause.OR = [
        { permission: { code: { in: normalizedCodes } } },
        { permissionId: null },
      ];
    }

    const resources = await prisma.permission_resources.findMany({
      where: whereClause,
      include: { permission: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    // 非超级权限场景下进一步过滤无对应权限的资源
    const accessible = hasWildcard
      ? resources
      : resources.filter((item) => {
          if (!item.permissionId) {
            return true;
          }
          const code = item.permission?.code;
          return code && normalizedCodes.includes(code);
        });

    const formatted = accessible.map((item) => this.#formatResource(item));
    const routeResources = formatted.filter((item) => item.type === 'ROUTE');
    const buttonResources = formatted.filter((item) => item.type === 'BUTTON');

    const tree = this.#buildRouteTree(routeResources);
    const routeNames = routeResources
      .map((item) => item.routeName)
      .filter((name) => typeof name === 'string' && name.length > 0);
    const routeNameSet = Array.from(new Set(routeNames));

    const buttonMap = {};
    buttonResources.forEach((item) => {
      const parentKey = item.parentKey || 'root';
      if (!buttonMap[parentKey]) {
        buttonMap[parentKey] = [];
      }
      buttonMap[parentKey].push(item);
    });

    // 按 sortOrder 排序按钮
    Object.keys(buttonMap).forEach((key) => {
      buttonMap[key].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return {
      routes: tree,
      flatRoutes: routeResources,
      routeNames: routeNameSet,
      buttons: buttonResources,
      buttonMap,
    };
  }

  /**
   * 校验并整理写入字段
   * @param {Object} data
   * @param {Object} options
   */
  async #validatePayload(data, options = {}) {
    const {
      type,
      resource_key: resourceKey,
      resourceKey: resourceKeyCamel,
      resource_name: resourceName,
      route_path: routePath,
      routePath: routePathCamel,
      route_name: routeName,
      routeName: routeNameCamel,
      component,
      parent_key: parentKey,
      parentKey: parentKeyCamel,
      meta,
      sort_order: sortOrder,
      sortOrder: sortOrderCamel,
      permission_id: permissionId,
      permissionId: permissionIdCamel,
      is_active: isActive,
      isActive: isActiveCamel,
    } = data || {};

    const payload = {};

    if (!options.partial || type !== undefined) {
      if (type && !['ROUTE', 'BUTTON'].includes(type)) {
        throw new BadRequestError('资源类型必须为 ROUTE 或 BUTTON');
      }
      if (type) {
        payload.type = type;
      }
    }

    const finalResourceKey = resourceKey ?? resourceKeyCamel;
    if (!options.partial || finalResourceKey !== undefined) {
      if (!finalResourceKey || typeof finalResourceKey !== 'string') {
        throw new BadRequestError('资源标识不可为空');
      }
      payload.resourceKey = finalResourceKey.trim();
    }

    const finalResourceName = resourceName ?? data?.name ?? null;
    if (finalResourceName !== undefined) {
      payload.resourceName = finalResourceName ? String(finalResourceName).trim() : null;
    }

    const finalRoutePath = routePath ?? routePathCamel ?? null;
    if (finalRoutePath !== undefined) {
      payload.routePath = finalRoutePath ? String(finalRoutePath).trim() : null;
    }

    const finalRouteName = routeName ?? routeNameCamel ?? null;
    if (finalRouteName !== undefined) {
      payload.routeName = finalRouteName ? String(finalRouteName).trim() : null;
    }

    if (component !== undefined) {
      payload.component = component ? String(component).trim() : null;
    }

    const finalParentKey = parentKey ?? parentKeyCamel ?? null;
    if (finalParentKey !== undefined) {
      payload.parentKey = finalParentKey ? String(finalParentKey).trim() : null;
    }

    if (meta !== undefined) {
      if (meta === null || typeof meta === 'object') {
        payload.meta = meta;
      } else {
        throw new BadRequestError('meta 字段必须为对象或 null');
      }
    }

    const finalSortOrder = sortOrder ?? sortOrderCamel;
    if (finalSortOrder !== undefined) {
      const num = Number(finalSortOrder);
      if (Number.isNaN(num)) {
        throw new BadRequestError('排序值必须为数字');
      }
      payload.sortOrder = num;
    }

    const finalPermissionId = permissionId ?? permissionIdCamel;
    if (finalPermissionId !== undefined) {
      if (finalPermissionId === null) {
        payload.permissionId = null;
      } else {
        const pid = Number(finalPermissionId);
        if (!pid || Number.isNaN(pid)) {
          throw new BadRequestError('权限编号必须为数字');
        }
        const exists = await prisma.permissions.findUnique({ where: { id: pid } });
        if (!exists) {
          throw new BadRequestError('关联的权限不存在');
        }
        payload.permissionId = pid;
      }
    }

    const finalIsActive = isActive ?? isActiveCamel;
    if (finalIsActive !== undefined) {
      payload.isActive = Boolean(finalIsActive);
    }

    return payload;
  }

  /**
   * 统一格式化资源数据
   */
  #formatResource(item) {
    if (!item) return null;
    return {
      id: item.id,
      type: item.type,
      resourceKey: item.resourceKey,
      resourceName: item.resourceName,
      routePath: item.routePath,
      routeName: item.routeName,
      component: item.component,
      parentKey: item.parentKey,
      meta: item.meta || {},
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive,
      permissionId: item.permissionId,
      permissionCode: item.permission?.code || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * 构造路由树结构
   * @param {Array} routes
   */
  #buildRouteTree(routes = []) {
    const nodeMap = new Map();
    const roots = [];

    routes.forEach((item) => {
      nodeMap.set(item.resourceKey, {
        ...item,
        children: [],
      });
    });

    routes.forEach((item) => {
      const node = nodeMap.get(item.resourceKey);
      const parentKey = item.parentKey;

      if (parentKey && nodeMap.has(parentKey)) {
        nodeMap.get(parentKey).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((child) => {
        if (Array.isArray(child.children) && child.children.length) {
          sortNodes(child.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  }
}

module.exports = new PermissionResourcesService();
