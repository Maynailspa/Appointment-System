'use client'

import { useState, useEffect } from 'react'

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

interface StaffMember {
  id: string
  name: string
  isActive: boolean
  role: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

export default function ReportsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false) // Start with false to avoid loading issues
  const [dateRange, setDateRange] = useState('week') // week, month, quarter, year
  const [selectedStaff, setSelectedStaff] = useState('all')
  const [selectedService, setSelectedService] = useState('all')

    // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        // Fetch appointments from localStorage (keeping existing logic)
        const storedAppointments = localStorage.getItem('appointments')
        if (storedAppointments) {
          const parsedAppointments = JSON.parse(storedAppointments)
          setAppointments(parsedAppointments)
        } else {
          setAppointments([])
        }
        
        // Fetch real staff data from API
        const staffResponse = await fetch('/api/staff')
        if (staffResponse.ok) {
          const staffData = await staffResponse.json()
          setStaff(staffData)
        } else {
          console.error('Failed to fetch staff data')
          setStaff([])
        }
        
        // Fetch real services data from API
        const servicesResponse = await fetch('/api/services')
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json()
          setServices(servicesData)
        } else {
          console.error('Failed to fetch services data')
          setServices([])
        }
        
      } catch (error) {
        console.error('Error fetching data:', error)
        setAppointments([])
        setStaff([])
        setServices([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    const startDate = new Date()
    
    switch (dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }
    
    return { startDate, endDate: now }
  }

  // Filter appointments based on date range and filters
  const getFilteredAppointments = () => {
    const { startDate, endDate } = getDateRange()
    
    return appointments.filter(apt => {
      try {
        const aptDate = new Date(apt.start)
        const isInDateRange = aptDate >= startDate && aptDate <= endDate
        
        const clientName = apt.clientName || apt.extendedProps?.clientName || ''
        const staffName = apt.staffName || apt.extendedProps?.staffName || ''
        const serviceName = apt.serviceName || apt.extendedProps?.serviceName || ''
        
        const matchesStaff = selectedStaff === 'all' || staffName === selectedStaff
        const matchesService = selectedService === 'all' || serviceName === selectedService
        
        return isInDateRange && matchesStaff && matchesService
      } catch (error) {
        return false
      }
    })
  }

  // Calculate statistics
  const calculateStats = () => {
    const filteredAppointments = getFilteredAppointments()
    
    // Enhanced revenue calculation with service-specific pricing
    const totalRevenue = filteredAppointments.reduce((total, apt) => {
      const serviceName = apt.serviceName || apt.extendedProps?.serviceName || 'Unknown'
      const service = services.find(s => s.name === serviceName)
      return total + (service?.price || 50) // Default to $50 if service not found
    }, 0)
    
    // Service breakdown
    const serviceBreakdown = filteredAppointments.reduce((acc, apt) => {
      const serviceName = apt.serviceName || apt.extendedProps?.serviceName || 'Unknown'
      acc[serviceName] = (acc[serviceName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Staff performance
    const staffPerformance = filteredAppointments.reduce((acc, apt) => {
      const staffName = apt.staffName || apt.extendedProps?.staffName || 'Any Staff'
      acc[staffName] = (acc[staffName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Daily breakdown - show all days in range, even with 0 appointments
    const { startDate, endDate } = getDateRange()
    const dailyBreakdown: Record<string, number> = {}
    
    // Initialize all days in the range with 0 appointments
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateString = currentDate.toDateString()
      dailyBreakdown[dateString] = 0
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Add actual appointment counts
    filteredAppointments.forEach(apt => {
      try {
        const date = new Date(apt.start).toDateString()
        if (dailyBreakdown.hasOwnProperty(date)) {
          dailyBreakdown[date] = (dailyBreakdown[date] || 0) + 1
        }
      } catch (error) {
        // Skip invalid dates
      }
    })
    
    // Walk-ins vs appointments
    const walkIns = filteredAppointments.filter(apt => {
      const clientName = apt.clientName || apt.extendedProps?.clientName || apt.title || ''
      return clientName.includes('Walk-in') || clientName === 'Walk-in Client' || clientName === 'Walk-in'
    }).length
    
    const scheduledAppointments = filteredAppointments.length - walkIns
    
    // Calculate average per day (handle edge cases)
    const daysWithAppointments = Object.keys(dailyBreakdown).length
    const averagePerDay = daysWithAppointments > 0 ? filteredAppointments.length / daysWithAppointments : 0
    
    // Calculate average appointment duration
    const totalDuration = filteredAppointments.reduce((total, apt) => {
      const serviceName = apt.serviceName || apt.extendedProps?.serviceName || 'Unknown'
      const service = services.find(s => s.name === serviceName)
      return total + (service?.duration || 45) // Default to 45 minutes if service not found
    }, 0)
    const averageDuration = filteredAppointments.length > 0 ? Math.round(totalDuration / filteredAppointments.length) : 45
    
    // Calculate repeat clients (clients with multiple appointments in this period)
    const clientAppointments = filteredAppointments.reduce((acc, apt) => {
      const clientName = apt.clientName || apt.extendedProps?.clientName || apt.title || 'Unknown'
      if (clientName && !clientName.includes('Walk-in')) {
        acc[clientName] = (acc[clientName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    const repeatClients = Object.values(clientAppointments).filter(count => count > 1).length
    
    // Calculate busiest day
    const dailyCounts = Object.entries(dailyBreakdown)
    const busiestDayEntry = dailyCounts.reduce((max, current) => 
      current[1] > max[1] ? current : max, ['', 0])
    const busiestDay = busiestDayEntry[1] > 0 ? 
      new Date(busiestDayEntry[0]).toLocaleDateString('en-US', { weekday: 'short' }) : 'N/A'
    const busiestDayCount = busiestDayEntry[1]
    
    // Calculate completion rate (appointments that weren't cancelled)
    const completedAppointments = filteredAppointments.filter(apt => {
      const status = apt.status || apt.extendedProps?.status || 'confirmed'
      return status !== 'cancelled' && status !== 'no-show'
    }).length
    const completionRate = filteredAppointments.length > 0 ? 
      Math.round((completedAppointments / filteredAppointments.length) * 100) : 100
    
    // Calculate average revenue per appointment
    const averageRevenue = filteredAppointments.length > 0 ? 
      Math.round(totalRevenue / filteredAppointments.length) : 0
    
    // Calculate new clients (clients with only one appointment in this period)
    const newClients = Object.values(clientAppointments).filter(count => count === 1).length
    
    // Calculate cancellations
    const cancellations = filteredAppointments.filter(apt => {
      const status = apt.status || apt.extendedProps?.status || 'confirmed'
      return status === 'cancelled'
    }).length
    
    return {
      totalAppointments: filteredAppointments.length,
      totalRevenue,
      averagePerDay,
      serviceBreakdown,
      staffPerformance,
      dailyBreakdown,
      walkIns,
      scheduledAppointments,
      averageDuration,
      repeatClients,
      busiestDay,
      busiestDayCount,
      completionRate,
      averageRevenue,
      newClients,
      cancellations
    }
  }

  const stats = calculateStats()

  // Show empty state if no data
  if (!loading && appointments.length === 0) {
    return (
      <div style={{ 
        padding: '24px', 
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937', 
              marginBottom: '8px' 
            }}>
              Reports & Analytics
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              margin: '0' 
            }}>
              Business insights and performance metrics
            </p>
          </div>
          
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '48px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg style={{ width: '32px', height: '32px', fill: '#9ca3af' }} viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '12px' 
            }}>
              No Data Available
            </h3>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              marginBottom: '24px' 
            }}>
              Create some appointments to see your business analytics and reports.
            </p>
            <button
              onClick={() => window.location.href = '/calendar'}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Go to Calendar
            </button>
          </div>
        </div>
      </div>
    )
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
          Loading reports...
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      background: '#f8fafc',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '120px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1f2937', 
            marginBottom: '8px' 
          }}>
            Reports & Analytics
          </h1>
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'end'
          }}>
            {/* Date Range */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Staff Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Staff Member
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="all">All Staff</option>
                {staff.map(member => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Service Type
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="all">All Services</option>
                {services.map(service => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '32px' 
        }}>
          {/* Total Appointments */}
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
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Total Appointments
              </h3>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              {stats.totalAppointments}
            </div>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: '0' 
            }}>
              {stats.averagePerDay.toFixed(1)} per day average
            </p>
          </div>

          {/* New Clients */}
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
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                New Clients
              </h3>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#8b5cf6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              {stats.newClients || 0}
            </div>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: '0' 
            }}>
              This period
            </p>
          </div>

          {/* Scheduled */}
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
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#6b7280', 
                margin: '0' 
              }}>
                Scheduled
              </h3>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#059669',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', fill: 'white' }} viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
              </div>
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              {stats.scheduledAppointments || 0}
            </div>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: '0' 
            }}>
              This period
            </p>
          </div>
        </div>

        {/* Detailed Reports */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Service Performance */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '20px' 
            }}>
              Service Performance
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats.serviceBreakdown).length > 0 ? (
                Object.entries(stats.serviceBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([service, count]) => (
                    <div key={service} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {service}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#3b82f6'
                      }}>
                        {count} appointments
                      </span>
                    </div>
                  ))
              ) : (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  No service data available for the selected period
                </div>
              )}
            </div>
          </div>

          {/* Staff Performance */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '20px' 
            }}>
              Staff Performance
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats.staffPerformance).length > 0 ? (
                Object.entries(stats.staffPerformance)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([staff, count]) => (
                    <div key={staff} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {staff}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#10b981'
                      }}>
                        {count} appointments
                      </span>
                    </div>
                  ))
              ) : (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  No staff data available for the selected period
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '12px',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            {Object.entries(stats.dailyBreakdown).length > 0 ? (
              Object.entries(stats.dailyBreakdown)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, count]) => (
                  <div key={date} style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    textAlign: 'center',
                    minWidth: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      marginBottom: '2px'
                    }}>
                      {count}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      appointments
                    </div>
                  </div>
                ))
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                gridColumn: '1 / -1'
              }}>
                No daily data available for the selected period
              </div>
            )}
          </div>
        </div>
      </div>

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