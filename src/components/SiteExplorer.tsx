import type { AdminViewServerProps } from 'payload'
import { cookies } from 'next/headers'

/**
 * Site Explorer — a custom admin view that shows EVERYTHING for the currently
 * selected site in one pane: its pages, its renditions (with a stale badge), and
 * its images. Switch sites with the tenant selector in the top admin nav; this
 * view reads that selection (the `payload-tenant` cookie set by the multi-tenant
 * plugin).
 *
 * Registered in payload.config.ts under admin.components.views.siteExplorer
 * (path /site-explorer) and linked via afterNavLinks.
 */

const ADMIN = '/admin'

const card: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '16px 20px',
  marginBottom: 24,
  background: 'var(--theme-elevation-0)',
}
const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid var(--theme-elevation-100)',
  textDecoration: 'none',
  color: 'inherit',
}
const badge = (bg: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  background: bg,
  color: '#fff',
  whiteSpace: 'nowrap',
})

const statusColor = (s?: string) =>
  s === 'published' ? '#1F8A4C' : s === 'archived' ? '#888' : '#C77700'

export async function SiteExplorer(props: AdminViewServerProps) {
  const payload = props.initPageResult?.req?.payload
  if (!payload) return <div style={{ padding: 32 }}>Payload unavailable.</div>

  const tenantId = (await cookies()).get('payload-tenant')?.value

  const sites = await payload.find({ collection: 'site-configs', limit: 200, depth: 0, sort: 'domain' })
  const current = tenantId ? sites.docs.find((s) => String(s.id) === String(tenantId)) : undefined

  if (!current) {
    return (
      <div style={{ padding: 32, maxWidth: 760 }}>
        <h1 style={{ marginBottom: 8 }}>Site Explorer</h1>
        <p style={{ color: 'var(--theme-elevation-600)' }}>
          Pick a site from the selector in the top navigation to see all of its pages, articles, and images here.
        </p>
        <p style={{ marginTop: 16, color: 'var(--theme-elevation-500)' }}>
          {sites.totalDocs} site{sites.totalDocs === 1 ? '' : 's'} in the hub.
        </p>
      </div>
    )
  }

  const [renditions, pages, media] = await Promise.all([
    payload.find({
      collection: 'renditions',
      where: { site: { equals: current.id } },
      limit: 500,
      depth: 0,
      sort: '-updatedAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pages',
      where: { site: { equals: current.id } },
      limit: 200,
      depth: 0,
      sort: 'pageType',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'media',
      where: { or: [{ sites: { in: [current.id] } }, { isShared: { equals: true } }] },
      limit: 200,
      depth: 0,
      sort: '-updatedAt',
      overrideAccess: true,
    }),
  ])

  const staleCount = renditions.docs.filter((d) => (d as { stale?: boolean }).stale).length

  return (
    <div style={{ padding: 32, maxWidth: 980 }}>
      <h1 style={{ marginBottom: 4 }}>Site Explorer</h1>
      <p style={{ color: 'var(--theme-elevation-600)', marginBottom: 24 }}>
        <strong>{(current as { displayName?: string }).displayName || current.domain}</strong> · {current.domain}
      </p>

      {/* PAGES */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Pages · {pages.totalDocs}</h2>
        {pages.docs.length === 0 && <p style={{ color: 'var(--theme-elevation-500)' }}>No pages yet.</p>}
        {pages.docs.map((p) => {
          const d = p as { id: number | string; title?: string; pageType?: string; slug?: string; status?: string }
          return (
            <a key={String(d.id)} href={`${ADMIN}/collections/pages/${d.id}`} style={row}>
              <span>
                <strong>{d.title || '(untitled)'}</strong>{' '}
                <span style={{ color: 'var(--theme-elevation-500)' }}>· {d.pageType} · /{d.slug}</span>
              </span>
              <span style={badge(statusColor(d.status))}>{d.status}</span>
            </a>
          )
        })}
      </section>

      {/* RENDITIONS */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>
          Articles &amp; Renditions · {renditions.totalDocs}
          {staleCount > 0 && <span style={{ ...badge('#C0392B'), marginLeft: 10 }}>{staleCount} stale</span>}
        </h2>
        {renditions.docs.length === 0 && <p style={{ color: 'var(--theme-elevation-500)' }}>No content yet.</p>}
        {renditions.docs.map((r) => {
          const d = r as {
            id: number | string
            title?: string
            slug?: string
            status?: string
            stale?: boolean
            contentType?: string
          }
          return (
            <a key={String(d.id)} href={`${ADMIN}/collections/renditions/${d.id}`} style={row}>
              <span>
                <strong>{d.title || '(untitled)'}</strong>{' '}
                <span style={{ color: 'var(--theme-elevation-500)' }}>· {d.contentType || 'article'} · /{d.slug}</span>
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                {d.stale && <span style={badge('#C0392B')}>stale</span>}
                <span style={badge(statusColor(d.status))}>{d.status}</span>
              </span>
            </a>
          )
        })}
      </section>

      {/* IMAGES */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Images · {media.totalDocs}</h2>
        {media.docs.length === 0 && <p style={{ color: 'var(--theme-elevation-500)' }}>No images.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
          {media.docs.map((m) => {
            const d = m as { id: number | string; url?: string; externalUrl?: string; alt?: string; isShared?: boolean }
            const src = d.externalUrl || d.url
            return (
              <a
                key={String(d.id)}
                href={`${ADMIN}/collections/media/${d.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                title={d.alt}
              >
                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: 'var(--theme-elevation-100)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {src ? (
                    <img src={src} alt={d.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>no preview</span>
                  )}
                </div>
                <div style={{ fontSize: 11, marginTop: 4, color: 'var(--theme-elevation-600)' }}>
                  {d.alt || '(no alt)'} {d.isShared ? '· shared' : ''}
                </div>
              </a>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default SiteExplorer
