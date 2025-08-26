'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

// Types for our data
type Staff = { id: string; name: string }
type Service = { id: string; name: string }
type Client = { id: string; name: string }

type AppointmentType = 'single' | 'group' | 'blocked'

type GroupAppointment = {
  staffId: string
  serviceId: string
  clientId: string
}

function NewAppointmentForm() {
  const search = useSearchParams()
  const router = useRouter()

  // Get appointment type from URL
  const appointmentType: AppointmentType = (search.get('type') as AppointmentType) || 'single'

  // Form state
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [status, setStatus] = useState('booked')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  // Single appointment state
  const [staffId, setStaffId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [clientId, setClientId] = useState('')

  // Group appointment state
  const [groupAppointments, setGroupAppointments] = useState<GroupAppointment[]>([
    { staffId: '', serviceId: '', clientId: '' }
  ])

  // Block time state
  const [blockReason, setBlockReason] = useState('')
  const [blockDescription, setBlockDescription] = useState('')
  const [affectedStaffIds, setAffectedStaffIds] = useState<string[]>([])

  // Data from database
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Initialize form data and fetch options
  useEffect(() => {
    const loadData = async () => {
      try {
        // Set form dates
        const startQuery = search.get('start')
        const endQuery = search.get('end')
        const defaultStart = startQuery || new Date().toISOString()
        const defaultEnd = endQuery || defaultStart
        
        setStart(defaultStart)
        setEnd(defaultEnd)

        // Fetch staff, services, clients from your debug endpoint
        const response = await fetch('/debug-relations')
        if (response.ok) {
          const html = await response.text()
          
          // For now, let's use the known IDs from your screenshot
          // In a real app, you'd have proper API endpoints for these
          setStaff([
            { id: 'a127c7a6-3b31-41a9-963b-10964e7221d6', name: 'Alice Smith' },
            { id: '3ac44ad8-e205-4a04-b526-b23f4ed41fc7', name: 'Bob Lee' }
          ])
          
          setServices([
            { id: 'c7123061-26c5-4492-8a49-010c889467d7', name: 'Haircut' },
            { id: 'cdf4a1e5-0b94-403c-83fe-7a91375c2131', name: 'Massage' }
          ])
          
          setClients([
            { id: '1e0faa4c-b6b5-4b80-989f-b3ed591a0fe2', name: 'John Doe' },
            { id: '9fad8df9-c479-4bab-8e42-92ce0762f83b', name: 'Jane Roe' }
          ])
        }
        
        setIsLoaded(true)
      } catch (error) {
        console.error('Failed to load form data:', error)
        setError('Failed to load form options')
        setIsLoaded(true)
      }
    }
    
    loadData()
  }, [search])

  // Group appointment functions
  const addGroupAppointment = () => {
    setGroupAppointments([...groupAppointments, { staffId: '', serviceId: '', clientId: '' }])
  }

  const removeGroupAppointment = (index: number) => {
    if (groupAppointments.length > 1) {
      setGroupAppointments(groupAppointments.filter((_, i) => i !== index))
    }
  }

  const updateGroupAppointment = (index: number, field: keyof GroupAppointment, value: string) => {
    const updated = [...groupAppointments]
    updated[index][field] = value
    setGroupAppointments(updated)
  }

  // Staff selection for blocked time
  const toggleStaffForBlock = (staffId: string) => {
    if (affectedStaffIds.includes(staffId)) {
      setAffectedStaffIds(affectedStaffIds.filter(id => id !== staffId))
    } else {
      setAffectedStaffIds([...affectedStaffIds, staffId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    console.log('🚀 Form submitted with type:', appointmentType)

    try {
      let requestData: any = {
        start,
        end,
        status,
        type: appointmentType
      }

      if (appointmentType === 'single') {
        // Single appointment validation
        if (!start || !end || !status || !staffId || !serviceId || !clientId) {
          throw new Error('All fields are required for single appointment')
        }
        
        requestData = {
          start, 
          end, 
          status, 
          staffId, 
          serviceId, 
          clientId
        }

        console.log('📝 Single appointment data:', requestData)

      } else if (appointmentType === 'group') {
        // Group appointment validation
        const validAppointments = groupAppointments.filter(
          apt => apt.staffId && apt.serviceId && apt.clientId
        )
        
        if (validAppointments.length === 0) {
          throw new Error('At least one complete appointment is required for group booking')
        }
        
        requestData = {
          ...requestData,
          groupAppointments: validAppointments
        }

        console.log('👥 Group appointment data:', requestData)

      } else if (appointmentType === 'blocked') {
        // Block time validation
        if (!blockReason || affectedStaffIds.length === 0) {
          throw new Error('Block reason and at least one staff member are required')
        }
        
        requestData = {
          ...requestData,
          blockReason,
          blockDescription,
          affectedStaffIds,
          status: 'blocked'
        }

        console.log('🚫 Block time data:', requestData)
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      console.log('📡 Response status:', response.status)
      
      const responseData = await response.json()
      console.log('📡 Response data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || `HTTP ${response.status}`)
      }

      console.log('✅ Success! Created:', appointmentType, 'appointment(s)')
      
      // Redirect to calendar
      router.push('/calendar')

    } catch (error) {
      console.error('❌ Form submission error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFormTitle = () => {
    switch (appointmentType) {
      case 'single': return 'New Appointment'
      case 'group': return 'New Group Appointment'
      case 'blocked': return 'Block Time'
      default: return 'New Appointment'
    }
  }

  const getFormIcon = () => {
    switch (appointmentType) {
      case 'single': return '📅'
      case 'group': return '👥' 
      case 'blocked': return '🚫'
      default: return '📅'
    }
  }

  if (!isLoaded) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Loading...</h1>
        <p>Loading form data...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">{getFormIcon()}</span>
            {getFormTitle()}
          </h1>
          <p className="text-gray-600 mt-2">
            {appointmentType === 'single' && 'Schedule a new appointment for one client'}
            {appointmentType === 'group' && 'Schedule multiple appointments at the same time'}
            {appointmentType === 'blocked' && 'Block time when appointments cannot be scheduled'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Selection - Always shown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={start.slice(0, 16)}
                onChange={(e) => setStart(new Date(e.currentTarget.value).toISOString())}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={end.slice(0, 16)}
                onChange={(e) => setEnd(new Date(e.currentTarget.value).toISOString())}
                required
              />
            </div>
          </div>

          {/* Single Appointment Form */}
          {appointmentType === 'single' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Appointment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                  >
                    <option value="">Select Staff</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Service</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                  >
                    <option value="">Select Service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="booked">Booked</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="tbd">TBD</option>
                </select>
              </div>
            </div>
          )}

          {/* Group Appointment Form */}
          {appointmentType === 'group' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Group Appointments</h3>
                <button
                  type="button"
                  onClick={addGroupAppointment}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>+</span> Add Another
                </button>
              </div>

              {groupAppointments.map((appointment, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-800">Appointment #{index + 1}</h4>
                    {groupAppointments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroupAppointment(index)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={appointment.staffId}
                        onChange={(e) => updateGroupAppointment(index, 'staffId', e.target.value)}
                        required
                      >
                        <option value="">Select Staff</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={appointment.serviceId}
                        onChange={(e) => updateGroupAppointment(index, 'serviceId', e.target.value)}
                        required
                      >
                        <option value="">Select Service</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={appointment.clientId}
                        onChange={(e) => updateGroupAppointment(index, 'clientId', e.target.value)}
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Block Time Form */}
          {appointmentType === 'blocked' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Block Time Details</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Blocking *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="lunch">Lunch Break</option>
                  <option value="meeting">Staff Meeting</option>
                  <option value="training">Training Session</option>
                  <option value="maintenance">Equipment Maintenance</option>
                  <option value="holiday">Holiday/Vacation</option>
                  <option value="personal">Personal Time</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                  rows={3}
                  placeholder="Additional details about this blocked time..."
                  value={blockDescription}
                  onChange={(e) => setBlockDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Affected Staff Members *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staff.map((s) => (
                    <label key={s.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        checked={affectedStaffIds.includes(s.id)}
                        onChange={() => toggleStaffForBlock(s.id)}
                      />
                      <span className="text-gray-700">{s.name}</span>
                    </label>
                  ))}
                </div>
                {affectedStaffIds.length === 0 && (
                  <p className="text-red-600 text-sm mt-2">Please select at least one staff member</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                appointmentType === 'single' ? 'bg-blue-600 hover:bg-blue-700' :
                appointmentType === 'group' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-gray-600 hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Saving...' : 
               appointmentType === 'single' ? 'Create Appointment' :
               appointmentType === 'group' ? 'Create Group Appointments' :
               'Block Time'
              }
            </button>
            
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => router.back()}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <h1 className="text-3xl font-bold">Loading...</h1>
        <p>Loading form data...</p>
      </div>
    }>
      <NewAppointmentForm />
    </Suspense>
  )
}