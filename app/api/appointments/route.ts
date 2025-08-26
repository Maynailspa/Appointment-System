import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { SMSAutomationService } from '@/lib/sms-automation'
import { RealtimeBroadcast } from '@/lib/realtime-broadcast'

const prisma = new PrismaClient()

// Declare global appointments type
declare global {
  var appointments: any[] | undefined
}

// GET /api/appointments - Get all appointments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '1000') // Default limit to prevent loading too many records
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause: any = {}
    
    // Filter by client ID if provided
    if (clientId) {
      whereClause.clientId = clientId
    }
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }
    
    // If date range is provided, filter by date
    if (startDate) {
      whereClause.start = {
        gte: new Date(startDate)
      }
    }
    
    if (endDate) {
      whereClause.start = {
        ...whereClause.start,
        lte: new Date(endDate)
      }
    }

    // If no date range provided, default to current month to prevent loading all appointments
    if (!startDate && !endDate) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      whereClause.start = {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        staff: {
          select: { id: true, name: true } // Only select needed fields
        },
        services: {
          select: { id: true, serviceName: true } // Only select needed fields
        },
        client: {
          select: { id: true, firstName: true, lastName: true } // Only select needed fields
        }
      },
      orderBy: {
        start: 'asc'
      },
      take: limit,
      skip: offset
    })

    // Check for past appointments that should be marked as completed
    const now = new Date()
    const appointmentsToUpdate: any[] = []
    
    appointments.forEach(apt => {
      if (apt.status === 'scheduled' && apt.end < now) {
        appointmentsToUpdate.push(apt.id)
      }
    })

    // Update past appointments to completed status
    if (appointmentsToUpdate.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          id: { in: appointmentsToUpdate }
        },
        data: {
          status: 'completed'
        }
      })
    }

    // If we updated appointments, just update the status in memory instead of refetching
    let finalAppointments = appointments
    if (appointmentsToUpdate.length > 0) {
      finalAppointments = appointments.map(apt => {
        if (appointmentsToUpdate.includes(apt.id)) {
          return { ...apt, status: 'completed' }
        }
        return apt
      })
    }

    // Format events for calendar
    const events = finalAppointments.map(apt => ({
      id: apt.id,
      title: apt.title,
      start: apt.start.toISOString(),
      end: apt.end.toISOString(),
      status: apt.status,
      appointmentType: apt.appointmentType,
      notes: apt.notes,
      blockReason: apt.blockReason,
      staffName: apt.staff?.name || 'Unknown Staff',
      serviceName: apt.services?.[0]?.serviceName || 'Unknown Service',
      clientName: apt.client ? `${apt.client.firstName} ${apt.client.lastName || ''}`.trim() : 'Unknown Client',
      staffId: apt.staffId || undefined,
      serviceId: apt.services?.[0]?.id || undefined,
      clientId: apt.clientId || undefined,
      isWalkIn: !apt.staffId || (typeof apt.staffId === 'string' && apt.staffId.trim() === ''), // Walk-in if no staff assigned
      services: apt.services?.map(s => s.serviceName) || [], // Include all service names
      extendedProps: {
        services: apt.services?.map(s => s.serviceName) || [], // Store service names for frontend
        staffId: apt.staffId || undefined,
        clientId: apt.clientId || undefined,
        notes: apt.notes || undefined,
        isWalkIn: !apt.staffId || (typeof apt.staffId === 'string' && apt.staffId.trim() === ''), // Walk-in if no staff assigned
        appointmentType: apt.appointmentType || 'single'
      },
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString()
    }))

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/appointments - Received:', body)
    
    const {
      title,
      start,
      end,
      appointmentType,
      notes,
      blockReason,
      selectedServices,
      selectedStaff,
      selectedClient,
      isWalkIn,
      staffName
    } = body
    
    console.log('POST /api/appointments - Staff data:', {
      selectedStaff,
      staffName,
      isWalkIn
    })
    
    console.log('POST /api/appointments - Services data:', {
      selectedServices,
      selectedServicesType: typeof selectedServices,
      selectedServicesLength: selectedServices?.length,
      selectedServicesIsArray: Array.isArray(selectedServices)
    })

    // Fetch all services to get their details
    const allServices = await prisma.service.findMany()

    // Ensure selectedServices is an array and has content
    const servicesToCreate = Array.isArray(selectedServices) ? selectedServices : []
    console.log('POST /api/appointments - Services to create:', servicesToCreate)

    // Create appointment in database
    const appointment = await prisma.appointment.create({
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
        status: 'scheduled',
        appointmentType,
        notes,
        blockReason,
        staffId: (selectedStaff && selectedStaff.trim() !== '') ? selectedStaff : null,
        clientId: selectedClient || null,
        services: servicesToCreate.length > 0 ? {
          create: servicesToCreate.map((serviceIdOrName: string) => {
            // First try to find the service by ID
            let service = allServices.find(s => s.id === serviceIdOrName)
            
            // If not found by ID, try to find by name
            if (!service) {
              service = allServices.find(s => s.name === serviceIdOrName)
            }
            
            console.log('Service lookup:', { serviceIdOrName, foundService: service?.name, allServicesIds: allServices.map(s => s.id) })
            return {
              serviceName: service ? service.name : serviceIdOrName,
              servicePrice: service ? service.price : 0,
              serviceDuration: service ? service.duration : 60
            }
          })
        } : undefined
      },
      include: {
        staff: true,
        client: true,
        services: true
      }
    })

    // Trigger SMS automation if client exists
    if (appointment.client) {
      try {
        await SMSAutomationService.processAppointmentCreated({
          id: appointment.id,
          title: appointment.title,
          start: appointment.start,
          end: appointment.end,
          clientId: appointment.clientId || undefined,
          client: {
            firstName: appointment.client.firstName,
            lastName: appointment.client.lastName || undefined,
            phone: appointment.client.phone
          },
          services: appointment.services
        })
      } catch (smsError) {
        console.error('Error triggering SMS automation:', smsError)
        // Don't fail the appointment creation if SMS fails
      }
    }
    
    console.log('POST /api/appointments - Created appointment:', appointment.id)
    
    // Format the appointment response with proper display names
    const formattedAppointment = {
      ...appointment,
      clientName: appointment.client ? `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim() : 'Walk-in Client',
      serviceName: appointment.services?.[0]?.serviceName || 'Service',
      staffName: appointment.staff?.name || 'Any Staff'
    }
    
    // Broadcast real-time update
    await RealtimeBroadcast.notifyAppointmentCreated(appointment)
    
    return NextResponse.json(formattedAppointment)
    
  } catch (error) {
    console.error('Error in POST /api/appointments:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}