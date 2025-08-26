// src/components/calendar/components/MultiStaffHeader.tsx

import React from 'react'
import { StaffMember } from '../types/calendar.types'
import TimeColumn from './TimeColumn'

interface Props {
  activeWorkers: string[]
  teamMembers: StaffMember[]
  onRemoveWorker: (workerId: string) => void
}

export default function MultiStaffHeader({
  activeWorkers,
  teamMembers,
  onRemoveWorker,
}: Props) {
  if (activeWorkers.length === 0) return null

  return (
    <>
      {/* Add CSS animation for loading pulse */}
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    <div style={{
      display: 'flex',
      borderBottom: '2px solid #e5e7eb',
      background: '#f9fafb',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Time column header */}
      <TimeColumn width="100px" minWidth="100px" variant="header" />

      {/* Staff member headers */}
      {activeWorkers.map(workerId => {
        const worker = teamMembers.find(member => member.id === workerId)
        
        // If worker not found, show loading state instead of null
        if (!worker) {
          return (
            <div
              key={workerId}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 16px',
                borderRight: '2px solid #d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#f9fafb'
              }}
            >
              {/* Loading skeleton */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#e5e7eb',
                animation: 'pulse 2s infinite'
              }} />

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '2px'
                }}>
                  Loading...
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#d1d5db'
                }}>
                  Please wait
                </div>
              </div>

              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#e5e7eb'
              }} />
            </div>
          )
        }

        return (
          <div
            key={workerId}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRight: activeWorkers.indexOf(workerId) < activeWorkers.length - 1 ? '1px solid #e5e7eb' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'white'
            }}
          >
            {/* Worker avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#e5e7eb',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '14px',
              border: '2px solid #f3f4f6',
              overflow: 'hidden'
            }}>
              {worker.avatar ? (
                <img 
                  src={worker.avatar} 
                  alt={`${worker.name} profile`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>

            {/* Worker info */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                {worker.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {worker.role}
              </div>
            </div>

            {/* Color indicator */}
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: worker.color
            }} />

            {/* Remove button */}
            <button
              onClick={() => onRemoveWorker(workerId)}
              style={{
                padding: '4px',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2'
                e.currentTarget.style.borderColor = '#fecaca'
                e.currentTarget.style.color = '#dc2626'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
    </>
  )
}