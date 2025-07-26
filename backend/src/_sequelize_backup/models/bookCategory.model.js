const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookCategory = sequelize.define('BookCategory', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '分类名称',
    },
    nameEn: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'name_en',
      comment: '英文分类名称',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: '分类代码',
    },
    parentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'book_categories',
        key: 'id',
      },
      comment: '父分类ID',
    },
    level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: '分类层级',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '分类描述',
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '分类图标',
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: '分类颜色',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
      comment: '排序顺序',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '是否启用',
    },
    bookCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'book_count',
      comment: '该分类下的图书数量',
    },
  }, {
    tableName: 'book_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name'],
      },
      {
        fields: ['code'],
      },
      {
        fields: ['parent_id'],
      },
      {
        fields: ['sort_order'],
      },
    ],
  });

  // 关联方法将在 index.js 中定义
  BookCategory.associate = (models) => {
    // 自关联 - 父子分类
    BookCategory.hasMany(models.BookCategory, {
      as: 'children',
      foreignKey: 'parentId',
    });
    
    BookCategory.belongsTo(models.BookCategory, {
      as: 'parent',
      foreignKey: 'parentId',
    });
  };

  // 实例方法
  BookCategory.prototype.getFullPath = async function() {
    const path = [this.name];
    let current = this;
    
    while (current.parentId) {
      current = await BookCategory.findByPk(current.parentId);
      if (current) {
        path.unshift(current.name);
      } else {
        break;
      }
    }
    
    return path.join(' > ');
  };

  // 类方法
  BookCategory.getCategoryTree = async function() {
    const categories = await this.findAll({
      where: { isActive: true },
      order: [['level', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    const categoryMap = {};
    const tree = [];

    // 创建映射
    categories.forEach(cat => {
      categoryMap[cat.id] = {
        ...cat.toJSON(),
        children: [],
      };
    });

    // 构建树结构
    categories.forEach(cat => {
      if (cat.parentId) {
        if (categoryMap[cat.parentId]) {
          categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
        }
      } else {
        tree.push(categoryMap[cat.id]);
      }
    });

    return tree;
  };

  BookCategory.initializeDefaultCategories = async function() {
    const defaultCategories = [
      // 一级分类
      { name: '文学', nameEn: 'Literature', code: 'A', level: 1, icon: 'book', color: '#FF6B6B' },
      { name: '历史', nameEn: 'History', code: 'B', level: 1, icon: 'history', color: '#4ECDC4' },
      { name: '哲学', nameEn: 'Philosophy', code: 'C', level: 1, icon: 'school', color: '#45B7D1' },
      { name: '艺术', nameEn: 'Art', code: 'D', level: 1, icon: 'palette', color: '#96CEB4' },
      { name: '科学', nameEn: 'Science', code: 'E', level: 1, icon: 'science', color: '#FFEAA7' },
      { name: '技术', nameEn: 'Technology', code: 'F', level: 1, icon: 'computer', color: '#DDA0DD' },
      { name: '社会科学', nameEn: 'Social Science', code: 'G', level: 1, icon: 'people', color: '#98D8C8' },
      { name: '生活', nameEn: 'Lifestyle', code: 'H', level: 1, icon: 'favorite', color: '#F7DC6F' },
      { name: '教育', nameEn: 'Education', code: 'I', level: 1, icon: 'school', color: '#BB8FCE' },
      { name: '儿童', nameEn: 'Children', code: 'J', level: 1, icon: 'child_care', color: '#85C1E5' },
    ];

    for (const cat of defaultCategories) {
      await this.findOrCreate({
        where: { code: cat.code },
        defaults: cat,
      });
    }

    // 添加二级分类示例
    const literatureCategory = await this.findOne({ where: { code: 'A' } });
    if (literatureCategory) {
      const subCategories = [
        { name: '小说', nameEn: 'Fiction', code: 'A1', parentId: literatureCategory.id, level: 2 },
        { name: '诗歌', nameEn: 'Poetry', code: 'A2', parentId: literatureCategory.id, level: 2 },
        { name: '散文', nameEn: 'Prose', code: 'A3', parentId: literatureCategory.id, level: 2 },
        { name: '戏剧', nameEn: 'Drama', code: 'A4', parentId: literatureCategory.id, level: 2 },
      ];

      for (const subCat of subCategories) {
        await this.findOrCreate({
          where: { code: subCat.code },
          defaults: subCat,
        });
      }
    }

    const scienceCategory = await this.findOne({ where: { code: 'E' } });
    if (scienceCategory) {
      const subCategories = [
        { name: '数学', nameEn: 'Mathematics', code: 'E1', parentId: scienceCategory.id, level: 2 },
        { name: '物理', nameEn: 'Physics', code: 'E2', parentId: scienceCategory.id, level: 2 },
        { name: '化学', nameEn: 'Chemistry', code: 'E3', parentId: scienceCategory.id, level: 2 },
        { name: '生物', nameEn: 'Biology', code: 'E4', parentId: scienceCategory.id, level: 2 },
        { name: '天文', nameEn: 'Astronomy', code: 'E5', parentId: scienceCategory.id, level: 2 },
      ];

      for (const subCat of subCategories) {
        await this.findOrCreate({
          where: { code: subCat.code },
          defaults: subCat,
        });
      }
    }

    const techCategory = await this.findOne({ where: { code: 'F' } });
    if (techCategory) {
      const subCategories = [
        { name: '计算机', nameEn: 'Computer Science', code: 'F1', parentId: techCategory.id, level: 2 },
        { name: '工程', nameEn: 'Engineering', code: 'F2', parentId: techCategory.id, level: 2 },
        { name: '电子', nameEn: 'Electronics', code: 'F3', parentId: techCategory.id, level: 2 },
        { name: '建筑', nameEn: 'Architecture', code: 'F4', parentId: techCategory.id, level: 2 },
      ];

      for (const subCat of subCategories) {
        await this.findOrCreate({
          where: { code: subCat.code },
          defaults: subCat,
        });
      }
    }
  };

  return BookCategory;
};