import type { CollectionConfig } from 'payload'

/**
 * Hub CMS operators. Auth-enabled. `admin` role gates write access to source
 * content (articles) and read access to contact submissions; `editor` can
 * manage renditions and boilerplate.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    group: 'Configuration',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
