const BookCategoryService = require('../services/bookCategory.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { success, validationError } = require('../utils/response');
const { validateRequest } = require('../utils/validation');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/apiError');
const Joi = require('joi');

/**
 * Book categories controller using Prisma
 */
class BookCategoriesController {
  // 验证模式常量
  static CREATE_CATEGORY_SCHEMA = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    nameEn: Joi.string().trim().max(100).optional(),
    code: Joi.string().trim().max(50).optional(),
    parentId: Joi.number().integer().positive().optional(),
    parentName: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    icon: Joi.string().trim().max(100).optional(),
    color: Joi.string().trim().max(20).optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  });

  static UPDATE_CATEGORY_SCHEMA = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    nameEn: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    icon: Joi.string().trim().max(100).optional(),
    color: Joi.string().trim().max(20).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    id: Joi.number().integer().positive().optional(),
    categoryName: Joi.string().trim().max(100).optional()
  });

  /**
   * 解析标识符为分类对象（支持ID或名称）
   * @private
   */
  async _findCategoryByIdentifier(identifier) {
    let category = null;
    
    // 首先尝试作为ID解析
    const numId = parseInt(identifier);
    if (!isNaN(numId) && numId > 0) {
      category = await BookCategoryService.findById(numId, true);
    }
    
    // 如果按ID没找到，尝试按名称查找
    if (!category) {
      const decodedName = decodeURIComponent(identifier);
      category = await BookCategoryService.findByNameWithStats(decodedName);
    }
    
    return category;
  }

  /**
   * 格式化分类响应数据
   * @private
   */
  _formatCategoryResponse(category) {
    return {
      id: category.id,
      name: category.name,
      nameEn: category.name_en,
      code: category.code,
      parentId: category.parent_id,
      level: category.level,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      bookCount: category._count?.books || category.stats?.total || 0,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };
  }
  /**
   * Get category tree
   * GET /api/v1/books/categories/tree
   */
  getCategoryTree = asyncHandler(async (req, res) => {
    const categories = await BookCategoryService.getCategoriesWithStats();
    success(res, { categories }, '获取分类树成功');
  });

  /**
   * Get all categories
   * GET /api/v1/books/categories
   */
  getAllCategories = asyncHandler(async (req, res) => {
    const categories = await BookCategoryService.getCategoriesWithStats();
    success(res, { categories, total: categories.length }, '获取分类列表成功');
  });

  /**
   * Get category by ID or Name
   * GET /api/v1/books/categories/:identifier
   */
  getCategoryByIdOrName = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const category = await this._findCategoryByIdentifier(identifier);
    
    if (!category) {
      throw new NotFoundError('分类不存在');
    }
    
    const categoryData = this._formatCategoryResponse(category);
    success(res, { category: categoryData }, '获取分类详情成功');
  });


  /**
   * Create category
   * POST /api/v1/books/categories
   */
  createCategory = asyncHandler(async (req, res) => {
    const validatedData = validateRequest(BookCategoriesController.CREATE_CATEGORY_SCHEMA, req.body);
    const { name, nameEn, code, parentId, parentName, description, icon, color, sortOrder } = validatedData;

    // Check if name already exists
    const existingCategory = await BookCategoryService.findByName(name);
    if (existingCategory) {
      throw new ConflictError('分类名称已存在');
    }
    
    let resolvedParentId = null;
    let level = 1;
    
    // Handle parentId (preferred method)
    if (parentId) {
      const parentCategory = await BookCategoryService.findById(parentId);
      if (!parentCategory) {
        throw new NotFoundError('父分类不存在');
      }
      resolvedParentId = parentId;
      level = (parentCategory.level || 1) + 1;
    }
    // Handle parentName (fallback for compatibility)
    else if (parentName) {
      const parentCategory = await BookCategoryService.findByName(parentName);
      if (!parentCategory) {
        throw new NotFoundError(`父分类 "${parentName}" 不存在`);
      }
      resolvedParentId = parentCategory.id;
      level = (parentCategory.level || 1) + 1;
    }
    
    const categoryData = {
      name,
      name_en: nameEn,
      code: code || name,
      parent_id: resolvedParentId,
      description,
      icon,
      color,
      sort_order: sortOrder,
      level,
      is_active: true
    };
    
    const category = await BookCategoryService.create(categoryData);
    const formattedCategory = this._formatCategoryResponse(category);
    
    success(res, { category: formattedCategory }, resolvedParentId ? '创建子分类成功' : '创建分类成功', 201);
  });

  /**
   * Update category by ID or Name
   * PUT /api/v1/books/categories/:identifier
   */
  updateCategory = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const validatedData = validateRequest(BookCategoriesController.UPDATE_CATEGORY_SCHEMA, req.body);
    const { name, nameEn, description, icon, color, sortOrder, isActive, id, categoryName } = validatedData;
    
    let category = null;
    let categoryId = null;
    
    // 优先使用body中的参数来识别分类
    if (id) {
      category = await BookCategoryService.findById(id);
      categoryId = id;
    } else if (categoryName) {
      category = await BookCategoryService.findByName(categoryName);
      categoryId = category?.id;
    } else {
      // 回退到使用URL参数
      category = await this._findCategoryByIdentifier(identifier);
      categoryId = category?.id;
    }
    
    if (!category) {
      throw new NotFoundError('分类不存在');
    }

    // Check if new name already exists (excluding current category)
    if (name && name !== category.name) {
      const existingCategory = await BookCategoryService.findByName(name);
      if (existingCategory && existingCategory.id !== categoryId) {
        throw new ConflictError('分类名称已存在');
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.name_en = nameEn;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    const updatedCategory = await BookCategoryService.update(categoryId, updateData);
    const formattedCategory = this._formatCategoryResponse(updatedCategory);
    
    success(res, { category: formattedCategory }, '更新分类成功');
  });


  /**
   * Delete category by ID or Name
   * DELETE /api/v1/books/categories/:identifier
   */
  deleteCategory = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const category = await this._findCategoryByIdentifier(identifier);
    
    if (!category) {
      throw new NotFoundError('分类不存在');
    }
    
    try {
      await BookCategoryService.delete(category.id);
      success(res, null, '删除分类成功');
    } catch (error) {
      if (error.message.includes('books are still associated')) {
        throw new BadRequestError('该分类下有图书，无法删除');
      }
      throw error;
    }
  });


}

module.exports = new BookCategoriesController();
