import type { CollectionBeforeChangeHook } from 'payload'

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/**
 * Auto-populate `slug` from the given source field when slug is empty.
 * If a slug IS provided, normalize it. Drop in via
 * `hooks.beforeChange: [autoSlug('title')]`.
 */
export function autoSlug(sourceField: string): CollectionBeforeChangeHook {
  return async ({ data }) => {
    if (!data) return data
    const incoming = (data as Record<string, unknown>).slug as string | undefined
    const source = (data as Record<string, unknown>)[sourceField] as string | undefined
    if (!incoming || incoming.trim() === '') {
      if (source) (data as Record<string, unknown>).slug = slugify(source)
    } else {
      ;(data as Record<string, unknown>).slug = slugify(incoming)
    }
    return data
  }
}
