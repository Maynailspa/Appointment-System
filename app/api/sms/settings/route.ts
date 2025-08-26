import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get the first (and only) SMS settings record, or create default one
    let settings = await prisma.sMSSettings.findFirst()
    
    if (!settings) {
      // Create default settings
      settings = await prisma.sMSSettings.create({
        data: {
          appointmentConfirmations: true,
          oneHourReminders: true,
          twentyFourHourReminders: true,
          noShowFollowUps: false,
          birthdayMessages: false
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching SMS settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      appointmentConfirmations,
      oneHourReminders,
      twentyFourHourReminders,
      noShowFollowUps,
      birthdayMessages
    } = body

    // Get the first settings record or create one
    let settings = await prisma.sMSSettings.findFirst()
    
    if (settings) {
      // Update existing settings
      settings = await prisma.sMSSettings.update({
        where: { id: settings.id },
        data: {
          appointmentConfirmations,
          oneHourReminders,
          twentyFourHourReminders,
          noShowFollowUps,
          birthdayMessages
        }
      })
    } else {
      // Create new settings
      settings = await prisma.sMSSettings.create({
        data: {
          appointmentConfirmations,
          oneHourReminders,
          twentyFourHourReminders,
          noShowFollowUps,
          birthdayMessages
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating SMS settings:', error)
    return NextResponse.json(
      { error: 'Failed to update SMS settings' },
      { status: 500 }
    )
  }
}
