// components/calendar/styles/CalendarStyles.tsx

import React from 'react'

interface Props {
  activeWorkers: string[]
}

export const CalendarStyles: React.FC<Props> = ({ activeWorkers }) => {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        /* Animation keyframes */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(100%);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom FullCalendar Styling */
        .fc {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          width: 100% !important;
          min-width: 0 !important;
          flex: 1 !important;
        }

        /* Responsive table layout */
        .fc-scrollgrid,
        .fc-scrollgrid-section,
        .fc-scrollgrid-sync-table,
        .fc-timegrid,
        .fc-timegrid-body,
        .fc-timegrid-cols,
        .fc-view,
        .fc-view-harness,
        .fc-view-harness-active {
          width: 100% !important;
          min-width: 0 !important;
        }

        .fc-toolbar {
          display: none !important;
        }

        .fc-header-toolbar {
          display: none !important;
        }

        .fc-toolbar-title {
          display: none !important;
        }

        .fc-view-title {
          display: none !important;
        }

        .fc-toolbar-chunk {
          display: none !important;
        }

        .fc-col-header {
          display: none !important;
        }

        .fc-col-header-cell {
          display: none !important;
        }

        .fc-scrollgrid-section-header {
          display: none !important;
        }

        .fc-toolbar-ltr, .fc-toolbar-center, .fc-toolbar-left, .fc-toolbar-right {
          display: none !important;
        }

        .fc h2, .fc-list-empty, .fc-day-header, .fc-widget-header {
          display: none !important;
        }

        .fc-button {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          font-weight: 500 !important;
          padding: 0.5rem 1rem !important;
          border-radius: 0.5rem !important;
          transition: all 0.2s !important;
          height: auto !important;
        }

        .fc-button:hover:not(:disabled) {
          background-color: #e2e8f0 !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .fc-button:focus {
          box-shadow: 0 0 0 2px #dbeafe !important;
        }

        .fc-button-active {
          background-color: #3b82f6 !important;
          border-color: #2563eb !important;
          color: white !important;
        }

        .fc-button-active:hover {
          background-color: #2563eb !important;
          border-color: #1d4ed8 !important;
        }

        .fc-day-today .fc-col-header-cell-cushion {
          color: #3b82f6 !important;
          font-weight: 600 !important;
        }

        .fc-timegrid-slot {
          border-color: #f1f5f9 !important;
          height: 2rem !important;
        }

        .fc-timegrid-slot-label {
          color: #000000 !important;
          font-weight: 600 !important;
          font-size: 0.875rem !important;
          background: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          text-align: right !important;
          padding-right: 8px !important;
        }

        .fc-timegrid-axis {
          background: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          width: 100px !important;
          min-width: 100px !important;
          max-width: 100px !important;
        }

        .fc-timegrid-slot-lane {
          border-left: none !important;
        }

        .fc-event {
          border-radius: 0.375rem !important;
          border: none !important;
          font-weight: 500 !important;
          font-size: 0.875rem !important;
          padding: 0.25rem 0.5rem !important;
          cursor: grab !important;
          transition: all 0.2s !important;
        }

        .fc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        .fc-event:active {
          cursor: grabbing !important;
        }

        .fc-event.fc-event-dragging {
          cursor: grabbing !important;
          transform: scale(1.02) !important;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25) !important;
          z-index: 999 !important;
          opacity: 0.9 !important;
          pointer-events: none !important;
        }

        .fc-event-dragging-mirror {
          pointer-events: none !important;
          transform: none !important;
        }

        .fc-event.fc-event-resizing {
          cursor: ns-resize !important;
        }

        .fc-event-title {
          font-weight: 500 !important;
          white-space: pre-line !important;
          line-height: 1.2 !important;
          font-size: 11px !important;
          padding: 2px 4px !important;
        }

        /* Ensure line breaks work in resource views */
        .fc-resource-timeGridDay-view .fc-event-title,
        .fc-resource-timeGridWeek-view .fc-event-title {
          white-space: pre-line !important;
          line-height: 1.2 !important;
          font-size: 11px !important;
          padding: 2px 4px !important;
        }

        .fc-timegrid-event {
          margin: 1px !important;
        }

        .fc-event-resizer {
          display: block !important;
          height: 8px !important;
          background: rgba(255, 255, 255, 0.3) !important;
          border-radius: 0 0 0.375rem 0.375rem !important;
        }

        .fc-event-resizer:hover {
          background: rgba(255, 255, 255, 0.5) !important;
        }

        .fc-daygrid-day-number {
          color: #374151 !important;
          font-weight: 600 !important;
        }

        .fc-day-today {
          background-color: #ffffff !important;
        }

        .fc-day-today .fc-col-header-cell-cushion {
          color: #3b82f6 !important;
          font-weight: 600 !important;
        }

        .fc-scrollgrid {
          border-color: #e2e8f0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          height: 100% !important;
          border-bottom: none !important;
          width: 100% !important;
        }

        .fc-scrollgrid-sync-table {
          border-color: #e2e8f0 !important;
          height: 100% !important;
          width: 100% !important;
        }

        .fc-timegrid-divider {
          border-color: #e2e8f0 !important;
          padding: 0 !important;
        }

        /* Remove momentum scrolling for stiff feel */
        .fc-scroller {
          -webkit-overflow-scrolling: auto !important;
          scroll-behavior: auto !important;
          overscroll-behavior: none !important;
          overflow-y: auto !important;
          height: ${activeWorkers.length > 0 ? 'calc(100vh - 180px)' : 'calc(100vh - 120px)'} !important;
          padding-bottom: 0 !important;
          width: 100% !important;
        }

        .fc-timegrid-body {
          min-height: ${activeWorkers.length > 0 ? 'calc(100vh - 180px)' : 'calc(100vh - 120px)'} !important;
          padding-bottom: 0 !important;
          width: 100% !important;
        }

        .fc-timegrid-slots {
          padding-bottom: 0 !important;
          width: 100% !important;
        }

        .fc-scrollgrid-section-body {
          padding-bottom: 0 !important;
          width: 100% !important;
        }

        .fc-scroller-liquid-absolute {
          bottom: 0 !important;
          width: 100% !important;
        }

        .fc-timegrid-axis-cushion {
          padding-bottom: 0 !important;
        }

        .fc-scrollgrid-section:last-child {
          border-bottom: none !important;
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

        /* Now Indicator - Fresha-style positioning */
        .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 1.5px !important;
          position: relative !important;
          z-index: 100 !important;
          left: 0 !important;
          width: calc(100% + 8px) !important;
          margin-left: -8px !important;
        }

        .fc-timegrid-now-indicator-arrow {
          display: none !important;
        }

        .fc-timegrid-now-indicator-container {
          overflow: visible !important;
        }

        .fc-timegrid-now-indicator-line::before {
          content: attr(data-time) !important;
          position: absolute !important;
          left: -63px !important;
          top: -12px !important;
          background: #ef4444 !important;
          color: white !important;
          padding: 6px 12px !important;
          border-radius: 18px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3) !important;
          z-index: 1001 !important;
          text-align: center !important;
        }

        /* Day view specific fixes */
        .fc-timeGridDay .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 1.5px !important;
          width: 100% !important;
        }

        .fc-timeGridDay .fc-timegrid-now-indicator-arrow {
          display: none !important;
        }

        .fc-highlight {
          background-color: #dbeafe !important;
          opacity: 0.8 !important;
        }

        /* Improved responsive design */
        @media (max-width: 768px) {
          .fc-toolbar {
            flex-direction: column !important;
            gap: 1rem !important;
          }

          .fc-toolbar-chunk {
            display: flex !important;
            justify-content: center !important;
          }

          .fc-button {
            padding: 0.375rem 0.75rem !important;
            font-size: 0.875rem !important;
          }
        }
      `
    }} />
  )
}