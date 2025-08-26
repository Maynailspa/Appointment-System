// components/calendar/components/MobileWorkerSelector.tsx

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { StaffMember } from '../types/calendar.types'

interface Props {
  teamMembers: StaffMember[]
  selectedWorkerId: string | null // null means "All"
  onWorkerSelect: (workerId: string | null) => void
}

export default function MobileWorkerSelector({
  teamMembers,
  selectedWorkerId,
  onWorkerSelect,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 })

  const selectedWorker = selectedWorkerId ? teamMembers.find(w => w.id === selectedWorkerId) : null
  const displayText = selectedWorker ? selectedWorker.name : 'All'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          setButtonPosition({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right
          })
          setShowDropdown(!showDropdown)
        }}
        style={{
          padding: '8px 16px',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          fontSize: '14px',
          background: selectedWorker ? selectedWorker.color : '#6b7280',
          color: 'white',
          cursor: 'pointer',
          fontWeight: '500',
          fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease-in-out',
          height: '40px',
          minWidth: '60px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {displayText}
        <svg 
          style={{ 
            width: '14px', 
            height: '14px', 
            fill: 'white',
            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }} 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {showDropdown && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${buttonPosition.top}px`,
            right: `${buttonPosition.right}px`,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '200px',
            maxWidth: '280px',
            zIndex: 10001,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f3f4f6',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Select Worker View
          </div>

          {/* All Workers Option */}
          <div
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              color: selectedWorkerId === null ? '#7c3aed' : '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderBottom: '1px solid #f9fafb',
              background: selectedWorkerId === null ? '#f8fafc' : 'transparent',
              fontWeight: selectedWorkerId === null ? '600' : '400'
            }}
            onClick={() => {
              onWorkerSelect(null)
              setShowDropdown(false)
            }}
            onMouseEnter={(e) => {
              if (selectedWorkerId !== null) {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.paddingLeft = '20px'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedWorkerId !== null) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.paddingLeft = '16px'
              }
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'white'
              }} />
            </div>
            <span style={{
              fontSize: '14px'
            }}>
              All Workers
            </span>
            {selectedWorkerId === null && (
              <div style={{
                marginLeft: 'auto',
                color: '#7c3aed'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Individual Workers */}
          {teamMembers
            .filter(member => member.isActive)
            .sort((a, b) => {
              const priorityA = a.priority || 50
              const priorityB = b.priority || 50
              if (priorityA !== priorityB) {
                return priorityA - priorityB
              }
              return a.name.localeCompare(b.name)
            })
            .map(member => (
              <div
                key={member.id}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: selectedWorkerId === member.id ? '#7c3aed' : '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease-in-out',
                  borderBottom: '1px solid #f9fafb',
                  background: selectedWorkerId === member.id ? '#f8fafc' : 'transparent',
                  fontWeight: selectedWorkerId === member.id ? '600' : '400'
                }}
                onClick={() => {
                  onWorkerSelect(member.id)
                  setShowDropdown(false)
                }}
                onMouseEnter={(e) => {
                  if (selectedWorkerId !== member.id) {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.paddingLeft = '20px'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedWorkerId !== member.id) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.paddingLeft = '16px'
                  }
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: member.color
                }} />
                <span style={{
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {member.name}
                </span>
                {selectedWorkerId === member.id && (
                  <div style={{
                    marginLeft: 'auto',
                    color: '#7c3aed'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}

          {/* No workers message */}
          {teamMembers.filter(member => member.isActive).length === 0 && (
            <div style={{
              padding: '20px 16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No active team members found
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Click outside handler */}
      {showDropdown && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
          onClick={() => setShowDropdown(false)}
        />,
        document.body
      )}
    </div>
  )
}
