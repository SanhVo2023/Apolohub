import type { CollectionConfig } from 'payload'
import { publicRead, authenticated, adminOnly } from '@/lib/access'

/**
 * Contact submissions — aggregated from all ecosystem sites. Sites POST here
 * (create is public so unauthenticated frontends can submit). Reads are
 * admin-only — submissions contain PII.
 */
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    group: 'Configuration',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'site', 'submittedAt'],
  },
  access: {
    create: publicRead, // public POST from any site's contact form
    read: authenticated, // PII — logged-in only (admins see all)
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'site', type: 'relationship', relationTo: 'site-configs', admin: { description: 'Originating site.' } },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'submittedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewed', value: 'reviewed' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
