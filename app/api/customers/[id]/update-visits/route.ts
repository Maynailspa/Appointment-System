import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/customers/[id]/update-visits - Update visit statistics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params
    const body = await request.json()
    const { action, appointmentDate } = body // action: 'increment' | 'decrement'

    console.log(`Updating visits for customer ${customerId}:`, { action, appointmentDate })

    // Get current customer data
    const customer = await prisma.client.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    let newTotalVisits = customer.totalVisits
    let newLastVisit = customer.lastVisit

    if (action === 'increment') {
      // Only increment if the appointment has actually passed
      const appointmentEnd = new Date(appointmentDate)
      const now = new Date()
      
      if (appointmentEnd < now) {
        newTotalVisits += 1
        newLastVisit = appointmentEnd
      }
    } else if (action === 'decrement') {
      newTotalVisits = Math.max(0, newTotalVisits - 1)
      // If we're decrementing, we need to find the most recent completed appointment
      if (newTotalVisits === 0) {
        newLastVisit = null
      } else {
        const lastAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: customerId,
            end: { lt: new Date() }, // Past appointments only
            status: 'scheduled' // Consider scheduled past appointments as completed
          },
          orderBy: { end: 'desc' }
        })
        newLastVisit = lastAppointment ? lastAppointment.end : null
      }
    }

    // Update customer
    const updatedCustomer = await prisma.client.update({
      where: { id: customerId },
      data: {
        totalVisits: newTotalVisits,
        lastVisit: newLastVisit
      }
    })

    console.log(`Updated customer ${customerId}:`, {
      totalVisits: updatedCustomer.totalVisits,
      lastVisit: updatedCustomer.lastVisit
    })

    return NextResponse.json({
      success: true,
      totalVisits: updatedCustomer.totalVisits,
      lastVisit: updatedCustomer.lastVisit
    })

  } catch (error) {
    console.error('Error updating customer visits:', error)
    return NextResponse.json(
      { error: 'Failed to update customer visits' },
      { status: 500 }
    )
  }
} 