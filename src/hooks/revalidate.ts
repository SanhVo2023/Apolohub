import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * On-demand ISR revalidation. After a tenant-scoped doc changes, fire-and-forget
 * POST the affected site's frontend `/api/revalidate` so edits appear within
 * seconds instead of waiting out the 1-hour ISR window (or a manual rebuild).
 *
 * The frontend base URL lives on that site's `site-settings.frontendBaseUrl`;
 * the shared secret comes from `process.env.REVALIDATE_SECRET` (never stored in
 * the CMS, never exposed to public reads). If the frontend is not yet deployed
 * (build-phase sites), the POST simply fails silently — harmless.
 *
 * `getPaths(doc)` returns the Next.js paths to revalidate for that doc.
 */
function tenantId(doc: unknown): number | string | null {
  const site = (doc as { site?: unknown })?.site
  if (site == null) return null
  if (typeof site === 'object') return (site as { id?: number | string }).id ?? null
  return site as number | string
}

async function ping(req: { payload: { find: Function; logger?: { warn?: Function } } }, siteId: number | string, paths: string[]) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) return
  const settings = await req.payload.find({
    collection: 'site-settings',
    where: { site: { equals: siteId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const base: string | undefined = settings?.docs?.[0]?.frontendBaseUrl
  if (!base) return
  const root = base.replace(/\/$/, '')
  await Promise.all(
    paths.map((p) =>
      fetch(`${root}/api/revalidate?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(p)}`, {
        method: 'POST',
      }).catch(() => {}),
    ),
  )
}

export function revalidateAfterChange(getPaths: (doc: Record<string, unknown>) => string[]): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    try {
      const siteId = tenantId(doc)
      if (siteId != null) await ping(req as never, siteId, getPaths(doc as Record<string, unknown>))
    } catch {
      /* fire-and-forget — never block the save */
    }
    return doc
  }
}

export function revalidateAfterDelete(getPaths: (doc: Record<string, unknown>) => string[]): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    try {
      const siteId = tenantId(doc)
      if (siteId != null) await ping(req as never, siteId, getPaths(doc as Record<string, unknown>))
    } catch {
      /* ignore */
    }
    return doc
  }
}
