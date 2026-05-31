import type { Access } from 'payload'

/** Anyone (including unauthenticated frontends) may read. */
export const publicRead: Access = () => true

/** Authenticated users only (any role). */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

/** Admin role only. */
export const adminOnly: Access = ({ req: { user } }) => user?.role === 'admin'

/**
 * Logged-in users see everything; the public sees only `published` docs.
 * Used for renditions / site-configs / boilerplate that frontends fetch unauthenticated.
 */
export const publishedOrAuthed: Access = ({ req: { user } }) => {
  if (user) return true
  return { status: { equals: 'published' } }
}
