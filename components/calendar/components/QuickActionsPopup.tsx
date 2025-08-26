// components/calendar/components/QuickActionsPopup.tsx

import React from 'react'
import { TimeSlot, StaffMember } from '../types/calendar.types'

interface Props {
  showQuickActions: boolean
  selectedTimeSlot: TimeSlot | null
  onOpenAppointmentPanel: (type: 'single' | 'group' | 'blocked', timeSlot?: { start: string; end: string }) => void
  teamMembers: StaffMember[]
}

export default function QuickActionsPopup({
  showQuickActions,
  selectedTimeSlot,
  onOpenAppointmentPanel,
  teamMembers
}: Props) {
  if (!showQuickActions || !selectedTimeSlot) return null

  return (
    <div 
      className="quick-actions-popup"
      style={{
        position: 'fixed',
        top: `${selectedTimeSlot.centerY || selectedTimeSlot.top}px`,
        left: `${selectedTimeSlot.centerX || selectedTimeSlot.left}px`,
        transform: 'translate(-50%, -50%)',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        minWidth: '260px',
        padding: '0',
        zIndex: 1000,
        fontSize: '15px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* TIME RANGE HEADER */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '14px',
        fontWeight: '600',
        color: '#000000',
        background: '#d1d5db',
        borderRadius: '8px 8px 0 0'
      }}>
        {(() => {
          // Force format the time display here
          const timeText = selectedTimeSlot.timeDisplay
          console.log('QuickActionsPopup timeText:', timeText)
          
          let formattedTime = timeText
          if (timeText && timeText.includes(':')) {
            try {
              // Try to parse as military time (e.g., "19:00:00")
              const timeMatch = timeText.match(/(\d{1,2}):(\d{2})(?::\d{2})?/)
              if (timeMatch) {
                const hours = parseInt(timeMatch[1])
                const minutes = parseInt(timeMatch[2])
                const date = new Date()
                date.setHours(hours, minutes, 0, 0)
                formattedTime = date.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
                console.log('Formatted time in QuickActionsPopup:', formattedTime)
              }
            } catch (error) {
              console.log('Error formatting in QuickActionsPopup:', error)
            }
          }
          
          // Add worker information if available
          if (selectedTimeSlot.workerId && selectedTimeSlot.workerId !== 'walk-ins') {
            // Look up the actual worker name from team members
            const worker = teamMembers.find(member => member.id === selectedTimeSlot.workerId)
            const workerName = worker ? worker.name : `Worker ${selectedTimeSlot.workerId}`
            return `${formattedTime} - ${workerName}`
          }
          
          return formattedTime
        })()}
      </div>

      <div style={{ padding: '6px 0' }}>
        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={() => {
            onOpenAppointmentPanel('single', { 
              start: selectedTimeSlot.start, 
              end: selectedTimeSlot.end 
            })
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg 
            style={{ marginRight: '8px', width: '16px', height: '16px', fill: '#3b82f6' }} 
            viewBox="0 0 24 24"
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          Add appointment
        </div>

        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={() => {
            onOpenAppointmentPanel('group', { 
              start: selectedTimeSlot.start, 
              end: selectedTimeSlot.end 
            })
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg 
            style={{ marginRight: '8px', width: '16px', height: '16px', fill: '#8b5cf6' }} 
            viewBox="0 0 24 24"
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          Add group appointment
        </div>

        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={() => {
            onOpenAppointmentPanel('blocked', { 
              start: selectedTimeSlot.start, 
              end: selectedTimeSlot.end 
            })
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg 
            style={{ marginRight: '8px', width: '16px', height: '16px', fill: '#4b5563' }} 
            viewBox="0 0 24 24"
          >
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          Add blocked time
        </div>
      </div>
    </div>
  )
}