const BookCategoryService = require('../services/bookCategory.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { NotFoundError, BadRequestError, ConflictError, ValidationError } = require('../utils/apiError');

/**
 * Book categories controller using Prisma
 */
class BookCategoriesController {
  /**
   * Get category tree
   * GET /api/v1/books/categories/tree
   */
  getCategoryTree = asyncHandler(async (req, res) => {
    const categories = await BookCategoryService.getCategoriesWithStats();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取分类树成功',
      data: {
        categories,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get all categories
   * GET /api/v1/books/categories
   */
  getAllCategories = asyncHandler(async (req, res) => {
    const categories = await BookCategoryService.getCategoriesWithStats();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取分类列表成功',
      data: {
        categories,
        total: categories.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get category by ID or Name
   * GET /api/v1/books/categories/:identifier
   */
  getCategoryByIdOrName = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    
    let category = null;
    
    // 首先尝试作为ID解析
    const numId = parseInt(identifier);
    if (!isNaN(numId) && numId > 0) {
      category = await BookCategoryService.findById(numId, true);
    }
    
    // 如果按ID没找到，尝试按名称查找
    if (!category) {
      // URL解码中文字符
      const decodedName = decodeURIComponent(identifier);
      category = await BookCategoryService.findByNameWithStats(decodedName);
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    let categoryData;
    if (category.stats) {
      // Data from findByNameWithStats
      categoryData = {
        ...category,
        bookCount: category.stats.total || 0,
        fullPath: category.name
      };
    } else {
      // Data from findById
      categoryData = {
        ...category,
        bookCount: category._count?.books || 0,
        fullPath: category.name
      };
    }
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取分类详情成功',
      data: {
        category: categoryData,
      },
      timestamp: new Date().toISOString(),
    });
  });


  /**
   * Create category
   * POST /api/v1/books/categories
   */
  createCategory = asyncHandler(async (req, res) => {
    const { name, nameEn, code, parentId, parentName, description, icon, color, sortOrder } = req.body;

    // Check if name already exists
    const existingCategory = await BookCategoryService.findByName(name.trim());
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
      name: name.trim(),
      name_en: nameEn?.trim(),
      code: (code || name).trim(),
      parent_id: resolvedParentId,
      description: description?.trim(),
      icon: icon?.trim(),
      color: color?.trim(),
      sort_order: sortOrder,
      level: level,
      is_active: true
    };
    
    const category = await BookCategoryService.create(categoryData);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: resolvedParentId ? '创建子分类成功' : '创建分类成功',
      data: {
        category: {
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
          createdAt: category.created_at,
          updatedAt: category.updated_at
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Update category by ID
   * PUT /api/v1/books/categories/:id
   */
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameEn, description, icon, color, sortOrder, isActive } = req.body;
    
    const categoryId = parseInt(id);
    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '无效的分类ID',
        timestamp: new Date().toISOString(),
      });
    }
    
    const category = await BookCategoryService.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate name if provided
    if (name !== undefined && (!name || name.trim() === '')) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '分类名称不能为空',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if new name already exists (excluding current category)
    if (name !== undefined && name.trim() !== category.name) {
      const existingCategory = await BookCategoryService.findByName(name.trim());
      if (existingCategory && existingCategory.id !== categoryId) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: '分类名称已存在',
          timestamp: new Date().toISOString(),
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (nameEn !== undefined) updateData.name_en = nameEn?.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (icon !== undefined) updateData.icon = icon?.trim();
    if (color !== undefined) updateData.color = color?.trim();
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    const updatedCategory = await BookCategoryService.update(categoryId, updateData);
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '更新分类成功',
      data: {
        category: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          nameEn: updatedCategory.name_en,
          code: updatedCategory.code,
          parentId: updatedCategory.parent_id,
          level: updatedCategory.level,
          description: updatedCategory.description,
          icon: updatedCategory.icon,
          color: updatedCategory.color,
          sortOrder: updatedCategory.sort_order,
          isActive: updatedCategory.is_active,
          createdAt: updatedCategory.created_at,
          updatedAt: updatedCategory.updated_at
        },
      },
      timestamp: new Date().toISOString(),
    });
  });


  /**
   * Delete category by ID
   * DELETE /api/v1/books/categories/:id
   */
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const categoryId = parseInt(id);
    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '无效的分类ID',
        timestamp: new Date().toISOString(),
      });
    }
    
    const category = await BookCategoryService.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    try {
      await BookCategoryService.delete(categoryId);
      
      res.json({
        success: true,
        status: 'success',
        statusCode: 200,
        message: '删除分类成功',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error.message.includes('books are still associated')) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: '该分类下有图书，无法删除',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  });


}

module.exports = new BookCategoriesController();