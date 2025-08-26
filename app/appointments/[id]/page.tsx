// app/appointments/[id]/page.tsx
import { prisma } from '../../../lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppointmentActions from './AppointmentActions'

interface Props {
  params: { id: string }
}

export default async function AppointmentDetailPage({ params }: Props) {
  try {
    // Fetch the appointment with all related data
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        staff: true,
        service: true,
        client: true,
      },
    })

    // If appointment doesn't exist, show 404
    if (!appointment) {
      notFound()
    }

    // Format dates for display
    const startDate = new Date(appointment.start)
    const endDate = new Date(appointment.end)
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }

    // Calculate duration
    const durationMs = endDate.getTime() - startDate.getTime()
    const durationMinutes = Math.round(durationMs / (1000 * 60))
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText = hours > 0 
      ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
      : `${minutes}m`

    // Status styling
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'booked':
        case 'scheduled':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'completed':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200'
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-200'
        case 'tbd':
          return 'bg-gray-100 text-gray-800 border-gray-200'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link 
              href="/calendar"
              className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
            >
              ← Back to Calendar
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Appointment Details
            </h1>
          </div>

          {/* Main Card */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Status Badge */}
            <div className="px-6 py-4 border-b border-gray-200">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Date & Time */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(startDate)}</p>
                        <p className="text-gray-600">
                          {formatTime(startDate)} - {formatTime(endDate)}
                        </p>
                        <p className="text-sm text-gray-500">Duration: {durationText}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Service</h2>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.service?.name || 'Unknown Service'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Details */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Staff Member</h2>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.staff?.name || 'Unknown Staff'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Details */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Client</h2>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.client?.name || 'Unknown Client'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <AppointmentActions appointmentId={appointment.id} />
            </div>
          </div>

          {/* Appointment ID (for debugging/support) */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Appointment ID: {appointment.id}
            </p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading appointment:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="text-lg font-semibold mb-2">Error Loading Appointment</h2>
            <p>There was an error loading this appointment. Please try again or return to the calendar.</p>
            <Link 
              href="/calendar"
              className="mt-3 inline-block text-red-800 hover:text-red-900 font-medium"
            >
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </div>
    )
  }
}