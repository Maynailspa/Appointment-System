'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CalendarClient from './CalendarClient'

function CalendarPageContent() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date')

  return (
    <div className="h-screen flex flex-col">
      <CalendarClient initialEvents={[]} initialDate={date} />
    </div>
  )
}

export default function CalendarPageClient() {
  return (
    <Suspense fallback={
      <div className="h-screen flex flex-col items-center justify-center">
        <div style={{ color: '#6b7280', fontSize: '16px' }}>Loading calendar...</div>
      </div>
    }>
      <CalendarPageContent />
    </Suspense>
  )
}
