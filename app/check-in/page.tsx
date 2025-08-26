// app/check-in/page.tsx
'use client'

import { useEffect, useState } from 'react'

interface CheckInRow {
  id: string
  clientId?: string
  firstName: string
  lastName?: string
  phone: string
  service?: string
  status: 'waiting' | 'assigned' | 'served' | 'completed' | 'cancelled'
  assignedStaffId?: string
  assignedStaffName?: string
  checkInAt: string
}

export default function CheckInPage() {
  const [rows, setRows] = useState<CheckInRow[]>([])
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/checkins'),
        fetch('/api/staff')
      ])
      if (r1.ok) setRows(await r1.json())
      if (r2.ok) setStaff(await r2.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Refresh when kiosk signals via localStorage; no polling to avoid UI flashing
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === 'checkin:new') load() }
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage) }
  }, [load])

  const updateRow = async (id: string, patch: any) => {
    await fetch(`/api/checkins/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    load()
  }

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Check In</h1>
          <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search name or phone…"
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                outline: 'none',
                fontSize: 14,
                color: '#111827',
                background: 'white',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#60a5fa' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            />
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fill: '#9ca3af', pointerEvents: 'none' }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', textAlign: 'center' }}>
            <div>Name</div>
            <div>Phone</div>
            <div>Service</div>
            <div>Checked In</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 20, color: '#6b7280' }}>No check-ins yet.</div>
          ) : (
            Object.entries(
              // Filter first, then group by date
              rows
                .filter((row) => {
                  if (!query.trim()) return true
                  const q = query.trim().toLowerCase()
                  const digitsQ = q.replace(/\D/g, '')
                  const name = `${row.firstName} ${row.lastName || ''}`.toLowerCase()
                  const phoneDigits = String(row.phone || '').replace(/\D/g, '')
                  return (
                    name.includes(q) ||
                    (digitsQ.length >= 2 && phoneDigits.includes(digitsQ))
                  )
                })
                .reduce((acc: Record<string, CheckInRow[]>, row) => {
                const d = new Date(row.checkInAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                acc[d] = acc[d] || []
                acc[d].push(row)
                return acc
              }, {})
            ).map(([date, list]) => (
              <div key={date}>
                <div style={{ padding: '10px 16px', background: '#f9fafb', color: '#6b7280', fontWeight: 600, textAlign: 'left', borderTop: '1px solid #e5e7eb' }}>{date}</div>
                {list.map(r => (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ justifySelf: 'center', fontWeight: 600, color: '#111827' }}>
                  {r.firstName} {r.lastName || ''}
                </div>
                <div style={{ color: '#111827', justifySelf: 'center' }}>
                  {String(r.phone).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                </div>
                <div style={{ color: '#111827', justifySelf: 'center' }}>{r.service || '-'}</div>
                <div style={{ color: '#111827', justifySelf: 'center' }}>
                  {new Date(r.checkInAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
          <div style={{ textTransform: 'capitalize', color: '#10b981', justifySelf: 'center' }}>
            {r.status === 'waiting' ? 'Checked In' : r.status}
          </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <select value={r.assignedStaffId || ''} onChange={(e) => updateRow(r.id, { assignedStaffId: e.target.value || null, status: 'assigned' })} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <option value="">Assign staff…</option>
                    {staff.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}