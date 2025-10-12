const permissionsService = require('../services/permissions.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

class PermissionsController {
  list = asyncHandler(async (req, res) => {
    const data = await permissionsService.list();
    success(res, data, '权限列表获取成功');
  });

  create = asyncHandler(async (req, res) => {
    const item = await permissionsService.create(req.body);
    success(res, item, '权限创建成功', 201);
  });

  update = asyncHandler(async (req, res) => {
    const item = await permissionsService.update(req.params.id, req.body);
    success(res, item, '权限更新成功');
  });

  remove = asyncHandler(async (req, res) => {
    await permissionsService.remove(req.params.id);
    success(res, null, '权限删除成功');
  });
}

module.exports = new PermissionsController();


