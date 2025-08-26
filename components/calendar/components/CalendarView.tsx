// components/calendar/components/CalendarView.tsx

import React, { useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarApi } from '@fullcalendar/core'
import { CalendarView as ViewType } from '../types/calendar.types'
import { BUSINESS_HOURS, SLOT_LABEL_FORMAT } from '../utils/calendarConfig'

interface Props {
  view: ViewType
  events: any[]
  calendarApi: CalendarApi | null
  setCalendarApi: (api: CalendarApi | null) => void
  onEventClick: (info: any) => void
  onEventDrop: (info: any) => void
  onEventResize: (info: any) => void
  onDateClick: (info: any) => void
  onSelect: (info: any) => void
  onDatesSet: (info: any) => void
  canSelect: boolean
}

export default function CalendarView({
  view,
  events,
  calendarApi,
  setCalendarApi,
  onEventClick,
  onEventDrop,
  onEventResize,
  onDateClick,
  onSelect,
  onDatesSet,
  canSelect,
}: Props) {
  // Handle calendar API updates
  useEffect(() => {
    if (calendarApi) {
      // Calendar resize on sidebar state change
      const checkSidebarState = () => {
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
        
        // Force calendar to recalculate its width
        const container = document.querySelector('.fc') as HTMLElement
        if (container) {
          // Temporarily change width to force reflow
          container.style.width = '99%'
          // Force browser reflow
          void container.offsetWidth
          // Reset to 100%
          container.style.width = '100%'
        }
        
        // Multiple resize attempts with delays
        calendarApi.updateSize()
        
        const timeouts = [100, 200, 300].map(delay => 
          setTimeout(() => calendarApi.updateSize(), delay)
        )
      }

      // Initial check
      checkSidebarState()

      // Listen for localStorage changes
      const interval = setInterval(checkSidebarState, 500)

      // Also listen for window resize
      const handleResize = () => {
        calendarApi.updateSize()
      }
      
      window.addEventListener('resize', handleResize, { passive: true })

      // ResizeObserver for more reliable detection
      const calendarEl = document.querySelector('.fc')
      let resizeObserver: ResizeObserver | null = null
      if (calendarEl) {
        resizeObserver = new ResizeObserver(() => {
          calendarApi.updateSize()
        })
        resizeObserver.observe(calendarEl)
      }

      return () => {
        clearInterval(interval)
        window.removeEventListener('resize', handleResize)
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
      }
    }
  }, [calendarApi])

  // Make handleViewChange available globally
  useEffect(() => {
    if (calendarApi) {
      (window as any).handleViewChange = (newView: ViewType) => {
        calendarApi.changeView(newView)
      }

      return () => {
        delete (window as any).handleViewChange
        if ((window as any).nowIndicatorInterval) {
          clearInterval((window as any).nowIndicatorInterval)
          delete (window as any).nowIndicatorInterval
        }
      }
    }
  }, [calendarApi])

  return (
    <FullCalendar
      plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
      initialView={view}
      headerToolbar={false}
      customButtons={{}}
      datesSet={onDatesSet}
      editable={true}
      droppable={false}
      eventResizableFromStart={false}
      eventDurationEditable={true}
      eventStartEditable={true}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      dragScroll={true}
      snapDuration="00:15:00"
      eventOverlap={false}
      selectable={canSelect}
      selectMirror={canSelect}
      select={onSelect}
      dateClick={onDateClick}
      selectAllow={() => canSelect}
      events={events}
      eventClick={onEventClick}
      ref={(el) => {
        // Set calendar API when component mounts
        if (el) {
          setCalendarApi(el.getApi())
        }
      }}
      viewDidMount={(arg) => {
        // Update view when it changes
        if (!calendarApi) {
          setCalendarApi(arg.view.calendar)
        }

        // Replace the custom button with our dropdown
        setTimeout(() => {
          const buttonEl = document.querySelector('.fc-viewSelector-button')
          if (buttonEl && !buttonEl.querySelector('select')) {
            buttonEl.innerHTML = `
              <select onchange="window.handleViewChange?.(this.value)">
                <option value="timeGridDay" ${view === 'timeGridDay' ? 'selected' : ''}>Day</option>
                <option value="timeGridWeek" ${view === 'timeGridWeek' ? 'selected' : ''}>Week</option>
                <option value="dayGridMonth" ${view === 'dayGridMonth' ? 'selected' : ''}>Month</option>
              </select>
            `
          }

          // Add current time to now indicator and update in real-time
          let lastMinute = -1

          const updateNowIndicator = () => {
            const nowLine = document.querySelector('.fc-timegrid-now-indicator-line') || 
                           document.querySelector('.fc-now-indicator-line')

            if (nowLine) {
              const now = new Date()
              const currentMinute = now.getMinutes()

              // Only update if the minute has actually changed
              if (currentMinute !== lastMinute) {
                const timeString = now.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })
                nowLine.setAttribute('data-time', timeString)
                lastMinute = currentMinute

                // Force badge position refresh
                Object.assign((nowLine as HTMLElement).style, {
                  left: '0',
                  width: 'calc(100% + 8px)',
                  marginLeft: '-8px',
                  position: 'relative',
                  zIndex: '100'
                })
              }
            }
          }

          updateNowIndicator()
          // Check every second, but only update when minute changes
          const intervalId = setInterval(updateNowIndicator, 1000)

          // Store interval reference for cleanup
          ;(window as any).nowIndicatorInterval = intervalId

          // Also update on view changes - This fixes the badge after navigation
          setTimeout(() => {
            updateNowIndicator()
          }, 100)
        }, 50)
      }}
      height="100%"
      slotMinTime="09:00:00"
      slotMaxTime="23:00:00"
      slotDuration="00:15:00"
      slotLabelInterval="01:00:00"
      slotLabelFormat={SLOT_LABEL_FORMAT}
      eventDisplay="block"
      allDaySlot={false}
      eventMinHeight={30}
      expandRows={true}
      nowIndicator={true}
      businessHours={BUSINESS_HOURS}
      selectConstraint="businessHours"
      eventConstraint="businessHours"
    />
  )
}