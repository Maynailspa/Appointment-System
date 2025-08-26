import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract webhook data
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string
    const to = formData.get('To') as string
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const errorCode = formData.get('ErrorCode') as string
    const errorMessage = formData.get('ErrorMessage') as string

    console.log('Twilio webhook received:', {
      messageSid,
      messageStatus,
      to,
      from,
      body: body?.substring(0, 50) + '...',
      errorCode,
      errorMessage
    })

    // Handle delivery status updates
    if (messageSid && messageStatus) {
      await handleDeliveryStatus(messageSid, messageStatus, errorCode, errorMessage)
    }

    // Handle incoming messages (STOP/START keywords)
    if (body && to && from) {
      await handleIncomingMessage(body, to, from)
    }

    // Twilio expects a 200 response
    return new NextResponse('OK', { status: 200 })
  } catch (error: any) {
    console.error('Twilio webhook error:', error)
    // Still return 200 to avoid Twilio retries
    return new NextResponse('OK', { status: 200 })
  }
}

async function handleDeliveryStatus(
  messageSid: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
) {
  try {
    // Find the message in our database
    const message = await prisma.sMSMessage.findFirst({
      where: {
        OR: [
          { id: messageSid },
          { id: { contains: messageSid } }
        ]
      }
    })

    if (message) {
      // Update message status
      const updateData: any = {
        status: mapTwilioStatus(status)
      }

      if (status === 'delivered') {
        updateData.deliveredAt = new Date()
      } else if (status === 'failed' || status === 'undelivered') {
        updateData.error = errorMessage || `Error code: ${errorCode}`
      }

      await prisma.sMSMessage.update({
        where: { id: message.id },
        data: updateData
      })

      console.log(`Updated message ${message.id} status to ${status}`)
    } else {
      console.log(`Message with SID ${messageSid} not found in database`)
    }
  } catch (error: any) {
    console.error('Error handling delivery status:', error)
  }
}

async function handleIncomingMessage(body: string, to: string, from: string) {
  try {
    const messageBody = body.trim().toUpperCase()

    // Handle STOP keyword
    if (messageBody === 'STOP') {
      await handleOptOut(from)
      return
    }

    // Handle START keyword
    if (messageBody === 'START') {
      await handleOptIn(from)
      return
    }

    // Handle HELP keyword
    if (messageBody === 'HELP') {
      await handleHelp(from)
      return
    }

    // Log other incoming messages
    await prisma.sMSMessage.create({
      data: {
        to: to,
        from: from,
        body: body,
        status: 'received',
        sentAt: new Date()
      }
    })

    console.log(`Incoming message from ${from}: ${body}`)
  } catch (error: any) {
    console.error('Error handling incoming message:', error)
  }
}

async function handleOptOut(phoneNumber: string) {
  try {
    // Find client by phone number
    const client = await prisma.client.findFirst({
      where: { phone: phoneNumber }
    })

    if (client) {
      // Update client opt-out status
      await prisma.client.update({
        where: { id: client.id },
        data: { smsOptOut: true }
      })

      console.log(`Client ${client.id} opted out of SMS`)
    }

    // Send confirmation message
    await sendOptOutConfirmation(phoneNumber)
  } catch (error: any) {
    console.error('Error handling opt-out:', error)
  }
}

async function handleOptIn(phoneNumber: string) {
  try {
    // Find client by phone number
    const client = await prisma.client.findFirst({
      where: { phone: phoneNumber }
    })

    if (client) {
      // Update client opt-out status
      await prisma.client.update({
        where: { id: client.id },
        data: { smsOptOut: false }
      })

      console.log(`Client ${client.id} opted in to SMS`)
    }

    // Send confirmation message
    await sendOptInConfirmation(phoneNumber)
  } catch (error: any) {
    console.error('Error handling opt-in:', error)
  }
}

async function handleHelp(phoneNumber: string) {
  try {
    const helpMessage = `Reply STOP to unsubscribe from SMS messages. Reply START to subscribe. Reply HELP for this message.`
    
    // Send help message
    await sendHelpMessage(phoneNumber, helpMessage)
  } catch (error: any) {
    console.error('Error handling help request:', error)
  }
}

async function sendOptOutConfirmation(phoneNumber: string) {
  try {
    const { sendSMS } = await import('../../../../lib/sms/twilio')
    
    const message = `You have been unsubscribed from SMS messages. Reply START to subscribe again.`
    
    await sendSMS(phoneNumber, message)
    console.log(`Sent opt-out confirmation to ${phoneNumber}`)
  } catch (error: any) {
    console.error('Error sending opt-out confirmation:', error)
  }
}

async function sendOptInConfirmation(phoneNumber: string) {
  try {
    const { sendSMS } = await import('../../../../lib/sms/twilio')
    
    const message = `You have been subscribed to SMS messages. Reply STOP to unsubscribe.`
    
    await sendSMS(phoneNumber, message)
    console.log(`Sent opt-in confirmation to ${phoneNumber}`)
  } catch (error: any) {
    console.error('Error sending opt-in confirmation:', error)
  }
}

async function sendHelpMessage(phoneNumber: string, message: string) {
  try {
    const { sendSMS } = await import('../../../../lib/sms/twilio')
    
    await sendSMS(phoneNumber, message)
    console.log(`Sent help message to ${phoneNumber}`)
  } catch (error: any) {
    console.error('Error sending help message:', error)
  }
}

function mapTwilioStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case 'sent':
    case 'sending':
      return 'sent'
    case 'delivered':
      return 'delivered'
    case 'failed':
    case 'undelivered':
      return 'failed'
    default:
      return 'pending'
  }
}
