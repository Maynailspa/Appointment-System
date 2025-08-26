// components/calendar/components/BlockTimeDatePicker.tsx

import React, { useState } from 'react'

interface Props {
  value: Date | null
  onChange: (date: Date | null) => void
  label: string
  minDate?: Date
  placeholder?: string
}

export default function BlockTimeDatePicker({
  value,
  onChange,
  label,
  minDate,
  placeholder = 'Select date'
}: Props) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value || new Date())

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const dates = []
    const currentDate = new Date(startDate)
    
    while (currentDate.getMonth() <= month || dates.length < 42) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return value && date.getDate() === value.getDate() &&
           date.getMonth() === value.getMonth() &&
           date.getFullYear() === value.getFullYear()
  }

  const isDisabled = (date: Date) => {
    return minDate && date < minDate
  }

  const handleDateSelect = (date: Date) => {
    onChange(date)
    setShowCalendar(false)
  }

  return (
    <div style={{ 
      marginBottom: '16px',
      position: 'relative'
    }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {label}
      </label>
      
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={value ? formatDate(value) : ''}
          placeholder={placeholder}
          readOnly
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingRight: '40px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#111827',
            outline: 'none',
            transition: 'border-color 0.2s',
            backgroundColor: '#ffffff',
            cursor: 'pointer'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#7c3aed'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        
        <div style={{
          position: 'absolute',
          right: '12px',
          pointerEvents: 'none',
          color: '#6b7280'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
      </div>

      {/* Custom Calendar Popup */}
      {showCalendar && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            marginTop: '4px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            padding: '16px',
            zIndex: 1000,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newDate = new Date(currentMonth)
                newDate.setMonth(newDate.getMonth() - 1)
                setCurrentMonth(newDate)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: '#374151',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>

            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>

            <button
              onClick={(e) => {
                e.stopPropagation()
                const newDate = new Date(currentMonth)
                newDate.setMonth(newDate.getMonth() + 1)
                setCurrentMonth(newDate)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: '#374151',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            {/* Day Headers */}
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} style={{
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500',
                color: '#9ca3af'
              }}>
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {getMonthDates(currentMonth).map((date, i) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const isTodayDate = isToday(date)
              const isSelectedDate = isSelected(date)
              const isDisabledDate = isDisabled(date)

              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isDisabledDate) {
                      handleDateSelect(date)
                    }
                  }}
                  disabled={isDisabledDate}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: '0',
                    background: isSelectedDate ? '#7c3aed' : 'transparent',
                    color: isSelectedDate ? 'white' : isCurrentMonth ? '#374151' : '#d1d5db',
                    border: isTodayDate && !isSelectedDate ? '2px solid #d1d5db' : 'none',
                    borderRadius: '50%',
                    cursor: isCurrentMonth && !isDisabledDate ? 'pointer' : 'default',
                    fontSize: '14px',
                    fontWeight: isSelectedDate ? '600' : '400',
                    transition: 'all 0.2s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDisabledDate ? 0.4 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelectedDate && isCurrentMonth && !isDisabledDate) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelectedDate) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
