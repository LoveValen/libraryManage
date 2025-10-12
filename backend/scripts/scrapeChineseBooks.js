/*
 * 中文图书抓取与入库脚本
 * 功能：调用豆瓣图书联想接口及图书详情页，抓取中文图书基础信息并写入数据库。
 * 使用要求：提前配置好 DATABASE_URL 环境变量，并在命令行执行 `node backend/scripts/scrapeChineseBooks.js`。
 */

const axios = require('axios')
const cheerio = require('cheerio')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Referer: 'https://book.douban.com/'
}
const REQUEST_TIMEOUT = 10000
const KEYWORDS = [
  '科幻',
  '文学经典',
  '历史',
  '心理学',
  '商业管理',
  '儿童绘本',
  '科普',
  '教育',
  '中国文化',
  '计算机',
  '旅行',
  '医学',
  '哲学'
]
const TITLE_SAMPLES = [
  '三体',
  '红楼梦',
  '活着',
  '解忧杂货店',
  '围城',
  '乡土中国',
  '人类简史',
  '小王子',
  '资本论',
  '乌合之众',
  '长安的荔枝',
  '明朝那些事儿',
  '阿Q正传'
]
const MAX_SUGGESTIONS_PER_KEYWORD = 8
const REQUEST_INTERVAL_MS = 800

const CATEGORY_NAME = '中文精选'
const CATEGORY_CODE = 'cn-featured'
const LOCATION_NAME = '中文综合区'
const LOCATION_CODE = 'cn-general-stack'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeText(value) {
  if (!value) return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed || null
}

function buildInfoMap($) {
  const infoMap = {}
  const container = $('#info')

  let currentLabel = null
  container.contents().each((_, node) => {
    if (node.type === 'tag') {
      const element = $(node)
      if (element.hasClass('pl')) {
        const rawLabel = element.text().trim()
        currentLabel = rawLabel.replace(/[:：]$/, '')
        if (!infoMap[currentLabel]) {
          infoMap[currentLabel] = []
        }
      } else if (node.name === 'br') {
        currentLabel = null
      } else if (currentLabel) {
        const text = sanitizeText(element.text())
        if (text) {
          infoMap[currentLabel].push(text)
        }
      }
    } else if (node.type === 'text' && currentLabel) {
      const text = sanitizeText(node.data)
      if (text) {
        infoMap[currentLabel].push(text)
      }
    }
  })

  return infoMap
}

function extractSingle(infoMap, label) {
  const values = infoMap[label]
  if (!values || values.length === 0) {
    return null
  }
  return sanitizeText(values.join(' '))
}

function normalizeAuthors(values = []) {
  if (!values.length) return []
  const merged = values.join(' ')
  return merged
    .split(/[\/、,，；;\s]+/)
    .map((name) => name.trim())
    .filter((name) => name)
}

function parsePublicationYear(rawValue) {
  if (!rawValue) return null
  const match = rawValue.match(/(\d{4})/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

function parseInteger(rawValue) {
  if (!rawValue) return null
  const match = rawValue.match(/(\d{1,4})/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

function parsePrice(rawValue) {
  if (!rawValue) return null
  const match = rawValue.replace(/元|CNY|RMB/gi, '').match(/\d+(\.\d+)?/)
  if (!match) return null
  return Number.parseFloat(match[0])
}

async function fetchSuggestions(keyword) {
  try {
    const response = await axios.get('https://book.douban.com/j/subject_suggest', {
      params: { q: keyword },
      headers: REQUEST_HEADERS,
      timeout: REQUEST_TIMEOUT
    })

    if (!Array.isArray(response.data)) {
      return []
    }

    return response.data
      .filter((item) => item.type === 'b')
      .slice(0, MAX_SUGGESTIONS_PER_KEYWORD)
      .map((item) => ({ ...item, keyword }))
  } catch (error) {
    console.error(`关键词「${keyword}」联想请求失败:`, error.message)
    return []
  }
}

function extractSummary($) {
  const intro = $('#link-report .intro').last()
  if (!intro.length) {
    return null
  }

  const paragraphs = intro
    .find('p')
    .map((_, element) => sanitizeText($(element).text()))
    .get()
    .filter(Boolean)

  if (!paragraphs.length) {
    const fallback = sanitizeText(intro.text())
    return fallback
  }

  return paragraphs.join('\n')
}

function collectTags($) {
  return $('#db-tags-section .indent a')
    .map((_, element) => sanitizeText($(element).text()))
    .get()
    .filter(Boolean)
}

async function fetchBookDetail(suggestion) {
  const targetUrl = suggestion.url
  try {
    const response = await axios.get(targetUrl, {
      headers: REQUEST_HEADERS,
      timeout: REQUEST_TIMEOUT
    })

    const $ = cheerio.load(response.data)
    const infoMap = buildInfoMap($)
    const title = sanitizeText($('#wrapper h1 span').text()) || sanitizeText(suggestion.title)
    const authors = normalizeAuthors(infoMap.作者)
    const isbn = extractSingle(infoMap, 'ISBN')?.replace(/[^0-9Xx]/g, '')

    if (!isbn) {
      console.warn(`跳过「${title || suggestion.title}」, 原因：缺少 ISBN。`)
      return null
    }

    const publisher = extractSingle(infoMap, '出版社')
    const publicationYear = parsePublicationYear(extractSingle(infoMap, '出版年'))
    const pages = parseInteger(extractSingle(infoMap, '页数'))
    const price = parsePrice(extractSingle(infoMap, '定价'))
    const format = extractSingle(infoMap, '装帧')
    const summary = extractSummary($)
    const tags = collectTags($)
    const cover = suggestion.pic ? suggestion.pic.replace('/s/', '/l/') : null

    return {
      id: suggestion.id,
      title,
      isbn,
      authors,
      publisher,
      publicationYear,
      pages,
      price,
      format,
      summary,
      tags,
      cover,
      keyword: suggestion.keyword,
      detailUrl: targetUrl
    }
  } catch (error) {
    console.error(`抓取图书详情失败 (${targetUrl}):`, error.message)
    return null
  }
}

async function ensureCategory() {
  return prisma.book_categories.upsert({
    where: { code: CATEGORY_CODE },
    update: {
      name: CATEGORY_NAME,
      updated_at: new Date()
    },
    create: {
      name: CATEGORY_NAME,
      code: CATEGORY_CODE,
      description: '自动抓取的中文图书集合',
      level: 1,
      is_active: true,
      sort_order: 50,
      book_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  })
}

async function ensureLocation() {
  return prisma.book_locations.upsert({
    where: { code: LOCATION_CODE },
    update: {
      name: LOCATION_NAME,
      updated_at: new Date()
    },
    create: {
      name: LOCATION_NAME,
      code: LOCATION_CODE,
      area: '主馆',
      floor: '2F',
      shelf: 'B-区',
      description: '中文综合类书架',
      is_active: true
    }
  })
}

async function upsertBook(detail, category, location, resultStats) {
  const exists = await prisma.books.findUnique({
    where: { isbn: detail.isbn }
  })

  if (exists) {
    console.log(`已存在，跳过：${detail.title} (${detail.isbn})`)
    resultStats.skipped += 1
    return
  }

  const createdAt = new Date()
  await prisma.books.create({
    data: {
      title: detail.title,
      isbn: detail.isbn,
      authors: detail.authors,
      publisher: detail.publisher,
      publication_year: detail.publicationYear,
      language: 'zh-CN',
      category_id: category?.id ?? null,
      category: category?.name ?? null,
      tags: detail.tags && detail.tags.length ? detail.tags : null,
      summary: detail.summary,
      description: detail.summary,
      cover_image: detail.cover,
      total_stock: 10,
      available_stock: 10,
      reserved_stock: 0,
      status: 'available',
      location_id: location?.id ?? null,
      location: location?.name ?? null,
      price: detail.price ?? 0,
      pages: detail.pages ?? null,
      format: detail.format ?? '平装',
      has_ebook: false,
      borrow_count: 0,
      view_count: 0,
      review_count: 0,
      condition: 'new',
      notes: `数据来源：豆瓣图书，关键词「${detail.keyword}」，抓取时间 ${createdAt.toISOString()}`,
      created_at: createdAt,
      updated_at: createdAt
    }
  })

  console.log(`新增图书成功：${detail.title} (${detail.isbn})`)
  resultStats.inserted += 1
}

async function main() {
  const aggregated = new Map()
  const resultStats = {
    inserted: 0,
    skipped: 0,
    failed: []
  }

  try {
    const category = await ensureCategory()
    const location = await ensureLocation()

    for (const keyword of KEYWORDS) {
      console.log(`开始处理关键词：${keyword}`)
      const items = await fetchSuggestions(keyword)
      for (const item of items) {
        if (!aggregated.has(item.id)) {
          aggregated.set(item.id, item)
        }
      }
      await sleep(REQUEST_INTERVAL_MS)
    }

    for (const title of TITLE_SAMPLES) {
      console.log(`额外采样书目：${title}`)
      const items = await fetchSuggestions(title)
      for (const item of items.slice(0, 3)) {
        if (!aggregated.has(item.id)) {
          aggregated.set(item.id, item)
        }
      }
      await sleep(REQUEST_INTERVAL_MS)
    }

    console.log(`共获取候选图书 ${aggregated.size} 本，开始抓取详情。`)

    for (const suggestion of aggregated.values()) {
      await sleep(REQUEST_INTERVAL_MS)
      const detail = await fetchBookDetail(suggestion)
      if (!detail) {
        resultStats.failed.push({ id: suggestion.id, url: suggestion.url })
        continue
      }

      try {
        await upsertBook(detail, category, location, resultStats)
      } catch (error) {
        console.error(`写入数据库失败：${detail.title} (${detail.isbn})`, error.message)
        resultStats.failed.push({ id: suggestion.id, isbn: detail.isbn, reason: error.message })
      }
    }

    console.log('抓取完成，统计结果如下：')
    console.table({
      插入成功: resultStats.inserted,
      已存在跳过: resultStats.skipped,
      失败条目: resultStats.failed.length
    })

    if (resultStats.failed.length) {
      console.log('失败明细：', resultStats.failed)
    }
  } catch (error) {
    console.error('脚本执行失败:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
