// Pass-through root layout. The <html>/<body> chrome is provided by:
//   - src/app/(frontend)/layout.tsx — the thin status page
//   - src/app/(payload)/layout.tsx  — Payload admin (its own isolated styling)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
