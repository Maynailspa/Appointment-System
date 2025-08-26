import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendSMS, validatePhoneNumber } from '../../../lib/sms/twilio'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, clientId, campaignId, imageData, imageFiles } = body

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(to)
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 400 }
      )
    }

    // Check if client has opted out (if clientId is provided and exists in database)
    let validClientId = null
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { smsOptOut: true }
      })

      if (client?.smsOptOut) {
        return NextResponse.json(
          { error: 'Client has opted out of SMS messages' },
          { status: 400 }
        )
      }
      
      // Only use clientId if the client actually exists in the database
      if (client) {
        validClientId = clientId
      }
    }

    // Send SMS
    const result = await sendSMS(to, message, {
      clientId,
      campaignId
    })

    if (result.success) {
      // Log message to database
      await prisma.sMSMessage.create({
        data: {
          to: phoneValidation.formatted!,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: message,
          status: 'sent',
          sentAt: new Date(),
          clientId: validClientId,
          campaignId: campaignId || null,
          imageData: imageData || null,
          imageFiles: imageFiles ? JSON.stringify(imageFiles) : null
        }
      })

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        twilioSid: result.twilioSid
      })
    } else {
      // Log failed message to database
      await prisma.sMSMessage.create({
        data: {
          to: phoneValidation.formatted!,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: message,
          status: 'failed',
          error: result.error,
          clientId: validClientId,
          campaignId: campaignId || null,
          imageData: imageData || null,
          imageFiles: imageFiles ? JSON.stringify(imageFiles) : null
        }
      })

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('SMS send API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const phone = searchParams.get('phone')
    const newContacts = searchParams.get('newContacts')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get SMS messages for a specific client, phone number, new contacts, or all messages
    let where = {}
    if (clientId) {
      where = { clientId }
    } else if (phone) {
      where = { to: phone }
    } else if (newContacts === 'true') {
      where = { clientId: null } // Messages without a clientId (new contacts)
    }

    const messages = await prisma.sMSMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const total = await prisma.sMSMessage.count({ where })

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error: any) {
    console.error('SMS messages fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
