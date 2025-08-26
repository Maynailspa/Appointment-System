// src/components/calendar/components/WorkerMenu.tsx

import React from 'react'
import { useRouter } from 'next/navigation'
import { StaffMember } from '../types/calendar.types'

interface Props {
  showAddWorkerMenu: boolean
  onShowAddWorkerMenu: (show: boolean) => void
  onCloseAllMenus: () => void
  availableWorkers: StaffMember[]
  workersInCalendar: StaffMember[]
  onAddWorker: (workerId: string) => void
  onRemoveWorker: (workerId: string) => void
  events: any[] // Add events to check for appointments
  currentDate: Date // Add current date to check appointments for specific day
}

export default function WorkerMenu({
  showAddWorkerMenu,
  onShowAddWorkerMenu,
  onCloseAllMenus,
  availableWorkers,
  workersInCalendar,
  onAddWorker,
  onRemoveWorker,
  events,
  currentDate = new Date(), // Provide default value
}: Props) {
  const router = useRouter()

  // Check if a worker has appointments on the current date
  const hasAppointmentsOnDate = (workerId: string): boolean => {
    // Safety check for currentDate
    if (!currentDate) {
      console.warn('currentDate is undefined in hasAppointmentsOnDate')
      return false
    }
    
    const currentDateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Safety check for events array
    if (!events || !Array.isArray(events)) {
      console.warn('events is not a valid array in hasAppointmentsOnDate')
      return false
    }
    
    return events.some(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      const eventStaffId = event.staffId || event.selectedStaff
      
      return eventDate === currentDateString && eventStaffId === workerId
    })
  }

  return (
    <div className="add-worker-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onShowAddWorkerMenu(!showAddWorkerMenu)
        }}
        style={{
          padding: '8px 16px',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          fontSize: '14px',
          background: '#ffffff',
          color: '#374151',
          cursor: 'pointer',
          fontWeight: '500',
          fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease-in-out',
          height: '40px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6'
          e.currentTarget.style.borderColor = '#d1d5db'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.borderColor = '#dee2e6'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        Add Worker
        <svg 
          style={{ 
            width: '14px', 
            height: '14px', 
            fill: 'currentColor',
            transform: showAddWorkerMenu ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }} 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
        

      </button>

      {/* Add Worker Menu Dropdown */}
      {showAddWorkerMenu && (
        <div 
          className="worker-menu-popup"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '240px',
            zIndex: 1000,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            overflow: 'visible'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f3f4f6',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Add Team Member to Calendar
          </div>

          {/* Available Workers */}
          {availableWorkers.length > 0 ? (
            <>
              {availableWorkers
                .sort((a, b) => {
                  const priorityA = a.priority || 50
                  const priorityB = b.priority || 50
                  if (priorityA !== priorityB) {
                    return priorityA - priorityB
                  }
                  // If priorities are equal, sort by name
                  return a.name.localeCompare(b.name)
                })
                .map(member => (
                <div
                  key={member.id}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease-in-out',
                    borderBottom: '1px solid #f9fafb'
                  }}
                  onClick={() => {
                    onAddWorker(member.id)
                    onShowAddWorkerMenu(false)
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.paddingLeft = '20px'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.paddingLeft = '16px'
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: member.color
                  }} />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {member.name}
                  </span>
                  <div style={{
                    marginLeft: 'auto',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                </div>
              ))}

              {/* Separator if there are workers in calendar */}
              {workersInCalendar.length > 0 && (
                <div style={{
                  height: '1px',
                  background: '#e5e7eb',
                  margin: '8px 0'
                }} />
              )}
            </>
          ) : (
            <div style={{
              padding: '20px 16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              All team members are already in the calendar view
            </div>
          )}

          {/* Workers Currently in Calendar */}
          {workersInCalendar.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                In Calendar
              </div>
              {workersInCalendar.map(member => {
                const hasAppointments = hasAppointmentsOnDate(member.id)
                
                return (
                  <div
                    key={`active-${member.id}`}
                    style={{
                      padding: '12px 16px',
                      cursor: hasAppointments ? 'not-allowed' : 'pointer',
                      color: hasAppointments ? '#9ca3af' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease-in-out',
                      borderBottom: '1px solid #f9fafb',
                      opacity: hasAppointments ? 0.6 : 1
                    }}
                    onClick={() => {
                      if (!hasAppointments) {
                        onRemoveWorker(member.id)
                        onShowAddWorkerMenu(false)
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!hasAppointments) {
                        e.currentTarget.style.background = '#fef2f2'
                        e.currentTarget.style.paddingLeft = '20px'
                        e.currentTarget.style.color = '#dc2626'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasAppointments) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.paddingLeft = '16px'
                        e.currentTarget.style.color = '#6b7280'
                      }
                    }}
                  >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: member.color,
                    opacity: 0.5
                  }} />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {member.name}
                    {hasAppointments && (
                      <span style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        marginLeft: '8px'
                      }}>
                        (has appointments)
                      </span>
                    )}
                  </span>
                  <div style={{
                    marginLeft: 'auto',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </div>
                </div>
              )})}
            </>
          )}

          {/* Footer - Manage Team Link */}
          <div
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderTop: '1px solid #f3f4f6',
              background: '#f9fafb',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}
            onClick={() => {
              router.push('/staff')
              onShowAddWorkerMenu(false)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
              e.currentTarget.style.paddingLeft = '20px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb'
              e.currentTarget.style.paddingLeft = '16px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.2-.06.47.12.61l2.03 1.58c-.03.3-.09.63-.09.94s.06.64.09.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            <span style={{
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              Manage Team Members
            </span>
          </div>
        </div>
      )}
    </div>
  )
}