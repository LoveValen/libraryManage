const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function insertITCategories() {
  try {
    console.log('开始插入IT相关分类数据...')

    const now = new Date()
    
    // IT类分类数据
    const itCategories = [
      {
        name: 'IT技术',
        name_en: 'IT Technology',
        code: 'IT001',
        description: 'IT技术相关书籍，包括编程、网络、数据库等',
        icon: 'laptop',
        color: '#409EFF',
        sort_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: '编程语言',
        name_en: 'Programming Languages',
        code: 'IT002',
        parent_id: null, // 将在创建后设置
        level: 2,
        description: '各种编程语言学习和实践',
        icon: 'code',
        color: '#67C23A',
        sort_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'JavaScript',
        name_en: 'JavaScript',
        code: 'IT002001',
        parent_id: null, // 将在创建后设置
        level: 3,
        description: 'JavaScript语言相关书籍',
        icon: 'javascript',
        color: '#F7DF1E',
        sort_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'Python',
        name_en: 'Python',
        code: 'IT002002',
        parent_id: null, // 将在创建后设置
        level: 3,
        description: 'Python语言相关书籍',
        icon: 'python',
        color: '#3776AB',
        sort_order: 2,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'Java',
        name_en: 'Java',
        code: 'IT002003',
        parent_id: null, // 将在创建后设置
        level: 3,
        description: 'Java语言相关书籍',
        icon: 'java',
        color: '#ED8B00',
        sort_order: 3,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: '数据库技术',
        name_en: 'Database Technology',
        code: 'IT003',
        parent_id: null, // 将在创建后设置
        level: 2,
        description: '数据库设计、管理和优化相关书籍',
        icon: 'database',
        color: '#E6A23C',
        sort_order: 2,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'MySQL',
        name_en: 'MySQL',
        code: 'IT003001',
        parent_id: null, // 将在创建后设置
        level: 3,
        description: 'MySQL数据库相关书籍',
        icon: 'mysql',
        color: '#4479A1',
        sort_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: '网络技术',
        name_en: 'Network Technology',
        code: 'IT004',
        parent_id: null, // 将在创建后设置
        level: 2,
        description: '网络协议、安全、运维相关书籍',
        icon: 'network',
        color: '#F56C6C',
        sort_order: 3,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: '人工智能',
        name_en: 'Artificial Intelligence',
        code: 'IT005',
        parent_id: null, // 将在创建后设置
        level: 2,
        description: '人工智能、机器学习、深度学习相关书籍',
        icon: 'ai',
        color: '#909399',
        sort_order: 4,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]

    // 首先创建主分类
    const mainCategory = await prisma.book_categories.create({
      data: itCategories[0]
    })
    console.log(`✓ 创建主分类: ${mainCategory.name}`)

    // 创建二级分类并设置parent_id
    const level2Categories = []
    for (let i = 1; i < itCategories.length; i++) {
      const category = itCategories[i]
      if (category.level === 2) {
        const created = await prisma.book_categories.create({
          data: {
            ...category,
            parent_id: mainCategory.id
          }
        })
        level2Categories.push(created)
        console.log(`✓ 创建二级分类: ${created.name}`)
      }
    }

    // 创建三级分类
    for (let i = 1; i < itCategories.length; i++) {
      const category = itCategories[i]
      if (category.level === 3) {
        let parentId = null
        
        // 根据code前缀找到对应的父分类
        if (category.code.startsWith('IT002')) {
          parentId = level2Categories.find(c => c.code === 'IT002')?.id
        } else if (category.code.startsWith('IT003')) {
          parentId = level2Categories.find(c => c.code === 'IT003')?.id
        }
        
        if (parentId) {
          const created = await prisma.book_categories.create({
            data: {
              ...category,
              parent_id: parentId
            }
          })
          console.log(`✓ 创建三级分类: ${created.name}`)
        }
      }
    }

    console.log('✅ IT分类数据插入完成!')
    
    // 查询并显示创建的分类
    const allCategories = await prisma.book_categories.findMany({
      where: {
        OR: [
          { code: { startsWith: 'IT' } },
          { name: 'IT技术' }
        ]
      },
      orderBy: [
        { level: 'asc' },
        { sort_order: 'asc' }
      ]
    })
    
    console.log('\n📋 已创建的IT分类列表:')
    allCategories.forEach(cat => {
      const indent = '  '.repeat(cat.level - 1)
      console.log(`${indent}- ${cat.name} (${cat.code})`)
    })

  } catch (error) {
    console.error('❌ 插入分类数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行脚本
insertITCategories()