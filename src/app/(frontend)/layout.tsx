import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Apolo Content Hub',
  description: 'Centralized CMS for the Apolo Legal Ecosystem.',
  robots: { index: false, follow: false },
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
