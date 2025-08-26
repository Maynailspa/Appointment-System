'use client'

import React from 'react'

// Customer data structure
interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth?: string
  notes?: string
  createdAt: string
  lastVisit?: string
  totalVisits: number
  preferredStaff?: string
  tags: string[]
}

interface CustomerListItemProps {
  customer: Customer
  onView: (customerId: string) => void
  onEdit: (customerId: string) => void
  onBook: (customerId: string) => void
  index: number
  totalItems: number
}

export default function CustomerListItem({
  customer,
  onView,
  onEdit,
  onBook,
  index,
  totalItems
}: CustomerListItemProps) {
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'VIP': return '#8b5cf6'
      case 'Regular': return '#3b82f6'
      case 'New': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        borderBottom: index < totalItems - 1 ? '1px solid #f3f4f6' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'background-color 0.2s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white'
      }}
      onClick={() => onView(customer.id)}
    >
      {/* Avatar */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#4c6ef5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: '16px',
        flexShrink: 0
      }}>
        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
      </div>

      {/* Customer Info */}
      <div style={{ flex: '1', minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '4px' 
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1a202c', 
            margin: '0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {customer.firstName} {customer.lastName}
          </h3>
          {customer.tags.map(tag => (
            <span
              key={tag}
              style={{
                background: getTagColor(tag),
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <span>{customer.phone}</span>
          <span>•</span>
          <span style={{ 
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {customer.email}
          </span>
          {customer.lastVisit && (
            <>
              <span>•</span>
              <span>Last visit: {getTimeAgo(customer.lastVisit)}</span>
            </>
          )}
          <span>•</span>
          <span>{customer.totalVisits} visits</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        flexShrink: 0
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(customer.id)
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4c6ef5'
            e.currentTarget.style.color = '#4c6ef5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          View
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(customer.id)
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4c6ef5'
            e.currentTarget.style.color = '#4c6ef5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBook(customer.id)
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #10b981',
            borderRadius: '6px',
            background: 'white',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#10b981'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.color = '#10b981'
          }}
        >
          Book
        </button>
      </div>
    </div>
  )
} 