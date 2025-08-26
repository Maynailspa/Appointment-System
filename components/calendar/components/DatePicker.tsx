// components/calendar/components/DatePicker.tsx

import React from 'react'
import { CalendarApi } from '@fullcalendar/react'
import { getWeekDates, getMonthDates, isToday as checkIsToday } from '../utils/dateHelpers'

interface Props {
  currentDate: Date
  currentDayName: string
  showDatePicker: boolean
  onShowDatePicker: (show: boolean) => void
  calendarApi: CalendarApi | null
}

export default function DatePicker({
  currentDate,
  currentDayName,
  showDatePicker,
  onShowDatePicker,
  calendarApi,
}: Props) {
  return (
    <div 
      className="date-picker-container"
      style={{ 
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
        cursor: 'pointer',
        padding: '8px 20px',
        border: '1px solid #dee2e6',
        borderLeft: '1px solid #dee2e6',
        borderRight: '1px solid #dee2e6',
        background: 'white',
        transition: 'all 0.2s ease-in-out',
        minWidth: '280px',
        justifyContent: 'center',
        height: '50px',
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
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#7c3aed',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        background: '#f3f4f6',
        padding: '4px 10px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb'
      }}>
        {currentDayName}
      </span>
      <span style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#212529',
        margin: '0'
      }}>
        {currentDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}
      </span>

      {/* Down Arrow Icon */}
      <svg 
        style={{ 
          width: '14px', 
          height: '14px', 
          fill: '#6c757d',
          marginLeft: '8px',
          transform: showDatePicker ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease-in-out'
        }} 
        viewBox="0 0 24 24"
      >
        <path d="M7 10l5 5 5-5z"/>
      </svg>

      {/* Date Picker Dropdown */}
      {showDatePicker && (
        <div 
          className="date-picker-popup"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            zIndex: 1000,
            minWidth: '400px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Week View */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            paddingBottom: '20px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            {getWeekDates(currentDate).map((date, index) => {
              const isToday = checkIsToday(date)
              const isSelected = currentDate.toDateString() === date.toDateString()
              
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (calendarApi) {
                      calendarApi.gotoDate(date)
                    }
                    onShowDatePicker(false)
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    background: isSelected ? '#7c3aed' : isToday ? '#f3f4f6' : 'transparent',
                    color: isSelected ? 'white' : isToday ? '#7c3aed' : '#1f2937',
                    fontWeight: isSelected || isToday ? '600' : '400',
                    border: isToday && !isSelected ? '2px solid #7c3aed' : 'none',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isToday ? '#f3f4f6' : 'transparent'
                    }
                  }}
                  >
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newDate = new Date(currentDate)
                newDate.setMonth(newDate.getMonth() - 1)
                if (calendarApi) {
                  calendarApi.gotoDate(newDate)
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                color: '#6c757d',
                borderRadius: '4px'
              }}
            >
              ‹
            </button>

            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>

            <button
              onClick={(e) => {
                e.stopPropagation()
                const newDate = new Date(currentDate)
                newDate.setMonth(newDate.getMonth() + 1)
                if (calendarApi) {
                  calendarApi.gotoDate(newDate)
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                color: '#6c757d',
                borderRadius: '4px'
              }}
            >
              ›
            </button>
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px'
          }}>
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280'
              }}>
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {getMonthDates(currentDate).map((date, i) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth()
              const isToday = checkIsToday(date)
              const isSelected = date.toDateString() === currentDate.toDateString()

              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (calendarApi) {
                      calendarApi.gotoDate(date)
                    }
                    onShowDatePicker(false)
                  }}
                  style={{
                    padding: '8px',
                    background: isSelected ? '#7c3aed' : 'transparent',
                    color: isSelected ? 'white' : isCurrentMonth ? '#1f2937' : '#9ca3af',
                    border: isToday && !isSelected ? '2px solid #7c3aed' : 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isSelected || isToday ? '600' : '400',
                    transition: 'all 0.2s ease-in-out',
                    minHeight: '36px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
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