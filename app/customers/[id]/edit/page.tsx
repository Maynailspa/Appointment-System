'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

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

// Mock data
const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Emma',
    lastName: 'Thompson',
    email: 'emma.thompson@email.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1990-05-15',
    notes: 'Prefers morning appointments, allergic to certain nail polishes. Always requests Sarah as her technician. Loves gel manicures and has a preference for neutral colors.',
    createdAt: '2024-01-15T10:00:00Z',
    lastVisit: '2025-08-01T14:30:00Z',
    totalVisits: 12,
    preferredStaff: 'staff-1',
    tags: ['VIP', 'Regular']
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 234-5678',
    createdAt: '2024-02-20T09:00:00Z',
    lastVisit: '2025-07-28T16:00:00Z',
    totalVisits: 8,
    tags: ['Regular']
  },
  {
    id: '3',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@email.com',
    phone: '+1 (555) 345-6789',
    dateOfBirth: '1985-12-03',
    notes: 'Loves gel manicures, always tips well. Prefers afternoon appointments and enjoys trying new nail art designs.',
    createdAt: '2024-03-10T11:00:00Z',
    lastVisit: '2025-08-02T13:00:00Z',
    totalVisits: 5,
    preferredStaff: 'staff-2',
    tags: ['New', 'VIP']
  }
]

// Mock staff data
const mockStaff = [
  { id: 'staff-1', name: 'Sarah Johnson' },
  { id: 'staff-2', name: 'Bonnie Smith' },
  { id: 'staff-3', name: 'Polly Wilson' }
]

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: '',
    preferredStaff: '',
    tags: [] as string[]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/customers')
            return
          }
          throw new Error('Failed to fetch customer')
        }
        
        const customerData = await response.json()
        setCustomer(customerData)
        setFormData({
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          dateOfBirth: customerData.dateOfBirth || '',
          notes: customerData.notes || '',
          preferredStaff: customerData.preferredStaff || '',
          tags: [...customerData.tags]
        })
      } catch (error) {
        console.error('Error fetching customer:', error)
        router.push('/customers')
      }
    }

    fetchCustomer()
  }, [customerId, router])

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value
    
    // Format phone number if it's the phone field
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value)
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    // Only validate email if it's provided
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update customer')
      }
      
      // Redirect back to customer detail page
      router.push(`/customers/${customerId}`)
    } catch (error) {
      console.error('Error updating customer:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update customer. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to format phone number as 123-456-7890
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format based on length
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  const handleCancel = () => {
    router.push(`/customers/${customerId}`)
  }

  const handleDelete = async () => {
    if (!customer) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete customer')
      }
      setShowDeleteConfirm(false)
      router.push('/customers')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete customer')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!customer) {
    return (
      <div style={{ 
        padding: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  const availableTags = ['VIP', 'Regular', 'New', 'Returning', 'Premium']

  return (
    <div style={{ 
      padding: '24px', 
      background: '#f8fafc', 
      minHeight: '100vh',
      height: 'auto',
      overflow: 'auto',
      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push(`/customers/${customer.id}`)}
            style={{
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1a202c', 
              margin: '0 0 8px 0' 
            }}>
              Edit Customer
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              margin: '0' 
            }}>
              Update {customer.firstName} {customer.lastName}'s information
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              background: '#ef4444',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        overflow: 'visible'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '16px' }}>
            {/* Personal Information */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1a202c', 
                margin: '0 0 20px 0' 
              }}>
                Personal Information
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: errors.firstName ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.firstName ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.firstName && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      {errors.firstName}
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: errors.lastName ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.lastName ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.lastName && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      {errors.lastName}
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1a202c', 
                margin: '0 0 20px 0' 
              }}>
                Contact Information
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.phone && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      {errors.phone}
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: errors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.email && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      {errors.email}
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Preferred Staff
                  </label>
                  <select
                    value={formData.preferredStaff}
                    onChange={(e) => handleInputChange('preferredStaff', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s ease-in-out',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4c6ef5'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                    }}
                  >
                    <option value="">Select preferred staff member</option>
                    {mockStaff.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1a202c', 
              margin: '0 0 16px 0' 
            }}>
              Customer Tags
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  style={{
                    padding: '8px 16px',
                    border: formData.tags.includes(tag) ? '1px solid #4c6ef5' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: formData.tags.includes(tag) ? '#4c6ef5' : 'white',
                    color: formData.tags.includes(tag) ? 'white' : '#6b7280',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes and Form Actions */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '32px'
            }}>
              {/* Notes Section */}
              <div style={{ flex: '1' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1a202c', 
                  margin: '0 0 16px 0' 
                }}>
                  Notes
                </h3>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add notes about this customer's preferences, allergies, or any other important information..."
                  rows={4}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out',
                    resize: 'vertical',
                    fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4c6ef5'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                  }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                gap: '12px',
                flexShrink: 0,
                marginTop: '80px'
              }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af'
                    e.currentTarget.style.color = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: isLoading ? '#9ca3af' : 'linear-gradient(90deg, #4c6ef5, #6366f1)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 2px 4px rgba(76, 110, 245, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 110, 245, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(76, 110, 245, 0.2)'
                    }
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div style={{ 
                marginTop: '16px',
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {errors.submit}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Custom Delete Confirmation */}
      {showDeleteConfirm && customer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '420px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#1a202c' }}>Delete Customer</h3>
            <p style={{ margin: '0 0 16px 0', color: '#4b5563' }}>
              Are you sure you want to permanently delete <strong>{customer.firstName} {customer.lastName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', color: '#374151', cursor: 'pointer' }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: '10px 14px', border: 'none', borderRadius: 8, background: '#ef4444', color: 'white', cursor: 'pointer', minWidth: 100, opacity: isDeleting ? 0.8 : 1 }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 