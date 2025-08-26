import React from 'react'
import { EventShape } from '../types/calendar.types'

interface AppointmentDetailModalProps {
  isOpen: boolean
  appointment: EventShape | null
  position?: { x: number; y: number }
  onClose: () => void
  onEdit: (appointment: EventShape) => void
  onDelete: (appointment: EventShape) => void
  showDeleteConfirm?: boolean
  onDeleteConfirm?: () => void
  onDeleteCancel?: () => void
  resolveStaffName: (appointment: any) => string
  onEditThisAppointment?: () => void
  onEditEntireSeries?: () => void
  onViewAllInSeries?: () => void
}

export default function AppointmentDetailModal({
  isOpen,
  appointment,
  position,
  onClose,
  onEdit,
  onDelete,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  resolveStaffName,
  onEditThisAppointment,
  onEditEntireSeries,
  onViewAllInSeries
}: AppointmentDetailModalProps) {
  if (!isOpen || !appointment) {
    return null
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Check if we have a 10-digit US number
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    
    // If it's 11 digits and starts with 1, format as US number
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const usNumber = cleaned.slice(1)
      return `${usNumber.slice(0, 3)}-${usNumber.slice(3, 6)}-${usNumber.slice(6)}`
    }
    
    // Return original if it doesn't match expected formats
    return phone
  }

  const clientName = appointment.extendedProps?.client ? 
    `${appointment.extendedProps.client.firstName} ${appointment.extendedProps.client.lastName || ''}`.trim() :
    appointment.clientName || 'Walk-in'

  const clientPhone = formatPhoneNumber(appointment.extendedProps?.client?.phone || '')

  const staffName = resolveStaffName(appointment) || 'Any Staff'

  const serviceName = appointment.extendedProps?.services?.join(', ') || 
                     appointment.serviceName || 
                     'Service'

  const isRecurring = appointment.extendedProps?.seriesId || appointment.seriesId

  return (
    <>
      {/* Modal */}
      <div 
        className="appointment-detail-modal"
        style={{ 
          position: 'fixed',
          zIndex: 10000,
          left: position ? Math.min(position.x, window.innerWidth - 300) : '50%',
          top: position ? Math.min(position.y, window.innerHeight - 320) : '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
          width: '280px',
          maxWidth: '90vw'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showDeleteConfirm ? (
          /* Delete Confirmation */
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827', 
                margin: '0 0 16px 0' 
              }}>
                Confirm Delete
              </h3>
              <p style={{ 
                color: '#6b7280', 
                margin: '0 0 24px 0', 
                fontSize: '14px',
                lineHeight: '1.5' 
              }}>
                Are you sure you want to delete this appointment? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={onDeleteCancel}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteConfirm}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Modal */
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '14px 18px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '2px' 
                  }}>
                    {formatTime(appointment.start)} - {formatTime(appointment.end)}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    opacity: 0.9 
                  }}>
                    {formatDate(appointment.start)}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    color: 'white',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: '16px',
                    marginTop: '2px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
              {/* Client Info */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    marginRight: '10px'
                  }}
                >
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#111827', 
                    margin: '0 0 2px 0' 
                  }}>
                    {clientName}
                  </h3>
                  {clientPhone && (
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '13px', 
                      margin: '0' 
                    }}>
                      {clientPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ 
                    display: 'block',
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: '#6b7280', 
                    marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Staff
                  </span>
                  <p style={{ 
                    color: '#111827', 
                    fontSize: '14px', 
                    margin: '0',
                    fontWeight: '400'
                  }}>
                    {staffName}
                  </p>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <span style={{ 
                    display: 'block',
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: '#6b7280', 
                    marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Service
                  </span>
                  <p style={{ 
                    color: '#111827', 
                    fontSize: '14px', 
                    margin: '0',
                    fontWeight: '400'
                  }}>
                    {serviceName}
                  </p>
                </div>

                {appointment.extendedProps?.notes && (
                  <div>
                    <span style={{ 
                      display: 'block',
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#6b7280', 
                      marginBottom: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Notes
                    </span>
                    <p style={{ 
                      color: '#111827', 
                      fontSize: '14px', 
                      margin: '0',
                      lineHeight: '1.4'
                    }}>
                      {appointment.extendedProps.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ 
              padding: '10px 16px', 
              backgroundColor: '#f9fafb', 
              borderTop: '1px solid #e5e7eb' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {isRecurring ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={onEditThisAppointment}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      Edit This
                    </button>
                    <button
                      onClick={onEditEntireSeries}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#8b5cf6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                    >
                      Edit Series
                    </button>
                    <button
                      onClick={onViewAllInSeries}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
                    >
                      View All
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onEdit(appointment)}
                    style={{
                      padding: '10px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: '#3b82f6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      minWidth: '80px',
                      flex: '1'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Edit
                  </button>
                )}
                
                <button
                  onClick={() => onDelete(appointment)}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    minWidth: '80px',
                    flex: '1'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}