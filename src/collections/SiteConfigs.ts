import type { CollectionConfig } from 'payload'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Site configs — one row per ecosystem site. Frontends fetch their own config
 * (theme tokens, nav structure, parent-brand locale) by domain. Public-readable
 * so thin frontends can pull it unauthenticated at build/runtime.
 *
 * `parentBrandLocale` drives the linking rule: vi → apolo.com.vn, en → apololawyers.com.
 */
export const SiteConfigs: CollectionConfig = {
  slug: 'site-configs',
  admin: {
    group: 'Configuration',
    useAsTitle: 'domain',
    defaultColumns: ['domain', 'displayName', 'parentBrandLocale', 'phase'],
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'domain', type: 'text', required: true, unique: true, index: true, admin: { description: 'e.g. "luatsudansu.vn".' } },
    { name: 'displayName', type: 'text', required: true },
    {
      name: 'theme',
      type: 'json',
      admin: { description: 'Palette / font tokens consumed by the frontend theme layer.' },
    },
    {
      name: 'nav',
      type: 'json',
      admin: { description: 'Navigation structure (header/footer link tree).' },
    },
    {
      name: 'parentBrandLocale',
      type: 'select',
      required: true,
      defaultValue: 'vi',
      options: [
        { label: 'Vietnamese (→ apolo.com.vn)', value: 'vi' },
        { label: 'English (→ apololawyers.com)', value: 'en' },
      ],
      admin: { position: 'sidebar', description: 'Drives parent-brand cross-linking. vi → apolo.com.vn, en → apololawyers.com.' },
    },
    {
      name: 'coveredPracticeAreas',
      type: 'relationship',
      relationTo: 'practice-areas',
      hasMany: true,
    },
    {
      name: 'coveredTopics',
      type: 'text',
      hasMany: true,
      admin: { description: 'Free-text topic tags this site covers.' },
    },
    { name: 'phase', type: 'number', admin: { position: 'sidebar', description: 'Build phase 1–6.' } },
  ],
}
