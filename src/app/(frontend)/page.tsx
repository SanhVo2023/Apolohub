export const dynamic = 'force-dynamic'

/**
 * The hub has no public frontend of its own — it is a headless CMS. This is a
 * minimal status page. Real content lives behind /admin and /api/*.
 */
export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Apolo Content Hub</h1>
      <p>Centralized CMS for the Apolo Legal Ecosystem. This app is headless.</p>
      <ul>
        <li>
          <a href="/admin">/admin</a> — content management
        </li>
        <li>
          <a href="/api/renditions?where[status][equals]=published&depth=1">/api/*</a> — REST API consumed by site frontends (see API_CONTRACT.md)
        </li>
      </ul>
    </main>
  )
}
