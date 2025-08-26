import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (type) where.type = type
    if (isActive !== null) where.isActive = isActive === 'true'

    const templates = await prisma.sMSTemplate.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      templates
    })
  } catch (error: any) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, body: templateBody, variables, isActive = true } = body

    // Validate required fields
    if (!name || !type || !templateBody) {
      return NextResponse.json(
        { error: 'Template name, type, and body are required' },
        { status: 400 }
      )
    }

    // Check if template with same name already exists
    const existingTemplate = await prisma.sMSTemplate.findFirst({
      where: { name }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 400 }
      )
    }

    const template = await prisma.sMSTemplate.create({
      data: {
        name,
        type,
        body: templateBody,
        variables: variables ? JSON.stringify(variables) : null,
        isActive
      }
    })

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error: any) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, type, body: templateBody, variables, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (templateBody !== undefined) updateData.body = templateBody
    if (variables !== undefined) updateData.variables = JSON.stringify(variables)
    if (isActive !== undefined) updateData.isActive = isActive

    const template = await prisma.sMSTemplate.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error: any) {
    console.error('Template update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Initialize default templates
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'initialize') {
      const defaultTemplates = [
        {
          name: 'Appointment Confirmation',
          type: 'appointment_confirmation',
          body: 'Hi {{clientName}}! Your appointment has been confirmed for {{appointmentDate}} at {{appointmentTime}} for {{serviceName}} with {{staffName}}. We look forward to seeing you! - {{businessName}}',
          variables: ['clientName', 'appointmentDate', 'appointmentTime', 'serviceName', 'staffName', 'businessName']
        },
        {
          name: '24-Hour Reminder',
          type: 'appointment_reminder_24h',
          body: 'Hi {{clientName}}! This is a friendly reminder that you have an appointment tomorrow at {{appointmentTime}} for {{serviceName}} with {{staffName}}. See you soon! - {{businessName}}',
          variables: ['clientName', 'appointmentTime', 'serviceName', 'staffName', 'businessName']
        },
        {
          name: '1-Hour Reminder',
          type: 'appointment_reminder_1h',
          body: 'Hi {{clientName}}! Your appointment is in 1 hour at {{appointmentTime}} for {{serviceName}} with {{staffName}}. We\'re looking forward to seeing you! - {{businessName}}',
          variables: ['clientName', 'appointmentTime', 'serviceName', 'staffName', 'businessName']
        },
        {
          name: 'Missed Appointment',
          type: 'appointment_missed',
          body: 'Hi {{clientName}}! We noticed you missed your appointment today. Please call us at {{phoneNumber}} to reschedule. We\'d love to see you soon! - {{businessName}}',
          variables: ['clientName', 'phoneNumber', 'businessName']
        },
        {
          name: 'Birthday Message',
          type: 'birthday',
          body: 'Happy Birthday {{clientName}}! 🎉 We hope you have a wonderful day! Come celebrate with us - book your appointment today! - {{businessName}}',
          variables: ['clientName', 'businessName']
        },
        {
          name: 'Follow-up Message',
          type: 'follow_up',
          body: 'Hi {{clientName}}! We hope you enjoyed your recent visit. How was your experience? We\'d love to see you again soon! - {{businessName}}',
          variables: ['clientName', 'businessName']
        }
      ]

      const createdTemplates = []

      for (const template of defaultTemplates) {
        const existing = await prisma.sMSTemplate.findFirst({
          where: { name: template.name }
        })

        if (!existing) {
          const created = await prisma.sMSTemplate.create({
            data: {
              name: template.name,
              type: template.type,
              body: template.body,
              variables: JSON.stringify(template.variables),
              isActive: true
            }
          })
          createdTemplates.push(created)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Initialized ${createdTemplates.length} templates`,
        templates: createdTemplates
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Template initialization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
