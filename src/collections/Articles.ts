import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { authenticated, adminOnly } from '@/lib/access'
import { markRenditionsStale, fanOutEndpoint } from '@/hooks/articles'

/**
 * Articles — the canonical SOURCE content. Write-once master copy, NEVER served
 * publicly. Frontends serve `renditions` (per-site differentiated copies derived
 * from a source article), not these.
 *
 * Body is markdown (Phase 2+ architecture): `type: 'code'` with
 * `language: 'markdown'`. NOT Lexical. See shared-assets/PAYLOAD_SETUP_SPEC.md §1.5.
 *
 * Access: admin/editor only — these are internal masters. No `read: publicRead`.
 */
export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'practiceAreas', 'targetSites', 'locale', 'status'],
    description: 'Canonical SOURCE content. Not served publicly — frontends serve renditions.',
  },
  access: {
    // Admin-only: source masters are internal. No public read.
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'body',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description:
          'Markdown master body. Headings (##), lists (-), links [text](url). 2,500–4,000 words, ≥5 statutory citations, CTA link. Stored verbatim.',
      },
    },
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'vi',
      options: [
        { label: 'Vietnamese', value: 'vi' },
        { label: 'English', value: 'en' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'contentType',
      type: 'select',
      defaultValue: 'article',
      options: [
        { label: 'Article (SEO)', value: 'article' },
        { label: 'Blog', value: 'blog' },
        { label: 'News', value: 'news' },
      ],
      admin: { position: 'sidebar', description: 'Carried onto renditions created via Fan-out.' },
    },
    {
      name: 'practiceAreas',
      type: 'relationship',
      relationTo: 'practice-areas',
      hasMany: true,
    },
    {
      name: 'topicTags',
      type: 'text',
      hasMany: true,
      admin: { description: 'Free-text topic tags.' },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', admin: { description: 'Default archive category (blog / news). Carried onto renditions.' } },
    {
      name: 'targetSites',
      type: 'relationship',
      relationTo: 'site-configs',
      hasMany: true,
      admin: { description: 'Which ecosystem sites should carry this topic (drives rendition fan-out).' },
    },
    { name: 'author', type: 'relationship', relationTo: 'authors' },
    {
      name: 'citations',
      type: 'array',
      admin: { description: 'Statutory / source citations. Government allowlist: *.gov.vn, vbpl.vn.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Ready', value: 'ready' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeChange: [autoSlug('title')],
    afterChange: [markRenditionsStale],
  },
  endpoints: [fanOutEndpoint],
}
