import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Glossary — shared boilerplate legal-term definitions. Uses a `locale`
 * discriminator field (vi/en) rather than Payload localization, consistent with
 * the rest of the hub. Public-readable.
 */
export const Glossary: CollectionConfig = {
  slug: 'glossary',
  admin: {
    group: 'Shared Library',
    useAsTitle: 'term',
    defaultColumns: ['term', 'slug', 'locale'],
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'term', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'definition',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Markdown definition.',
      },
    },
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
  ],
  hooks: {
    beforeChange: [autoSlug('term')],
  },
}
