import type { CollectionConfig } from 'payload'
import { publishedOrAuthed, authenticated, adminOnly } from '@/lib/access'

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
    { name: 'site', type: 'relationship', relationTo: 'site-configs', required: true, index: true },
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
    { name: 'canonicalUrl', type: 'text', admin: { description: 'Self-referential canonical URL (this rendition on its own site).' } },
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
}
