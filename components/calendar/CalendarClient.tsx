'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceDayGridPlugin from '@fullcalendar/resource-daygrid'
import { useRealtimeAppointmentSync } from '../../hooks/useRealtimeAppointmentSync'
// import { useDataProtection } from '../../hooks/useDataProtection'

// Import components
import QuickActionsPopup from '../calendar/components/QuickActionsPopup'
import CalendarHeader from '../calendar/components/CalendarHeader'
import AppointmentPanel from '../calendar/components/AppointmentPanel'
import AppointmentDetailModal from '../calendar/components/AppointmentDetailModal'
import SeriesViewModal from '../calendar/components/SeriesViewModal'
import TimeColumn from '../calendar/components/TimeColumn'
import { useStaffManagement } from './hooks/useStaffManagement'

// Import types
import { EventShape, CalendarView, StaffMember, AppointmentType, AppointmentFormState, TimeSlot, Client } from '../calendar/types/calendar.types'

// Import utils and config
import { SLOT_LABEL_FORMAT } from '../calendar/utils/calendarConfig'
import { formatEventsForCalendar } from './utils/eventFormatters'
import { visitTracker } from '../../lib/visitTracker'
import { appointmentDebugger } from '../../utils/appointmentDebugger'
import { useWorkerSelection } from '../../contexts/WorkerSelectionContext'

interface Props {
  initialEvents: EventShape[]
  initialDate?: string
}

export default function CalendarClient({ initialEvents, initialDate }: Props) {
  // Get real-time appointment sync functions
  const { 
    notifyAppointmentCreated, 
    notifyAppointmentUpdated, 
    notifyAppointmentDeleted,
    notifyAppointmentMoved,
    isConnected,
    realtimeStatus,
    forceRefreshAppointments
  } = useRealtimeAppointmentSync()

  // Get data protection functions
  // const { autoBackup, storageUsage } = useDataProtection()
  
  // Inline data protection functions to avoid module resolution issues
  const autoBackup = () => {
    try {
      const backupKey = `salon_backup_${Date.now()}`
      const data: Record<string, any> = {}
      
      // Backup all relevant data
      const dataTypes = [
        'appointments',
        'activityFeed', 
        'businessSettings',
        'staff',
        'clients',
        'services',
        'smsMessages',
        'smsTemplates',
        'smsCampaigns',
        'smsAutomations'
      ]
      
      dataTypes.forEach(type => {
        const item = localStorage.getItem(type)
        if (item) {
          try {
            data[type] = JSON.parse(item)
          } catch (error) {
            console.warn(`Failed to parse ${type} data:`, error)
          }
        }
      })
      
      const backup = {
        timestamp: Date.now(),
        data,
        version: '1.0.0'
      }
      
      localStorage.setItem(backupKey, JSON.stringify(backup))
      console.log('Auto-backup created:', backupKey)
      return backupKey
    } catch (error) {
      console.error('Error creating backup:', error)
      return null
    }
  }
  
  const storageUsage = (() => {
    try {
      // Only calculate storage usage on the client side
      if (typeof window === 'undefined') {
        return { used: 0, available: 0, percentage: 0 }
      }

      let used = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            used += key.length + value.length
          }
        }
      }
      const available = 5 * 1024 * 1024 // 5MB estimate
      const percentage = available > 0 ? (used / available) * 100 : 0
      
      return {
        used,
        available,
        percentage: Math.min(percentage, 100)
      }
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return { used: 0, available: 0, percentage: 0 }
    }
  })()

  // Events state
  const [events, setEvents] = useState<EventShape[]>(initialEvents)
  
  // Keep track of previous events to detect specific changes
  const prevEventsRef = useRef<EventShape[]>([])
  
  // Watch for events changes and notify activity feed of specific actions
  useEffect(() => {
    const prevEvents = prevEventsRef.current
    const currentEvents = events
    
    // Skip on initial load
    if (prevEvents.length === 0 && currentEvents.length > 0) {
      prevEventsRef.current = currentEvents
      return
    }
    
    // Find new appointments (created)
    const newAppointments = currentEvents.filter(current => 
      !prevEvents.find(prev => prev.id === current.id)
    )
    
    // Find deleted appointments
    const deletedAppointments = prevEvents.filter(prev => 
      !currentEvents.find(current => current.id === prev.id)
    )
    
    // Find updated appointments (same ID but different content)
    const updatedAppointments = currentEvents.filter(current => {
      const prevVersion = prevEvents.find(prev => prev.id === current.id)
      if (!prevVersion) return false
      
      // Check if key properties have changed
      return (
        prevVersion.start !== current.start ||
        prevVersion.end !== current.end ||
        prevVersion.staffName !== current.staffName ||
        prevVersion.clientName !== current.clientName ||
        prevVersion.serviceName !== current.serviceName ||
        JSON.stringify(prevVersion.extendedProps) !== JSON.stringify(current.extendedProps)
      )
    })
    
    // Convert to appointment format and notify
    const convertToAppointment = (evt: EventShape) => ({
      id: evt.id,
      start: evt.start,
      end: evt.end,
      title: evt.serviceName || 'Appointment',
      clientName: evt.clientName || (evt.extendedProps?.client ? `${evt.extendedProps.client.firstName} ${evt.extendedProps.client.lastName || ''}`.trim() : 'Walk-in Client'),
      serviceName: evt.serviceName || evt.extendedProps?.services?.[0] || 'Service',
      staffName: evt.staffName || 'Any Staff',
      status: evt.status || 'booked',
      appointmentType: evt.appointmentType || evt.extendedProps?.appointmentType || 'single',
      extendedProps: evt.extendedProps
    })
    
    // Notify of specific changes
    newAppointments.forEach(apt => {
      notifyAppointmentCreated(convertToAppointment(apt))
    })
    
    updatedAppointments.forEach(apt => {
      const prevVersion = prevEvents.find(prev => prev.id === apt.id)
      if (prevVersion) {
        notifyAppointmentUpdated(convertToAppointment(apt), convertToAppointment(prevVersion))
      }
    })
    
    deletedAppointments.forEach(apt => {
      notifyAppointmentDeleted(convertToAppointment(apt))
    })
    
    // Update the ref for next comparison
    prevEventsRef.current = currentEvents
  }, [events])

  // Listen for appointment recovery events and check localStorage for pending recoveries
  useEffect(() => {
    // Define the recovery function first
    const handleRecoverAppointment = (event: CustomEvent) => {
      const appointmentData = event.detail
      
      // Extract staff identifiers from multiple possible sources
      const recoveredStaffId = appointmentData.staffId || appointmentData.selectedStaff || appointmentData.extendedProps?.staffId || ''
      
      // Convert appointment data back to EventShape format
      const recoveredEvent: EventShape = {
        id: appointmentData.id,
        start: appointmentData.start,
        end: appointmentData.end,
        status: appointmentData.status || 'booked',
        staffName: appointmentData.staffName || 'Any Staff',
        clientName: appointmentData.clientName || 'Walk-in Client',
        serviceName: appointmentData.serviceName || 'Nail Service',
        appointmentType: appointmentData.appointmentType || 'single',
        staffId: recoveredStaffId || undefined,
        selectedStaff: recoveredStaffId || undefined,
        isWalkIn: !recoveredStaffId && (appointmentData.clientName === 'Walk-in Client' || !appointmentData.clientName),
        extendedProps: {
          ...appointmentData.extendedProps,
          client: appointmentData.clientName || 'Walk-in Client',
          services: appointmentData.serviceName ? [appointmentData.serviceName] : ['Nail Service'],
          staff: appointmentData.staffName || 'Any Staff',
          staffId: recoveredStaffId || appointmentData.extendedProps?.staffId,
          selectedStaff: recoveredStaffId || appointmentData.extendedProps?.selectedStaff,
          isWalkIn: !recoveredStaffId && (appointmentData.clientName === 'Walk-in Client' || !appointmentData.clientName)
        }
      }
      
      // Ensure the event has a valid status for display
      if (recoveredEvent.status === 'cancelled') {
        recoveredEvent.status = 'booked'
      }
      
      // Add the recovered appointment back to the calendar
      setEvents(prevEvents => {
        // Check if the appointment already exists
        const existingEvent = prevEvents.find(e => e.id === recoveredEvent.id)
        if (existingEvent) {
          return prevEvents // Don't update if already exists
        }
        
        const updatedEvents = [...prevEvents, recoveredEvent]
        
        // Force calendar refresh
        setTimeout(() => {
          if (calendarApi) {
            calendarApi.refetchEvents()
            calendarApi.render()
          }
          // Force component re-render
          setCalendarRefreshKey(prev => prev + 1)
        }, 100)
        
        return updatedEvents
      })
    }
    
    // Set up event listener for same-page recovery
    window.addEventListener('recoverAppointment', handleRecoverAppointment as EventListener)
    
    // Check for pending recovery in localStorage AFTER function is defined
    const checkPendingRecovery = () => {
      const pendingRecovery = localStorage.getItem('pendingRecovery')
      if (pendingRecovery) {
        try {
          const recoveryData = JSON.parse(pendingRecovery)
          
          if (recoveryData.action === 'recover' && recoveryData.appointment) {
            handleRecoverAppointment({ detail: recoveryData.appointment } as CustomEvent)
            
            // Clear the pending recovery
            localStorage.removeItem('pendingRecovery')
          }
        } catch (error) {
          console.error('Error parsing pending recovery:', error)
          localStorage.removeItem('pendingRecovery')
        }
      }
    }
    
    // Check for pending recovery on mount
    checkPendingRecovery()
    
    return () => {
      window.removeEventListener('recoverAppointment', handleRecoverAppointment as EventListener)
    }
  }, [])


  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  
  // Load appointments from localStorage or API
  const loadAppointments = async () => {
      // ALWAYS load from localStorage first - this is the primary source of truth
      let appointments: EventShape[] = []
      
      if (typeof window !== 'undefined') {
        const savedAppointments = localStorage.getItem('appointments')
        if (savedAppointments) {
          try {
            appointments = JSON.parse(savedAppointments)
            console.log('LOADED APPOINTMENTS FROM LOCALSTORAGE (PRIMARY):', appointments)
            
            // Debug: Check the structure of loaded appointments
            if (appointments.length > 0) {
              console.log('SAMPLE APPOINTMENT STRUCTURE:', {
                id: appointments[0].id,
                clientName: appointments[0].clientName,
                serviceName: appointments[0].serviceName,
                hasClient: !!appointments[0].client,
                clientId: appointments[0].clientId,
                extendedProps: appointments[0].extendedProps
              })
            }
          } catch (error) {
            console.error('Failed to parse appointments from localStorage:', error)
          }
        }
      }
      
      // Set events immediately from localStorage to ensure they're always loaded
      setEvents(appointments)
      
      // Only try to sync with API if we have no local appointments
      if (appointments.length === 0) {
        try {
          const response = await fetch('/api/appointments')
          if (response.ok) {
            const apiAppointments = await response.json()
            console.log('LOADED APPOINTMENTS FROM API (NO LOCAL DATA):', apiAppointments)
            
            if (apiAppointments.length > 0) {
              setEvents(apiAppointments)
              
                        // The useEffect will handle saving to localStorage
            }
          } else {
            console.log('API failed, but appointments are already loaded from localStorage')
          }
        } catch (error) {
          console.log('API error, but appointments are already loaded from localStorage:', error)
        }
      }
  }

  // Load clients from API
  const loadClients = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const clients = await response.json()
        console.log('LOADED CLIENTS FROM API:', clients)
        setAllClients(clients)
        setFilteredClients(clients)
      } else {
        console.error('Failed to load clients')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  // Load appointments and clients from API on component mount
  React.useEffect(() => {
    // Start the visit tracker
    visitTracker.start()
    
    loadAppointments()
    loadClients()
  }, [])
  
  // Debug: Log events state changes
  useEffect(() => {
    console.log('EVENTS STATE UPDATED:', events)
  }, [events])

  // Save appointments to localStorage whenever events change - CRITICAL FOR PERSISTENCE
  useEffect(() => {
    if (typeof window !== 'undefined' && events.length > 0) {
      // Create a clean, serializable version of events to avoid circular references
      const cleanEvents = events.map(event => ({
        id: event.id,
        start: event.start,
        end: event.end,
        status: event.status,
        staffName: event.staffName,
        serviceName: event.serviceName,
        clientName: event.clientName,
        staffId: event.staffId,
        selectedStaff: event.selectedStaff,
        serviceId: event.serviceId,
        clientId: event.clientId,
        isWalkIn: event.isWalkIn,
        appointmentType: event.appointmentType,
        groupMembers: event.groupMembers,
        isGroupAppointment: event.isGroupAppointment,
        client: event.client, // Include the full client object
        // Clean extendedProps to avoid circular references
        extendedProps: event.extendedProps ? {
          notes: event.extendedProps.notes,
          services: event.extendedProps.services,
          staff: event.extendedProps.staff,
          staffId: event.extendedProps.staffId,
          client: event.extendedProps.client,
          clientId: event.extendedProps.clientId,
          isWalkIn: event.extendedProps.isWalkIn,
          appointmentType: event.extendedProps.appointmentType,
          isGroupMember: event.extendedProps.isGroupMember,
          groupId: event.extendedProps.groupId
        } : undefined
      }))
      
      // CRITICAL: Save immediately to ensure persistence
      localStorage.setItem('appointments', JSON.stringify(cleanEvents))
      console.log('CRITICAL: SAVED APPOINTMENTS TO LOCALSTORAGE:', cleanEvents.length, 'events')
    }
  }, [events])
  

  

  
  // Header state
  const [view, setView] = useState<CalendarView>('timeGridDay')
  // Initialize currentDate from initialDate prop, localStorage, or default to today
  const [currentDate, setCurrentDate] = useState(() => {
    // If initialDate is provided, use it
    if (initialDate) {
      try {
        const parsedDate = new Date(initialDate + 'T00:00:00')
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate
        }
      } catch (error) {
        console.warn('Failed to parse initialDate:', error)
      }
    }
    
    // Fallback to localStorage or today
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('calendarCurrentDate')
      if (savedDate) {
        try {
          const parsedDate = new Date(savedDate)
          // Validate that the date is valid
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate
          }
        } catch (error) {
          console.warn('Failed to parse saved date from localStorage:', error)
        }
      }
    }
    return new Date()
  })
  const [calendarApi, setCalendarApi] = useState<any>(null)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Real-time sync event listeners
  useEffect(() => {
    const handleRealtimeAppointmentCreated = (event: CustomEvent) => {
      const { appointment } = event.detail
      
      // Add to calendar if not already present
      setEvents(prevEvents => {
        const exists = prevEvents.find(e => e.id === appointment.id)
        if (exists) return prevEvents
        
        return [...prevEvents, appointment]
      })
    }

    const handleRealtimeAppointmentUpdated = (event: CustomEvent) => {
      const { appointment } = event.detail
      
      // Update in calendar
      setEvents(prevEvents => {
        return prevEvents.map(e => 
          e.id === appointment.id ? appointment : e
        )
      })
    }

    const handleRealtimeAppointmentDeleted = (event: CustomEvent) => {
      const { appointment, appointmentId } = event.detail
      const idToDelete = appointmentId || appointment?.id
      
      // Remove from calendar
      setEvents(prevEvents => {
        return prevEvents.filter(e => e.id !== idToDelete)
      })
    }

    const handleRealtimeAppointmentMoved = (event: CustomEvent) => {
      const { appointment } = event.detail
      
      // Update in calendar (same as update)
      setEvents(prevEvents => {
        return prevEvents.map(e => 
          e.id === appointment.id ? appointment : e
        )
      })
    }

    const handleForceRefresh = () => {
      // Trigger a full refresh from the server
      window.location.reload()
    }

    // Add event listeners
    window.addEventListener('realtimeAppointmentCreated', handleRealtimeAppointmentCreated as EventListener)
    window.addEventListener('realtimeAppointmentUpdated', handleRealtimeAppointmentUpdated as EventListener)
    window.addEventListener('realtimeAppointmentDeleted', handleRealtimeAppointmentDeleted as EventListener)
    window.addEventListener('realtimeAppointmentMoved', handleRealtimeAppointmentMoved as EventListener)
    window.addEventListener('forceRefreshAppointments', handleForceRefresh as EventListener)

    return () => {
      window.removeEventListener('realtimeAppointmentCreated', handleRealtimeAppointmentCreated as EventListener)
      window.removeEventListener('realtimeAppointmentUpdated', handleRealtimeAppointmentUpdated as EventListener)
      window.removeEventListener('realtimeAppointmentDeleted', handleRealtimeAppointmentDeleted as EventListener)
      window.removeEventListener('realtimeAppointmentMoved', handleRealtimeAppointmentMoved as EventListener)
      window.removeEventListener('forceRefreshAppointments', handleForceRefresh as EventListener)
    }
  }, [])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddWorkerMenu, setShowAddWorkerMenu] = useState(false)
  
  // Appointment panel state
  const [showAppointmentPanel, setShowAppointmentPanel] = useState(false)
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('single')
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState<{ start: string; end: string } | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null)
  const [isSeriesEditMode, setIsSeriesEditMode] = useState(false)
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const [editingSeriesAppointments, setEditingSeriesAppointments] = useState<EventShape[]>([])
  const [viewingSeriesId, setViewingSeriesId] = useState<string | null>(null)
  const [viewingSeriesAppointments, setViewingSeriesAppointments] = useState<EventShape[]>([])
  const [showSeriesViewModal, setShowSeriesViewModal] = useState(false)
  
  // Appointment detail modal state
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Drag state to prevent updates during drag operations
  const [isDragging, setIsDragging] = useState(false)
  
  // Loading state to prevent duplicate appointment creation
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false)
  
  // Use worker selection context for mobile filtering
  const { selectedWorkerId, setSelectedWorkerId } = useWorkerSelection()
  
  // Appointment form state
  const [formState, setFormState] = useState<AppointmentFormState>({
    selectedClient: '',
    isWalkIn: false,
    selectedServices: [],
    selectedStaff: '',
    blockReason: '',
    appointmentNotes: '',
    searchQuery: '',
    showClientSearch: false,
    searchingClients: false,
    appointmentDate: new Date(),
    showWeekPicker: false,
    appointmentDuration: '60',
    // Group appointment fields
    groupMembers: [],
    isGroupAppointment: false,
    // Recurring appointment fields
    isRecurring: false,
    recurringPattern: null,
    // Enhanced Block Time fields
    blockType: 'partial',
    startDate: null,
    endDate: null,
    repeatWeekly: false,
    repeatUntil: null
  })
  
  // Use the staff management hook instead of hardcoded data
  const {
    teamMembers,
    loadingTeam,
    activeWorkers,
    staffLookup,
    availableWorkers,
    workersInCalendar,
    handleAddWorker: originalHandleAddWorker,
    handleRemoveWorker: originalHandleRemoveWorker,
    getStaffById,
    getStaffColor,
    isWorkerActive,
    refreshStaffData,
    currentDate: staffCurrentDate,
    updateCurrentDate,
    activeWorkersByDate,
  } = useStaffManagement()

  // Save current date to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarCurrentDate', currentDate.toISOString())
    }
  }, [currentDate])

  // Sync staff management date with calendar date
  useEffect(() => {
    const dateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
    updateCurrentDate(dateString)
  }, [currentDate, updateCurrentDate])

  // Check if a worker is blocked for the entire day
  const isWorkerBlockedAllDay = useCallback((workerId: string, date: Date): boolean => {
    const dateStart = new Date(date)
    dateStart.setHours(0, 0, 0, 0)
    
    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)
    
    return events.some(event => {
      const isBlockedEvent = event.extendedProps?.appointmentType === 'blocked'
      if (!isBlockedEvent) return false
      
      // Check if the blocked event is for this specific worker
      const eventStaffId = event.extendedProps?.staffId || event.staffId || event.selectedStaff
      const isSameWorker = eventStaffId === workerId
      
      if (!isSameWorker) return false
      
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      
      // Check if the blocked time covers the entire day
      // This handles both single-day blocks and multi-day blocks that include this date
      return eventStart <= dateStart && eventEnd >= dateEnd
    })
  }, [events])

  // Create resources from active workers for multi-staff view, with priority ordering and blocked workers moved to the end
  const resources = useMemo(() => {
    // Separate workers into available and blocked
    const availableWorkers: StaffMember[] = []
    const blockedWorkers: StaffMember[] = []
    
    workersInCalendar.forEach(worker => {
      if (isWorkerBlockedAllDay(worker.id, currentDate)) {
        blockedWorkers.push(worker)
        console.log(`Worker ${worker.name} is blocked all day - moving to end`)
      } else {
        availableWorkers.push(worker)
      }
    })
    
    // Sort available workers by priority (lower number = higher priority)
    // If priorities are equal, maintain the order they were added to the calendar
    availableWorkers.sort((a, b) => {
      const priorityA = a.priority || 50
      const priorityB = b.priority || 50
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      // If priorities are equal, maintain the order they were added to the calendar
      const indexA = workersInCalendar.findIndex(w => w.id === a.id)
      const indexB = workersInCalendar.findIndex(w => w.id === b.id)
      return indexA - indexB
    })
    
    // Sort blocked workers by priority as well
    // If priorities are equal, maintain the order they were added to the calendar
    blockedWorkers.sort((a, b) => {
      const priorityA = a.priority || 50
      const priorityB = b.priority || 50
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      // If priorities are equal, maintain the order they were added to the calendar
      const indexA = workersInCalendar.findIndex(w => w.id === a.id)
      const indexB = workersInCalendar.findIndex(w => w.id === b.id)
      return indexA - indexB
    })
    
    // Create resources with available workers first (sorted by priority), then blocked workers (sorted by priority)
    const allWorkers = [...availableWorkers, ...blockedWorkers]
    const resourceArray = allWorkers.map((worker, index) => ({
      id: worker.id,
      title: worker.name,
      eventColor: worker.color,
      order: index,
      isBlocked: isWorkerBlockedAllDay(worker.id, currentDate)
    }))
    
    console.log('=== RESOURCE CREATION DEBUG ===')
    console.log('Original calendar order:', workersInCalendar.map(w => ({ id: w.id, name: w.name, priority: w.priority || 50 })))
    console.log('Available workers (sorted by priority + calendar order):', availableWorkers.map(w => ({ id: w.id, name: w.name, priority: w.priority || 50, calendarIndex: workersInCalendar.findIndex(cal => cal.id === w.id) })))
    console.log('Blocked workers (sorted by priority + calendar order):', blockedWorkers.map(w => ({ id: w.id, name: w.name, priority: w.priority || 50, calendarIndex: workersInCalendar.findIndex(cal => cal.id === w.id) })))
    console.log('Final worker order:', allWorkers.map(w => ({ id: w.id, name: w.name, priority: w.priority || 50, isBlocked: isWorkerBlockedAllDay(w.id, currentDate) })))
    console.log('Created resources:', resourceArray.map(r => ({ id: r.id, title: r.title, order: r.order, isBlocked: r.isBlocked })))
    
    return resourceArray
  }, [workersInCalendar, isWorkerBlockedAllDay, currentDate])

  // Add walk-ins column - always at the very end after all workers
  const walkInsResource = useMemo(() => ({
    id: 'walk-ins',
    title: 'Walk-ins',
    eventColor: '#f59e0b',
    order: resources.length // Walk-ins always at the end after all workers (including blocked ones)
  }), [resources.length])

  // Combine walk-ins with worker resources (walk-ins on the right)
  const calendarResources = useMemo(() => {
    // If a specific worker is selected for mobile filtering, only show that worker
    if (selectedWorkerId) {
      const selectedWorker = teamMembers.find(w => w.id === selectedWorkerId)
      if (selectedWorker) {
        const workerResource = {
          id: selectedWorker.id,
          title: selectedWorker.name,
          eventColor: selectedWorker.color,
          order: 0,
          isBlocked: isWorkerBlockedAllDay(selectedWorker.id, currentDate)
        }
        console.log('Filtered calendar resources (single worker):', [workerResource])
        return [workerResource]
      }
    }
    
    // Default: show all workers + walk-ins
    const combined = [...resources, walkInsResource]
    console.log('Final calendar resources:', combined.map(r => ({ id: r.id, title: r.title, order: r.order })))
    return combined
  }, [resources, walkInsResource, selectedWorkerId, teamMembers, isWorkerBlockedAllDay, currentDate])

  // Wrap the handlers with debugging
  const handleAddWorker = useCallback((workerId: string, dateKey?: string) => {
    const targetDate = dateKey || currentDate.toISOString().split('T')[0]
    originalHandleAddWorker(workerId, targetDate)
  }, [originalHandleAddWorker, currentDate])

  const handleRemoveWorker = useCallback((workerId: string) => {
    originalHandleRemoveWorker(workerId)
  }, [originalHandleRemoveWorker])

  // Helper function to resolve staff name from appointment data
  const resolveStaffName = useCallback((appointment: any): string => {
    console.log('=== RESOLVE STAFF NAME DEBUG ===')
    console.log('Appointment data:', {
      id: appointment.id,
      staffName: appointment.staffName,
      staffId: appointment.staffId,
      selectedStaff: appointment.selectedStaff,
      extendedProps: appointment.extendedProps
    })
    
    // CRITICAL FIX: Try to get staff name from the actual resource assignment first
    if (calendarApi && appointment.id) {
      try {
        const event = calendarApi.getEventById(appointment.id)
        if (event) {
          const eventResources = event.getResources()
          const actualResourceId = eventResources?.[0]?.id
          const actualResourceTitle = eventResources?.[0]?.title
          
          console.log('Resource-based staff resolution:', {
            actualResourceId: actualResourceId,
            actualResourceTitle: actualResourceTitle,
            isWalkIn: actualResourceId === 'walk-ins'
          })
          
          // If it's assigned to a specific staff member, use that name
          if (actualResourceId && actualResourceId !== 'walk-ins' && actualResourceTitle) {
            console.log('Using resource-based staff name:', actualResourceTitle)
            return actualResourceTitle
          }
          
          // If it's assigned to walk-ins, use "Any Staff"
          if (actualResourceId === 'walk-ins') {
            console.log('Using walk-ins assignment: Any Staff')
            return 'Any Staff'
          }
        }
      } catch (error) {
        console.error('Error getting event resources:', error)
      }
    }
    
    // Fallback to original logic
    // First try to get the staff name directly
    if (appointment.staffName) {
      console.log('Using direct staffName:', appointment.staffName)
      return appointment.staffName
    }
    
    // Then try to get it from extendedProps
    if (appointment.extendedProps?.staff) {
      console.log('Using extendedProps.staff:', appointment.extendedProps.staff)
      return appointment.extendedProps.staff
    }
    
    // If we have a staff ID, try to look it up from team members
    const staffId = appointment.staffId || appointment.selectedStaff || appointment.extendedProps?.staffId
    if (staffId) {
      const staffMember = teamMembers.find(m => m.id === staffId)
      if (staffMember) {
        console.log('Found staff member by ID:', staffMember.name, 'for ID:', staffId)
        return staffMember.name
      }
      console.log('Staff ID not found in team members:', staffId)
      return 'Unknown Staff'
    }
    
    // Default to "Any Staff" for walk-ins or unassigned appointments
    console.log('No staff data found, using default: Any Staff')
    return 'Any Staff'
  }, [teamMembers, calendarApi])

  // Helper function to refresh selectedAppointment with latest data
  const refreshSelectedAppointment = useCallback(() => {
    if (selectedAppointment) {
      const updatedEvent = events.find(event => event.id === selectedAppointment.id)
      if (updatedEvent) {
        // Check if the appointment data has actually changed
        const oldStaffId = (selectedAppointment as any).staffId || (selectedAppointment as any).selectedStaff
        const newStaffId = (updatedEvent as any).staffId || (updatedEvent as any).selectedStaff
        const oldStart = (selectedAppointment as any).start
        const newStart = (updatedEvent as any).start
        const oldEnd = (selectedAppointment as any).end
        const newEnd = (updatedEvent as any).end
        const oldStaffName = (selectedAppointment as any).staffName || (selectedAppointment as any).extendedProps?.staff
        const newStaffName = (updatedEvent as any).staffName || (updatedEvent as any).extendedProps?.staff
        
        const hasChanged = oldStaffId !== newStaffId || 
                          oldStart !== newStart || 
                          oldEnd !== newEnd ||
                          oldStaffName !== newStaffName
        
        if (hasChanged) {
          console.log('refreshSelectedAppointment - Refreshing with latest data:', {
            oldStaff: resolveStaffName(selectedAppointment),
            newStaff: resolveStaffName(updatedEvent),
            oldStaffId,
            newStaffId,
            oldStart,
            newStart,
            oldEnd,
            newEnd,
            oldStaffName,
            newStaffName
          })
          setSelectedAppointment(updatedEvent)
        }
      }
    }
  }, [selectedAppointment, events, resolveStaffName])

  // Refresh staff data periodically and on focus
  useEffect(() => {
    // Refresh staff data when component mounts
    refreshStaffData()

    // Set up periodic refresh every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      refreshStaffData()
    }, 60000)

    // Refresh when window gains focus (user comes back to tab) with debouncing
    let focusTimeout: NodeJS.Timeout
    const handleFocus = () => {
      clearTimeout(focusTimeout)
      focusTimeout = setTimeout(() => {
        refreshStaffData()
      }, 1000) // Wait 1 second after focus to avoid rapid requests
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      clearTimeout(focusTimeout)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshStaffData])
  
  // Update selectedAppointment when events change (for real-time sync)
  useEffect(() => {
    // Don't update during drag operations to prevent lag
    if (isDragging) return
    
    if (selectedAppointment) {
      const updatedEvent = events.find(event => event.id === selectedAppointment.id)
      if (updatedEvent) {
        // Check if the appointment data has actually changed by comparing key fields
        const oldStaffId = (selectedAppointment as any).staffId || (selectedAppointment as any).selectedStaff
        const newStaffId = (updatedEvent as any).staffId || (updatedEvent as any).selectedStaff
        const oldStart = (selectedAppointment as any).start
        const newStart = (updatedEvent as any).start
        const oldEnd = (selectedAppointment as any).end
        const newEnd = (updatedEvent as any).end
        const oldStaffName = (selectedAppointment as any).staffName || (selectedAppointment as any).extendedProps?.staff
        const newStaffName = (updatedEvent as any).staffName || (updatedEvent as any).extendedProps?.staff
        
        const hasChanged = oldStaffId !== newStaffId || 
                          oldStart !== newStart || 
                          oldEnd !== newEnd ||
                          oldStaffName !== newStaffName
        
        if (hasChanged) {
          setSelectedAppointment(updatedEvent)
        }
      }
    }
  }, [events, selectedAppointment, isDragging])

  // Update blocked time slots when events change
  useEffect(() => {
    if (calendarApi) {
      const timeSlots = document.querySelectorAll('.fc-timegrid-slot')
      timeSlots.forEach(slot => {
        const slotTime = slot.getAttribute('data-time') || 
                        slot.getAttribute('aria-label') ||
                        slot.getAttribute('title')
        
        if (slotTime) {
          const slotDate = new Date(currentDate)
          const [hours, minutes] = slotTime.split(':').map(Number)
          slotDate.setHours(hours, minutes, 0, 0)
          
          // Get the column/resource this slot belongs to
          const slotColumn = slot.closest('.fc-timegrid-col')
          let slotResourceId = 'walk-ins' // Default to walk-ins
          
          if (slotColumn) {
            // Get the resource ID from the column
            const resourceId = slotColumn.getAttribute('data-resource-id')
            if (resourceId) {
              slotResourceId = resourceId
            } else {
              // Fallback: try to determine resource from column index
              const allColumns = document.querySelectorAll('.fc-timegrid-col')
              const columnIndex = Array.from(allColumns).indexOf(slotColumn)
              const resources = calendarApi.getResources()
              if (resources[columnIndex]) {
                slotResourceId = resources[columnIndex].id
              }
            }
          }
          
          // Check if any blocked time events overlap with this time slot AND are for the same worker
          const hasBlockedTimeOverlap = events.some(event => {
            const isBlockedEvent = event.extendedProps?.appointmentType === 'blocked'
            if (!isBlockedEvent) return false
            
            // Check if the blocked event is for the same worker/column
            const eventStaffId = event.extendedProps?.staffId || event.staffId || event.selectedStaff
            const isSameWorker = eventStaffId === slotResourceId || 
                               (slotResourceId === 'walk-ins' && !eventStaffId) ||
                               (eventStaffId === 'walk-ins' && slotResourceId === 'walk-ins')
            
            if (!isSameWorker) return false
            
            const eventStart = new Date(event.start)
            const eventEnd = new Date(event.end)
            
            // Check if slot time overlaps with blocked time
            return slotDate >= eventStart && slotDate < eventEnd
          })
          
          if (hasBlockedTimeOverlap) {
            slot.classList.add('blocked-slot')
          } else {
            slot.classList.remove('blocked-slot')
          }
        }
      })
    }
  }, [events, calendarApi, currentDate])
  
  // Update view when workers change
  useEffect(() => {
    console.log('=== VIEW SWITCHING DEBUG ===')
    console.log('Calendar resources length:', calendarResources.length)
    console.log('Current view:', view)
    console.log('Calendar resources:', calendarResources.map(r => ({ id: r.id, title: r.title })))
    
    if (calendarResources.length >= 1) {
      // Convert current view to resource view when there's at least 1 resource (including walk-ins)
      if (view === 'timeGridDay') {
        console.log('Switching from timeGridDay to resourceTimeGridDay')
        setView('resourceTimeGridDay')
      } else if (view === 'timeGridWeek') {
        console.log('Switching from timeGridWeek to resourceTimeGridWeek')
        setView('resourceTimeGridWeek')
      } else if (view === 'dayGridMonth') {
        console.log('Switching from dayGridMonth to resourceDayGridMonth')
        setView('resourceDayGridMonth')
      }
    } else {
      // Convert resource view back to regular view when no resources
      if (view === 'resourceTimeGridDay') {
        console.log('Switching from resourceTimeGridDay to timeGridDay')
        setView('timeGridDay')
      } else if (view === 'resourceTimeGridWeek') {
        console.log('Switching from resourceTimeGridWeek to timeGridWeek')
        setView('timeGridWeek')
      } else if (view === 'resourceDayGridMonth') {
        console.log('Switching from resourceDayGridMonth to dayGridMonth')
        setView('dayGridMonth')
      }
    }
  }, [calendarResources.length, view])
  
  // Critical: Force resource ordering when calendar API is available
  useEffect(() => {
    if (calendarApi && calendarResources.length > 0) {
      console.log('=== FORCING RESOURCE ORDER ===')
      console.log('Calendar resources before ordering:', calendarResources.map((r: any) => ({ id: r.id, title: r.title, order: r.order })))
      
      // Force FullCalendar to respect our resource order
      try {
        // Get current resources from FullCalendar
        const currentResources = calendarApi.getResources()
        console.log('FullCalendar current resources:', currentResources.map((r: any) => ({ id: r.id, title: r.title })))
        
        // Verify order matches
        const orderMatches = currentResources.every((resource: any, index: number) => 
          resource.id === calendarResources[index]?.id
        )
        
        if (!orderMatches) {
          console.warn('Resource order mismatch detected! Forcing reorder...')
          // Force calendar to re-render with correct order
          calendarApi.refetchEvents()
        }
      } catch (error) {
        console.error('Error checking resource order:', error)
      }
    }
  }, [calendarApi, calendarResources])

  // Change calendar view when view state changes
  useEffect(() => {
    if (calendarApi && view) {
      console.log('Changing calendar view to:', view)
      calendarApi.changeView(view)
    }
  }, [view, calendarApi])

  // Ensure correct view on initial load when resources are available
  useEffect(() => {
    if (calendarResources.length >= 1 && view === 'timeGridDay') {
      console.log('Initial load: Switching to resource view because resources are available')
      setView('resourceTimeGridDay')
    }
  }, [calendarResources.length, view])

  // Add column dividers manually after calendar renders
  useEffect(() => {
          if (calendarApi) {
      const addColumnDividers = () => {
          // Check if we're on the calendar page by looking for calendar-specific elements
          const isCalendarPage = document.querySelector('.fc') || 
                                document.querySelector('.fc-resource-timeGridDay-view') ||
                                document.querySelector('.fc-timeGridDay-view') ||
                                document.querySelector('.fc-timeGridWeek-view')
          
          // Check if any modal is open - specifically check for appointment detail modal first
          const isModalOpen = document.querySelector('.appointment-detail-modal') ||
                             document.querySelector('[role="dialog"]') || 
                             document.querySelector('.modal') ||
                             document.querySelector('.appointment-panel') ||
                             document.querySelector('.quick-actions-popup') ||
                             document.querySelector('.date-picker-popup') ||
                             document.querySelector('.add-menu-popup') ||
                             document.querySelector('.worker-menu-popup')
          
          if (!isCalendarPage) {
            console.log('Not on calendar page, removing dividers')
            // Remove any existing dividers when not on calendar page
            const existingDividers = document.querySelectorAll('.custom-column-divider')
            existingDividers.forEach(div => div.remove())
            return
          }
          
          // Always keep dividers below modals - modal has z-index 1001, so dividers should be 999 or lower
          const modalZIndex = 999
          
          console.log('Adding column dividers...')
          console.log('Workers in calendar:', workersInCalendar.length)
        
        // Wait for calendar to fully render
        setTimeout(() => {
          // Try to find the calendar element with more specific selectors
          let calendarEl = document.querySelector('.fc-resource-timeGridDay-view')
          if (!calendarEl) calendarEl = document.querySelector('.fc-resource-timeGridWeek-view')
          if (!calendarEl) calendarEl = document.querySelector('.fc-timeGridDay-view')
          if (!calendarEl) calendarEl = document.querySelector('.fc-timeGridWeek-view')
          if (!calendarEl) calendarEl = document.querySelector('.fc-view')
          if (!calendarEl) calendarEl = document.querySelector('.fc')
          
          console.log('Calendar element found:', !!calendarEl)
          console.log('Calendar element:', calendarEl)
          console.log('Current view:', view)
          console.log('Calendar API:', !!calendarApi)
          
          if (calendarEl) {
            // Remove any existing dividers from both calendar and body
            const existingDividers = document.querySelectorAll('.custom-column-divider')
            existingDividers.forEach(div => div.remove())
            
            // Find the main calendar grid container
            const gridContainer = calendarEl.querySelector('.fc-timegrid-cols') || 
                                calendarEl.querySelector('.fc-scrollgrid-sync-table') ||
                                calendarEl.querySelector('.fc-timegrid')
            
            console.log('Grid container found:', !!gridContainer)
            
            // Add new dividers - try multiple selectors to find columns
            let columns = calendarEl.querySelectorAll('.fc-timegrid-col:not(:last-child)')
            if (columns.length === 0) {
              columns = calendarEl.querySelectorAll('.fc-col:not(:last-child)')
            }
            if (columns.length === 0) {
              columns = calendarEl.querySelectorAll('[data-resource-id]:not(:last-child)')
            }
            
            console.log('Found columns:', columns.length)
            
            // Remove any existing test elements
            const existingTestElements = document.querySelectorAll('[data-test-divider]')
            existingTestElements.forEach(el => el.remove())
            
            // Only add dividers if there are multiple columns
            if (columns.length > 0) {
              // Add dividers to the grid container instead of individual columns
              if (gridContainer) {
                // Find the header to get proper alignment
                const headerContainer = calendarEl.querySelector('.custom-staff-header') || 
                                      calendarEl.querySelector('.fc-col-header') ||
                                      calendarEl.querySelector('.fc-timegrid-col-header')
                
                const gridRect = gridContainer.getBoundingClientRect()
                const headerRect = headerContainer ? headerContainer.getBoundingClientRect() : gridRect
                const containerRect = calendarEl.getBoundingClientRect()
                
                console.log('Grid dimensions:', {
                  gridWidth: gridRect.width,
                  headerWidth: headerRect.width,
                  height: gridRect.height,
                  columns: columns.length
                })
                
                columns.forEach((col, index) => {
                  // Get the actual position of each column for precise alignment
                  const colRect = col.getBoundingClientRect()
                  const divider = document.createElement('div')
                  divider.className = 'custom-column-divider'
                  divider.style.cssText = `
                    position: absolute;
                    top: ${containerRect.top}px;
                    left: ${colRect.right}px;
                    width: 1px;
                    height: ${containerRect.height}px;
                    background: #e5e7eb;
                    z-index: ${modalZIndex};
                    pointer-events: none;
                    opacity: 1;
                  `
                  document.body.appendChild(divider)
                  console.log(`Added divider ${index} at column right edge: ${colRect.right}px`)
                })
                             } else {
                 // Fallback: add dividers to individual columns with proper alignment
                 columns.forEach((col, index) => {
                   // Get the actual position of each column for precise alignment
                   const colRect = col.getBoundingClientRect()
                   const containerRect = calendarEl.getBoundingClientRect()
                   
                   const divider = document.createElement('div')
                   divider.className = 'custom-column-divider'
                   divider.style.cssText = `
                     position: absolute;
                     top: ${containerRect.top}px;
                     left: ${colRect.right}px;
                     width: 1px;
                     height: ${containerRect.height}px;
                     background: #e5e7eb;
                     z-index: ${modalZIndex};
                     pointer-events: none;
                     opacity: 1;
                   `
                   document.body.appendChild(divider)
                   console.log(`Added fallback divider ${index} at column right edge: ${colRect.right}px`)
                 })
              }
            } else {
              console.log('No columns found, no dividers needed')
            }
          }
        }, 200)
      }
      
      addColumnDividers()
      
      // Also try to add dividers after a longer delay to ensure calendar is fully rendered
      setTimeout(addColumnDividers, 1000)
      setTimeout(addColumnDividers, 2000)
      
      // Add a small delay to ensure modal detection works properly
      setTimeout(addColumnDividers, 100)
      
      // Re-add dividers when calendar updates
      const observer = new MutationObserver(addColumnDividers)
      const calendarContainer = document.querySelector('#calendar-container')
      if (calendarContainer) {
        observer.observe(calendarContainer, { childList: true, subtree: true })
      }
      
      return () => observer.disconnect()
    }
  }, [workersInCalendar.length, calendarApi, view])
  
  // Mock data for services and clients
  const mockServices = [
    { id: '1', name: 'Fill', price: 45, duration: 45, category: 'Nails' },
    { id: '2', name: 'Pedicure', price: 35, duration: 60, category: 'Nails' },
    { id: '3', name: 'Manicure', price: 25, duration: 20, category: 'Nails' },
    { id: '4', name: 'Eyelashes', price: 75, duration: 75, category: 'Beauty' },
    { id: '5', name: 'Facial', price: 65, duration: 45, category: 'Skincare' },
    { id: '6', name: 'Massage', price: 90, duration: 30, category: 'Wellness' },
  ]

  const mockClients = [
    { id: '1', name: 'Emma Thompson', email: 'emma@example.com', phone: '+1 555-0101' },
    { id: '2', name: 'Michael Chen', email: 'michael@example.com', phone: '+1 555-0102' },
    { id: '3', name: 'Sarah Williams', email: 'sarah@example.com', phone: '+1 555-0103' },
  ]

  // State for filtered data
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [filteredServices, setFilteredServices] = useState(mockServices)

  // Function to restore client objects for appointments that are missing them
  const restoreClientObjects = useCallback(() => {
    console.log('=== RESTORE CLIENT OBJECTS DEBUG ===')
    console.log('allClients count:', allClients.length)
    console.log('events count:', events.length)
    
    if (allClients.length > 0 && events.length > 0) {
      const updatedEvents = events.map(event => {
        console.log('Processing event:', {
          id: event.id,
          clientId: event.clientId,
          hasClient: !!event.client,
          clientName: event.clientName,
          serviceName: event.serviceName
        })
        
        // If the event has a clientId but no client object, restore it
        if (event.clientId && !event.client) {
          const clientData = allClients.find((c: Client) => c.id === event.clientId)
          if (clientData) {
            console.log('Restoring client object for appointment:', event.id, clientData)
            return { 
              ...event, 
              client: clientData,
              clientName: `${clientData.firstName} ${clientData.lastName || ''}`.trim()
            }
          }
        }
        
        // Also check extendedProps for client data
        if (event.extendedProps && event.extendedProps.clientId && !event.extendedProps.client) {
          const clientData = allClients.find((c: Client) => c.id === event.extendedProps!.clientId)
          if (clientData) {
            console.log('Restoring client object in extendedProps for appointment:', event.id, clientData)
            return {
              ...event,
              client: clientData,
              clientName: `${clientData.firstName} ${clientData.lastName || ''}`.trim(),
              extendedProps: {
                ...event.extendedProps,
                client: clientData
              }
            }
          }
        }
        
        return event
      })
      
      // Only update if there were changes
      const hasChanges = updatedEvents.some((event, index) => event !== events[index])
      if (hasChanges) {
        console.log('Restored client objects for appointments')
        setEvents(updatedEvents)
      } else {
        console.log('No client objects needed restoration')
      }
    }
  }, [allClients, events])

  // Restore client objects whenever both clients and events are available
  useEffect(() => {
    if (allClients.length > 0 && events.length > 0) {
      console.log('Both clients and events available, attempting to restore client objects')
      restoreClientObjects()
    }
  }, [allClients, events, restoreClientObjects])

  const handleCalendarClick = useCallback((e: React.MouseEvent) => {
    
    // Check if we clicked on an event (appointment) - if so, ignore this click
    // and let the FullCalendar eventClick handler deal with it
    const target = e.target as HTMLElement
    const eventElement = target.closest('.fc-event')
    if (eventElement) {
      return
    }
    
    // Check if we clicked on a time slot
    const timeSlot = target.closest('.fc-timegrid-slot')
    
    if (timeSlot) {
        
        // Check if this time slot is blocked
        const isBlockedSlot = timeSlot.classList.contains('blocked-slot')
        if (isBlockedSlot) {
          console.log('Clicked on blocked time slot - preventing appointment creation')
          return
        }
        
        // Get the clicked column/resource
        const clickedColumn = timeSlot.closest('.fc-timegrid-col[data-resource-id]')
        let clickedResourceId = 'walk-ins' // Default to walk-ins
        
        console.log('=== COLUMN DETECTION DEBUG ===')
        console.log('Clicked column element:', clickedColumn)
        console.log('Calendar API available:', !!calendarApi)
        
        if (clickedColumn && calendarApi) {
          // Method 1: Get the resource ID from the column's data attribute
          const resourceId = clickedColumn.getAttribute('data-resource-id')
          console.log('Method 1 - data-resource-id:', resourceId)
          
          if (resourceId) {
            clickedResourceId = resourceId
            console.log('Using resource ID from data attribute:', clickedResourceId)
          } else {
            // Method 2: Try to determine resource from column index
            const allColumns = document.querySelectorAll('.fc-timegrid-col[data-resource-id]')
            const columnIndex = Array.from(allColumns).indexOf(clickedColumn)
            console.log('Method 2 - Column index:', columnIndex, 'Total columns:', allColumns.length)
            
            const colAtIndex = allColumns[columnIndex] as HTMLElement | undefined
            const colResourceId = colAtIndex?.getAttribute('data-resource-id')
            if (colResourceId) {
              clickedResourceId = colResourceId
              console.log('Using resource ID from DOM column index:', clickedResourceId)
            } else {
              // final fallback: try calendar resources
              const resources = calendarApi.getResources()
              if (resources[columnIndex]) {
                clickedResourceId = resources[columnIndex].id
                console.log('Fallback to calendar resources by index:', clickedResourceId)
              }
            }
          }
        }
        
        // Method 3: Enhanced position-based detection using column boundaries
        if (clickedResourceId === 'walk-ins' && calendarApi) {
          console.log('Method 3 - Enhanced position-based detection using column boundaries')
          
          const timeGridCols = document.querySelectorAll('.fc-timegrid-col[data-resource-id]')
          
          if (timeGridCols.length > 0) {
            // Get the click position relative to the time grid
            const timeGrid = document.querySelector('.fc-timegrid') as HTMLElement
            if (timeGrid) {
              const timeGridRect = timeGrid.getBoundingClientRect()
              const clickX = e.clientX - timeGridRect.left
              
              console.log('Click position relative to time grid:', clickX, 'Time grid width:', timeGridRect.width)
              
              // Find which column the click falls into by checking each column's boundaries
              for (let i = 0; i < timeGridCols.length; i++) {
                const colRect = (timeGridCols[i] as HTMLElement).getBoundingClientRect()
                const colLeft = colRect.left - timeGridRect.left
                const colRight = colRect.right - timeGridRect.left
                
                const rid = (timeGridCols[i] as HTMLElement).getAttribute('data-resource-id')
                console.log(`Column ${i}: Left=${colLeft}, Right=${colRight}, ClickX=${clickX}, ResourceId=${rid}`)
                
                // Check if click is within this column's boundaries
                if (clickX >= colLeft && clickX < colRight) {
                  clickedResourceId = rid || 'walk-ins'
                  console.log(`Click is INSIDE Column ${i} (${clickedResourceId})`)
                  break
                }
              }
              
              // If still not found, use the closest column
              if (clickedResourceId === 'walk-ins') {
                console.log('Click not found in any column, finding closest column')
                let closestColumnIndex = 0
                let minDistance = Infinity
                
                for (let i = 0; i < timeGridCols.length; i++) {
                  const colRect = (timeGridCols[i] as HTMLElement).getBoundingClientRect()
                  const colCenter = (colRect.left + colRect.right) / 2 - timeGridRect.left
                  const distance = Math.abs(clickX - colCenter)
                  
                  if (distance < minDistance) {
                    minDistance = distance
                    closestColumnIndex = i
                  }
                }
                
                clickedResourceId = (timeGridCols[closestColumnIndex] as HTMLElement).getAttribute('data-resource-id') || 'walk-ins'
                console.log(`Using closest column ${closestColumnIndex}: ${clickedResourceId}`)
              }
            }
          }
        }
        
        console.log('Final clicked resource ID:', clickedResourceId)
        
        console.log('=== CALENDAR CLICK DEBUG ===')
        console.log('Clicked resource/column:', clickedResourceId)
        console.log('Clicked time slot:', timeSlot)
        
        // Check if there are any blocked time events overlapping with this time slot
        const slotTime = timeSlot.getAttribute('data-time') || 
                        timeSlot.getAttribute('aria-label') ||
                        timeSlot.getAttribute('title')
        
        if (slotTime) {
          const clickedTime = new Date(currentDate)
          const [hours, minutes] = slotTime.split(':').map(Number)
          clickedTime.setHours(hours, minutes, 0, 0)
          
          // Check if any blocked time events overlap with this time AND are for the same worker
          const hasBlockedTimeOverlap = events.some(event => {
            const isBlockedEvent = event.extendedProps?.appointmentType === 'blocked'
            if (!isBlockedEvent) return false
            
            // Check if the blocked event is for the same worker/column
            const eventStaffId = event.extendedProps?.staffId || event.staffId || event.selectedStaff
            const isSameWorker = eventStaffId === clickedResourceId || 
                               (clickedResourceId === 'walk-ins' && !eventStaffId) ||
                               (eventStaffId === 'walk-ins' && clickedResourceId === 'walk-ins')
            
            if (!isSameWorker) return false
            
            const eventStart = new Date(event.start)
            const eventEnd = new Date(event.end)
            
            // Check if clicked time overlaps with blocked time
            return clickedTime >= eventStart && clickedTime < eventEnd
          })
          
          if (hasBlockedTimeOverlap) {
            console.log('Clicked time overlaps with blocked time for this worker - preventing appointment creation')
            alert('This time is blocked for this worker and unavailable for appointments.')
            return
          }
        }
      
            // Get the time from the slot label
      const slotLabel = timeSlot.querySelector('.fc-timegrid-slot-label')
      
      // Try multiple approaches to get the time
      let timeText = 'Unknown Time'
      
      if (slotLabel) {
        // Try textContent first
        timeText = slotLabel.textContent?.trim() || ''
        
        // If empty, try innerHTML
        if (!timeText) {
          timeText = slotLabel.innerHTML?.trim() || ''
        }
        
        // If still empty, try getting the aria-label
        if (!timeText) {
          timeText = slotLabel.getAttribute('aria-label')?.trim() || ''
        }
        
        // If still empty, try getting the title
        if (!timeText) {
          timeText = slotLabel.getAttribute('title')?.trim() || ''
        }
      }
      
      // If we still don't have a time, try to get it from the slot's data attributes
      if (!timeText || timeText === 'Unknown Time') {
        const slotTime = timeSlot.getAttribute('data-time') || 
                        timeSlot.getAttribute('aria-label') ||
                        timeSlot.getAttribute('title')
        if (slotTime) {
          timeText = slotTime.trim()
        }
      }
      
      // Parse the time and create a proper time range
      let startTime = 'Unknown Time'
      let endTime = 'Unknown Time'
      
      // Try to parse the time and add 15 minutes for end time
      if (timeText && timeText !== 'Unknown Time') {
        try {
          console.log('Raw time text from FullCalendar:', timeText)
          
          // PERMANENT FIX: Use a more robust time parsing approach
          let hour = 0
          let minute = 0
          
          // FullCalendar provides times in 12-hour format like "1:00 PM" or 24-hour format like "13:00:00"
          // Let's handle both formats properly
          
          // First, try to match 12-hour format (e.g., "1:00 PM", "2:00 AM")
          const time12Match = timeText.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
          
          if (time12Match) {
            // This is 12-hour format from FullCalendar
            hour = parseInt(time12Match[1])
            minute = parseInt(time12Match[2])
            const period = time12Match[3].toLowerCase()
            
            // Convert 12-hour to 24-hour format for Date object
            if (period === 'pm' && hour !== 12) {
              hour += 12
            } else if (period === 'am' && hour === 12) {
              hour = 0
            }
            
            console.log('Parsed 12-hour format:', { originalHour: parseInt(time12Match[1]), hour, minute, period, original: timeText })
          } else {
            // Try to match 24-hour format (e.g., "14:00", "16:30", "14:45:00")
            const time24Match = timeText.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
            
            if (time24Match) {
              // This is 24-hour format from FullCalendar
              hour = parseInt(time24Match[1])
              minute = parseInt(time24Match[2])
              console.log('Parsed 24-hour format:', { hour, minute, original: timeText, hasSeconds: time24Match[3] !== undefined })
              
              // CORRECT: Keep 24-hour format for Date object
              // Date.setHours() expects 24-hour format (13 = 1 PM, 14 = 2 PM, etc.)
              // toLocaleTimeString() will handle AM/PM conversion automatically
            } else {
              // Try to match hour-only format (e.g., "2 PM", "4 AM")
              const hourOnlyMatch = timeText.match(/^(\d{1,2})\s*(am|pm)$/i)
              
              if (hourOnlyMatch) {
                hour = parseInt(hourOnlyMatch[1])
                minute = 0
                const period = hourOnlyMatch[2].toLowerCase()
                
                // Convert 12-hour to 24-hour format
                if (period === 'pm' && hour !== 12) {
                  hour += 12
                } else if (period === 'am' && hour === 12) {
                  hour = 0
                }
                
                console.log('Parsed hour-only format:', { originalHour: parseInt(hourOnlyMatch[1]), hour, minute, period, original: timeText })
              } else {
                throw new Error(`Unrecognized time format: ${timeText}`)
              }
            }
          }
          
          // Validate hour and minute
          if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new Error(`Invalid time values: ${hour}:${minute}`)
          }
          
          // Create dates with the parsed time but current calendar date
          const year = currentDate.getFullYear()
          const month = currentDate.getMonth()
          const day = currentDate.getDate()
          
          const localStartDate = new Date(year, month, day, hour, minute, 0, 0)
          const localEndDate = new Date(year, month, day, hour, minute + 15, 0, 0)
          
          startTime = localStartDate.toISOString()
          endTime = localEndDate.toISOString()
          
          console.log('Created time range:', { startTime, endTime, hour, minute })
          
        } catch (error) {
          // Fallback: use current calendar date with current time
          const now = new Date()
          const year = currentDate.getFullYear()
          const month = currentDate.getMonth()
          const day = currentDate.getDate()
          const hour = now.getHours()
          const minute = now.getMinutes()
          
          const fallbackStart = new Date(year, month, day, hour, minute, 0, 0)
          const fallbackEnd = new Date(fallbackStart.getTime() + 60 * 60000)
          
          startTime = fallbackStart.toISOString()
          endTime = fallbackEnd.toISOString()
        }
      } else {
        // Fallback: use current calendar date with current time
        const now = new Date()
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const day = currentDate.getDate()
        const hour = now.getHours()
        const minute = now.getMinutes()
        
        const fallbackStart = new Date(year, month, day, hour, minute, 0, 0)
        const fallbackEnd = new Date(fallbackStart.getTime() + 60 * 60000)
        
        startTime = fallbackStart.toISOString()
        endTime = fallbackEnd.toISOString()
      }
      
             // Format the time display properly - use the same robust parsing approach
       let formattedTimeDisplay = timeText
       
       if (timeText && timeText !== 'Unknown Time') {
         try {
           // PERMANENT FIX: Use the same robust parsing logic for display
           let hour = 0
           let minute = 0
           
           // Check if it's already in 12-hour format (e.g., "1:00 PM")
           const timeMatch12Hour = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
           if (timeMatch12Hour) {
             // Already in 12-hour format - JUST USE IT AS IS
             formattedTimeDisplay = timeText  // "1:00 PM" stays "1:00 PM"
             
             // For creating the date, parse correctly
             hour = parseInt(timeMatch12Hour[1])
             minute = parseInt(timeMatch12Hour[2])
             const period = timeMatch12Hour[3].toLowerCase()
             
             // Convert to 24-hour for Date object
             if (period === 'pm' && hour !== 12) {
               hour += 12  // 1 PM = 13
             } else if (period === 'am' && hour === 12) {
               hour = 0   // 12 AM = 0
             }
             
             // Skip the Date object creation for 12-hour format since we're using timeText directly
             console.log('Using 12-hour format directly:', { timeText, hour, minute, period })
           } else {
             // Try to match 24-hour format (e.g., "14:00", "16:30", "14:45:00")
             const time24Match = timeText.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
             
             if (time24Match) {
               // This is 24-hour format from FullCalendar
               hour = parseInt(time24Match[1])
               minute = parseInt(time24Match[2])
               
               // CORRECT: Keep 24-hour format for Date object
               // Date.setHours() expects 24-hour format (13 = 1 PM, 14 = 2 PM, etc.)
               // toLocaleTimeString() will handle AM/PM conversion automatically
             } else {
               // Try to match hour-only format (e.g., "2 PM", "4 AM")
               const hourOnlyMatch = timeText.match(/^(\d{1,2})\s*(am|pm)$/i)
               
               if (hourOnlyMatch) {
                 hour = parseInt(hourOnlyMatch[1])
                 minute = 0
                 const period = hourOnlyMatch[2].toLowerCase()
                 
                 // Convert 12-hour to 24-hour format
                 if (period === 'pm' && hour !== 12) {
                   hour += 12
                 } else if (period === 'am' && hour === 12) {
                   hour = 0
                 }
               } else {
                 throw new Error(`Unrecognized time format for display: ${timeText}`)
               }
             }
           }
           
           // Validate hour and minute
           if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
             throw new Error(`Invalid time values for display: ${hour}:${minute}`)
           }
           
           // Only create Date object for non-12-hour formats
           if (!timeMatch12Hour) {
             // Create a date object and format it consistently
             console.log('DEBUG - Before formatting:', {
               timeText,
               hour,
               minute,
               dateHours: new Date().getHours()
             });
             
             const date = new Date();
             date.setHours(hour, minute, 0, 0);
             
             console.log('DEBUG - After setHours:', {
               dateString: date.toString(),
               hours: date.getHours(),
               formattedTime: date.toLocaleTimeString('en-US', {
                 hour: 'numeric',
                 minute: '2-digit',
                 hour12: true
               })
             });
             
             formattedTimeDisplay = date.toLocaleTimeString('en-US', {
               hour: 'numeric',
               minute: '2-digit',
               hour12: true
             })
           }
           
                        console.log('Display formatting debug:', {
               original: timeText,
               parsedHour: hour,
               parsedMinute: minute,
               formatted: formattedTimeDisplay
             })
         } catch (error) {
           console.error('Time display formatting error:', error)
           // Keep original timeText if formatting fails
           formattedTimeDisplay = timeText
         }
       }
      
      // Calculate the center position of the time slot line
      const calendarContainer = document.getElementById('calendar-container')
      let centerX = e.clientX
      let centerY = e.clientY
      
      if (calendarContainer) {
        const containerRect = calendarContainer.getBoundingClientRect()
        // Center horizontally in the calendar container
        centerX = containerRect.left + (containerRect.width / 2)
        // Keep the vertical position at the clicked time slot
        centerY = e.clientY
      }
      
      // Create time slot object with centered positioning and worker information
        const timeSlotObj = {
        start: startTime,
        end: endTime,
        timeDisplay: formattedTimeDisplay,
        top: e.clientY,
        left: e.clientX,
        // Calculate center position for the popup
        centerX: centerX,
        centerY: centerY,
        // Include the worker ID for the clicked column
        workerId: clickedResourceId
      }
      
      console.log('handleCalendarClick - Final timeSlotObj:', {
        timeDisplay: formattedTimeDisplay,
        start: startTime,
        end: endTime,
        workerId: clickedResourceId
      })
      
      // Persist the selected time slot so it survives a page refresh
      try {
        const persisted = {
          ...timeSlotObj,
          persistedAt: Date.now(),
          dateKey: new Date(timeSlotObj.start).toISOString().split('T')[0]
        }
        localStorage.setItem('pendingTimeSlot', JSON.stringify(persisted))
        console.log('Persisted time slot with worker ID:', clickedResourceId)
      } catch (err) {
        console.warn('Failed to persist pendingTimeSlot', err)
      }
      
      setSelectedTimeSlot(timeSlotObj)
      setShowQuickActions(true)
      
    } else {
      // Close quick actions if clicking elsewhere
      setShowQuickActions(false)
      setSelectedTimeSlot(null)
      try { localStorage.removeItem('pendingTimeSlot') } catch {}
    }
  }, [currentDate])

  const openAppointmentPanel = useCallback((type: 'single' | 'group' | 'blocked', timeSlot?: { start: string; end: string }) => {
    
    setShowQuickActions(false)
    setAppointmentType(type)
    
    // Reset to create mode (not edit mode)
    setIsEditMode(false)
    setEditingAppointmentId(null)
    
    // Determine the correct date for the appointment based on the time slot
    let appointmentDate = currentDate
    if (timeSlot) {
      const timeSlotDate = new Date(timeSlot.start)
      appointmentDate = new Date(timeSlotDate.getFullYear(), timeSlotDate.getMonth(), timeSlotDate.getDate())
    } else if (selectedTimeSlot) {
      const timeSlotDate = new Date(selectedTimeSlot.start)
      appointmentDate = new Date(timeSlotDate.getFullYear(), timeSlotDate.getMonth(), timeSlotDate.getDate())
    }
    
    // Determine the staff member to pre-select based on the clicked column or mobile worker selection
    let preSelectedStaff = ''
    console.log('=== STAFF PRE-SELECTION DEBUG ===')
    console.log('Selected time slot:', selectedTimeSlot)
    console.log('Selected time slot workerId:', selectedTimeSlot?.workerId)
    console.log('Mobile selected worker ID:', selectedWorkerId)
    
    if (selectedTimeSlot && selectedTimeSlot.workerId && selectedTimeSlot.workerId !== 'walk-ins') {
      // If a specific worker column was clicked, pre-select that worker
      preSelectedStaff = selectedTimeSlot.workerId
      console.log('Pre-selecting staff member based on clicked column:', preSelectedStaff)
    } else if (selectedWorkerId && selectedWorkerId !== 'walk-ins') {
      // MOBILE FIX: If no specific column clicked but mobile worker is selected, use that worker
      preSelectedStaff = selectedWorkerId
      console.log('Pre-selecting staff member based on mobile worker selection:', preSelectedStaff)
    } else {
      console.log('No specific worker column clicked or mobile worker selected, using default staff selection')
    }
    
    // Clear persisted pending slot when we proceed to open the form
    try { localStorage.removeItem('pendingTimeSlot') } catch {}
    
    // Reset form state for new appointment
    setFormState({
      selectedClient: '',
      isWalkIn: false,
      selectedServices: [],
      selectedStaff: preSelectedStaff, // Pre-select the staff member if available
      blockReason: '',
      appointmentNotes: '',
      searchQuery: '',
      showClientSearch: false,
      searchingClients: false,
      appointmentDate: appointmentDate,
      showWeekPicker: false,
      appointmentDuration: '60',
      // Group appointment fields
      groupMembers: [],
      isGroupAppointment: false,
      // Recurring appointment fields
      isRecurring: false,
      recurringPattern: null,
      // Enhanced Block Time fields
      blockType: 'partial',
      startDate: type === 'blocked' ? appointmentDate : null,
      endDate: type === 'blocked' ? appointmentDate : null,
      repeatWeekly: false,
      repeatUntil: null
    })
    
    // If a time slot is provided, use it; otherwise use the selected time slot
    let finalTimeSlot = null
    if (timeSlot) {
      finalTimeSlot = timeSlot
    } else if (selectedTimeSlot) {
      finalTimeSlot = {
        start: selectedTimeSlot.start,
        end: selectedTimeSlot.end
      }
          } else {
        // Create a default time slot for new appointments (current calendar date, 9:00 AM, 1 hour duration)
        const defaultStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 9, 0, 0, 0)
        const defaultEnd = new Date(defaultStart.getTime() + 60 * 60000) // 1 hour later
        
        finalTimeSlot = {
          start: defaultStart.toISOString(),
          end: defaultEnd.toISOString()
        }
      }
    
    setAppointmentTimeSlot(finalTimeSlot)
    
    // Calculate initial duration from the time slot
    if (finalTimeSlot) {
      const startDate = new Date(finalTimeSlot.start)
      const endDate = new Date(finalTimeSlot.end)
      const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      
      // Update form state with the calculated duration
      setFormState(prev => ({
        ...prev,
        appointmentDuration: durationInMinutes.toString()
      }))
    }
    
    setShowAppointmentPanel(true)
    
    }, [selectedTimeSlot, currentDate])

  // Restore last clicked time slot (and its worker) after a page refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pendingTimeSlot')
      if (!raw) return
      
      const saved = JSON.parse(raw)
      if (!saved?.start || !saved?.end) return
      
      // Only restore if it's for the currently viewed date to avoid cross-day confusion
      const currentDateKey = currentDate.toISOString().split('T')[0]
      if (saved.dateKey !== currentDateKey) {
        console.log('Saved time slot is for different date, clearing:', saved.dateKey, 'vs', currentDateKey)
        localStorage.removeItem('pendingTimeSlot')
        return
      }
      
      // Optional: expire after 15 minutes
      const fifteenMinutes = 15 * 60 * 1000
      if (typeof saved.persistedAt === 'number' && Date.now() - saved.persistedAt > fifteenMinutes) {
        console.log('Saved time slot expired, clearing')
        localStorage.removeItem('pendingTimeSlot')
        return
      }
      
      // Restore the selection and show quick actions so the user can continue
      const restored: any = {
        start: saved.start,
        end: saved.end,
        timeDisplay: saved.timeDisplay,
        top: saved.top || 0,
        left: saved.left || 0,
        centerX: saved.centerX,
        centerY: saved.centerY,
        workerId: saved.workerId
      }
      
      console.log('Restoring persisted time slot with worker ID:', saved.workerId)
      setSelectedTimeSlot(restored)
      setShowQuickActions(true)
    } catch (err) {
      console.warn('Failed to restore pendingTimeSlot', err)
      // Clear corrupted data
      try { localStorage.removeItem('pendingTimeSlot') } catch {}
    }
  }, [currentDate])

  // Clean up persisted data when component unmounts or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      try { localStorage.removeItem('pendingTimeSlot') } catch {}
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Optional: clear after 5 minutes of inactivity
        setTimeout(() => {
          try { localStorage.removeItem('pendingTimeSlot') } catch {}
        }, 5 * 60 * 1000)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleEditTimeSlot = useCallback(() => {
    setAppointmentTimeSlot(null)
  }, [])

  const handleDateChange = useCallback((date: Date) => {
    if (appointmentTimeSlot) {
      // Update the appointment time slot with the new date
      const startDate = new Date(appointmentTimeSlot.start)
      const endDate = new Date(appointmentTimeSlot.end)
      
      // Set the new date while keeping the same time
      startDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
      endDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
      
      setAppointmentTimeSlot({
        start: startDate.toISOString(),
        end: endDate.toISOString()
      })
    }
  }, [appointmentTimeSlot])

  const handleTimeChange = useCallback((startTime: string, duration: number) => {
    if (appointmentTimeSlot) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const startDate = new Date(appointmentTimeSlot.start)
      const endDate = new Date(appointmentTimeSlot.start)
      
      // Set the new time
      startDate.setHours(hours, minutes, 0, 0)
      endDate.setHours(hours, minutes + duration, 0, 0)
      
      setAppointmentTimeSlot({
        start: startDate.toISOString(),
        end: endDate.toISOString()
      })
      
    }
  }, [appointmentTimeSlot])

  // Handle event drag and drop
  const handleEventDrop = useCallback(async (dropInfo: any) => {
    // Pre-flight validation to prevent invalid events
    if (!dropInfo.event.id || dropInfo.event.id === 'undefined') {
      console.error('Invalid event ID, reverting drag')
      dropInfo.revert()
      return
    }
    
    if (dropInfo.event.start.toString() === 'Invalid Date' || dropInfo.event.end.toString() === 'Invalid Date') {
      console.error('Invalid dates detected, reverting drag')
      dropInfo.revert()
      return
          }
    
      // Determine the new staffId based on the resource
      let newStaffId: string | null = null
      let newIsWalkIn: boolean = false
      let newStaffName: string = 'Any Staff'
      
      // If no newResource, user is just changing time within same column
      if (!dropInfo.newResource) {
        // Keep existing staff assignment
        newStaffId = dropInfo.event.extendedProps?.staffId || null
        newIsWalkIn = dropInfo.event.extendedProps?.isWalkIn || false
        // Get the actual staff member's name
        if (newStaffId) {
          const selectedStaffMember = teamMembers.find(m => m.id === newStaffId)
          newStaffName = selectedStaffMember?.name || 'Unknown Staff'
        } else {
          newStaffName = 'Any Staff'
        }
      } else {
        // User moved to a different column
        if (dropInfo.newResource.id === 'walk-ins') {
          // Dropped on walk-ins column
          newIsWalkIn = true
          newStaffId = null
          newStaffName = 'Any Staff'
        } else {
          // Dropped on a specific staff member
          newIsWalkIn = false
          newStaffId = dropInfo.newResource.id
          // Get the actual staff member's name
          const selectedStaffMember = teamMembers.find(m => m.id === dropInfo.newResource.id)
          newStaffName = selectedStaffMember?.name || 'Unknown Staff'
        }
      }
      
    // Update UI immediately for smooth experience
    const updatedEvent = {
      id: dropInfo.event.id,
      title: dropInfo.event.title,
      start: dropInfo.event.start.toISOString(),
      end: dropInfo.event.end.toISOString(),
      status: dropInfo.event.extendedProps?.status || 'scheduled',
      staffName: newStaffName,
      serviceName: dropInfo.event.extendedProps?.serviceName || 'Unknown Service',
      clientName: dropInfo.event.extendedProps?.clientName || 'Unknown Client',
      staffId: newStaffId || undefined,
      serviceId: dropInfo.event.extendedProps?.serviceId,
      clientId: dropInfo.event.extendedProps?.clientId,
      isWalkIn: newIsWalkIn,
      appointmentType: dropInfo.event.extendedProps?.appointmentType || 'single',
      groupMembers: dropInfo.event.extendedProps?.groupMembers,
      isGroupAppointment: dropInfo.event.extendedProps?.isGroupAppointment,
      client: dropInfo.event.client || dropInfo.event.extendedProps?.client || (dropInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === dropInfo.event.extendedProps?.clientId) : null),
      extendedProps: {
        // Preserve ALL original extendedProps to maintain contact information and other details
        ...dropInfo.event.extendedProps,
        // Update only the properties that change during drag
        staff: newStaffName,
        staffId: newStaffId || undefined,
        isWalkIn: newIsWalkIn,
        client: dropInfo.event.client || dropInfo.event.extendedProps?.client || (dropInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === dropInfo.event.extendedProps?.clientId) : null)
      }
    }

    // Debug logging for client preservation
    console.log('=== DRAG CLIENT PRESERVATION DEBUG ===')
    console.log('Original event client:', dropInfo.event.client)
    console.log('Original event extendedProps.client:', dropInfo.event.extendedProps?.client)
    console.log('Original event clientId:', dropInfo.event.extendedProps?.clientId)
    console.log('AllClients available:', allClients.length)
    console.log('Client lookup result:', dropInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === dropInfo.event.extendedProps?.clientId) : 'No clientId')
    console.log('Updated event client:', updatedEvent.client)
    console.log('Updated event extendedProps.client:', updatedEvent.extendedProps?.client)
    console.log('Client phone preserved?', updatedEvent.client?.phone || updatedEvent.extendedProps?.client?.phone)
    
    // Update events state immediately - useEffect will handle localStorage
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => event.id === dropInfo.event.id ? updatedEvent : event)
      return updatedEvents
    })
    if (selectedAppointment && selectedAppointment.id === dropInfo.event.id) {
      setSelectedAppointment(updatedEvent)
    }

    // Handle API update in background (non-blocking)
    try {
      const response = await fetch(`/api/appointments/${dropInfo.event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: dropInfo.event.title,
          start: dropInfo.event.start.toISOString(),
          end: dropInfo.event.end.toISOString(),
          appointmentType: dropInfo.event.extendedProps?.appointmentType || 'single',
          notes: dropInfo.event.extendedProps?.notes || '',
          blockReason: dropInfo.event.extendedProps?.blockReason || '',
          selectedServices: dropInfo.event.extendedProps?.services || [],
          selectedStaff: newStaffId,
          selectedClient: dropInfo.event.extendedProps?.clientId || '',
          isWalkIn: newIsWalkIn,
          staffName: newStaffName
        })
      })

      if (response.ok) {
        // API update successful - UI already updated
        console.log('API update successful')
      } else if (response.status === 404) {
        // Appointment not found in API - UI already updated, just log
        console.log('Appointment not found in API (404), but UI already updated')
      } else {
        console.error('Failed to update appointment:', response.status)
        // Don't revert - UI is already updated and working
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      console.log('API error, falling back to local update')
      const updatedEvent = {
        id: dropInfo.event.id,
        title: dropInfo.event.title,
        start: dropInfo.event.start.toISOString(),
        end: dropInfo.event.end.toISOString(),
        status: dropInfo.event.extendedProps?.status || 'scheduled',
        staffName: newStaffName,
        serviceName: dropInfo.event.extendedProps?.serviceName || 'Unknown Service',
        clientName: dropInfo.event.extendedProps?.clientName || 'Unknown Client',
        staffId: newStaffId || undefined,
        serviceId: dropInfo.event.extendedProps?.serviceId,
        clientId: dropInfo.event.extendedProps?.clientId,
        isWalkIn: newIsWalkIn,
        appointmentType: dropInfo.event.extendedProps?.appointmentType || 'single',
        groupMembers: dropInfo.event.extendedProps?.groupMembers,
        isGroupAppointment: dropInfo.event.extendedProps?.isGroupAppointment,
        client: dropInfo.event.client || dropInfo.event.extendedProps?.client || (dropInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === dropInfo.event.extendedProps?.clientId) : null),
        extendedProps: {
          // Preserve ALL original extendedProps to maintain contact information and other details
          ...dropInfo.event.extendedProps,
          // Update only the properties that change during drag
          staff: newStaffName,
          staffId: newStaffId || undefined,
          isWalkIn: newIsWalkIn,
          client: dropInfo.event.client || dropInfo.event.extendedProps?.client || (dropInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === dropInfo.event.extendedProps?.clientId) : null)
        }
      }
      console.log('=== FALLBACK GROUP APPOINTMENT DEBUG ===')
      console.log('Fallback appointmentType:', updatedEvent.appointmentType)
      console.log('Fallback isGroupMember:', updatedEvent.extendedProps?.isGroupMember)
      console.log('Fallback isGroupAppointment:', updatedEvent.isGroupAppointment)
      console.log('Fallback groupId:', updatedEvent.extendedProps?.groupId)
      setEvents(prevEvents => prevEvents.map(event => event.id === dropInfo.event.id ? updatedEvent : event))
      if (selectedAppointment && selectedAppointment.id === dropInfo.event.id) {
        setSelectedAppointment(updatedEvent)
      }
      console.log('Appointment updated locally as fallback')
    }
  }, [events, selectedAppointment, teamMembers])

  // Handle event resize
  const handleEventResize = useCallback(async (resizeInfo: any) => {
    console.log('=== RESIZE START ===')
    console.log('Event being resized:', resizeInfo.event)
    
    // Pre-flight validation to prevent invalid events
    if (!resizeInfo.event.id || resizeInfo.event.id === 'undefined') {
      console.error('Invalid event ID, reverting resize')
      resizeInfo.revert()
      return
    }
    
    if (resizeInfo.event.start.toString() === 'Invalid Date' || resizeInfo.event.end.toString() === 'Invalid Date') {
      console.error('Invalid dates detected, reverting resize')
      resizeInfo.revert()
      return
    }
    
    // AGGRESSIVE CLIENT PRESERVATION: Get client data from multiple sources
    const originalClient = resizeInfo.event.client || resizeInfo.event.extendedProps?.client
    const clientFromLookup = resizeInfo.event.extendedProps?.clientId ? allClients.find(c => c.id === resizeInfo.event.extendedProps?.clientId) : null
    const preservedClient = originalClient || clientFromLookup
    
    console.log('=== AGGRESSIVE CLIENT PRESERVATION ===')
    console.log('Original client:', originalClient)
    console.log('Client from lookup:', clientFromLookup)
    console.log('Final preserved client:', preservedClient)
    console.log('Preserved client phone:', preservedClient?.phone)
    
    // CRITICAL FIX: Update UI immediately for smooth experience (like drag handler does)
    const updatedEvent = {
      id: resizeInfo.event.id,
      title: resizeInfo.event.title,
      start: resizeInfo.event.start.toISOString(),
      end: resizeInfo.event.end.toISOString(),
      status: resizeInfo.event.extendedProps?.status || 'scheduled',
      staffName: resizeInfo.event.extendedProps?.staffName || 'Unknown Staff',
      serviceName: resizeInfo.event.extendedProps?.serviceName || 'Unknown Service',
      clientName: resizeInfo.event.extendedProps?.clientName || 'Unknown Client',
      staffId: resizeInfo.event.extendedProps?.staffId || undefined,
      serviceId: resizeInfo.event.extendedProps?.serviceId,
      clientId: resizeInfo.event.extendedProps?.clientId,
      isWalkIn: resizeInfo.event.extendedProps?.isWalkIn || false,
      appointmentType: resizeInfo.event.extendedProps?.appointmentType || 'single',
      groupMembers: resizeInfo.event.extendedProps?.groupMembers,
      isGroupAppointment: resizeInfo.event.extendedProps?.isGroupAppointment,
      client: preservedClient, // FORCE the preserved client
      // Preserve all recurring appointment properties
      isRecurring: resizeInfo.event.isRecurring || resizeInfo.event.extendedProps?.isRecurring,
      seriesId: resizeInfo.event.seriesId || resizeInfo.event.extendedProps?.seriesId,
      occurrenceNumber: resizeInfo.event.occurrenceNumber || resizeInfo.event.extendedProps?.occurrenceNumber,
      totalOccurrences: resizeInfo.event.totalOccurrences || resizeInfo.event.extendedProps?.totalOccurrences,
      flexibleTime: resizeInfo.event.flexibleTime || resizeInfo.event.extendedProps?.flexibleTime,
      modified: resizeInfo.event.modified || resizeInfo.event.extendedProps?.modified,
      recurringPattern: resizeInfo.event.recurringPattern || resizeInfo.event.extendedProps?.recurringPattern,
      extendedProps: {
        // Preserve ALL original extendedProps to maintain contact information and other details
        ...resizeInfo.event.extendedProps,
        // FORCE client preservation in extendedProps too
        client: preservedClient
      }
    }

    // Debug logging for client preservation
    console.log('=== RESIZE CLIENT PRESERVATION DEBUG ===')
    console.log('Original event client:', resizeInfo.event.client)
    console.log('Original event extendedProps.client:', resizeInfo.event.extendedProps?.client)
    console.log('Original event clientId:', resizeInfo.event.extendedProps?.clientId)
    console.log('Original extendedProps keys:', Object.keys(resizeInfo.event.extendedProps || {}))
    console.log('Updated event client:', updatedEvent.client)
    console.log('Updated event extendedProps.client:', updatedEvent.extendedProps?.client)
    console.log('Updated extendedProps keys:', Object.keys(updatedEvent.extendedProps || {}))
    console.log('Client phone preserved?', updatedEvent.client?.phone || updatedEvent.extendedProps?.client?.phone)
    console.log('RESIZE: Phone number should now persist!')
    
    // EMERGENCY CLIENT RECOVERY: Ensure client data is never lost
    if (!updatedEvent.client && !updatedEvent.extendedProps?.client && updatedEvent.clientId) {
      console.log('🚨 EMERGENCY CLIENT RECOVERY: Forcing client lookup for event', updatedEvent.id)
      const emergencyClient = allClients.find(c => c.id === updatedEvent.clientId)
      if (emergencyClient) {
        updatedEvent.client = emergencyClient
        updatedEvent.extendedProps = { ...updatedEvent.extendedProps, client: emergencyClient }
        console.log('✅ EMERGENCY RECOVERY SUCCESS: Client data restored', emergencyClient.phone)
      }
    }
    
    // Update events state immediately - useEffect will handle localStorage
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => {
        if (event.id === resizeInfo.event.id) {
          // FINAL CHECK: Ensure we don't lose client data during state update
          const finalEvent = { ...updatedEvent }
          if (!finalEvent.client && event.client) {
            console.log('🔧 FINAL SAFETY: Preserving original client data')
            finalEvent.client = event.client
            finalEvent.extendedProps = { ...finalEvent.extendedProps, client: event.client }
          }
          return finalEvent
        }
        return event
      })
      return updatedEvents
    })
    if (selectedAppointment && selectedAppointment.id === resizeInfo.event.id) {
      setSelectedAppointment(updatedEvent)
    }
    
    // Handle API update in background (non-blocking)
    try {
      // Keep the same staff assignment, just update times
      const response = await fetch(`/api/appointments/${resizeInfo.event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: resizeInfo.event.title,
          start: resizeInfo.event.start.toISOString(),
          end: resizeInfo.event.end.toISOString(),
          appointmentType: resizeInfo.event.extendedProps?.appointmentType || 'single',
          notes: resizeInfo.event.extendedProps?.notes || '',
          blockReason: resizeInfo.event.extendedProps?.blockReason || '',
          selectedServices: resizeInfo.event.extendedProps?.services || [],
          selectedStaff: resizeInfo.event.extendedProps?.staffId || null,
          selectedClient: resizeInfo.event.extendedProps?.clientId || '',
          isWalkIn: resizeInfo.event.extendedProps?.isWalkIn || false
        })
      })

      if (response.ok) {
        // API update successful - get the updated appointment with client data
        const apiUpdatedAppointment = await response.json()
        console.log('API resize successful - got updated appointment:', apiUpdatedAppointment)
        
        // Update the event with the fresh API data that includes client info
        if (apiUpdatedAppointment.client) {
          console.log('🔥 UPDATING EVENT WITH API CLIENT DATA:', apiUpdatedAppointment.client.phone)
          setEvents(prevEvents => {
            return prevEvents.map(event => {
              if (event.id === resizeInfo.event.id) {
                // Create updated event with client data
                const updatedEvent = {
                  ...event,
                  client: apiUpdatedAppointment.client,
                  clientName: apiUpdatedAppointment.clientName || event.clientName,
                  serviceName: apiUpdatedAppointment.serviceName || event.serviceName,
                  extendedProps: {
                    ...event.extendedProps,
                    client: apiUpdatedAppointment.client
                  }
                }
                
                // CRITICAL: Regenerate the title with the client data
                const customerContact = apiUpdatedAppointment.client?.phone || apiUpdatedAppointment.client?.email || ''
                const titleParts = []
                
                if (updatedEvent.clientName && updatedEvent.clientName.trim() !== '') {
                  titleParts.push(updatedEvent.clientName)
                }
                
                if (customerContact) {
                  titleParts.push(customerContact)
                }
                
                if (updatedEvent.serviceName && updatedEvent.serviceName !== 'Unknown Service' && updatedEvent.serviceName.trim() !== '') {
                  titleParts.push(updatedEvent.serviceName)
                }
                
                const newTitle = titleParts.length > 0 ? titleParts.join('\n') : 'Appointment'
                
                console.log('🎯 REGENERATED TITLE WITH PHONE:', newTitle)
                
                return {
                  ...updatedEvent,
                  title: newTitle
                }
              }
              return event
            })
          })
        }
      } else if (response.status === 404) {
        // Appointment not found in API - UI already updated, just log
        console.log('Appointment not found in API (404), but UI already updated')
      } else {
        console.error('Failed to update appointment:', response.status)
        // Don't revert - UI is already updated and working
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      console.log('API error, but UI already updated')
      // Don't revert - UI is already updated and working
    }
  }, [selectedAppointment, allClients])

  // Close all popups on outside clicks
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Prevent the handler from running if the click is on a button that opens a popup
      if (target.closest('button') || target.tagName === 'BUTTON') {
        return
      }
      
      // Close Quick Actions popup
      if (showQuickActions && !target.closest('.quick-actions-popup')) {
        setShowQuickActions(false)
      }

      // Close Date Picker popup
      if (showDatePicker && !target.closest('.date-picker-popup')) {
        setShowDatePicker(false)
      }

      // Close Add Menu popup
      if (showAddMenu && !target.closest('.add-menu-popup')) {
        setShowAddMenu(false)
      }

      // Close Add Worker Menu popup
      if (showAddWorkerMenu && !target.closest('.worker-menu-popup')) {
        setShowAddWorkerMenu(false)
      }

      // Close Appointment Panel (but only if clicking outside the panel itself)
      if (showAppointmentPanel && !target.closest('.appointment-panel')) {
        setShowAppointmentPanel(false)
      }

      // Close Appointment Detail Modal
      if (showAppointmentDetail && !target.closest('.appointment-detail-modal')) {
        setShowAppointmentDetail(false)
        setSelectedAppointment(null)
      }
    }

    // Use capture phase to ensure this runs before other click handlers
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [showQuickActions, showDatePicker, showAddMenu, showAddWorkerMenu, showAppointmentPanel, showAppointmentDetail])

  // Alternative approach: Close popups when clicking on the main container
  const handleMainContainerClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    
    // Only close popups if clicking on the main container, not on popups
    if (target.closest('.quick-actions-popup') || 
        target.closest('.date-picker-popup') || 
        target.closest('.add-menu-popup') || 
        target.closest('.worker-menu-popup') || 
        target.closest('.appointment-panel')) {
      return
    }
    
    // Close all popups when clicking on main container
    if (showQuickActions) setShowQuickActions(false)
    if (showDatePicker) setShowDatePicker(false)
    if (showAddMenu) setShowAddMenu(false)
    if (showAddWorkerMenu) setShowAddWorkerMenu(false)
    if (showAppointmentPanel) setShowAppointmentPanel(false)
  }

  // Handle appointment click to show detail modal
  const handleAppointmentClick = (info: any) => {
    // Debug logging for appointment click
    console.log('=== APPOINTMENT CLICK DEBUG ===')

    // Some freshly-created events may not have a stable DOM element or may carry
    // non-serializable fields. Create a safe, plain object for the modal.
    try {
      const eventApi = info?.event
      if (!eventApi) return

      // Resource diagnostics (best-effort only)
      try {
        const eventResources = eventApi.getResources?.()
        const actualResourceId = eventResources?.[0]?.id
        const staffId = eventApi.extendedProps?.staffId || eventApi.extendedProps?.selectedStaff
        console.log('Resource assignment check:', {
          eventId: eventApi.id,
          actualResourceId,
          expectedResourceId: staffId || 'walk-ins',
          staffId,
          staffName: eventApi.extendedProps?.staffName,
          isWalkIn: eventApi.extendedProps?.isWalkIn,
          resourceMismatch: actualResourceId !== (staffId || 'walk-ins')
        })
      } catch (e) {
        console.warn('Resource diagnostics failed:', e)
      }

      // Close any existing modal
      setShowAppointmentDetail(false)
      setShowDeleteConfirm(false)

      // Prefer the version from our state (has full client/services where available)
      const fromState = events.find(e => e.id === eventApi.id)
      
      // CRITICAL FIX: If appointment is not in state yet (freshly created), create a safe version from the event API
      const safeEvent = fromState ?? (() => {
        console.log('Appointment not found in events state, creating from event API:', eventApi.id)
        
        // Create a safe event object from the FullCalendar event API
        const safeEventFromApi = {
          id: eventApi.id,
          start: eventApi.start,
          end: eventApi.end,
          title: eventApi.title,
          status: eventApi.extendedProps?.status || 'confirmed',
          staffName: (eventApi as any).staffName || eventApi.extendedProps?.staffName || eventApi.extendedProps?.staff || 'Any Staff',
          serviceName: (eventApi as any).serviceName || eventApi.extendedProps?.serviceName || 'Service',
          clientName: (eventApi as any).clientName || eventApi.extendedProps?.clientName || 'Walk-in Client',
          staffId: (eventApi as any).staffId || eventApi.extendedProps?.staffId || eventApi.extendedProps?.selectedStaff,
          serviceId: (eventApi as any).serviceId || eventApi.extendedProps?.serviceId,
          clientId: (eventApi as any).clientId || eventApi.extendedProps?.clientId,
          appointmentType: (eventApi as any).appointmentType || eventApi.extendedProps?.appointmentType || 'single',
          client: (eventApi as any).client || eventApi.extendedProps?.client,
          isWalkIn: eventApi.extendedProps?.isWalkIn || false,
          extendedProps: {
            ...eventApi.extendedProps,
            // Ensure critical properties are present
            notes: eventApi.extendedProps?.notes || '',
            services: eventApi.extendedProps?.services || [],
            staff: (eventApi as any).staffName || eventApi.extendedProps?.staffName || eventApi.extendedProps?.staff || 'Any Staff',
            staffId: (eventApi as any).staffId || eventApi.extendedProps?.staffId || eventApi.extendedProps?.selectedStaff,
            client: (eventApi as any).client || eventApi.extendedProps?.client,
            clientId: (eventApi as any).clientId || eventApi.extendedProps?.clientId,
            isWalkIn: eventApi.extendedProps?.isWalkIn || false,
            appointmentType: (eventApi as any).appointmentType || eventApi.extendedProps?.appointmentType || 'single'
          }
        }
        
        console.log('Created safe event from API:', safeEventFromApi)
        return safeEventFromApi
      })()

      setSelectedAppointment(safeEvent)

      // Compute a safe modal position; if info.el is missing, fall back to cursor center
      let x = window.innerWidth / 2
      let y = Math.max(60, window.innerHeight * 0.25)
      try {
        if (info?.el && typeof info.el.getBoundingClientRect === 'function') {
          const rect = info.el.getBoundingClientRect()
          x = rect.left + rect.width / 2
          y = rect.top - 20
        }
      } catch (e) {
        console.warn('Failed to read event element rect, using fallback coords:', e)
      }
      setModalPosition({ x, y })

      // Open modal
      setShowAppointmentDetail(true)
    } catch (err) {
      console.error('Error handling appointment click:', err)
    }
  }

  // Handle edit appointment
  const handleEditAppointment = () => {
    
    if (!selectedAppointment) return
    
    // Set up the appointment panel for editing
    const startTime = new Date(selectedAppointment.start)
    const endTime = new Date(selectedAppointment.end)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.round(durationMs / 60000)
    
    console.log('=== EDIT APPOINTMENT DURATION DEBUG ===')
    console.log('Selected appointment start:', selectedAppointment.start)
    console.log('Selected appointment end:', selectedAppointment.end)
    console.log('Calculated duration minutes:', durationMinutes)
    
    // Services are now stored as names in extendedProps.services, so we need to convert them to IDs
    let serviceIds = []
    const serviceNames = selectedAppointment.extendedProps?.services || []
    
    if (serviceNames.length > 0) {
      // Convert service names back to service IDs for the form
      serviceIds = serviceNames.map((serviceName: string) => {
        // Find the service by name in our mockServices array
        const service = mockServices.find(s => s.name === serviceName)
        return service ? service.id : serviceName // Fallback to name if not found
      })
    }
    
    let groupMembers = formState.groupMembers || []
    
    // Handle group appointments - reconstruct group members from related appointments
    if (selectedAppointment.extendedProps?.isGroupMember || selectedAppointment.extendedProps?.appointmentType === 'group') {
      console.log('=== EDITING GROUP APPOINTMENT ===')
      
      // Find all related group member appointments
      const groupId = selectedAppointment.extendedProps?.groupId || selectedAppointment.id
      const relatedGroupAppointments = events.filter(event => 
        event.extendedProps?.groupId === groupId || 
        event.extendedProps?.isGroupMember
      )
      
      console.log('Found related group appointments:', relatedGroupAppointments)
      
      // Reconstruct group members from the appointments
      groupMembers = relatedGroupAppointments.map(event => ({
        staffId: event.extendedProps?.staffId || event.staffId || '',
        staffName: event.staffName || '',
        services: event.extendedProps?.services || [], // These are service names for group members
        startTime: new Date(event.start).toTimeString().slice(0, 5),
        endTime: new Date(event.end).toTimeString().slice(0, 5),
        duration: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000),
        price: 0 // Price will be calculated when needed
      }))
      
      console.log('Reconstructed group members:', groupMembers)
    }
    
    console.log('=== EDIT APPOINTMENT SERVICES DEBUG ===')
    console.log('Original services from appointment:', selectedAppointment.extendedProps?.services)
    console.log('Service names from appointment:', serviceNames)
    console.log('Converted service IDs for form:', serviceIds)
    console.log('Available mockServices:', mockServices.map(s => ({ id: s.id, name: s.name })))
    console.log('Group members for form:', groupMembers)
    
    // Get the current staff ID from multiple possible locations
    const currentStaffId = (selectedAppointment as any).staffId || 
                          (selectedAppointment as any).selectedStaff || 
                          selectedAppointment.extendedProps?.staffId || ''
    
    // Debug logging for staff resolution in edit mode
    console.log('handleEditAppointment - Staff resolution:', {
      appointmentId: selectedAppointment.id,
      staffId: (selectedAppointment as any).staffId,
      selectedStaff: (selectedAppointment as any).selectedStaff,
      extendedPropsStaffId: selectedAppointment.extendedProps?.staffId,
      resolvedStaffId: currentStaffId,
      staffName: (selectedAppointment as any).staffName
    })
    
    // Update form state with current appointment data
    setFormState({
              ...formState,
        selectedClient: selectedAppointment.extendedProps?.clientId || '',
        isWalkIn: selectedAppointment.extendedProps?.isWalkIn || false,
        selectedServices: serviceIds,
        selectedStaff: currentStaffId,
        // Note: staffName will be set when saving the appointment
      appointmentNotes: selectedAppointment.extendedProps?.notes || '',
      appointmentDuration: durationMinutes.toString(),
      // Group appointment fields
      groupMembers: groupMembers,
      isGroupAppointment: selectedAppointment.extendedProps?.appointmentType === 'group' || selectedAppointment.extendedProps?.isGroupMember,
      // Recurring appointment fields
      isRecurring: selectedAppointment.isRecurring || selectedAppointment.extendedProps?.isRecurring || false,
      recurringPattern: selectedAppointment.recurringPattern || selectedAppointment.extendedProps?.recurringPattern || null,
      // Enhanced Block Time fields - preserve from original appointment
      blockType: selectedAppointment.extendedProps?.blockType || 'partial',
      startDate: selectedAppointment.extendedProps?.startDate ? new Date(selectedAppointment.extendedProps.startDate) : null,
      endDate: selectedAppointment.extendedProps?.endDate ? new Date(selectedAppointment.extendedProps.endDate) : null,
      repeatWeekly: selectedAppointment.extendedProps?.repeatWeekly || false,
      repeatUntil: selectedAppointment.extendedProps?.repeatUntil ? new Date(selectedAppointment.extendedProps.repeatUntil) : null
    })
    
    // Set appointment time slot
    setAppointmentTimeSlot({
      start: selectedAppointment.start,
      end: selectedAppointment.end
    })
    
    // Set edit mode and appointment ID
    setIsEditMode(true)
    setEditingAppointmentId(selectedAppointment.id)
    // Preserve the original appointment type (blocked, single, group)
    const originalAppointmentType = selectedAppointment.extendedProps?.appointmentType || selectedAppointment.appointmentType || 'single'
    console.log('=== EDIT APPOINTMENT TYPE DEBUG ===')
    console.log('Original appointment:', selectedAppointment)
    console.log('Original appointmentType:', selectedAppointment.appointmentType)
    console.log('Original extendedProps.appointmentType:', selectedAppointment.extendedProps?.appointmentType)
    console.log('Setting appointmentType to:', originalAppointmentType)
    setAppointmentType(originalAppointmentType as AppointmentType)
    setShowAppointmentPanel(true)
    setShowAppointmentDetail(false)
    
  }

  // Handle delete appointment
  const handleDeleteAppointment = () => {
    setShowDeleteConfirm(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async (mode: 'single' | 'future' | 'series' = 'single') => {
    if (!selectedAppointment) return

    // Check if this is a recurring appointment (either regular recurring or block time)
    const isRecurring = selectedAppointment.isRecurring || selectedAppointment.extendedProps?.isRecurring
    const seriesId = selectedAppointment.seriesId || selectedAppointment.extendedProps?.seriesId
    const isBlockedTime = selectedAppointment.extendedProps?.appointmentType === 'blocked'
    const isFullDayBlocked = isBlockedTime && selectedAppointment.extendedProps?.blockType === 'full'

    // Handle different delete modes for recurring appointments
    if (mode === 'series') {
      // Delete entire series
      if (seriesId) {
        console.log('Deleting entire series:', seriesId)
        
        setEvents(prevEvents => {
          const updatedEvents = prevEvents.filter(event => 
            (event.seriesId || event.extendedProps?.seriesId) !== seriesId
          )
          return updatedEvents
        })
        
        setShowAppointmentDetail(false)
        setSelectedAppointment(null)
        setShowDeleteConfirm(false)
        
        console.log('Entire series deleted successfully')
        return
      }
    } else if (mode === 'future') {
      // Delete this appointment and all future appointments in the series
      if (seriesId) {
        console.log('Deleting this and future appointments in series:', seriesId)
        
        const currentDate = new Date(selectedAppointment.start)
        
        setEvents(prevEvents => {
          const updatedEvents = prevEvents.filter(event => {
            const eventSeriesId = event.seriesId || event.extendedProps?.seriesId
            if (eventSeriesId === seriesId) {
              const eventDate = new Date(event.start)
              // Keep appointments before the current one, delete this one and all future ones
              return eventDate < currentDate
            }
            return true // Keep all other appointments
          })
          

          return updatedEvents
        })
        
        setShowAppointmentDetail(false)
        setSelectedAppointment(null)
        setShowDeleteConfirm(false)
        
        console.log('This and future appointments deleted successfully')
        return
      }
    } else if (mode === 'single' && isRecurring) {
      // Delete only this specific occurrence of a recurring appointment
      if (seriesId) {
        console.log('Deleting single occurrence from series:', seriesId, 'Appointment ID:', selectedAppointment.id)
        
        setEvents(prevEvents => {
          const updatedEvents = prevEvents.filter(event => event.id !== selectedAppointment.id)
          return updatedEvents
        })
        
        setShowAppointmentDetail(false)
        setSelectedAppointment(null)
        setShowDeleteConfirm(false)
        
        console.log('Single occurrence deleted successfully')
        return
      }
    } else if (mode === 'single' && isFullDayBlocked) {
      // For full-day block time appointments, delete only this specific day
      console.log('Deleting single day from full-day block time series:', selectedAppointment.id)
      
      setEvents(prevEvents => {
        const updatedEvents = prevEvents.filter(event => event.id !== selectedAppointment.id)

        return updatedEvents
      })
      
      setShowAppointmentDetail(false)
      setSelectedAppointment(null)
      setShowDeleteConfirm(false)
      
      console.log('Single day from full-day block time series deleted successfully')
      return
    }

    // Handle single appointment deletion (regular or single recurring)
    // Special handling for local appointments (apt- prefix)
    if (selectedAppointment.id && selectedAppointment.id.startsWith('apt-')) {
      console.log('Deleting local appointment:', selectedAppointment.id)
      
      // Remove from events list immediately for local appointments
              setEvents(prevEvents => {
          const updatedEvents = prevEvents.filter(event => event.id !== selectedAppointment.id)
          return updatedEvents
        })
      setShowAppointmentDetail(false)
      setSelectedAppointment(null)
      setShowDeleteConfirm(false)
      
      console.log('Local appointment deleted successfully')
      return
    }

    try {
      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // If this appointment has passed and has a client, decrement visit statistics
        if (selectedAppointment.clientId && selectedAppointment.end) {
          const appointmentEnd = new Date(selectedAppointment.end)
          const now = new Date()
          
          // Only decrement if the appointment has passed (to avoid double-counting)
          if (appointmentEnd < now) {
            await visitTracker.decrementVisits(selectedAppointment.clientId, selectedAppointment.end)
          }
        }
        
        // Remove from events list
        setEvents(prevEvents => {
          const updatedEvents = prevEvents.filter(event => event.id !== selectedAppointment.id)
          return updatedEvents
        })
        setShowAppointmentDetail(false)
        setSelectedAppointment(null)
        setShowDeleteConfirm(false)
        
        // Show success message
        console.log('Appointment deleted successfully')
      } else {
        console.error('Failed to delete appointment')
        let errorMessage = 'Failed to delete appointment'
        
        try {
          const errorData = await response.json()
          if (errorData && typeof errorData === 'object') {
            if (errorData.details) {
              errorMessage = `Failed to delete appointment: ${errorData.details}`
            } else if (errorData.error) {
              errorMessage = `Failed to delete appointment: ${errorData.error}`
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        
        // Show error to user
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  // Recurring appointment action handlers
  const handleEditThisAppointment = () => {
    if (!selectedAppointment) return
    
    // Set up the appointment panel for editing this specific appointment
    const startTime = new Date(selectedAppointment.start)
    const endTime = new Date(selectedAppointment.end)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.round(durationMs / 60000)
    
    // Convert service names back to service IDs for the form
    const serviceIds = (selectedAppointment.extendedProps?.services || []).map((serviceName: string) => {
      // Try to find the service by name in mockServices
      const service = mockServices.find(s => s.name === serviceName)
      if (service) {
        return service.id
      }
      
      // If not found by name, check if it's already an ID
      if (typeof serviceName === 'string' && serviceName.length < 10) {
        return serviceName
      }
      
      // Fallback: return the service name as is
      return serviceName
    })
    
    // Get the current staff ID from multiple possible locations
    const currentStaffId = (selectedAppointment as any).staffId || 
                          (selectedAppointment as any).selectedStaff || 
                          selectedAppointment.extendedProps?.staffId || ''
    
    // Update form state with current appointment data
    setFormState({
      ...formState,
      selectedClient: selectedAppointment.extendedProps?.clientId || '',
      isWalkIn: selectedAppointment.extendedProps?.isWalkIn || false,
      selectedServices: serviceIds,
      selectedStaff: currentStaffId,
      appointmentNotes: selectedAppointment.extendedProps?.notes || '',
      appointmentDuration: durationMinutes.toString(),
      // Keep recurring fields for this specific appointment
      isRecurring: selectedAppointment.isRecurring || selectedAppointment.extendedProps?.isRecurring || false,
      recurringPattern: selectedAppointment.recurringPattern || selectedAppointment.extendedProps?.recurringPattern || null,
      // Set the appointment date to this specific appointment's date
      appointmentDate: new Date(selectedAppointment.start)
    })
    
    // Set appointment time slot
    setAppointmentTimeSlot({
      start: selectedAppointment.start,
      end: selectedAppointment.end
    })
    
    // Set edit mode for this specific appointment (not series edit mode)
    setIsEditMode(true)
    setIsSeriesEditMode(false) // Ensure we're not in series edit mode
    setEditingAppointmentId(selectedAppointment.id)
    setEditingSeriesId(null) // Clear any series editing state
    setEditingSeriesAppointments([]) // Clear any series editing state
    
    // Open the appointment panel
    setAppointmentType('single')
    setShowAppointmentPanel(true)
    setShowAppointmentDetail(false)
  }

  const handleEditEntireSeries = () => {
    if (!selectedAppointment) return
    
    const seriesId = selectedAppointment.seriesId || selectedAppointment.extendedProps?.seriesId
    if (!seriesId) {
      console.error('No series ID found for appointment')
      return
    }
    
    // Find all appointments in the series
    const seriesAppointments = events.filter(event => 
      (event.seriesId || event.extendedProps?.seriesId) === seriesId
    )
    
    if (seriesAppointments.length === 0) {
      console.error('No appointments found in series')
      return
    }
    
    // Get the first appointment to extract all the series information
    const firstAppointment = seriesAppointments[0]
    const pattern = firstAppointment.recurringPattern || firstAppointment.extendedProps?.recurringPattern
    
    // Calculate duration from the first appointment
    const startTime = new Date(firstAppointment.start)
    const endTime = new Date(firstAppointment.end)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.round(durationMs / 60000)
    
    // Convert service names back to service IDs for the form
    const serviceIds = (firstAppointment.extendedProps?.services || []).map((serviceName: string) => {
      // Try to find the service by name in mockServices
      const service = mockServices.find(s => s.name === serviceName)
      if (service) {
        return service.id
      }
      
      // If not found by name, check if it's already an ID
      if (typeof serviceName === 'string' && serviceName.length < 10) {
        return serviceName
      }
      
      // Fallback: return the service name as is
      return serviceName
    })
    
    // Get the current staff ID from multiple possible locations
    const currentStaffId = (firstAppointment as any).staffId || 
                          (firstAppointment as any).selectedStaff || 
                          firstAppointment.extendedProps?.staffId || ''
    
    // Set up the form for series editing with all the existing appointment data
    setFormState({
      ...formState,
      selectedClient: firstAppointment.extendedProps?.clientId || '',
      isWalkIn: firstAppointment.extendedProps?.isWalkIn || false,
      selectedServices: serviceIds,
      selectedStaff: currentStaffId,
      appointmentNotes: firstAppointment.extendedProps?.notes || '',
      appointmentDuration: durationMinutes.toString(),
      appointmentDate: new Date(firstAppointment.start),
      isRecurring: true,
      recurringPattern: pattern || null
    })
    
    // Store series information for editing
    setEditingSeriesId(seriesId)
    setEditingSeriesAppointments(seriesAppointments)
    
    // Open the appointment panel in series edit mode
    setAppointmentType('single')
    setShowAppointmentPanel(true)
    setShowAppointmentDetail(false)
    setIsEditMode(true)
    setIsSeriesEditMode(true)
  }

  const handleViewAllInSeries = () => {
    if (!selectedAppointment) return
    
    const seriesId = selectedAppointment.seriesId || selectedAppointment.extendedProps?.seriesId
    if (!seriesId) {
      console.error('No series ID found for appointment')
      return
    }
    
    // Find all appointments in the series
    const seriesAppointments = events.filter(event => 
      (event.seriesId || event.extendedProps?.seriesId) === seriesId
    )
    
    if (seriesAppointments.length === 0) {
      console.error('No appointments found in series')
      return
    }
    
    // Sort appointments by date
    const sortedAppointments = seriesAppointments.sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )
    
    // Store series information for viewing
    setViewingSeriesId(seriesId)
    setViewingSeriesAppointments(sortedAppointments)
    
    // Show the series view modal
    setShowSeriesViewModal(true)
    setShowAppointmentDetail(false)
  }

  // Handle series actions from the series view modal
  const handleSeriesEditFromModal = () => {
    setShowSeriesViewModal(false)
    handleEditEntireSeries()
  }

  const handleSeriesDeleteFromModal = () => {
    if (!viewingSeriesId) return
    
    // Find all appointments in the series
    const seriesAppointments = events.filter(event => 
      (event.seriesId || event.extendedProps?.seriesId) === viewingSeriesId
    )
    
    // Remove all appointments in the series
    setEvents(prevEvents => {
      const filteredEvents = prevEvents.filter(event => 
        (event.seriesId || event.extendedProps?.seriesId) !== viewingSeriesId
      )
      console.log('EVENTS AFTER SERIES DELETE:', filteredEvents)
      return filteredEvents
    })
    

    
    setShowSeriesViewModal(false)
    setViewingSeriesId(null)
    setViewingSeriesAppointments([])
  }

  // Determine the calendar view based on active workers
  const calendarView = calendarResources.length > 1 ? 'resourceTimeGridDay' : 'timeGridDay'

  // Use events state for display - recalculate when resources change
  const eventsToDisplay = useMemo(() => {
    console.log('=== EVENTS TO DISPLAY DEBUG ===')
    console.log('TOTAL EVENTS COUNT:', events.length)
    console.log('Workers in calendar order:', workersInCalendar.map(w => ({ id: w.id, name: w.name })))
    console.log('Calendar resources order:', calendarResources.map(r => ({ id: r.id, title: r.title })))
    console.log('Selected worker filter:', selectedWorkerId)
    
    // First, format the events with customer information using formatEventsForCalendar
    let formattedEvents = formatEventsForCalendar(events, staffLookup)
    
    // Apply mobile worker filtering if a specific worker is selected
    if (selectedWorkerId) {
      formattedEvents = formattedEvents.filter(event => {
        const staffId = event.extendedProps?.staffId || event.extendedProps?.selectedStaff
        const isWalkIn = event.extendedProps?.isWalkIn || false
        
        // If filtering by a specific worker, show:
        // 1. Appointments assigned to that worker (regardless of walk-in status)
        // 2. Walk-ins that are assigned to that worker
        return staffId === selectedWorkerId
      })
    }
    
    return formattedEvents.map(event => {
      // Check for selectedStaff in multiple possible locations
      const staffId = event.extendedProps?.staffId || event.extendedProps?.selectedStaff
      const staffName = event.extendedProps?.staffName
      

      
      // Check if the event is a walk-in
      const isWalkIn = event.extendedProps?.isWalkIn || false
      
      let assignedResourceId = 'walk-ins'
      let assignmentReason = 'fallback'
      
      // If the event is a walk-in, assign it to the walk-ins column
      if (isWalkIn) {
        assignedResourceId = 'walk-ins'
        assignmentReason = 'walk-in appointment'
      }
      // If the event has a selectedStaff and that staff is in the calendar, assign it to that resource
      else if (staffId && typeof staffId === 'string' && staffId.trim() !== '' && workersInCalendar.some(w => w.id === staffId)) {
        assignedResourceId = staffId
        assignmentReason = 'staff found in calendar'
      }
      // If the event has a selectedStaff but they're not in the calendar, auto-add them
      else if (staffId && typeof staffId === 'string' && staffId.trim() !== '') {
        // Auto-add the worker to the calendar if they're not already there
        const worker = teamMembers.find(w => w.id === staffId)
        if (worker && !workersInCalendar.some(w => w.id === staffId)) {
          // Get the date from the event
          const eventDate = new Date(event.start)
          const eventDateKey = eventDate.toISOString().split('T')[0]
          handleAddWorker(staffId, eventDateKey)
          // Assign to the worker's column
          assignedResourceId = staffId
          assignmentReason = 'auto-added worker'
        } else {
          // Worker not found in team members, assign to walk-ins
          assignedResourceId = 'walk-ins'
          assignmentReason = 'worker not found in team'
        }
      }
      // If no staff assigned (any staff available), assign to walk-ins
      else {
        assignedResourceId = 'walk-ins'
        assignmentReason = 'any staff available'
      }
      
      // Debug logging for each event (simplified)
      if (assignedResourceId === 'walk-ins' && staffId) {
        console.log('⚠️ Event assigned to walk-ins but has staffId:', {
          eventId: event.id,
          staffId: staffId,
          assignmentReason: assignmentReason
        })
      }
      
      // Add styling for blocked time events
      const isBlockedTime = event.extendedProps?.appointmentType === 'blocked'
      
      return {
        ...event,
        resourceId: assignedResourceId,
        resourceIds: [assignedResourceId],
        // Style blocked time events with grey background and disabled appearance
        backgroundColor: isBlockedTime ? '#6b7280' : event.backgroundColor,
        borderColor: isBlockedTime ? '#4b5563' : event.borderColor,
        textColor: isBlockedTime ? '#ffffff' : event.textColor,
        // Add custom CSS classes for blocked time styling
        classNames: isBlockedTime ? ['blocked-time-event'] : event.classNames,
        // Make blocked time events non-interactive
        editable: !isBlockedTime,
        // Add extended props to identify blocked time
        extendedProps: {
          ...event.extendedProps,
          isBlockedTime: isBlockedTime
        }
      }
    })
  }, [events, workersInCalendar, calendarResources, staffLookup, selectedWorkerId])

  // Real-time now indicator state
  const [currentTime, setCurrentTime] = useState(new Date())
  const nowIndicatorRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())
    }

    // Update immediately
    updateTime()

    // Update every minute
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  // Enhanced now indicator effect - MANUALLY CONTROL BADGES
  useEffect(() => {
    if (!calendarApi) return

    const updateNowIndicator = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })

      // Check if current time is within business hours (9:00 AM - 8:00 PM)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTimeInMinutes = currentHour * 60 + currentMinute
      const businessStartInMinutes = 9 * 60 // 9:00 AM
      const businessEndInMinutes = 20 * 60 // 8:00 PM (20:00)
      
      const isBusinessHours = currentTimeInMinutes >= businessStartInMinutes && currentTimeInMinutes < businessEndInMinutes

      // Find ALL now indicator lines
      const allNowLines = document.querySelectorAll('.fc-timegrid-now-indicator-line')
      
      console.log('Found now indicator lines:', allNowLines.length)
      
      if (allNowLines.length > 0) {
        // HIDE ALL BADGES FIRST
        allNowLines.forEach((line, index) => {
          const lineElement = line as HTMLElement
          
          // Remove any existing badges
          const existingBadge = lineElement.querySelector('.custom-time-badge')
          if (existingBadge) {
            existingBadge.remove()
          }
          
          // Hide the default ::before badge
          lineElement.style.setProperty('--badge-display', 'none')
          
          console.log(`Processing line ${index}:`, lineElement)
          
          // Only show badge on the FIRST line (leftmost column) AND during business hours
          if (index === 0 && isBusinessHours) {
            console.log('Creating badge for first line during business hours')
            // Create custom badge for first column only
            const badge = document.createElement('div')
            badge.className = 'custom-time-badge'
            badge.textContent = timeString
            badge.style.cssText = `
              position: absolute;
              left: -70px;
              top: 50%;
              transform: translateY(-50%);
              background: #ef4444;
              color: white;
              padding: 8px 14px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              z-index: 1001;
              text-align: center;
              border: 2px solid #ffffff;
              animation: pulse 2s infinite;
            `
            lineElement.appendChild(badge)
            console.log('Badge created and appended:', badge)
          }
        })
      } else {
        console.log('No now indicator lines found')
        
        // FALLBACK: Create badge on calendar container (only during business hours)
        const calendarContainer = document.getElementById('calendar-container')
        if (calendarContainer) {
          // Remove any existing fallback badges
          const existingFallbackBadge = calendarContainer.querySelector('.fallback-time-badge')
          if (existingFallbackBadge) {
            existingFallbackBadge.remove()
          }
          
          // Only create fallback badge during business hours
          if (isBusinessHours) {
            console.log('Creating fallback badge on calendar container during business hours')
            
            // Create fallback badge
            const fallbackBadge = document.createElement('div')
            fallbackBadge.className = 'fallback-time-badge'
            fallbackBadge.textContent = timeString
            fallbackBadge.style.cssText = `
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              background: #ef4444;
              color: white;
              padding: 8px 14px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              z-index: 1001;
              text-align: center;
              border: 2px solid #ffffff;
              animation: pulse 2s infinite;
            `
            calendarContainer.appendChild(fallbackBadge)
            console.log('Fallback badge created:', fallbackBadge)
          }
        }
      }

      // Also update any custom now indicator (only during business hours)
      if (nowIndicatorRef.current && isBusinessHours) {
        const badge = nowIndicatorRef.current.querySelector('.now-indicator-badge')
        if (badge) {
          badge.textContent = timeString
        }
      } else if (nowIndicatorRef.current && !isBusinessHours) {
        // Remove badge if outside business hours
        const badge = nowIndicatorRef.current.querySelector('.now-indicator-badge')
        if (badge) {
          badge.remove()
        }
      }
    }

    updateNowIndicator()
    
    // Also try again after a short delay in case lines aren't ready yet
    setTimeout(updateNowIndicator, 500)
    
    // Update every 100ms for smooth real-time display
    const interval = setInterval(updateNowIndicator, 100)

    // Also update on view changes
    const handleViewChange = () => {
      setTimeout(updateNowIndicator, 100)
    }

    // Listen for calendar view changes
    calendarApi.on('datesSet', handleViewChange)

    return () => {
      clearInterval(interval)
      calendarApi.off('datesSet', handleViewChange)
    }
  }, [calendarApi])

  return (
    <div 
      style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      overflow: 'hidden',
      width: '100%',
      position: 'relative'
      }}
      onClick={handleMainContainerClick}
    >
      {/* Calendar Header */}
              <CalendarHeader
          view={view}
          currentDate={currentDate}
          currentDayName={currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          isToday={currentDate.toDateString() === new Date().toDateString()}
          calendarApi={calendarApi}
          onViewChange={setView}
          onOpenAppointmentPanel={openAppointmentPanel}
          showDatePicker={showDatePicker}
          onShowDatePicker={setShowDatePicker}
          showAddMenu={showAddMenu}
          onShowAddMenu={setShowAddMenu}
          showAddWorkerMenu={showAddWorkerMenu}
          onShowAddWorkerMenu={setShowAddWorkerMenu}
          onCloseAllMenus={() => {
            setShowDatePicker(false)
            setShowAddMenu(false)
            setShowAddWorkerMenu(false)
          }}
          availableWorkers={availableWorkers}
          workersInCalendar={workersInCalendar}
          activeWorkers={activeWorkers}
          teamMembers={teamMembers}
          onAddWorker={handleAddWorker}
          onRemoveWorker={handleRemoveWorker}
          events={events}
          selectedWorkerId={selectedWorkerId}
          onWorkerSelect={setSelectedWorkerId}
        />

        {/* Quick Actions Popup */}
        {showQuickActions && selectedTimeSlot && (
        <div className="quick-actions-popup">
          <QuickActionsPopup
            showQuickActions={showQuickActions}
            selectedTimeSlot={selectedTimeSlot}
            onOpenAppointmentPanel={openAppointmentPanel}
            teamMembers={teamMembers}
          />
        </div>
        )}

        {/* Appointment Panel */}
        <AppointmentPanel
          show={showAppointmentPanel}
          appointmentType={appointmentType}
          appointmentTimeSlot={appointmentTimeSlot}
          teamMembers={teamMembers}
          onClose={() => {
            setShowAppointmentPanel(false)
            setIsEditMode(false)
            setIsSeriesEditMode(false)
            setEditingAppointmentId(null)
            setEditingSeriesId(null)
            setEditingSeriesAppointments([])
          }}
          onEditTimeSlot={handleEditTimeSlot}
          isEditMode={isEditMode}
          isSeriesEditMode={isSeriesEditMode}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          isCreatingAppointment={isCreatingAppointment}
          onCreate={async () => {
            // Prevent duplicate submissions
            if (isCreatingAppointment) {
              console.log('Already creating appointment, ignoring duplicate click')
              return
            }
            
            setIsCreatingAppointment(true)
            
            try {
              console.log('CREATE CLICKED')
              console.log('=== APPOINTMENT CREATE STARTED ===')
              console.log('Initial formState:', formState)
              console.log('isEditMode:', isEditMode)
              console.log('appointmentType:', appointmentType)
            
            const startTime = appointmentTimeSlot?.start || new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 9, 0, 0, 0).toISOString()
            const endTime = appointmentTimeSlot?.end || new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 10, 0, 0, 0).toISOString()
            
            // Removed business hours validation - appointments can be created at any time
            
            // Validate group appointments
            if (appointmentType === 'group') {
              if (!formState.selectedClient && !formState.isWalkIn) {
                alert('Please select a client or use walk-in for the group appointment')
              return
              }
              if (!formState.groupMembers || formState.groupMembers.length === 0) {
                alert('Please add at least one staff member to the group appointment')
                return
              }
            }
            
            console.log('3. GENERATING TITLE')
            // Generate title
            const title = (() => {
              let titleText = ''
              
              // Get service names instead of IDs
              if (formState.selectedServices.length > 0) {
                
                const serviceNames = formState.selectedServices.map(serviceId => {
                  // Try to find the service by ID
                  let service = mockServices.find(s => s.id === serviceId)
                  
                  // If not found, try string comparison
                  if (!service) {
                    service = mockServices.find(s => String(s.id) === String(serviceId))
                  }
                  
                  // If still not found and it's a valid number, try by index
                  if (!service && !isNaN(Number(serviceId)) && Number(serviceId) > 0) {
                    const index = Number(serviceId) - 1
                    if (index >= 0 && index < mockServices.length) {
                      service = mockServices[index]
                    }
                  }
                  
                  // Return service name or the original ID if not found
                  return service ? service.name : String(serviceId)
                })
                titleText = serviceNames.join(', ')
              } else {
                titleText = appointmentType === 'blocked' ? 'Blocked Time' : 'Appointment'
              }
              
              // Add notes to title if they exist
              
              if (formState.appointmentNotes && formState.appointmentNotes.trim()) {
                titleText += ` - ${formState.appointmentNotes}`
              }
              
              return titleText
            })()
            
            console.log('4. TITLE GENERATED: ' + title)
            
            console.log('ABOUT TO MAKE API CALL')

            // Skip API call for series edit mode - handle it locally only
            if (isSeriesEditMode && editingSeriesId) {
              console.log('=== SKIPPING API CALL FOR SERIES EDIT ===')
              
              // Get client data
              const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
              
              // Import the recurring utilities
              const { createRecurringAppointments } = await import('./utils/recurringUtils')
              
              // Create base appointment data (without id, start, end)
              const baseAppointment = {
                status: 'confirmed',
                staffName: teamMembers.find(m => m.id === formState.selectedStaff)?.name || 'Any Staff',
                serviceName: (() => {
                  if (formState.selectedServices.length > 0) {
                    const serviceNames = formState.selectedServices.map(serviceId => {
                      const service = mockServices.find(s => s.id === serviceId)
                      return service ? service.name : String(serviceId)
                    })
                    return serviceNames.join(', ')
                  }
                  return 'Service'
                })(),
                clientName: formState.selectedClient ? 
                  `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                  'Walk-in Client',
                staffId: formState.selectedStaff,
                clientId: formState.selectedClient,
                isWalkIn: formState.isWalkIn,
                appointmentType: appointmentType,
                client: selectedClientData,
                                      extendedProps: {
                        notes: formState.appointmentNotes,
                        services: formState.selectedServices || [],
                        staffId: formState.selectedStaff,
                        clientId: formState.selectedClient,
                        client: selectedClientData,
                        isWalkIn: formState.isWalkIn
                      }
              }
              
              // Get start time from the appointment
              const startTimeString = new Date(startTime).toTimeString().slice(0, 5) // HH:MM format
              const duration = parseInt(formState.appointmentDuration) || 60
              
              // Check if we have a valid recurring pattern
              if (!formState.recurringPattern) {
                console.error('No recurring pattern found for series edit')
                return
              }
              
              // Create all new recurring appointments
              const newRecurringAppointments = createRecurringAppointments(
                baseAppointment,
                formState.recurringPattern,
                formState.appointmentDate,
                startTimeString,
                duration
              )
              
              // Remove all appointments in the series and add the new ones
              setEvents(prevEvents => {
                const filteredEvents = prevEvents.filter(event => 
                  (event.seriesId || event.extendedProps?.seriesId) !== editingSeriesId
                )
                const newEvents = [...filteredEvents, ...newRecurringAppointments]
                console.log('EVENTS AFTER SERIES EDIT:', newEvents)
                
                // CRITICAL FIX: Force calendar refresh to ensure new appointments are immediately clickable
                setTimeout(() => {
                  if (calendarApi) {
                    console.log('Forcing calendar refresh after series edit')
                    calendarApi.refetchEvents()
                    calendarApi.render()
                  }
                }, 50)
                
                return newEvents
              })
              
              // Reset series edit mode
              setIsSeriesEditMode(false)
              setEditingSeriesId(null)
              setEditingSeriesAppointments([])
              setShowAppointmentPanel(false)
              
              return // Exit early, don't continue with API call
            }

            try {
              console.log('=== MAKING API CALL ===')
              console.log('URL:', isEditMode ? `/api/appointments/${editingAppointmentId}` : '/api/appointments')
              console.log('Method:', isEditMode ? 'PUT' : 'POST')
              
              // Save appointment to API
              const url = isEditMode ? `/api/appointments/${editingAppointmentId}` : '/api/appointments'
              const method = isEditMode ? 'PUT' : 'POST'
              
              // Get the actual staff member's name
              const selectedStaffMember = teamMembers.find(m => m.id === formState.selectedStaff)
              const staffName = selectedStaffMember?.name || 'Any Staff'
              
              // Enhanced Block Time logic
              let finalStartTime = startTime
              let finalEndTime = endTime
              
              if (appointmentType === 'blocked') {
                if (formState.blockType === 'full') {
                  // For full days off, create individual events for each day
                  if (formState.startDate && formState.endDate) {
                    // Generate individual day events
                    const startDate = new Date(formState.startDate)
                    const endDate = new Date(formState.endDate)
                    const seriesId = `block-series-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    
                    const dailyEvents: EventShape[] = []
                    const currentDate = new Date(startDate)
                    
                    while (currentDate <= endDate) {
                      const dayStart = new Date(currentDate)
                      dayStart.setHours(0, 0, 0, 0)
                      
                      const dayEnd = new Date(currentDate)
                      dayEnd.setHours(23, 59, 59, 999)
                      
                      const dailyEvent = {
                        id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: 'Blocked Time',
                        start: dayStart.toISOString(),
                        end: dayEnd.toISOString(),
                        status: 'confirmed',
                        staffName: staffName,
                        serviceName: 'Blocked Time',
                        clientName: 'Blocked Time',
                        staffId: formState.selectedStaff,
                        clientId: '',
                        isWalkIn: false,
                        appointmentType: 'blocked',
                        seriesId: seriesId,

                        extendedProps: {
                notes: formState.appointmentNotes,
                          services: [],
                          staffId: formState.selectedStaff,
                          clientId: '',
                          isWalkIn: false,
                blockReason: formState.blockReason,
                          blockType: 'full',
                          seriesId: seriesId
                        }
                      }
                      
                      dailyEvents.push(dailyEvent)
                      
                      // Move to next day
                      currentDate.setDate(currentDate.getDate() + 1)
                    }
                    
                    // Add all daily events to events list
                    setEvents(prevEvents => {
                      const newEvents = [...prevEvents, ...dailyEvents]
                      
                      // CRITICAL FIX: Force calendar refresh to ensure new appointments are immediately clickable
                      setTimeout(() => {
                        if (calendarApi) {
                          console.log('Forcing calendar refresh after blocked time appointments creation')
                          calendarApi.refetchEvents()
                          calendarApi.render()
                        }
                      }, 50)
                      
                      return newEvents
                    })
                    
                    // Close panel and return early
                    setShowAppointmentPanel(false)
                    setIsEditMode(false)
                    setEditingAppointmentId(null)
                    return
                  }
                } else if (formState.blockType === 'partial') {
                  // For partial day blocks, use the existing time logic
                  // If repeat weekly is enabled, create recurring appointments
                  if (formState.repeatWeekly) {
                    // Create weekly recurring pattern
                    const recurringPattern = {
                      frequency: 'weekly' as const,
                      interval: 1,
                      endAfter: 52, // 52 weeks (1 year)
                      noEndDate: false,
                      keepSameTime: true,
                      flexibleTime: false
                    }
                    
                    // Import recurring utilities
                    const { createRecurringAppointments } = await import('./utils/recurringUtils')
                    
                    // Create base appointment data
                    const baseAppointment = {
                      status: 'confirmed',
                      staffName: staffName,
                      serviceName: 'Blocked Time',
                      clientName: 'Blocked Time',
                      staffId: formState.selectedStaff,
                      clientId: '',
                      isWalkIn: false,
                      appointmentType: 'blocked',
                      client: undefined,
                      extendedProps: {
                        notes: formState.appointmentNotes,
                        services: [],
                        staffId: formState.selectedStaff,
                        clientId: '',
                        isWalkIn: false,
                        blockReason: formState.blockReason,
                        blockType: 'partial',
                        repeatWeekly: true
                      }
                    }
                    
                    // Create recurring appointments
                    const startTimeString = new Date(startTime).toTimeString().slice(0, 5) // HH:MM format
                    const recurringAppointments = createRecurringAppointments(
                      baseAppointment,
                      recurringPattern,
                      formState.appointmentDate,
                      startTimeString,
                      parseInt(formState.appointmentDuration) || 60
                    )
                    
                    // Add recurring appointments to events
                    setEvents(prevEvents => {
                      const newEvents = [...prevEvents, ...recurringAppointments]
                      
                      // CRITICAL FIX: Force calendar refresh to ensure new appointments are immediately clickable
                      setTimeout(() => {
                        if (calendarApi) {
                          console.log('Forcing calendar refresh after recurring blocked time appointments creation')
                          calendarApi.refetchEvents()
                          calendarApi.render()
                        }
                      }, 50)
                      
                      return newEvents
                    })
                    
                    // Close panel and return early
                    setShowAppointmentPanel(false)
                    setIsEditMode(false)
                    setEditingAppointmentId(null)
                    return
                  }
                }
              }
              
              const requestBody = {
                title,
                start: finalStartTime,
                end: finalEndTime,
              appointmentType,
                notes: formState.appointmentNotes,
                blockReason: formState.blockReason,
                selectedServices: appointmentType === 'blocked' ? [] : (formState.selectedServices || []),
              selectedStaff: formState.selectedStaff,
                selectedClient: appointmentType === 'blocked' ? '' : formState.selectedClient,
                isWalkIn: appointmentType === 'blocked' ? false : (!formState.selectedStaff || formState.selectedStaff.trim() === ''), // Walk-in if no staff selected
                staffName: staffName,
                // Group appointment data
                groupMembers: appointmentType === 'group' ? (formState.groupMembers || []) : [],
                isGroupAppointment: appointmentType === 'group',
                // Enhanced Block Time data
                blockType: appointmentType === 'blocked' ? (formState.blockType || 'partial') : undefined,
                startDate: appointmentType === 'blocked' ? formState.startDate : undefined,
                endDate: appointmentType === 'blocked' ? formState.endDate : undefined,
                repeatWeekly: appointmentType === 'blocked' ? (formState.repeatWeekly || false) : undefined
              }
              
              console.log('CalendarClient - Sending request:', {
                url,
                method,
                selectedStaff: formState.selectedStaff,
                selectedClient: formState.selectedClient,
                isWalkIn: formState.isWalkIn,
                appointmentType,
                isEditMode,
                editingAppointmentId
              })
              
              // Debug logging for appointment updates
              if (isEditMode && editingAppointmentId) {
                appointmentDebugger.logUpdateStart(editingAppointmentId, isEditMode, formState, requestBody)
              }
              
              const response = await fetch(url, {
                method: method,
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
              })

              if (response.ok) {
                console.log('=== API CALL SUCCESSFUL ===')
                const savedAppointment = await response.json()
                console.log('APPOINTMENT SAVED:', savedAppointment)
                console.log('FULL savedAppointment:', JSON.stringify(savedAppointment, null, 2))
                console.log('CURRENT EVENTS BEFORE UPDATE:', events)
                
                // CRITICAL FIX: Add the new appointment to events state for non-edit mode
                if (!isEditMode) {
                  // Get client and service details for proper display
                  const selectedClientData = formState.selectedClient ? allClients.find(c => c.id === formState.selectedClient) : null
                  const selectedServiceData = formState.selectedServices?.[0] ? mockServices.find(s => s.id === formState.selectedServices[0]) : null
                  
                  // Convert the saved appointment to EventShape format
                  const newEvent: EventShape = {
                    id: savedAppointment.id,
                    start: savedAppointment.start,
                    end: savedAppointment.end,
                    status: savedAppointment.status || 'scheduled',
                    appointmentType: savedAppointment.appointmentType || 'single',
                    staffName: savedAppointment.staffName || staffName,
                    serviceName: savedAppointment.serviceName || selectedServiceData?.name || 'Service',
                    clientName: savedAppointment.clientName || (selectedClientData ? `${selectedClientData.firstName} ${selectedClientData.lastName || ''}`.trim() : 'Walk-in Client'),
                    staffId: savedAppointment.staffId || formState.selectedStaff,
                    serviceId: savedAppointment.serviceId || formState.selectedServices?.[0],
                    clientId: savedAppointment.clientId || formState.selectedClient,
                    isWalkIn: savedAppointment.isWalkIn || !formState.selectedStaff,
                    client: selectedClientData || undefined,
                    extendedProps: {
                      staffId: savedAppointment.staffId || formState.selectedStaff,
                      clientId: savedAppointment.clientId || formState.selectedClient,
                      services: formState.selectedServices?.map(serviceId => {
                        const service = mockServices.find(s => s.id === serviceId)
                        return service?.name || serviceId
                      }) || [],
                      notes: savedAppointment.notes || formState.appointmentNotes,
                      appointmentType: savedAppointment.appointmentType || 'single',
                      isWalkIn: savedAppointment.isWalkIn || !formState.selectedStaff,
                      client: selectedClientData || undefined
                    }
                  }
                  
                  // Add the new appointment to the events state
                  setEvents(prevEvents => {
                    const newEvents = [...prevEvents, newEvent]
                    console.log('ADDED NEW APPOINTMENT TO EVENTS:', newEvent)
                    console.log('TOTAL EVENTS AFTER ADD:', newEvents.length)
                    return newEvents
                  })
                }
                
                // Send SMS confirmation for new appointments (not edits)
                if (!isEditMode && formState.selectedClient && appointmentType !== 'blocked') {
                  try {
                    const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
                    if (selectedClientData && selectedClientData.phone) {
                      const appointmentDate = new Date(savedAppointment.start)
                      const appointmentTime = appointmentDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                      const appointmentDateStr = appointmentDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      
                      const smsData = {
                        appointmentId: savedAppointment.id,
                        clientName: `${selectedClientData.firstName} ${selectedClientData.lastName || ''}`.trim(),
                        clientPhone: selectedClientData.phone,
                        appointmentDate: appointmentDateStr,
                        appointmentTime: appointmentTime,
                        serviceName: savedAppointment.serviceName || 'Service',
                        staffName: savedAppointment.staffName || 'Staff'
                      }
                      
                      // Send confirmation SMS
                      const smsResponse = await fetch('/api/sms/appointment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'confirmation',
                          appointmentId: savedAppointment.id
                        })
                      })
                      
                      if (smsResponse.ok) {
                        console.log('SMS confirmation sent successfully')
                      } else {
                        console.error('Failed to send SMS confirmation')
                      }
                    }
                  } catch (smsError) {
                    console.error('Error sending SMS confirmation:', smsError)
                  }
                }
                
                console.log('>>> ABOUT TO RUN AUTO-ADD LOGIC <<<')
                
                // AUTO-ADD DEBUG LOGGING
                console.log('AUTO-ADD DEBUG:', {
                  savedStaffId: savedAppointment.staffId,
                  savedStaffName: savedAppointment.staffName,
                  formStateSelectedStaff: formState.selectedStaff,
                  savedAppointmentKeys: Object.keys(savedAppointment),
                  currentWorkersInCalendar: workersInCalendar,
                  currentDate: currentDate,
                  appointmentStart: savedAppointment.start,
                  isStaffInCalendar: workersInCalendar.some(w => w.id === savedAppointment.staffId),
                  isEditMode: isEditMode,
                  activeWorkers: activeWorkers
                })
                
                // AUTO-ADD STAFF MEMBER TO APPOINTMENT'S DATE (not current calendar date)
                console.log('AUTO-ADD LOGIC CHECK:', {
                  hasSelectedStaff: !!formState.selectedStaff,
                  selectedStaffId: formState.selectedStaff,
                  isEditMode: isEditMode,
                  willProceed: formState.selectedStaff && !isEditMode
                })
                
                // Use formState.selectedStaff since we know it has the correct value
                console.log('>>> ABOUT TO CHECK AUTO-ADD CONDITION <<<')
                console.log('formState.selectedStaff:', formState.selectedStaff)
                console.log('isEditMode:', isEditMode)
                console.log('Condition will be:', formState.selectedStaff && !isEditMode)
                
                if (formState.selectedStaff && !isEditMode) {
                  console.log('>>> AUTO-ADD CONDITION PASSED <<<')
                  const selectedStaffId = formState.selectedStaff
                  
                  // Get the appointment's date (not current calendar date)
                  const appointmentDate = new Date(savedAppointment.start)
                  const appointmentDateKey = appointmentDate.toISOString().split('T')[0]
                  
                  console.log('CROSS-DATE AUTO-ADD:', {
                    selectedStaffId: selectedStaffId,
                    staffName: staffName,
                    currentCalendarDate: currentDate.toISOString().split('T')[0],
                    appointmentDate: appointmentDateKey,
                    isCrossDate: appointmentDateKey !== currentDate.toISOString().split('T')[0]
                  })
                  
                  // Check if staff is already on the APPOINTMENT'S date
                  const appointmentDateWorkers = activeWorkersByDate[appointmentDateKey] || []
                  const isStaffAlreadyOnAppointmentDate = appointmentDateWorkers.includes(selectedStaffId)
                  
                  console.log('AUTO-ADD STAFF CHECK:', {
                    selectedStaffId: selectedStaffId,
                    isStaffAlreadyOnAppointmentDate: isStaffAlreadyOnAppointmentDate,
                    appointmentDateWorkers: appointmentDateWorkers,
                    currentDateWorkers: activeWorkers,
                    staffName: staffName,
                    appointmentDate: appointmentDateKey
                  })
                  
                  if (!isStaffAlreadyOnAppointmentDate) {
                    console.log('Auto-adding staff member to appointment date:', {
                      staffId: selectedStaffId,
                      staffName: staffName,
                      appointmentDate: appointmentDateKey,
                      appointmentType: appointmentType
                    })
                    try {
                    originalHandleAddWorker(selectedStaffId, appointmentDateKey)
                    } catch (addWorkerError) {
                      console.error('Error adding worker to appointment date:', addWorkerError)
                    }
                  } else {
                    console.log('Staff member already on appointment date:', {
                      staffId: selectedStaffId,
                      staffName: staffName,
                      appointmentDate: appointmentDateKey,
                      appointmentType: appointmentType
                    })
                  }
                } else {
                  console.log('AUTO-ADD SKIPPED:', {
                    reason: !formState.selectedStaff ? 'No staff selected' : 'Edit mode',
                    formStateSelectedStaff: formState.selectedStaff,
                    isEditMode: isEditMode
                  })
                }
                
                if (isEditMode) {
                  // Add client object to savedAppointment if it's missing
                  const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
                  
                  // CRITICAL FIX: Always update the appointment in the events list for edit mode
                  console.log('=== APPLYING EDIT MODE FIX ===')
                  
                  // Get staff member name
                  const selectedStaffMember = teamMembers.find(m => m.id === formState.selectedStaff)
                  const staffName = selectedStaffMember?.name || 'Any Staff'

                  // Generate client name
                  const clientName = formState.selectedClient ? 
                    `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                    'Walk-in Client'

                  // Convert service IDs to service names
                  const serviceNames = (formState.selectedServices || []).map((serviceId: string) => {
                    let service = mockServices.find(s => s.id === serviceId)
                    
                    if (!service) {
                      service = mockServices.find(s => String(s.id) === String(serviceId))
                    }
                    
                    if (!service && !isNaN(Number(serviceId)) && Number(serviceId) > 0) {
                      const index = Number(serviceId) - 1
                      if (index >= 0 && index < mockServices.length) {
                        service = mockServices[index]
                      }
                    }
                    
                    return service ? service.name : String(serviceId)
                  })

                  // Create the corrected appointment object
                  const appointmentWithClient: EventShape = {
                    id: editingAppointmentId!,
                    status: 'confirmed',
                    start: savedAppointment.start,
                    end: savedAppointment.end,
                    staffName: staffName,
                    serviceName: serviceNames[0] || savedAppointment.serviceName || 'Service',
                    clientName: clientName,
                    staffId: formState.selectedStaff,
                    clientId: formState.selectedClient,
                    isWalkIn: formState.isWalkIn,
                    appointmentType: appointmentType,
                    client: selectedClientData,
                    extendedProps: {
                      notes: formState.appointmentNotes || savedAppointment.notes,
                      services: serviceNames.length > 0 ? serviceNames : savedAppointment.extendedProps?.services || [],
                      staffId: formState.selectedStaff,
                      clientId: formState.selectedClient,
                      client: selectedClientData,
                      isWalkIn: formState.isWalkIn,
                      blockReason: formState.blockReason || savedAppointment.blockReason,
                      // Preserve any existing extended props that we're not updating
                      ...savedAppointment.extendedProps
                    }
                  }
                  
                  console.log('Generated updated appointment:', appointmentWithClient)
                  
                  // Update existing appointment in the events list
                  setEvents(prevEvents => {
                    const newEvents = prevEvents.map(event => 
                      event.id === editingAppointmentId ? appointmentWithClient : event
                    )
                    console.log('EVENTS AFTER EDIT UPDATE:', newEvents)
                    
                    // Force calendar refresh to ensure changes are visible
                    setTimeout(() => {
                      if (calendarApi) {
                        console.log('Forcing calendar refresh after edit update')
                        calendarApi.refetchEvents()
                        calendarApi.render()
                      }
                    }, 50)
                    
                    return newEvents
                  })
                  
                  // Update the selectedAppointment state to reflect the changes in the modal
                  setSelectedAppointment(appointmentWithClient)
                  
                  // Debug logging for successful update
                  if (editingAppointmentId) {
                    appointmentDebugger.logUpdateSuccess(editingAppointmentId, savedAppointment, events, appointmentWithClient)
                  }
                  
                  // Handle recurring appointment changes
                  if (formState.isRecurring && formState.recurringPattern) {
                    // If recurring is enabled, create new recurring appointments
                    console.log('=== EDITING RECURRING APPOINTMENT ===')
                    
                    // Import the recurring utilities
                    const { createRecurringAppointments } = await import('./utils/recurringUtils')
                    
                    // Create base appointment data (without id, start, end)
                    const baseAppointment = {
                      status: 'confirmed',
                      staffName: staffName,
                      serviceName: savedAppointment.serviceName || 'Service',
                      clientName: formState.selectedClient ? 
                        `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                        'Walk-in Client',
                      staffId: formState.selectedStaff,
                      clientId: formState.selectedClient,
                      isWalkIn: formState.isWalkIn,
                      appointmentType: appointmentType,
                      client: selectedClientData,
                      extendedProps: {
                        notes: formState.appointmentNotes,
                        services: savedAppointment.extendedProps?.services || [],
                        staffId: formState.selectedStaff,
                        clientId: formState.selectedClient,
                        client: selectedClientData,
                        isWalkIn: formState.isWalkIn
                      }
                    }
                    
                    // Get start time from the appointment
                    const startTimeString = new Date(startTime).toTimeString().slice(0, 5) // HH:MM format
                    const duration = parseInt(formState.appointmentDuration) || 60
                    
                    // Create all recurring appointments
                    const recurringAppointments = createRecurringAppointments(
                      baseAppointment,
                      formState.recurringPattern,
                      formState.appointmentDate,
                      startTimeString,
                      duration
                    )
                    
                    // Remove the original appointment and add all recurring appointments
                    setEvents(prevEvents => {
                      const filteredEvents = prevEvents.filter(event => event.id !== editingAppointmentId)
                      const newEvents = [...filteredEvents, ...recurringAppointments]
                      console.log('EVENTS AFTER RECURRING EDIT:', newEvents)
                      return newEvents
                    })
                    
                  } else {
                    // If recurring is disabled, the appointment was already updated above with the main fix
                    console.log('=== NON-RECURRING EDIT - ALREADY PROCESSED IN MAIN FIX ===')
                  }
                  
                } else {
                  // Handle group appointments - create individual appointments for each member
                  if (appointmentType === 'group' && formState.groupMembers && formState.groupMembers.length > 0) {
                    console.log('Creating individual appointments for group members:', formState.groupMembers)
                    
                    // Get client data
                    console.log('=== GROUP APPOINTMENT CREATION DEBUG ===')
                    console.log('formState.selectedClient:', formState.selectedClient)
                    console.log('allClients for group:', allClients.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })))
                    const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
                    console.log('selectedClientData for group:', selectedClientData)
                    const clientName = formState.selectedClient ? 
                      `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                      'Walk-in Client'
                    console.log('clientName for group:', clientName)
                    
                    // Create individual appointments for each group member
                    const groupAppointments: EventShape[] = []
                    
                    for (const member of formState.groupMembers) {
                      // Generate unique ID for each member's appointment
                      const memberAppointmentId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      
                      // Validate and convert time strings to proper ISO format
                      let startTime: string
                      let endTime: string
                      
                      try {
                        // Check if startTime and endTime are already ISO strings
                        if (member.startTime && member.startTime.includes('T')) {
                          startTime = member.startTime
                        } else {
                          // Convert time string to proper date by combining with appointment date
                          const appointmentDate = new Date(appointmentTimeSlot?.start || currentDate)
                          const [hours, minutes] = member.startTime.split(':').map(Number)
                          
                          // Create a new date with the appointment date and the time
                          const startDate = new Date(appointmentDate)
                          startDate.setHours(hours, minutes, 0, 0)
                          
                          if (isNaN(startDate.getTime())) {
                            console.error('Invalid start time for member:', member.staffName, member.startTime)
                            continue // Skip this member if time is invalid
                          }
                          startTime = startDate.toISOString()
                        }
                        
                        if (member.endTime && member.endTime.includes('T')) {
                          endTime = member.endTime
                        } else {
                          // Convert time string to proper date by combining with appointment date
                          const appointmentDate = new Date(appointmentTimeSlot?.start || currentDate)
                          const [hours, minutes] = member.endTime.split(':').map(Number)
                          
                          // Create a new date with the appointment date and the time
                          const endDate = new Date(appointmentDate)
                          endDate.setHours(hours, minutes, 0, 0)
                          
                          if (isNaN(endDate.getTime())) {
                            console.error('Invalid end time for member:', member.staffName, member.endTime)
                            continue // Skip this member if time is invalid
                          }
                          endTime = endDate.toISOString()
                        }
                      } catch (timeError) {
                        console.error('Error processing time for member:', member.staffName, timeError)
                        continue // Skip this member if time processing fails
                      }
                      
                      // Create appointment for this member
                      const memberAppointment: EventShape = {
                        id: memberAppointmentId,
                        status: 'confirmed',
                        start: startTime,
                        end: endTime,
                        staffName: member.staffName,
                        serviceName: member.services[0] || 'Service', // Display service name
                        clientName: clientName,
                        staffId: member.staffId,
                        clientId: formState.selectedClient,
                        isWalkIn: formState.isWalkIn,
                        appointmentType: 'single', // Individual appointments are single type
                        client: selectedClientData, // Include full client object
                        extendedProps: {
                          notes: formState.appointmentNotes,
                          services: member.services, // Store service names for display
                          staffId: member.staffId,
                          clientId: formState.selectedClient,
                          client: selectedClientData,
                          isWalkIn: formState.isWalkIn,
                          isGroupMember: true,
                          groupId: savedAppointment.id // Link to the main group appointment
                        }
                      }
                      
                      console.log('Created group member appointment:', {
                        memberId: memberAppointmentId,
                        staffId: member.staffId,
                        staffName: member.staffName,
                        clientName: clientName,
                        startTime: startTime,
                        endTime: endTime
                      })
                      
                      groupAppointments.push(memberAppointment)
                      
                      // Auto-add worker to calendar if not already present
                      const appointmentDate = new Date(startTime)
                      const appointmentDateKey = appointmentDate.toISOString().split('T')[0]
                      const appointmentDateWorkers = activeWorkersByDate[appointmentDateKey] || []
                      const isStaffAlreadyOnAppointmentDate = appointmentDateWorkers.includes(member.staffId)
                      
                      if (!isStaffAlreadyOnAppointmentDate) {
                        console.log('Auto-adding group member to calendar:', {
                          staffId: member.staffId,
                          staffName: member.staffName,
                          appointmentDate: appointmentDateKey
                        })
                        try {
                          originalHandleAddWorker(member.staffId, appointmentDateKey)
                        } catch (addWorkerError) {
                          console.error('Error adding group member to calendar:', addWorkerError)
                        }
                      }
                    }
                    
                    // Handle recurring group appointments
                    if (formState.isRecurring && formState.recurringPattern) {
                      console.log('=== CREATING RECURRING GROUP APPOINTMENTS ===')
                      console.log('Recurring pattern:', formState.recurringPattern)
                      
                      // Import the recurring utilities
                      const { createRecurringAppointments } = await import('./utils/recurringUtils')
                      
                      // Create recurring appointments for each group member
                      const allRecurringGroupAppointments: EventShape[] = []
                      
                      for (const member of formState.groupMembers) {
                        // Create base appointment data for this member (without id, start, end)
                        const baseAppointment = {
                          status: 'confirmed',
                          staffName: member.staffName,
                          serviceName: member.services[0] || 'Service', // Display service name
                          clientName: clientName,
                          staffId: member.staffId,
                          clientId: formState.selectedClient,
                          isWalkIn: formState.isWalkIn,
                          appointmentType: 'single', // Individual appointments are single type
                          client: selectedClientData,
                          extendedProps: {
                            notes: formState.appointmentNotes,
                            services: member.services, // Store service names for display
                            staffId: member.staffId,
                            clientId: formState.selectedClient,
                            client: selectedClientData,
                            isWalkIn: formState.isWalkIn,
                            isGroupMember: true,
                            groupId: savedAppointment.id // Link to the main group appointment
                          }
                        }
                        
                        // Get start time from the member's time
                        const startTimeString = member.startTime.includes('T') 
                          ? new Date(member.startTime).toTimeString().slice(0, 5) // HH:MM format
                          : member.startTime
                        const duration = member.duration
                        
                        // Create recurring appointments for this member
                        const memberRecurringAppointments = createRecurringAppointments(
                          baseAppointment,
                          formState.recurringPattern,
                          formState.appointmentDate,
                          startTimeString,
                          duration
                        )
                        
                        // Auto-add workers for each recurring appointment
                        for (const recurringAppointment of memberRecurringAppointments) {
                          const appointmentDate = new Date(recurringAppointment.start)
                          const appointmentDateKey = appointmentDate.toISOString().split('T')[0]
                          const appointmentDateWorkers = activeWorkersByDate[appointmentDateKey] || []
                          const isStaffAlreadyOnAppointmentDate = appointmentDateWorkers.includes(recurringAppointment.staffId || '')
                          
                          if (!isStaffAlreadyOnAppointmentDate && recurringAppointment.staffId) {
                            console.log('Auto-adding worker for recurring group appointment:', {
                              staffId: recurringAppointment.staffId,
                              appointmentDate: appointmentDateKey
                            })
                            try {
                              originalHandleAddWorker(recurringAppointment.staffId, appointmentDateKey)
                            } catch (addWorkerError) {
                              console.error('Error adding worker for recurring group appointment:', addWorkerError)
                            }
                          }
                        }
                        
                        allRecurringGroupAppointments.push(...memberRecurringAppointments)
                      }
                      
                                              // Add all recurring group appointments to events
                        setTimeout(() => {
                          setEvents(prevEvents => {
                            // Filter out any duplicate appointments
                            const uniqueRecurringGroupAppointments = allRecurringGroupAppointments.filter(newAppt => 
                              !prevEvents.some(existingAppt => existingAppt.id === newAppt.id)
                            )
                            
                            if (uniqueRecurringGroupAppointments.length !== allRecurringGroupAppointments.length) {
                              console.log('Filtered out duplicate recurring group appointments:', 
                                allRecurringGroupAppointments.length - uniqueRecurringGroupAppointments.length, 'duplicates')
                            }
                            
                            const newEvents = [...prevEvents, ...uniqueRecurringGroupAppointments]
                            console.log('EVENTS AFTER RECURRING GROUP APPOINTMENTS:', newEvents)
                  
                            // CRITICAL FIX: Force calendar refresh to ensure new appointments are immediately clickable
                            setTimeout(() => {
                              if (calendarApi) {
                                console.log('Forcing calendar refresh after recurring group appointments creation')
                                calendarApi.refetchEvents()
                                calendarApi.render()
                              }
                            }, 50)
                  
                            return newEvents
                          })
                          
                          console.log('Recurring group appointments created successfully:', allRecurringGroupAppointments.length, 'appointments')
                        }, 100) // Small delay to ensure workers are added to calendar first
                      
                    } else {
                      // Add all group member appointments to events with a delay to ensure workers are added first
                      setTimeout(() => {
                        setEvents(prevEvents => {
                          // Filter out any duplicate appointments
                          const uniqueGroupAppointments = groupAppointments.filter(newAppt => 
                            !prevEvents.some(existingAppt => existingAppt.id === newAppt.id)
                          )
                          
                          if (uniqueGroupAppointments.length !== groupAppointments.length) {
                            console.log('Filtered out duplicate group appointments:', 
                              groupAppointments.length - uniqueGroupAppointments.length, 'duplicates')
                          }
                          
                          const newEvents = [...prevEvents, ...uniqueGroupAppointments]
                          console.log('EVENTS AFTER GROUP APPOINTMENTS:', newEvents)
                          
                          // CRITICAL FIX: Force calendar refresh to ensure new appointments are immediately clickable
                          setTimeout(() => {
                            if (calendarApi) {
                              console.log('Forcing calendar refresh after group appointments creation')
                              calendarApi.refetchEvents()
                              calendarApi.render()
                            }
                          }, 50)
                          
                          return newEvents
                        })
                        
                        console.log('Group appointments created successfully:', groupAppointments.length, 'appointments')
                      }, 100) // Small delay to ensure workers are added to calendar first
                    }
                    
                  } else {
                    // Regular single appointment
                    console.log('=== REGULAR APPOINTMENT CREATION DEBUG ===')
                    console.log('formState.selectedClient:', formState.selectedClient)
                    console.log('allClients:', allClients.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })))
                    const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
                    console.log('selectedClientData found:', selectedClientData)
                    
                    // Create appointment with full client data
                    const appointmentWithClient = {
                      ...savedAppointment,
                      clientId: formState.selectedClient,
                      clientName: formState.selectedClient ? 
                        `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                        'Walk-in Client',
                      client: formState.selectedClient ? selectedClientData : undefined,
                      serviceName: (() => {
                        if (formState.selectedServices.length > 0) {
                          const serviceNames = formState.selectedServices.map(serviceId => {
                            const service = mockServices.find(s => s.id === serviceId)
                            return service ? service.name : String(serviceId)
                          })
                          return serviceNames.join(', ')
                        }
                        return 'Service'
                      })(),
                      extendedProps: {
                        ...savedAppointment.extendedProps,
                        clientId: formState.selectedClient,
                        client: formState.selectedClient ? selectedClientData : undefined,
                        services: (() => {
                          // Convert service IDs to service names for storage
                          if (formState.selectedServices && formState.selectedServices.length > 0) {
                            return formState.selectedServices.map(serviceId => {
                              const service = mockServices.find(s => s.id === serviceId)
                              return service ? service.name : serviceId
                            })
                          }
                          return []
                        })()
                      }
                    }
                    console.log('appointmentWithClient:', appointmentWithClient)
                    
                    // Handle recurring appointments
                    if (formState.isRecurring && formState.recurringPattern) {
                      console.log('=== CREATING RECURRING APPOINTMENTS ===')
                      console.log('Recurring pattern:', formState.recurringPattern)
                      
                      // Import the recurring utilities
                      const { createRecurringAppointments } = await import('./utils/recurringUtils')
                      
                      // Create base appointment data (without id, start, end)
                      const baseAppointment = {
                        status: 'confirmed',
                        staffName: staffName,
                        serviceName: (() => {
                          if (formState.selectedServices.length > 0) {
                            const serviceNames = formState.selectedServices.map(serviceId => {
                              const service = mockServices.find(s => s.id === serviceId)
                              return service ? service.name : String(serviceId)
                            })
                            return serviceNames.join(', ')
                          }
                          return 'Service'
                        })(),
                        clientName: appointmentWithClient.clientName,
                        staffId: formState.selectedStaff,
                        clientId: formState.selectedClient,
                        isWalkIn: formState.isWalkIn,
                        appointmentType: appointmentType,
                        client: selectedClientData,
                        extendedProps: {
                          notes: formState.appointmentNotes,
                          services: (() => {
                            // Convert service IDs to service names for storage
                            if (formState.selectedServices && formState.selectedServices.length > 0) {
                              return formState.selectedServices.map(serviceId => {
                                const service = mockServices.find(s => s.id === serviceId)
                                return service ? service.name : serviceId
                              })
                            }
                            return []
                          })(),
                          staffId: formState.selectedStaff,
                          clientId: formState.selectedClient,
                          client: selectedClientData,
                          isWalkIn: formState.isWalkIn
                        }
                      }
                      
                      // Get start time from the appointment
                      const startTimeString = new Date(startTime).toTimeString().slice(0, 5) // HH:MM format
                      const duration = parseInt(formState.appointmentDuration) || 60
                      
                      // Create all recurring appointments
                      const recurringAppointments = createRecurringAppointments(
                        baseAppointment,
                        formState.recurringPattern,
                        formState.appointmentDate,
                        startTimeString,
                        duration
                      )
                      
                      console.log('Created recurring appointments:', recurringAppointments.length)
                      
                      // Auto-add workers for each recurring appointment
                      for (const recurringAppointment of recurringAppointments) {
                        const appointmentDate = new Date(recurringAppointment.start)
                        const appointmentDateKey = appointmentDate.toISOString().split('T')[0]
                        const appointmentDateWorkers = activeWorkersByDate[appointmentDateKey] || []
                        const isStaffAlreadyOnAppointmentDate = appointmentDateWorkers.includes(recurringAppointment.staffId || '')
                        
                        if (!isStaffAlreadyOnAppointmentDate && recurringAppointment.staffId) {
                          console.log('Auto-adding worker for recurring appointment:', {
                            staffId: recurringAppointment.staffId,
                            appointmentDate: appointmentDateKey
                          })
                          try {
                            originalHandleAddWorker(recurringAppointment.staffId, appointmentDateKey)
                          } catch (addWorkerError) {
                            console.error('Error adding worker for recurring appointment:', addWorkerError)
                          }
                        }
                      }
                      
                      // CRITICAL FIX: Force calendar refresh immediately to ensure new appointments are clickable
                      if (calendarApi) {
                        console.log('Forcing immediate calendar refresh after recurring appointments creation')
                        calendarApi.refetchEvents()
                        calendarApi.render()
                      }
                      
                      // Add all recurring appointments to events
                      setEvents(prevEvents => {
                        // Filter out any duplicate appointments
                        const uniqueRecurringAppointments = recurringAppointments.filter(newAppt => 
                          !prevEvents.some(existingAppt => existingAppt.id === newAppt.id)
                        )
                        
                        if (uniqueRecurringAppointments.length !== recurringAppointments.length) {
                          console.log('Filtered out duplicate recurring appointments:', 
                            recurringAppointments.length - uniqueRecurringAppointments.length, 'duplicates')
                        }
                        
                        const newEvents = [...prevEvents, ...uniqueRecurringAppointments]
                        console.log('EVENTS AFTER RECURRING APPOINTMENTS:', newEvents)
                        
                        // Additional calendar refresh after state update
                        setTimeout(() => {
                          if (calendarApi) {
                            console.log('Additional calendar refresh after recurring appointments state update')
                            calendarApi.refetchEvents()
                            calendarApi.render()
                          }
                        }, 10)
                        
                        return newEvents
                      })
                  
                                  } else {
                    // CRITICAL FIX: Force calendar refresh immediately to ensure the new appointment is clickable
                    if (calendarApi) {
                      console.log('Forcing immediate calendar refresh after appointment creation')
                      
                      // Add the appointment directly to FullCalendar to ensure it's immediately clickable
                      try {
                        calendarApi.addEvent({
                          id: appointmentWithClient.id,
                          title: appointmentWithClient.title,
                          start: appointmentWithClient.start,
                          end: appointmentWithClient.end,
                          extendedProps: appointmentWithClient.extendedProps
                        })
                        console.log('Added appointment directly to FullCalendar:', appointmentWithClient.id)
                      } catch (addEventError) {
                        console.warn('Failed to add appointment directly to FullCalendar:', addEventError)
                        // Fallback to refresh
                        calendarApi.refetchEvents()
                        calendarApi.render()
                      }
                    }
                    
                    // Add the new appointment to the events list (with duplicate check)
                    setEvents(prevEvents => {
                      // Check if appointment already exists
                      const existingAppointment = prevEvents.find(event => event.id === appointmentWithClient.id)
                      if (existingAppointment) {
                        console.log('Appointment already exists, skipping duplicate:', appointmentWithClient.id)
                        return prevEvents
                      }
                      
                      const newEvents = [...prevEvents, appointmentWithClient]
                      console.log('EVENTS AFTER UPDATE:', newEvents)
                      
                      // Auto-backup after critical operation
                      if (typeof window !== 'undefined') {
                        autoBackup()
                      }
                      
                      // Additional calendar refresh after state update
                      setTimeout(() => {
                        if (calendarApi) {
                          console.log('Additional calendar refresh after state update')
                          calendarApi.refetchEvents()
                          calendarApi.render()
                        }
                      }, 10)
                      
                      return newEvents
                    })
                  }
              }
            }
            
            // Reset form state
            setFormState({
              selectedClient: '',
              isWalkIn: false,
              selectedServices: [],
              selectedStaff: '',
              blockReason: '',
              appointmentNotes: '',
              searchQuery: '',
              showClientSearch: false,
              searchingClients: false,
              appointmentDate: new Date(),
                  showWeekPicker: false,
              appointmentDuration: '60',
              // Group appointment fields
              groupMembers: [],
              isGroupAppointment: false,
              // Recurring appointment fields
              isRecurring: false,
              recurringPattern: null,
              // Enhanced Block Time fields
              blockType: 'partial',
              startDate: null,
              endDate: null,
              repeatWeekly: false,
              repeatUntil: null
            })
            
                // Reset edit mode and close the panel
                setIsEditMode(false)
                setEditingAppointmentId(null)
            setShowAppointmentPanel(false)
                              } else {
                console.log('Response not ok - status:', response.status)
                
                // Special handling for local appointments (apt- prefix)
                if (response.status === 404 && editingAppointmentId && editingAppointmentId.startsWith('apt-')) {
                  console.log('Local appointment not found in backend, updating locally only')
                  
                  // Create the updated appointment object for local update
                  const selectedClientData = allClients.find((c: Client) => c.id === formState.selectedClient)
                  const clientName = formState.selectedClient ? 
                    `${selectedClientData?.firstName || ''} ${selectedClientData?.lastName || ''}`.trim() : 
                    'Walk-in Client'
                  const clientContact = formState.selectedClient ? 
                    selectedClientData?.phone || selectedClientData?.email || '' : ''
                  const serviceNames = (formState.selectedServices || []).map(serviceId => {
                    let service = mockServices.find(s => s.id === serviceId)
                    if (!service) {
                      service = mockServices.find(s => String(s.id) === String(serviceId))
                    }
                    if (!service && !isNaN(Number(serviceId)) && Number(serviceId) > 0) {
                      const index = Number(serviceId) - 1
                      if (index >= 0 && index < mockServices.length) {
                        service = mockServices[index]
                      }
                    }
                    return service ? service.name : String(serviceId)
                  })
                  
                  const updatedAppointment: EventShape = {
                    id: editingAppointmentId,
                    status: 'confirmed',
                    start: startTime,
                    end: endTime,
                    staffName: staffName,
                    serviceName: serviceNames[0] || 'Service',
                    clientName: clientName,
                    staffId: formState.selectedStaff,
                    clientId: formState.selectedClient,
                    isWalkIn: formState.isWalkIn,
                    appointmentType,
                    groupMembers: formState.groupMembers || [],
                    isGroupAppointment: appointmentType === 'group',
                    client: formState.selectedClient ? selectedClientData : undefined,
                    extendedProps: {
                      clientId: formState.selectedClient,
                                              services: (() => {
                          // Convert service IDs to service names for storage
                          if (formState.selectedServices && formState.selectedServices.length > 0) {
                            return formState.selectedServices.map(serviceId => {
                              const service = mockServices.find(s => s.id === serviceId)
                              return service ? service.name : serviceId
                            })
                          }
                          return []
                        })(),
                      staffId: formState.selectedStaff,
                      isWalkIn: formState.isWalkIn,
                      notes: formState.appointmentNotes
                    }
                  }
                  
                  // Update the appointment locally
                  setEvents(prevEvents => {
                    const newEvents = prevEvents.map(event => 
                      event.id === editingAppointmentId ? updatedAppointment : event
                    )
                    console.log('EVENTS AFTER LOCAL UPDATE:', newEvents)
                    return newEvents
                  })
                  
                  // Update the selectedAppointment state
                  setSelectedAppointment(updatedAppointment)
                  
                  // Reset form state and close panel
                  setFormState({
                    selectedClient: '',
                    isWalkIn: false,
                    selectedServices: [],
                    selectedStaff: '',
                    blockReason: '',
                    appointmentNotes: '',
                    searchQuery: '',
                    showClientSearch: false,
                    searchingClients: false,
                    appointmentDate: new Date(),
                    showWeekPicker: false,
                    appointmentDuration: '60',
                    groupMembers: [],
                    isGroupAppointment: false,
                    // Recurring appointment fields
                    isRecurring: false,
                    recurringPattern: null,
                    // Enhanced Block Time fields
                    blockType: 'partial',
                    startDate: null,
                    endDate: null,
                    repeatWeekly: false,
                    repeatUntil: null
                  })
                  
                  setIsEditMode(false)
                  setEditingAppointmentId(null)
                  setShowAppointmentPanel(false)
                  
                  console.log('Local appointment updated successfully')
                  return
                }
                
                let errorMessage = 'Failed to save appointment'
                
                try {
                  const errorData = await response.json()
                  
                  if (errorData && typeof errorData === 'object') {
                    if (errorData.details) {
                      errorMessage = `Failed to save appointment: ${errorData.details}`
                    } else if (errorData.error) {
                      errorMessage = `Failed to save appointment: ${errorData.error}`
                    } else {
                      errorMessage = 'Failed to save appointment: Unknown server error'
                    }
                  } else {
                    errorMessage = 'Failed to save appointment: Invalid server response'
                  }
                } catch (parseError) {
                  console.error('Error parsing error response:', parseError)
                  errorMessage = 'Failed to save appointment: Server communication error'
                }
                
                console.error('Full error details:', {
                  status: response.status,
                  statusText: response.statusText,
                  errorMessage
                })
                
                // Show error to user (you can replace this with a toast notification)
                alert(errorMessage)
              }
            } catch (error) {
              console.error('Error saving appointment:', error)
              console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                error: error
              })
              alert('Failed to save appointment: Network error')
            } finally {
              // Always reset the loading state
              setIsCreatingAppointment(false)
            }
          } catch (error) {
            console.error('Unexpected error in onCreate:', error)
            alert('An unexpected error occurred')
            setIsCreatingAppointment(false)
          }
          }}
          formState={formState}
          onFormUpdate={(key, value) => {
            setFormState(prev => ({ ...prev, [key]: value }))
          }}
          onClientSearch={(query) => {
            // Update the search query in form state
            setFormState(prev => ({ ...prev, searchQuery: query }))
            
            if (query.trim() === '') {
              setFilteredClients(allClients)
            } else {
              // Helper function to normalize phone numbers for search
              const normalizePhoneNumber = (phone: string) => {
                return phone.replace(/[\s\-\(\)\+\.]/g, '')
              }
              
              const filtered = allClients.filter(client => {
                const searchLower = query.toLowerCase()
                const name = `${client.firstName} ${client.lastName || ''}`.trim().toLowerCase()
                const email = (client.email || '').toLowerCase()
                const phone = client.phone || ''
                
                // Check name and email first
                const nameMatch = name.includes(searchLower)
                const emailMatch = email.includes(searchLower)
                
                // Check phone number (normalize both query and phone)
                const normalizedQuery = normalizePhoneNumber(query)
                const normalizedPhone = normalizePhoneNumber(phone)
                const phoneMatch = normalizedPhone.includes(normalizedQuery)
                
                // Debug logging for phone search
                if (normalizedQuery.length > 0) {
                  console.log('Phone search debug:', {
                    query: query,
                    normalizedQuery: normalizedQuery,
                    clientName: name,
                    clientPhone: phone,
                    normalizedPhone: normalizedPhone,
                    phoneMatch: phoneMatch,
                    nameMatch: nameMatch,
                    emailMatch: emailMatch
                  })
                }
                
                return nameMatch || emailMatch || phoneMatch
              })
              setFilteredClients(filtered)
            }
          }}
          onClientAdded={() => {
            // Refresh the client list after adding a new client
            loadClients()
          }}
          filteredClients={filteredClients}
          filteredServices={mockServices} // Always pass the actual mockServices array
          selectedServicesDetails={formState.selectedServices.map(id => 
            mockServices.find(service => service.id === id)
          ).filter(Boolean)} // Filter out any undefined services
          totalDuration={formState.selectedServices.reduce((total, serviceId) => {
            const service = mockServices.find(s => s.id === serviceId)
            return total + (service?.duration || 0)
          }, 0)}
          totalPrice={formState.selectedServices.reduce((total, serviceId) => {
            const service = mockServices.find(s => s.id === serviceId)
            return total + (service?.price || 0)
          }, 0)}
        />

        {/* Appointment Detail Modal */}
        <AppointmentDetailModal
          isOpen={showAppointmentDetail}
          appointment={selectedAppointment}
          position={modalPosition}
          onClose={() => {
            setShowAppointmentDetail(false)
            setSelectedAppointment(null)
          }}
          onEdit={handleEditAppointment}
          onDelete={handleDeleteAppointment}
          showDeleteConfirm={showDeleteConfirm}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={handleDeleteCancel}
          resolveStaffName={resolveStaffName}
          // Recurring appointment actions
          onEditThisAppointment={handleEditThisAppointment}
          onEditEntireSeries={handleEditEntireSeries}
          onViewAllInSeries={handleViewAllInSeries}
        />

        {/* Series View Modal */}
        <SeriesViewModal
          isOpen={showSeriesViewModal}
          seriesId={viewingSeriesId}
          appointments={viewingSeriesAppointments}
          onClose={() => {
            setShowSeriesViewModal(false)
            setViewingSeriesId(null)
            setViewingSeriesAppointments([])
          }}
          onEditSeries={handleSeriesEditFromModal}
          onDeleteSeries={handleSeriesDeleteFromModal}
        />

      {/* Calendar Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Custom FullCalendar Styling */
            .fc {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              width: 100% !important;
              min-width: 0 !important;
              flex: 1 !important;
            background: #ffffff !important;
            }

          /* Hide only the main toolbar, keep column headers */
            .fc-toolbar {
              display: none !important;
            }

            .fc-header-toolbar {
              display: none !important;
            }

          /* Ensure column headers are visible */
            .fc-col-header {
            display: table !important;
            background: #f9fafb !important;
            border-bottom: 1px solid #e5e7eb !important;
            }

            /* Calendar styling */
            .fc-timegrid-slot {
            border-color: #e5e7eb !important;
              height: 2rem !important;
            min-height: 2rem !important;
            background: #ffffff !important;
            cursor: pointer !important;
          }

          .fc-timegrid-slot:hover {
            background-color: #f3e8ff !important;
            }

          /* Ensure the slot lane (the actual clickable area) also has proper styling */
          .fc-timegrid-slot-lane {
            background: #ffffff !important;
          }

          .fc-timegrid-slot-lane:hover {
            background-color: #f3e8ff !important;
          }

            .fc-timegrid-slot-label {
            color: #374151 !important;
              font-weight: 600 !important;
            font-size: 0.75rem !important;
            background: #f9fafb !important;
            border-right: 1px solid #e5e7eb !important;
              text-align: right !important;
              padding-right: 8px !important;
            padding-top: 4px !important;
            }

            .fc-timegrid-axis {
            background: #f9fafb !important;
            border-right: 1px solid #e5e7eb !important;
              width: 100px !important;
              min-width: 100px !important;
              max-width: 100px !important;
            }

          .fc-timegrid-col {
            border-right: 1px solid #e5e7eb !important;
          }

          .fc-timegrid-col-frame {
            border-right: 1px solid #e5e7eb !important;
          }

          .fc-timegrid-slot-lane {
            border-bottom: 1px solid #f3f4f6 !important;
            background: #ffffff !important;
          }

          /* Column headers */
          .fc-col-header {
            background: #f9fafb !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          .fc-col-header-cell {
            border-right: 1px solid #e5e7eb !important;
            padding: 8px 4px !important;
            text-align: center !important;
            font-weight: 500 !important;
            font-size: 0.875rem !important;
            color: #374151 !important;
          }

          .fc-col-header-cell:last-child {
            border-right: none !important;
          }

          /* Ensure proper calendar layout */
          .fc-view-harness {
            height: 100% !important;
          }

          .fc-timegrid-body {
            height: 100% !important;
          }

          .fc-timegrid-slots {
            height: 100% !important;
          }

          .fc-timegrid-slot {
            height: 2rem !important;
            min-height: 2rem !important;
            position: relative !important;
            z-index: 1 !important;
            pointer-events: auto !important;
            }

            .fc-event {
              border-radius: 0.375rem !important;
              border: none !important;
              font-weight: 500 !important;
              font-size: 0.875rem !important;
              padding: 0.25rem 0.5rem !important;
              cursor: grab !important;
              transition: all 0.2s !important;
               user-select: none !important;
            }

            .fc-event:hover {
              transform: translateY(-1px) !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            }

            .fc-event.fc-event-dragging {
              cursor: grabbing !important;
              transform: scale(1.02) !important;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25) !important;
              z-index: 999 !important;
              opacity: 0.9 !important;
            }

             .fc-event.fc-event-resizing {
               cursor: ns-resize !important;
               z-index: 999 !important;
               opacity: 0.9 !important;
            }

            /* Scroller adjustment */
            .fc-scroller {
              overflow-y: auto !important;
            height: 100% !important;
              padding-bottom: 0 !important;
              width: 100% !important;
            }

            /* Force full width */
            .fc-view-harness {
              width: 100% !important;
              height: 100% !important;
            }

            .fc-timegrid {
              width: 100% !important;
              height: 100% !important;
            }

            .fc-scrollgrid {
              width: 100% !important;
            }

            .fc-scrollgrid-sync-table {
              width: 100% !important;
            }

            /* Resource column styling */
            .fc-resource-timeline-divider {
              border-right: 2px solid #e5e7eb !important;
            }

            .fc-resource-timeline-header {
              background: #f9fafb !important;
              border-bottom: 1px solid #e5e7eb !important;
            }

            .fc-resource-timeline-header-cell {
              background: #f9fafb !important;
              border-right: 1px solid #e5e7eb !important;
              font-weight: 600 !important;
              color: #374151 !important;
            }

            .fc-resource-timeline-body {
              border-right: 1px solid #e5e7eb !important;
            }

            .fc-resource-timeline-body-cell {
              border-right: 1px solid #e5e7eb !important;
            }

            /* Ensure appointments align properly with worker columns */
            .fc-resource-timeGridDay-view .fc-event,
            .fc-resource-timeGridWeek-view .fc-event {
              margin: 0 4px !important;
              border-radius: 4px !important;
              width: calc(100% - 8px) !important;
              left: 4px !important;
              right: 4px !important;
            }

            /* Ensure events are properly contained within their resource columns */
            .fc-resource-timeGridDay-view .fc-timegrid-col,
            .fc-resource-timeGridWeek-view .fc-timegrid-col {
              position: relative !important;
              overflow: visible !important;
            }

            /* Ensure events don't overflow their columns */
            .fc-resource-timeGridDay-view .fc-event-main,
            .fc-resource-timeGridWeek-view .fc-event-main {
              overflow: hidden !important;
            }

            /* Enhanced resource column dividers for FullCalendar */
            .fc-resource-timeGridDay-view .fc-resource-timeline-header-cell,
            .fc-resource-timeGridWeek-view .fc-resource-timeline-header-cell {
              border-right: 2px solid #d1d5db !important;
            }

            .fc-resource-timeGridDay-view .fc-resource-timeline-body-cell,
            .fc-resource-timeGridWeek-view .fc-resource-timeline-body-cell {
              border-right: 2px solid #d1d5db !important;
            }

            /* Alternative selectors for resource columns */
            .fc-resource-timeGridDay-view .fc-timegrid-col,
            .fc-resource-timeGridWeek-view .fc-timegrid-col {
              border-right: 2px solid #d1d5db !important;
            }

            .fc-resource-timeGridDay-view .fc-timegrid-col-header,
            .fc-resource-timeGridWeek-view .fc-timegrid-col-header {
              border-right: 2px solid #d1d5db !important;
            }

            /* Ensure all resource columns have dividers */
            .fc-resource-timeGridDay-view .fc-timegrid-col-frame,
            .fc-resource-timeGridWeek-view .fc-timegrid-col-frame {
              border-right: 2px solid #d1d5db !important;
            }

            /* Last column shouldn't have a right border */
            .fc-resource-timeGridDay-view .fc-timegrid-col:last-child,
            .fc-resource-timeGridWeek-view .fc-timegrid-col:last-child {
              border-right: none !important;
            }

            .fc-resource-timeGridDay-view .fc-timegrid-col-header:last-child,
            .fc-resource-timeGridWeek-view .fc-timegrid-col-header:last-child {
              border-right: none !important;
            }

            /* More aggressive column dividers with higher specificity */
            .fc-resource-timeGridDay-view .fc-timegrid-col:not(:last-child),
            .fc-resource-timeGridWeek-view .fc-timegrid-col:not(:last-child) {
              border-right: 3px solid #9ca3af !important;
              position: relative;
            }

            /* Add pseudo-element for stronger visual separation */
            .fc-resource-timeGridDay-view .fc-timegrid-col:not(:last-child)::after,
            .fc-resource-timeGridWeek-view .fc-timegrid-col:not(:last-child)::after {
              content: '';
              position: absolute;
              top: 0;
              right: -1.5px;
              width: 3px;
              height: 100%;
              background-color: #9ca3af;
              z-index: 10;
            }

            /* Ensure header cells also have dividers */
            .fc-resource-timeGridDay-view .fc-timegrid-col-header:not(:last-child),
            .fc-resource-timeGridWeek-view .fc-timegrid-col-header:not(:last-child) {
              border-right: 3px solid #9ca3af !important;
            }

            /* Force column separation with box-shadow as backup */
            .fc-resource-timeGridDay-view .fc-timegrid-col:not(:last-child),
            .fc-resource-timeGridWeek-view .fc-timegrid-col:not(:last-child) {
              box-shadow: 2px 0 0 -1px #9ca3af !important;
            }

            /* Hide FullCalendar's built-in header when we have custom staff header */
            .fc-header-toolbar {
              display: none !important;
            }

            .fc-col-header {
              display: none !important;
            }

            .fc-timegrid-col-header {
              display: none !important;
            }

            /* Ensure FullCalendar resource columns align with our custom header */
            .fc-resource-timeGridDay-view .fc-timegrid-col,
            .fc-resource-timeGridWeek-view .fc-timegrid-col {
              flex: 1 !important;
              min-width: 0 !important;
              box-sizing: border-box !important;
            }

            /* Custom resize handle styling - Fresha-style */
            .fc-event-resizer-end {
              background: rgba(255, 255, 255, 0.3) !important;
              width: 60px !important;
              height: 12px !important;
              bottom: 2px !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              border-radius: 6px !important;
              opacity: 0 !important;
              transition: opacity 0.2s ease !important;
              cursor: ns-resize !important;
            }

            /* Show on hover */
            .fc-event:hover .fc-event-resizer-end {
              opacity: 1 !important;
            }

            /* Add grip indicator */
            .fc-event-resizer-end::after {
              content: '⋯' !important;
              position: absolute !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              color: white !important;
              font-size: 14px !important;
              font-weight: bold !important;
              line-height: 1 !important;
            }



            /* Remove time column for resource views */
            .fc-resource-timeGridDay-view .fc-timegrid-axis,
            .fc-resource-timeGridWeek-view .fc-timegrid-axis {
              display: none !important;
            }

            /* Ensure all resource columns have equal width */
            .fc-resource-timeGridDay-view .fc-timegrid-col:not(.fc-timegrid-axis),
            .fc-resource-timeGridWeek-view .fc-timegrid-col:not(.fc-timegrid-axis) {
              flex: 1 !important;
              min-width: 0 !important;
              width: calc(100% / var(--fc-resource-count, 1)) !important;
            }

            /* Force equal distribution */
            .fc-resource-timeGridDay-view .fc-timegrid-col-frame,
            .fc-resource-timeGridWeek-view .fc-timegrid-col-frame {
              width: 100% !important;
              box-sizing: border-box !important;
            }

            /* Recurring appointment icon */
            .recurring-event {
              position: relative !important;
            }

            .recurring-event::after {
              content: '↻' !important;
              position: absolute !important;
              top: 2px !important;
              right: 4px !important;
              font-size: 12px !important;
              font-weight: bold !important;
              color: #ffffff !important;
              background: rgba(0, 0, 0, 0.3) !important;
              border-radius: 50% !important;
              width: 16px !important;
              height: 16px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              line-height: 1 !important;
              z-index: 10 !important;
            }

            /* Flexible time appointments (dashed border) */
            .fc-event.flexible-time {
              border-style: dashed !important;
              border-color: #f59e0b !important;
            }

            /* Custom scrollbar for appointment detail modal */
            .appointment-detail-modal::-webkit-scrollbar {
              width: 6px !important;
            }

            .appointment-detail-modal::-webkit-scrollbar-track {
              background: transparent !important;
            }

            .appointment-detail-modal::-webkit-scrollbar-thumb {
              background: #d1d5db !important;
              border-radius: 3px !important;
            }

            .appointment-detail-modal::-webkit-scrollbar-thumb:hover {
              background: #9ca3af !important;
            }

            /* Enhanced Now Indicator - Real-time badge and red line */
            .fc-timegrid-now-indicator-line {
              border-color: #ef4444 !important;
              border-width: 1px !important;
              position: relative !important;
              z-index: 1000 !important;
              left: 0 !important;
              width: calc(100% + 8px) !important;
              margin-left: -8px !important;
              box-shadow: 0 0 8px rgba(239, 68, 68, 0.4) !important;
            }

            .fc-timegrid-now-indicator-arrow {
              display: none !important;
            }

            .fc-timegrid-now-indicator-container {
              overflow: visible !important;
            }

            /* COMPLETELY DISABLE ALL DEFAULT BADGES */
            .fc-timegrid-now-indicator-line::before {
              display: none !important;
              content: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }

            .fc-timegrid-now-indicator-line::after {
              display: none !important;
              content: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }

            /* DISABLE ALL BADGES IN RESOURCE VIEWS */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line::before,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line::before,
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line::after,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line::after {
              display: none !important;
              content: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }

            /* CUSTOM BADGE STYLING */
            .custom-time-badge {
              position: absolute !important;
              left: -70px !important;
              top: 50% !important;
              transform: translateY(-50%) !important;
              background: #ef4444 !important;
              color: white !important;
              padding: 8px 14px !important;
              border-radius: 20px !important;
              font-size: 12px !important;
              font-weight: 700 !important;
              white-space: nowrap !important;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
              z-index: 1001 !important;
              text-align: center !important;
              border: 2px solid #ffffff !important;
              animation: pulse 2s infinite !important;
            }

            /* Pulse animation for the badge */
            @keyframes pulse {
              0% {
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
              }
              50% {
                box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6) !important;
              }
              100% {
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
              }
            }

            /* Resource view specific now indicator fixes */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line {
              border-color: #ef4444 !important;
              border-width: 1px !important;
              width: calc(100% + 8px) !important;
              margin-left: -8px !important;
              z-index: 1000 !important;
            }

            /* HIDE ALL BADGES IN RESOURCE VIEWS */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line::before,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line::before {
              display: none !important;
              content: none !important;
            }

            /* SHOW BADGE ONLY ON FIRST COLUMN IN RESOURCE VIEWS */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line:first-of-type::before,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line:first-of-type::before {
              display: block !important;
              content: attr(data-time) !important;
              left: -70px !important;
              background: #ef4444 !important;
              color: white !important;
              padding: 8px 14px !important;
              border-radius: 20px !important;
              font-size: 12px !important;
              font-weight: 700 !important;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
              z-index: 1001 !important;
              border: 2px solid #ffffff !important;
            }

            /* HIDE ALL AFTER ELEMENTS IN RESOURCE VIEWS */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line::after,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line::after {
              display: none !important;
              content: none !important;
            }

            /* Day view specific fixes */
            .fc-timeGridDay .fc-timegrid-now-indicator-line {
              border-color: #ef4444 !important;
              border-width: 1px !important;
              width: 100% !important;
            }

            .fc-timeGridDay .fc-timegrid-now-indicator-arrow {
              display: none !important;
            }

            /* Ensure now indicator is visible in all views */
            .fc-timegrid-now-indicator-line {
              opacity: 1 !important;
              visibility: visible !important;
            }

            /* Hide time column but keep now indicator visible for resource views */
            .fc-resource-timeGridDay-view .fc-timegrid-axis,
            .fc-resource-timeGridWeek-view .fc-timegrid-axis {
              display: none !important;
              pointer-events: none !important;
              visibility: hidden !important;
            }

            /* Ensure now indicator badge is positioned correctly when time column is hidden */
            .fc-resource-timeGridDay-view .fc-timegrid-now-indicator-line::before,
            .fc-resource-timeGridWeek-view .fc-timegrid-now-indicator-line::before {
              left: -70px !important;
            }

            /* Completely disable any time column interactions */
            .fc-timegrid-axis,
            .fc-timegrid-axis *,
            .fc-timegrid-col:first-child,
            .fc-timegrid-col:first-child * {
              pointer-events: none !important;
              cursor: default !important;
              user-select: none !important;
            }
          `
        }} />

        {/* Calendar Container */}
      <div 
        style={{ 
          background: '#ffffff', 
          overflow: 'hidden', 
          padding: '0',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: '1px solid #e5e7eb'
        }} 
        id="calendar-container"
        onClick={handleCalendarClick}
      >
          {/* Multi-Staff Header Row */}
          {calendarResources.length > 0 && (
            <div 
              className="custom-staff-header"
              style={{
                display: 'flex',
                background: '#ffffff',
                borderBottom: '1px solid #e5e7eb',
                minHeight: '80px',
                alignItems: 'center',
                width: '100%'
              }}
            >
              {/* Time column */}
              <TimeColumn />

              {/* Walk-ins and Staff member columns */}
              {calendarResources.map((resource, index) => {
                // Check if this is the walk-ins column
                const isWalkIns = resource.id === 'walk-ins'
                
                return (
                  <div
                    key={resource.id}
                    style={{
                      width: calendarResources.length === 1 ? '100%' : 
                             calendarResources.length === 2 ? '50%' :
                             calendarResources.length === 3 ? '33.333%' :
                             calendarResources.length === 4 ? '25%' :
                             calendarResources.length === 5 ? '20%' : '16.666%',
                      padding: '12px',
                      borderRight: index < calendarResources.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      position: 'relative',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      marginLeft: index === 0 ? '-1px' : '0px'
                    }}
                  >
                    {isWalkIns ? (
                      /* Walk-ins column */
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        justifyContent: 'center'
                      }}>
                        {/* Walk-ins icon */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          W
                        </div>
                        
                        {/* Walk-ins label */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1f2937',
                            lineHeight: '1.2',
                            textAlign: 'center'
                          }}>
                            Walk-ins
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Staff member column */
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        justifyContent: 'center'
                      }}>
                        {/* Find the worker data for this resource */}
                        {(() => {
                          const worker = workersInCalendar.find(w => w.id === resource.id)
                          if (!worker) return null
                          
                          return (
                            <>
                              {/* Avatar */}
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: worker.color || '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                {worker.avatar ? (
                                  <img 
                                    src={worker.avatar} 
                                    alt={worker.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '50%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  worker.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              
                              {/* Name and Role */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                {/* Name */}
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#1f2937',
                                  lineHeight: '1.2',
                                  textAlign: 'center'
                                }}>
                                  {worker.name}
                                </div>
                                
                                {/* Role - only show if it exists and is not "Staff Member" */}
                                {worker.role && worker.role !== 'Staff Member' && (
                                  <div style={{
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    lineHeight: '1.2',
                                    textAlign: 'center'
                                  }}>
                                    {worker.role}
                                  </div>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* FullCalendar Component */}
          <FullCalendar
            key={calendarRefreshKey}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, resourceTimeGridPlugin, resourceDayGridPlugin]}
            initialView={view}
            initialDate={currentDate}
            headerToolbar={false}
            selectable={false}
            events={eventsToDisplay}
            resources={calendarResources}
            height="100%"
            slotMinTime="09:00:00"
            slotMaxTime="21:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            eventClick={handleAppointmentClick}
            slotLabelFormat={SLOT_LABEL_FORMAT}
            eventDisplay="block"
            allDaySlot={false}
            eventMinHeight={30}
            expandRows={true}
            nowIndicator={true}
            
            // Enhanced now indicator handling
            viewDidMount={(arg) => {
              // Update now indicator after view mounts
              setTimeout(() => {
                const now = new Date()
                const timeString = now.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })

                // Check if current time is within business hours (9:00 AM - 8:00 PM)
                const currentHour = now.getHours()
                const currentMinute = now.getMinutes()
                const currentTimeInMinutes = currentHour * 60 + currentMinute
                const businessStartInMinutes = 9 * 60 // 9:00 AM
                const businessEndInMinutes = 20 * 60 // 8:00 PM (20:00)
                
                const isBusinessHours = currentTimeInMinutes >= businessStartInMinutes && currentTimeInMinutes < businessEndInMinutes

                // Find ALL now indicator lines and control badges manually
                const allNowLines = document.querySelectorAll('.fc-timegrid-now-indicator-line')
                
                if (allNowLines.length > 0) {
                  // HIDE ALL BADGES FIRST
                  allNowLines.forEach((line, index) => {
                    const lineElement = line as HTMLElement
                    
                    // Remove any existing badges
                    const existingBadge = lineElement.querySelector('.custom-time-badge')
                    if (existingBadge) {
                      existingBadge.remove()
                    }
                    
                    // Hide the default ::before badge
                    lineElement.style.setProperty('--badge-display', 'none')
                    
                    // Only show badge on the FIRST line (leftmost column) AND during business hours
                    if (index === 0 && isBusinessHours) {
                      // Create custom badge for first column only
                      const badge = document.createElement('div')
                      badge.className = 'custom-time-badge'
                      badge.textContent = timeString
                      badge.style.cssText = `
                        position: absolute;
                        left: -70px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: #ef4444;
                        color: white;
                        padding: 8px 14px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 700;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                        z-index: 1001;
                        text-align: center;
                        border: 2px solid #ffffff;
                        animation: pulse 2s infinite;
                      `
                      lineElement.appendChild(badge)
                    }
                  })
                }
              }, 100)
            }}
            eventContent={(arg) => {
                const event = arg.event
              const isBlockedTime = event.extendedProps?.appointmentType === 'blocked'
                
                // Format time
                const startTime = event.start ? new Date(event.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : ''
                const endTime = event.end ? new Date(event.end).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : ''
                const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : ''
                
              // For blocked time events, show different content
              if (isBlockedTime) {
                const blockReason = event.extendedProps?.blockReason || 'Blocked Time'
                const notes = event.extendedProps?.notes || ''
                
                return {
                  html: `
                    <div style="
                      padding: 3px 6px;
                      font-size: 13px;
                      line-height: 1.3;
                      color: #ffffff;
                      font-weight: 500;
                      width: 100%;
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      background-color: #6b7280;
                      border-radius: 4px;
                      opacity: 0.8;
                      cursor: not-allowed;
                    ">
                      ${timeDisplay ? `
                        <div style="
                          margin-bottom: 1px;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          width: 100%;
                          font-size: 12px;
                          opacity: 0.9;
                        ">
                          ${timeDisplay}
                        </div>
                      ` : ''}
                      <div style="
                        margin-bottom: 1px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        ${blockReason}
                      </div>
                      ${notes ? `
                        <div style="
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          width: 100%;
                          font-size: 11px;
                            opacity: 0.8;
                          ">
                            ${notes}
                          </div>
                        ` : ''}
                      </div>
                    `
                  }
                }
                
                // Get client information for regular appointments
                const clientName = event.extendedProps?.clientName || 'Walk-in Client'
                const clientPhone = event.extendedProps?.client?.phone || ''
                const clientEmail = event.extendedProps?.client?.email || ''
                
                // Get all services - prefer extendedProps.services (array of service names) over single serviceName
                const services = event.extendedProps?.services || []
                const serviceDisplay = services.length > 0 
                  ? services.join(', ') 
                  : (event.extendedProps?.serviceName || 'Service')
                
                // Format client contact info
                const clientContact = clientPhone || clientEmail || ''
                
                return {
                  html: `
                    <div style="
                      padding: 3px 6px;
                      font-size: 13px;
                      line-height: 1.3;
                      color: ${event.textColor || '#ffffff'};
                      font-weight: 500;
                      width: 100%;
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                    ">
                      ${timeDisplay ? `
                        <div style="
                          margin-bottom: 1px;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          width: 100%;
                          font-size: 13px;
                          opacity: 0.9;
                        ">
                          ${timeDisplay}
                        </div>
                      ` : ''}
                      <div style="
                        margin-bottom: 1px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                        font-size: 13px;
                      ">
                        ${clientName}
                      </div>
                      ${clientContact ? `
                        <div style="
                          margin-bottom: 1px;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          width: 100%;
                          font-size: 13px;
                        ">
                          ${clientContact}
                        </div>
                      ` : ''}
                      <div style="
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                        font-size: 13px;
                      ">
                        ${serviceDisplay}
                      </div>
                    </div>
                  `
                }
              }}
            // Business hours to grey out 8:00 PM time slot
            businessHours={{
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
              startTime: '09:00',
              endTime: '20:00' // End at 8:00 PM, grey out 8:00-9:00 PM
            }}
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventDragStart={() => setIsDragging(true)} // Set drag state
            eventDragStop={() => setIsDragging(false)} // Clear drag state
            eventResizeStart={() => {}} // Prevent re-renders during resize
            eventResizeStop={() => {}} // Prevent re-renders during resize
            datesSet={(dateInfo) => {
              setCurrentDate(dateInfo.start)
                
                // Mark time slots as blocked when they overlap with blocked time events
                setTimeout(() => {
                  const timeSlots = document.querySelectorAll('.fc-timegrid-slot')
                  timeSlots.forEach(slot => {
                    const slotTime = slot.getAttribute('data-time') || 
                                    slot.getAttribute('aria-label') ||
                                    slot.getAttribute('title')
                    
                    if (slotTime) {
                      const slotDate = new Date(dateInfo.start)
                      const [hours, minutes] = slotTime.split(':').map(Number)
                      slotDate.setHours(hours, minutes, 0, 0)
                      
                      // Get the column/resource this slot belongs to
                      const slotColumn = slot.closest('.fc-timegrid-col')
                      let slotResourceId = 'walk-ins' // Default to walk-ins
                      
                      if (slotColumn) {
                        // Get the resource ID from the column
                        const resourceId = slotColumn.getAttribute('data-resource-id')
                        if (resourceId) {
                          slotResourceId = resourceId
                        } else {
                          // Fallback: try to determine resource from column index
                          const allColumns = document.querySelectorAll('.fc-timegrid-col')
                          const columnIndex = Array.from(allColumns).indexOf(slotColumn)
                          const resources = calendarApi.getResources()
                          if (resources[columnIndex]) {
                            slotResourceId = resources[columnIndex].id
                          }
                        }
                      }
                      
                      // Check if any blocked time events overlap with this time slot AND are for the same worker
                      const hasBlockedTimeOverlap = events.some(event => {
                        const isBlockedEvent = event.extendedProps?.appointmentType === 'blocked'
                        if (!isBlockedEvent) return false
                        
                        // Check if the blocked event is for the same worker/column
                        const eventStaffId = event.extendedProps?.staffId || event.staffId || event.selectedStaff
                        const isSameWorker = eventStaffId === slotResourceId || 
                                           (slotResourceId === 'walk-ins' && !eventStaffId) ||
                                           (eventStaffId === 'walk-ins' && slotResourceId === 'walk-ins')
                        
                        if (!isSameWorker) return false
                        
                        const eventStart = new Date(event.start)
                        const eventEnd = new Date(event.end)
                        
                        // Check if slot time overlaps with blocked time
                        return slotDate >= eventStart && slotDate < eventEnd
                      })
                      
                      if (hasBlockedTimeOverlap) {
                        slot.classList.add('blocked-slot')
                      } else {
                        slot.classList.remove('blocked-slot')
                      }
                    }
                  })
                }, 100)
            }}
            ref={(calendarRef) => {
              if (calendarRef && !calendarApi) {
                setCalendarApi(calendarRef.getApi())
              }
            }}
            // Critical: Force strict resource ordering
            resourceOrder="order"
            resourceAreaWidth="0px"
            resourceAreaHeaderContent=""
            resourceLabelContent=""
            resourceLabelDidMount={(info) => {
              console.log('Resource mounted:', {
                id: info.resource.id,
                title: info.resource.title,
                order: info.resource.extendedProps?.order
              })
              
              // Apply CSS class to resource headers for blocked workers
              const resourceId = info.resource.id
              const isBlocked = isWorkerBlockedAllDay(resourceId, currentDate)
              
              if (isBlocked) {
                info.el.classList.add('fc-resource-header-blocked')
              }
            }}
          />
      </div>
    </div>
  )
}