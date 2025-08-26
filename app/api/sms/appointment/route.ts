import { NextRequest, NextResponse } from 'next/server'
import { appointmentCreated, oneHourBefore, twentyFourHoursBefore } from '@/app/lib/sms/automations'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, appointmentId } = body

    if (!type || !appointmentId) {
      return NextResponse.json(
        { error: 'Message type and appointment ID are required' },
        { status: 400 }
      )
    }

    // Get the appointment data
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: true,
        staff: true
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    let result

    switch (type) {
      case 'confirmation':
        result = await appointmentCreated(appointmentId)
        break
      
      case 'reminder_1h':
        result = await oneHourBefore(appointmentId)
        break
      
      case 'reminder_24h':
        result = await twentyFourHoursBefore(appointmentId)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid message type. Use "confirmation", "reminder_1h", or "reminder_24h"' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'SMS sent successfully',
        messageId: result.messageId 
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Appointment SMS API error:', error)
    return NextResponse.json(
      { error: 'Failed to send appointment SMS', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 