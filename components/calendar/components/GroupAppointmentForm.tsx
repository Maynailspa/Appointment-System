// components/calendar/components/GroupAppointmentForm.tsx

import React, { useState, useEffect } from 'react'
import { StaffMember, Service, GroupAppointmentMember, AppointmentFormState } from '../types/calendar.types'
import { getWeekDates, generateTimeSlots } from '../utils/dateHelpers'
import RecurringAppointmentForm from './RecurringAppointmentForm'

interface Props {
  teamMembers: StaffMember[]
  filteredServices: Service[]
  selectedClient: string
  appointmentDate: Date
  onAddMember: (member: GroupAppointmentMember) => void
  onRemoveMember: (staffId: string) => void
  onUpdateMember: (staffId: string, updates: Partial<GroupAppointmentMember>) => void
  groupMembers: GroupAppointmentMember[]
  // Client selection props
  filteredClients: any[]
  searchQuery: string
  onClientSearch: (query: string) => void
  onClientSelect: (clientId: string) => void
  onClientClear: () => void
  isWalkIn: boolean
  onWalkInToggle: (isWalkIn: boolean) => void
  // Client creation props
  showAddClientForm: boolean
  setShowAddClientForm: (show: boolean) => void
  newClientForm: any
  setNewClientForm: (form: any) => void
  isPhoneNumber: (str: string) => boolean
  formatPhoneForDisplay: (phone: string) => string
  // Date/Time props
  appointmentTimeSlot: { start: string; end: string } | null
  onDateChange: (date: Date) => void
  onTimeChange: (startTime: string, duration: number) => void
  formState: any
  onFormUpdate: <K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) => void
}

export default function GroupAppointmentForm({
  teamMembers,
  filteredServices,
  selectedClient,
  appointmentDate,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  groupMembers,
  // Client selection props
  filteredClients,
  searchQuery,
  onClientSearch,
  onClientSelect,
  onClientClear,
  isWalkIn,
  onWalkInToggle,
  // Client creation props
  showAddClientForm,
  setShowAddClientForm,
  newClientForm,
  setNewClientForm,
  isPhoneNumber,
  formatPhoneForDisplay,
  // Date/Time props
  appointmentTimeSlot,
  onDateChange,
  onTimeChange,
  formState,
  onFormUpdate
}: Props) {
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState(formState.selectedStaff || '')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')

  // Update startTime when appointmentTimeSlot changes
  useEffect(() => {
    if (appointmentTimeSlot) {
      const startDate = new Date(appointmentTimeSlot.start)
      const hours = startDate.getHours().toString().padStart(2, '0')
      const minutes = startDate.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`
      setStartTime(timeString)
      
      // Also update duration
      const endDate = new Date(appointmentTimeSlot.end)
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      setDuration(durationMinutes.toString())
    }
  }, [appointmentTimeSlot])
  
  // Client creation state
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    phone: '',
    submit: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<any>(null)

  // Filter out staff that are already in the group
  useEffect(() => {
    const usedStaffIds = groupMembers.map(member => member.staffId)
    setAvailableStaff(teamMembers.filter(staff => !usedStaffIds.includes(staff.id)))
  }, [teamMembers, groupMembers])

  // Update selectedStaffId when formState.selectedStaff changes
  useEffect(() => {
    if (formState.selectedStaff && !selectedStaffId) {
      setSelectedStaffId(formState.selectedStaff)
    }
  }, [formState.selectedStaff, selectedStaffId])

  const handleAddMember = () => {
    if (!selectedStaffId || selectedServices.length === 0) return

    const staff = teamMembers.find(s => s.id === selectedStaffId)
    if (!staff) return

    const selectedServicesDetails = filteredServices.filter(service => 
      selectedServices.includes(service.name)
    )

    const totalPrice = selectedServicesDetails.reduce((sum, service) => sum + service.price, 0)
    const selectedDuration = parseInt(duration)

    const startDate = new Date(appointmentDate)
    const [hours, minutes] = startTime.split(':').map(Number)
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + selectedDuration)

    const member: GroupAppointmentMember = {
      staffId: selectedStaffId,
      staffName: staff.name,
      services: selectedServices,
      startTime: startTime,
      endTime: endDate.toTimeString().slice(0, 5),
      duration: selectedDuration,
      price: totalPrice
    }

    onAddMember(member)
    
    // Reset form (but keep the start time)
    setSelectedStaffId('')
    setSelectedServices([])
    // Don't reset startTime - keep the original selected time
    // Don't reset duration - keep the calculated duration
  }

  const calculateSelectedServicesDuration = () => {
    const selectedServicesDetails = filteredServices.filter(service => 
      selectedServices.includes(service.name)
    )
    return selectedServicesDetails.reduce((sum, service) => sum + service.duration, 0)
  }

  const handleServiceToggle = (serviceName: string) => {
    const newSelectedServices = selectedServices.includes(serviceName) 
      ? selectedServices.filter(s => s !== serviceName)
      : [...selectedServices, serviceName]
    
    setSelectedServices(newSelectedServices)
    
    // Calculate new duration from selected services
    const selectedServicesDetails = filteredServices.filter(service => 
      newSelectedServices.includes(service.name)
    )
    const newDuration = selectedServicesDetails.reduce((sum, service) => sum + service.duration, 0)
    
    // Update duration if services are selected, otherwise keep current duration
    if (newDuration > 0) {
      setDuration(newDuration.toString())
    }
  }

  const calculateTotalDuration = () => {
    return groupMembers.reduce((sum, member) => sum + member.duration, 0)
  }

  const calculateTotalPrice = () => {
    return groupMembers.reduce((sum, member) => sum + member.price, 0)
  }

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as 123-456-7890
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  // Client creation handlers
  const handleInputChange = (field: string, value: string) => {
    // Format phone number as user types
    if (field === 'phone') {
      const formattedValue = formatPhoneNumber(value)
      setNewClientForm(prev => ({ ...prev, [field]: formattedValue }))
    } else {
      setNewClientForm(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTagToggle = (tag: string) => {
    setNewClientForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const validateForm = () => {
    const errors = {
      firstName: '',
      phone: '',
      submit: ''
    }

    if (!newClientForm.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!newClientForm.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^\d{3}-\d{3}-\d{4}$/.test(newClientForm.phone)) {
      errors.phone = 'Please enter a valid phone number (123-456-7890)'
    }

    setFormErrors(errors)
    return !errors.firstName && !errors.phone
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClientForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      const customer = await response.json()
      
      // Store the newly created client data for immediate display
      const newClient = {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth,
        notes: customer.notes,
        tags: customer.tags || []
      }
      
      // Store the newly created client for immediate display
      setNewlyCreatedClient(newClient)
      
      // Set the newly created client as the selected client
      onClientSelect(customer.id)
      onWalkInToggle(false)
      
      // Close the form and reset form
      setShowAddClientForm(false)
      setNewClientForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        tags: []
      })
      setFormErrors({})
      
    } catch (error) {
      console.error('Error adding client:', error)
      setFormErrors({ submit: error instanceof Error ? error.message : 'Failed to create client' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowAddClientForm(false)
    setNewClientForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      notes: '',
      tags: []
    })
    setFormErrors({})
  }

  const timeSlots = generateTimeSlots()

  // Helper functions for time/duration handling
  const getDefaultTime = () => {
    if (appointmentTimeSlot) {
      const startDate = new Date(appointmentTimeSlot.start)
      const hours = startDate.getHours().toString().padStart(2, '0')
      const minutes = startDate.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`
      return timeString
    }
    return '09:00'
  }
  
  const getClosestTimeSlot = (targetTime: string) => {
    const timeSlots = generateTimeSlots()
    const targetMinutes = parseInt(targetTime.split(':')[0]) * 60 + parseInt(targetTime.split(':')[1])
    
    let closestSlot = timeSlots[0]
    let minDifference = Math.abs(parseInt(closestSlot.value.split(':')[0]) * 60 + parseInt(closestSlot.value.split(':')[1]) - targetMinutes)
    
    for (const slot of timeSlots) {
      const slotMinutes = parseInt(slot.value.split(':')[0]) * 60 + parseInt(slot.value.split(':')[1])
      const difference = Math.abs(slotMinutes - targetMinutes)
      if (difference < minDifference) {
        minDifference = difference
        closestSlot = slot
      }
    }
    
    return closestSlot.value
  }

  const getDefaultDuration = () => {
    if (appointmentTimeSlot) {
      const startDate = new Date(appointmentTimeSlot.start)
      const endDate = new Date(appointmentTimeSlot.end)
      const duration = (endDate.getTime() - startDate.getTime()) / 1000 / 60
      return duration.toString()
    }
    return '60'
  }

  const handleDateChange = (date: Date) => {
    onFormUpdate('appointmentDate', date)
    onDateChange(date) // Update the appointment time slot
    onFormUpdate('showWeekPicker', false) // Close the calendar popup
    const dateInput = document.getElementById('appointment-date') as HTMLInputElement
    if (dateInput) {
      dateInput.value = date.toISOString().split('T')[0]
    }
  }

  // Handle clicking outside the calendar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formState.showWeekPicker) {
        const target = event.target as Element
        // Check if click is outside the calendar icon and dropdown
        const calendarIcon = document.querySelector('[data-calendar-icon]')
        const calendarDropdown = document.querySelector('[data-calendar-dropdown]')
        
        if (calendarIcon && calendarDropdown) {
          const isClickInsideIcon = calendarIcon.contains(target)
          const isClickInsideDropdown = calendarDropdown.contains(target)
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            onFormUpdate('showWeekPicker', false)
          }
        }
      }
    }

    if (formState.showWeekPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [formState.showWeekPicker, onFormUpdate])

  return (
    <div style={{ padding: '20px' }}>
      {/* Calendar Icon */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '16px',
        position: 'relative'
      }}>
        <div
          data-calendar-icon
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '20px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={(e) => {
            e.stopPropagation()
            onFormUpdate('showWeekPicker', !formState.showWeekPicker)
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#7c3aed'
            e.currentTarget.style.background = '#f9f5ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.background = 'white'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#6b7280">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>

        {/* Month Picker Dropdown */}
        {formState.showWeekPicker && (
          <div 
            data-calendar-dropdown
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
              padding: '24px',
              zIndex: 9999,
              minWidth: '380px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Month Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newDate = new Date(formState.appointmentDate)
                  newDate.setMonth(newDate.getMonth() - 1)
                  onFormUpdate('appointmentDate', newDate)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#374151'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>

              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {formState.appointmentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newDate = new Date(formState.appointmentDate)
                  newDate.setMonth(newDate.getMonth() + 1)
                  onFormUpdate('appointmentDate', newDate)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#374151'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}>
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  padding: '8px 4px'
                }}>
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {(() => {
                const year = formState.appointmentDate.getFullYear()
                const month = formState.appointmentDate.getMonth()
                const firstDay = new Date(year, month, 1)
                const lastDay = new Date(year, month + 1, 0)
                const startDate = new Date(firstDay)
                startDate.setDate(startDate.getDate() - firstDay.getDay())

                const days = []
                for (let i = 0; i < 42; i++) {
                  const date = new Date(startDate)
                  date.setDate(startDate.getDate() + i)
                  const isCurrentMonth = date.getMonth() === month
                  const isToday = new Date().toDateString() === date.toDateString()
                  const isSelected = formState.appointmentDate.toDateString() === date.toDateString()

                  days.push(
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDateChange(date)
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        border: 'none',
                        borderRadius: '8px',
                        background: isSelected ? '#7c3aed' : isToday ? '#f3e8ff' : 'transparent',
                        color: isSelected ? 'white' : isCurrentMonth ? '#111827' : '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isSelected || isToday ? '600' : '400',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isCurrentMonth ? '#f3f4f6' : 'transparent'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isSelected ? '#7c3aed' : isToday ? '#f3e8ff' : 'transparent'
                        }
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                }
                return days
              })()}
            </div>
          </div>
        )}

        {/* Hidden date input for compatibility */}
        <input
          type="hidden"
          id="appointment-date"
          value={formState.appointmentDate.toISOString().split('T')[0]}
        />
      </div>

      {/* Date & Time Section */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        {/* Selected Time Display (if available) */}
        {appointmentTimeSlot ? (
          <>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '4px'
            }}>
              {new Date(appointmentTimeSlot.start).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '16px'
            }}>
              {new Date(appointmentTimeSlot.start).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} - {new Date(appointmentTimeSlot.end).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
              {' • '}
              {(() => {
                const duration = (new Date(appointmentTimeSlot.end).getTime() - new Date(appointmentTimeSlot.start).getTime()) / 1000 / 60
                return `${duration} minutes`
              })()}
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '4px'
            }}>
              Select Date & Time
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '16px'
            }}>
              Choose when you'd like to schedule this appointment
            </div>
          </>
        )}
        
        {/* Time Picker Interface (always visible) */}
        <div>
          {/* Week View Picker */}
          <div className="week-picker-container" style={{ position: 'relative' }}>
            {/* Week Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => {
                  const newDate = new Date(formState.appointmentDate)
                  newDate.setDate(newDate.getDate() - 7)
                  onFormUpdate('appointmentDate', newDate)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={() => onFormUpdate('showWeekPicker', !formState.showWeekPicker)}
              >
                {formState.appointmentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                <svg 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    fill: '#6b7280',
                    transform: formState.showWeekPicker ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out'
                  }} 
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
              
              <button
                onClick={() => {
                  const newDate = new Date(formState.appointmentDate)
                  newDate.setDate(newDate.getDate() + 7)
                  onFormUpdate('appointmentDate', newDate)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            </div>

            {/* Week Days */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              {getWeekDates(formState.appointmentDate).map((date, index) => {
                const isToday = new Date().toDateString() === date.toDateString()
                const isSelected = formState.appointmentDate.toDateString() === date.toDateString()
                
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleDateChange(date)
                    }}
                  >
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </div>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      background: isSelected ? '#7c3aed' : isToday ? 'transparent' : 'transparent',
                      color: isSelected ? 'white' : isToday ? '#7c3aed' : '#1f2937',
                      fontWeight: isSelected || isToday ? '600' : '400',
                      fontSize: '14px',
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
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>


        </div>
      </div>

      {/* Add New Member Form */}
      <div style={{
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: 'white',
        marginBottom: '24px'
      }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#374151'
        }}>
          Add Staff Member
        </h4>

        {/* Staff Selection */}
        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="">Choose a staff member...</option>
            {availableStaff
              .sort((a, b) => {
                const priorityA = a.priority || 50
                const priorityB = b.priority || 50
                if (priorityA !== priorityB) {
                  return priorityA - priorityB
                }
                // If priorities are equal, sort by name
                return a.name.localeCompare(b.name)
              })
              .map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
          </select>
        </div>

        {/* Services Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151' 
          }}>
            Select Services
          </label>
          <div style={{ display: 'grid', gap: '8px' }}>
            {filteredServices.map((service) => (
              <label key={service.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: selectedServices.includes(service.name) ? '#eff6ff' : 'white'
              }}>
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.name)}
                  onChange={() => handleServiceToggle(service.name)}
                  style={{ marginRight: '8px' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#000000' }}>{service.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {service.duration} min
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Time and Duration Selection */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* Start Time */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151' 
            }}>
              Start Time
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              {generateTimeSlots().map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.display}
                </option>
              ))}
            </select>
          </div>
          
          {/* Duration */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151' 
            }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              {(() => {
                const calculatedDuration = calculateSelectedServicesDuration()
                const availableOptions = [15, 20, 30, 45, 60, 75, 90, 120, 135, 150, 180]
                
                // If services are selected and calculated duration is not in standard options, show it first
                if (calculatedDuration > 0 && !availableOptions.includes(calculatedDuration)) {
                  const hours = Math.floor(calculatedDuration / 60)
                  const minutes = calculatedDuration % 60
                  const displayText = hours > 0 
                    ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minutes` : ''}`
                    : `${minutes} minutes`
                  return (
                    <>
                      <option key="calculated" value={calculatedDuration.toString()}>
                        {displayText} (from services)
                      </option>
                      <option value="15">15 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="75">1 hour 15 minutes</option>
                      <option value="90">1 hour 30 minutes</option>
                      <option value="120">2 hours</option>
                      <option value="135">2 hours 15 minutes</option>
                      <option value="150">2 hours 30 minutes</option>
                      <option value="180">3 hours</option>
                    </>
                  )
                }
                
                // Standard options
                return (
                  <>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="75">1 hour 15 minutes</option>
                    <option value="90">1 hour 30 minutes</option>
                    <option value="120">2 hours</option>
                    <option value="135">2 hours 15 minutes</option>
                    <option value="150">2 hours 30 minutes</option>
                    <option value="180">3 hours</option>
                  </>
                )
              })()}
            </select>
          </div>
        </div>

        {/* Recurring Appointment Section */}
        <RecurringAppointmentForm
          isRecurring={formState.isRecurring || false}
          pattern={formState.recurringPattern}
          startDate={appointmentDate}
          onPatternChange={(pattern) => onFormUpdate('recurringPattern', pattern)}
          onToggleRecurring={(isRecurring) => onFormUpdate('isRecurring', isRecurring)}
        />

        {/* Add Member Button */}
        <button
          onClick={handleAddMember}
          disabled={!selectedStaffId || selectedServices.length === 0}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: (!selectedStaffId || selectedServices.length === 0) ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: (!selectedStaffId || selectedServices.length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          Add to Group
        </button>
      </div>

      {/* Current Group Members */}
      {groupMembers.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#374151'
          }}>
            Current Members ({groupMembers.length})
          </h4>
          <div style={{ display: 'grid', gap: '12px' }}>
            {groupMembers.map((member) => (
              <div key={member.staffId} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#1a202c' }}>
                    {member.staffName}
                  </div>
                  <button
                    onClick={() => onRemoveMember(member.staffId)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  Services: {member.services.join(', ')}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Time: {member.startTime} - {member.endTime} ({member.duration} min)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Selection Section */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#374151'
        }}>
          Client
        </h4>
        
        {selectedClient ? (
          <div style={{
            padding: '12px',
            background: '#f3e8ff',
            border: '1px solid #c084fc',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '500', color: '#581c87' }}>
                {(() => {
                  const client = filteredClients.find(c => c.id === selectedClient) || newlyCreatedClient
                  return client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'Unknown Client'
                })()}
              </div>
              <div style={{ fontSize: '13px', color: '#6b21a8' }}>
                {(() => {
                  const client = filteredClients.find(c => c.id === selectedClient) || newlyCreatedClient
                  if (!client) return ''
                  
                  let contactInfo = client.phone || ''
                  if (client.email) {
                    contactInfo += contactInfo ? ` • ${client.email}` : client.email
                  }
                  return contactInfo || 'No contact info'
                })()}
              </div>
            </div>
            <button
              onClick={onClientClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b21a8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ) : isWalkIn ? (
          <div style={{
            padding: '12px',
            background: '#dbeafe',
            border: '1px solid #60a5fa',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontWeight: '500', color: '#1d4ed8' }}>
              Walk-in Client
            </div>
            <button
              onClick={() => onWalkInToggle(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1d4ed8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ) : (
          <div>
            {/* Search field for clients */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search for client by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value
                  // Format phone numbers as user types with immediate dashes
                  let formattedValue = value
                  const digitsOnly = value.replace(/\D/g, '')
                  
                  if (digitsOnly.length > 0) {
                    if (digitsOnly.length <= 3) {
                      formattedValue = digitsOnly
                    } else if (digitsOnly.length <= 6) {
                      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`
                    } else {
                      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`
                    }
                  }
                  
                  onClientSearch(formattedValue)
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  color: '#111827',
                  outline: 'none',
                  transition: 'border-color 0.2s ease-in-out',
                  boxSizing: 'border-box',
                  marginBottom: '12px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4c6ef5'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              />
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '14px',
                  width: '16px',
                  height: '16px',
                  fill: '#6b7280'
                }}
                viewBox="0 0 24 24"
              >
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            
            {/* Search results dropdown */}
            {searchQuery && (
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
                marginBottom: '12px'
              }}>
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <div
                      key={client.id}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onClick={() => {
                        onClientSelect(client.id)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: '#111827' }}>{client.firstName} {client.lastName || ''}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {client.phone}
                        {client.email && <span> • {client.email}</span>}
                      </div>
                    </div>
                  ))
                ) : null}
                
                {/* Always show "Add [query]" button when there's a search query */}
                {searchQuery && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: filteredClients.length > 0 ? '12px 20px' : '20px', 
                    color: '#6b7280',
                    borderTop: filteredClients.length > 0 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    {filteredClients.length === 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        No clients found
                      </div>
                    )}
                    <button
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #7c3aed',
                        borderRadius: '6px',
                        background: '#7c3aed',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        // Pre-fill the form based on search query
                        const searchQueryTrimmed = searchQuery.trim()
                        if (isPhoneNumber(searchQueryTrimmed)) {
                          // If it's a phone number, put it in the phone field
                          setNewClientForm({
                            firstName: '',
                            lastName: '',
                            email: '',
                            phone: formatPhoneForDisplay(searchQueryTrimmed),
                            dateOfBirth: '',
                            notes: '',
                            preferredStaff: '',
                            tags: []
                          })
                        } else {
                          // If it's a name, try to split it and put in name fields
                          const nameParts = searchQueryTrimmed.split(' ')
                          const firstName = nameParts[0] || ''
                          const lastName = nameParts.slice(1).join(' ') || ''
                          setNewClientForm({
                            firstName,
                            lastName,
                            email: '',
                            phone: '',
                            dateOfBirth: '',
                            notes: '',
                            preferredStaff: '',
                            tags: []
                          })
                        }
                        setShowAddClientForm(true)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#6b21a8'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#7c3aed'
                      }}
                    >
                      Add: {searchQuery}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #7c3aed',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => {
                  // Pre-fill the form based on search query if available
                  const searchQueryTrimmed = searchQuery.trim()
                  if (searchQueryTrimmed) {
                    if (isPhoneNumber(searchQueryTrimmed)) {
                      // If it's a phone number, put it in the phone field
                      setNewClientForm({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: formatPhoneForDisplay(searchQueryTrimmed),
                        dateOfBirth: '',
                        notes: '',
                        tags: []
                      })
                    } else {
                      // If it's a name, try to split it and put in name fields
                      const nameParts = searchQueryTrimmed.split(' ')
                      const firstName = nameParts[0] || ''
                      const lastName = nameParts.slice(1).join(' ') || ''
                      setNewClientForm({
                        firstName,
                        lastName,
                        email: '',
                        phone: '',
                        dateOfBirth: '',
                        notes: '',
                        tags: []
                      })
                    }
                  } else {
                    // Clear the form if no search query
                    setNewClientForm({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      dateOfBirth: '',
                      notes: '',
                      tags: []
                    })
                  }
                  setShowAddClientForm(true)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#6b21a8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7c3aed'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add New Client
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  transition: 'all 0.2s'
                }}
                onClick={() => onWalkInToggle(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7c3aed'
                  e.currentTarget.style.color = '#7c3aed'
                  e.currentTarget.style.background = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.color = '#374151'
                  e.currentTarget.style.background = 'white'
                }}
              >
                Walk-in
              </button>
            </div>
          </div>
        )}
        
        {/* Add Client Form */}
        {showAddClientForm && (
          <div style={{
            marginTop: '16px',
            padding: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a202c',
                margin: '0'
              }}>
                Add New Client
              </h4>
              <button
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Personal Information */}
                <div>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 12px 0'
                  }}>
                    Personal Information
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newClientForm.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: formErrors.firstName ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.firstName ? '#dc2626' : '#d1d5db'
                        }}
                      />
                      {formErrors.firstName && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: '#dc2626'
                        }}>
                          {formErrors.firstName}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newClientForm.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 12px 0'
                  }}>
                    Contact Information
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={newClientForm.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: formErrors.phone ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.phone ? '#dc2626' : '#d1d5db'
                        }}
                      />
                      {formErrors.phone && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: '#dc2626'
                        }}>
                          {formErrors.phone}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={newClientForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 12px 0'
                  }}>
                    Additional Information
                  </h5>
                  <div style={{ display: 'grid', gap: '12px' }}>
                                      <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={newClientForm.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white',
                        outline: 'none',
                        transition: 'border-color 0.2s ease-in-out',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4c6ef5'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                      }}
                    />
                  </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Notes
                      </label>
                      <textarea
                        value={newClientForm.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          resize: 'vertical',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 12px 0'
                  }}>
                    Tags
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['New', 'Regular', 'VIP'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        style={{
                          padding: '6px 12px',
                          border: newClientForm.tags.includes(tag) ? '1px solid #7c3aed' : '1px solid #d1d5db',
                          borderRadius: '20px',
                          background: newClientForm.tags.includes(tag) ? '#f3e8ff' : 'white',
                          color: newClientForm.tags.includes(tag) ? '#7c3aed' : '#374151',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!newClientForm.tags.includes(tag)) {
                            e.currentTarget.style.background = '#f9fafb'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!newClientForm.tags.includes(tag)) {
                            e.currentTarget.style.background = 'white'
                          }
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      background: isSubmitting ? '#9ca3af' : '#7c3aed',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.background = '#6b21a8'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.background = '#7c3aed'
                      }
                    }}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Client'}
                  </button>
                </div>

                {/* Error Message */}
                {formErrors.submit && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#dc2626',
                    fontSize: '12px'
                  }}>
                    {formErrors.submit}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Current Group Members */}


      {/* Time Management Options */}
      {groupMembers.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#f9fafb'
          }}>
            <input
              type="checkbox"
              style={{ marginRight: '12px' }}
            />
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                Schedule staff members back-to-back
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                (If checked, automatically adjust times to avoid gaps)
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  )
} 