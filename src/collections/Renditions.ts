import type { CollectionConfig } from 'payload'
import { publishedOrAuthed, authenticated, adminOnly } from '@/lib/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

/**
 * Renditions — per-site DIFFERENTIATED article. This is what frontends actually
 * serve. Each rendition derives from a source `article` but carries its own
 * differentiated intro/examples/CTA, slug, hero image, and self-referential
 * canonical URL for one specific site.
 *
 * Body is markdown (`type: 'code'`, `language: 'markdown'`). NOT Lexical.
 *
 * SEO plugin is enabled on this collection (registered in payload.config.ts) and
 * OWNS metaTitle / metaDescription / metaImage — do NOT declare those fields here
 * (duplicate-column 500, SITE_BUILD_FEEDBACK gotcha).
 *
 * Access: published renditions are PUBLICLY readable (frontends fetch
 * unauthenticated); drafts visible only to logged-in users.
 */
export const Renditions: CollectionConfig = {
  slug: 'renditions',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'site', 'slug', 'status'],
    description: 'Per-site differentiated copy served to frontends.',
  },
  access: {
    read: publishedOrAuthed,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  indexes: [
    { fields: ['site', 'slug'] },
  ],
  fields: [
    { name: 'source', type: 'relationship', relationTo: 'articles', admin: { description: 'Source master article this rendition derives from.' } },
    // The `site` relationship (→ site-configs) is added automatically by the
    // multi-tenant plugin (tenantField.name = 'site'). Do NOT declare it here.
    {
      name: 'contentType',
      type: 'select',
      defaultValue: 'article',
      options: [
        { label: 'Article (SEO)', value: 'article' },
        { label: 'Blog', value: 'blog' },
        { label: 'News', value: 'news' },
      ],
      admin: { position: 'sidebar', description: 'Drives which listing/archive + URL prefix the frontend renders this under.' },
    },
    { name: 'slug', type: 'text', required: true, index: true, admin: { description: 'URL segment on the target site.' } },
    { name: 'title', type: 'text', required: true },
    {
      name: 'body',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Differentiated markdown body (site-specific intro / examples / CTA). Stored verbatim.',
      },
    },
    { name: 'heroImageUrl', type: 'text', admin: { description: 'R2 CDN URL for the hero image.' } },
    { name: 'excerpt', type: 'textarea' },
    { name: 'category', type: 'relationship', relationTo: 'categories', admin: { description: 'Archive category (blog / news listings).' } },
    { name: 'tags', type: 'text', hasMany: true, admin: { description: 'Free-text tags.' } },
    { name: 'canonicalUrl', type: 'text', admin: { description: 'Self-referential canonical URL — or, for syndicated blog/news, the primary site’s URL (avoids duplicate-content cannibalization).' } },
    {
      name: 'stale',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Auto-set when the source article changes after this rendition. Cleared when you re-save this rendition.',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    // metaTitle / metaDescription / metaImage added by @payloadcms/plugin-seo.
    // Do NOT declare them here — duplicate columns cause a Postgres 500.
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // A human content edit (body changed) makes the rendition fresh again.
        // The source-staleness marker updates only { stale: true } with no body,
        // so it is left untouched — no clear/set ping-pong.
        if (data && originalDoc && data.body !== undefined && data.body !== originalDoc.body) {
          data.stale = false
        }
        return data
      },
    ],
    afterChange: [
      revalidateAfterChange((doc) => {
        const slug = String(doc.slug ?? '')
        const listing = doc.contentType === 'blog' ? '/blog' : doc.contentType === 'news' ? '/tin-tuc' : null
        return listing ? [`/${slug}`, listing] : [`/${slug}`]
      }),
    ],
    afterDelete: [revalidateAfterDelete((doc) => [`/${String(doc.slug ?? '')}`])],
  },
}
