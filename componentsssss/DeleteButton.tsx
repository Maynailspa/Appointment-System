'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'

type Props = { id: string }

export default function DeleteButton({ id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this appointment?')) return

    await fetch(`/api/appointment?id=${id}`, {
      method: 'DELETE',
    })

    router.push('/calendar')
    router.refresh()
  }

  return (
    <Button
      variant="destructive"
      onClick={() => startTransition(handleDelete)}
      disabled={isPending}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
