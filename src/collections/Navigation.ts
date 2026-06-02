import type { CollectionConfig } from 'payload'
import { publicRead, authenticated, adminOnly } from '@/lib/access'
import { revalidateAfterChange } from '@/hooks/revalidate'

/**
 * Navigation — per-site header + footer chrome. Configured as a multi-tenant
 * GLOBAL (one doc per site; the plugin adds the `site` field and hides the list
 * view). Replaces the old free-form `site-configs.nav` JSON blob with structured,
 * editable fields. Publicly readable so frontends fetch it unauthenticated.
 */
export const Navigation: CollectionConfig = {
  slug: 'navigation',
  admin: {
    group: 'Site Chrome',
    useAsTitle: 'site',
    description: 'Header + footer for one site.',
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    { name: 'logoUrl', type: 'text', admin: { description: 'R2 CDN URL for the site logo (optional — falls back to text wordmark).' } },
    {
      name: 'headerLinks',
      type: 'array',
      admin: { description: 'Primary header navigation.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
    {
      name: 'headerCta',
      type: 'group',
      admin: { description: 'Optional header call-to-action button.' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ],
    },
    {
      name: 'footerColumns',
      type: 'array',
      admin: { description: 'Footer link columns.' },
      fields: [
        { name: 'heading', type: 'text' },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'footerLegal', type: 'textarea', admin: { description: 'Copyright / legal line shown at the bottom of the footer.' } },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(() => ['/'])],
  },
}
