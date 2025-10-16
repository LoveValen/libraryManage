const rolesService = require('../services/roles.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success } = require('../utils/response');

class RolesController {
  list = asyncHandler(async (req, res) => {
    const { page, size, keyword, is_system } = req.query;
    const data = await rolesService.list({ page, size, keyword, is_system });
    success(res, data, '角色列表获取成功');
  });

  create = asyncHandler(async (req, res) => {
    const role = await rolesService.create(req.body);
    success(res, role, '角色创建成功', 201);
  });

  update = asyncHandler(async (req, res) => {
    const role = await rolesService.update(req.params.id, req.body);
    success(res, role, '角色更新成功');
  });

  remove = asyncHandler(async (req, res) => {
    await rolesService.remove(req.params.id);
    success(res, null, '角色删除成功');
  });

  setUserRoles = asyncHandler(async (req, res) => {
    const { roleIds = [] } = req.body;
    const result = await rolesService.setUserRoles(req.params.userId, roleIds);
    success(res, result, '用户角色已更新');
  });
}

module.exports = new RolesController();


