'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

// Customer data structure (same as main page)
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

// Mock appointment data
interface Appointment {
  id: string
  title: string
  start: string
  end: string
  staffName: string
  serviceName: string
  status: 'completed' | 'scheduled' | 'upcoming' | 'cancelled'
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

const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Gel Manicure',
    start: '2025-08-01T14:30:00Z',
    end: '2025-08-01T15:30:00Z',
    staffName: 'Sarah Johnson',
    serviceName: 'Gel Manicure',
    status: 'completed'
  },
  {
    id: '2',
    title: 'Pedicure',
    start: '2025-07-15T10:00:00Z',
    end: '2025-07-15T11:00:00Z',
    staffName: 'Sarah Johnson',
    serviceName: 'Pedicure',
    status: 'completed'
  },
  {
    id: '3',
    title: 'Nail Art',
    start: '2025-08-15T16:00:00Z',
    end: '2025-08-15T17:00:00Z',
    staffName: 'Sarah Johnson',
    serviceName: 'Nail Art',
    status: 'scheduled'
  }
]

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [checkIns, setCheckIns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'appointments' | 'checkins'>('details')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  const loadCustomer = async () => {
    try {
      console.log('Loading customer with ID:', customerId)
      
      // Load customer from API
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const customerData = await response.json()
        console.log('Found customer:', customerData.firstName)
        setCustomer(customerData)
        
        // Load appointments for this customer (both scheduled and completed)
        const appointmentsResponse = await fetch(`/api/appointments?clientId=${customerId}`)
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json()
          
          // Sort appointments: scheduled first (by date), then completed (by date, most recent first)
          const sortedAppointments = appointmentsData.sort((a: any, b: any) => {
            const aDate = new Date(a.start)
            const bDate = new Date(b.start)
            
            // If both are scheduled or both are completed, sort by date (most recent first)
            if (a.status === b.status) {
              return bDate.getTime() - aDate.getTime() // Most recent first
            }
            
            // Scheduled appointments come first
            if (a.status === 'scheduled' && b.status === 'completed') {
              return -1
            }
            if (a.status === 'completed' && b.status === 'scheduled') {
              return 1
            }
            
            return 0
          })
          
          setAppointments(sortedAppointments)
        }
      } else {
        console.log('Customer not found, redirecting to customers list')
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error loading customer:', error)
      router.push('/customers')
    }
    setLoading(false)
  }

  const loadCheckIns = useCallback(async () => {
    try {
      console.log('Loading check-ins for customer:', customerId)
      // Load check-ins from API
      const response = await fetch(`/api/checkins?clientId=${customerId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Found check-ins:', data.length)
        setCheckIns(data)
      }
    } catch (error) {
      console.error('Error loading check-ins:', error)
    }
  }, [customerId])

  useEffect(() => {
    loadCustomer()
    loadCheckIns()

    // Listen for new check-ins
    const handleStorageChange = () => {
      loadCheckIns()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('checkin:new', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('checkin:new', handleStorageChange)
    }
  }, [customerId, loadCheckIns])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Less than 1 hour ago'
    if (diffInHours === 1) return '1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'VIP': return '#7c3aed'
      case 'Regular': return '#059669'
      case 'New': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#059669'
      case 'scheduled': return '#7c3aed'
      case 'upcoming': return '#7c3aed'
      case 'cancelled': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const handleDeleteCustomer = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Remove from localStorage
    const stored = localStorage.getItem('customers')
    if (stored) {
      const customers = JSON.parse(stored)
      const updatedCustomers = customers.filter((c: any) => c.id !== customerId)
      localStorage.setItem('customers', JSON.stringify(updatedCustomers))
    }
    
    router.push('/customers')
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#6b7280' }}>Loading customer details...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#dc2626' }}>Customer not found</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
          <button
          onClick={() => router.push('/customers')}
            style={{
            background: 'none',
            border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
            fontSize: 16,
              display: 'flex',
              alignItems: 'center',
            gap: 8,
            marginBottom: 20
            }}
          >
          ← Back to Customers
          </button>
          
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700, color: '#111827' }}>
                {customer.firstName} {customer.lastName}
              </h1>
            <div style={{ fontSize: 18, color: '#6b7280', marginTop: 8 }}>
              Customer since {formatDate(customer.createdAt)}
            </div>
          </div>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
                    style={{
              padding: '12px 24px',
              background: '#dc2626',
                      color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete Customer
          </button>
          </div>
        </div>
        
      {/* Tabs */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'details' ? '#7c3aed' : 'transparent',
              color: activeTab === 'details' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'details' ? '2px solid #7c3aed' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'appointments' ? '#7c3aed' : 'transparent',
              color: activeTab === 'appointments' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'appointments' ? '2px solid #7c3aed' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('checkins')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'checkins' ? '#7c3aed' : 'transparent',
              color: activeTab === 'checkins' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'checkins' ? '2px solid #7c3aed' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            Check-ins ({checkIns.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Customer Information */}
          <div style={{ background: 'white', padding: 32, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 600, color: '#111827' }}>
                Customer Information
            </h2>
              
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Full Name</div>
                <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>
                  {customer.firstName} {customer.lastName}
                  </div>
                </div>
                
                <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Email</div>
                <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>{customer.email || 'Not provided'}</div>
                  </div>
              
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Phone</div>
                <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>{customer.phone}</div>
                </div>
                
                {customer.dateOfBirth && (
                  <div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Date of Birth</div>
                  <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>
                      {formatDate(customer.dateOfBirth)} ({calculateAge(customer.dateOfBirth)} years old)
                    </div>
                  </div>
                )}
                
                <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Total Visits</div>
                <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>
                  {(() => {
                    // Combine check-ins and appointments, counting same-day visits as one
                    const visitDates = new Set()
                    
                    // Add check-in dates
                    checkIns.forEach(checkin => {
                      const date = new Date(checkin.checkInAt).toDateString()
                      visitDates.add(date)
                    })
                    
                    // Add appointment dates (appointments are already filtered to active ones)
                    appointments.forEach(appointment => {
                      const date = new Date(appointment.start).toDateString()
                      visitDates.add(date)
                    })
                    
                    return visitDates.size
                  })()}
                </div>
              </div>
              
              {customer.lastVisit && (
                <div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Last Visit</div>
                  <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>
                    {formatDate(customer.lastVisit)} at {formatTime(customer.lastVisit)}
                  </div>
                </div>
              )}
              
              {customer.preferredStaff && (
                <div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>Preferred Staff</div>
                  <div style={{ fontSize: 18, color: '#111827', fontWeight: 500 }}>{customer.preferredStaff}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tags and Notes */}
          <div style={{ background: 'white', padding: 32, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 600, color: '#111827' }}>
              Tags & Notes
            </h2>
            
            {customer.tags.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12, fontWeight: 500 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {customer.tags.map(tag => (
                    <span
                      key={tag}
                style={{
                  padding: '8px 16px',
                        background: getTagColor(tag),
                        color: 'white',
                        borderRadius: 16,
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {customer.notes && (
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12, fontWeight: 500 }}>Notes</div>
                <div style={{ 
                  fontSize: 16, 
                  color: '#111827', 
                  lineHeight: 1.6,
                  padding: 16,
                  background: '#f9fafb',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  {customer.notes}
                </div>
            </div>
            )}
            
            {!customer.notes && customer.tags.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                color: '#9ca3af',
                fontSize: 16
              }}>
                No tags or notes available for this customer
              </div>
            )}
          </div>
        </div>
      )}

                                      {activeTab === 'appointments' && (
        <div style={{ background: 'white', padding: 32, borderRadius: 12, border: '1px solid #e5e7eb', width: '100%', boxSizing: 'border-box' }}>
 
            {/* Filter Buttons */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setAppointmentFilter('all')}
                  style={{
                    padding: '8px 16px',
                    background: appointmentFilter === 'all' ? '#7c3aed' : '#f3f4f6',
                    color: appointmentFilter === 'all' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setAppointmentFilter('upcoming')}
                  style={{
                    padding: '8px 16px',
                    background: appointmentFilter === 'upcoming' ? '#7c3aed' : '#f3f4f6',
                    color: appointmentFilter === 'upcoming' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setAppointmentFilter('past')}
                  style={{
                    padding: '8px 16px',
                    background: appointmentFilter === 'past' ? '#7c3aed' : '#f3f4f6',
                    color: appointmentFilter === 'past' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Past
                </button>
              </div>
            </div>
            
            {(() => {
              const upcomingCount = appointments.filter(apt => apt.status === 'scheduled').length
              const pastCount = appointments.filter(apt => apt.status === 'completed').length
              
              if (appointmentFilter === 'upcoming' && upcomingCount === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 60, 
                    color: '#9ca3af',
                    fontSize: 18
                  }}>
                    No upcoming appointments found for this customer
                  </div>
                )
              }
              
              if (appointmentFilter === 'past' && pastCount === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 60, 
                    color: '#9ca3af',
                    fontSize: 18
                  }}>
                    No past appointments found for this customer
                  </div>
                )
              }
              
              if (appointments.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 60, 
                    color: '#9ca3af',
                    fontSize: 18
                  }}>
                    No appointments found for this customer
                  </div>
                )
              }
              
              return null
            })()}
            
            {(() => {
              const upcomingCount = appointments.filter(apt => apt.status === 'scheduled').length
              const pastCount = appointments.filter(apt => apt.status === 'completed').length
              
              if (appointmentFilter === 'upcoming' && upcomingCount === 0) return null
              if (appointmentFilter === 'past' && pastCount === 0) return null
              if (appointments.length === 0) return null
              
              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Upcoming Appointments */}
                {appointmentFilter !== 'past' && appointments.filter(apt => apt.status === 'scheduled').length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                      Upcoming Appointments
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {appointments.filter(apt => apt.status === 'scheduled').map(appointment => (
                        <div
                          key={appointment.id}
                          style={{
                            padding: 24,
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#f9fafb'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                               {appointment.title}
                             </div>
                              <div style={{ fontSize: 16, color: '#6b7280' }}>
                                {formatDate(appointment.start)} at {formatTime(appointment.start)}
                             </div>
                           </div>
                           <span
                             style={{
                                padding: '8px 16px',
                                background: getStatusColor(appointment.status),
                                color: 'white',
                                borderRadius: 16,
                                fontSize: 14,
                                fontWeight: 600
                             }}
                           >
                             {appointment.status}
                           </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, color: '#6b7280' }}>
                              Staff: {appointment.staffName}
                            </div>
                            <button
                              onClick={() => {
                                const appointmentDate = new Date(appointment.start)
                                const dateString = appointmentDate.toISOString().split('T')[0]
                                router.push(`/calendar?date=${dateString}`)
                              }}
                              style={{
                                padding: '8px 16px',
                                background: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Go to Appointment
                            </button>
                          </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                {/* Past Appointments */}
                {appointmentFilter !== 'upcoming' && appointments.filter(apt => apt.status === 'completed').length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                      Past Appointments
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {appointments.filter(apt => apt.status === 'completed').map(appointment => (
                        <div
                          key={appointment.id}
                          style={{
                            padding: 24,
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#f9fafb'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                               {appointment.title}
                             </div>
                              <div style={{ fontSize: 16, color: '#6b7280' }}>
                                {formatDate(appointment.start)} at {formatTime(appointment.start)}
                             </div>
                           </div>
                           <span
                             style={{
                                padding: '8px 16px',
                                background: getStatusColor(appointment.status),
                                color: 'white',
                                borderRadius: 16,
                                fontSize: 14,
                                fontWeight: 600
                             }}
                           >
                             {appointment.status}
                           </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, color: '#6b7280' }}>
                              Staff: {appointment.staffName}
                            </div>
                            <button
                              onClick={() => {
                                const appointmentDate = new Date(appointment.start)
                                const dateString = appointmentDate.toISOString().split('T')[0]
                                router.push(`/calendar?date=${dateString}`)
                              }}
                              style={{
                                padding: '8px 16px',
                                background: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Go to Appointment
                            </button>
                          </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )
           })()}
           </div>
        )}

      {activeTab === 'checkins' && (
        <CustomerCheckIns customerId={customerId} checkIns={checkIns} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 24,
            borderRadius: 8,
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Delete Customer
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
              Are you sure you want to delete {customer.firstName} {customer.lastName}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerCheckIns({ customerId, checkIns }: { customerId: string; checkIns: any[] }) {
  const [loading, setLoading] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
        Loading check-ins...
      </div>
    )
  }

    return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div style={{ background: 'white', padding: 32, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 600, color: '#111827' }}>
          Check-in History
        </h2>
        
        {checkIns.length === 0 ? (
                <div style={{
            textAlign: 'center', 
            padding: 60, 
            color: '#9ca3af',
            fontSize: 18
          }}>
            No check-ins found for this customer
                </div>
              ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16,
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '8px'
          }}>
            {checkIns.map((checkin, index) => (
              <div
                key={index}
                style={{
                  padding: 24,
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  background: '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                      Check-in #{index + 1}
                    </div>
                    <div style={{ fontSize: 16, color: '#6b7280' }}>
                      {formatDate(checkin.checkInAt)} at {formatTime(checkin.checkInAt)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '8px 16px',
                      background: '#059669',
                      color: 'white',
                      borderRadius: 16,
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    {checkin.status === 'waiting' ? 'Checked In' : checkin.status}
                  </span>
                </div>
                
                {checkin.service && (
                  <div style={{ fontSize: 16, color: '#6b7280' }}>
                    Service: {checkin.service}
                  </div>
                )}
                
                {checkin.assignedStaff && (
                  <div style={{ fontSize: 16, color: '#6b7280' }}>
                    Assigned to: {checkin.assignedStaff.name}
                  </div>
                )}
          </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ background: 'white', padding: 32, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 600, color: '#111827' }}>
          Check-in Summary
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 20, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Total Check-ins</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#111827' }}>{checkIns.length}</div>
          </div>
          
          <div style={{ padding: 20, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Last Check-in</div>
            <div style={{ fontSize: 16, color: '#111827' }}>
              {checkIns.length > 0 ? formatDate(checkIns[0].checkInAt) : 'Never'}
            </div>
          </div>
          
          <div style={{ padding: 20, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Most Requested Service</div>
            <div style={{ fontSize: 16, color: '#111827' }}>
              {(() => {
                const services = checkIns.map(c => c.service).filter(Boolean)
                if (services.length === 0) return 'None'
                const serviceCounts = services.reduce((acc, service) => {
                  acc[service] = (acc[service] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
                const mostCommon = Object.entries(serviceCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0]
                return mostCommon ? mostCommon[0] : 'None'
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 






 
 
 
 
 
 
 
 