'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  appointmentId: string
}

export default function AppointmentActions({ appointmentId }: Props) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Redirect to calendar after successful deletion
        router.push('/calendar')
      } else {
        alert('Failed to delete appointment. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting appointment:', error)
      alert('Failed to delete appointment. Please try again.')
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/appointments/${appointmentId}/edit`}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Edit Appointment
      </Link>
      
      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Delete Appointment
      </button>
      
      <Link
        href="/calendar"
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Back to Calendar
      </Link>
    </div>
  )
}