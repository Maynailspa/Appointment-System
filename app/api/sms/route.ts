import { NextRequest, NextResponse } from 'next/server'
import { sendSMS } from '@/app/lib/sms/twilio'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, clientId, campaignId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    const result = await sendSMS(to, message, { clientId, campaignId })
    
    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { error: 'Failed to send SMS' },
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    let where = {}
    if (clientId) {
      where = { clientId }
    } else if (phone) {
      where = { to: phone }
    } else if (newContacts === 'true') {
      where = { clientId: null }
    }

    const messages = await prisma.sMSMessage.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
              include: {
          client: {
            select: { firstName: true, lastName: true, phone: true }
          },
          campaign: {
            select: { name: true }
          }
        }
    })

    const total = await prisma.sMSMessage.count({ where })

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('SMS history API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve SMS history' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    const phone = searchParams.get('phone')

    if (!contactId && !phone) {
      return NextResponse.json(
        { error: 'Contact ID or phone number is required' },
        { status: 400 }
      )
    }

    let whereClause = {}
    if (contactId) {
      whereClause = { id: contactId }
    } else if (phone) {
      whereClause = { to: phone }
    }

    // Delete all SMS messages for this contact
    const deletedMessages = await prisma.sMSMessage.deleteMany({
      where: whereClause
    })

    console.log(`Deleted ${deletedMessages.count} messages for contact:`, contactId || phone)

    return NextResponse.json({
      success: true,
      deletedCount: deletedMessages.count
    })
  } catch (error) {
    console.error('Delete SMS messages error:', error)
    return NextResponse.json(
      { error: 'Failed to delete SMS messages' },
      { status: 500 }
    )
  }
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 