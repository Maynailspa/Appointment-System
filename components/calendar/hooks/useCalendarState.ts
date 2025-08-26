// components/calendar/hooks/useCalendarState.ts

import { useState, useCallback, useEffect, useRef } from 'react'
import { CalendarState, CalendarView, TimeSlot, AppointmentType } from '../types/calendar.types'
import { CalendarApi } from '@fullcalendar/core'

const getSavedView = (): CalendarView => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('calendarView') as CalendarView
    return saved || 'timeGridWeek'
  }
  return 'timeGridWeek'
}

export const useCalendarState = () => {
  // Refs for cleanup
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // State management
  const [isDragging, setIsDragging] = useState(false)
  const [dragFeedback, setDragFeedback] = useState<string>('')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentDayName, setCurrentDayName] = useState('')
  const [isToday, setIsToday] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerJustClosed, setDatePickerJustClosed] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addMenuJustClosed, setAddMenuJustClosed] = useState(false)
  const [showAddWorkerMenu, setShowAddWorkerMenu] = useState(false)
  const [addWorkerMenuJustClosed, setAddWorkerMenuJustClosed] = useState(false)
  const [activeWorkers, setActiveWorkers] = useState<string[]>([])
  const [showAppointmentPanel, setShowAppointmentPanel] = useState(false)
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('single')
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState<{ start: string; end: string } | null>(null)
  const [calendarApi, setCalendarApi] = useState<CalendarApi | null>(null)

  // Cleanup function for timeouts
  const addTimeout = useCallback((timeout: NodeJS.Timeout) => {
    timeoutsRef.current.add(timeout)
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current.clear()
  }, [])

  // Close all menus
  const closeAllMenus = useCallback(() => {
    setShowDatePicker(false)
    setShowAddMenu(false)
    setShowAddWorkerMenu(false)
    setShowQuickActions(false)
  }, [])

  // Handle date picker
  const handleShowDatePicker = useCallback((show: boolean) => {
    if (show) {
      closeAllMenus()
    }
    setShowDatePicker(show)
    if (!show) {
      setDatePickerJustClosed(true)
      const timeout = setTimeout(() => setDatePickerJustClosed(false), 100)
      addTimeout(timeout)
    }
  }, [closeAllMenus, addTimeout])

  // Handle add menu
  const handleShowAddMenu = useCallback((show: boolean) => {
    if (show) {
      closeAllMenus()
    }
    setShowAddMenu(show)
    if (!show) {
      setAddMenuJustClosed(true)
      const timeout = setTimeout(() => setAddMenuJustClosed(false), 100)
      addTimeout(timeout)
    }
  }, [closeAllMenus, addTimeout])

  // Handle add worker menu
  const handleShowAddWorkerMenu = useCallback((show: boolean) => {
    if (show) {
      closeAllMenus()
    }
    setShowAddWorkerMenu(show)
    if (!show) {
      setAddWorkerMenuJustClosed(true)
      const timeout = setTimeout(() => setAddWorkerMenuJustClosed(false), 100)
      addTimeout(timeout)
    }
  }, [closeAllMenus, addTimeout])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts()
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [clearAllTimeouts])

  return {
    // State
    isDragging,
    dragFeedback,
    showQuickActions,
    selectedTimeSlot,
    mounted,
    currentDate,
    currentDayName,
    isToday,
    showDatePicker,
    datePickerJustClosed,
    showAddMenu,
    addMenuJustClosed,
    showAddWorkerMenu,
    addWorkerMenuJustClosed,
    activeWorkers,
    showAppointmentPanel,
    appointmentType,
    appointmentTimeSlot,
    calendarApi,

    // Setters
    setIsDragging,
    setDragFeedback,
    setShowQuickActions,
    setSelectedTimeSlot,
    setMounted,
    setCurrentDate,
    setCurrentDayName,
    setIsToday,
    setShowDatePicker,
    setDatePickerJustClosed,
    setShowAddMenu,
    setAddMenuJustClosed,
    setShowAddWorkerMenu,
    setAddWorkerMenuJustClosed,
    setActiveWorkers,
    setShowAppointmentPanel,
    setAppointmentType,
    setAppointmentTimeSlot,
    setCalendarApi,

    // Handlers
    handleShowDatePicker,
    handleShowAddMenu,
    handleShowAddWorkerMenu,
    closeAllMenus,

    // Utils
    addTimeout,
    clearAllTimeouts,
    timeoutsRef,
    resizeObserverRef,
  }
}