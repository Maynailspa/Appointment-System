// app/(kiosk)/layout.tsx
export default function KioskRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ minHeight: '100vh', overflow: 'hidden' }}>{children}</div>
      </body>
    </html>
  )
}