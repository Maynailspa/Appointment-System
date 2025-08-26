// components/calendar/utils/eventFormatters.ts

import { EventShape, StaffMember } from '../types/calendar.types'

export const formatEventsForCalendar = (
  events: EventShape[] | undefined | null,
  staffLookup: Map<string, StaffMember>
) => {
  // Add null/undefined check
  if (!events || !Array.isArray(events)) {
    return []
  }

  return events.map((e) => {
    const startDate = new Date(e.start)
    const endDate = new Date(e.end)

    const staffMember = staffLookup.get(e.staffId || '')
    const eventColor = staffMember?.color || '#3b82f6'

    const getEventStyling = (status: string, appointmentType?: string, extendedProps?: any) => {
      // Check for recurring appointments first
      const isRecurring = e.isRecurring || extendedProps?.isRecurring
      const isFlexibleTime = e.flexibleTime || extendedProps?.flexibleTime
      
      // Group appointments and group member appointments get a special purple color
      if (appointmentType === 'group' || extendedProps?.isGroupMember) {
        const baseColor = isRecurring ? '#9f7aea' : '#8b5cf6' // Slightly lighter purple for recurring
        return {
          backgroundColor: baseColor,
          borderColor: isFlexibleTime ? '#f59e0b' : '#7c3aed', // Orange border for flexible time
          textColor: '#ffffff',
          borderStyle: isFlexibleTime ? 'dashed' : 'solid'
        }
      }
      
      // Recurring regular appointments get a slightly different shade
      if (isRecurring) {
        const baseColor = '#5B72F6' // Slightly different shade for recurring
        return {
          backgroundColor: baseColor,
          borderColor: isFlexibleTime ? '#f59e0b' : baseColor, // Orange border for flexible time
          textColor: '#ffffff',
          borderStyle: isFlexibleTime ? 'dashed' : 'solid'
        }
      }
      
      switch (status) {
        case 'booked':
        case 'scheduled':
          return {
            backgroundColor: eventColor,
            borderColor: eventColor,
            textColor: '#ffffff'
          }
        case 'completed':
          // For calendar view, keep the original staff color even for completed appointments
          return {
            backgroundColor: eventColor,
            borderColor: eventColor,
            textColor: '#ffffff'
          }
        case 'cancelled':
          return {
            backgroundColor: '#dc2626',
            borderColor: '#b91c1c',
            textColor: '#ffffff'
          }
        case 'blocked':
          return {
            backgroundColor: '#6b7280',
            borderColor: '#4b5563',
            textColor: '#ffffff'
          }
        default:
          return {
            backgroundColor: eventColor,
            borderColor: eventColor,
            textColor: '#ffffff'
          }
      }
    }

    const styling = getEventStyling(e.status, e.appointmentType, e.extendedProps)

    // Format customer contact information - check multiple sources for client data
    const getCustomerContact = () => {
      // Try to get client from multiple sources
      const client = e.client || e.extendedProps?.client
      
          // Debug logging for client data
    if (e.id && (e.clientName !== 'Walk-in Client')) {
      console.log(`Event ${e.id} client data:`, {
        hasTopLevelClient: !!e.client,
        hasExtendedPropsClient: !!e.extendedProps?.client,
        topLevelClientPhone: e.client?.phone,
        extendedPropsClientPhone: e.extendedProps?.client?.phone,
        finalClientPhone: client?.phone,
        clientName: e.clientName
      })
      
      // EMERGENCY: If no client phone found but we have a clientName, this is a problem
      if (!client?.phone && e.clientName && e.clientName !== 'Walk-in Client' && e.clientName !== 'Unknown Client') {
        console.error('🚨 EMERGENCY: Client phone missing for non-walk-in appointment!', {
          eventId: e.id,
          clientName: e.clientName,
          clientId: e.clientId,
          hasClient: !!client,
          clientData: client
        })
      }
    }
      
      if (client && (client.phone || client.email)) {
        if (client.phone && client.email) {
          return `${client.phone} • ${client.email}`
        } else if (client.phone) {
          return client.phone
        } else if (client.email) {
          return client.email
        }
      }
      return ''
    }

    const customerContact = getCustomerContact()
    
    // Build title parts, excluding empty or default values
    const titleParts = []
    
    // Add client name if it's not empty
    if (e.clientName && e.clientName.trim() !== '') {
      titleParts.push(e.clientName)
    }
    
    // Add contact info if available
    if (customerContact) {
      titleParts.push(customerContact)
    }
    
    // For group appointments, show staff members instead of single service
    if (e.appointmentType === 'group' && e.groupMembers && e.groupMembers.length > 0) {
      const staffNames = e.groupMembers.map(member => member.staffName).join(', ')
      titleParts.push(`Staff: ${staffNames}`)
    } else if (e.serviceName && e.serviceName !== 'Unknown Service' && e.serviceName.trim() !== '') {
      // Add service name if it's not empty or default (for single appointments)
      titleParts.push(e.serviceName)
    }
    
    // Add recurring information if applicable
    const isRecurring = e.isRecurring || e.extendedProps?.isRecurring
    if (isRecurring && e.occurrenceNumber && e.totalOccurrences) {
      titleParts.push(`[${e.occurrenceNumber} of ${e.totalOccurrences}]`)
    }
    
    // If no valid parts, use a fallback
    const title = titleParts.length > 0 
      ? titleParts.join('\n')
      : 'Appointment'

    // Add recurring icon to class names if it's a recurring appointment
    const classNames = ['professional-event', 'multi-line-event']
    if (isRecurring) {
      classNames.push('recurring-event')
    }
    
    // Add flexible-time class for flexible time appointments
    const isFlexibleTime = e.flexibleTime || e.extendedProps?.flexibleTime
    if (isFlexibleTime) {
      classNames.push('flexible-time')
    }

    return {
      id: e.id,
      title: title,
      start: startDate,
      end: endDate,
      backgroundColor: styling.backgroundColor,
      borderColor: styling.borderColor,
      textColor: styling.textColor,
      // Preserve original fields for backward compatibility
      clientName: e.clientName,
      serviceName: e.serviceName,
      staffName: e.staffName,
      client: e.client,
      extendedProps: {
        status: e.status,
        staffName: e.staffName,
        serviceName: e.serviceName,
        clientName: e.clientName,
        staffId: e.staffId || '',
        serviceId: e.serviceId || '',
        clientId: e.clientId || '',
        appointmentType: e.appointmentType,
        isGroupMember: e.extendedProps?.isGroupMember,
        isGroupAppointment: e.isGroupAppointment,
        groupId: e.extendedProps?.groupId,
        client: e.client,
        selectedStaff: e.selectedStaff,
        isWalkIn: e.isWalkIn || !e.staffId, // Walk-in if no staffId
        groupMembers: e.groupMembers,
        // Preserve the services array from the original event
        services: e.extendedProps?.services || [],
        // Recurring appointment properties
        isRecurring: e.isRecurring,
        seriesId: e.seriesId,
        occurrenceNumber: e.occurrenceNumber,
        totalOccurrences: e.totalOccurrences,
        flexibleTime: e.flexibleTime,
        modified: e.modified,
        recurringPattern: e.recurringPattern,
      },
      classNames: classNames
    }
  })
}