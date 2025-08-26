// components/calendar/components/AddMenu.tsx

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  showAddMenu: boolean
  onShowAddMenu: (show: boolean) => void
  onOpenAppointmentPanel: (type: 'single' | 'group' | 'blocked') => void
}

export default function AddMenu({
  showAddMenu,
  onShowAddMenu,
  onOpenAppointmentPanel,
}: Props) {
  const router = useRouter()

  const handleMenuItemClick = (type: 'single' | 'group' | 'blocked') => {
    console.log('AddMenu: Clicking menu item:', type) // Debug log
    onOpenAppointmentPanel(type)
    onShowAddMenu(false)
  }

  return (
    <div className="add-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          console.log('AddMenu: Toggle menu') // Debug log
          onShowAddMenu(!showAddMenu)
        }}
        style={{
          padding: '8px 16px',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          fontSize: '14px',
          background: '#000000',
          color: 'white',
          cursor: 'pointer',
          fontWeight: '500',
          fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease-in-out',
          height: '40px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1f1f1f'
          e.currentTarget.style.borderColor = '#1f1f1f'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#000000'
          e.currentTarget.style.borderColor = '#dee2e6'
        }}
      >
        Add
        <svg 
          style={{ 
            width: '14px', 
            height: '14px', 
            fill: 'white',
            transform: showAddMenu ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }} 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {/* Add Menu Dropdown */}
      {showAddMenu && (
        <div 
          className="add-menu-popup"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '240px',
            zIndex: 1000,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderBottom: '1px solid #f3f4f6'
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleMenuItemClick('single')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.paddingLeft = '22px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.paddingLeft = '18px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#dbeafe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                style={{ width: '18px', height: '18px', fill: '#3b82f6' }} 
                viewBox="0 0 24 24"
              >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Appointment
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                Schedule a one-on-one session
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderBottom: '1px solid #f3f4f6'
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleMenuItemClick('group')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.paddingLeft = '22px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.paddingLeft = '18px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#f3e8ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                style={{ width: '18px', height: '18px', fill: '#8b5cf6' }} 
                viewBox="0 0 24 24"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Group appointment
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                Schedule multiple clients together
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderBottom: '1px solid #f3f4f6'
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleMenuItemClick('blocked')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.paddingLeft = '22px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.paddingLeft = '18px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#f3f4f6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                style={{ width: '18px', height: '18px', fill: '#6b7280' }} 
                viewBox="0 0 24 24"
              >
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Blocked time
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                Block time for personal use
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out',
              borderBottom: '1px solid #f3f4f6'
            }}
            onClick={(e) => {
              e.stopPropagation()
              router.push('/sales/new')
              onShowAddMenu(false)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.paddingLeft = '22px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.paddingLeft = '18px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#ecfdf5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                style={{ width: '18px', height: '18px', fill: '#10b981' }} 
                viewBox="0 0 24 24"
              >
                <path d="M9.5 11H7v2.5h2.5V11zm0-5H7v2.5h2.5V6zm0 10H7V18h2.5v-2zm6.5-3.5h-2.5V11H16v2.5zm0-5h-2.5V6H16v2.5zm0 10h-2.5V16H16v2z"/>
                <path d="M19 5v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h1V1h2v2h6V1h2v2h1c1.1 0 2 .9 2 2z" fillOpacity="0.3"/>
              </svg>
            </div>
            <div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Sale
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                Record a product or service sale
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease-in-out'
            }}
            onClick={(e) => {
              e.stopPropagation()
              router.push('/payments/quick')
              onShowAddMenu(false)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.paddingLeft = '22px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.paddingLeft = '18px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#fef3c7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                style={{ width: '18px', height: '18px', fill: '#f59e0b' }} 
                viewBox="0 0 24 24"
              >
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
            <div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Quick payment
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                Process a quick payment
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}