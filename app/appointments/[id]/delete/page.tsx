// app/appointments/[id]/delete/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props { params: { id: string } }

export default function DeletePage({ params }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/appointments/${params.id}`, { method: 'DELETE' })
    router.push('/calendar')
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl mb-4">Delete this appointment?</h1>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-4 py-2 bg-red-600 rounded disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Yes, delete'}
      </button>
    </main>
  )
}
