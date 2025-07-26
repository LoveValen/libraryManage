const { models } = require('../models');
const { asyncHandler } = require('../middlewares/error.middleware');
const { BookCategory } = models;

/**
 * 图书分类控制器
 */
class BookCategoriesController {
  /**
   * 获取分类树
   * GET /api/v1/books/categories/tree
   */
  getCategoryTree = asyncHandler(async (req, res) => {
    const tree = await BookCategory.getCategoryTree();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取分类树成功',
      data: {
        categories: tree,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取所有分类列表
   * GET /api/v1/books/categories
   */
  getAllCategories = asyncHandler(async (req, res) => {
    const { parentId, level, isActive = true } = req.query;
    
    const where = {};
    if (parentId !== undefined) where.parentId = parentId === 'null' ? null : parseInt(parentId);
    if (level !== undefined) where.level = parseInt(level);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const categories = await BookCategory.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      include: [{
        model: models.Book,
        as: 'books',
        attributes: ['id'],
      }],
    });
    
    const formattedCategories = categories.map(cat => ({
      ...cat.toJSON(),
      bookCount: cat.books.length,
    }));
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '获取分类列表成功',
      data: {
        categories: formattedCategories,
        total: formattedCategories.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 获取单个分类详情
   * GET /api/v1/books/categories/:id
   */
  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await BookCategory.findByPk(id, {
      include: [
        {
          model: BookCategory,
          as: 'parent',
        },
        {
          model: BookCategory,
          as: 'children',
          include: [{
            model: models.Book,
            as: 'books',
            attributes: ['id'],
          }],
        },
        {
          model: models.Book,
          as: 'books',
          attributes: ['id', 'title', 'isbn', 'authors', 'coverImage'],
          limit: 10,
        },
      ],
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    const categoryData = category.toJSON();
    categoryData.bookCount = category.books.length;
    categoryData.fullPath = await category.getFullPath();
    
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
   * 创建分类
   * POST /api/v1/books/categories
   */
  createCategory = asyncHandler(async (req, res) => {
    const { name, nameEn, code, parentId, description, icon, color, sortOrder } = req.body;
    
    // 检查code是否已存在
    const existingCategory = await BookCategory.findOne({ where: { code } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '分类代码已存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    // 计算层级
    let level = 1;
    if (parentId) {
      const parentCategory = await BookCategory.findByPk(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: '父分类不存在',
          timestamp: new Date().toISOString(),
        });
      }
      level = parentCategory.level + 1;
    }
    
    const category = await BookCategory.create({
      name,
      nameEn,
      code,
      parentId,
      level,
      description,
      icon,
      color,
      sortOrder: sortOrder || 0,
    });
    
    res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: '创建分类成功',
      data: {
        category,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 更新分类
   * PUT /api/v1/books/categories/:id
   */
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameEn, description, icon, color, sortOrder, isActive } = req.body;
    
    const category = await BookCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    await category.update({
      name,
      nameEn,
      description,
      icon,
      color,
      sortOrder,
      isActive,
    });
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '更新分类成功',
      data: {
        category,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 删除分类
   * DELETE /api/v1/books/categories/:id
   */
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await BookCategory.findByPk(id, {
      include: [
        {
          model: BookCategory,
          as: 'children',
        },
        {
          model: models.Book,
          as: 'books',
          attributes: ['id'],
        },
      ],
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: '分类不存在',
        timestamp: new Date().toISOString(),
      });
    }
    
    // 检查是否有子分类
    if (category.children.length > 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '该分类下有子分类，无法删除',
        timestamp: new Date().toISOString(),
      });
    }
    
    // 检查是否有图书
    if (category.books.length > 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: '该分类下有图书，无法删除',
        timestamp: new Date().toISOString(),
      });
    }
    
    await category.destroy();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '删除分类成功',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 初始化默认分类
   * POST /api/v1/books/categories/initialize
   */
  initializeDefaultCategories = asyncHandler(async (req, res) => {
    await BookCategory.initializeDefaultCategories();
    
    const categories = await BookCategory.getCategoryTree();
    
    res.json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: '初始化默认分类成功',
      data: {
        categories,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = new BookCategoriesController();