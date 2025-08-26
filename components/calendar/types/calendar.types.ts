// src/components/calendar/types/calendar.types.ts

export interface EventShape {
  id: string
  status: string
  start: string
  end: string
  staffName: string
  serviceName: string
  clientName: string
  staffId?: string
  selectedStaff?: string
  serviceId?: string
  clientId?: string
  isWalkIn?: boolean
  client?: Client
  // Group appointment fields
  appointmentType?: string
  groupMembers?: GroupAppointmentMember[]
  isGroupAppointment?: boolean
  // Recurring appointment fields
  isRecurring?: boolean
  seriesId?: string
  occurrenceNumber?: number
  totalOccurrences?: number
  flexibleTime?: boolean
  modified?: boolean
  recurringPattern?: RecurringPattern
  // Extended properties for additional data
  extendedProps?: {
    notes?: string
    services?: string[]
    staff?: string
    staffId?: string
    client?: Client
    clientId?: string
    isWalkIn?: boolean
    appointmentType?: string
    isGroupMember?: boolean
    groupId?: string
    // Recurring appointment extended props
    isRecurring?: boolean
    seriesId?: string
    occurrenceNumber?: number
    totalOccurrences?: number
    flexibleTime?: boolean
    modified?: boolean
    recurringPattern?: RecurringPattern
  }
}

export interface RecurringPattern {
  frequency: RecurringFrequency
  interval: number
  daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
  endAfter?: number
  endBy?: string
  noEndDate?: boolean
  keepSameTime: boolean
  flexibleTime: boolean
}

export type RecurringFrequency = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'triweekly'
  | 'monthly'
  | 'monthly-weekday'

export interface RecurringSeries {
  id: string
  pattern: RecurringPattern
  appointments: EventShape[]
  totalOccurrences: number
  completedOccurrences: number
  nextAppointment?: EventShape
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar?: string
  color: string
  services: string[]
  workingHours: WorkingHours
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export interface WorkingHours {
  [key: string]: {
    start: string
    end: string
    isWorking: boolean
  }
}

export interface TimeSlot {
  start: string
  end: string
  timeDisplay: string
  top: number
  left: number
  centerX?: number
  centerY?: number
  workerId?: string
}

export interface Service {
  id: string
  name: string
  price: number
  duration: number
  category: string
}

export interface Client {
  id: string
  firstName: string
  lastName?: string
  email?: string
  phone: string
  dateOfBirth?: string
  notes?: string
  createdAt: string
  lastVisit?: string
  totalVisits: number
  preferredStaff?: string
  tags: string[]
}

export type AppointmentType = 'single' | 'group' | 'blocked'

export type CalendarView = 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth' | 'resourceTimeGridWeek' | 'resourceTimeGridDay' | 'resourceDayGridMonth'

export interface CalendarState {
  view: CalendarView
  currentDate: Date
  currentDayName: string
  isToday: boolean
  isDragging: boolean
  dragFeedback: string
  showQuickActions: boolean
  selectedTimeSlot: TimeSlot | null
  showDatePicker: boolean
  datePickerJustClosed: boolean
  showAddMenu: boolean
  addMenuJustClosed: boolean
  showAddWorkerMenu: boolean
  addWorkerMenuJustClosed: boolean
  activeWorkers: string[]
  showAppointmentPanel: boolean
  appointmentType: AppointmentType
  appointmentTimeSlot: { start: string; end: string } | null
}

export interface GroupAppointmentMember {
  staffId: string
  staffName: string
  services: string[]
  startTime: string
  endTime: string
  duration: number
  price: number
}

export interface AppointmentFormState {
  selectedClient: string
  isWalkIn: boolean
  selectedServices: string[]
  selectedStaff: string
  blockReason: string
  appointmentNotes: string
  searchQuery: string
  showClientSearch: boolean
  searchingClients: boolean
  appointmentDate: Date
  showWeekPicker: boolean
  appointmentDuration: string
  // Group appointment fields
  groupMembers: GroupAppointmentMember[]
  isGroupAppointment: boolean
  // Recurring appointment fields
  isRecurring: boolean
  recurringPattern: RecurringPattern | null
  // Enhanced Block Time fields
  blockType: 'partial' | 'full'
  startDate: Date | null
  endDate: Date | null
  repeatWeekly: boolean
  repeatUntil: Date | null
}