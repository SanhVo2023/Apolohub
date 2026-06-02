/**
 * Adds a "Site Explorer" link to the admin nav (registered via
 * admin.components.afterNavLinks). Points at the custom view at /admin/site-explorer.
 */
export function SiteExplorerNavLink() {
  return (
    <a
      href="/admin/site-explorer"
      style={{
        display: 'block',
        padding: '8px 0',
        fontWeight: 600,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      🧭 Site Explorer
    </a>
  )
}

export default SiteExplorerNavLink
