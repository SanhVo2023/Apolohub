import type { CollectionAfterChangeHook, Endpoint, PayloadRequest } from 'payload'

/**
 * When a source article's body changes, flag every rendition derived from it as
 * `stale` so the editor knows to refresh the per-site copies. Cleared when a
 * rendition is re-saved with a content edit (see Renditions beforeChange).
 */
export const markRenditionsStale: CollectionAfterChangeHook = async ({ doc, previousDoc, req, operation }) => {
  try {
    if (operation !== 'update') return doc
    if (previousDoc && doc.body === previousDoc.body) return doc
    await req.payload.update({
      collection: 'renditions',
      where: { source: { equals: doc.id } },
      data: { stale: true },
      overrideAccess: true,
    })
  } catch {
    /* non-fatal */
  }
  return doc
}

/**
 * Fan-out: create one DRAFT rendition per ticked `targetSites` from a source
 * article. POST /api/articles/:id/fan-out  body: { mode: 'differentiate' | 'syndicate' }
 *
 * - differentiate (default): rendition is self-canonical; intended to be edited
 *   into a site-specific variant (the SEO money-page model).
 * - syndicate: verbatim body, canonical → the PRIMARY site (first targetSite),
 *   which keeps blog/news syndication duplicate-content-safe without rewriting.
 *
 * Existing (site, slug) renditions are skipped — idempotent and safe to re-run.
 */
export const fanOutEndpoint: Endpoint = {
  path: '/:id/fan-out',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const id = (req.routeParams?.id as string) ?? ''
    let mode = 'differentiate'
    try {
      const body = typeof req.json === 'function' ? await req.json() : undefined
      if (body?.mode === 'syndicate') mode = 'syndicate'
    } catch {
      /* no body */
    }

    const article = await req.payload.findByID({ collection: 'articles', id, depth: 0 }).catch(() => null)
    if (!article) return Response.json({ error: 'article not found' }, { status: 404 })

    const rawTargets = (article as Record<string, unknown>).targetSites
    const siteIds = (Array.isArray(rawTargets) ? rawTargets : []) as (number | string)[]
    if (!siteIds.length) return Response.json({ error: 'article has no targetSites' }, { status: 400 })

    const sites = await req.payload.find({
      collection: 'site-configs',
      where: { id: { in: siteIds } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    const domainById = new Map(sites.docs.map((s: { id: number | string; domain?: string }) => [String(s.id), s.domain]))
    const primaryDomain = domainById.get(String(siteIds[0]))

    const a = article as unknown as {
      id: number | string
      slug: string
      title: string
      body?: string
      excerpt?: string
      contentType?: string
    }
    let created = 0
    let skipped = 0
    for (const sid of siteIds) {
      const existing = await req.payload.find({
        collection: 'renditions',
        where: { and: [{ site: { equals: sid } }, { slug: { equals: a.slug } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) {
        skipped++
        continue
      }
      const domain = domainById.get(String(sid))
      const canonical =
        mode === 'syndicate' && primaryDomain ? `https://${primaryDomain}/${a.slug}` : `https://${domain}/${a.slug}`
      await req.payload.create({
        collection: 'renditions',
        data: {
          source: a.id,
          site: sid,
          slug: a.slug,
          title: a.title,
          body: a.body ?? '',
          excerpt: a.excerpt ?? '',
          contentType: a.contentType ?? 'article',
          canonicalUrl: canonical,
          status: 'draft',
          stale: false,
        },
        overrideAccess: true,
      })
      created++
    }
    return Response.json({ ok: true, mode, created, skipped, targetSites: siteIds.length })
  },
}
