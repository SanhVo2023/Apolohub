import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Practice areas — shared taxonomy across the ecosystem. `definition` is the
 * canonical markdown blurb shared verbatim across sites. Public-readable.
 */
export const PracticeAreas: CollectionConfig = {
  slug: 'practice-areas',
  admin: {
    group: 'Shared Library',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'definition',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Canonical markdown definition, shared verbatim across sites.',
      },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
  hooks: {
    beforeChange: [autoSlug('name')],
  },
}
