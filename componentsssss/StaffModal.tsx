// components/StaffModal.tsx
'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { StaffMember, Service } from '@/lib/types'

interface StaffModalProps {
  isOpen: boolean
  isEdit: boolean
  staff: StaffMember | null
  services: Service[]
  onClose: () => void
  onSave: (staff: Partial<StaffMember>) => void
  onDelete?: (staffId: string) => void
}

export default function StaffModal({ 
  isOpen, 
  isEdit, 
  staff, 
  services, 
  onClose, 
  onSave,
  onDelete
}: StaffModalProps) {
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '',
    email: '',
    phone: '',
    role: '',
    avatar: '',
    color: '#3b82f6',
    services: [],
    priority: 50, // Default priority (lower number = higher priority)
    workingHours: {
      monday: { start: '09:00', end: '17:00', isWorking: true },
      tuesday: { start: '09:00', end: '17:00', isWorking: true },
      wednesday: { start: '09:00', end: '17:00', isWorking: true },
      thursday: { start: '09:00', end: '17:00', isWorking: true },
      friday: { start: '09:00', end: '17:00', isWorking: true },
      saturday: { start: '09:00', end: '13:00', isWorking: false },
      sunday: { start: '09:00', end: '13:00', isWorking: false }
    },
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as 123-456-7890
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }
  const staffColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
  ]

  const roles = [
    'Nail Technician', 'Esthetician', 'Massage Therapist', 'Manager', 'Receptionist', 'Owner'
  ]

  const days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]

  useEffect(() => {
    if (isEdit && staff) {
      setFormData(staff)
      setImagePreview(staff.avatar || null)
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        avatar: '',
        color: '#3b82f6',
        services: [],
        priority: 50,
        workingHours: {
          monday: { start: '09:00', end: '17:00', isWorking: true },
          tuesday: { start: '09:00', end: '17:00', isWorking: true },
          wednesday: { start: '09:00', end: '17:00', isWorking: true },
          thursday: { start: '09:00', end: '17:00', isWorking: true },
          friday: { start: '09:00', end: '17:00', isWorking: true },
          saturday: { start: '09:00', end: '13:00', isWorking: false },
          sunday: { start: '09:00', end: '13:00', isWorking: false }
        },
        isActive: true
      })
      setImagePreview(null)
    }
    setErrors({})
  }, [isEdit, staff])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSave({
        ...formData,
        id: isEdit ? staff?.id : Date.now().toString(),
        createdAt: isEdit ? staff?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      onClose()
    }
  }

  const handleWorkingHourChange = (day: string, field: 'start' | 'end' | 'isWorking', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...(prev.workingHours || {
          monday: { start: '09:00', end: '17:00', isWorking: true },
          tuesday: { start: '09:00', end: '17:00', isWorking: true },
          wednesday: { start: '09:00', end: '17:00', isWorking: true },
          thursday: { start: '09:00', end: '17:00', isWorking: true },
          friday: { start: '09:00', end: '17:00', isWorking: true },
          saturday: { start: '09:00', end: '13:00', isWorking: false },
          sunday: { start: '09:00', end: '13:00', isWorking: false }
        }),
        [day]: {
          ...(prev.workingHours?.[day as keyof typeof prev.workingHours] || { start: '09:00', end: '17:00', isWorking: true }),
          [field]: value
        }
      }
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImagePreview(result)
        setFormData({ ...formData, avatar: result })
      }
      reader.readAsDataURL(file)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => {
          // Prevent modal from closing when clicking inside the modal content
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0'
            }}>
              {isEdit ? 'Edit Team Member' : 'Add New Team Member'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '8px'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ 
          padding: '24px',
          overflow: 'auto',
          flex: 1
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Left Column - Basic Info */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 20px 0'
              }}>
                Basic Information
              </h3>

              {/* Profile Picture */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Profile Picture
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#e5e7eb',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: '32px',
                    border: '2px solid #f3f4f6',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Profile preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                      <label style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s ease-in-out',
                        display: 'inline-block'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                        Choose Photo
                      </label>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null)
                            setFormData({ ...formData, avatar: '' })
                          }}
                          style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#6b7280',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6'
                            e.currentTarget.style.borderColor = '#9ca3af'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = '#d1d5db'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '0'
                    }}>
                      Upload a photo or leave empty for default avatar. Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => !errors.name && (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => !errors.name && (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                {errors.name && (
                  <p style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    margin: '4px 0 0 0'
                  }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => {
                    const formattedValue = formatPhoneNumber(e.target.value)
                    setFormData({ ...formData, phone: formattedValue })
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${errors.phone ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => !errors.phone && (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => !errors.phone && (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                {errors.phone && (
                  <p style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    margin: '4px 0 0 0'
                  }}>
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Color */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Calendar Color
                </label>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {staffColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        border: formData.color === color ? '3px solid #1f2937' : '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Settings */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 20px 0'
              }}>
                Settings
              </h3>

              {/* Active Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#3b82f6'
                    }}
                  />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Active Team Member
                  </span>
                </label>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '4px 0 0 24px'
                }}>
                  Inactive team members won't appear in booking options
                </p>
              </div>

              {/* Display Priority */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Display Priority
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={formData.priority || 50}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease-in-out',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Lower numbers appear first on the calendar (1 = highest priority)
                </p>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 20px 0'
            }}>
              Working Hours
            </h3>
            
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {days.map((day, index) => (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    borderBottom: index < days.length - 1 ? '1px solid #e5e7eb' : 'none',
                    background: index % 2 === 0 ? '#f9fafb' : 'white'
                  }}
                >
                  <div style={{
                    width: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.workingHours?.[day as keyof typeof formData.workingHours]?.isWorking || false}
                      onChange={(e) => handleWorkingHourChange(day, 'isWorking', e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      textTransform: 'capitalize'
                    }}>
                      {day}
                    </span>
                  </div>
                  
                  {formData.workingHours?.[day as keyof typeof formData.workingHours]?.isWorking && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1
                    }}>
                      <input
                        type="time"
                        value={formData.workingHours[day as keyof typeof formData.workingHours]?.start || '09:00'}
                        onChange={(e) => handleWorkingHourChange(day, 'start', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <span style={{ color: '#6b7280' }}>to</span>
                      <input
                        type="time"
                        value={formData.workingHours[day as keyof typeof formData.workingHours]?.end || '17:00'}
                        onChange={(e) => handleWorkingHourChange(day, 'end', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  )}
                  
                  {!formData.workingHours?.[day as keyof typeof formData.workingHours]?.isWorking && (
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      Not working
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            {/* Delete button on the left */}
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  // Close the edit modal first
                  onClose()
                  // Then trigger the delete confirmation
                  onDelete(staff?.id || '')
                }}
                style={{
                  padding: '12px 24px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Delete
              </button>
            )}
            
            {/* Cancel and Save buttons on the right */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#9ca3af'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {isEdit ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}