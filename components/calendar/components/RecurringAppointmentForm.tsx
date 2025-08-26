import React, { useState, useEffect } from 'react'
import { RecurringPattern, RecurringFrequency } from '../types/calendar.types'
import { getDefaultRecurringPattern, validateRecurringPattern, getRecurringFrequencyLabel } from '../utils/recurringUtils'

interface RecurringAppointmentFormProps {
  isRecurring: boolean
  pattern: RecurringPattern | null
  startDate: Date
  onPatternChange: (pattern: RecurringPattern) => void
  onToggleRecurring: (isRecurring: boolean) => void
}

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'triweekly', label: 'Every 3 weeks' },
  { value: 'monthly', label: 'Monthly (same date)' },
  { value: 'monthly-weekday', label: 'Monthly (same weekday)' }
]

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export default function RecurringAppointmentForm({
  isRecurring,
  pattern,
  startDate,
  onPatternChange,
  onToggleRecurring
}: RecurringAppointmentFormProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [inputValue, setInputValue] = useState<string>('')

  useEffect(() => {
    if (pattern) {
      const validationErrors = validateRecurringPattern(pattern)
      setErrors(validationErrors)
    }
  }, [pattern])

  // Update input value when pattern changes
  useEffect(() => {
    setInputValue(pattern?.endAfter?.toString() || '')
  }, [pattern?.endAfter])

  const handleToggleRecurring = () => {
    if (!isRecurring) {
      // Initialize with default pattern based on start date
      const defaultPattern = getDefaultRecurringPattern()
      defaultPattern.daysOfWeek = [startDate.getDay()]
      onPatternChange(defaultPattern)
    }
    onToggleRecurring(!isRecurring)
  }

  const updatePattern = (updates: Partial<RecurringPattern>) => {
    if (pattern) {
      const newPattern = { ...pattern, ...updates }
      onPatternChange(newPattern)
    }
  }

  const handleFrequencyChange = (frequency: RecurringFrequency) => {
    if (pattern) {
      const newPattern = { ...pattern, frequency }
      
      // Set default days for weekly frequency
      if (frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
        newPattern.daysOfWeek = [startDate.getDay()]
      }
      
      onPatternChange(newPattern)
    }
  }

  const handleDayToggle = (day: number) => {
    if (pattern && pattern.daysOfWeek) {
      const newDays = pattern.daysOfWeek.includes(day)
        ? pattern.daysOfWeek.filter(d => d !== day)
        : [...pattern.daysOfWeek, day]
      
      updatePattern({ daysOfWeek: newDays })
    }
  }

  const handleEndTypeChange = (type: 'after' | 'by' | 'none') => {
    if (pattern) {
      const updates: Partial<RecurringPattern> = {
        endAfter: type === 'after' ? pattern.endAfter : undefined,
        endBy: type === 'by' ? pattern.endBy || '' : '',
        noEndDate: type === 'none'
      }
      updatePattern(updates)
    }
  }

  if (!isRecurring) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: '#f9fafb'
        }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            Make this recurring
          </span>
          <button
            onClick={handleToggleRecurring}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed'
              e.currentTarget.style.color = '#7c3aed'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.color = '#374151'
            }}
          >
            Enable
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Recurring Appointment
        </h3>
        <button
          onClick={handleToggleRecurring}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            color: '#6b7280',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          Disable
        </button>
      </div>

      {/* Recurrence Options Panel */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        background: 'white'
      }}>
        {/* Frequency */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            Frequency
          </label>
          <select
            value={pattern?.frequency || 'weekly'}
            onChange={(e) => handleFrequencyChange(e.target.value as RecurringFrequency)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '16px'
            }}
          >
            {frequencyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Days Selection (for weekly) */}
        {pattern?.frequency === 'weekly' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Days of the week
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {dayOptions.map(day => (
                <label
                  key={day.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pattern?.daysOfWeek?.includes(day.value) || false}
                    onChange={() => handleDayToggle(day.value)}
                    style={{
                      marginRight: '8px',
                      accentColor: '#7c3aed'
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Time Flexibility */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151'
          }}>
            <input
              type="checkbox"
              checked={pattern?.keepSameTime || false}
              onChange={(e) => updatePattern({ keepSameTime: e.target.checked })}
              style={{
                marginRight: '8px',
                accentColor: '#7c3aed'
              }}
            />
            Keep same time for all appointments
          </label>
          {!pattern?.keepSameTime && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              You can adjust times individually after creation
            </div>
          )}
        </div>

        {/* Series End Options */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Series ends
          </label>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input
                type="radio"
                name="endType"
                checked={!!pattern?.endAfter}
                onChange={() => handleEndTypeChange('after')}
                style={{
                  marginRight: '8px',
                  accentColor: '#7c3aed'
                }}
              />
              End after
              <input
                type="number"
                min="1"
                max="52"
                value={inputValue}
                onChange={(e) => {
                  const newValue = e.target.value
                  setInputValue(newValue)
                  
                  // Allow empty input temporarily while typing
                  if (newValue === '') {
                    updatePattern({ 
                      endAfter: undefined,
                      endBy: undefined,
                      noEndDate: false
                    })
                  } else {
                    const value = parseInt(newValue)
                    if (!isNaN(value) && value >= 1 && value <= 52) {
                      updatePattern({ 
                        endAfter: value,
                        endBy: undefined,
                        noEndDate: false
                      })
                    }
                  }
                }}
                style={{
                  width: '60px',
                  margin: '0 8px',
                  padding: '4px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              appointments
            </label>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input
                type="radio"
                name="endType"
                checked={!!pattern?.endBy}
                onChange={() => handleEndTypeChange('by')}
                style={{
                  marginRight: '8px',
                  accentColor: '#7c3aed'
                }}
              />
              End by
              <input
                type="date"
                value={pattern?.endBy || ''}
                onChange={(e) => {
                  updatePattern({ 
                    endBy: e.target.value,
                    endAfter: undefined,
                    noEndDate: false
                  })
                }}
                style={{
                  margin: '0 8px',
                  padding: '4px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </label>
          </div>

          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input
                type="radio"
                name="endType"
                checked={pattern?.noEndDate || false}
                onChange={() => handleEndTypeChange('none')}
                style={{
                  marginRight: '8px',
                  accentColor: '#7c3aed'
                }}
              />
              No end date
            </label>
            {pattern?.noEndDate && (
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                Maximum 52 occurrences will be created
              </div>
            )}
          </div>
        </div>

        {/* Pattern Summary */}
        {pattern && (
          <div style={{
            padding: '12px',
            background: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#374151'
          }}>
            <strong>Pattern:</strong> {getRecurringFrequencyLabel(pattern)}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px'
          }}>
            {errors.map((error, index) => (
              <div key={index} style={{ fontSize: '13px', color: '#dc2626' }}>
                {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 