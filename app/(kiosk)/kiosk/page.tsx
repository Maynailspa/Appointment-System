// app/check-in/kiosk/page.tsx
'use client'

import { useEffect, useState } from 'react'

type Screen = 'welcome' | 'phone' | 'details' | 'success'

export default function KioskPage() {
  // Hide any existing manager sidebar immediately (defensive against extensions/dev overlays)
  if (typeof window !== 'undefined') {
    try {
      const el = document.querySelector('[data-sidebar="manager"]') as HTMLElement | null
      if (el) {
        el.style.display = 'none'
        el.style.visibility = 'hidden'
      }
    } catch {}
  }
  const [screen, setScreen] = useState<Screen>('welcome')
  const [loading, setLoading] = useState(false)
  // Phone is stored as DIGITS ONLY (no formatting)
  const [phone, setPhone] = useState('')
  const [knownCustomer, setKnownCustomer] = useState<{ firstName: string; lastName?: string } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [service, setService] = useState('')

  const normalizePhone = (v: string) => v.replace(/\D/g, '').slice(0, 10)
  const formatPhone = (digits: string) => {
    const d = (digits || '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }

  const handleStart = () => setScreen('phone')

  const handlePhoneSubmit = async () => {
    const p = normalizePhone(phone)
    if (!p) return
    setLoading(true)
    try {
      // Server-side exact lookup to avoid false matches and reduce payload
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(p)}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.found && data.customer) {
          // Known customer: auto check-in, skip details & finish button
          const f = data.customer.firstName
          const l = data.customer.lastName || ''
          setKnownCustomer({ firstName: f, lastName: l })
          setFirstName(f)
          setLastName(l)
          await fetch('/api/checkins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p, firstName: f, lastName: l })
          })
          // Notify other tabs (manager) to refresh
          try {
            localStorage.setItem('checkin:new', `${Date.now()}`)
          } catch {}
          setScreen('success')
          return
        }
      }
      // New customer flow → ask for details
      setScreen('details')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), firstName, lastName, service })
      })
      try { localStorage.setItem('checkin:new', `${Date.now()}`) } catch {}
      setScreen('success')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 720, maxWidth: '90vw', background: 'white', color: '#111827', borderRadius: 24, padding: 40, boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>
        {screen === 'welcome' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, margin: '0 0 12px', fontWeight: 800, letterSpacing: '-0.02em' }}>Welcome!</div>
            <p style={{ color: '#4b5563', marginBottom: 28, fontSize: 18 }}>Tap below to check in.</p>
            <button onClick={handleStart} style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '16px 28px', fontSize: 18, borderRadius: 12, cursor: 'pointer', boxShadow: '0 10px 20px rgba(124,58,237,0.25)' }}>Check In</button>
          </div>
        )}

        {screen === 'phone' && (
          <div>
            <div style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 700 }}>Phone Number</div>
            <input
              value={formatPhone(phone)}
              onChange={e => setPhone(normalizePhone(e.target.value))}
              placeholder="123-456-7890"
              inputMode="numeric"
              autoFocus
              style={{
                width: '100%',
                padding: 16,
                height: 58,
                boxSizing: 'border-box',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 20,
                display: 'block',
                outline: 'none'
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid #7c3aed'; e.currentTarget.style.boxShadow = 'none' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid #e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setScreen('welcome')} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white' }}>Back</button>
              <button onClick={handlePhoneSubmit} disabled={phone.length !== 10 || loading} style={{ padding: '12px 22px', borderRadius: 10, background: '#7c3aed', color: 'white', border: 'none', boxShadow: '0 8px 18px rgba(124,58,237,0.25)' }}>{loading ? 'Checking…' : 'Continue'}</button>
            </div>
          </div>
        )}

        {screen === 'details' && (
          <div>
            <div style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 700 }}>{knownCustomer ? `Welcome back, ${knownCustomer.firstName}!` : 'Name'}</div>
            {!knownCustomer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={{
                    width: '100%',
                    padding: 16,
                    height: 58,
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    fontSize: 20,
                     display: 'block',
                     outline: 'none'
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #7c3aed'; e.currentTarget.style.boxShadow = 'none' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={{
                    width: '100%',
                    padding: 16,
                    height: 58,
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    fontSize: 20,
                     display: 'block',
                     outline: 'none'
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #7c3aed'; e.currentTarget.style.boxShadow = 'none' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setScreen('phone')} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white' }}>Back</button>
              {!knownCustomer && (
                <button onClick={handleCheckIn} disabled={loading || (!knownCustomer && !firstName)} style={{ padding: '12px 20px', borderRadius: 10, background: '#7c3aed', color: 'white', border: 'none', boxShadow: '0 8px 18px rgba(124,58,237,0.25)' }}>{loading ? 'Submitting…' : 'Finish Check-In'}</button>
              )}
            </div>
          </div>
        )}

        {screen === 'success' && (
          <SuccessBanner
            message={knownCustomer ? `Welcome back, ${knownCustomer.firstName}!` : "You're checked in!"}
            onDone={() => {
              // reset to welcome
              setPhone('')
              setFirstName('')
              setLastName('')
              setKnownCustomer(null)
              setScreen('welcome')
            }}
          />
        )}
      </div>
    </div>
  )
}

// Auto-dismiss success banner component (5s) with tap-to-skip
function SuccessBanner({ message, onDone }: { message: string; onDone: () => void }) {
  // start timer on mount
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      onClick={onDone}
      role="button"
      tabIndex={0}
      style={{ textAlign: 'center', cursor: 'pointer' }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDone() }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(16,185,129,0.25)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#10b981" aria-hidden="true">
            <path d="M9 16.2l-3.5-3.6L4 14.1l5 5 11-11-1.4-1.4z" />
          </svg>
        </div>
      </div>
      <div style={{ marginTop: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', color: '#111827' }}>{message}</div>
      <div style={{ marginTop: 8, fontSize: 18, color: '#4b5563' }}>
        We are super happy that you are here! Enjoy and relax, you deserve it!
      </div>
    </div>
  )}