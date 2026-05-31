import dns from 'node:dns'

// IPv4 first — Supabase resolves to IPv6 on some networks. Must run before any DB connection.
dns.setDefaultResultOrder('ipv4first')

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Authors } from './collections/Authors'
import { PracticeAreas } from './collections/PracticeAreas'
import { Glossary } from './collections/Glossary'
import { Disclaimers } from './collections/Disclaimers'
import { SiteConfigs } from './collections/SiteConfigs'
import { Articles } from './collections/Articles'
import { Renditions } from './collections/Renditions'
import { ContactSubmissions } from './collections/ContactSubmissions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === 'replace-with-32-plus-random-chars') {
  throw new Error('PAYLOAD_SECRET env var must be set to a real random 32+ char string')
}
if (!process.env.DATABASE_URI) {
  throw new Error('DATABASE_URI env var must be set (Supabase Session Pooler URI)')
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  secret: process.env.PAYLOAD_SECRET,

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' — Apolo Content Hub',
    },
  },

  collections: [
    Users,
    Media,
    Authors,
    PracticeAreas,
    Glossary,
    Disclaimers,
    SiteConfigs,
    Articles,
    Renditions,
    ContactSubmissions,
  ],

  // No top-level `editor:` block — markdown architecture, no richText fields.
  // See shared-assets/PAYLOAD_SETUP_SPEC.md §1.5.

  db: postgresAdapter({
    push: process.env.NODE_ENV !== 'production',
    schemaName: 'hub',
    pool: {
      connectionString: process.env.DATABASE_URI,
      max: 10,
    },
  }),

  plugins: [
    seoPlugin({
      collections: ['renditions'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        const title = typeof doc?.title === 'string' ? doc.title : 'Apolo'
        return `${title} | Apolo Lawyers`
      },
      generateDescription: ({ doc }) => (typeof doc?.excerpt === 'string' ? doc.excerpt : ''),
    }),
  ],

  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  sharp,
})
