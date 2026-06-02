import dns from 'node:dns'

// IPv4 first — Supabase resolves to IPv6 on some networks. Must run before any DB connection.
dns.setDefaultResultOrder('ipv4first')

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Authors } from './collections/Authors'
import { PracticeAreas } from './collections/PracticeAreas'
import { Glossary } from './collections/Glossary'
import { Disclaimers } from './collections/Disclaimers'
import { Categories } from './collections/Categories'
import { SiteConfigs } from './collections/SiteConfigs'
import { Articles } from './collections/Articles'
import { Renditions } from './collections/Renditions'
import { Pages } from './collections/Pages'
import { Navigation } from './collections/Navigation'
import { SiteSettings } from './collections/SiteSettings'
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
    components: {
      // Custom "Site Explorer" view — everything for one site in one pane.
      views: {
        siteExplorer: {
          Component: '@/components/SiteExplorer#SiteExplorer',
          path: '/site-explorer',
        },
      },
      afterNavLinks: ['@/components/SiteExplorerNavLink#SiteExplorerNavLink'],
    },
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
    Categories,
    SiteConfigs, // ← tenants collection (one row per ecosystem site)
    Articles,
    Renditions,
    Pages,
    Navigation, // per-site global (1 doc / site)
    SiteSettings, // per-site global (1 doc / site)
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
      collections: ['renditions', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        const title = typeof doc?.title === 'string' ? doc.title : 'Apolo'
        return `${title} | Apolo Lawyers`
      },
      generateDescription: ({ doc }) => (typeof doc?.excerpt === 'string' ? doc.excerpt : ''),
    }),

    // Multi-tenant: each ecosystem site is a tenant. site-configs IS the tenants
    // collection; the plugin adds the `site` relationship to tenant-enabled
    // collections (same name as the old manual Renditions.site → data preserved)
    // and a site selector to the admin. Admins (Mr Hien) see every tenant.
    //
    // Tenant-enabled collections set useTenantAccess:false so PUBLIC, unauthenticated
    // frontend reads keep working (access stays governed by publicRead /
    // publishedOrAuthed). The admin list view is still scoped by the selector via
    // the default baseListFilter.
    multiTenantPlugin({
      tenantsSlug: 'site-configs',
      tenantField: { name: 'site', access: { read: () => true } },
      useTenantsCollectionAccess: false,
      useTenantsListFilter: false,
      userHasAccessToAllTenants: (user) => Boolean(user) && user?.role === 'admin',
      collections: {
        renditions: { useTenantAccess: false },
        pages: { useTenantAccess: false },
        navigation: { isGlobal: true, useTenantAccess: false },
        'site-settings': { isGlobal: true, useTenantAccess: false },
      },
    }),

    // Media storage → Cloudflare R2 (S3-compatible). Replaces the Supabase bucket.
    // Disabled automatically if R2 env is absent (local dev without creds).
    s3Storage({
      enabled: Boolean(process.env.R2_BUCKET),
      collections: {
        media: {
          disablePayloadAccessControl: true,
          prefix: 'hub/media',
          generateFileURL: ({ filename, prefix }) =>
            `${process.env.R2_PUBLIC_URL}/${prefix ? `${prefix}/` : ''}${filename}`,
        },
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
      },
    }),
  ],

  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  sharp,
})
