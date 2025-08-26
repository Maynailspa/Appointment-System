// app/appointments/[id]/delete/DeleteButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Props = { id: string }

export default function DeleteButton({ id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    startTransition(() => {
      router.push('/calendar')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading || isPending}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading || isPending ? 'Deleting…' : 'Delete Appointment'}
    </button>
  )
}
