// app/staff/page.tsx
'use client'

import { useState, useEffect } from 'react'
import StaffModal from '@/componentsssss/StaffModal'
import { StaffMember, Service } from '@/lib/types'
import React from 'react'

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [loading, setLoading] = useState(true)

  // Add state to track open dropdowns
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Load staff and services data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        console.log('Loading staff and services data from API...')
        
        // Fetch staff data
        const staffResponse = await fetch('/api/staff')
        if (staffResponse.ok) {
          const staffData = await staffResponse.json()
          console.log('Loaded staff data from API:', staffData)
          setStaff(staffData)
        } else {
          console.error('Failed to load staff data from API:', staffResponse.status)
          showError('Failed to load staff data. Please try refreshing the page.')
        }
        
        // TODO: Replace with real services API when available
        // For now, using mock services data
        const mockServices: Service[] = [
          { id: '1', name: 'Manicure', duration: 30, price: 25 },
          { id: '2', name: 'Pedicure', duration: 45, price: 35 },
          { id: '3', name: 'Gel Nails', duration: 60, price: 45 },
          { id: '4', name: 'Facial Treatment', duration: 60, price: 75 },
          { id: '5', name: 'Eyebrow Threading', duration: 15, price: 20 },
          { id: '6', name: 'Eyelash Extensions', duration: 90, price: 120 },
          { id: '7', name: 'Full Body Massage', duration: 90, price: 100 },
          { id: '8', name: 'Hot Stone Massage', duration: 60, price: 85 }
        ]
        setServices(mockServices)
        
      } catch (error) {
        console.error('Error loading data:', error)
        showError('Error loading data. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter staff based on search and role
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === '' || member.role === filterRole
    return matchesSearch && matchesRole
  }).sort((a, b) => {
    // Sort active workers first, then inactive workers
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    // If both have same active status, sort by priority (lower number = higher priority)
    const priorityA = a.priority || 50
    const priorityB = b.priority || 50
    if (priorityA !== priorityB) return priorityA - priorityB
    // If same priority, sort by name (for staff list, use name as secondary sort)
    return a.name.localeCompare(b.name)
  })

  // Get unique roles
  const roles = [...new Set(staff.map(member => member.role))]

  const handleAddStaff = () => {
    setSelectedStaff(null)
    setShowAddModal(true)
  }

  const handleEditStaff = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowEditModal(true)
  }

  const handleDeleteStaff = async (id: string) => {
    const staffMember = staff.find(s => s.id === id)
    if (staffMember) {
      setStaffToDelete(staffMember)
      setShowDeleteConfirm(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return
    
    try {
      const response = await fetch(`/api/staff/${staffToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setStaff(staff.filter(member => member.id !== staffToDelete.id))
        setShowDeleteConfirm(false)
        setStaffToDelete(null)
      } else {
        const errorData = await response.json()
        showError(errorData.error || 'Failed to delete staff member')
        setShowDeleteConfirm(false)
        setStaffToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting staff member:', error)
      showError('Failed to delete staff member')
      setShowDeleteConfirm(false)
      setStaffToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setStaffToDelete(null)
  }

  const showError = (message: string) => {
    setErrorMessage(message)
    setShowErrorModal(true)
  }

  const hideError = () => {
    setShowErrorModal(false)
    setErrorMessage('')
  }

  const handleToggleActive = async (id: string) => {
    try {
      const staffMember = staff.find(s => s.id === id)
      if (!staffMember) return
      
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...staffMember,
          isActive: !staffMember.isActive
        })
      })
      
      if (response.ok) {
        const updatedStaff = await response.json()
        setStaff(staff.map(member => 
          member.id === id ? updatedStaff : member
        ))
      } else {
        showError('Failed to update staff member')
      }
    } catch (error) {
      console.error('Error updating staff member:', error)
      showError('Failed to update staff member')
    }
  }

  const handleSaveStaff = async (staffData: Partial<StaffMember>) => {
    try {
      let response
      
      if (staffData.id && staff.find(s => s.id === staffData.id)) {
        // Update existing staff
        response = await fetch(`/api/staff/${staffData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData)
        })
      } else {
        // Add new staff
        response = await fetch('/api/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData)
        })
      }
      
      if (response.ok) {
        const savedStaff = await response.json()
        
        if (staffData.id) {
          // Update existing
          setStaff(staff.map(s => s.id === staffData.id ? savedStaff : s))
        } else {
          // Add new
          setStaff([...staff, savedStaff])
        }
        
        setShowAddModal(false)
        setShowEditModal(false)
      } else {
        const errorData = await response.json()
        showError(errorData.error || 'Failed to save staff member')
      }
    } catch (error) {
      console.error('Error saving staff member:', error)
      showError('Failed to save staff member')
    }
  }

  const getServiceNames = (serviceIds: string[]) => {
    return serviceIds.map(id => {
      const service = services.find(s => s.id === id)
      return service ? service.name : 'Unknown Service'
    }).join(', ')
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#6b7280'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading staff...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              Team
            </h1>
          </div>
          <button
            onClick={handleAddStaff}
            style={{
              padding: '12px 24px',
              background: '#000000',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1f1f1f'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#000000'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Team Member
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        overflowY: 'auto',
        height: 'calc(100vh - 120px)' // Subtract header height
      }}>
        {/* Search Bar */}
        <div style={{
          marginBottom: '24px'
        }}>
          <input
            type="text"
            placeholder="Search Worker"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease-in-out',
              boxSizing: 'border-box',
              background: 'white'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Staff Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {filteredStaff.map(member => (
            <div
              key={member.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                opacity: member.isActive ? 1 : 0.6,
                filter: member.isActive ? 'none' : 'grayscale(30%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Color Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: member.color
              }} />

              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e5e7eb',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: member.avatar ? '20px' : '24px',
                    fontWeight: '600',
                    border: '2px solid #f3f4f6',
                    overflow: 'hidden'
                  }}>
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={`${member.name} profile`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: '0 0 4px 0'
                    }}>
                      {member.name}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: member.isActive ? '#dcfce7' : '#fee2e2',
                        color: member.isActive ? '#15803d' : '#dc2626'
                      }}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#dbeafe',
                        color: '#1d4ed8'
                      }}>
                        Priority: {member.priority || 50}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - Three Dots Menu */}
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenDropdownId(openDropdownId === member.id ? null : member.id)
                    }}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openDropdownId === member.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 100,
                        minWidth: '160px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditStaff(member)
                          setOpenDropdownId(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(member.id)
                          setOpenDropdownId(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: member.isActive ? '#dc2626' : '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = member.isActive ? '#fef2f2' : '#f0fdf4'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {member.isActive ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 3v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5V3H9zm0 2h6v1H9V5zm2 3v10h2V8h-2zm4 0v10h2V8h-2z"/>
                            </svg>
                            Archive
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Info */}
              <div style={{ marginBottom: '20px' }}>
                <div>
                  <span style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    {member.phone}
                  </span>
                </div>
              </div>

              {/* Working Days */}
              <div>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  Working Schedule
                </h4>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  flexWrap: 'wrap'
                }}>
                  {Object.entries(member.workingHours).map(([day, hours]) => (
                    <span
                      key={day}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: hours.isWorking ? '#000000' : '#f3f4f6',
                        color: hours.isWorking ? '#ffffff' : '#6b7280',
                        border: '1px solid',
                        borderColor: hours.isWorking ? '#000000' : '#e5e7eb'
                      }}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              👥
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              No team members found
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 24px 0'
            }}>
              {searchTerm || filterRole ? 'Try adjusting your filters' : 'Get started by adding your first team member'}
            </p>
            <button
              onClick={handleAddStaff}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Add Team Member
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <StaffModal
        isOpen={showAddModal || showEditModal}
        isEdit={showEditModal}
        staff={selectedStaff}
        services={services}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
          setSelectedStaff(null)
        }}
        onSave={handleSaveStaff}
        onDelete={handleDeleteStaff}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && staffToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Delete Staff Member
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong>{staffToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleDeleteCancel}
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
                  e.currentTarget.style.background = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '12px 24px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b91c1c'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc2626'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              ⚠️
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Error
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              {errorMessage}
            </p>
            <button
              onClick={hideError}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Add CSS for spinning animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  )
}