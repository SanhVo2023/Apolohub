import type { CollectionConfig } from 'payload'
import { publicRead } from '@/lib/access'

/**
 * Media — standard Payload upload collection. Also carries `externalUrl` for
 * R2-hosted images that are referenced by URL rather than uploaded through Payload
 * (the ecosystem's canonical image host is the R2 CDN). Either upload a file OR
 * paste an `externalUrl`.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Shared Library' },
  access: { read: publicRead },
  upload: {
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
    {
      name: 'externalUrl',
      type: 'text',
      admin: {
        description:
          'R2 CDN URL for an externally-hosted image referenced by URL (no file upload). Frontends use this directly.',
      },
    },
    {
      name: 'credit',
      type: 'text',
      admin: {
        description: 'Internal note about origin (e.g., "Nano Banana 2 generated"). Not displayed publicly.',
      },
    },
  ],
}
