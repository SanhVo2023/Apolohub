#!/usr/bin/env node
/**
 * Idempotent seeder: creates the practice-areas + site-configs for the Phase 3/4
 * hub-fed sites in the LIVE Content Hub. Reads the hub admin password at runtime
 * from PM_CREDENTIALS.md (never inlined). Safe to re-run — upserts by slug/domain.
 *
 *   node hub/scripts/seed-phase34-configs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const HUB = process.env.HUB_API_URL || 'https://cms.vothienhien.com'
const EMAIL = 'matvietdesignteam@gmail.com'

function readHubPassword() {
  const cred = fs.readFileSync(path.join(ROOT, 'PM_CREDENTIALS.md'), 'utf8')
  // "**Content Hub** (`hub/`) | matvietdesignteam@gmail.com | `PASSWORD` | ..."
  const m = cred.match(/Content Hub[^\n|]*\|\s*matvietdesignteam@gmail\.com\s*\|\s*`([^`]+)`/)
  if (!m) throw new Error('hub admin password not found in PM_CREDENTIALS.md')
  return m[1]
}

const PRACTICE_AREAS = [
  { name: 'Luật Doanh nghiệp', slug: 'doanh-nghiep', order: 4 },
  { name: 'Luật Nhà đất', slug: 'nha-dat', order: 5 },
  { name: 'Luật Thương mại', slug: 'thuong-mai', order: 6 },
  { name: 'Tranh tụng', slug: 'tranh-tung', order: 7 },
  { name: 'Foreign Investment & Corporate', slug: 'foreign-investment', order: 8 },
  { name: 'Legal Services for Foreigners', slug: 'foreign-legal-services', order: 9 },
]

// parentBrandLocale: vi -> apolo.com.vn, en -> apololawyers.com
const SITE_CONFIGS = [
  {
    domain: 'dangkydoanhnghiep.net', displayName: 'Đăng ký Doanh nghiệp', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#1F6F54', secondary: '#16324F', accent: '#E0A458', font: 'Be Vietnam Pro' },
    areas: ['doanh-nghiep'],
    topics: ['thành lập công ty', 'đăng ký kinh doanh', 'thay đổi giấy phép', 'giải thể doanh nghiệp', 'con dấu', 'ngành nghề kinh doanh có điều kiện'],
  },
  {
    domain: 'luatsudoanhnghiep.org', displayName: 'Luật sư Doanh nghiệp', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#16324F', secondary: '#0F2237', accent: '#C9A24A', font: 'Be Vietnam Pro' },
    areas: ['doanh-nghiep'],
    topics: ['hợp đồng doanh nghiệp', 'quản trị công ty', 'tuân thủ pháp lý', 'tranh chấp cổ đông', 'M&A', 'lao động doanh nghiệp'],
  },
  {
    domain: 'luatsunhadat.org', displayName: 'Luật sư Nhà đất', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#8A5A2B', secondary: '#3B2A1A', accent: '#5C8A3A', font: 'Be Vietnam Pro' },
    areas: ['nha-dat'],
    topics: ['tranh chấp đất đai', 'sổ đỏ', 'chuyển nhượng quyền sử dụng đất', 'thừa kế nhà đất', 'ranh giới', 'thu hồi đất'],
  },
  {
    domain: 'luatsunhadatsaigon.com', displayName: 'Luật sư Nhà đất Sài Gòn', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#A6562B', secondary: '#2E2A26', accent: '#3E8E9C', font: 'Be Vietnam Pro' },
    areas: ['nha-dat'],
    topics: ['tranh chấp nhà đất TP.HCM', 'sổ hồng', 'mua bán căn hộ', 'ranh giới đất nội thành', 'tách thửa', 'quy hoạch đô thị'],
  },
  {
    domain: 'luatsuthuongmai.com', displayName: 'Luật sư Thương mại', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#0E5A8A', secondary: '#0A2C45', accent: '#E07B39', font: 'Be Vietnam Pro' },
    areas: ['thuong-mai'],
    topics: ['tranh chấp hợp đồng thương mại', 'vi phạm thanh toán', 'phạt vi phạm hợp đồng', 'trọng tài thương mại', 'mua bán hàng hóa', 'đại lý phân phối'],
  },
  {
    domain: 'luatsutranhtung.vn', displayName: 'Luật sư Tranh tụng', parentBrandLocale: 'vi', phase: 3,
    theme: { primary: '#5B2333', secondary: '#1C1018', accent: '#C9A24A', font: 'Be Vietnam Pro' },
    areas: ['tranh-tung'],
    topics: ['đại diện tại tòa', 'chuẩn bị hồ sơ khởi kiện', 'chiến lược tranh tụng', 'kháng cáo', 'thi hành án', 'chứng cứ'],
  },
  {
    domain: 'apololegal.com', displayName: 'Apolo Legal', parentBrandLocale: 'en', phase: 4,
    theme: { primary: '#13294B', secondary: '#0A1A30', accent: '#B08D57', font: 'Inter' },
    areas: ['foreign-investment'],
    topics: ['foreign direct investment', 'M&A in Vietnam', 'corporate compliance', 'commercial contracts', 'company formation', 'cross-border transactions'],
  },
  {
    domain: 'lawyersinvietnam.net', displayName: 'Lawyers in Vietnam', parentBrandLocale: 'en', phase: 4,
    theme: { primary: '#1B4D5B', secondary: '#0E2A33', accent: '#D9A441', font: 'Inter' },
    areas: ['foreign-legal-services'],
    topics: ['legal guides for expats', 'court procedures in Vietnam', 'marriage and divorce for foreigners', 'property for foreigners', 'work permits', 'dispute resolution'],
  },
]

async function main() {
  const password = readHubPassword()
  const lr = await fetch(`${HUB}/api/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password }),
  })
  const ld = await lr.json()
  if (!ld.token) throw new Error('login failed: ' + JSON.stringify(ld).slice(0, 200))
  const tok = ld.token
  const H = { 'Content-Type': 'application/json', Authorization: `JWT ${tok}` }
  console.log(`[seed] logged in as ${EMAIL} (role ${ld.user?.role})`)

  // 1. practice areas (upsert by slug)
  const areaIdBySlug = {}
  // preload existing
  const existingPA = await (await fetch(`${HUB}/api/practice-areas?limit=100&depth=0`, { headers: H })).json()
  for (const d of existingPA.docs) areaIdBySlug[d.slug] = d.id
  for (const pa of PRACTICE_AREAS) {
    if (areaIdBySlug[pa.slug]) { console.log(`  area exists: ${pa.slug} (id${areaIdBySlug[pa.slug]})`); continue }
    const r = await fetch(`${HUB}/api/practice-areas`, { method: 'POST', headers: H, body: JSON.stringify(pa) })
    const d = await r.json()
    if (!r.ok) { console.error(`  area FAIL ${pa.slug}: ${r.status} ${JSON.stringify(d).slice(0, 200)}`); continue }
    areaIdBySlug[pa.slug] = d.doc.id
    console.log(`  area created: ${pa.slug} (id${d.doc.id})`)
  }

  // 2. site-configs (upsert by domain)
  let created = 0, existed = 0, failed = 0
  for (const sc of SITE_CONFIGS) {
    const ex = await (await fetch(`${HUB}/api/site-configs?where[domain][equals]=${encodeURIComponent(sc.domain)}&depth=0`, { headers: H })).json()
    const body = {
      domain: sc.domain,
      displayName: sc.displayName,
      theme: sc.theme,
      nav: { header: ['/', '/ve-chung-toi', '/lien-he'], footer: ['/', '/ve-chung-toi', '/lien-he'] },
      parentBrandLocale: sc.parentBrandLocale,
      coveredPracticeAreas: sc.areas.map((s) => areaIdBySlug[s]).filter(Boolean),
      coveredTopics: sc.topics,
      phase: sc.phase,
    }
    if (ex.totalDocs > 0) {
      const id = ex.docs[0].id
      const r = await fetch(`${HUB}/api/site-configs/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
      if (r.ok) { existed++; console.log(`  config updated: ${sc.domain} (id${id})`) }
      else { failed++; console.error(`  config PATCH FAIL ${sc.domain}: ${r.status}`) }
    } else {
      const r = await fetch(`${HUB}/api/site-configs`, { method: 'POST', headers: H, body: JSON.stringify(body) })
      const d = await r.json()
      if (r.ok) { created++; console.log(`  config created: ${sc.domain} (id${d.doc.id}) areas=[${body.coveredPracticeAreas.join(',')}]`) }
      else { failed++; console.error(`  config POST FAIL ${sc.domain}: ${r.status} ${JSON.stringify(d).slice(0, 200)}`) }
    }
  }
  console.log(`[seed] site-configs: ${created} created, ${existed} updated, ${failed} failed`)

  // 3. final inventory
  const all = await (await fetch(`${HUB}/api/site-configs?limit=100&depth=0`, { headers: H })).json()
  console.log(`[seed] hub now has ${all.totalDocs} site-configs: ${all.docs.map((d) => `${d.domain}(p${d.phase})`).join(', ')}`)
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
