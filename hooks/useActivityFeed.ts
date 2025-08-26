// hooks/useActivityFeed.ts
import { useState, useEffect, useCallback } from 'react'

export interface ActivityItem {
  id: string
  type: 'checkin' | 'appointment' | 'payment' | 'notification' | 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'block_time'
  message: string
  time: string
  color: string
  timestamp: number
  appointmentData?: Appointment // Store appointment data for recovery
}

export interface Appointment {
  id: string
  start: string
  end: string
  title: string
  clientName?: string
  serviceName?: string
  staffName?: string
  status?: string
  appointmentType?: string
  extendedProps?: {
    clientName?: string
    serviceName?: string
    staffName?: string
    status?: string
    appointmentType?: string
    blockType?: string
  }
}

export const useActivityFeed = () => {
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])

  // Helper function to get today's date string (YYYY-MM-DD)
  const getTodayDateString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Helper function to check if an activity is from today
  const isActivityFromToday = (activity: ActivityItem) => {
    const activityDate = new Date(activity.timestamp)
    const activityDateString = activityDate.toISOString().split('T')[0]
    return activityDateString === getTodayDateString()
  }

  // Load existing activities from localStorage and filter for today only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedActivities = localStorage.getItem('activityFeed')
        if (savedActivities) {
          const activities = JSON.parse(savedActivities)
          
          // Validate activities structure
          const validActivities = activities.filter((activity: any) => {
            return activity && 
                   typeof activity === 'object' &&
                   typeof activity.id === 'string' &&
                   typeof activity.timestamp === 'number' &&
                   typeof activity.message === 'string' &&
                   typeof activity.type === 'string'
          })
          
          // Filter to show only today's activities
          const todaysActivities = validActivities.filter(isActivityFromToday)
          setActivityFeed(todaysActivities)
          
          // If we had to filter out invalid data, save the cleaned version
          if (validActivities.length !== activities.length) {
            console.warn('Filtered out invalid activities:', activities.length - validActivities.length)
            saveActivities(validActivities)
          }
        }
      } catch (error) {
        console.error('Error parsing saved activities:', error)
        // Clear corrupted data
        localStorage.removeItem('activityFeed')
        setActivityFeed([])
      }
    }
  }, [])

  // Save activities to localStorage whenever they change
  const saveActivities = useCallback((activities: ActivityItem[]) => {
    if (typeof window !== 'undefined') {
      try {
        const activitiesJson = JSON.stringify(activities)
        
        // Check localStorage size (rough estimate)
        const currentSize = new Blob([activitiesJson]).size
        const maxSize = 4 * 1024 * 1024 // 4MB limit
        
        if (currentSize > maxSize) {
          console.warn('Activity feed too large, trimming to most recent 25 activities')
          const trimmedActivities = activities.slice(0, 25)
          localStorage.setItem('activityFeed', JSON.stringify(trimmedActivities))
        } else {
          localStorage.setItem('activityFeed', activitiesJson)
        }
      } catch (error) {
        console.error('Error saving activities:', error)
        // If saving fails, try with fewer activities
        if (activities.length > 10) {
          console.warn('Trying to save with fewer activities')
          saveActivities(activities.slice(0, 10))
        }
      }
    }
  }, [])

  // Add a new activity
  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    setActivityFeed(prevActivities => {
      // Only add the activity if it's from today
      if (isActivityFromToday(newActivity)) {
        const updatedActivities = [newActivity, ...prevActivities]
          .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending
          .slice(0, 50) // Keep only the most recent 50 activities
        
        saveActivities(updatedActivities)
        return updatedActivities
      }
      return prevActivities
    })
  }, [saveActivities])

  // Add appointment-related activities
  const addAppointmentCreated = useCallback((appointment: Appointment) => {
    const clientName = appointment.clientName || appointment.extendedProps?.clientName || 'Client'
    const staffName = appointment.staffName || appointment.extendedProps?.staffName || 'Staff'
    const serviceName = appointment.serviceName || appointment.extendedProps?.serviceName || 'Service'
    const isBlocked = appointment.appointmentType === 'blocked' || appointment.extendedProps?.appointmentType === 'blocked'
    
    const time = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (isBlocked) {
      const blockType = appointment.extendedProps?.blockType === 'full' ? 'Full Day Off' : 'Time Off'
      addActivity({
        type: 'block_time',
        message: `${blockType} scheduled for ${staffName}`,
        time,
        color: '#6b7280'
      })
    } else {
      // Create more descriptive message with worker, date, and time
      const baseMessage = clientName !== 'Client' ? clientName : 'Walk-in'
      const serviceInfo = serviceName !== 'Service' ? ` - ${serviceName}` : ''
      
      // Format appointment date and time
      const appointmentDate = new Date(appointment.start)
      const dateStr = appointmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      const timeStr = appointmentDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      
      addActivity({
        type: 'appointment_created',
        message: `New appointment: ${baseMessage}${serviceInfo} with ${staffName} on ${dateStr} at ${timeStr}`,
        time,
        color: '#10b981'
      })
    }
  }, [addActivity])

  const addAppointmentUpdated = useCallback((appointment: Appointment, oldAppointment?: Appointment) => {
    const clientName = appointment.clientName || appointment.extendedProps?.clientName || 'Client'
    const staffName = appointment.staffName || appointment.extendedProps?.staffName || 'Staff'
    const serviceName = appointment.serviceName || appointment.extendedProps?.serviceName || 'Service'
    const isBlocked = appointment.appointmentType === 'blocked' || appointment.extendedProps?.appointmentType === 'blocked'
    
    const time = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (isBlocked) {
      addActivity({
        type: 'block_time',
        message: `Block time updated for ${staffName}`,
        time,
        color: '#f59e0b'
      })
    } else {
      // Create specific change message if we have the old appointment data
      let changeMessage = ''
      
      if (oldAppointment) {
        const changes: string[] = []
        
        // Check for time changes
        if (oldAppointment.start !== appointment.start || oldAppointment.end !== appointment.end) {
          const oldStart = new Date(oldAppointment.start)
          const newStart = new Date(appointment.start)
          const oldTime = oldStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          const newTime = newStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          
          // Check if it's a date change or just time change
          const oldDate = oldStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const newDate = newStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          
          if (oldDate !== newDate) {
            changes.push(`date from ${oldDate} to ${newDate}`)
          }
          if (oldTime !== newTime) {
            changes.push(`time from ${oldTime} to ${newTime}`)
          }
        }
        
        // Check for staff changes
        const oldStaffName = oldAppointment.staffName || oldAppointment.extendedProps?.staffName || 'Staff'
        if (oldStaffName !== staffName) {
          changes.push(`staff from ${oldStaffName} to ${staffName}`)
        }
        
        // Check for service changes
        const oldServiceName = oldAppointment.serviceName || oldAppointment.extendedProps?.serviceName || 'Service'
        if (oldServiceName !== serviceName) {
          changes.push(`service from ${oldServiceName} to ${serviceName}`)
        }
        
        // Check for client changes
        const oldClientName = oldAppointment.clientName || oldAppointment.extendedProps?.clientName || 'Client'
        if (oldClientName !== clientName) {
          changes.push(`client from ${oldClientName} to ${clientName}`)
        }
        
        if (changes.length > 0) {
          changeMessage = ` (${changes.join(', ')})`
        } else {
          changeMessage = ' (details updated)'
        }
      }
      
      // Create base message
      const baseMessage = clientName !== 'Client' ? clientName : 'Walk-in'
      const serviceInfo = serviceName !== 'Service' ? ` - ${serviceName}` : ''
      
      // Format appointment date and time
      const appointmentDate = new Date(appointment.start)
      const dateStr = appointmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      const timeStr = appointmentDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      
      addActivity({
        type: 'appointment_updated',
        message: `Appointment changed: ${baseMessage}${serviceInfo} with ${staffName} on ${dateStr} at ${timeStr}${changeMessage}`,
        time,
        color: '#3b82f6'
      })
    }
  }, [addActivity])

  const addAppointmentDeleted = useCallback((appointment: Appointment) => {
    const clientName = appointment.clientName || appointment.extendedProps?.clientName || 'Client'
    const staffName = appointment.staffName || appointment.extendedProps?.staffName || 'Staff'
    const serviceName = appointment.serviceName || appointment.extendedProps?.serviceName || 'Service'
    const isBlocked = appointment.appointmentType === 'blocked' || appointment.extendedProps?.appointmentType === 'blocked'
    
    const time = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (isBlocked) {
      addActivity({
        type: 'block_time',
        message: `Block time removed for ${staffName}`,
        time,
        color: '#ef4444'
      })
    } else {
      // Create more descriptive message with worker, date, and time
      const baseMessage = clientName !== 'Client' ? clientName : 'Walk-in'
      const serviceInfo = serviceName !== 'Service' ? ` - ${serviceName}` : ''
      
      // Format appointment date and time
      const appointmentDate = new Date(appointment.start)
      const dateStr = appointmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      const timeStr = appointmentDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      
      addActivity({
        type: 'appointment_deleted',
        message: `Appointment cancelled: ${baseMessage}${serviceInfo} with ${staffName} on ${dateStr} at ${timeStr}`,
        time,
        color: '#ef4444',
        appointmentData: appointment // Store appointment data for recovery
      })
    }
  }, [addActivity])

  // Generate activity feed from existing appointments (for initial load)
  const generateFromAppointments = useCallback((appointments: Appointment[]) => {
    const activities: ActivityItem[] = []
    const now = new Date()
    
    // Get recent appointments (last 24 hours)
    const recentAppointments = appointments.filter(apt => {
      try {
        const aptTime = new Date(apt.start)
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        return aptTime >= oneDayAgo && aptTime <= now
      } catch (dateError) {
        return false
      }
    }).sort((a, b) => {
      try {
        return new Date(b.start).getTime() - new Date(a.start).getTime()
      } catch (dateError) {
        return 0
      }
    }).slice(0, 5)

    // Generate activities from recent appointments
    recentAppointments.forEach((apt, index) => {
      const aptTime = new Date(apt.start)
      const timeString = aptTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      
      const clientName = apt.clientName || apt.extendedProps?.clientName || 'Walk-in Client'
      const serviceName = apt.serviceName || apt.extendedProps?.serviceName || 'Nail Service'
      const isBlocked = apt.appointmentType === 'blocked' || apt.extendedProps?.appointmentType === 'blocked'
      
      if (isBlocked) {
        activities.push({
          id: `apt-${apt.id}-${index}`,
          type: 'block_time',
          message: `Block Time - ${apt.staffName || apt.extendedProps?.staffName || 'Staff'}`,
          time: timeString,
          color: '#6b7280',
          timestamp: aptTime.getTime()
        })
      } else {
        activities.push({
          id: `apt-${apt.id}-${index}`,
          type: 'appointment',
          message: `${clientName} - ${serviceName}`,
          time: timeString,
          color: '#3b82f6',
          timestamp: aptTime.getTime()
        })
      }
    })

    // Merge with existing activities and remove duplicates
    setActivityFeed(prevActivities => {
      const existingIds = new Set(prevActivities.map(a => a.id))
      const newActivities = activities.filter(a => !existingIds.has(a.id))
      
      const mergedActivities = [...prevActivities, ...newActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
      
      saveActivities(mergedActivities)
      return mergedActivities
    })
  }, [saveActivities])

  // Clear old activities (older than 7 days)
  const clearOldActivities = useCallback(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    setActivityFeed(prevActivities => {
      const filteredActivities = prevActivities.filter(activity => 
        activity.timestamp > sevenDaysAgo
      )
      
      if (filteredActivities.length !== prevActivities.length) {
        saveActivities(filteredActivities)
      }
      
      return filteredActivities
    })
  }, [saveActivities])

  // Auto-clear old activities on load
  useEffect(() => {
    clearOldActivities()
  }, [clearOldActivities])

  // Check for date change and reset activities for new day
  useEffect(() => {
    const checkDateChange = () => {
      const currentDateString = getTodayDateString()
      const lastDateString = localStorage.getItem('lastActivityDate')
      
      if (lastDateString && lastDateString !== currentDateString) {
        // New day has started, clear today's activities
        setActivityFeed([])
        localStorage.setItem('lastActivityDate', currentDateString)
      } else if (!lastDateString) {
        // First time loading, set today's date
        localStorage.setItem('lastActivityDate', currentDateString)
      }
    }

    // Check on mount
    checkDateChange()

    // Set up interval to check for date changes (every minute)
    const interval = setInterval(checkDateChange, 60000)

    return () => clearInterval(interval)
  }, [])

    // Function to recover a cancelled appointment
  const recoverAppointment = useCallback((activityId: string) => {
    console.log('HOOK: recoverAppointment called with activityId:', activityId)
    setActivityFeed(prevActivities => {
      console.log('HOOK: Searching for activity with ID:', activityId)
      console.log('HOOK: Available activities:', prevActivities.map(a => ({ id: a.id, type: a.type, hasData: !!a.appointmentData })))
      
      const activity = prevActivities.find(a => a.id === activityId)
      console.log('HOOK: Found activity:', activity)
      
      if (!activity || activity.type !== 'appointment_deleted' || !activity.appointmentData) {
        console.error('HOOK: Invalid activity for recovery:', { 
          found: !!activity, 
          type: activity?.type, 
          hasData: !!activity?.appointmentData 
        })
        return prevActivities
      }

      // Remove the cancelled activity
      const updatedActivities = prevActivities.filter(a => a.id !== activityId)
      
      // Add recovery activity
      const appointment = activity.appointmentData
      const clientName = appointment.clientName || appointment.extendedProps?.clientName || 'Client'
      const staffName = appointment.staffName || appointment.extendedProps?.staffName || 'Staff'
      const serviceName = appointment.serviceName || appointment.extendedProps?.serviceName || 'Service'
      
      const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      // Create recovery message with worker, date, and time
      const baseMessage = clientName !== 'Client' ? clientName : 'Walk-in'
      const serviceInfo = serviceName !== 'Service' ? ` - ${serviceName}` : ''
      
      // Format appointment date and time
      const appointmentDate = new Date(appointment.start)
      const dateStr = appointmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      const timeStr = appointmentDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      
      const recoveryActivity: ActivityItem = {
        id: `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'appointment_created',
        message: `Appointment recovered: ${baseMessage}${serviceInfo} with ${staffName} on ${dateStr} at ${timeStr}`,
        time,
        color: '#10b981',
        timestamp: Date.now()
      }
      
      const finalActivities = [recoveryActivity, ...updatedActivities]
        .filter(isActivityFromToday) // Only keep today's activities
      saveActivities(finalActivities)

      // Store recovery data in localStorage for cross-page communication
      if (typeof window !== 'undefined') {
        console.log('HOOK: Storing recovery data in localStorage:', appointment)
        const recoveryData = {
          appointment: appointment,
          timestamp: Date.now(),
          action: 'recover'
        }
        localStorage.setItem('pendingRecovery', JSON.stringify(recoveryData))
        console.log('HOOK: Recovery data stored in localStorage')
        
        // Also dispatch event for same-page recovery (if calendar is active)
        window.dispatchEvent(new CustomEvent('recoverAppointment', {
          detail: appointment
        }))
        console.log('HOOK: Event dispatched successfully')
      } else {
        console.error('HOOK: Window is undefined, cannot store recovery data')
      }

      return finalActivities
    })
  }, [saveActivities])

  // Backup all data to localStorage with timestamp
  const backupData = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const backup = {
          timestamp: Date.now(),
          date: new Date().toISOString(),
          activityFeed: activityFeed,
          appointments: localStorage.getItem('appointments'),
          businessSettings: localStorage.getItem('businessSettings'),
          staff: localStorage.getItem('staff')
        }
        
        const backupKey = `backup_${Date.now()}`
        localStorage.setItem(backupKey, JSON.stringify(backup))
        
        // Keep only the 5 most recent backups
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_'))
        if (backupKeys.length > 5) {
          backupKeys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key))
        }
        
        console.log('Data backup created:', backupKey)
        return backupKey
      } catch (error) {
        console.error('Backup failed:', error)
        return null
      }
    }
    return null
  }, [activityFeed])

  // Restore data from backup
  const restoreData = useCallback((backupKey: string) => {
    if (typeof window !== 'undefined') {
      try {
        const backupData = localStorage.getItem(backupKey)
        if (backupData) {
          const backup = JSON.parse(backupData)
          
          // Restore each data type
          if (backup.activityFeed) {
            setActivityFeed(backup.activityFeed)
            localStorage.setItem('activityFeed', JSON.stringify(backup.activityFeed))
          }
          if (backup.appointments) {
            localStorage.setItem('appointments', backup.appointments)
          }
          if (backup.businessSettings) {
            localStorage.setItem('businessSettings', backup.businessSettings)
          }
          if (backup.staff) {
            localStorage.setItem('staff', backup.staff)
          }
          
          console.log('Data restored from backup:', backupKey)
          return true
        }
      } catch (error) {
        console.error('Restore failed:', error)
      }
    }
    return false
  }, [])

  // Get available backups
  const getAvailableBackups = useCallback(() => {
    if (typeof window !== 'undefined') {
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_'))
      return backupKeys.map(key => {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || '{}')
          return {
            key,
            timestamp: backup.timestamp,
            date: backup.date
          }
        } catch {
          return null
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.timestamp - a.timestamp)
    }
    return []
  }, [])

  return {
    activityFeed,
    addActivity,
    addAppointmentCreated,
    addAppointmentUpdated,
    addAppointmentDeleted,
    generateFromAppointments,
    clearOldActivities,
    recoverAppointment,
    backupData,
    restoreData,
    getAvailableBackups
  }
}