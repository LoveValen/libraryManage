#!/usr/bin/env node
/*
 * 脚本：seedReferenceData
 * 作用：为图书标签与图书存放位置写入一批默认基础数据。
 * 可重复执行（通过 upsert 保证幂等）。
 */

const prisma = require('../src/utils/prisma');

const defaultTags = [
  {
    name: '文学',
    code: 'LITERATURE',
    color: '#409EFF',
    description: '经典文学、小说、诗歌等相关图书',
    sortOrder: 1
  },
  {
    name: '科技',
    code: 'TECH',
    color: '#67C23A',
    description: '科学技术、工程与计算机类图书',
    sortOrder: 2
  },
  {
    name: '艺术',
    code: 'ART',
    color: '#E6A23C',
    description: '艺术史、设计、摄影、绘画等艺术类图书',
    sortOrder: 3
  },
  {
    name: '儿童',
    code: 'KIDS',
    color: '#F56C6C',
    description: '儿童文学、绘本与早教读物',
    sortOrder: 4
  },
  {
    name: '历史',
    code: 'HISTORY',
    color: '#909399',
    description: '历史、人文与社会科学类图书',
    sortOrder: 5
  },
  {
    name: '人工智能',
    code: 'ARTIFICIAL_INTELLIGENCE',
    color: '#1F78C1',
    description: '涵盖《人工智能：一种现代方法》《深度学习》等 AI 领域教材与案例',
    sortOrder: 6
  },
  {
    name: '科幻经典',
    code: 'SCIENCE_FICTION',
    color: '#8E44AD',
    description: '收录《三体》《沙丘》《银河帝国》等知名科幻小说',
    sortOrder: 7
  },
  {
    name: '心理学',
    code: 'PSYCHOLOGY',
    color: '#B56CE7',
    description: '聚焦《思考，快与慢》《影响力》《乌合之众》等心理学读物',
    sortOrder: 8
  },
  {
    name: '经济管理',
    code: 'BUSINESS_MANAGEMENT',
    color: '#F39C12',
    description: '包含《从 0 到 1》《原则》《哈佛商业评论》年度精选等商业管理读物',
    sortOrder: 9
  },
  {
    name: '医学护理',
    code: 'MEDICINE_NURSING',
    color: '#16A085',
    description: '提供《格氏解剖学》《内科护理学》《黄帝内经》等医学护理资料',
    sortOrder: 10
  }
];

const defaultLocations = [
  {
    name: '文学区 A 排',
    code: 'A-ROW-1',
    area: '文学区',
    floor: '1F',
    shelf: 'A-1',
    capacity: 200,
    sortOrder: 1,
    description: '文学类图书主书架'
  },
  {
    name: '科技区 B 排',
    code: 'B-ROW-1',
    area: '科技区',
    floor: '2F',
    shelf: 'B-1',
    capacity: 180,
    sortOrder: 2,
    description: '科技、工程类图书'
  },
  {
    name: '艺术区阅览室',
    code: 'ART-READ',
    area: '艺术区',
    floor: '3F',
    shelf: '阅览室-1',
    capacity: 80,
    sortOrder: 3,
    description: '艺术类图书阅览专架'
  },
  {
    name: '少儿区绘本角',
    code: 'KIDS-CORNER',
    area: '少儿区',
    floor: '1F',
    shelf: '儿童-1',
    capacity: 150,
    sortOrder: 4,
    description: '少儿绘本与益智读物'
  },
  {
    name: '综合区新书架',
    code: 'NEW-ARRIVALS',
    area: '综合区',
    floor: '1F',
    shelf: '新书-1',
    capacity: 120,
    sortOrder: 5,
    description: '最新上架的热门图书'
  },
  {
    name: '科技区 AI 资料架',
    code: 'AI-LAB-2F',
    area: '科技区',
    floor: '2F',
    shelf: 'AI-资料-1',
    capacity: 160,
    sortOrder: 6,
    description: '陈列《人工智能：一种现代方法》《深度学习》等人工智能教材与案例集'
  },
  {
    name: '科幻区星河长廊',
    code: 'SCI-FI-3F',
    area: '文学区',
    floor: '3F',
    shelf: 'SF-长廊-1',
    capacity: 140,
    sortOrder: 7,
    description: '集中《三体》《沙丘》《银河帝国》系列等热门科幻小说'
  },
  {
    name: '心理学宁静阅览区',
    code: 'PSY-PEACE-3F',
    area: '社科区',
    floor: '3F',
    shelf: 'PSY-静读-1',
    capacity: 120,
    sortOrder: 8,
    description: '汇集《影响力》《社会性动物》《认知天性》等心理学与认知科学读物'
  },
  {
    name: '商学区案例精读架',
    code: 'BUS-CASE-2F',
    area: '商学区',
    floor: '2F',
    shelf: 'BUS-案例-2',
    capacity: 150,
    sortOrder: 9,
    description: '收录《从 0 到 1》《原则》《麦肯锡方法》等商业管理与创业案例'
  },
  {
    name: '医学区临床指南库',
    code: 'MED-REF-4F',
    area: '医学区',
    floor: '4F',
    shelf: 'MED-指南-1',
    capacity: 200,
    sortOrder: 10,
    description: '包含《格氏解剖学》《内科学》《急诊护理学》等临床经典指南'
  }
];

const defaultBooks = [
  {
    title: '人工智能：一种现代方法（第4版）',
    isbn: '9787111683107',
    authors: ['斯图尔特·拉塞尔', '彼得·诺维格'],
    publisher: '机械工业出版社',
    publicationYear: 2021,
    language: 'zh-CN',
    category: {
      name: '人工智能与机器学习',
      code: 'AI-ML',
      description: '涵盖人工智能理论、算法与机器学习实践',
      sortOrder: 20
    },
    tags: ['人工智能', '科技'],
    summary: '人工智能领域经典教材，系统讲解智能代理、搜索、学习等基础知识。',
    description: '第 4 版结合现代 AI 发展，新增深度学习、强化学习与知识图谱等内容，是高校和科研机构的核心教材。',
    coverImage: 'https://img3.doubanio.com/view/subject/l/public/s33723611.jpg',
    totalStock: 12,
    availableStock: 10,
    reservedStock: 2,
    price: 168.0,
    pages: 1136,
    format: '精装',
    hasEbook: true,
    locationCode: 'AI-LAB-2F'
  },
  {
    title: '深度学习',
    isbn: '9787115417302',
    authors: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
    publisher: '人民邮电出版社',
    publicationYear: 2017,
    language: 'zh-CN',
    category: {
      name: '人工智能与机器学习',
      code: 'AI-ML',
      description: '涵盖人工智能理论、算法与机器学习实践',
      sortOrder: 20
    },
    tags: ['人工智能', '科技'],
    summary: '被誉为深度学习“圣经”，详细介绍神经网络、优化、卷积和序列模型。',
    description: '原书第 1 版官方中文译本，由三位深度学习奠基人合著，适合作为研究和实战指南。',
    coverImage: 'https://img2.doubanio.com/view/subject/l/public/s27260366.jpg',
    totalStock: 14,
    availableStock: 12,
    reservedStock: 1,
    price: 128.0,
    pages: 752,
    format: '精装',
    hasEbook: true,
    locationCode: 'AI-LAB-2F'
  },
  {
    title: '三体',
    isbn: '9787536692930',
    authors: ['刘慈欣'],
    publisher: '重庆出版社',
    publicationYear: 2008,
    language: 'zh-CN',
    category: {
      name: '世界科幻文学',
      code: 'SCI-FI-WORLD',
      description: '收录国内外具有代表性的科幻文学作品',
      sortOrder: 30
    },
    tags: ['科幻经典', '文学'],
    summary: '地球文明与三体文明首次接触的史诗级科幻小说，开启“地球往事”三部曲。',
    description: '荣获雨果奖最佳长篇小说，展现人类文明在宇宙尺度下的命运与抉择。',
    coverImage: 'https://img1.doubanio.com/view/subject/l/public/s2768378.jpg',
    totalStock: 24,
    availableStock: 20,
    reservedStock: 3,
    price: 36.0,
    pages: 302,
    format: '平装',
    hasEbook: true,
    locationCode: 'SCI-FI-3F'
  },
  {
    title: '沙丘',
    isbn: '9787229100605',
    authors: ['弗兰克·赫伯特'],
    publisher: '重庆出版社',
    publicationYear: 2020,
    language: 'zh-CN',
    category: {
      name: '世界科幻文学',
      code: 'SCI-FI-WORLD',
      description: '收录国内外具有代表性的科幻文学作品',
      sortOrder: 30
    },
    tags: ['科幻经典'],
    summary: '发生在沙漠行星厄拉科斯的权力、信仰与生态之战，被誉为“星战之父”。',
    description: '雨果奖与星云奖双料获奖作品，对政治、宗教与生态的深刻思考影响后世无数科幻作品。',
    coverImage: 'https://img9.doubanio.com/view/subject/l/public/s33902004.jpg',
    totalStock: 18,
    availableStock: 16,
    reservedStock: 1,
    price: 88.0,
    pages: 632,
    format: '精装',
    hasEbook: true,
    locationCode: 'SCI-FI-3F'
  },
  {
    title: '思考，快与慢',
    isbn: '9787508647357',
    authors: ['丹尼尔·卡尼曼'],
    publisher: '中信出版社',
    publicationYear: 2012,
    language: 'zh-CN',
    category: {
      name: '心理学与认知科学',
      code: 'PSY-COGNITION',
      description: '聚焦行为经济学、认知偏差与心理学核心理论',
      sortOrder: 40
    },
    tags: ['心理学'],
    summary: '诺贝尔经济学奖得主总结人类思维双系统模型，揭示决策偏差的根源。',
    description: '结合金融、医学等行业案例，帮助读者识别系统偏差并改善判断质量。',
    coverImage: 'https://img3.doubanio.com/view/subject/l/public/s8938814.jpg',
    totalStock: 15,
    availableStock: 13,
    reservedStock: 1,
    price: 69.0,
    pages: 512,
    format: '平装',
    hasEbook: true,
    locationCode: 'PSY-PEACE-3F'
  },
  {
    title: '从 0 到 1：开启商业与未来的秘密',
    isbn: '9787508650029',
    authors: ['彼得·蒂尔', '布莱克·马斯特斯'],
    publisher: '中信出版社',
    publicationYear: 2015,
    language: 'zh-CN',
    category: {
      name: '工商管理经典案例',
      code: 'BUSINESS-CLASSIC',
      description: '覆盖创业、战略与管理的经典读物',
      sortOrder: 50
    },
    tags: ['经济管理'],
    summary: '硅谷投资人彼得·蒂尔分享打造垄断型创新企业的思维与方法。',
    description: '从团队构建、市场选择到产品战略，提供创业者和管理者可落地的决策框架。',
    coverImage: 'https://img1.doubanio.com/view/subject/l/public/s27927297.jpg',
    totalStock: 20,
    availableStock: 18,
    reservedStock: 1,
    price: 45.0,
    pages: 248,
    format: '平装',
    hasEbook: true,
    locationCode: 'BUS-CASE-2F'
  },
  {
    title: '格氏解剖学临床指南（第5版）',
    isbn: '9787117284544',
    authors: ['理查德·斯奈尔'],
    publisher: '人民卫生出版社',
    publicationYear: 2019,
    language: 'zh-CN',
    category: {
      name: '临床医学教材',
      code: 'MED-CLINICAL',
      description: '提供临床医学、护理与诊疗规范等专业教材',
      sortOrder: 60
    },
    tags: ['医学护理'],
    summary: '经典《格氏解剖学》最新版，强调临床相关性与病例分析。',
    description: '结合 100 余幅临床影像与案例解读，帮助医学生和住院医掌握临床解剖知识。',
    coverImage: 'https://img9.doubanio.com/view/subject/l/public/s33592265.jpg',
    totalStock: 12,
    availableStock: 11,
    reservedStock: 0,
    price: 238.0,
    pages: 760,
    format: '精装',
    hasEbook: false,
    locationCode: 'MED-REF-4F'
  }
];

async function seedTags() {
  console.log('🌱 开始写入默认图书标签...');
  for (const tag of defaultTags) {
    await prisma.book_tags.upsert({
      where: { name: tag.name },
      update: {
        code: tag.code,
        color: tag.color,
        description: tag.description,
        sort_order: tag.sortOrder,
        is_active: true
      },
      create: {
        name: tag.name,
        code: tag.code,
        color: tag.color,
        description: tag.description,
        sort_order: tag.sortOrder,
        is_active: true
      }
    });
    console.log(`  ✓ 标签：“${tag.name}” 已准备就绪`);
  }
}

async function seedLocations() {
  console.log('🌱 开始写入默认图书存放位置...');
  for (const location of defaultLocations) {
    await prisma.book_locations.upsert({
      where: { code: location.code },
      update: {
        name: location.name,
        area: location.area,
        floor: location.floor,
        shelf: location.shelf,
        capacity: location.capacity,
        sort_order: location.sortOrder,
        is_active: true,
        description: location.description
      },
      create: {
        name: location.name,
        code: location.code,
        area: location.area,
        floor: location.floor,
        shelf: location.shelf,
        capacity: location.capacity,
        sort_order: location.sortOrder,
        is_active: true,
        description: location.description
      }
    });
    console.log(`  ✓ 存放位置：“${location.name}” 已准备就绪`);
  }
}

async function seedBooks() {
  console.log('📚 开始写入示例图书数据...');

  const categoryCache = new Map();
  const locationCache = new Map();
  const tagCache = new Map();

  for (const book of defaultBooks) {
    const existing = await prisma.books.findUnique({
      where: { isbn: book.isbn }
    });

    if (existing) {
      console.log(`  ↺ 图书：“${book.title}” (${book.isbn}) 已存在，跳过`);
      continue;
    }

    let categoryRecord = null;
    if (book.category?.code) {
      if (categoryCache.has(book.category.code)) {
        categoryRecord = categoryCache.get(book.category.code);
      } else {
        categoryRecord = await prisma.book_categories.upsert({
          where: { code: book.category.code },
          update: {
            name: book.category.name,
            description: book.category.description,
            level: 1,
            sort_order: book.category.sortOrder ?? 100,
            is_active: true,
            updated_at: new Date()
          },
          create: {
            name: book.category.name,
            code: book.category.code,
            description: book.category.description,
            level: 1,
            sort_order: book.category.sortOrder ?? 100,
            is_active: true,
            book_count: 0,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        categoryCache.set(book.category.code, categoryRecord);
      }
    }

    let locationRecord = null;
    if (book.locationCode) {
      if (locationCache.has(book.locationCode)) {
        locationRecord = locationCache.get(book.locationCode);
      } else {
        locationRecord = await prisma.book_locations.findUnique({
          where: { code: book.locationCode }
        });

        if (!locationRecord) {
          console.warn(`  ⚠️ 未找到存放位置代码 “${book.locationCode}”，将以空位置信息写入`);
        }
        locationCache.set(book.locationCode, locationRecord);
      }
    }

    const tagIds = [];
    if (Array.isArray(book.tags)) {
      for (const tagName of book.tags) {
        if (!tagCache.has(tagName)) {
          const tagRecord = await prisma.book_tags.findUnique({
            where: { name: tagName }
          });

          if (!tagRecord) {
            console.warn(`  ⚠️ 未找到标签 “${tagName}”，已跳过关联`);
            tagCache.set(tagName, null);
            continue;
          }

          tagCache.set(tagName, tagRecord);
        }

        const record = tagCache.get(tagName);
        if (record) {
          tagIds.push(record.id);
        }
      }
    }

    const createdBook = await prisma.books.create({
      data: {
        title: book.title,
        isbn: book.isbn,
        authors: book.authors,
        publisher: book.publisher,
        publication_year: book.publicationYear,
        language: book.language || 'zh-CN',
        category_id: categoryRecord?.id ?? null,
        category: categoryRecord?.name ?? book.category?.name ?? null,
        tags: book.tags ?? [],
        summary: book.summary,
        description: book.description,
        cover_image: book.coverImage,
        total_stock: book.totalStock,
        available_stock: book.availableStock ?? book.totalStock,
        reserved_stock: book.reservedStock ?? 0,
        status: 'available',
        location_id: locationRecord?.id ?? null,
        location: locationRecord?.name ?? null,
        price: book.price ?? null,
        pages: book.pages ?? null,
        format: book.format ?? null,
        has_ebook: book.hasEbook ?? false,
        borrow_count: 0,
        view_count: 0,
        review_count: 0,
        condition: 'new',
        notes: book.notes ?? '示例数据：真实馆藏参考书目',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    if (tagIds.length) {
      for (const tagId of tagIds) {
        await prisma.book_tag_relations.create({
          data: {
            book_id: createdBook.id,
            tag_id: tagId,
            assigned_at: new Date()
          }
        });
      }
    }

    console.log(`  ✓ 新增图书：“${book.title}” (${book.isbn})`);
  }
}

async function main() {
  try {
    await seedTags();
    await seedLocations();
    await seedBooks();
    console.log('\n✅ 默认基础数据已写入完成');
  } catch (error) {
    console.error('❌ 写入默认数据失败:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
