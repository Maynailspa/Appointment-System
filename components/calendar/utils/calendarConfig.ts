// src/components/calendar/utils/calendarConfig.ts

export const BUSINESS_HOURS = {
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  startTime: '09:00',
  endTime: '20:00',
}

export const SLOT_LABEL_FORMAT = {
  hour: '2-digit' as const,
  minute: '2-digit' as const,
  hour12: true,
  meridiem: 'short' as const
}

export const CALENDAR_CONFIG = {
  initialView: 'timeGridWeek',
  headerToolbar: false,
  editable: true,
  droppable: false,
  eventResizableFromStart: false,
  eventDurationEditable: true,
  eventStartEditable: true,
  dragScroll: true,
  snapDuration: "00:15:00",
  eventOverlap: false,
  height: "100%",
  slotMinTime: "07:00:00",
  slotMaxTime: "21:00:00",
  slotDuration: "00:15:00",
  slotLabelInterval: "01:00:00",
  eventDisplay: "block",
  allDaySlot: false,
  eventMinHeight: 30,
  expandRows: true,
  nowIndicator: true,
}

// Note: Team data, clients, and services are now loaded from API endpoints
// - Team members: /api/staff
// - Clients: /api/customers  
// - Services: TODO - implement /api/services endpoint