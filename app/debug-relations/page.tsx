// app/debug-relations/page.tsx
import { prisma } from '../../lib/prisma'

export default async function DebugRelationsPage() {
  try {
    // Check what staff, service, and client records exist
    const staff = await prisma.staff.findMany()
    const services = await prisma.service.findMany()
    const clients = await prisma.client.findMany()
    const appointments = await prisma.appointment.findMany()

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Relations Debug</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Staff ({staff.length})</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(staff, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Services ({services.length})</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(services, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Clients ({clients.length})</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(clients, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Appointments ({appointments.length})</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(appointments, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Relations Debug</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong>
          <pre className="text-sm mt-2">{String(error)}</pre>
        </div>
      </div>
    )
  }
}