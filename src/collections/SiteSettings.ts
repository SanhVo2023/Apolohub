import type { CollectionConfig } from 'payload'
import { publicRead, authenticated, adminOnly } from '@/lib/access'
import { revalidateAfterChange } from '@/hooks/revalidate'

/**
 * SiteSettings — per-site singletons that aren't navigation: NAP (name / address
 * / phone — consistency across all sites is a major local-SEO signal), analytics
 * IDs, default social-share image, parent-brand info, and the frontend base URL
 * used for on-demand revalidation. Configured as a multi-tenant GLOBAL (one doc
 * per site). Publicly readable.
 *
 * NOTE: the revalidation SECRET is NOT stored here — it lives in the hub's
 * `REVALIDATE_SECRET` env and is shared with each frontend, so nothing secret is
 * ever exposed by the public read of this global.
 */
export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: {
    group: 'Site Chrome',
    useAsTitle: 'site',
    description: 'NAP, analytics, OG image, and frontend URL for one site.',
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'nap',
      type: 'group',
      label: 'NAP (Name / Address / Phone)',
      admin: { description: 'Keep consistent across every site — local-SEO citation signal.' },
      fields: [
        { name: 'legalName', type: 'text' },
        { name: 'address', type: 'textarea' },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'googleAnalyticsId', type: 'text', admin: { description: 'GA4 measurement ID (G-XXXX).' } },
        { name: 'gtmId', type: 'text', admin: { description: 'Google Tag Manager container ID (GTM-XXXX).' } },
      ],
    },
    { name: 'defaultOgImageUrl', type: 'text', admin: { description: 'R2 CDN URL used as the social-share image when a page has none.' } },
    {
      name: 'frontendBaseUrl',
      type: 'text',
      admin: { description: 'Public URL of this site (e.g. https://luatsudansu.vn). Used for on-demand ISR revalidation pings.' },
    },
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
