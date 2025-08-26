// hooks/useAppointmentSync.ts
import { useEffect, useCallback } from 'react'
import { useActivityFeed, Appointment } from './useActivityFeed'

// Custom event types for appointment changes
export const APPOINTMENT_EVENTS = {
  CREATED: 'appointment:created',
  UPDATED: 'appointment:updated',
  DELETED: 'appointment:deleted',
  STORAGE_CHANGED: 'appointment:storage_changed'
} as const

export type AppointmentEventType = typeof APPOINTMENT_EVENTS[keyof typeof APPOINTMENT_EVENTS]

export interface AppointmentEventDetail {
  type: AppointmentEventType
  appointment?: Appointment
  oldAppointment?: Appointment // For updates, include the previous version
  appointments?: Appointment[]
}

// Utility function to dispatch appointment events
export const dispatchAppointmentEvent = (detail: AppointmentEventDetail) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('appointmentChange', { detail })
    window.dispatchEvent(event)
  }
}

// Hook for components that need to listen to appointment changes
export const useAppointmentSync = () => {
  const { 
    addAppointmentCreated, 
    addAppointmentUpdated, 
    addAppointmentDeleted,
    generateFromAppointments 
  } = useActivityFeed()

  // Listen for appointment events
  useEffect(() => {
    const handleAppointmentChange = (event: CustomEvent<AppointmentEventDetail>) => {
      const { detail } = event
      
      switch (detail.type) {
        case APPOINTMENT_EVENTS.CREATED:
          if (detail.appointment) {
            addAppointmentCreated(detail.appointment)
          }
          break
          
        case APPOINTMENT_EVENTS.UPDATED:
          if (detail.appointment) {
            addAppointmentUpdated(detail.appointment, detail.oldAppointment)
          }
          break
          
        case APPOINTMENT_EVENTS.DELETED:
          if (detail.appointment) {
            addAppointmentDeleted(detail.appointment)
          }
          break
          
        case APPOINTMENT_EVENTS.STORAGE_CHANGED:
          if (detail.appointments) {
            // Regenerate activity feed from all appointments
            generateFromAppointments(detail.appointments)
          }
          break
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('appointmentChange', handleAppointmentChange as EventListener)
      
      return () => {
        window.removeEventListener('appointmentChange', handleAppointmentChange as EventListener)
      }
    }
  }, [addAppointmentCreated, addAppointmentUpdated, addAppointmentDeleted, generateFromAppointments])

  // Listen for localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointments' && e.newValue) {
        try {
          const appointments = JSON.parse(e.newValue)
          dispatchAppointmentEvent({
            type: APPOINTMENT_EVENTS.STORAGE_CHANGED,
            appointments
          })
        } catch (error) {
          console.error('Error parsing appointments from storage:', error)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  // Utility functions for calendar to call
  const notifyAppointmentCreated = useCallback((appointment: Appointment) => {
    dispatchAppointmentEvent({
      type: APPOINTMENT_EVENTS.CREATED,
      appointment
    })
  }, [])

  const notifyAppointmentUpdated = useCallback((appointment: Appointment, oldAppointment?: Appointment) => {
    dispatchAppointmentEvent({
      type: APPOINTMENT_EVENTS.UPDATED,
      appointment,
      oldAppointment
    })
  }, [])

  const notifyAppointmentDeleted = useCallback((appointment: Appointment) => {
    dispatchAppointmentEvent({
      type: APPOINTMENT_EVENTS.DELETED,
      appointment
    })
  }, [])

  const notifyAppointmentsChanged = useCallback((appointments: Appointment[]) => {
    dispatchAppointmentEvent({
      type: APPOINTMENT_EVENTS.STORAGE_CHANGED,
      appointments
    })
  }, [])

  return {
    notifyAppointmentCreated,
    notifyAppointmentUpdated,
    notifyAppointmentDeleted,
    notifyAppointmentsChanged
  }
}