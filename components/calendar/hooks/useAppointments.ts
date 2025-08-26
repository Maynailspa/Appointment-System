// components/calendar/hooks/useAppointments.ts

import { useState, useCallback, useEffect } from 'react'
import { AppointmentFormState, AppointmentType } from '../types/calendar.types'

// localStorage utilities for appointments
const saveAppointments = (appointments: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('appointments', JSON.stringify(appointments))
  }
}

const loadAppointments = (): any[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('appointments')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.error('Error loading appointments from localStorage:', error)
      }
    }
  }
  return []
}

export const useAppointments = () => {
  // Form state
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [blockReason, setBlockReason] = useState<string>('')
  const [appointmentNotes, setAppointmentNotes] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState<Date>(new Date())
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  // Appointments storage
  const [appointments, setAppointments] = useState<any[]>([])
  
  // Clients and services from API
  const [clients, setClients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)

  // Load appointments from localStorage on mount
  useEffect(() => {
    const savedAppointments = loadAppointments()
    setAppointments(savedAppointments)
  }, [])

  // Load clients from API
  useEffect(() => {
    const loadClients = async () => {
      try {
        console.log('Loading clients from API...')
        const response = await fetch('/api/customers')
        if (response.ok) {
          const clientsData = await response.json()
          console.log('Loaded clients from API:', clientsData)
          setClients(clientsData)
        } else {
          console.error('Failed to load clients from API:', response.status)
          setClients([])
        }
      } catch (error) {
        console.error('Error loading clients:', error)
        setClients([])
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [])

  // Load services from API (TODO: implement services API)
  useEffect(() => {
    const loadServices = async () => {
      try {
        // TODO: Replace with real services API when available
        // For now, using mock services data
        const mockServices = [
          { id: '1', name: 'Gel Manicure', price: 45, duration: 45, category: 'Nails' },
          { id: '2', name: 'Classic Pedicure', price: 35, duration: 30, category: 'Nails' },
          { id: '3', name: 'Nail Art', price: 15, duration: 15, category: 'Nails' },
          { id: '4', name: 'Deep Cleansing Facial', price: 75, duration: 60, category: 'Skincare' },
          { id: '5', name: 'Swedish Massage', price: 90, duration: 60, category: 'Massage' },
        ]
        setServices(mockServices)
      } catch (error) {
        console.error('Error loading services:', error)
        setServices([])
      } finally {
        setLoadingServices(false)
      }
    }

    loadServices()
  }, [])

  // Save appointments to localStorage whenever they change
  useEffect(() => {
    saveAppointments(appointments)
  }, [appointments])

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedClient('')
    setIsWalkIn(false)
    setSelectedServices([])
    setSelectedStaff('')
    setBlockReason('')
    setAppointmentNotes('')
    setSearchQuery('')
    setShowClientSearch(false)
    setSearchingClients(false)
    setAppointmentDate(new Date())
    setShowWeekPicker(false)
  }, [])

  // Handle client search
  const handleClientSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setSearchingClients(true)
    
    // Simulate API search
    setTimeout(() => {
      setSearchingClients(false)
    }, 300)
  }, [])

  // Filter clients based on search
  const filteredClients = clients.filter((client: any) =>
    `${client.firstName} ${client.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  )

  // Filter services based on search
  const filteredServices = services.filter((service: any) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate total duration and price
  const selectedServicesDetails = selectedServices.map(id => 
    services.find((s: any) => s.id === id)
  ).filter(Boolean)
  
  const totalDuration = selectedServicesDetails.reduce((sum, service) => sum + (service?.duration || 0), 0)
  const totalPrice = selectedServicesDetails.reduce((sum, service) => sum + (service?.price || 0), 0)

  // Create appointment
  const createAppointment = useCallback(async (
    appointmentType: AppointmentType,
    appointmentTimeSlot: { start: string; end: string },
    teamMembers: any[],
    calendarApi: any | null
  ) => {
    // Validate required fields
    if (appointmentType !== 'blocked' && !selectedClient && !isWalkIn) {
      alert('Please select a client or mark as walk-in')
      return null
    }
    
    if (appointmentType !== 'blocked' && selectedServices.length === 0) {
      alert('Please select at least one service')
      return null
    }
    
    if (appointmentType === 'blocked' && !blockReason) {
      alert('Please provide a reason for blocking time')
      return null
    }

    // Get client info
    const client = selectedClient ? clients.find((c: any) => c.id === selectedClient) : null
    const clientName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : isWalkIn ? 'Walk-in Client' : ''
    
    // Get selected services details
    const selectedServicesList = selectedServices.map(id => services.find((s: any) => s.id === id)).filter(Boolean)
    const serviceName = appointmentType === 'blocked' 
      ? blockReason 
      : services.map(s => s?.name).join(', ')
    
    // Get staff info
    const staff = selectedStaff ? teamMembers.find(m => m.id === selectedStaff) : null
    const staffName = staff ? staff.name : 'Any Staff'
    const staffColor = staff?.color || '#3b82f6'
    
    // Create new appointment event
    const newAppointment = {
      id: `apt-${Date.now()}`, // Permanent ID
      title: appointmentType === 'blocked' 
        ? `Blocked: ${blockReason}`
        : `${serviceName} - ${clientName}`,
      start: new Date(appointmentTimeSlot.start),
      end: new Date(appointmentTimeSlot.end),
      backgroundColor: appointmentType === 'blocked' ? '#6b7280' : staffColor,
      borderColor: appointmentType === 'blocked' ? '#4b5563' : staffColor,
      textColor: '#ffffff',
      extendedProps: {
        status: appointmentType === 'blocked' ? 'blocked' : 'booked',
        staffName: staffName,
        serviceName: serviceName,
        clientName: clientName,
        staffId: selectedStaff || '',
        serviceId: selectedServices.join(','),
        clientId: selectedClient || '',
        notes: appointmentNotes,
        isWalkIn: isWalkIn,
        client: client // Store full client object
      },
      classNames: ['professional-event']
    }
    
    // Add to local storage
    setAppointments(prev => [...prev, newAppointment])
    
    // If we have a calendar API instance, also add it there
    if (calendarApi) {
      calendarApi.addEvent({
        id: newAppointment.id,
        title: newAppointment.title,
        start: newAppointment.start,
        end: newAppointment.end,
        backgroundColor: newAppointment.backgroundColor,
        borderColor: newAppointment.borderColor,
        textColor: newAppointment.textColor,
        extendedProps: newAppointment.extendedProps
      })
    }
    
    return newAppointment
  }, [selectedClient, isWalkIn, selectedServices, selectedStaff, blockReason, appointmentNotes])

  // Get all appointments
  const getAllAppointments = useCallback(() => {
    return appointments
  }, [appointments])

  // Delete appointment
  const deleteAppointment = useCallback((appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
  }, [])

  // Update appointment
  const updateAppointment = useCallback((appointmentId: string, updates: any) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId ? { ...apt, ...updates } : apt
    ))
  }, [])

  return {
    // State
    selectedClient,
    isWalkIn,
    selectedServices,
    selectedStaff,
    blockReason,
    appointmentNotes,
    searchQuery,
    showClientSearch,
    searchingClients,
    appointmentDate,
    showWeekPicker,
    appointments,
    clients,
    services,
    loadingClients,
    loadingServices,
    
    // Setters
    setSelectedClient,
    setIsWalkIn,
    setSelectedServices,
    setSelectedStaff,
    setBlockReason,
    setAppointmentNotes,
    setSearchQuery,
    setShowClientSearch,
    setSearchingClients,
    setAppointmentDate,
    setShowWeekPicker,
    
    // Computed
    filteredClients,
    filteredServices,
    selectedServicesDetails,
    totalDuration,
    totalPrice,
    
    // Methods
    resetForm,
    handleClientSearch,
    createAppointment,
    getAllAppointments,
    deleteAppointment,
    updateAppointment
  }
}