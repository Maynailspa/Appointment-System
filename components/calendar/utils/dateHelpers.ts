// src/components/calendar/utils/dateHelpers.ts

export const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day
  startOfWeek.setDate(diff)
  
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek)
    currentDate.setDate(startOfWeek.getDate() + i)
    weekDates.push(currentDate)
  }
  return weekDates
}

export const isDateInWeek = (date: Date, weekStart: Date): boolean => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return date >= weekStart && date <= weekEnd
}

export const formatTimeRange = (start: Date, end: Date): string => {
  const startTime = start.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  const endTime = end.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  return `${startTime} - ${endTime}`
}

export const getMonthDates = (date: Date): Date[] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const dates = []
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    dates.push(currentDate)
  }
  return dates
}

export const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear()
}

export const getDurationInMinutes = (start: Date | string, end: Date | string): number => {
  const startTime = typeof start === 'string' ? new Date(start) : start
  const endTime = typeof end === 'string' ? new Date(end) : end
  return (endTime.getTime() - startTime.getTime()) / 1000 / 60
}

export const addMinutesToDate = (date: Date, minutes: number): Date => {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const generateTimeSlots = (startHour: number = 9, endHour: number = 20, interval: number = 15): Array<{value: string, display: string}> => {
  const times = []
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const h24 = hour
      const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const period = hour >= 12 ? 'PM' : 'AM'
      const timeValue = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const displayTime = `${h12}:${minute.toString().padStart(2, '0')} ${period}`
      times.push({ value: timeValue, display: displayTime })
    }
  }
  return times
}