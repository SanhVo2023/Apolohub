#!/usr/bin/env node
/**
 * Deterministic hub publisher — reads staged article/rendition JSON files from
 * disk and upserts them into the LIVE Content Hub VERBATIM (no LLM in the loop,
 * so full-length bodies are preserved exactly). Reads the hub admin password at
 * runtime from PM_CREDENTIALS.md (never inlined).
 *
 *   node hub/scripts/publish-from-staging.mjs \
 *     --domain luatsuhinhsu.vn --site-id 2 --area-id 2 \
 *     --src  E:/NEW APP/Apolo Website/tmp/hinhsu/src \
 *     --rend E:/NEW APP/Apolo Website/tmp/hinhsu/rend \
 *     [--validate]   # enforce 2500-4000 words + >=5 citations + /lien-he before publishing
 *
 * Staged SOURCE file shape  (tmp/.../src/<slug>.json):
 *   { slug, title, excerpt, body, topicTags?[], citations?[{label,url}] }
 * Staged RENDITION file shape (tmp/.../rend/<slug>.json):
 *   { slug, title, excerpt, body, heroImageUrl? }
 *
 * Upserts: articles by slug; renditions by (site,slug). Idempotent / re-runnable.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const HUB = process.env.HUB_API_URL || 'https://cms.vothienhien.com'
const EMAIL = 'matvietdesignteam@gmail.com'

function arg(name, def) {
  const i = process.argv.indexOf('--' + name)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}
const DOMAIN = arg('domain')
const SITE_ID = Number(arg('site-id'))
const AREA_ID = Number(arg('area-id'))
const SRC_DIR = arg('src')
const REND_DIR = arg('rend')
const VALIDATE = !!arg('validate', false)
const AUTHOR_SLUG = arg('author', 'editorial-team')
const MIN_WORDS = Number(arg('min-words', 2500))
const MAX_WORDS = Number(arg('max-words', 4000))
const CONTENT_TYPE = arg('content-type', 'article') // article | blog | news (per-rendition `contentType` overrides)

if (!DOMAIN || !SITE_ID || !SRC_DIR) {
  console.error('usage: --domain <d> --site-id <n> --area-id <n> --src <dir> [--rend <dir>] [--validate]')
  process.exit(2)
}

const CITATION_RE = /\((Điều|Khoản|Án lệ|Nghị định|Thông tư|Luật|Article|Section|Decree|Circular|Act)\s+\d/g
const CTA_RE = /\]\((\/lien-he|\/contact|\/dat-lich)/i

function validate(body, label) {
  const errs = []
  if (!body || typeof body !== 'string') return ['missing body']
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  if (/<[a-zA-Z!]/.test(stripped)) errs.push('raw HTML')
  if (/^[^\n]+\n=+\s*$/m.test(body) || /^[^\n]+\n-+\s*$/m.test(body)) errs.push('setext headings')
  const w = body.split(/\s+/).filter(Boolean).length
  if (w < MIN_WORDS || w > MAX_WORDS) errs.push(`words ${w} (need ${MIN_WORDS}-${MAX_WORDS})`)
  if ((body.match(CITATION_RE) || []).length < 5) errs.push('<5 citations')
  if (!CTA_RE.test(body)) errs.push('no /lien-he CTA')
  return errs
}

function readDir(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return { file: f, doc: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) } }
    catch (e) { console.error(`  BAD JSON ${f}: ${e.message}`); return null }
  }).filter(Boolean)
}

async function main() {
  const cred = fs.readFileSync(path.join(ROOT, 'PM_CREDENTIALS.md'), 'utf8')
  const pw = (cred.match(/Content Hub[^\n|]*\|\s*matvietdesignteam@gmail\.com\s*\|\s*`([^`]+)`/) || [])[1]
  if (!pw) throw new Error('hub password not found in PM_CREDENTIALS.md')
  const tok = (await (await fetch(`${HUB}/api/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: pw }) })).json()).token
  if (!tok) throw new Error('login failed')
  const H = { 'Content-Type': 'application/json', Authorization: `JWT ${tok}` }
  console.log(`[pub] logged in; domain=${DOMAIN} site=${SITE_ID} area=${AREA_ID}`)

  const authorId = (await (await fetch(`${HUB}/api/authors?where[slug][equals]=${AUTHOR_SLUG}`, { headers: H })).json()).docs?.[0]?.id

  // ── SOURCES ──
  const srcFiles = readDir(SRC_DIR)
  const idBySlug = {}
  let sCreated = 0, sUpdated = 0, sFailed = 0, sSkipped = 0
  for (const { doc } of srcFiles) {
    if (VALIDATE) {
      const e = validate(doc.body, doc.slug)
      if (e.length) { sSkipped++; console.error(`  SKIP src ${doc.slug}: ${e.join('; ')}`); continue }
    }
    const body = {
      title: doc.title, slug: doc.slug, body: doc.body, excerpt: doc.excerpt || '',
      locale: doc.locale || 'vi', practiceAreas: AREA_ID ? [AREA_ID] : [], topicTags: doc.topicTags || [],
      targetSites: [SITE_ID], ...(authorId ? { author: authorId } : {}),
      citations: doc.citations || [], status: 'ready',
    }
    const ex = await (await fetch(`${HUB}/api/articles?where[slug][equals]=${encodeURIComponent(doc.slug)}&depth=0`, { headers: H })).json()
    if (ex.totalDocs > 0) {
      const id = ex.docs[0].id
      const r = await fetch(`${HUB}/api/articles/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
      if (r.ok) { idBySlug[doc.slug] = id; sUpdated++ } else { sFailed++; console.error(`  src PATCH FAIL ${doc.slug}: ${r.status} ${(await r.text()).slice(0,160)}`) }
    } else {
      const r = await fetch(`${HUB}/api/articles`, { method: 'POST', headers: H, body: JSON.stringify(body) })
      const d = await r.json()
      if (r.ok) { idBySlug[doc.slug] = d.doc.id; sCreated++ } else { sFailed++; console.error(`  src POST FAIL ${doc.slug}: ${r.status} ${JSON.stringify(d).slice(0,160)}`) }
    }
  }
  console.log(`[pub] sources: ${sCreated} created, ${sUpdated} updated, ${sSkipped} skipped, ${sFailed} failed (${Object.keys(idBySlug).length} ids)`)

  // ── RENDITIONS ──
  const rendFiles = readDir(REND_DIR)
  let rCreated = 0, rUpdated = 0, rFailed = 0, rSkipped = 0
  for (const { doc } of rendFiles) {
    if (VALIDATE) {
      const e = validate(doc.body, doc.slug)
      if (e.length) { rSkipped++; console.error(`  SKIP rend ${doc.slug}: ${e.join('; ')}`); continue }
    }
    const body = {
      source: idBySlug[doc.sourceSlug || doc.slug] || undefined,
      site: SITE_ID, slug: doc.slug, title: doc.title, body: doc.body,
      excerpt: doc.excerpt || '', heroImageUrl: doc.heroImageUrl || '',
      contentType: doc.contentType || CONTENT_TYPE,
      ...(Array.isArray(doc.tags) ? { tags: doc.tags } : {}),
      canonicalUrl: `https://${DOMAIN}/${doc.slug}`, status: 'published',
    }
    const ex = await (await fetch(`${HUB}/api/renditions?where[and][0][site][equals]=${SITE_ID}&where[and][1][slug][equals]=${encodeURIComponent(doc.slug)}&depth=0`, { headers: H })).json()
    if (ex.totalDocs > 0) {
      const id = ex.docs[0].id
      const r = await fetch(`${HUB}/api/renditions/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
      if (r.ok) rUpdated++; else { rFailed++; console.error(`  rend PATCH FAIL ${doc.slug}: ${r.status} ${(await r.text()).slice(0,160)}`) }
    } else {
      const r = await fetch(`${HUB}/api/renditions`, { method: 'POST', headers: H, body: JSON.stringify(body) })
      const d = await r.json()
      if (r.ok) rCreated++; else { rFailed++; console.error(`  rend POST FAIL ${doc.slug}: ${r.status} ${JSON.stringify(d).slice(0,160)}`) }
    }
  }
  console.log(`[pub] renditions: ${rCreated} created, ${rUpdated} updated, ${rSkipped} skipped, ${rFailed} failed`)

  // ── final tally ──
  const pubd = await (await fetch(`${HUB}/api/renditions?where[and][0][site][equals]=${SITE_ID}&where[and][1][status][equals]=published&limit=0`, { headers: H })).json()
  console.log(`[pub] DONE. ${DOMAIN} now has ${pubd.totalDocs} PUBLISHED renditions in the hub.`)
  if (sFailed + rFailed > 0) process.exit(1)
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
