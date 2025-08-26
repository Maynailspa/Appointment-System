import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const automations = await prisma.sMSAutomation.findMany({
      include: {
        template: true
      },
      orderBy: { type: 'asc' }
    })

    return NextResponse.json({
      automations
    })
  } catch (error: any) {
    console.error('Automations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, enabled, templateId, settings } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Automation type is required' },
        { status: 400 }
      )
    }

    // Check if automation exists
    let automation = await prisma.sMSAutomation.findUnique({
      where: { type }
    })

    if (!automation) {
      // Create new automation with default settings
      automation = await prisma.sMSAutomation.create({
        data: {
          type,
          enabled: enabled ?? true,
          templateId: templateId || null,
          settings: settings ? JSON.stringify(settings) : null
        },
        include: {
          template: true
        }
      })
    } else {
      // Update existing automation
      const updateData: any = {}
      if (enabled !== undefined) updateData.enabled = enabled
      if (templateId !== undefined) updateData.templateId = templateId
      if (settings !== undefined) updateData.settings = JSON.stringify(settings)

      automation = await prisma.sMSAutomation.update({
        where: { type },
        data: updateData,
        include: {
          template: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      automation
    })
  } catch (error: any) {
    console.error('Automation update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Initialize default automations if they don't exist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'initialize') {
      const defaultAutomations = [
        { type: 'appointment_created', enabled: true },
        { type: 'one_hour_before', enabled: true },
        { type: 'twenty_four_hours_before', enabled: true },
        { type: 'appointment_missed', enabled: true },
        { type: 'birthday', enabled: true },
        { type: 'follow_up', enabled: false }
      ]

      const createdAutomations = []

      for (const automation of defaultAutomations) {
        const existing = await prisma.sMSAutomation.findUnique({
          where: { type: automation.type }
        })

        if (!existing) {
          const created = await prisma.sMSAutomation.create({
            data: automation,
            include: {
              template: true
            }
          })
          createdAutomations.push(created)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Initialized ${createdAutomations.length} automations`,
        automations: createdAutomations
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Automation initialization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
