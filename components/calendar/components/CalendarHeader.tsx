// components/calendar/components/CalendarHeader.tsx

import React from 'react'
import type { CalendarApi } from '@fullcalendar/core'
import { CalendarView, StaffMember } from '../types/calendar.types'
import DatePicker from './DatePicker'
import AddMenu from './AddMenu'
import WorkerMenu from './WorkerMenu'
import MobileWorkerSelector from './MobileWorkerSelector'
import RealtimeStatusIndicator from './RealtimeStatusIndicator'

interface Props {
  view: CalendarView
  currentDate: Date
  currentDayName: string
  isToday: boolean
  calendarApi: CalendarApi | null
  onViewChange: (view: CalendarView) => void
  onOpenAppointmentPanel: (type: 'single' | 'group' | 'blocked') => void
  showDatePicker: boolean
  onShowDatePicker: (show: boolean) => void
  showAddMenu: boolean
  onShowAddMenu: (show: boolean) => void
  showAddWorkerMenu: boolean
  onShowAddWorkerMenu: (show: boolean) => void
  onCloseAllMenus: () => void
  availableWorkers: StaffMember[]
  workersInCalendar: StaffMember[]
  activeWorkers: string[]
  teamMembers: StaffMember[]
  onAddWorker: (workerId: string) => void
  onRemoveWorker: (workerId: string) => void
  events: any[] // Add events to check for appointments
  selectedWorkerId?: string | null // For mobile worker filtering
  onWorkerSelect?: (workerId: string | null) => void // For mobile worker filtering
}

export default function CalendarHeader({
  view,
  currentDate,
  currentDayName,
  isToday,
  calendarApi,
  onViewChange,
  onOpenAppointmentPanel,
  showDatePicker,
  onShowDatePicker,
  showAddMenu,
  onShowAddMenu,
  showAddWorkerMenu,
  onShowAddWorkerMenu,
  onCloseAllMenus,
  availableWorkers,
  workersInCalendar,
  activeWorkers,
  teamMembers,
  onAddWorker,
  onRemoveWorker,
  events,
  selectedWorkerId,
  onWorkerSelect,
}: Props) {
  // Check if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    // Mobile Header Layout - Single row
    return (
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e9ecef',
        fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
        position: 'sticky',
        top: 0,
        zIndex: 900
      }}>
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          {/* Left side - Today button only */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (calendarApi) {
                  calendarApi.today()
                }
              }}
              style={{
                padding: '8px 16px',
                border: isToday ? '2px solid #7c3aed' : '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px',
                background: isToday ? '#f3f4f6' : 'white',
                cursor: 'pointer',
                color: isToday ? '#7c3aed' : '#6c757d',
                fontWeight: isToday ? '600' : '400',
                fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                height: '40px'
              }}
            >
              today
            </button>
          </div>

          {/* Center - Navigation and Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            flex: '1',
            justifyContent: 'center',
            minWidth: '0'
          }}>
            <button
              onClick={() => {
                if (calendarApi) {
                  calendarApi.prev()
                }
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px 0 0 6px',
                borderRight: 'none',
                fontSize: '16px',
                background: 'white',
                cursor: 'pointer',
                color: '#6c757d',
                fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                lineHeight: '1',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa'
                e.currentTarget.style.color = '#495057'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#6c757d'
              }}
            >
              ‹
            </button>

            {/* Mobile-responsive DatePicker */}
            <div style={{ 
              position: 'relative',
              display: 'flex', 
              alignItems: 'center', 
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
              cursor: 'pointer',
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              borderLeft: '1px solid #dee2e6',
              borderRight: '1px solid #dee2e6',
              background: 'white',
              minWidth: '0',
              flex: '1',
              justifyContent: 'center',
              height: '40px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              e.stopPropagation()
              onShowDatePicker(!showDatePicker)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
            }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: '0'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '500',
                  color: '#7c3aed',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: '#f3f4f6',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  border: '1px solid #e5e7eb',
                  flexShrink: 0
                }}>
                  {currentDayName}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#212529',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: '0'
                }}>
                  {currentDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>

              {/* Down Arrow Icon */}
              <svg 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  fill: '#6c757d',
                  marginLeft: '3px',
                  transform: showDatePicker ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease-in-out',
                  flexShrink: 0
                }} 
                viewBox="0 0 24 24"
              >
                <path d="M7 10l5 5 5-5z"/>
              </svg>

              {/* Mobile Date Picker Dropdown */}
              {showDatePicker && (
                <DatePicker
                  currentDate={currentDate}
                  currentDayName={currentDayName}
                  showDatePicker={showDatePicker}
                  onShowDatePicker={onShowDatePicker}
                  calendarApi={calendarApi}
                />
              )}
            </div>

            <button
              onClick={() => {
                if (calendarApi) {
                  calendarApi.next()
                }
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '0 6px 6px 0',
                borderLeft: 'none',
                fontSize: '16px',
                background: 'white',
                cursor: 'pointer',
                color: '#6c757d',
                fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                lineHeight: '1',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa'
                e.currentTarget.style.color = '#495057'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#6c757d'
              }}
            >
              ›
            </button>
          </div>

          {/* Right side - Add Menu */}
          <div style={{ flexShrink: 0 }}>
            <AddMenu
              showAddMenu={showAddMenu}
              onShowAddMenu={onShowAddMenu}
              onOpenAppointmentPanel={onOpenAppointmentPanel}
            />
          </div>
        </div>
      </div>
    )
  }

  // Desktop Header Layout (unchanged)
  return (
    <div style={{ 
      background: 'white', 
      borderBottom: '1px solid #e9ecef',
      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
      position: 'sticky',
      top: 0,
      zIndex: 900
    }}>
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left Side - Day selector and Today button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            value={view}
            onChange={(e) => onViewChange(e.target.value as CalendarView)}
            style={{
              padding: '8px 12px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '16px',
              paddingRight: '32px',
              transition: 'all 0.2s ease-in-out'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#dee2e6'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <option value="timeGridDay">Day</option>
            <option value="timeGridWeek">Week</option>
            <option value="dayGridMonth">Month</option>
          </select>

          <button
            onClick={() => {
              if (calendarApi) {
                calendarApi.today()
              }
            }}
            style={{
              padding: '8px 16px',
              border: isToday ? '2px solid #7c3aed' : '1px solid #dee2e6',
              borderRadius: '6px',
              fontSize: '14px',
              background: isToday ? '#f3f4f6' : 'white',
              cursor: 'pointer',
              color: isToday ? '#7c3aed' : '#6c757d',
              fontWeight: isToday ? '600' : '400',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              if (!isToday) {
                e.currentTarget.style.background = '#f8f9fa'
                e.currentTarget.style.borderColor = '#c0c4cc'
              }
            }}
            onMouseLeave={(e) => {
              if (!isToday) {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = '#dee2e6'
              }
            }}
          >
            today
          </button>
        </div>

        {/* Center - Navigation with Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <button
            onClick={() => {
              if (calendarApi) {
                calendarApi.prev()
              }
            }}
            style={{
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              borderRadius: '6px 0 0 6px',
              borderRight: 'none',
              fontSize: '28px',
              background: 'white',
              cursor: 'pointer',
              color: '#6c757d',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '50px',
              lineHeight: '1',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa'
              e.currentTarget.style.color = '#495057'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#6c757d'
            }}
          >
            ‹
          </button>

          <DatePicker
            currentDate={currentDate}
            currentDayName={currentDayName}
            showDatePicker={showDatePicker}
            onShowDatePicker={onShowDatePicker}
            calendarApi={calendarApi}
          />

          <button
            onClick={() => {
              if (calendarApi) {
                calendarApi.next()
              }
            }}
            style={{
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              borderRadius: '0 6px 6px 0',
              borderLeft: 'none',
              fontSize: '28px',
              background: 'white',
              cursor: 'pointer',
              color: '#6c757d',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '50px',
              lineHeight: '1',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa'
              e.currentTarget.style.color = '#495057'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#6c757d'
            }}
          >
            ›
          </button>
        </div>

        {/* Right Side - Status and Add buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RealtimeStatusIndicator />
          
          <WorkerMenu
            showAddWorkerMenu={showAddWorkerMenu}
            onShowAddWorkerMenu={onShowAddWorkerMenu}
            onCloseAllMenus={onCloseAllMenus}
            availableWorkers={availableWorkers}
            workersInCalendar={workersInCalendar}
            onAddWorker={onAddWorker}
            onRemoveWorker={onRemoveWorker}
            events={events}
            currentDate={currentDate}
          />

          <AddMenu
            showAddMenu={showAddMenu}
            onShowAddMenu={onShowAddMenu}
            onOpenAppointmentPanel={onOpenAppointmentPanel}
          />
        </div>
      </div>
    </div>
  )
}