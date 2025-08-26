import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { RealtimeBroadcast } from '@/lib/realtime-broadcast'

const prisma = new PrismaClient()

// Declare global appointments type
declare global {
  var appointments: any[] | undefined
}

// PUT /api/appointments/[id] - Update an appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('PUT /api/appointments/[id] - Updating:', id)
    
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
    
    console.log('PUT /api/appointments/[id] - Services data:', {
      selectedServices,
      selectedServicesType: typeof selectedServices,
      selectedServicesLength: selectedServices?.length,
      selectedServicesIsArray: Array.isArray(selectedServices)
    })

    // Validate selectedServices is an array
    if (!Array.isArray(selectedServices)) {
      console.error('selectedServices is not an array:', selectedServices)
      return NextResponse.json(
        { error: 'selectedServices must be an array' },
        { status: 400 }
      )
    }
    
    // Filter out any null, undefined, or empty string values
    const filteredServices = selectedServices.filter(service => 
      service !== null && service !== undefined && service !== ''
    )
    
    if (filteredServices.length !== selectedServices.length) {
      console.warn('Filtered out invalid services:', {
        original: selectedServices,
        filtered: filteredServices
      })
    }
    
    // Validate required fields
    if (!title || !start || !end) {
      return NextResponse.json(
        { error: 'Title, start time, and end time are required' },
        { status: 400 }
      )
    }
    
    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        staff: true,
        services: true,
        client: true
      }
    })
    
    if (!existingAppointment) {
      console.log('PUT /api/appointments/[id] - Appointment not found!')
      return NextResponse.json({ 
        error: 'Appointment not found',
        requestedId: id
      }, { status: 404 })
    }
    
    // Fetch all services to get their details
    const allServices = await prisma.service.findMany()

    // Update appointment in database
    let updatedAppointment;
    
    try {
      if (filteredServices && filteredServices.length > 0) {
        // Deduplicate services to prevent unique constraint violations
        const uniqueServices = [...new Set(filteredServices)]
        console.log('PUT /api/appointments/[id] - Services processing:', {
          originalServices: selectedServices,
          uniqueServices: uniqueServices,
          originalCount: selectedServices.length,
          uniqueCount: uniqueServices.length,
          hasDuplicates: selectedServices.length !== uniqueServices.length
        })
        
        // First, delete existing services
        await prisma.appointmentService.deleteMany({
          where: { appointmentId: id }
        })
        
        // Then update the appointment and create new services
        updatedAppointment = await prisma.appointment.update({
          where: { id },
          data: {
            title,
            start: new Date(start),
            end: new Date(end),
            status: 'scheduled',
            appointmentType: appointmentType || 'single',
            notes,
            blockReason,
            staffId: selectedStaff || null,
            clientId: selectedClient || null,
            services: {
              create: uniqueServices.map((serviceIdOrName: string) => {
                // First try to find the service by ID
                let service = allServices.find(s => s.id === serviceIdOrName)
                
                // If not found by ID, try to find by name
                if (!service) {
                  service = allServices.find(s => s.name === serviceIdOrName)
                }
                
                const serviceData = {
                  serviceName: service ? service.name : serviceIdOrName,
                  servicePrice: service ? service.price : 0,
                  serviceDuration: service ? service.duration : 60
                }
                
                console.log('Creating service record:', serviceData)
                return serviceData
              })
            }
          },
          include: {
            staff: true,
            services: true,
            client: true
          }
        })
      } else {
        // No services to update, just update the appointment
        updatedAppointment = await prisma.appointment.update({
          where: { id },
          data: {
            title,
            start: new Date(start),
            end: new Date(end),
            status: 'scheduled',
            appointmentType: appointmentType || 'single',
            notes,
            blockReason,
            staffId: selectedStaff || null,
            clientId: selectedClient || null
          },
          include: {
            staff: true,
            services: true,
            client: true
          }
        })
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      
      // Check if it's a unique constraint error
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        return NextResponse.json(
          { 
            error: 'Duplicate services detected. Please ensure each service is selected only once.',
            details: 'The appointment cannot be updated because it contains duplicate services.'
          }, 
          { status: 400 }
        )
      }
      
      throw error // Re-throw other errors
    }
    
    // Format the response to match the expected structure
    const formattedAppointment = {
      id: updatedAppointment.id,
      title: updatedAppointment.title,
      start: updatedAppointment.start.toISOString(),
      end: updatedAppointment.end.toISOString(),
      status: updatedAppointment.status,
      appointmentType: updatedAppointment.appointmentType,
      notes: updatedAppointment.notes,
      blockReason: updatedAppointment.blockReason,
      staffName: updatedAppointment.staff?.name || 'Unknown Staff',
      serviceName: updatedAppointment.services?.[0]?.serviceName || 'Unknown Service',
      clientName: updatedAppointment.client ? `${updatedAppointment.client.firstName} ${updatedAppointment.client.lastName || ''}`.trim() || 'Unknown Client' : 'Unknown Client',
      staffId: updatedAppointment.staffId || undefined,
      serviceId: updatedAppointment.services?.[0]?.id || undefined,
      clientId: updatedAppointment.clientId || undefined,
      extendedProps: {
        services: updatedAppointment.services?.map(s => s.serviceName) || [],
        staffId: updatedAppointment.staffId || undefined,
        clientId: updatedAppointment.clientId || undefined,
        client: updatedAppointment.client || undefined, // Also include in extendedProps for compatibility
        notes: updatedAppointment.notes || undefined,
        isWalkIn: false,
        appointmentType: updatedAppointment.appointmentType || 'single'
      },
      createdAt: updatedAppointment.createdAt.toISOString(),
      updatedAt: updatedAppointment.updatedAt.toISOString(),
      client: updatedAppointment.client ? {
        id: updatedAppointment.client.id,
        firstName: updatedAppointment.client.firstName,
        lastName: updatedAppointment.client.lastName,
        email: updatedAppointment.client.email,
        phone: updatedAppointment.client.phone
      } : null,
      backgroundColor: appointmentType === 'blocked' ? '#ef4444' : '#3B82F6',
      borderColor: appointmentType === 'blocked' ? '#ef4444' : '#3B82F6',
      textColor: '#ffffff',
      selectedServices,
      selectedStaff: selectedStaff || null,
      appointmentNotes: notes,
      isWalkIn: isWalkIn || false
    }
    
    console.log('PUT /api/appointments/[id] - Updated successfully')
    
    // Broadcast real-time update
    await RealtimeBroadcast.notifyAppointmentUpdated(updatedAppointment, existingAppointment)
    
    return NextResponse.json(formattedAppointment)
    
  } catch (error) {
    console.error('Error in PUT /api/appointments/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('DELETE /api/appointments/[id] - Deleting:', id)
    
    // Initialize global appointments array if it doesn't exist
    if (!global.appointments) {
      global.appointments = []
    }
    
    // First check global appointments array
    const globalAppointmentIndex = global.appointments.findIndex(apt => apt.id === id)
    
    if (globalAppointmentIndex !== -1) {
      // Get the appointment before deleting for real-time broadcast
      const deletedAppointment = global.appointments[globalAppointmentIndex]
      
      // Remove from global appointments array
      global.appointments.splice(globalAppointmentIndex, 1)
      console.log('DELETE /api/appointments/[id] - Deleted from global array successfully')
      
      // Broadcast real-time update
      await RealtimeBroadcast.notifyAppointmentDeleted(id, deletedAppointment)
      
      return NextResponse.json({ success: true })
    }
    
    // If not found in global array, check database
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    })
    
    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    
    // Delete appointment from database (services will be deleted automatically due to cascade)
    await prisma.appointment.delete({
      where: { id }
    })
    
    console.log('DELETE /api/appointments/[id] - Deleted from database successfully')
    
    // Broadcast real-time update
    await RealtimeBroadcast.notifyAppointmentDeleted(id, existingAppointment)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in DELETE /api/appointments/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}