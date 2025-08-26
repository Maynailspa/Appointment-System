import React from 'react'
import { EventShape } from '../types/calendar.types'

interface SeriesViewModalProps {
  isOpen: boolean
  seriesId: string | null
  appointments: EventShape[]
  onClose: () => void
  onEditSeries: () => void
  onDeleteSeries: () => void
}

export default function SeriesViewModal({
  isOpen,
  seriesId,
  appointments,
  onClose,
  onEditSeries,
  onDeleteSeries
}: SeriesViewModalProps) {
  if (!isOpen || !seriesId || appointments.length === 0) return null

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getClientName = (appointment: EventShape) => {
    if (appointment.client && appointment.client.firstName) {
      return `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim()
    }
    return appointment.clientName || 'Walk-in Client'
  }

  const getStaffName = (appointment: EventShape) => {
    return appointment.staffName || appointment.extendedProps?.staffName || 'Unknown Staff'
  }

  const getServiceName = (appointment: EventShape) => {
    return appointment.serviceName || appointment.extendedProps?.serviceName || 'No service specified'
  }

  const getRecurringPattern = (appointment: EventShape) => {
    const pattern = appointment.recurringPattern || appointment.extendedProps?.recurringPattern
    if (!pattern) return 'Unknown pattern'
    
    const { getRecurringFrequencyLabel } = require('../utils/recurringUtils')
    return getRecurringFrequencyLabel(pattern)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: '#3b82f6',
          color: 'white',
          padding: '20px 24px',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: 0,
              marginBottom: '4px'
            }}>
              Recurring Series
            </h2>
            <div style={{
              fontSize: '14px',
              opacity: 0.9
            }}>
              {appointments.length} appointments • {getRecurringPattern(appointments[0])}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          overflow: 'auto',
          flex: 1
        }}>
          {/* Series Info */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Series Information
            </div>
            <div style={{
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              <div>Client: {getClientName(appointments[0])}</div>
              <div>Staff: {getStaffName(appointments[0])}</div>
              <div>Service: {getServiceName(appointments[0])}</div>
              <div>Pattern: {getRecurringPattern(appointments[0])}</div>
            </div>
          </div>

          {/* Appointments List */}
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px'
          }}>
            All Appointments ({appointments.length})
          </div>

          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            {appointments.map((appointment, index) => (
              <div
                key={appointment.id}
                style={{
                  padding: '16px',
                  borderBottom: index < appointments.length - 1 ? '1px solid #e5e7eb' : 'none',
                  background: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {formatDate(appointment.start)}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    background: '#e5e7eb',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {appointment.occurrenceNumber} of {appointment.totalOccurrences}
                  </div>
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {formatTime(appointment.start)} - {formatTime(appointment.end)}
                </div>
                
                {appointment.extendedProps?.notes && (
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    marginTop: '4px'
                  }}>
                    "{appointment.extendedProps.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#9ca3af'
              e.currentTarget.style.color = '#1f2937'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.color = '#374151'
            }}
          >
            Close
          </button>
          <button
            onClick={onEditSeries}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#8b5cf6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#8b5cf6'}
          >
            Edit Series
          </button>
          <button
            onClick={onDeleteSeries}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#ef4444',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            Delete Series
          </button>
        </div>
      </div>
    </div>
  )
} 