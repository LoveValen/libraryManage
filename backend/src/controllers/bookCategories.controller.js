const BookCategoryService = require('../services/bookCategory.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/apiError');

/**
 * Book categories controller using Prisma
 */
class BookCategoriesController {
  /**
   * Get category tree
   * GET /api/v1/books/categories/tree
   */
  getCategoryTree = asyncHandler(async (req, res) => {
    // For now, return a flat list as tree structure needs additional implementation
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
   * Get category by ID
   * GET /api/v1/books/categories/:id
   */
  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await BookCategoryService.findById(parseInt(id), true);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    const categoryData = {
      ...category,
      bookCount: category._count?.books || 0,
      fullPath: category.name // Simple implementation for now
    };
    
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
    const { name, nameEn, code, parentId, description, icon, color, sortOrder } = req.body;
    
    // Check if name already exists
    const existingCategory = await BookCategoryService.findByName(name);
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '分类名称已存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    const categoryData = {
      name,
      name_en: nameEn,
      code: code || name, // Use name as code if not provided
      parent_id: parentId || null,
      description,
      icon,
      color,
      sort_order: sortOrder,
      level: 1, // Simple implementation - would need parent level + 1
      is_active: true
    };
    
    const category = await BookCategoryService.create(categoryData);
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: '创建分类成功',
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
   * Update category
   * PUT /api/v1/books/categories/:id
   */
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameEn, description, icon, color, sortOrder, isActive } = req.body;
    
    const category = await BookCategoryService.findById(parseInt(id));
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.name_en = nameEn;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    const updatedCategory = await BookCategoryService.update(parseInt(id), updateData);
    
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
   * Delete category
   * DELETE /api/v1/books/categories/:id
   */
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      await BookCategoryService.delete(parseInt(id));
      
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

  /**
   * Initialize default categories
   * POST /api/v1/books/categories/initialize
   */
  initializeDefaultCategories = asyncHandler(async (req, res) => {
    const defaultCategories = [
      { name: '文学', name_en: 'Literature', code: 'literature', sort_order: 1 },
      { name: '小说', name_en: 'Fiction', code: 'fiction', sort_order: 2 },
      { name: '历史', name_en: 'History', code: 'history', sort_order: 3 },
      { name: '科学', name_en: 'Science', code: 'science', sort_order: 4 },
      { name: '技术', name_en: 'Technology', code: 'technology', sort_order: 5 },
      { name: '艺术', name_en: 'Art', code: 'art', sort_order: 6 },
      { name: '经济', name_en: 'Economics', code: 'economics', sort_order: 7 },
      { name: '管理', name_en: 'Management', code: 'management', sort_order: 8 },
      { name: '教育', name_en: 'Education', code: 'education', sort_order: 9 },
      { name: '儿童', name_en: 'Children', code: 'children', sort_order: 10 }
    ];

    const created = [];
    for (const catData of defaultCategories) {
      const existing = await BookCategoryService.findByName(catData.name);
      if (!existing) {
        const category = await BookCategoryService.create({
          ...catData,
          level: 1,
          is_active: true
        });
        created.push(category);
      }
    }
    
    const categories = await BookCategoryService.getCategoriesWithStats();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '初始化默认分类成功',
      data: {
        categories,
        created: created.length
      },
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new BookCategoriesController();