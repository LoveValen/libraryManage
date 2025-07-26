const { DataTypes } = require('sequelize');
const { BOOK_STATUS } = require('../utils/constants');

module.exports = (sequelize) => {
  const Book = sequelize.define('Book', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isbn: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
      },
    },
    authors: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isNotEmpty(value) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('At least one author is required');
          }
        },
      },
    },
    publisher: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    publicationYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1000,
        max: new Date().getFullYear(),
      },
      field: 'publication_year',
    },
    publicationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'publication_date',
    },
    language: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'zh-CN',
    },
    categoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'category_id',
      references: {
        model: 'book_categories',
        key: 'id',
      },
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      index: true,
    },
    subcategory: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tableOfContents: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'table_of_contents',
    },
    coverImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'cover_image',
      validate: {
        isUrl: true,
      },
    },
    backCoverImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'back_cover_image',
      validate: {
        isUrl: true,
      },
    },
    totalStock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'total_stock',
      validate: {
        min: 0,
      },
    },
    availableStock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'available_stock',
      validate: {
        min: 0,
      },
    },
    reservedStock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'reserved_stock',
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BOOK_STATUS)),
      allowNull: false,
      defaultValue: BOOK_STATUS.AVAILABLE,
    },
    location: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '图书在图书馆的位置',
    },
    callNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'call_number',
      comment: '图书索书号',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    pages: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    format: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '图书格式，如平装、精装等',
    },
    dimensions: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '图书尺寸',
    },
    weight: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: '图书重量（克）',
    },
    // 电子书相关字段
    ebookUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'ebook_url',
      validate: {
        isUrl: true,
      },
      comment: '电子书文件路径',
    },
    ebookFormat: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'ebook_format',
      comment: '电子书格式，如PDF、EPUB等',
    },
    ebookFileSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'ebook_file_size',
      comment: '电子书文件大小（字节）',
    },
    hasEbook: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_ebook',
    },
    // 统计字段
    borrowCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'borrow_count',
    },
    reserveCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'reserve_count',
    },
    viewCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'view_count',
    },
    downloadCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'download_count',
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      field: 'average_rating',
      validate: {
        min: 1,
        max: 5,
      },
    },
    reviewCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      field: 'review_count',
    },
    // 管理字段
    acquiredDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'acquired_date',
      comment: '图书入库日期',
    },
    acquiredFrom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'acquired_from',
      comment: '图书来源',
    },
    condition: {
      type: DataTypes.ENUM('new', 'good', 'fair', 'poor', 'damaged'),
      defaultValue: 'new',
      comment: '图书状况',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员备注',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  }, {
    tableName: 'books',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['isbn'],
        where: { is_deleted: false },
      },
      {
        fields: ['title'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['publisher'],
      },
      {
        fields: ['publication_year'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['has_ebook'],
      },
      {
        fields: ['average_rating'],
      },
      {
        fields: ['borrow_count'],
      },
      {
        fields: ['created_at'],
      },
      // Removed authors index - JSON columns cannot be directly indexed in MySQL
      // Removed tags index - JSON columns cannot be directly indexed in MySQL
    ],
    hooks: {
      beforeSave: async (book, options) => {
        // 确保可借阅库存不超过总库存
        if (book.availableStock > book.totalStock) {
          book.availableStock = book.totalStock;
        }
        
        // 确保预约库存不超过总库存
        if (book.reservedStock > book.totalStock) {
          book.reservedStock = book.totalStock;
        }

        // 检查是否有电子书
        book.hasEbook = !!book.ebookUrl;

        // 根据库存更新状态
        if (book.totalStock === 0) {
          book.status = BOOK_STATUS.RETIRED;
        } else if (book.availableStock === 0) {
          book.status = BOOK_STATUS.BORROWED;
        } else {
          book.status = BOOK_STATUS.AVAILABLE;
        }
      },
      beforeBulkUpdate: (options) => {
        options.attributes.updated_at = new Date();
      },
    },
  });

  // 实例方法
  Book.prototype.isAvailable = function() {
    return this.status === BOOK_STATUS.AVAILABLE && 
           this.availableStock > 0 && 
           !this.isDeleted;
  };

  Book.prototype.canBorrow = function() {
    return this.isAvailable();
  };

  Book.prototype.borrowCopy = async function() {
    if (!this.canBorrow()) {
      throw new Error('Book is not available for borrowing');
    }
    
    this.availableStock -= 1;
    this.borrowCount += 1;
    
    await this.save({
      fields: ['availableStock', 'borrowCount', 'status'],
    });
  };

  Book.prototype.returnCopy = async function() {
    if (this.availableStock >= this.totalStock) {
      throw new Error('Cannot return more copies than total stock');
    }
    
    this.availableStock += 1;
    
    await this.save({
      fields: ['availableStock', 'status'],
    });
  };

  Book.prototype.incrementViewCount = async function() {
    this.viewCount += 1;
    await this.save({ fields: ['viewCount'] });
  };

  Book.prototype.incrementDownloadCount = async function() {
    this.downloadCount += 1;
    await this.save({ fields: ['downloadCount'] });
  };

  Book.prototype.updateRating = async function(newRating, isNewReview = true) {
    if (isNewReview) {
      const totalRating = (this.averageRating || 0) * this.reviewCount + newRating;
      this.reviewCount += 1;
      this.averageRating = totalRating / this.reviewCount;
    } else {
      // 如果是更新现有评分，需要重新计算
      // 这里需要从数据库重新计算所有评分
      const { Review } = sequelize.models;
      const result = await Review.findOne({
        where: { bookId: this.id },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        ],
      });
      
      this.averageRating = result.dataValues.avgRating || null;
      this.reviewCount = result.dataValues.totalCount || 0;
    }
    
    await this.save({ fields: ['averageRating', 'reviewCount'] });
  };

  Book.prototype.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.status = BOOK_STATUS.RETIRED;
    await this.save();
  };

  Book.prototype.toSafeJSON = function() {
    const book = this.toJSON();
    delete book.isDeleted;
    delete book.deletedAt;
    delete book.notes;
    return book;
  };

  // 类方法
  Book.findByISBN = async function(isbn) {
    return this.findOne({
      where: {
        isbn,
        isDeleted: false,
      },
    });
  };

  Book.searchBooks = async function(query, options = {}) {
    const {
      category,
      author,
      publisher,
      language,
      hasEbook,
      minRating,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit = 20,
      offset = 0,
    } = options;

    const where = {
      isDeleted: false,
      [sequelize.Sequelize.Op.or]: [
        { title: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
        { subtitle: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
        { summary: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
        { isbn: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
        sequelize.literal(`JSON_SEARCH(authors, 'one', '%${query}%') IS NOT NULL`),
      ],
    };

    if (category) where.category = category;
    if (publisher) where.publisher = { [sequelize.Sequelize.Op.like]: `%${publisher}%` };
    if (language) where.language = language;
    if (hasEbook !== undefined) where.hasEbook = hasEbook;
    if (minRating) where.averageRating = { [sequelize.Sequelize.Op.gte]: minRating };

    return this.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });
  };

  Book.getPopularBooks = async function(limit = 10, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.findAll({
      where: {
        isDeleted: false,
        status: { [sequelize.Sequelize.Op.ne]: BOOK_STATUS.RETIRED },
      },
      order: [
        ['borrowCount', 'DESC'],
        ['averageRating', 'DESC'],
        ['viewCount', 'DESC'],
      ],
      limit,
    });
  };

  Book.getRecentlyAdded = async function(limit = 10) {
    return this.findAll({
      where: {
        isDeleted: false,
        status: { [sequelize.Sequelize.Op.ne]: BOOK_STATUS.RETIRED },
      },
      order: [['createdAt', 'DESC']],
      limit,
    });
  };

  Book.getStatistics = async function() {
    const total = await this.count({ where: { isDeleted: false } });
    const available = await this.count({
      where: {
        status: BOOK_STATUS.AVAILABLE,
        isDeleted: false,
      },
    });
    const borrowed = await this.count({
      where: {
        status: BOOK_STATUS.BORROWED,
        isDeleted: false,
      },
    });
    const ebooks = await this.count({
      where: {
        hasEbook: true,
        isDeleted: false,
      },
    });

    const totalStock = await this.sum('totalStock', {
      where: { isDeleted: false },
    });
    const availableStock = await this.sum('availableStock', {
      where: { isDeleted: false },
    });

    return {
      total,
      available,
      borrowed,
      ebooks,
      totalStock: totalStock || 0,
      availableStock: availableStock || 0,
      borrowedStock: (totalStock || 0) - (availableStock || 0),
      utilizationRate: totalStock > 0 ? (((totalStock - availableStock) / totalStock) * 100).toFixed(2) : 0,
    };
  };

  return Book;
};