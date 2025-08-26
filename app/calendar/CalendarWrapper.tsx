'use client'

import CalendarClient from '@/components/calendar/CalendarClient'
import CalendarClientMinimal from '@/components/calendar/CalendarClient.minimal'
import { EventShape } from '@/components/calendar/types/calendar.types'
import { useState, useEffect } from 'react'

interface Props {
  initialEvents: EventShape[]
  initialDate?: string
}

export default function CalendarWrapper({ initialEvents, initialDate }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      // Check both user agent and screen width for more reliable detection
      const userAgent = navigator.userAgent || ''
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isMobileWidth = window.innerWidth <= 768
      const shouldUseMobile = isMobileUA || isMobileWidth
      console.log('Mobile Detection:', { userAgent, isMobileUA, isMobileWidth, shouldUseMobile })
      setIsMobile(shouldUseMobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Show loading until we know if it's mobile
  if (isMobile === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading calendar...</div>
      </div>
    )
  }

  console.log('Rendering calendar for:', isMobile ? 'MOBILE' : 'DESKTOP')

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        <CalendarClientMinimal
          initialEvents={initialEvents}
          initialDate={initialDate}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <CalendarClient
        initialEvents={initialEvents}
        initialDate={initialDate}
      />
    </div>
  )
}
