import type { CollectionConfig } from 'payload'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Disclaimers — shared boilerplate legal disclaimers keyed by a stable `key`
 * (e.g. "general", "no-attorney-client"). Frontends fetch by key + locale.
 * Public-readable.
 */
export const Disclaimers: CollectionConfig = {
  slug: 'disclaimers',
  admin: {
    group: 'Shared Library',
    useAsTitle: 'key',
    defaultColumns: ['key', 'locale'],
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true, admin: { description: 'Stable lookup key, e.g. "general", "no-attorney-client".' } },
    {
      name: 'body',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Markdown disclaimer body.',
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
}
