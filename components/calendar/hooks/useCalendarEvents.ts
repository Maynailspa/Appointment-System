// components/calendar/hooks/useCalendarEvents.ts

import { useState, useEffect, useMemo } from 'react'
import { EventShape } from '../types/calendar.types'
import { StaffMember } from '@/lib/types'
import { formatEventsForCalendar } from '../utils/eventFormatters'

export const useCalendarEvents = (
  initialEvents: EventShape[] | undefined | null,
  activeWorkers: string[],
  teamMembers: StaffMember[]
) => {
  const [events, setEvents] = useState<any[]>([])
  
  // Memoized staff lookup for performance
  const staffLookup = useMemo(() => {
    const map = new Map<string, StaffMember>()
    teamMembers.forEach(member => map.set(member.id, member))
    return map
  }, [teamMembers])

  // Memoized worker set for O(1) lookups
  const activeWorkerSet = useMemo(() => new Set(activeWorkers || []), [activeWorkers])

  // Format events when initialEvents or teamMembers change
  useEffect(() => {
    // Add null check here
    if (initialEvents && Array.isArray(initialEvents)) {
      const formatted = formatEventsForCalendar(initialEvents, staffLookup)
      setEvents(formatted)
    } else {
      setEvents([])
    }
  }, [initialEvents, staffLookup])

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    if (!activeWorkers || activeWorkers.length === 0) {
      return events
    }
    return events.filter(event => 
      activeWorkerSet.has(event.extendedProps?.staffId || '')
    )
  }, [events, activeWorkers, activeWorkerSet])

  const handleEventUpdate = (updatedEvents: any[]) => {
    setEvents(updatedEvents)
  }

  return {
    events,
    filteredEvents,
    handleEventUpdate
  }
}