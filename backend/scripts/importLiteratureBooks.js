const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const CATEGORY_NAME = '基础文学'
const CATEGORY_CODE = 'literature-basic'

const books = [
  {
    title: 'Pride and Prejudice',
    isbn: '9780141439518',
    authors: ['Jane Austen'],
    publisher: 'Penguin Books',
    publicationYear: 2002,
    language: 'en',
    tags: ['经典文学', '英国文学', '爱情'],
    summary: 'Classic novel following the emotional development of Elizabeth Bennet as she navigates issues of manners, upbringing, morality, education, and marriage in British Regency society.',
    description: 'This Penguin Classics edition of Jane Austen\'s beloved novel presents a sharp commentary on class, marriage, and morality through the evolving relationship of Elizabeth Bennet and Mr. Darcy.',
    cover_image: 'https://images.penguinrandomhouse.com/cover/9780141439518',
    total_stock: 5,
    available_stock: 5,
    price: 12.99,
    pages: 480,
    format: 'paperback',
    location: '文学区 A 排'
  },
  {
    title: 'To Kill a Mockingbird',
    isbn: '9780061120084',
    authors: ['Harper Lee'],
    publisher: 'Harper Perennial Modern Classics',
    publicationYear: 2006,
    language: 'en',
    tags: ['经典文学', '美国文学', '社会正义'],
    summary: 'Pulitzer Prize–winning novel centered on young Scout Finch and her father Atticus, a lawyer who defends a Black man unjustly accused in Depression-era Alabama.',
    description: 'Harper Lee\'s seminal work explores themes of racial injustice, moral growth, and compassion through the eyes of a child in the American South.',
    cover_image: 'https://images.harpercollins.com/covers/9780061120084',
    total_stock: 5,
    available_stock: 5,
    price: 14.99,
    pages: 336,
    format: 'paperback',
    location: '文学区 A 排'
  },
  {
    title: '1984',
    isbn: '9780451524935',
    authors: ['George Orwell'],
    publisher: 'Signet Classic',
    publicationYear: 1961,
    language: 'en',
    tags: ['经典文学', '反乌托邦', '政治寓言'],
    summary: 'Dystopian novel depicting a totalitarian regime led by Big Brother and the Party, where individual thought is suppressed.',
    description: 'George Orwell\'s chilling vision warns of the dangers of surveillance, censorship, and authoritarian control in a gripping narrative about rebellion and truth.',
    cover_image: 'https://images.penguinrandomhouse.com/cover/9780451524935',
    total_stock: 5,
    available_stock: 5,
    price: 9.99,
    pages: 328,
    format: 'paperback',
    location: '文学区 A 排'
  },
  {
    title: 'The Great Gatsby',
    isbn: '9780743273565',
    authors: ['F. Scott Fitzgerald'],
    publisher: 'Scribner',
    publicationYear: 2003,
    language: 'en',
    tags: ['经典文学', '美国文学', '爵士时代'],
    summary: 'A portrait of the Jazz Age and the elusive American Dream through the tragic story of Jay Gatsby and Daisy Buchanan.',
    description: 'F. Scott Fitzgerald captures the glamour and disillusionment of 1920s America, examining wealth, class, and the pursuit of happiness.',
    cover_image: 'https://images.simonandschuster.com/cover/9780743273565',
    total_stock: 5,
    available_stock: 5,
    price: 10.99,
    pages: 208,
    format: 'paperback',
    location: '文学区 A 排'
  },
  {
    title: 'One Hundred Years of Solitude',
    isbn: '9780060883287',
    authors: ['Gabriel García Márquez'],
    publisher: 'Harper Perennial Modern Classics',
    publicationYear: 2006,
    language: 'en',
    tags: ['经典文学', '魔幻现实主义', '拉丁美洲文学'],
    summary: 'The multi-generational story of the Buendía family in the fictional town of Macondo, blending history, myth, and magic.',
    description: 'Gabriel García Márquez\'s masterpiece of magical realism explores solitude, memory, and the cyclical nature of history.',
    cover_image: 'https://images.harpercollins.com/covers/9780060883287',
    total_stock: 5,
    available_stock: 5,
    price: 15.99,
    pages: 448,
    format: 'paperback',
    location: '文学区 A 排'
  }
]

async function ensureCategory() {
  const existing = await prisma.book_categories.findFirst({
    where: {
      OR: [{ name: CATEGORY_NAME }, { code: CATEGORY_CODE }]
    }
  })

  if (existing) {
    return existing
  }

  return prisma.book_categories.create({
    data: {
      name: CATEGORY_NAME,
      code: CATEGORY_CODE,
      description: '基础文学类经典读物',
      level: 1,
      is_active: true,
      sort_order: 100,
      book_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  })
}

async function upsertBook(book, category) {
  const exists = await prisma.books.findUnique({
    where: { isbn: book.isbn }
  })

  if (exists) {
    console.log(`跳过已存在的图书: ${book.title} (${book.isbn})`)
    return
  }

  await prisma.books.create({
    data: {
      title: book.title,
      isbn: book.isbn,
      authors: book.authors,
      publisher: book.publisher,
      publication_year: book.publicationYear,
      language: book.language,
      category_id: category?.id ?? null,
      category: category?.name ?? '文学',
      tags: book.tags,
      summary: book.summary,
      description: book.description,
      cover_image: book.cover_image,
      total_stock: book.total_stock,
      available_stock: book.available_stock,
      reserved_stock: 0,
      status: 'available',
      location: book.location,
      price: book.price,
      pages: book.pages,
      format: book.format,
      has_ebook: false,
      borrow_count: 0,
      view_count: 0,
      review_count: 0,
      condition: 'new',
      notes: '导入的基础文学经典书目',
      created_at: new Date(),
      updated_at: new Date()
    }
  })

  console.log(`新增图书成功: ${book.title} (${book.isbn})`)
}

async function main() {
  try {
    const category = await ensureCategory()

    for (const book of books) {
      await upsertBook(book, category)
    }
  } catch (error) {
    console.error('导入文学类图书失败:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
