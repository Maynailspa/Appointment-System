'use client'

import React, { useState, useEffect } from 'react'

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

interface CustomerFormProps {
  customer?: Customer | null
  onSubmit: (data: Partial<Customer>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
  title?: string
}

// Mock staff data
const mockStaff = [
  { id: 'staff-1', name: 'Sarah Johnson' },
  { id: 'staff-2', name: 'Bonnie Smith' },
  { id: 'staff-3', name: 'Polly Wilson' }
]

const availableTags = ['VIP', 'Regular', 'New', 'Returning', 'Premium']

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Customer',
  title = 'Customer Information'
}: CustomerFormProps) {
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth || '',
        notes: customer.notes || '',
        preferredStaff: customer.preferredStaff || '',
        tags: [...customer.tags]
      })
    }
  }, [customer])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
      setErrors({ submit: 'Failed to save customer. Please try again.' })
    }
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      padding: '32px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      maxWidth: '800px'
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '600', 
        color: '#1a202c', 
        margin: '0 0 24px 0' 
      }}>
        {title}
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
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
                    padding: '12px 16px',
                    border: errors.firstName ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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
              
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: errors.lastName ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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
              
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
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
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: errors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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
              
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
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
                    padding: '12px 16px',
                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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
              
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Preferred Staff
                </label>
                <select
                  value={formData.preferredStaff}
                  onChange={(e) => handleInputChange('preferredStaff', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out'
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

        {/* Notes */}
        <div style={{ marginTop: '32px' }}>
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
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              outline: 'none',
              transition: 'border-color 0.2s ease-in-out',
              resize: 'vertical',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4c6ef5'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db'
            }}
          />
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

        {/* Form Actions */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: 'white',
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out'
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
              boxShadow: '0 2px 4px rgba(76, 110, 245, 0.2)'
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
            {isLoading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
} 