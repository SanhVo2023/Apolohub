import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { publishedOrAuthed, authenticated, adminOnly } from '@/lib/access'
import { revalidateAfterChange } from '@/hooks/revalidate'

/**
 * Pages — per-site editable feature pages (Home, About, Contact, practice-area
 * landing, or arbitrary custom pages). Tenant-scoped: the multi-tenant plugin
 * adds the `site` relationship field (do NOT declare it here). This is what makes
 * "every feature page is in the CMS" real — frontends render these instead of
 * hardcoded React.
 *
 * Body is markdown (`type: 'code'`, `language: 'markdown'`). SEO plugin owns the
 * `meta.*` fields — do not declare metaTitle/metaDescription here.
 *
 * Access: published pages are PUBLICLY readable (frontends fetch unauthenticated);
 * drafts visible only to logged-in users.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'pageType', 'site', 'slug', 'status'],
    description: 'Per-site feature pages (home / about / contact / landing / custom).',
  },
  access: {
    read: publishedOrAuthed,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  indexes: [{ fields: ['site', 'slug'] }],
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'pageType',
      type: 'select',
      required: true,
      defaultValue: 'custom',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'About', value: 'about' },
        { label: 'Contact', value: 'contact' },
        { label: 'Practice-area landing', value: 'practice-landing' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: { position: 'sidebar', description: 'Drives which template slot / URL the frontend renders this at.' },
    },
    { name: 'slug', type: 'text', required: true, index: true, admin: { description: 'URL segment on the target site (home uses "/").' } },
    {
      name: 'body',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Markdown body. Stored verbatim, rendered by the shared Markdown component.',
      },
    },
    { name: 'heroHeading', type: 'text' },
    { name: 'heroSubheading', type: 'textarea' },
    { name: 'heroImageUrl', type: 'text', admin: { description: 'R2 CDN URL for the hero image.' } },
    { name: 'excerpt', type: 'textarea' },
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
  ],
  hooks: {
    beforeChange: [autoSlug('title')],
    afterChange: [
      revalidateAfterChange((doc) => {
        const slug = String(doc.slug ?? '')
        return [doc.pageType === 'home' ? '/' : `/${slug}`]
      }),
    ],
  },
}
