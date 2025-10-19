const permissionsService = require('../services/permissions.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const { page, size, keyword, group_name } = req.query;
  const data = await permissionsService.list({ page, size, keyword, group_name });
  success(res, data, '权限列表获取成功');
});

const create = asyncHandler(async (req, res) => {
  const item = await permissionsService.create(req.body);
  success(res, item, '权限创建成功', 201);
});

const update = asyncHandler(async (req, res) => {
  const item = await permissionsService.update(req.params.id, req.body);
  success(res, item, '权限更新成功');
});

const remove = asyncHandler(async (req, res) => {
  await permissionsService.remove(req.params.id);
  success(res, null, '权限删除成功');
});

module.exports = {
  list,
  create,
  update,
  remove
};


