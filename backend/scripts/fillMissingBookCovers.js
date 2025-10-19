/**
 * 图书封面补全脚本
 * 功能：针对数据库中 cover_image 为空的图书，优先根据 ISBN 调用 Open Library Covers API 获取封面，
 *       若无命中则退回标题+作者搜索，再更新 cover_image 字段为可用的远程图片地址。
 * 使用方式：
 *   1. 确保已配置好数据库连接（backend/.env 内需包含 DATABASE_URL 或相关 Prisma 配置）。
 *   2. 在项目根目录执行 `node backend/scripts/fillMissingBookCovers.js`。
 *   3. 脚本会输出处理日志与统计结果，完成后自动断开数据库连接。
 */

const path = require('path')
const fs = require('fs/promises')
const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

// 加载环境变量，兼容直接从 backend/scripts 触发
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

const OPEN_LIBRARY_COVER_BASE = 'https://covers.openlibrary.org/b'
const OPEN_LIBRARY_SEARCH_ENDPOINT = 'https://openlibrary.org/search.json'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT = 10000
const REQUEST_INTERVAL_MS = 300
const COVER_OUTPUT_DIR = path.resolve(__dirname, '../public/uploads/book-covers')
const BATCH_LIMIT = Number.parseInt(process.env.COVER_BATCH_LIMIT || '0', 10)
const BATCH_LIMIT = Number.parseInt(process.env.COVER_BATCH_LIMIT || '0', 10)
const BATCH_LIMIT = Number.parseInt(process.env.COVER_BATCH_LIMIT || '0', 10)
const BATCH_LIMIT = Number.parseInt(process.env.COVER_BATCH_LIMIT || '0', 10)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureOutputDir() {
  await fs.mkdir(COVER_OUTPUT_DIR, { recursive: true })
}

function sanitizeISBN(rawISBN) {
  if (!rawISBN) return null
  const compact = rawISBN.toString().replace(/[^0-9Xx]/g, '')
  return compact || null
}

function normalizeAuthors(authorsJson) {
  if (!authorsJson) return []
  if (Array.isArray(authorsJson)) {
    return authorsJson.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
  }
  if (typeof authorsJson === 'string') {
    try {
      const parsed = JSON.parse(authorsJson)
      return normalizeAuthors(parsed)
    } catch (error) {
      return authorsJson
        .split(/[、,/;；\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

function buildCoverUrlFromIsbn(isbn, size = 'L') {
  return `${OPEN_LIBRARY_COVER_BASE}/isbn/${isbn}-${size}.jpg?default=false`
}

function buildCoverUrlFromId(coverId, size = 'L') {
  return `${OPEN_LIBRARY_COVER_BASE}/id/${coverId}-${size}.jpg`
}

async function withRetry(requestFn, attempt = 0) {
  try {
    return await requestFn()
  } catch (error) {
    const status = error.response?.status
    const isTimeout = error.code === 'ECONNABORTED'

    if (status === 429 && attempt === 0) {
      console.warn('收到 429，等待 20 秒后重试一次...')
      await sleep(20000)
      return withRetry(requestFn, attempt + 1)
    }

    if ((status && status >= 500) || isTimeout) {
      if (attempt === 0) {
        console.warn(`请求失败（状态：${status ?? 'timeout'}），2 秒后重试一次...`)
        await sleep(2000)
        return withRetry(requestFn, attempt + 1)
      }
    }

    throw error
  }
}

async function coverExists(url) {
  try {
    const response = await withRetry(() =>
      axios.head(url, {
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': USER_AGENT }
      })
    )

    const contentType = response.headers['content-type'] || ''
    return response.status === 200 && contentType.startsWith('image')
  } catch (error) {
    if (error.response?.status === 404) {
      return false
    }
    console.warn(`校验封面地址失败：${url} -> ${error.message}`)
    return false
  }
}

async function fetchCoverFromExisting(book) {
  const url = book.cover_image
  if (!url || url.startsWith('/uploads/')) {
    return null
  }

  return { url, source: 'existing' }
}

async function fetchCoverByIsbn(book) {
  const isbn = sanitizeISBN(book.isbn)
  if (!isbn) return null

  const coverUrl = buildCoverUrlFromIsbn(isbn)
  const exists = await coverExists(coverUrl)
  if (exists) {
    return { url: coverUrl, source: 'isbn' }
  }
  return null
}

async function fetchCoverBySearch(book) {
  const title = book.title?.trim()
  if (!title) return null

  const authors = normalizeAuthors(book.authors)

  try {
    const response = await withRetry(() =>
      axios.get(OPEN_LIBRARY_SEARCH_ENDPOINT, {
        params: {
          title,
          author: authors.length ? authors.join(' ') : undefined,
          limit: 5
        },
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': USER_AGENT }
      })
    )

    const docs = response.data?.docs
    if (!Array.isArray(docs) || !docs.length) {
      return null
    }

    for (const doc of docs) {
      const coverId = doc.cover_i
      if (!coverId) {
        continue
      }

      const candidateUrl = buildCoverUrlFromId(coverId)
      const exists = await coverExists(candidateUrl)
      if (exists) {
        return { url: candidateUrl, source: 'search' }
      }
      // 控制请求频率，避免过于频繁访问
      await sleep(250)
    }

    return null
  } catch (error) {
    console.error(`通过标题搜索封面失败：${book.title} -> ${error.message}`)
    return null
  }
}

function detectFileExtension(contentType = '') {
  const normalized = contentType.toLowerCase()
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
  if (normalized.includes('gif')) return 'gif'
  return 'jpg'
}

async function downloadCoverImage(url, book) {
  const filenameBase = sanitizeISBN(book.isbn) || `book-${book.id}`

  const response = await withRetry(() =>
    axios.get(url, {
      responseType: 'arraybuffer',
      timeout: REQUEST_TIMEOUT,
      headers: { 'User-Agent': USER_AGENT }
    })
  )

  const ext = detectFileExtension(response.headers['content-type'])
  const filename = `${filenameBase}.${ext}`
  await fs.writeFile(path.join(COVER_OUTPUT_DIR, filename), response.data)

  return `/uploads/book-covers/${filename}`
}

async function main() {
  console.log('📘 开始补全图书封面...')

  await ensureOutputDir()

  const books = await prisma.books.findMany({
    where: {
      is_deleted: false,
      OR: [
        { cover_image: null },
        { cover_image: '' },
        {
          cover_image: {
            not: {
              startsWith: '/uploads/'
            }
          }
        }
      ]
    },
    select: {
      id: true,
      title: true,
      isbn: true,
      authors: true,
      cover_image: true
    }
  })

  const totalBooks = books.length
  const targetBooks =
    BATCH_LIMIT > 0 && BATCH_LIMIT < totalBooks ? books.slice(0, BATCH_LIMIT) : books

  if (!targetBooks.length) {
    console.log('✅ 所有图书均已存在封面，无需处理。')
    return
  }

  console.log(`待处理图书：${totalBooks} 本`)
  if (targetBooks.length !== totalBooks) {
    console.log(`本次按照 COVER_BATCH_LIMIT=${BATCH_LIMIT} 仅处理 ${targetBooks.length} 本`)
  }

  let updated = 0
  let skipped = 0
  let errors = 0

  const coverFetchers = [fetchCoverFromExisting, fetchCoverByIsbn, fetchCoverBySearch]

  for (const book of targetBooks) {
    try {
      let localPath = null
      let usedSource = null

      for (const fetcher of coverFetchers) {
        const candidate = await fetcher(book)
        if (!candidate) {
          continue
        }

        try {
          localPath = await downloadCoverImage(candidate.url, book)
          usedSource = candidate.source
          break
        } catch (downloadError) {
          console.warn(
            `下载封面失败（${candidate.source}）：${book.title} (ID: ${book.id}) -> ${downloadError.message}`
          )
        }
      }

      if (!localPath) {
        console.log(`⚠️ 未找到封面：${book.title} (ID: ${book.id})`)
        skipped += 1
        await sleep(REQUEST_INTERVAL_MS)
        continue
      }

      await prisma.books.update({
        where: { id: book.id },
        data: {
          cover_image: localPath,
          updated_at: new Date()
        }
      })

      updated += 1
      console.log(`✅ 更新成功：${book.title} (ID: ${book.id}) ← ${usedSource} → ${localPath}`)
      await sleep(REQUEST_INTERVAL_MS)
    } catch (error) {
      errors += 1
      console.error(`❌ 处理失败：${book.title} (ID: ${book.id}) -> ${error.message}`)
      await sleep(REQUEST_INTERVAL_MS)
    }
  }

  console.log('\n处理完成：')
  console.log(`  ✔️ 成功更新：${updated}`)
  console.log(`  ⚠️ 未找到：${skipped}`)
  console.log(`  ❌ 失败：${errors}`)
}

main()
  .catch((error) => {
    console.error('脚本执行异常：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
