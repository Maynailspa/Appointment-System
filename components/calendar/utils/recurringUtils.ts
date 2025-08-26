import { RecurringPattern, RecurringFrequency, EventShape } from '../types/calendar.types'

export const generateRecurringDates = (
  startDate: Date,
  pattern: RecurringPattern,
  maxOccurrences: number = 52
): Date[] => {
  const dates: Date[] = [new Date(startDate)]
  const { frequency, interval, daysOfWeek, endAfter, endBy, noEndDate } = pattern
  

  
  let currentDate = new Date(startDate)
  let occurrenceCount = 1
  
  while (occurrenceCount < maxOccurrences) {
    let nextDate: Date
    
    switch (frequency) {
      case 'daily':
        nextDate = new Date(currentDate)
        nextDate.setDate(currentDate.getDate() + interval)
        break
        
      case 'weekly':
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Find next occurrence based on selected days
          nextDate = getNextDayOfWeek(currentDate, daysOfWeek, interval)
        } else {
          nextDate = new Date(currentDate)
          nextDate.setDate(currentDate.getDate() + (7 * interval))
        }
        break
        
      case 'biweekly':
        nextDate = new Date(currentDate)
        nextDate.setDate(currentDate.getDate() + (14 * interval))
        break
        
      case 'triweekly':
        nextDate = new Date(currentDate)
        nextDate.setDate(currentDate.getDate() + (21 * interval))
        break
        
      case 'monthly':
        nextDate = new Date(currentDate)
        nextDate.setMonth(currentDate.getMonth() + interval)
        break
        
      case 'monthly-weekday':
        nextDate = getNextMonthWeekday(currentDate, interval)
        break
        
      default:
        return dates
    }
    
    // Check end conditions BEFORE adding the next date
    if (endAfter && occurrenceCount >= endAfter) break
    if (endBy && nextDate > new Date(endBy)) break
    
    dates.push(nextDate)
    currentDate = nextDate
    occurrenceCount++
  }
  
  return dates
}

export const getNextDayOfWeek = (currentDate: Date, daysOfWeek: number[], interval: number): Date => {
  const currentDay = currentDate.getDay()
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b)
  
  // Find next day in the same week
  const nextDayInWeek = sortedDays.find(day => day > currentDay)
  
  if (nextDayInWeek !== undefined) {
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() + (nextDayInWeek - currentDay))
    return nextDate
  }
  
  // If no next day in this week, go to next week
  const nextDate = new Date(currentDate)
  nextDate.setDate(currentDate.getDate() + (7 - currentDay + sortedDays[0]))
  return nextDate
}

export const getNextMonthWeekday = (currentDate: Date, interval: number): Date => {
  const nextDate = new Date(currentDate)
  nextDate.setMonth(currentDate.getMonth() + interval)
  
  // Keep the same day of the month
  return nextDate
}

export const createRecurringAppointments = (
  baseAppointment: Omit<EventShape, 'id' | 'start' | 'end'>,
  pattern: RecurringPattern,
  startDate: Date,
  startTime: string,
  duration: number
): EventShape[] => {

  
  const dates = generateRecurringDates(startDate, pattern)
  const seriesId = `series-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  return dates.map((date, index) => {
    const startDateTime = new Date(date)
    const [hours, minutes] = startTime.split(':').map(Number)
    startDateTime.setHours(hours, minutes, 0, 0)
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + duration)
    
    return {
      ...baseAppointment,
      id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      isRecurring: true,
      seriesId,
      occurrenceNumber: index + 1,
      totalOccurrences: dates.length,
      flexibleTime: pattern.flexibleTime,
      recurringPattern: pattern,
      extendedProps: {
        ...baseAppointment.extendedProps,
        isRecurring: true,
        seriesId,
        occurrenceNumber: index + 1,
        totalOccurrences: dates.length,
        flexibleTime: pattern.flexibleTime,
        recurringPattern: pattern
      }
    }
  })
}

export const getRecurringFrequencyLabel = (pattern: RecurringPattern): string => {
  const { frequency, interval, daysOfWeek } = pattern
  
  switch (frequency) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const selectedDays = daysOfWeek.map(day => dayNames[day]).join(', ')
        return interval === 1 ? `Weekly on ${selectedDays}` : `Every ${interval} weeks on ${selectedDays}`
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`
    case 'biweekly':
      return 'Every 2 weeks'
    case 'triweekly':
      return 'Every 3 weeks'
    case 'monthly':
      return interval === 1 ? 'Monthly' : `Every ${interval} months`
    case 'monthly-weekday':
      return interval === 1 ? 'Monthly (same weekday)' : `Every ${interval} months (same weekday)`
    default:
      return 'Custom'
  }
}

export const getDefaultRecurringPattern = (): RecurringPattern => ({
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: [],
  endAfter: undefined,
  endBy: '',
  noEndDate: false,
  keepSameTime: true,
  flexibleTime: false
})

export const validateRecurringPattern = (pattern: RecurringPattern): string[] => {
  const errors: string[] = []
  
  if (pattern.frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
    errors.push('Please select at least one day of the week')
  }
  
  if (!pattern.endAfter && !pattern.endBy && !pattern.noEndDate) {
    errors.push('Please specify when the series should end')
  }
  
  if (pattern.endAfter && (pattern.endAfter < 1 || pattern.endAfter > 52)) {
    errors.push('Series must end after 1-52 appointments')
  }
  
  if (pattern.endBy && new Date(pattern.endBy) <= new Date()) {
    errors.push('End date must be in the future')
  }
  
  return errors
} 