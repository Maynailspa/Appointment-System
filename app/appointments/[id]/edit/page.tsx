// app/appointments/[id]/edit/page.tsx
import { prisma } from '../../../../lib/prisma'
import { notFound } from 'next/navigation'
import EditAppointmentForm from './EditAppointmentForm'

interface Props {
  params: { id: string }
}

export default async function EditAppointmentPage({ params }: Props) {
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

    // Fetch all available staff, services, and clients for the dropdowns
    const [staff, services, clients] = await Promise.all([
      prisma.staff.findMany({ orderBy: { name: 'asc' } }),
      prisma.service.findMany({ orderBy: { name: 'asc' } }),
      prisma.client.findMany({ orderBy: { name: 'asc' } }),
    ])

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <EditAppointmentForm
            appointment={appointment}
            staff={staff}
            services={services}
            clients={clients}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading appointment for edit:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="text-lg font-semibold mb-2">Error Loading Appointment</h2>
            <p>There was an error loading this appointment for editing. Please try again or return to the calendar.</p>
            <a 
              href="/calendar"
              className="mt-3 inline-block text-red-800 hover:text-red-900 font-medium"
            >
              ← Back to Calendar
            </a>
          </div>
        </div>
      </div>
    )
  }
}