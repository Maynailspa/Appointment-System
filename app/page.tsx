'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityFeed } from '../hooks/useActivityFeed'
import { useRealtimeAppointmentSync } from '../hooks/useRealtimeAppointmentSync'

interface Appointment {
  id: string
  start: string
  end: string
  title: string
  clientName?: string
  serviceName?: string
  staffName?: string
  status?: string
  extendedProps?: {
    clientName?: string
    serviceName?: string
    staffName?: string
    status?: string
  }
}

// Remove local ActivityItem interface since we're using the one from useActivityFeed

export default function HomePage() {
  const router = useRouter()
  const { activityFeed, generateFromAppointments, recoverAppointment } = useActivityFeed()
  useRealtimeAppointmentSync() // This hook will listen for real-time appointment changes
  
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false)
  
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayRevenue: 0,
    walkInsToday: 0,
    tomorrowBookings: 0,
    weekRevenue: 0,
    topService: 'Manicure',
    availableStaff: 0
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [notifications, setNotifications] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Generate mock notifications
  const generateNotifications = () => {
    const notifications = [
      '3 appointments need confirmation',
      'Low on nail polish remover',
      'Betty\'s next break: 2:00 PM',
      '2 walk-ins waiting'
    ]
    setNotifications(notifications)
  }

  // Fetch real data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch appointments from both API and localStorage
        let allAppointments: Appointment[] = []
        
        // Try API first
        try {
          const appointmentsResponse = await fetch('/api/appointments')
          if (appointmentsResponse.ok) {
            const apiAppointments = await appointmentsResponse.json()
            allAppointments = [...allAppointments, ...apiAppointments]
          }
        } catch (apiError) {
          console.log('API appointments not available, using localStorage only')
        }
        
        // Also check localStorage for appointments
        try {
          const storedAppointments = localStorage.getItem('appointments')
          if (storedAppointments) {
            const parsedAppointments = JSON.parse(storedAppointments)
            allAppointments = [...allAppointments, ...parsedAppointments]
          }
        } catch (localError) {
          console.log('localStorage appointments not available')
        }
        
        // Remove duplicates based on ID
        const uniqueAppointments = allAppointments.filter((apt, index, self) => 
          index === self.findIndex(a => a.id === apt.id)
        )
        
        let todayAppointments = 0
        let todayRevenue = 0
        let walkInsToday = 0
        let tomorrowBookings = 0
        let weekRevenue = 0
        let upcoming: Appointment[] = []
        let topServiceToday = 'None'
        
        if (uniqueAppointments.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
          const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          
          // Filter today's appointments
          const todaysAppts = uniqueAppointments.filter((apt: Appointment) => {
            try {
              const aptDate = new Date(apt.start).toISOString().split('T')[0]
              return aptDate === today
            } catch (dateError) {
              return false
            }
          })
          
          // Compute Top Service Today from real data, whitelisted
          const allowedServices = new Set(['Fill','Pedicure','Manicure','Eyelashes','Facial','Massage'])
          try {
            const serviceCount: Record<string, number> = {}
            todaysAppts.forEach((apt: Appointment) => {
              const rawName = (apt.serviceName || apt.extendedProps?.serviceName) as string | undefined
              const name = rawName && allowedServices.has(rawName) ? rawName : undefined
              if (name) {
                serviceCount[name] = (serviceCount[name] || 0) + 1
              }
            })
            const topEntry = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]
            if (topEntry) topServiceToday = topEntry[0]
          } catch {}
          
          todayAppointments = todaysAppts.length
          todayRevenue = todaysAppts.length * 50 // Average $50 per appointment
          walkInsToday = todaysAppts.filter((apt: Appointment) => 
            apt.title?.includes('Walk-in') || 
            apt.extendedProps?.clientName === 'Walk-in Client' ||
            apt.clientName === 'Walk-in Client'
          ).length
          
          // Filter tomorrow's appointments
          const tomorrowsAppts = uniqueAppointments.filter((apt: Appointment) => {
            try {
              const aptDate = new Date(apt.start).toISOString().split('T')[0]
              return aptDate === tomorrow
            } catch (dateError) {
              return false
            }
          })
          tomorrowBookings = tomorrowsAppts.length
          
          // Calculate week revenue
          const weekAppts = uniqueAppointments.filter((apt: Appointment) => {
            try {
              const aptDate = new Date(apt.start).toISOString().split('T')[0]
              return aptDate >= weekStart
            } catch (dateError) {
              return false
            }
          })
          weekRevenue = weekAppts.length * 50
          
          // Get all appointments for today that haven't passed yet
          const now = new Date()
          
          const upcomingAppts = todaysAppts
            .filter((apt: Appointment) => {
              try {
                const aptTime = new Date(apt.start)
                return aptTime > now // Only show appointments that haven't started yet
              } catch (dateError) {
                return false
              }
            })
            .sort((a: Appointment, b: Appointment) => {
              try {
                return new Date(a.start).getTime() - new Date(b.start).getTime()
              } catch (dateError) {
                return 0
              }
            })
          
          upcoming = upcomingAppts
        }
        
        // Fetch staff
        let availableStaff = 0
        try {
          const staffResponse = await fetch('/api/staff')
          if (staffResponse.ok) {
            const staff = await staffResponse.json()
            availableStaff = staff.filter((member: any) => member.isActive).length
          }
        } catch (staffError) {
          console.log('Staff API not available, using default')
          availableStaff = 3 // Default fallback
        }
        
        setStats({
          todayAppointments,
          todayRevenue: 0, // Removed revenue
          walkInsToday,
          tomorrowBookings,
          weekRevenue,
          topService: topServiceToday,
          availableStaff
        })
        
        setUpcomingAppointments(upcoming)
        generateFromAppointments(uniqueAppointments)
        generateNotifications()
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Fallback to demo data
        setStats({
          todayAppointments: 12,
          todayRevenue: 0, // Removed revenue
          walkInsToday: 3,
          tomorrowBookings: 8,
          weekRevenue: 5240,
          topService: 'Gel Nails',
          availableStaff: 3
        })
        generateFromAppointments([])
        generateNotifications()
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Real-time update of upcoming appointments - remove them as time passes
  useEffect(() => {
    const updateUpcomingAppointments = () => {
      setUpcomingAppointments(prevUpcoming => {
        const now = new Date()
        return prevUpcoming.filter(apt => {
          try {
            const aptTime = new Date(apt.start)
            return aptTime > now // Remove appointments that have started
          } catch (dateError) {
            return false
          }
        })
      })
    }

    // Update every 30 seconds to remove passed appointments
    const interval = setInterval(updateUpcomingAppointments, 30000) // 30 seconds

    // Also update immediately
    updateUpcomingAppointments()

    return () => clearInterval(interval)
  }, [])

  // Activity feed is now managed by useActivityFeed hook

  const handleActivityClick = (activity: any) => {
    if (activity.type === 'appointment_deleted' && activity.appointmentData) {
      setSelectedActivityId(activity.id)
      setShowRecoverConfirm(true)
    }
  }

  const handleRecoverConfirm = () => {
    console.log('RECOVER CONFIRM CLICKED - selectedActivityId:', selectedActivityId)
    if (selectedActivityId) {
      console.log('CALLING recoverAppointment with ID:', selectedActivityId)
      recoverAppointment(selectedActivityId)
      setShowRecoverConfirm(false)
      setSelectedActivityId(null)
      console.log('Recovery process initiated')
    } else {
      console.error('No selectedActivityId found for recovery')
    }
  }

  const handleRecoverCancel = () => {
    setShowRecoverConfirm(false)
    setSelectedActivityId(null)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-walkin':
        router.push('/calendar')
        break
      case 'todays-schedule':
        router.push('/calendar')
        break
      case 'quick-checkin':
        alert('Quick check-in feature coming soon!')
        break
      case 'end-day-report':
        alert('End of day report feature coming soon!')
        break
      case 'new-appointment':
        router.push('/calendar')
        break
      case 'manage-customers':
        router.push('/customers')
        break
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '--:--'
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return '--:--'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return '#10b981'
      case 'pending': return '#f59e0b'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        height: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1f2937', 
            marginBottom: '8px' 
          }}>
            Welcome to May Nails & Spa
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#6b7280', 
            margin: '0' 
          }}>
            Today's overview - {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '32px' 
        }}>
          {/* Today's Appointments */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Today's Appointments
              </h3>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#3b82f6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '16px', height: '16px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.todayAppointments}
            </div>
          </div>

          {/* Walk-ins Today */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Walk-ins Today
              </h3>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#8b5cf6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '16px', height: '16px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.walkInsToday}
            </div>
          </div>

          {/* Available Staff */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Available Staff Today
              </h3>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#f59e0b',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '16px', height: '16px', fill: 'white' }} viewBox="0 0 24 24">
                  <circle cx="7" cy="8" r="3"/>
                  <path d="M7 12c-3.31 0-6 2.69-6 6v2c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-2c0-3.31-2.69-6-6-6z"/>
                  <circle cx="17" cy="8" r="3"/>
                  <path d="M17 12c-3.31 0-6 2.69-6 6v2c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-2c0-3.31-2.69-6-6-6z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.availableStaff}
            </div>
          </div>

          {/* Tomorrow's Bookings */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Tomorrow's Bookings
              </h3>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#06b6d4',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '16px', height: '16px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.tomorrowBookings}
            </div>
          </div>

          {/* Top Service */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Top Service Today
              </h3>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#ec4899',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '16px', height: '16px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.topService}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Upcoming Appointments */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: '0' 
              }}>
                Upcoming Appointments {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}
              </h3>
              <button
                onClick={() => handleQuickAction('todays-schedule')}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                View All
              </button>
            </div>
            
            {upcomingAppointments.length > 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {upcomingAppointments.map((apt, index) => (
                  <div key={apt.id || index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        minWidth: '50px',
                        height: '40px',
                        background: '#3b82f6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '0 8px',
                        textAlign: 'center',
                        lineHeight: '1'
                      }}>
                        {formatTime(apt.start)}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          {apt.clientName || apt.extendedProps?.clientName || apt.title || 'Walk-in Client'}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {apt.serviceName || apt.extendedProps?.serviceName || 'Nail Service'} • {apt.staffName || apt.extendedProps?.staffName || 'Any Staff'}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No upcoming appointments
                </div>
                <div style={{ fontSize: '14px' }}>
                  {new Date().getHours() < 18 ? 'All clear for today!' : 'All appointments completed for today!'}
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '20px',
              flexShrink: 0
            }}>
              Recent Activity
            </h3>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              overflowY: 'auto',
              overflowX: 'hidden',
              flex: 1,
              paddingRight: '8px'
            }}>
              {activityFeed.map((activity) => (
                <div key={activity.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  flexShrink: 0,
                  cursor: activity.type === 'appointment_deleted' && activity.appointmentData ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  ...(activity.type === 'appointment_deleted' && activity.appointmentData && {
                    ':hover': {
                      background: '#f3f4f6',
                      borderColor: '#d1d5db'
                    }
                  })
                }}
                onClick={() => handleActivityClick(activity)}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: activity.color,
                    borderRadius: '50%',
                    marginTop: '6px',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {activity.message}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {activity.time}
                    </div>
                  </div>
                  {activity.type === 'appointment_deleted' && activity.appointmentData && (
                    <button
                      style={{
                        padding: '4px 8px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        ...(selectedActivityId === activity.id && { opacity: 1 })
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRecoverConfirm()
                      }}
                    >
                      Recover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>

      {/* Recovery Confirmation Modal */}
      {showRecoverConfirm && (
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
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '16px'
            }}>
              Recover Appointment
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to recover this cancelled appointment? It will be restored to the calendar.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleRecoverCancel}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecoverConfirm}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Recover
              </button>
            </div>
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