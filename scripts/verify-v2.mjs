#!/usr/bin/env node
/**
 * Smoke-verify the multi-tenant v2 write/read/tenant path against a running hub
 * (default http://localhost:3001). Non-destructive: creates a temp Navigation
 * doc for the first tenant, reads it back UNAUTHENTICATED (proving public read +
 * tenant filter), then deletes it. Reads the admin password at runtime from
 * PM_CREDENTIALS.md (never inlined).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const HUB = process.env.HUB_API_URL || 'http://localhost:3001'
const EMAIL = 'matvietdesignteam@gmail.com'
const ok = (b) => (b ? 'PASS' : 'FAIL')
let failures = 0
const check = (name, cond) => {
  console.log(`  [${ok(cond)}] ${name}`)
  if (!cond) failures++
}

const cred = fs.readFileSync(path.join(ROOT, 'PM_CREDENTIALS.md'), 'utf8')
const pw = (cred.match(/Content Hub[^\n|]*\|\s*matvietdesignteam@gmail\.com\s*\|\s*`([^`]+)`/) || [])[1]
if (!pw) throw new Error('hub password not found in PM_CREDENTIALS.md')

const tok = (await (await fetch(`${HUB}/api/users/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: pw }),
})).json()).token
check('admin login', Boolean(tok))
const H = { 'Content-Type': 'application/json', Authorization: `JWT ${tok}` }

// first tenant
const sites = await (await fetch(`${HUB}/api/site-configs?limit=1&depth=0`, { headers: H })).json()
const site = sites.docs?.[0]
check('tenant (site-configs) exists', Boolean(site))
console.log(`     using tenant: ${site?.domain} (id ${site?.id})`)

// create navigation for that tenant
const created = await (await fetch(`${HUB}/api/navigation`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ site: site.id, footerLegal: '__v2_verify__', headerLinks: [{ label: 'Home', href: '/' }] }),
}).then((r) => r.json()))
const navId = created?.doc?.id
check('create navigation (tenant write)', Boolean(navId))

// public unauth read, filtered by tenant domain
const pub = await (await fetch(`${HUB}/api/navigation?where[site.domain][equals]=${encodeURIComponent(site.domain)}&depth=1`)).json()
check('navigation readable UNAUTH + tenant-filtered', pub.docs?.some((d) => d.id === navId))

// new collections list endpoints respond
for (const c of ['pages', 'site-settings', 'categories']) {
  const r = await fetch(`${HUB}/api/${c}?limit=0`)
  check(`GET /api/${c} (public)`, r.ok)
}

// fan-out endpoint is registered + auth-gated
const fo = await fetch(`${HUB}/api/articles/1/fan-out`, { method: 'POST' })
check('fan-out endpoint registered + auth-gated (401)', fo.status === 401)

// cleanup
if (navId) {
  const del = await fetch(`${HUB}/api/navigation/${navId}`, { method: 'DELETE', headers: H })
  check('cleanup temp navigation', del.ok)
}

console.log(failures === 0 ? '\n[verify-v2] ALL PASS' : `\n[verify-v2] ${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
