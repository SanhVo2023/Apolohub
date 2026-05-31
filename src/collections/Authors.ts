import type { CollectionConfig } from 'payload'
import { autoSlug } from '@/hooks/auto-slug'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Authors. Canonical default: "Apolo Editorial Team" (slug `editorial-team`)
 * per Mr Hien's Issue 10 ruling — AI-drafted SEO content must NOT credit
 * individual lawyers who didn't personally author it. Public-readable (bylines
 * appear on frontends).
 */
export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    group: 'Shared Library',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'role'],
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
    { name: 'role', type: 'text', admin: { description: 'e.g., "Luật sư Điều hành", "Apolo Editorial Team".' } },
    {
      name: 'bio',
      type: 'code',
      admin: {
        language: 'markdown',
        editorOptions: { wordWrap: 'on', lineNumbers: 'off', fontSize: 14 },
        description: 'Markdown bio.',
      },
    },
    { name: 'photoUrl', type: 'text', admin: { description: 'R2 CDN URL for the author photo.' } },
  ],
  hooks: {
    beforeChange: [autoSlug('name')],
  },
}
