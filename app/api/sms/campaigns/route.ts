import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendBulkSMS } from '../../../lib/sms/twilio'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = status ? { status } : {}

    const campaigns = await prisma.sMSCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    const total = await prisma.sMSCampaign.count({ where })

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error: any) {
    console.error('Campaigns fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, message, scheduledFor, sendNow = false } = body

    // Validate required fields
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Campaign name and message are required' },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = await prisma.sMSCampaign.create({
      data: {
        name,
        message,
        status: sendNow ? 'sending' : (scheduledFor ? 'scheduled' : 'draft'),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null
      }
    })

    // If sendNow is true, send the campaign immediately
    if (sendNow) {
      try {
        // Get all clients who haven't opted out
        const recipients = await prisma.client.findMany({
          where: {
            smsOptOut: false
          },
          select: {
            id: true,
            phone: true
          }
        })

        if (recipients.length > 0) {
          // Send bulk SMS
          const result = await sendBulkSMS(
            recipients.map(r => ({ phone: r.phone, clientId: r.id })),
            message,
            campaign.id
          )

          // Update campaign with results
          await prisma.sMSCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'completed',
              sentAt: new Date(),
              sentCount: result.summary.sent,
              recipientCount: recipients.length
            }
          })

          // Log messages to database
          for (const messageResult of result.results) {
            if (messageResult.success) {
              const recipient = recipients.find(r => r.phone === messageResult.phone)
              await prisma.sMSMessage.create({
                data: {
                  to: messageResult.phone,
                  from: process.env.TWILIO_PHONE_NUMBER!,
                  body: message,
                  status: 'sent',
                  sentAt: new Date(),
                  clientId: recipient?.id,
                  campaignId: campaign.id
                }
              })
            } else {
              // Log failed messages
              const recipient = recipients.find(r => r.phone === messageResult.phone)
              await prisma.sMSMessage.create({
                data: {
                  to: messageResult.phone,
                  from: process.env.TWILIO_PHONE_NUMBER!,
                  body: message,
                  status: 'failed',
                  error: messageResult.error,
                  clientId: recipient?.id,
                  campaignId: campaign.id
                }
              })
            }
          }

          return NextResponse.json({
            success: true,
            campaign,
            result: {
              total: result.summary.total,
              sent: result.summary.sent,
              failed: result.summary.failed
            }
          })
        } else {
          // No recipients, mark as completed
          await prisma.sMSCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'completed',
              sentAt: new Date(),
              sentCount: 0,
              recipientCount: 0
            }
          })

          return NextResponse.json({
            success: true,
            campaign,
            result: {
              total: 0,
              sent: 0,
              failed: 0
            }
          })
        }
      } catch (error: any) {
        // Update campaign status to failed
        await prisma.sMSCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'failed'
          }
        })

        throw error
      }
    }

    return NextResponse.json({
      success: true,
      campaign
    })
  } catch (error: any) {
    console.error('Campaign creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, message, status, scheduledFor } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (message !== undefined) updateData.message = message
    if (status !== undefined) updateData.status = status
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null

    const campaign = await prisma.sMSCampaign.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      campaign
    })
  } catch (error: any) {
    console.error('Campaign update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
