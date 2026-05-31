#!/usr/bin/env node
/**
 * Seed the Apolo Content Hub via the Payload REST API.
 * Run AFTER `npm run dev` is up (port 3001) and the first push/migration applied.
 *
 * Seeds (all idempotent):
 *   - 1 admin user (matvietdesignteam@gmail.com)
 *   - 1 author: Apolo Editorial Team (slug `editorial-team`)
 *   - 3 practice-areas (dan-su, hinh-su, hon-nhan-gia-dinh)
 *   - 1 site-config: luatsudansu.vn
 *   - 1 article (source master)
 *   - 1 rendition (article -> luatsudansu.vn)
 *
 * Required env (.env.local): NEXT_PUBLIC_SITE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, '.env') })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env.local')
  process.exit(1)
}

async function ensureAdmin() {
  const reg = await fetch(`${SITE_URL}/api/users/first-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Apolo Admin', role: 'admin' }),
  })
  if (reg.ok) {
    console.log(`[seed] created first admin: ${EMAIL}`)
    return
  }
  const login = await fetch(`${SITE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (login.ok) {
    console.log(`[seed] admin already exists: ${EMAIL}`)
    return
  }
  console.error(`[seed] first-register failed (${reg.status}): ${await reg.text()}`)
  process.exit(1)
}

async function login() {
  const res = await fetch(`${SITE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  return (await res.json()).token
}

async function findOne(token, collection, field, value) {
  const res = await fetch(
    `${SITE_URL}/api/${collection}?where[${field}][equals]=${encodeURIComponent(value)}&limit=1&depth=0`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.docs?.[0] ?? null
}

async function ensure(token, collection, lookupField, record) {
  const existing = await findOne(token, collection, lookupField, record[lookupField])
  if (existing) {
    console.log(`  · ${collection}/${record[lookupField]} exists — skip`)
    return existing.id
  }
  const res = await fetch(`${SITE_URL}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`${collection}/${record[lookupField]}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  console.log(`  + ${collection}/${record[lookupField]}`)
  return data.doc?.id ?? data.id
}

const PRACTICE_AREAS = [
  { name: 'Luật Dân sự', slug: 'dan-su', order: 1, definition: '## Luật Dân sự\n\nLĩnh vực điều chỉnh các quan hệ tài sản và nhân thân (Bộ luật Dân sự 2015).' },
  { name: 'Luật Hình sự', slug: 'hinh-su', order: 2, definition: '## Luật Hình sự\n\nLĩnh vực về tội phạm và hình phạt (Bộ luật Hình sự 2015).' },
  { name: 'Hôn nhân & Gia đình', slug: 'hon-nhan-gia-dinh', order: 3, definition: '## Hôn nhân & Gia đình\n\nLy hôn, chia tài sản, quyền nuôi con (Luật Hôn nhân và Gia đình 2014).' },
]

const ARTICLE_BODY = `## Giới thiệu

Đây là nội dung nguồn (source master) dùng để minh hoạ kiến trúc Content Hub.

## Cơ sở pháp lý

Theo quy định tại (Điều 117 BLDS 2015), giao dịch dân sự có hiệu lực khi đáp ứng đủ điều kiện.

Liên hệ tư vấn tại [/lien-he](/lien-he).`

const RENDITION_BODY = `## Tranh chấp hợp đồng dân sự — luatsudansu.vn

Bản dựng riêng cho luatsudansu.vn với phần mở đầu, ví dụ và CTA khác biệt.

Theo (Điều 117 BLDS 2015), điều kiện có hiệu lực của giao dịch dân sự gồm năng lực, tự nguyện và mục đích hợp pháp.

Đặt lịch tư vấn: [/lien-he](/lien-he).`

async function main() {
  console.log('[seed] ensuring admin…')
  await ensureAdmin()
  const token = await login()

  console.log('[seed] author…')
  const authorId = await ensure(token, 'authors', 'slug', {
    name: 'Apolo Editorial Team',
    slug: 'editorial-team',
    role: 'Apolo Editorial Team',
    bio: 'Đội ngũ biên tập của Công ty Luật Apolo Lawyers.',
  })

  console.log('[seed] practice-areas…')
  const paIds = {}
  for (const pa of PRACTICE_AREAS) paIds[pa.slug] = await ensure(token, 'practice-areas', 'slug', pa)

  console.log('[seed] site-config…')
  const siteId = await ensure(token, 'site-configs', 'domain', {
    domain: 'luatsudansu.vn',
    displayName: 'Luật sư Dân sự',
    parentBrandLocale: 'vi',
    phase: 3,
    theme: { primary: '#8B4513', font: 'Be Vietnam Pro' },
    nav: { header: ['/', '/ve-chung-toi', '/lien-he'] },
    coveredPracticeAreas: [paIds['dan-su']],
    coveredTopics: ['tranh chấp hợp đồng', 'đòi nợ'],
  })

  console.log('[seed] article (source)…')
  const articleId = await ensure(token, 'articles', 'slug', {
    title: 'Điều kiện có hiệu lực của giao dịch dân sự',
    slug: 'dieu-kien-hieu-luc-giao-dich-dan-su',
    locale: 'vi',
    status: 'published',
    excerpt: 'Phân tích điều kiện có hiệu lực của giao dịch dân sự theo BLDS 2015.',
    body: ARTICLE_BODY,
    author: authorId,
    practiceAreas: [paIds['dan-su']],
    topicTags: ['giao dịch dân sự'],
    targetSites: [siteId],
    citations: [{ label: 'Điều 117 BLDS 2015', url: 'https://vbpl.vn' }],
  })

  console.log('[seed] rendition (luatsudansu.vn)…')
  await ensure(token, 'renditions', 'slug', {
    source: articleId,
    site: siteId,
    slug: 'dieu-kien-hieu-luc-giao-dich-dan-su',
    title: 'Điều kiện có hiệu lực của giao dịch dân sự',
    status: 'published',
    excerpt: 'Bản dựng cho luatsudansu.vn: điều kiện hiệu lực của giao dịch dân sự.',
    body: RENDITION_BODY,
    heroImageUrl: 'https://pub-ebe397ad6fc946888f5c9aacc3cc48bb.r2.dev/luatsudansu.vn/hero/giao-dich-dan-su.webp',
    canonicalUrl: 'https://luatsudansu.vn/dieu-kien-hieu-luc-giao-dich-dan-su',
  })

  console.log('[seed] done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
