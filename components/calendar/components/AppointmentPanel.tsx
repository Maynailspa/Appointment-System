// components/calendar/components/AppointmentPanel.tsx

import React, { useState, useEffect, useRef } from 'react'
import { AppointmentType, StaffMember, Client, Service, AppointmentFormState, GroupAppointmentMember } from '../types/calendar.types'
import { getWeekDates, generateTimeSlots } from '../utils/dateHelpers'
import GroupAppointmentForm from './GroupAppointmentForm'
import RecurringAppointmentForm from './RecurringAppointmentForm'
import BlockTimeDatePicker from './BlockTimeDatePicker'

// Add CSS animations
const panelStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  .appointment-panel-backdrop {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .appointment-panel-slide {
    animation: slideIn 0.3s ease-out;
  }
`

interface Props {
  show: boolean
  appointmentType: AppointmentType
  appointmentTimeSlot: { start: string; end: string } | null
  teamMembers: StaffMember[]
  onClose: () => void
  onCreate: () => void
  onEditTimeSlot: () => void
  onDateChange: (date: Date) => void
  onTimeChange: (startTime: string, duration: number) => void
  formState: AppointmentFormState
  onFormUpdate: <K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) => void
  onClientSearch: (query: string) => void
  onClientAdded: () => void
  filteredClients: Client[]
  filteredServices: Service[]
  selectedServicesDetails: (Service | undefined)[]
  totalDuration: number
  totalPrice: number
  isEditMode?: boolean
  isSeriesEditMode?: boolean
  isCreatingAppointment?: boolean
}

export default function AppointmentPanel({
  show,
  appointmentType,
  appointmentTimeSlot,
  teamMembers,
  onClose,
  onCreate,
  onEditTimeSlot,
  onDateChange,
  onTimeChange,
  formState,
  onFormUpdate,
  onClientSearch,
  onClientAdded,
  filteredClients,
  filteredServices,
  selectedServicesDetails,
  totalDuration,
  totalPrice,
  isEditMode = false,
  isSeriesEditMode = false,
  isCreatingAppointment = false,
}: Props) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Add Client Form State
  const [showAddClientForm, setShowAddClientForm] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: '',
    preferredStaff: '',
    tags: [] as string[]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Ref for the calendar component
  const calendarRef = useRef<HTMLDivElement>(null)

  // Click outside handler for calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onFormUpdate('showWeekPicker', false)
      }
    }

    if (formState.showWeekPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [formState.showWeekPicker, onFormUpdate])

  // Available tags for selection
  const availableTags = ['New', 'Regular', 'VIP']

  // Form handling functions
  const handleInputChange = (field: string, value: string) => {
    let processedValue = value
    
    // Format phone number if it's the phone field
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value)
    }
    
    setNewClientForm(prev => ({ ...prev, [field]: processedValue }))
    // Clear error when user starts typing
    if (formErrors[field]) {
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

  // Helper function to format phone number as 123-456-7890
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format based on length
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!newClientForm.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    if (!newClientForm.phone.trim()) {
      errors.phone = 'Phone number is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
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
      
      // Set the newly created client as the selected client
      onFormUpdate('selectedClient', customer.id)
      onFormUpdate('isWalkIn', false)
      
      // Close the form and reset form
      setShowAddClientForm(false)
      setNewClientForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        preferredStaff: '',
        tags: []
      })
      setFormErrors({})
      
      // Notify parent component to refresh client list
      onClientAdded()
      
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
      preferredStaff: '',
      tags: []
    })
    setFormErrors({})
    // If this panel was opened from another tab/screen, closing should return to previous page
    try {
      // Only navigate back if panel is a full-screen slideout route
      if (typeof window !== 'undefined' && window.history.length > 1) {
        // Use history.back so user returns to their previous context
        window.history.back()
      }
    } catch {}
  }

  if (!show) return null

  // Calculate the default time and duration from the appointment time slot
  const getDefaultTime = () => {
    if (appointmentTimeSlot) {
      const startDate = new Date(appointmentTimeSlot.start)
      console.log('getDefaultTime - appointmentTimeSlot:', appointmentTimeSlot)
      console.log('getDefaultTime - startDate:', startDate.toLocaleString())
      console.log('getDefaultTime - hours:', startDate.getHours(), 'minutes:', startDate.getMinutes())
      
      // Return in 24-hour format to match the time slot values
      const hours = startDate.getHours().toString().padStart(2, '0')
      const minutes = startDate.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`
      
      console.log('getDefaultTime - returning (24-hour format):', timeString)
      return timeString
    }
    return '09:00'
  }
  
  // Find the closest available time slot
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
    
    console.log('getClosestTimeSlot - target:', targetTime, 'closest:', closestSlot.value)
    return closestSlot.value
  }

  const getDefaultDuration = () => {
    if (appointmentTimeSlot) {
      const startDate = new Date(appointmentTimeSlot.start)
      const endDate = new Date(appointmentTimeSlot.end)
      const duration = (endDate.getTime() - startDate.getTime()) / 1000 / 60
      console.log('getDefaultDuration calculated:', duration, 'minutes from time slot:', appointmentTimeSlot)
      return duration.toString()
    }
    console.log('getDefaultDuration: no time slot, returning 60')
    return '60'
  }

  // Helper function to detect if a string is a phone number
  const isPhoneNumber = (str: string) => {
    // Remove all non-digit characters
    const digitsOnly = str.replace(/\D/g, '')
    // Check if it's all digits and at least 3 characters (area code minimum)
    // Also check if it contains any letters (if it does, it's likely a name)
    const hasLetters = /[a-zA-Z]/.test(str)
    return digitsOnly.length >= 3 && !hasLetters
  }

  // Helper function to format phone number for display
  const formatPhoneForDisplay = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length === 10) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`
    }
    return phone
  }

  // Group appointment handlers
  const handleAddGroupMember = (member: GroupAppointmentMember) => {
    const currentMembers = formState.groupMembers || []
    onFormUpdate('groupMembers', [...currentMembers, member])
  }

  const handleRemoveGroupMember = (staffId: string) => {
    const currentMembers = formState.groupMembers || []
    onFormUpdate('groupMembers', currentMembers.filter(member => member.staffId !== staffId))
  }

  const handleUpdateGroupMember = (staffId: string, updates: Partial<GroupAppointmentMember>) => {
    const currentMembers = formState.groupMembers || []
    onFormUpdate('groupMembers', currentMembers.map(member => 
      member.staffId === staffId ? { ...member, ...updates } : member
    ))
  }

  const handleDateChange = (date: Date) => {
    onFormUpdate('appointmentDate', date)
    onDateChange(date) // Update the appointment time slot
    onFormUpdate('showWeekPicker', false) // Close the calendar popup
    
    // For full-day block appointments, also update startDate and endDate
    if (appointmentType === 'blocked' && formState.blockType === 'full') {
      onFormUpdate('startDate', date)
      onFormUpdate('endDate', date)
    }
    
    const dateInput = document.getElementById('appointment-date') as HTMLInputElement
    if (dateInput) {
      dateInput.value = date.toISOString().split('T')[0]
    }
  }

  // Fallback services in case filteredServices is empty
  const servicesToShow = (filteredServices && Array.isArray(filteredServices) && filteredServices.length > 0) ? filteredServices : [
    { id: '1', name: 'Fill', price: 45, duration: 45, category: 'Nails' },
    { id: '2', name: 'Pedicure', price: 35, duration: 60, category: 'Nails' },
    { id: '3', name: 'Manicure', price: 25, duration: 20, category: 'Nails' },
    { id: '4', name: 'Eyelashes', price: 75, duration: 75, category: 'Beauty' },
    { id: '5', name: 'Facial', price: 65, duration: 45, category: 'Skincare' },
    { id: '6', name: 'Massage', price: 90, duration: 30, category: 'Wellness' },
  ]
  
  console.log('=== APPOINTMENT PANEL DEBUG ===')
  console.log('filteredServices:', filteredServices)
  console.log('servicesToShow:', servicesToShow)
  console.log('formState.selectedServices:', formState.selectedServices)
  


  return (
    <>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: panelStyles }} />
      


      {/* Slide-out Panel */}
      <div 
        className="appointment-panel appointment-panel-slide"
                  style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: isMobile ? '100vw' : '480px',
            height: '100vh',
            background: 'white',
            boxShadow: isMobile ? 'none' : '-10px 0 30px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            overflowX: 'hidden',
            maxWidth: '100vw'
          }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px' : '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827'
          }}>
            {isSeriesEditMode ? 'Edit Recurring Series' : isEditMode ? 'Update Appointment' : (
              <>
                {appointmentType === 'single' && 'New Appointment'}
                {appointmentType === 'group' && 'New Group Appointment'}
                {appointmentType === 'blocked' && 'Block Time'}
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: '#6b7280',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
              e.currentTarget.style.color = '#111827'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'visible',
          padding: isMobile ? '16px' : '24px',
          position: 'relative'
        }}>
                        {/* Series Information Display (only for series edit mode) */}
          {isSeriesEditMode && (
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>
                Series Information
              </h3>
              <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                <div>Client: {(() => {
                  if (formState.isWalkIn) return 'Walk-in Client'
                  const client = filteredClients.find(c => c.id === formState.selectedClient)
                  return client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'No client selected'
                })()}</div>
                <div>Staff: {(() => {
                  if (!formState.selectedStaff) return 'Any available staff'
                  const staff = teamMembers.find(s => s.id === formState.selectedStaff)
                  return staff ? `${staff.name} - ${staff.role}` : 'Staff not found'
                })()}</div>
                <div>Service: {(() => {
                  if (!formState.selectedServices || formState.selectedServices.length === 0) return 'No services selected'
                  const serviceNames = formState.selectedServices.map(serviceId => {
                    const service = servicesToShow.find(s => s.id === serviceId)
                    return service ? service.name : 'Unknown service'
                  })
                  return serviceNames.join(', ')
                })()}</div>
              </div>
            </div>
          )}

          {/* Group Appointment Form */}
          {appointmentType === 'group' ? (
            <GroupAppointmentForm
              teamMembers={teamMembers}
              filteredServices={servicesToShow}
              selectedClient={formState.selectedClient}
              appointmentDate={formState.appointmentDate}
              onAddMember={handleAddGroupMember}
              onRemoveMember={handleRemoveGroupMember}
              onUpdateMember={handleUpdateGroupMember}
              groupMembers={formState.groupMembers || []}
              // Client selection props
              filteredClients={filteredClients}
              searchQuery={formState.searchQuery}
              onClientSearch={onClientSearch}
              onClientSelect={(clientId) => onFormUpdate('selectedClient', clientId)}
              onClientClear={() => onFormUpdate('selectedClient', '')}
              isWalkIn={formState.isWalkIn}
              onWalkInToggle={(isWalkIn) => onFormUpdate('isWalkIn', isWalkIn)}
              // Client creation props
              showAddClientForm={showAddClientForm}
              setShowAddClientForm={setShowAddClientForm}
              newClientForm={newClientForm}
              setNewClientForm={setNewClientForm}
              isPhoneNumber={isPhoneNumber}
              formatPhoneForDisplay={formatPhoneForDisplay}
              // Date/Time props
              appointmentTimeSlot={appointmentTimeSlot}
              onDateChange={onDateChange}
              onTimeChange={onTimeChange}
              formState={formState}
              onFormUpdate={onFormUpdate}
            />
          ) : (
            <>
              {/* Staff Selection (not for series edit mode) */}
              {!isSeriesEditMode && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px'
                }}>
                  Staff Member
                </h3>
                
                <select 
                  value={formState.selectedStaff}
                  onChange={(e) => onFormUpdate('selectedStaff', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c3aed'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  <option value="">Any available staff</option>
                  {teamMembers
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
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              )}
            </>
          )}

          {/* Services Section (not for blocked time, not for group appointments, and not for series edit mode) */}
          {appointmentType !== 'blocked' && appointmentType !== 'group' && !isSeriesEditMode && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>
                Services
              </h3>
               
              {/* Service Options */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px',
                marginBottom: '16px' 
              }}>
                {(servicesToShow && Array.isArray(servicesToShow) && servicesToShow.length > 0) ? (
                  servicesToShow.map((service) => (
                    <div
                      key={service.id}
                      style={{
                        padding: '12px 8px',
                        border: (formState.selectedServices || []).includes(service.id) ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: (formState.selectedServices || []).includes(service.id) ? '#f3e8ff' : 'white',
                        textAlign: 'center'
                      }}
                      onClick={() => {
                        // Create a new array of selected services
                        let newSelectedServices: string[]
                        
                        const currentServices = formState.selectedServices || []
                        const isAddingService = !currentServices.includes(service.id)
                        
                        if (isAddingService) {
                          // Add service
                          newSelectedServices = [...currentServices, service.id]
                        } else {
                          // Remove service
                          newSelectedServices = currentServices.filter(s => s !== service.id)
                        }
                        
                        // Calculate total duration using the new array
                        const totalDuration = newSelectedServices.reduce((total, serviceId) => {
                          const foundService = servicesToShow.find(s => s.id === serviceId)
                          return total + (foundService ? foundService.duration : 0)
                        }, 0)
                        
                        // Update state
                        onFormUpdate('selectedServices', newSelectedServices)
                        
                        // Only update duration when adding services, not when removing
                        if (isAddingService) {
                          onFormUpdate('appointmentDuration', totalDuration.toString())
                          console.log('Updated duration to:', totalDuration.toString())
                        } else {
                          console.log('Service removed, keeping current duration:', formState.appointmentDuration)
                        }
                        
                        // Update time with current duration (either new or existing)
                        const timeSelect = document.getElementById('appointment-time') as HTMLSelectElement
                        const startTime = timeSelect ? timeSelect.value : '09:00'
                        const durationToUse = isAddingService ? totalDuration : (parseInt(formState.appointmentDuration) || 60)
                        onTimeChange(startTime, durationToUse)
                      }}
                      onMouseEnter={(e) => {
                        if (!(formState.selectedServices || []).includes(service.id)) {
                          e.currentTarget.style.borderColor = '#7c3aed'
                          e.currentTarget.style.background = '#f9fafb'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(formState.selectedServices || []).includes(service.id)) {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.background = 'white'
                        }
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: (formState.selectedServices || []).includes(service.id) ? '#581c87' : '#111827',
                          marginBottom: '4px'
                        }}>
                          {service.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {service.name === 'Fill' && '45 minutes'}
                          {service.name === 'Pedicure' && '1 hour'}
                          {service.name === 'Manicure' && '20 minutes'}
                          {service.name === 'Eyelashes' && '1 hour 15 minutes'}
                          {service.name === 'Facial' && '45 minutes'}
                          {service.name === 'Massage' && '30 minutes'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    gridColumn: '1 / -1'
                  }}>
                    No services available. Please check your configuration.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Icon - Only for non-group appointments */}
          {appointmentType !== 'group' && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px',
              position: 'relative'
            }}>
            <div
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
                ref={calendarRef}
                className="week-picker-container" 
                                  style={{
                    position: 'absolute',
                    top: '100%',
                    marginTop: '8px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    padding: isMobile ? '16px' : '24px',
                    zIndex: 9999,
                    minWidth: isMobile ? '280px' : '380px',
                    maxWidth: isMobile ? 'calc(100vw - 32px)' : 'none',
                    left: isMobile ? '16px' : 'auto',
                    right: isMobile ? '16px' : '0'
                  }}
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
                      // For block time appointments with full days off, update the start date
                      if (appointmentType === 'blocked' && formState.blockType === 'full' && formState.startDate) {
                        const newDate = new Date(formState.startDate)
                        newDate.setMonth(newDate.getMonth() - 1)
                        onFormUpdate('startDate', newDate)
                        // Also update the appointment date to keep them in sync
                        onFormUpdate('appointmentDate', newDate)
                      } else {
                      const newDate = new Date(formState.appointmentDate)
                      newDate.setMonth(newDate.getMonth() - 1)
                      onFormUpdate('appointmentDate', newDate)
                      }
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
                    {(() => {
                      // For block time appointments with full days off, show the month of the start date
                      if (appointmentType === 'blocked' && formState.blockType === 'full' && formState.startDate) {
                        return formState.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      }
                      // Otherwise use the appointment date
                      return formState.appointmentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    })()}
                  </h3>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // For block time appointments with full days off, update the start date
                      if (appointmentType === 'blocked' && formState.blockType === 'full' && formState.startDate) {
                        const newDate = new Date(formState.startDate)
                        newDate.setMonth(newDate.getMonth() + 1)
                        onFormUpdate('startDate', newDate)
                        // Also update the appointment date to keep them in sync
                        onFormUpdate('appointmentDate', newDate)
                      } else {
                      const newDate = new Date(formState.appointmentDate)
                      newDate.setMonth(newDate.getMonth() + 1)
                      onFormUpdate('appointmentDate', newDate)
                      }
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

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#9ca3af'
                    }}>
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {(() => {
                    const today = new Date()
                    // For block time appointments with full days off, use the start date for calendar generation
                    const calendarDate = (appointmentType === 'blocked' && formState.blockType === 'full' && formState.startDate) 
                      ? formState.startDate 
                      : formState.appointmentDate
                    
                    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
                    const startDate = new Date(firstDay)
                    startDate.setDate(startDate.getDate() - firstDay.getDay())

                    const days = []
                    for (let i = 0; i < 42; i++) {
                      const date = new Date(startDate)
                      date.setDate(startDate.getDate() + i)
                      const isCurrentMonth = date.getMonth() === calendarDate.getMonth()
                      const isToday = date.getFullYear() === today.getFullYear() &&
                                     date.getMonth() === today.getMonth() &&
                                     date.getDate() === today.getDate()
                      const isSelected = (() => {
                        // For block time appointments with full days off, check against start date
                        if (appointmentType === 'blocked' && formState.blockType === 'full' && formState.startDate) {
                          return date.getFullYear() === formState.startDate.getFullYear() &&
                                 date.getMonth() === formState.startDate.getMonth() &&
                                 date.getDate() === formState.startDate.getDate()
                        }
                        // Otherwise use the appointment date
                        return date.getFullYear() === formState.appointmentDate.getFullYear() &&
                               date.getMonth() === formState.appointmentDate.getMonth() &&
                               date.getDate() === formState.appointmentDate.getDate()
                      })()

                      if (!isCurrentMonth && date > new Date(formState.appointmentDate.getFullYear(), formState.appointmentDate.getMonth() + 1, 0)) {
                        break
                      }

                      days.push(
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDateChange(date)
                            // For block time appointments, also update the start date
                            if (appointmentType === 'blocked' && formState.blockType === 'full') {
                              onFormUpdate('startDate', date)
                              // Auto-fill end date with the same date
                              onFormUpdate('endDate', date)
                            }
                          }}
                          style={{
                            width: '44px',
                            height: '44px',
                            padding: '0',
                            background: isSelected ? '#7c3aed' : 'transparent',
                            color: isSelected ? 'white' : isCurrentMonth ? '#374151' : '#d1d5db',
                            border: isToday && !isSelected ? '2px solid #d1d5db' : 'none',
                            borderRadius: '50%',
                            cursor: isCurrentMonth ? 'pointer' : 'default',
                            fontSize: '16px',
                            fontWeight: isSelected ? '600' : '400',
                            transition: 'all 0.2s ease-in-out',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected && isCurrentMonth) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                          disabled={!isCurrentMonth}
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
          </div>
          )}

          {/* Date & Time Section - Only for non-group appointments */}
          {appointmentType !== 'group' && (
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

                {/* Time and Duration Selection (hidden for full day blocks) */}
                {!(appointmentType === 'blocked' && formState.blockType === 'full') && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  marginTop: '16px'
                }}>
                  {/* Start Time */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Start Time
                    </label>
                    <select
                      id="appointment-time"
                      key={`time-${appointmentTimeSlot?.start || 'default'}`}
                      value={(() => {
                        const defaultTime = getDefaultTime()
                        const timeSlots = generateTimeSlots()
                        const exactMatch = timeSlots.find(slot => slot.value === defaultTime)
                        if (exactMatch) {
                          return defaultTime
                        } else {
                          const closestTime = getClosestTimeSlot(defaultTime)
                          console.log('No exact match for', defaultTime, 'using closest:', closestTime)
                          return closestTime
                        }
                      })()}
                      ref={(el) => {
                        if (el) {
                          console.log('Select element value:', el.value)
                          console.log('Select element options:', Array.from(el.options).map(opt => ({ value: opt.value, text: opt.text })))
                        }
                      }}
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
                      onChange={(e) => {
                        const durationSelect = document.getElementById('appointment-duration') as HTMLSelectElement
                        const duration = durationSelect ? parseInt(durationSelect.value) : 60
                        onTimeChange(e.target.value, duration)
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      {(() => {
                        const timeSlots = generateTimeSlots()
                        console.log('Available time slots:', timeSlots)
                        console.log('Current getDefaultTime():', getDefaultTime())
                        console.log('Matching slot:', timeSlots.find(slot => slot.value === getDefaultTime()))
                        return timeSlots.map(time => (
                          <option key={time.value} value={time.value}>
                            {time.display}
                          </option>
                        ))
                      })()}
                    </select>
                  </div>
                  
                  {/* Duration */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Duration
                    </label>
                    <select
                      id="appointment-duration"
                      key={formState.appointmentDuration || 'default'}
                      value={formState.appointmentDuration || getDefaultDuration()}

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
                      onChange={(e) => {
                        const timeSelect = document.getElementById('appointment-time') as HTMLSelectElement
                        const startTime = timeSelect ? timeSelect.value : '09:00'
                        onTimeChange(startTime, parseInt(e.target.value))
                        onFormUpdate('appointmentDuration', e.target.value)
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#7c3aed'
                        console.log('Current duration value:', formState.appointmentDuration, 'Type:', typeof formState.appointmentDuration)
                        console.log('Full form state:', formState)
                      }}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
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
                      <option value="210">3 hours 30 minutes</option>
                      <option value="240">4 hours</option>
                      <option value="270">4 hours 30 minutes</option>
                      <option value="300">5 hours</option>
                      <option value="330">5 hours 30 minutes</option>
                      <option value="360">6 hours</option>
                      <option value="390">6 hours 30 minutes</option>
                      <option value="420">7 hours</option>
                      {(() => {
                        const calculatedDuration = parseInt(formState.appointmentDuration) || 60
                        const availableOptions = [15, 20, 30, 45, 60, 75, 90, 120, 135, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420]
                        const isCalculatedDuration = !availableOptions.includes(calculatedDuration)
                        
                        if (isCalculatedDuration && calculatedDuration > 0) {
                          const hours = Math.floor(calculatedDuration / 60)
                          const minutes = calculatedDuration % 60
                          const displayText = hours > 0 
                            ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minutes` : ''}`
                            : `${minutes} minutes`
                          return <option key="calculated" value={calculatedDuration.toString()}>{displayText}</option>
                        }
                        return null
                      })()}
                    </select>
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
            </div>
          )}

          {/* Recurring Appointment Section (not for group appointments) */}
          {appointmentType !== 'blocked' && appointmentType !== 'group' && (
            <RecurringAppointmentForm
              isRecurring={formState.isRecurring || false}
              pattern={formState.recurringPattern}
              startDate={formState.appointmentDate}
              onPatternChange={(pattern) => onFormUpdate('recurringPattern', pattern)}
              onToggleRecurring={(isRecurring) => onFormUpdate('isRecurring', isRecurring)}
            />
          )}

          {/* Client Section (not for group appointments and not for series edit mode) */}
          {appointmentType !== 'group' && !isSeriesEditMode && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>
                 Client
              </h3>
            
            {appointmentType !== 'blocked' ? (
              <>
                {/* Show selected client or search field */}
                {formState.selectedClient ? (
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
                          const client = filteredClients.find(c => c.id === formState.selectedClient)
                          return client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'Unknown Client'
                        })()}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b21a8' }}>
                        {(() => {
                          const client = filteredClients.find(c => c.id === formState.selectedClient)
                          return client ? client.phone : ''
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => onFormUpdate('selectedClient', '')}
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
                ) : formState.isWalkIn ? (
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
                      onClick={() => onFormUpdate('isWalkIn', false)}
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
                        value={formState.searchQuery}
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
                          onFormUpdate('showClientSearch', true)
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          // Delay to allow clicking on results
                          setTimeout(() => {
                            if (!formState.selectedClient) {
                              onFormUpdate('showClientSearch', false)
                            }
                          }, 200)
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
                    {formState.showClientSearch && (
                      <div style={{
                        maxHeight: '200px',
                        overflow: 'auto',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: 'white',
                        marginBottom: '12px'
                      }}>
                        {formState.searchingClients ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                            Searching...
                          </div>
                        ) : (
                          <>

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
                                    onFormUpdate('selectedClient', client.id)
                                    onFormUpdate('showClientSearch', false)
                                    onFormUpdate('searchQuery', '')
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
                                    {String(client.phone || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                                    {client.email && <span> • {client.email}</span>}
                                  </div>
                                </div>
                              ))
                            ) : null}
                            
                            {/* Always show "Add [query]" button when there's a search query */}
                            {formState.searchQuery && (
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
                                    const searchQuery = formState.searchQuery.trim()
                                    if (isPhoneNumber(searchQuery)) {
                                      // If it's a phone number, put it in the phone field
                                      setNewClientForm({
                                        firstName: '',
                                        lastName: '',
                                        email: '',
                                        phone: formatPhoneForDisplay(searchQuery),
                                        dateOfBirth: '',
                                        notes: '',
                                        preferredStaff: '',
                                        tags: []
                                      })
                                    } else {
                                      // If it's a name, try to split it and put in name fields
                                      const nameParts = searchQuery.split(' ')
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
                                  Add: {isPhoneNumber(formState.searchQuery) ? formatPhoneForDisplay(formState.searchQuery) : formState.searchQuery}
                                </button>
                              </div>
                            )}
                          </>
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
                          const searchQuery = formState.searchQuery.trim()
                          if (searchQuery) {
                            if (isPhoneNumber(searchQuery)) {
                              // If it's a phone number, put it in the phone field
                              setNewClientForm({
                                firstName: '',
                                lastName: '',
                                email: '',
                                phone: formatPhoneForDisplay(searchQuery),
                                dateOfBirth: '',
                                notes: '',
                                preferredStaff: '',
                                tags: []
                              })
                            } else {
                              // If it's a name, try to split it and put in name fields
                              const nameParts = searchQuery.split(' ')
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
                          } else {
                            // Clear the form if no search query
                            setNewClientForm({
                              firstName: '',
                              lastName: '',
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
                        onClick={() => onFormUpdate('isWalkIn', true)}
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
                                    placeholder="123-456-7890"
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
                                    Email Address
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
                                    Tags
                                  </label>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {availableTags.map(tag => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleTagToggle(tag)}
                                        style={{
                                          padding: '4px 8px',
                                          border: newClientForm.tags.includes(tag)
                                            ? '1px solid #4c6ef5'
                                            : '1px solid #d1d5db',
                                          borderRadius: '12px',
                                          background: newClientForm.tags.includes(tag)
                                            ? '#4c6ef5'
                                            : 'white',
                                          color: newClientForm.tags.includes(tag)
                                            ? 'white'
                                            : '#6b7280',
                                          fontSize: '11px',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease-in-out'
                                        }}
                                      >
                                        {tag}
                                      </button>
                                    ))}
                                  </div>
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
                                    placeholder="Add any notes about this client..."
                                    rows={2}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      background: 'white',
                                      outline: 'none',
                                      transition: 'border-color 0.2s ease-in-out',
                                      resize: 'vertical',
                                      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
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
                          </div>

                          {/* Form Actions */}
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e2e8f0'
                          }}>
                            <button
                              type="button"
                              onClick={handleCancel}
                              style={{
                                padding: '8px 16px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                background: 'white',
                                color: '#6b7280',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#9ca3af'
                                e.currentTarget.style.color = '#374151'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#6b7280'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                background: isSubmitting ? '#9ca3af' : '#4c6ef5',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease-in-out'
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
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Block Type Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => onFormUpdate('blockType', 'partial')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        border: formState.blockType === 'partial' ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: formState.blockType === 'partial' ? '#f3e8ff' : 'white',
                        color: formState.blockType === 'partial' ? '#581c87' : '#374151',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                                          >
                        Time Off
                      </button>
                    <button
                      type="button"
                      onClick={() => onFormUpdate('blockType', 'full')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        border: formState.blockType === 'full' ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: formState.blockType === 'full' ? '#f3e8ff' : 'white',
                        color: formState.blockType === 'full' ? '#581c87' : '#374151',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Full Day(s) Off
                    </button>
                  </div>
                </div>

                                  {/* Conditional Fields Based on Block Type */}
                  {formState.blockType === 'partial' ? (
                    <>
                      {/* Repeat checkbox for partial day blocks */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
              <input
                        type="checkbox"
                        id="repeat-weekly"
                        checked={formState.repeatWeekly}
                        onChange={(e) => onFormUpdate('repeatWeekly', e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#7c3aed'
                        }}
                      />
                      <label
                        htmlFor="repeat-weekly"
                        style={{
                          fontSize: '14px',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        Repeat
                      </label>
                    </div>
                    
                    {/* Repeat until date field (shown when repeat is checked) */}
                    {formState.repeatWeekly && (
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
                          Repeat until
                        </label>
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <input
                            type="date"
                            value={formState.repeatUntil ? formState.repeatUntil.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const date = e.target.value ? (() => {
                                // Create date in local timezone to avoid timezone issues
                                const [year, month, day] = e.target.value.split('-').map(Number)
                                return new Date(year, month - 1, day) // month is 0-indexed
                              })() : null
                              onFormUpdate('repeatUntil', date)
                            }}
                            min={formState.appointmentDate.toISOString().split('T')[0]}
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
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Date range fields for full days off */}
                    <BlockTimeDatePicker
                      value={formState.startDate}
                      onChange={(date) => {
                        onFormUpdate('startDate', date)
                        // Auto-fill end date with the same date
                        if (date) {
                          onFormUpdate('endDate', date)
                          // Update the calendar interface to show the selected date
                          onFormUpdate('appointmentDate', date)
                        }
                      }}
                      label="Start Date"
                      placeholder="Select start date"
                    />
                    
                    <BlockTimeDatePicker
                      value={formState.endDate}
                      onChange={(date) => {
                        onFormUpdate('endDate', date)
                      }}
                      label="End Date"
                      minDate={formState.startDate || undefined}
                      placeholder="Select end date"
                    />
                    

                  </>
                )}
              </>
            )}
          </div>
          )}

          {/* Notes Section (not for group appointments) */}
          {appointmentType !== 'group' && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>
                Notes
              </h3>
                          <textarea
                placeholder="Add any special instructions or notes..."
                value={formState.appointmentNotes}
                onChange={(e) => {
                  console.log('Notes changed to:', e.target.value)
                  onFormUpdate('appointmentNotes', e.target.value)
                }}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                color: '#111827',
                outline: 'none',
                resize: 'vertical',
                fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                transition: 'border-color 0.2s ease-in-out',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#4c6ef5'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
            />
          </div>
          )}

          {/* Footer Actions */}
          <div style={{
            padding: isMobile ? '16px' : '24px',
            paddingBottom: isMobile ? 'max(32px, calc(24px + env(safe-area-inset-bottom)))' : '24px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
            minHeight: isMobile ? 'calc(100px + env(safe-area-inset-bottom))' : 'auto'
          }}>
            {/* Summary */}
            {appointmentType === 'group' && (formState.groupMembers || []).length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Group Members</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{(formState.groupMembers || []).length} staff</div>
                </div>

              </div>
            )}

            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
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
                onClick={onCreate}
                disabled={isCreatingAppointment}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isCreatingAppointment ? '#9ca3af' : '#7c3aed',
                  cursor: isCreatingAppointment ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  transition: 'all 0.2s',
                  opacity: isCreatingAppointment ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isCreatingAppointment) {
                    e.currentTarget.style.background = '#6b21a8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreatingAppointment) {
                    e.currentTarget.style.background = '#7c3aed'
                  }
                }}
              >
                {isCreatingAppointment 
                  ? 'Creating...' 
                  : (isEditMode ? 'Save Changes' : (appointmentType === 'blocked' ? 'Block Time' : appointmentType === 'group' ? 'Create Group Appointment' : 'Create Appointment'))
                }
              </button>
            </div>
          </div>
        </div>
      </div>


    </>
  )
}