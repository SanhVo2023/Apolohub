import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Categories — SHARED taxonomy for blog / news listings. Not tenant-scoped:
 * the same category (e.g. "Tin pháp luật") can be reused across sites. Frontends
 * read these unauthenticated to build archive pages.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Taxonomy',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'locale'],
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true, admin: { description: 'URL segment (auto from name if blank).' } },
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
    { name: 'description', type: 'textarea' },
  ],
  hooks: { beforeChange: [autoSlug('name')] },
}
