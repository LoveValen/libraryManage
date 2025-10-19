const BookLocationService = require('../services/bookLocation.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination } = require('../utils/response');
const Joi = require('joi');

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  code: Joi.string().trim().max(50).optional(),
  area: Joi.string().trim().max(100).allow(null, '').optional(),
  floor: Joi.string().trim().max(50).allow(null, '').optional(),
  shelf: Joi.string().trim().max(50).allow(null, '').optional(),
  description: Joi.string().trim().max(255).allow(null, '').optional(),
  capacity: Joi.number().integer().min(0).allow(null).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  code: Joi.string().trim().max(50).allow(null, '').optional(),
  area: Joi.string().trim().max(100).allow(null, '').optional(),
  floor: Joi.string().trim().max(50).allow(null, '').optional(),
  shelf: Joi.string().trim().max(50).allow(null, '').optional(),
  description: Joi.string().trim().max(255).allow(null, '').optional(),
  capacity: Joi.number().integer().min(0).allow(null).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

/**
 * 位置列表
 */
const list = asyncHandler(async (req, res) => {
  const { keyword, isActive, page, size } = req.query;
  const result = await BookLocationService.list({
    keyword,
    isActive: isActive === undefined ? undefined : isActive === 'true' || isActive === true,
    page,
    size
  });

  successWithPagination(
    res,
    result.locations,
    { page: result.page, pageSize: result.size, total: result.total },
    '获取图书存放位置成功'
  );
});

/**
 * 可选位置列表
 */
const listActive = asyncHandler(async (req, res) => {
  const locations = await BookLocationService.listActive();
  success(res, locations, '获取有效存放位置成功');
});

/**
 * 位置详情
 */
const detail = asyncHandler(async (req, res) => {
  const location = await BookLocationService.getById(req.params.id);
  success(res, location, '获取存放位置详情成功');
});

/**
 * 创建位置
 */
const create = asyncHandler(async (req, res) => {
  const payload = await createSchema.validateAsync(req.body, { abortEarly: false });
  const location = await BookLocationService.create(payload);
  success(res, location, '创建存放位置成功', 201);
});

/**
 * 更新位置
 */
const update = asyncHandler(async (req, res) => {
  const payload = await updateSchema.validateAsync(req.body, { abortEarly: false });
  const location = await BookLocationService.update(req.params.id, payload);
  success(res, location, '更新存放位置成功');
});

/**
 * 删除位置
 */
const remove = asyncHandler(async (req, res) => {
  await BookLocationService.remove(req.params.id);
  success(res, null, '删除存放位置成功');
});

module.exports = {
  list,
  listActive,
  detail,
  create,
  update,
  remove
};
