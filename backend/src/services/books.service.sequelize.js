const { models } = require('../models');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { BOOK_STATUS } = require('../utils/constants');

/**
 * 图书服务类
 * 处理图书相关的业务逻辑
 */
class BooksService {
  /**
   * 创建图书
   * @param {Object} bookData - 图书数据
   * @param {Object} user - 操作用户
   * @returns {Object} 创建的图书
   */
  async createBook(bookData, user) {
    const { isbn } = bookData;

    // 检查ISBN是否已存在
    const existingBook = await models.Book.findByISBN(isbn);
    if (existingBook) {
      throw new ConflictError('Book with this ISBN already exists');
    }

    // 设置默认值
    const bookToCreate = {
      ...bookData,
      availableStock: bookData.totalStock || 0,
      status: BOOK_STATUS.AVAILABLE,
    };

    const book = await models.Book.create(bookToCreate);

    logBusinessOperation({
      operation: 'book_created',
      userId: user.id,
      details: {
        bookId: book.id,
        isbn: book.isbn,
        title: book.title,
      },
    });

    return book.toSafeJSON();
  }

  /**
   * 获取图书列表
   * @param {Object} filters - 过滤条件
   * @returns {Object} 图书列表和分页信息
   */
  async getBookList(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      author,
      publisher,
      status,
      language,
      hasEbook,
      sortBy = 'created_at',
      sortOrder = 'desc',
      minYear,
      maxYear,
    } = filters;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    // 构建查询条件
    const where = {
      isDeleted: false,
    };

    // 搜索条件
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { isbn: { [Op.like]: `%${search}%` } },
        { publisher: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } },
      ];
    }

    // 其他过滤条件
    if (category) where.category = category;
    if (publisher) where.publisher = { [Op.like]: `%${publisher}%` };
    if (status) where.status = status;
    if (language) where.language = language;
    if (hasEbook !== undefined) where.hasEbook = hasEbook;
    if (minYear) where.publicationYear = { [Op.gte]: minYear };
    if (maxYear) {
      where.publicationYear = where.publicationYear ? 
        { ...where.publicationYear, [Op.lte]: maxYear } : 
        { [Op.lte]: maxYear };
    }

    // 作者搜索（JSON字段）
    if (author) {
      where[Op.and] = [
        models.sequelize.literal(`JSON_SEARCH(authors, 'one', '%${author}%') IS NOT NULL`)
      ];
    }

    const result = await models.Book.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      books: result.rows.map(book => book.toSafeJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 根据ID获取图书详情
   * @param {number} bookId - 图书ID
   * @param {Object} user - 当前用户（可选，用于记录访问）
   * @returns {Object} 图书详情
   */
  async getBookById(bookId, user = null) {
    const book = await models.Book.findOne({
      where: {
        id: bookId,
        isDeleted: false,
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    // 增加访问次数
    await book.incrementViewCount();

    // 记录访问日志
    if (user) {
      logBusinessOperation({
        operation: 'book_viewed',
        userId: user.id,
        details: {
          bookId: book.id,
          title: book.title,
        },
      });
    }

    return book.toSafeJSON();
  }

  /**
   * 更新图书信息
   * @param {number} bookId - 图书ID
   * @param {Object} updateData - 更新数据
   * @param {Object} user - 操作用户
   * @returns {Object} 更新后的图书
   */
  async updateBook(bookId, updateData, user) {
    const book = await models.Book.findOne({
      where: {
        id: bookId,
        isDeleted: false,
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    // 如果更新ISBN，检查是否与其他图书冲突
    if (updateData.isbn && updateData.isbn !== book.isbn) {
      const existingBook = await models.Book.findByISBN(updateData.isbn);
      if (existingBook && existingBook.id !== bookId) {
        throw new ConflictError('Book with this ISBN already exists');
      }
    }

    // 更新图书信息
    await book.update(updateData);

    logBusinessOperation({
      operation: 'book_updated',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        changes: Object.keys(updateData),
      },
    });

    return book.toSafeJSON();
  }

  /**
   * 删除图书（软删除）
   * @param {number} bookId - 图书ID
   * @param {Object} user - 操作用户
   * @returns {Object} 删除结果
   */
  async deleteBook(bookId, user) {
    const book = await models.Book.findOne({
      where: {
        id: bookId,
        isDeleted: false,
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    // 检查是否有未归还的借阅记录
    const activeBorrows = await models.Borrow.count({
      where: {
        bookId: book.id,
        status: { [require('sequelize').Op.in]: ['borrowed', 'overdue'] },
      },
    });

    if (activeBorrows > 0) {
      throw new BadRequestError('Cannot delete book with active borrows');
    }

    // 软删除
    await book.softDelete();

    logBusinessOperation({
      operation: 'book_deleted',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        isbn: book.isbn,
      },
    });

    return {
      message: 'Book deleted successfully',
    };
  }

  /**
   * 获取图书分类列表
   * @returns {Array} 分类列表
   */
  async getCategories() {
    const categories = await models.Book.findAll({
      where: {
        isDeleted: false,
        category: { [require('sequelize').Op.ne]: null },
      },
      attributes: ['category'],
      group: ['category'],
      raw: true,
    });

    return categories.map(item => item.category).filter(Boolean).sort();
  }

  /**
   * 批量导入图书
   * @param {Array} booksData - 图书数据数组
   * @param {Object} user - 操作用户
   * @returns {Object} 导入结果
   */
  async bulkImportBooks(booksData, user) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const [index, bookData] of booksData.entries()) {
      try {
        // 检查必填字段
        if (!bookData.title || !bookData.isbn || !bookData.authors) {
          throw new ValidationError('Missing required fields: title, isbn, or authors');
        }

        // 检查ISBN是否已存在
        const existingBook = await models.Book.findByISBN(bookData.isbn);
        if (existingBook) {
          throw new ConflictError(`Book with ISBN ${bookData.isbn} already exists`);
        }

        // 创建图书
        await this.createBook(bookData, user);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: index + 1,
          isbn: bookData.isbn || 'N/A',
          title: bookData.title || 'N/A',
          error: error.message,
        });
      }
    }

    logBusinessOperation({
      operation: 'books_bulk_import',
      userId: user.id,
      details: {
        totalBooks: booksData.length,
        successCount: results.success,
        failedCount: results.failed,
      },
    });

    return results;
  }

  /**
   * 获取热门图书
   * @param {number} limit - 返回数量
   * @param {number} days - 统计天数
   * @returns {Array} 热门图书列表
   */
  async getPopularBooks(limit = 10, days = 30) {
    const books = await models.Book.getPopularBooks(limit, days);
    return books.map(book => book.toSafeJSON());
  }

  /**
   * 获取最新图书
   * @param {number} limit - 返回数量
   * @returns {Array} 最新图书列表
   */
  async getRecentBooks(limit = 10) {
    const books = await models.Book.getRecentlyAdded(limit);
    return books.map(book => book.toSafeJSON());
  }

  /**
   * 获取图书统计信息
   * @returns {Object} 统计信息
   */
  async getBookStatistics() {
    return await models.Book.getStatistics();
  }

  /**
   * 搜索图书（高级搜索）
   * @param {string} query - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Object} 搜索结果
   */
  async searchBooks(query, options = {}) {
    const result = await models.Book.searchBooks(query, options);
    
    return {
      books: result.rows.map(book => book.toSafeJSON()),
      pagination: {
        page: Math.floor(options.offset / options.limit) + 1,
        limit: options.limit,
        total: result.count,
        pages: Math.ceil(result.count / options.limit),
      },
    };
  }

  /**
   * 更新图书库存
   * @param {number} bookId - 图书ID
   * @param {Object} stockData - 库存数据
   * @param {Object} user - 操作用户
   * @returns {Object} 更新结果
   */
  async updateBookStock(bookId, stockData, user) {
    const book = await models.Book.findOne({
      where: {
        id: bookId,
        isDeleted: false,
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const { totalStock, availableStock } = stockData;
    
    if (availableStock > totalStock) {
      throw new BadRequestError('Available stock cannot exceed total stock');
    }

    await book.update({
      totalStock,
      availableStock,
    });

    logBusinessOperation({
      operation: 'book_stock_updated',
      userId: user.id,
      details: {
        bookId: book.id,
        title: book.title,
        oldTotalStock: book.totalStock,
        newTotalStock: totalStock,
        oldAvailableStock: book.availableStock,
        newAvailableStock: availableStock,
      },
    });

    return book.toSafeJSON();
  }

  /**
   * 生成图书导入模板
   * @returns {Buffer} Excel文件缓冲区
   */
  async generateImportTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('图书导入模板');

    // 设置列头
    const headers = [
      { header: '书名*', key: 'title', width: 25 },
      { header: '作者*', key: 'author', width: 20 },
      { header: 'ISBN*', key: 'isbn', width: 15 },
      { header: '分类*', key: 'category', width: 15 },
      { header: '出版社', key: 'publisher', width: 20 },
      { header: '出版日期', key: 'publishDate', width: 12 },
      { header: '价格', key: 'price', width: 10 },
      { header: '库存数量', key: 'stock', width: 10 },
      { header: '描述', key: 'description', width: 30 },
      { header: '标签', key: 'tags', width: 20 },
      { header: '位置', key: 'location', width: 15 },
      { header: '封面图片URL', key: 'coverUrl', width: 25 }
    ];

    worksheet.columns = headers;

    // 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // 添加示例数据
    worksheet.addRow([
      '示例图书名称',
      '示例作者',
      '9787111234567',
      '计算机科学',
      '机械工业出版社',
      '2024-01-01',
      '89.00',
      '10',
      '这是一本关于编程的好书',
      'JavaScript,编程,前端',
      'A区1层3号',
      'https://example.com/cover.jpg'
    ]);

    // 添加说明工作表
    const instructionSheet = workbook.addWorksheet('使用说明');
    instructionSheet.columns = [
      { header: '字段名', key: 'field', width: 15 },
      { header: '是否必填', key: 'required', width: 10 },
      { header: '说明', key: 'description', width: 50 },
      { header: '示例', key: 'example', width: 25 }
    ];

    const instructions = [
      { field: '书名', required: '是', description: '图书的完整标题', example: '深入理解计算机系统' },
      { field: '作者', required: '是', description: '图书作者，多个作者用逗号分隔', example: '张三,李四' },
      { field: 'ISBN', required: '是', description: '图书的ISBN号码，确保唯一性', example: '9787111234567' },
      { field: '分类', required: '是', description: '图书分类，系统会自动创建不存在的分类', example: '计算机科学' },
      { field: '出版社', required: '否', description: '图书出版社名称', example: '机械工业出版社' },
      { field: '出版日期', required: '否', description: '格式：YYYY-MM-DD', example: '2024-01-01' },
      { field: '价格', required: '否', description: '图书价格，数字格式', example: '89.00' },
      { field: '库存数量', required: '否', description: '图书库存数量，默认为1', example: '10' },
      { field: '描述', required: '否', description: '图书简介或描述', example: '一本优秀的技术图书' },
      { field: '标签', required: '否', description: '图书标签，多个标签用逗号分隔', example: 'JavaScript,编程' },
      { field: '位置', required: '否', description: '图书在图书馆的位置', example: 'A区1层3号' },
      { field: '封面图片URL', required: '否', description: '图书封面图片的网络地址', example: 'https://example.com/cover.jpg' }
    ];

    instructions.forEach(instruction => {
      instructionSheet.addRow(instruction);
    });

    // 设置说明表格式
    const instHeaderRow = instructionSheet.getRow(1);
    instHeaderRow.font = { bold: true };
    instHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 处理导入文件
   * @param {Object} file - 上传的文件信息
   * @param {Object} user - 操作用户
   * @returns {Object} 处理结果
   */
  async processImportFile(file, user) {
    const fs = require('fs');
    const path = require('path');
    const ExcelJS = require('exceljs');
    const csv = require('csv-parser');
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const supportedFormats = ['.xlsx', '.xls', '.csv'];
    
    if (!supportedFormats.includes(fileExtension)) {
      throw new BadRequestError('Unsupported file format. Please use Excel (.xlsx, .xls) or CSV (.csv) files.');
    }

    let data = [];
    let fields = [];
    
    try {
      if (fileExtension === '.csv') {
        // 处理CSV文件
        data = await this.parseCSVFile(file.path);
      } else {
        // 处理Excel文件
        data = await this.parseExcelFile(file.path);
      }
      
      if (data.length === 0) {
        throw new BadRequestError('File contains no data');
      }

      // 获取字段名
      fields = Object.keys(data[0]);
      
      // 生成预览列定义
      const columns = fields.map(field => ({
        prop: field,
        label: field,
        width: this.getColumnWidth(field)
      }));

      // 保存文件信息到数据库
      const savedFile = await models.ImportFile.create({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: user.id,
        status: 'uploaded',
        recordCount: data.length,
        metadata: {
          fields,
          columns
        }
      });

      logBusinessOperation({
        operation: 'import_file_uploaded',
        userId: user.id,
        details: {
          fileId: savedFile.id,
          fileName: file.originalname,
          recordCount: data.length
        }
      });

      return {
        file: {
          id: savedFile.id,
          name: file.originalname,
          size: file.size,
          recordCount: data.length
        },
        preview: data.slice(0, 50), // 只返回前50行预览
        columns,
        fields
      };
      
    } catch (error) {
      // 清理上传的文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * 解析CSV文件
   * @param {string} filePath - 文件路径
   * @returns {Array} 解析后的数据
   */
  async parseCSVFile(filePath) {
    const fs = require('fs');
    const csv = require('csv-parser');
    
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * 解析Excel文件
   * @param {string} filePath - 文件路径
   * @returns {Array} 解析后的数据
   */
  async parseExcelFile(filePath) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1); // 获取第一个工作表
    const data = [];
    const headers = [];
    
    // 获取表头
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    // 获取数据行
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      
      // 只添加有数据的行
      if (Object.values(rowData).some(value => value !== null && value !== undefined && value !== '')) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  /**
   * 获取列宽度
   * @param {string} fieldName - 字段名
   * @returns {number} 列宽度
   */
  getColumnWidth(fieldName) {
    const widthMap = {
      'title': 200,
      'author': 150,
      'isbn': 120,
      'category': 120,
      'publisher': 150,
      'publishDate': 100,
      'price': 80,
      'stock': 80,
      'description': 250,
      'tags': 150,
      'location': 120,
      'coverUrl': 200
    };
    
    return widthMap[fieldName] || 120;
  }

  /**
   * 验证导入数据
   * @param {string} fileId - 文件ID
   * @param {Object} user - 操作用户
   * @returns {Object} 验证结果
   */
  async validateImportData(fileId, user) {
    const importFile = await models.ImportFile.findByPk(fileId);
    if (!importFile) {
      throw new NotFoundError('Import file not found');
    }

    if (importFile.uploadedBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    const fs = require('fs');
    const data = await this.parseFileData(importFile.filePath, importFile.originalName);
    const errors = [];
    const warnings = [];

    // 验证必填字段
    const requiredFields = ['title', 'author', 'isbn', 'category'];
    
    data.forEach((row, index) => {
      const rowNumber = index + 1;
      
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} is required`,
            value: row[field]
          });
        }
      });

      // 验证ISBN格式
      if (row.isbn && !this.validateISBN(row.isbn)) {
        errors.push({
          row: rowNumber,
          field: 'isbn',
          message: 'Invalid ISBN format',
          value: row.isbn
        });
      }

      // 验证价格格式
      if (row.price && isNaN(parseFloat(row.price))) {
        warnings.push({
          row: rowNumber,
          field: 'price',
          message: 'Invalid price format, will be set to 0',
          value: row.price
        });
      }

      // 验证库存数量
      if (row.stock && (!Number.isInteger(parseInt(row.stock)) || parseInt(row.stock) < 0)) {
        warnings.push({
          row: rowNumber,
          field: 'stock',
          message: 'Invalid stock quantity, will be set to 1',
          value: row.stock
        });
      }
    });

    // 检查ISBN重复
    const isbnSet = new Set();
    const duplicateISBNs = [];
    data.forEach((row, index) => {
      if (row.isbn) {
        if (isbnSet.has(row.isbn)) {
          duplicateISBNs.push({
            row: index + 1,
            isbn: row.isbn
          });
        }
        isbnSet.add(row.isbn);
      }
    });

    if (duplicateISBNs.length > 0) {
      duplicateISBNs.forEach(dup => {
        errors.push({
          row: dup.row,
          field: 'isbn',
          message: 'Duplicate ISBN in file',
          value: dup.isbn
        });
      });
    }

    // 检查数据库中已存在的ISBN
    const existingISBNs = await models.Book.findAll({
      where: {
        isbn: Array.from(isbnSet)
      },
      attributes: ['isbn']
    });

    existingISBNs.forEach(book => {
      const rowsWithISBN = data
        .map((row, index) => ({ row: index + 1, isbn: row.isbn }))
        .filter(item => item.isbn === book.isbn);
      
      rowsWithISBN.forEach(item => {
        warnings.push({
          row: item.row,
          field: 'isbn',
          message: 'ISBN already exists in database',
          value: item.isbn
        });
      });
    });

    // 更新文件状态
    await importFile.update({
      status: errors.length > 0 ? 'validation_failed' : 'validation_passed',
      validationResult: {
        errors,
        warnings,
        validatedAt: new Date()
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalRows: data.length,
      validRows: data.length - errors.length
    };
  }

  /**
   * 验证ISBN格式
   * @param {string} isbn - ISBN号码
   * @returns {boolean} 是否有效
   */
  validateISBN(isbn) {
    const isbn10Regex = /^(?:\d{9}X|\d{10})$/;
    const isbn13Regex = /^(?:978|979)\d{10}$/;
    
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return isbn10Regex.test(cleanISBN) || isbn13Regex.test(cleanISBN);
  }

  /**
   * 执行图书导入
   * @param {Object} importData - 导入配置
   * @param {Object} user - 操作用户
   * @returns {Object} 导入结果
   */
  async importBooks(importData, user) {
    const { fileId, fieldMapping, importMode, duplicateHandling, options } = importData;
    
    const importFile = await models.ImportFile.findByPk(fileId);
    if (!importFile) {
      throw new NotFoundError('Import file not found');
    }

    if (importFile.uploadedBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    const transaction = await models.sequelize.transaction();
    
    try {
      const data = await this.parseFileData(importFile.filePath, importFile.originalName);
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 1;
        
        try {
          // 映射字段
          const bookData = this.mapFields(row, fieldMapping);
          
          // 数据清理和转换
          const cleanedData = this.cleanBookData(bookData, options);
          
          // 检查是否已存在
          const existingBook = await models.Book.findByISBN(cleanedData.isbn);
          
          if (existingBook) {
            switch (duplicateHandling) {
              case 'skip':
                skippedCount++;
                continue;
              case 'overwrite':
                await existingBook.update(cleanedData, { transaction });
                updatedCount++;
                break;
              case 'rename':
                cleanedData.title = `${cleanedData.title} (导入)`;
                cleanedData.isbn = `${cleanedData.isbn}-${Date.now()}`;
                await models.Book.create(cleanedData, { transaction });
                successCount++;
                break;
            }
          } else {
            // 创建新图书
            await models.Book.create(cleanedData, { transaction });
            successCount++;
          }
          
        } catch (error) {
          failedCount++;
          errors.push({
            row: rowNumber,
            error: error.message,
            data: row
          });
          
          if (!options.skipErrors) {
            throw error;
          }
        }
      }

      // 更新导入文件状态
      await importFile.update({
        status: 'completed',
        importResult: {
          total: data.length,
          success: successCount,
          failed: failedCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors,
          importedAt: new Date(),
          importedBy: user.id
        }
      }, { transaction });

      await transaction.commit();

      const duration = Math.round((Date.now() - startTime) / 1000);

      logBusinessOperation({
        operation: 'books_imported',
        userId: user.id,
        details: {
          fileId,
          total: data.length,
          success: successCount,
          failed: failedCount,
          duration
        }
      });

      return {
        success: failedCount === 0 || options.skipErrors,
        message: `Import completed. Success: ${successCount}, Failed: ${failedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`,
        total: data.length,
        success_count: successCount,
        failed_count: failedCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        errors: errors.slice(0, 100), // 只返回前100个错误
        duration: `${duration}s`
      };
      
    } catch (error) {
      await transaction.rollback();
      
      await importFile.update({
        status: 'failed',
        importResult: {
          error: error.message,
          failedAt: new Date()
        }
      });
      
      throw error;
    }
  }

  /**
   * 解析文件数据
   * @param {string} filePath - 文件路径
   * @param {string} originalName - 原始文件名
   * @returns {Array} 解析后的数据
   */
  async parseFileData(filePath, originalName) {
    const path = require('path');
    const fileExtension = path.extname(originalName).toLowerCase();
    
    if (fileExtension === '.csv') {
      return await this.parseCSVFile(filePath);
    } else {
      return await this.parseExcelFile(filePath);
    }
  }

  /**
   * 映射字段
   * @param {Object} row - 原始行数据
   * @param {Object} fieldMapping - 字段映射关系
   * @returns {Object} 映射后的数据
   */
  mapFields(row, fieldMapping) {
    const mapped = {};
    
    Object.keys(fieldMapping).forEach(targetField => {
      const sourceField = fieldMapping[targetField];
      if (sourceField && row[sourceField] !== undefined) {
        mapped[targetField] = row[sourceField];
      }
    });
    
    return mapped;
  }

  /**
   * 清理图书数据
   * @param {Object} bookData - 原始图书数据
   * @param {Object} options - 选项
   * @returns {Object} 清理后的数据
   */
  cleanBookData(bookData, options) {
    const cleaned = { ...bookData };
    
    // 清理字符串字段
    ['title', 'author', 'publisher', 'description', 'location'].forEach(field => {
      if (cleaned[field]) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });
    
    // 处理价格
    if (cleaned.price) {
      const price = parseFloat(cleaned.price);
      cleaned.price = isNaN(price) ? 0 : price;
    }
    
    // 处理库存
    if (cleaned.stock) {
      const stock = parseInt(cleaned.stock);
      cleaned.stock = isNaN(stock) || stock < 0 ? 1 : stock;
      cleaned.totalStock = cleaned.stock;
      cleaned.availableStock = cleaned.stock;
    } else {
      cleaned.totalStock = 1;
      cleaned.availableStock = 1;
    }
    
    // 处理日期
    if (cleaned.publishDate) {
      const date = new Date(cleaned.publishDate);
      cleaned.publishDate = isNaN(date.getTime()) ? null : date;
    }
    
    // 处理标签
    if (cleaned.tags && options.autoTags) {
      cleaned.tags = cleaned.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    // 设置默认状态
    cleaned.status = BOOK_STATUS.AVAILABLE;
    
    return cleaned;
  }

  /**
   * 获取导入历史
   * @param {Object} params - 查询参数
   * @param {Object} user - 操作用户
   * @returns {Object} 导入历史
   */
  async getImportHistory(params, user) {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (user.role !== 'admin') {
      where.uploadedBy = user.id;
    }
    if (status) {
      where.status = status;
    }
    
    const result = await models.ImportFile.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'uploader',
          attributes: ['id', 'username', 'realName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    return {
      imports: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit)
      }
    };
  }

  /**
   * 获取导入任务状态
   * @param {string} taskId - 任务ID
   * @param {Object} user - 操作用户
   * @returns {Object} 任务状态
   */
  async getImportTaskStatus(taskId, user) {
    const importFile = await models.ImportFile.findByPk(taskId);
    if (!importFile) {
      throw new NotFoundError('Import task not found');
    }
    
    if (importFile.uploadedBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Access denied');
    }
    
    return {
      id: importFile.id,
      status: importFile.status,
      fileName: importFile.originalName,
      recordCount: importFile.recordCount,
      validationResult: importFile.validationResult,
      importResult: importFile.importResult,
      createdAt: importFile.createdAt,
      updatedAt: importFile.updatedAt
    };
  }
}

module.exports = new BooksService();