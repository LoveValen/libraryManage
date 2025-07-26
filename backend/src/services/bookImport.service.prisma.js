const axios = require('axios');
const prisma = require('../utils/prisma');
const { logBusinessOperation } = require('../utils/logger');

/**
 * 图书导入服务 (Prisma版本)
 * 支持从多个数据源导入图书数据
 */
class BookImportService {
  /**
   * 从豆瓣API导入图书（注意：豆瓣API需要申请key）
   * 这里使用模拟数据代替真实API
   */
  async importFromDouban(isbn) {
    try {
      // 模拟豆瓣API响应
      // 实际使用时需要替换为真实的API调用
      const mockDoubanData = {
        isbn13: isbn,
        title: '示例图书',
        author: ['作者1', '作者2'],
        publisher: '出版社',
        pubdate: '2023-01',
        price: '39.00',
        summary: '这是一本示例图书的简介...',
        image: 'https://img.example.com/book.jpg',
      };

      return this.transformDoubanData(mockDoubanData);
    } catch (error) {
      console.error('豆瓣API导入失败:', error);
      throw error;
    }
  }

  /**
   * 从Open Library API导入图书
   */
  async importFromOpenLibrary(isbn) {
    try {
      const response = await axios.get(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );

      const bookKey = `ISBN:${isbn}`;
      const bookData = response.data[bookKey];

      if (!bookData) {
        throw new Error('Book not found in Open Library');
      }

      return this.transformOpenLibraryData(bookData, isbn);
    } catch (error) {
      console.error('Open Library API导入失败:', error);
      throw error;
    }
  }

  /**
   * 从Google Books API导入图书
   */
  async importFromGoogleBooks(isbn) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Book not found in Google Books');
      }

      const bookData = response.data.items[0].volumeInfo;
      return this.transformGoogleBooksData(bookData, isbn);
    } catch (error) {
      console.error('Google Books API导入失败:', error);
      throw error;
    }
  }

  /**
   * 转换豆瓣数据格式
   */
  transformDoubanData(data) {
    return {
      isbn: data.isbn13 || data.isbn10,
      title: data.title,
      authors: Array.isArray(data.author) ? data.author.join(', ') : data.author,
      publisher: data.publisher,
      publication_year: data.pubdate ? parseInt(data.pubdate.split('-')[0]) : null,
      publication_date: data.pubdate ? new Date(data.pubdate) : null,
      summary: data.summary,
      cover_image: data.image,
      price: parseFloat(data.price) || null,
      pages: data.pages ? parseInt(data.pages) : null,
      language: 'zh-CN',
    };
  }

  /**
   * 转换Open Library数据格式
   */
  transformOpenLibraryData(data, isbn) {
    return {
      isbn: isbn,
      title: data.title,
      subtitle: data.subtitle,
      authors: data.authors ? data.authors.map(a => a.name).join(', ') : null,
      publisher: data.publishers ? data.publishers[0].name : null,
      publication_year: data.publish_date ? parseInt(data.publish_date.match(/\d{4}/)?.[0]) : null,
      publication_date: data.publish_date ? new Date(data.publish_date) : null,
      summary: data.excerpts ? data.excerpts[0].text : null,
      cover_image: data.cover ? data.cover.large || data.cover.medium : null,
      pages: data.number_of_pages,
      language: 'en',
    };
  }

  /**
   * 转换Google Books数据格式
   */
  transformGoogleBooksData(data, isbn) {
    return {
      isbn: isbn,
      title: data.title,
      subtitle: data.subtitle,
      authors: data.authors ? data.authors.join(', ') : null,
      publisher: data.publisher,
      publication_year: data.publishedDate ? parseInt(data.publishedDate.split('-')[0]) : null,
      publication_date: data.publishedDate ? new Date(data.publishedDate) : null,
      summary: data.description,
      cover_image: data.imageLinks ? data.imageLinks.thumbnail : null,
      pages: data.pageCount,
      language: data.language || 'en',
      category: data.categories ? data.categories[0] : null,
    };
  }

  /**
   * 批量导入示例图书数据
   */
  async importSampleBooks(operatorUser) {
    const sampleBooks = [
      {
        isbn: '9787544374665',
        title: '百年孤独',
        authors: '加西亚·马尔克斯',
        publisher: '南海出版公司',
        publication_year: 2017,
        category: '文学',
        subcategory: '小说',
        summary: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事...',
        language: 'zh-CN',
        total_stock: 5,
        available_stock: 5,
        price: 55.00,
        pages: 360,
        tags: ['文学', '小说', '魔幻现实主义', '经典'],
      },
      {
        isbn: '9787020147501',
        title: '三体',
        authors: '刘慈欣',
        publisher: '人民文学出版社',
        publication_year: 2008,
        category: '文学',
        subcategory: '科幻',
        summary: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝密计划"红岸工程"取得了突破性进展...',
        language: 'zh-CN',
        total_stock: 8,
        available_stock: 8,
        price: 38.00,
        pages: 302,
        tags: ['科幻', '小说', '雨果奖', '中国科幻'],
      },
      {
        isbn: '9787532776771',
        title: '活着',
        authors: '余华',
        publisher: '上海译文出版社',
        publication_year: 2018,
        category: '文学',
        subcategory: '小说',
        summary: '《活着》讲述了福贵的人生和家庭不断经受着苦难，到了最后所有亲人都先后离他而去...',
        language: 'zh-CN',
        total_stock: 6,
        available_stock: 6,
        price: 35.00,
        pages: 195,
        tags: ['文学', '小说', '当代文学', '余华'],
      },
      {
        isbn: '9787506380263',
        title: '人类简史',
        authors: '尤瓦尔·赫拉利',
        publisher: '中信出版社',
        publication_year: 2017,
        category: '历史',
        subcategory: '世界史',
        summary: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史...',
        language: 'zh-CN',
        total_stock: 4,
        available_stock: 4,
        price: 68.00,
        pages: 440,
        tags: ['历史', '人类学', '社会学', '畅销书'],
      },
      {
        isbn: '9787115477095',
        title: 'Python编程：从入门到实践',
        authors: '埃里克·马瑟斯',
        publisher: '人民邮电出版社',
        publication_year: 2018,
        category: '技术',
        subcategory: '计算机',
        summary: '本书是一本针对所有层次的Python读者而作的Python入门书...',
        language: 'zh-CN',
        total_stock: 10,
        available_stock: 10,
        price: 89.00,
        pages: 459,
        tags: ['编程', 'Python', '计算机', '教程'],
      },
      {
        isbn: '9787559632265',
        title: '房思琪的初恋乐园',
        authors: '林奕含',
        publisher: '北京联合出版公司',
        publication_year: 2018,
        category: '文学',
        subcategory: '小说',
        summary: '令人心碎却无能为力的真实故事。性、权力、升学主义，如影随形的痛...',
        language: 'zh-CN',
        total_stock: 3,
        available_stock: 3,
        price: 45.00,
        pages: 272,
        tags: ['文学', '小说', '台湾文学'],
      },
      {
        isbn: '9787208146358',
        title: '人间失格',
        authors: '太宰治',
        publisher: '上海人民出版社',
        publication_year: 2018,
        category: '文学',
        subcategory: '小说',
        summary: '《人间失格》是日本著名小说家太宰治最具影响力的小说作品...',
        language: 'zh-CN',
        total_stock: 5,
        available_stock: 5,
        price: 32.00,
        pages: 204,
        tags: ['文学', '日本文学', '小说', '经典'],
      },
      {
        isbn: '9787544291170',
        title: '霍乱时期的爱情',
        authors: '加西亚·马尔克斯',
        publisher: '南海出版公司',
        publication_year: 2015,
        category: '文学',
        subcategory: '小说',
        summary: '一段跨越半个多世纪的爱情史诗，穷尽了所有爱情的可能性...',
        language: 'zh-CN',
        total_stock: 4,
        available_stock: 4,
        price: 50.00,
        pages: 401,
        tags: ['文学', '小说', '爱情', '魔幻现实主义'],
      },
      {
        isbn: '9787544270879',
        title: '追风筝的人',
        authors: '卡勒德·胡赛尼',
        publisher: '上海人民出版社',
        publication_year: 2013,
        category: '文学',
        subcategory: '小说',
        summary: '关于友谊、背叛、救赎的故事，一个阿富汗男孩的成长史...',
        language: 'zh-CN',
        total_stock: 7,
        available_stock: 7,
        price: 36.00,
        pages: 362,
        tags: ['文学', '小说', '阿富汗', '友谊'],
      },
      {
        isbn: '9787513326049',
        title: '原则',
        authors: '瑞·达利欧',
        publisher: '中信出版社',
        publication_year: 2018,
        category: '社会科学',
        subcategory: '管理学',
        summary: '华尔街投资大神、桥水公司创始人瑞·达利欧的人生经验和工作原则...',
        language: 'zh-CN',
        total_stock: 5,
        available_stock: 5,
        price: 98.00,
        pages: 576,
        tags: ['管理', '商业', '投资', '自我提升'],
      },
      {
        isbn: '9787521719307',
        title: '置身事内：中国政府与经济发展',
        authors: '兰小欢',
        publisher: '中信出版社',
        publication_year: 2021,
        category: '社会科学',
        subcategory: '经济学',
        summary: '复旦大学经济学院副教授兰小欢的这本书，是近年来中国经济学界最重要的著作之一...',
        language: 'zh-CN',
        total_stock: 6,
        available_stock: 6,
        price: 65.00,
        pages: 352,
        tags: ['经济学', '中国经济', '政府', '发展'],
      },
      {
        isbn: '9787108045474',
        title: '万历十五年',
        authors: '黄仁宇',
        publisher: '生活·读书·新知三联书店',
        publication_year: 2014,
        category: '历史',
        subcategory: '中国史',
        summary: '万历十五年，亦即公元1587年，在西欧历史上为西班牙舰队全部出动征英的前一年...',
        language: 'zh-CN',
        total_stock: 4,
        available_stock: 4,
        price: 32.00,
        pages: 280,
        tags: ['历史', '明史', '中国历史', '经典'],
      },
      {
        isbn: '9787301280591',
        title: '时间简史',
        authors: '史蒂芬·霍金',
        publisher: '北京大学出版社',
        publication_year: 2017,
        category: '科学',
        subcategory: '物理',
        summary: '史蒂芬·霍金的《时间简史》自1988年首版以来的岁月里，已成为全球科学著作的里程碑...',
        language: 'zh-CN',
        total_stock: 5,
        available_stock: 5,
        price: 45.00,
        pages: 236,
        tags: ['科学', '物理学', '宇宙学', '科普'],
      },
      {
        isbn: '9787506365437',
        title: '小王子',
        authors: '安托万·德·圣-埃克苏佩里',
        publisher: '作家出版社',
        publication_year: 2013,
        category: '儿童',
        subcategory: '童话',
        summary: '小王子是一个超凡脱俗的仙童，他住在一颗只比他大一丁点儿的小行星上...',
        language: 'zh-CN',
        total_stock: 8,
        available_stock: 8,
        price: 22.00,
        pages: 144,
        tags: ['童话', '儿童文学', '经典', '法国文学'],
      },
      {
        isbn: '9787020116133',
        title: '白夜行',
        authors: '东野圭吾',
        publisher: '人民文学出版社',
        publication_year: 2017,
        category: '文学',
        subcategory: '推理',
        summary: '一宗离奇命案牵出跨度近20年步步惊心的故事：悲凉的爱情、吊诡的命运...',
        language: 'zh-CN',
        total_stock: 6,
        available_stock: 6,
        price: 42.00,
        pages: 467,
        tags: ['推理', '日本文学', '犯罪', '东野圭吾'],
      },
    ];

    const importedBooks = [];
    const errors = [];

    // 首先获取分类
    const categories = await prisma.book_categories.findMany();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat;
    });

    for (const bookData of sampleBooks) {
      try {
        // 检查ISBN是否已存在
        const existingBook = await this.findByISBN(bookData.isbn);
        if (existingBook) {
          console.log(`图书 ${bookData.title} (ISBN: ${bookData.isbn}) 已存在，跳过`);
          continue;
        }

        // 查找对应的分类
        let category_id = null;
        if (bookData.category && categoryMap[bookData.category]) {
          category_id = categoryMap[bookData.category].id;
        }

        // 准备创建数据
        const createData = {
          isbn: bookData.isbn,
          title: bookData.title,
          authors: bookData.authors,
          publisher: bookData.publisher,
          publication_year: bookData.publication_year,
          category_id: category_id,
          category: bookData.category,
          subcategory: bookData.subcategory,
          summary: bookData.summary,
          description: bookData.summary, // 使用summary作为description
          language: bookData.language,
          total_stock: bookData.total_stock,
          available_stock: bookData.available_stock,
          price: bookData.price,
          pages: bookData.pages,
          tags: bookData.tags,
          status: 'available',
          format: 'paperback', // 默认平装
          created_at: new Date(),
          updated_at: new Date()
        };

        // 创建图书
        const book = await prisma.books.create({
          data: createData
        });

        importedBooks.push(book);
        console.log(`成功导入图书: ${book.title}`);
      } catch (error) {
        console.error(`导入图书失败 ${bookData.title}:`, error.message);
        errors.push({
          isbn: bookData.isbn,
          title: bookData.title,
          error: error.message,
        });
      }
    }

    // 记录操作日志
    if (operatorUser && operatorUser.id) {
      logBusinessOperation({
        operation: 'batch_import_books',
        userId: operatorUser.id,
        details: {
          totalCount: sampleBooks.length,
          successCount: importedBooks.length,
          failedCount: errors.length,
        },
      });
    }

    return {
      success: importedBooks.length,
      failed: errors.length,
      importedBooks,
      errors,
    };
  }

  /**
   * 通过ISBN导入单本图书
   */
  async importBookByISBN(isbn, source = 'googlebooks', operatorUser) {
    try {
      // 检查是否已存在
      const existingBook = await this.findByISBN(isbn);
      if (existingBook) {
        throw new Error('该ISBN的图书已存在');
      }

      let bookData;
      switch (source) {
        case 'douban':
          bookData = await this.importFromDouban(isbn);
          break;
        case 'openlibrary':
          bookData = await this.importFromOpenLibrary(isbn);
          break;
        case 'googlebooks':
        default:
          bookData = await this.importFromGoogleBooks(isbn);
          break;
      }

      // 查找分类
      let category_id = null;
      if (bookData.category) {
        const category = await prisma.book_categories.findFirst({
          where: { name: bookData.category },
        });
        if (category) {
          category_id = category.id;
        }
      }

      // 准备创建数据
      const createData = {
        isbn: bookData.isbn,
        title: bookData.title,
        subtitle: bookData.subtitle,
        authors: bookData.authors,
        publisher: bookData.publisher,
        publication_year: bookData.publication_year,
        publication_date: bookData.publication_date,
        category_id: category_id,
        category: bookData.category,
        summary: bookData.summary,
        description: bookData.summary,
        language: bookData.language,
        cover_image: bookData.cover_image,
        pages: bookData.pages,
        price: bookData.price,
        total_stock: 1,
        available_stock: 1,
        status: 'available',
        format: 'paperback',
        created_at: new Date(),
        updated_at: new Date()
      };

      // 创建图书
      const book = await prisma.books.create({
        data: createData
      });

      // 记录操作日志
      if (operatorUser && operatorUser.id) {
        logBusinessOperation({
          operation: 'import_book_by_isbn',
          userId: operatorUser.id,
          details: {
            isbn,
            source,
            bookId: book.id,
            title: book.title,
          },
        });
      }

      return book;
    } catch (error) {
      console.error('导入图书失败:', error);
      throw error;
    }
  }

  /**
   * 通过ISBN查找图书 (辅助方法)
   */
  async findByISBN(isbn) {
    try {
      return await prisma.books.findUnique({
        where: { isbn: isbn }
      });
    } catch (error) {
      console.error('查找图书失败:', error);
      return null;
    }
  }

  /**
   * 验证ISBN格式
   */
  validateISBN(isbn) {
    // 移除连字符和空格
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // 检查长度
    if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
      return false;
    }
    
    // 检查是否全为数字（ISBN-13的最后一位可能是X）
    if (cleanISBN.length === 10) {
      return /^\d{9}[\dX]$/i.test(cleanISBN);
    } else {
      return /^\d{13}$/.test(cleanISBN);
    }
  }

  /**
   * 清理和格式化图书数据
   */
  sanitizeBookData(bookData) {
    return {
      ...bookData,
      title: bookData.title?.trim() || '',
      subtitle: bookData.subtitle?.trim() || null,
      authors: bookData.authors?.trim() || null,
      publisher: bookData.publisher?.trim() || null,
      summary: bookData.summary?.trim() || null,
      description: bookData.description?.trim() || bookData.summary?.trim() || null,
      language: bookData.language || 'zh-CN',
      isbn: bookData.isbn?.replace(/[-\s]/g, '') || '',
      pages: bookData.pages ? parseInt(bookData.pages) : null,
      price: bookData.price ? parseFloat(bookData.price) : null,
      publication_year: bookData.publication_year ? parseInt(bookData.publication_year) : null,
    };
  }

  /**
   * 批量验证图书数据
   */
  validateBooksData(booksData) {
    const validBooks = [];
    const invalidBooks = [];

    for (const bookData of booksData) {
      const errors = [];

      // 必填字段检查
      if (!bookData.isbn || !this.validateISBN(bookData.isbn)) {
        errors.push('无效的ISBN');
      }
      if (!bookData.title || bookData.title.trim().length === 0) {
        errors.push('标题不能为空');
      }

      if (errors.length === 0) {
        validBooks.push(this.sanitizeBookData(bookData));
      } else {
        invalidBooks.push({
          ...bookData,
          errors
        });
      }
    }

    return { validBooks, invalidBooks };
  }

  /**
   * 获取导入统计信息
   */
  async getImportStats(timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      const stats = await prisma.books.aggregate({
        where: {
          created_at: {
            gte: startDate
          }
        },
        _count: { id: true },
        _sum: { total_stock: true },
        _avg: { price: true }
      });

      return {
        recentImports: stats._count.id || 0,
        totalBooksAdded: stats._sum.total_stock || 0,
        averagePrice: stats._avg.price || 0,
        timeRange
      };
    } catch (error) {
      console.error('获取导入统计失败:', error);
      return {
        recentImports: 0,
        totalBooksAdded: 0,
        averagePrice: 0,
        timeRange
      };
    }
  }
}

module.exports = new BookImportService();