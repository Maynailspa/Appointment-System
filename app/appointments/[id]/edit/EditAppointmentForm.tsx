'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

// Types for our data
type Staff = { id: string; name: string }
type Service = { id: string; name: string }
type Client = { id: string; name: string }
type Appointment = {
  id: string
  start: Date
  end: Date
  status: string
  staffId: string
  serviceId: string
  clientId: string
  staff?: Staff | null
  service?: Service | null
  client?: Client | null
}

interface Props {
  appointment: Appointment
  staff: Staff[]
  services: Service[]
  clients: Client[]
}

export default function EditAppointmentForm({ appointment, staff, services, clients }: Props) {
  const router = useRouter()

  // Initialize form state with existing appointment data
  const [start, setStart] = useState(appointment.start.toISOString())
  const [end, setEnd] = useState(appointment.end.toISOString())
  const [status, setStatus] = useState(appointment.status)
  const [staffId, setStaffId] = useState(appointment.staffId)
  const [serviceId, setServiceId] = useState(appointment.serviceId)
  const [clientId, setClientId] = useState(appointment.clientId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    console.log('🔄 Updating appointment with data:', {
      start, end, status, staffId, serviceId, clientId
    })

    try {
      // Validate all fields are filled
      if (!start || !end || !status || !staffId || !serviceId || !clientId) {
        throw new Error('All fields are required')
      }

      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          start, 
          end, 
          status, 
          staffId, 
          serviceId, 
          clientId 
        }),
      })

      console.log('📡 Response status:', response.status)
      
      const responseData = await response.json()
      console.log('📡 Response data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || `HTTP ${response.status}`)
      }

      console.log('✅ Appointment updated successfully:', responseData)
      
      // Redirect back to the appointment detail page
      router.push(`/appointments/${appointment.id}`)

    } catch (error) {
      console.error('❌ Form submission error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link 
          href={`/appointments/${appointment.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
        >
          ← Back to Appointment
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Appointment
        </h1>
        <p className="text-gray-600 mt-2">
          Modify the details of this appointment
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Date & Time Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Date & Time
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={start.slice(0, 16)}
                  onChange={(e) => setStart(new Date(e.currentTarget.value).toISOString())}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={end.slice(0, 16)}
                  onChange={(e) => setEnd(new Date(e.currentTarget.value).toISOString())}
                  required
                />
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Status
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={status}
                onChange={(e) => setStatus(e.currentTarget.value)}
                required
              >
                <option value="booked">Booked</option>
                <option value="cancelled">Cancelled</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
          </div>

          {/* People Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              People & Service
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={staffId}
                  onChange={(e) => setStaffId(e.currentTarget.value)}
                  required
                >
                  <option value="">Select Staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.currentTarget.value)}
                  required
                >
                  <option value="">Select Service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={clientId}
                  onChange={(e) => setClientId(e.currentTarget.value)}
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              <Link
                href="/calendar"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Calendar
              </Link>
            </div>
          </div>
        </form>
      </div>

      {/* Appointment ID (for debugging/support) */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Editing Appointment ID: {appointment.id}
        </p>
      </div>
    </div>
  )
}