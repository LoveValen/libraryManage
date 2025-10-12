const BookTagService = require('../services/bookTag.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, successWithPagination } = require('../utils/response');
const Joi = require('joi');

/**
 * 图书标签控制器
 */
class BookTagController {
  constructor() {
    this.createSchema = Joi.object({
      name: Joi.string().trim().min(1).max(50).required(),
      code: Joi.string().trim().max(50).optional(),
      color: Joi.string().trim().max(20).optional(),
      description: Joi.string().trim().max(255).optional(),
      sortOrder: Joi.number().integer().min(0).optional(),
      isActive: Joi.boolean().optional()
    });

    this.updateSchema = Joi.object({
      name: Joi.string().trim().min(1).max(50).optional(),
      code: Joi.string().trim().max(50).allow(null, '').optional(),
      color: Joi.string().trim().max(20).allow(null, '').optional(),
      description: Joi.string().trim().max(255).allow(null, '').optional(),
      sortOrder: Joi.number().integer().min(0).optional(),
      isActive: Joi.boolean().optional()
    });
  }

  /**
   * 标签列表
   */
  list = asyncHandler(async (req, res) => {
    const { keyword, isActive, page, size } = req.query;
    const result = await BookTagService.list({
      keyword,
      isActive: isActive === undefined ? undefined : isActive === 'true' || isActive === true,
      page,
      size
    });
    
    successWithPagination(
      res,
      result.tags,
      { page: result.page, pageSize: result.size, total: result.total },
      '获取图书标签成功'
    );
  });

  /**
   * 获取有效标签（下拉）
   */
  listActive = asyncHandler(async (req, res) => {
    const tags = await BookTagService.listActive();
    success(res, tags, '获取可用标签成功');
  });

  /**
   * 标签详情
   */
  detail = asyncHandler(async (req, res) => {
    const tag = await BookTagService.getById(req.params.id);
    success(res, tag, '获取标签详情成功');
  });

  /**
   * 创建标签
   */
  create = asyncHandler(async (req, res) => {
    const payload = await this.createSchema.validateAsync(req.body, { abortEarly: false });
    const tag = await BookTagService.create(payload);
    success(res, tag, '创建标签成功', 201);
  });

  /**
   * 更新标签
   */
  update = asyncHandler(async (req, res) => {
    const payload = await this.updateSchema.validateAsync(req.body, { abortEarly: false });
    const tag = await BookTagService.update(req.params.id, payload);
    success(res, tag, '更新标签成功');
  });

  /**
   * 删除标签
   */
  remove = asyncHandler(async (req, res) => {
    await BookTagService.remove(req.params.id);
    success(res, null, '删除标签成功');
  });
}

module.exports = new BookTagController();
