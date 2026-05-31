# Apolo Content Hub — API Contract

The hub is a **headless PayloadCMS** app. The 21 ecosystem site frontends are thin
HTTP clients that fetch from these REST endpoints. This document is the canonical
contract for those frontends.

- **Base URL (dev)**: `http://localhost:3001`
- **Base URL (prod)**: set per deploy; frontends read it from their own `HUB_API_URL` env.
- **Format**: Payload v3 REST API. JSON in/out. Standard Payload query operators apply
  (`where`, `depth`, `limit`, `page`, `sort`, `locale` is NOT used — see "Localization" below).
- **Auth**: Most read endpoints are **public** (no token). Source content and PII are gated.
  See the access matrix at the bottom.

> URL encoding note: bracketed query params (`where[x][equals]=y`) must be URL-encoded in
> real requests (`where%5Bx%5D%5Bequals%5D=y`). They are shown unencoded here for readability.

---

## Standard list response shape

Every collection `GET` (list) returns:

```json
{
  "docs": [ /* array of documents */ ],
  "totalDocs": 1,
  "limit": 10,
  "totalPages": 1,
  "page": 1,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": false,
  "prevPage": null,
  "nextPage": null
}
```

A single document fetched by ID (`GET /api/{collection}/{id}`) returns the document object directly.

---

## Localization

The hub does **not** use Payload's `?locale=` mechanism. Instead, content collections carry an
explicit `locale` discriminator field (`"vi"` | `"en"`). Filter on it:

```
GET /api/glossary?where[locale][equals]=vi
```

`renditions` and `articles` inherit their language from their source/site context; `site-configs`
expose `parentBrandLocale` which drives parent-brand cross-linking (`vi` → apolo.com.vn,
`en` → apololawyers.com).

---

## Renditions — the primary content endpoint (PUBLIC read)

Renditions are the **per-site differentiated articles** frontends serve. Drafts are hidden from
unauthenticated callers; only `status: "published"` is returned publicly.

### List a site's published renditions

```
GET /api/renditions?where[site.domain][equals]={DOMAIN}&where[status][equals]=published&depth=1
```

`depth=1` populates the `site` and `source` relationships one level deep (so `site.domain` is present).

Example doc shape (fields a frontend consumes):

```json
{
  "id": 1,
  "title": "Điều kiện có hiệu lực của giao dịch dân sự",
  "slug": "dieu-kien-hieu-luc-giao-dich-dan-su",
  "body": "## Tranh chấp hợp đồng dân sự …",      // markdown string (render with react-markdown)
  "excerpt": "Bản dựng cho luatsudansu.vn: …",
  "heroImageUrl": "https://pub-….r2.dev/luatsudansu.vn/hero/giao-dich-dan-su.webp",
  "canonicalUrl": "https://luatsudansu.vn/dieu-kien-hieu-luc-giao-dich-dan-su",
  "status": "published",
  "site": { "id": 1, "domain": "luatsudansu.vn", "displayName": "Luật sư Dân sự", … },
  "source": { "id": 1, "title": "…", "slug": "…" },
  "meta": { "title": null, "description": null, "image": null },   // SEO plugin — see note
  "createdAt": "…",
  "updatedAt": "…"
}
```

**SEO meta**: `@payloadcms/plugin-seo` owns `meta.title` / `meta.description` / `meta.image`
on renditions. Populate them in /admin; frontends read `doc.meta.*` for `<title>`/meta tags.
Do not expect top-level `metaTitle`/`metaDescription` — they live under `meta`.

**Body is markdown** (a plain string), NOT Lexical JSON. Render with `react-markdown` + `remark-gfm`
(+ `rehype-slug`, `rehype-autolink-headings`), the same renderer the Phase 2+ sites use.

### Fetch a single rendition (site + slug)

```
GET /api/renditions?where[and][0][site.domain][equals]={DOMAIN}&where[and][1][slug][equals]={SLUG}&depth=1
```

Returns a list with `totalDocs: 1`; take `docs[0]`. (There is an index on `(site, slug)`.)

---

## Site configs (PUBLIC read)

```
GET /api/site-configs?where[domain][equals]={DOMAIN}&depth=1
```

Doc shape:

```json
{
  "id": 1,
  "domain": "luatsudansu.vn",
  "displayName": "Luật sư Dân sự",
  "theme": { "primary": "#8B4513", "font": "Be Vietnam Pro" },   // JSON token bag
  "nav": { "header": ["/", "/ve-chung-toi", "/lien-he"] },        // JSON nav tree
  "parentBrandLocale": "vi",                                       // "vi" → apolo.com.vn, "en" → apololawyers.com
  "coveredPracticeAreas": [ { "id": 1, "name": "Luật Dân sự", "slug": "dan-su", … } ],
  "coveredTopics": ["tranh chấp hợp đồng", "đòi nợ"],
  "phase": 3
}
```

---

## Shared boilerplate (PUBLIC read)

```
GET /api/practice-areas?sort=order
GET /api/practice-areas?where[slug][equals]={SLUG}
GET /api/glossary?where[locale][equals]=vi
GET /api/glossary?where[slug][equals]={SLUG}&where[locale][equals]=vi
GET /api/disclaimers?where[key][equals]=general&where[locale][equals]=vi
GET /api/authors?where[slug][equals]=editorial-team
```

- **practice-areas**: `{ name, slug, definition (markdown), order }`
- **glossary**: `{ term, slug, definition (markdown), locale }`
- **disclaimers**: `{ key, body (markdown), locale }`
- **authors**: `{ name, slug, role, bio (markdown), photoUrl }`

All `definition` / `body` / `bio` fields are markdown strings.

---

## Media (PUBLIC read)

```
GET /api/media/{id}
```

Standard Payload upload doc (`url`, `sizes.{thumbnail|card|hero|og}.url`, `alt`, `caption`).
Also carries `externalUrl` for R2-hosted images referenced by URL instead of uploaded —
frontends should prefer `externalUrl` when present, else use `url`/`sizes`.

---

## Contact submissions

### POST (PUBLIC — any site's contact form submits here)

```
POST /api/contact-submissions
Content-Type: application/json

{
  "site":   "<site-config-id>",     // optional relationship id of the originating site
  "name":   "Nguyễn Văn A",          // required
  "email":  "a@example.com",         // required
  "phone":  "0900000000",            // optional
  "message":"Tôi cần tư vấn."        // required
}
```

Response: `{ "doc": { "id": 1, "name": "…", "status": "new", "submittedAt": "…" }, … }`.
`status` defaults to `"new"`; `submittedAt` is auto-set.

### GET (ADMIN-ONLY)

Reading submissions requires an authenticated user (PII). Unauthenticated `GET` → `403`.

---

## Articles (ADMIN-ONLY — never served publicly)

`articles` are the canonical **source masters**. They are NOT public. Unauthenticated
`GET /api/articles` → `403`. Frontends must serve `renditions`, never `articles`.

---

## Authentication (for the admin app / privileged scripts only)

```
POST /api/users/login        { "email": "...", "password": "..." }  → { "token": "...", "user": {…} }
```

Send `Authorization: JWT {token}` on privileged requests. Frontends do NOT authenticate —
they only hit the public-read endpoints above.

---

## Access matrix (enforced via collection `access.read` / `access.create`)

| Collection            | Public read                          | Public create | Notes |
|-----------------------|--------------------------------------|---------------|-------|
| `renditions`          | ✅ `status: published` only          | ❌            | What frontends serve. SEO plugin → `meta.*`. |
| `site-configs`        | ✅                                   | ❌            | Theme/nav/parent-brand per site. |
| `practice-areas`      | ✅                                   | ❌            | Shared taxonomy. |
| `glossary`            | ✅                                   | ❌            | Shared boilerplate. |
| `disclaimers`         | ✅                                   | ❌            | Shared boilerplate. |
| `authors`             | ✅                                   | ❌            | Bylines. |
| `media`               | ✅                                   | ❌            | Uploads + R2 `externalUrl`. |
| `articles`            | ❌ (authenticated only)              | ❌            | Source masters — internal. |
| `contact-submissions` | ❌ (authenticated only)              | ✅            | PII. Sites POST; admins read. |
| `users`               | ❌ (auth)                            | n/a           | CMS operators. |

"Public create ❌" means writes require an authenticated CMS user; performed in /admin or via
authenticated scripts, not by frontends.
