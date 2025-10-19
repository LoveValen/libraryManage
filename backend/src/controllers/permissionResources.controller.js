const permissionResourcesService = require('../services/permissionResources.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

/**
 * 列出权限资源
 */
const list = asyncHandler(async (req, res) => {
  const { type, keyword, isActive } = req.query;
  const filters = {
    type,
    keyword,
  };

  if (isActive !== undefined) {
    filters.isActive = ['true', '1', 1, true].includes(isActive);
  }

  const items = await permissionResourcesService.list(filters);
  success(res, items, '获取资源列表成功');
});

/**
 * 新建权限资源
 */
const create = asyncHandler(async (req, res) => {
  const item = await permissionResourcesService.create(req.body);
  success(res, item, '创建资源成功', 201);
});

/**
 * 更新权限资源
 */
const update = asyncHandler(async (req, res) => {
  const item = await permissionResourcesService.update(req.params.id, req.body);
  success(res, item, '更新资源成功');
});

/**
 * 删除权限资源
 */
const remove = asyncHandler(async (req, res) => {
  await permissionResourcesService.remove(req.params.id);
  success(res, null, '删除资源成功');
});

/**
 * 获取当前用户可访问的资源树
 */
const getMyResources = asyncHandler(async (req, res) => {
  const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
  const data = await permissionResourcesService.getAccessibleResources(permissionCodes);
  success(res, data, '获取可访问资源成功');
});

module.exports = {
  list,
  create,
  update,
  remove,
  getMyResources
};
