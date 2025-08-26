import { PrismaClient } from '@prisma/client'
import { oneHourBefore, twentyFourHoursBefore, appointmentMissed, birthdayMessage } from '../sms/automations'
import { sendBulkSMS } from '../sms/twilio'

const prisma = new PrismaClient()

// Check for upcoming appointments and send reminders
export async function checkUpcomingAppointments(): Promise<{
  success: boolean
  remindersSent: number
  errors: string[]
}> {
  const errors: string[] = []
  let remindersSent = 0

  try {
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find appointments that need 1-hour reminders
    const oneHourAppointments = await prisma.appointment.findMany({
      where: {
        start: {
          gte: now,
          lte: oneHourFromNow
        },
        status: 'confirmed',
        client: {
          smsOptOut: false
        }
      },
      include: {
        client: true
      }
    })

    // Find appointments that need 24-hour reminders
    const twentyFourHourAppointments = await prisma.appointment.findMany({
      where: {
        start: {
          gte: twentyFourHoursFromNow,
          lte: new Date(twentyFourHoursFromNow.getTime() + 60 * 60 * 1000) // Within the next hour
        },
        status: 'confirmed',
        client: {
          smsOptOut: false
        }
      },
      include: {
        client: true
      }
    })

    // Send 1-hour reminders
    for (const appointment of oneHourAppointments) {
      try {
        const result = await oneHourBefore(appointment.id)
        if (result.success) {
          remindersSent++
          console.log(`1-hour reminder sent for appointment ${appointment.id}`)
        } else {
          errors.push(`Failed to send 1-hour reminder for appointment ${appointment.id}: ${result.error}`)
        }
      } catch (error: any) {
        errors.push(`Error sending 1-hour reminder for appointment ${appointment.id}: ${error.message}`)
      }
    }

    // Send 24-hour reminders
    for (const appointment of twentyFourHourAppointments) {
      try {
        const result = await twentyFourHoursBefore(appointment.id)
        if (result.success) {
          remindersSent++
          console.log(`24-hour reminder sent for appointment ${appointment.id}`)
        } else {
          errors.push(`Failed to send 24-hour reminder for appointment ${appointment.id}: ${result.error}`)
        }
      } catch (error: any) {
        errors.push(`Error sending 24-hour reminder for appointment ${appointment.id}: ${error.message}`)
      }
    }

    return {
      success: true,
      remindersSent,
      errors
    }
  } catch (error: any) {
    console.error('Error checking upcoming appointments:', error)
    return {
      success: false,
      remindersSent: 0,
      errors: [error.message]
    }
  }
}

// Check for missed appointments and send follow-ups
export async function checkMissedAppointments(): Promise<{
  success: boolean
  followUpsSent: number
  errors: string[]
}> {
  const errors: string[] = []
  let followUpsSent = 0

  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Find appointments that were missed (past appointment time but still marked as confirmed)
    const missedAppointments = await prisma.appointment.findMany({
      where: {
        start: {
          lt: oneHourAgo
        },
        status: 'confirmed',
        client: {
          smsOptOut: false
        }
      },
      include: {
        client: true
      }
    })

    for (const appointment of missedAppointments) {
      try {
        const result = await appointmentMissed(appointment.id)
        if (result.success) {
          followUpsSent++
          
          // Mark appointment as missed
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'missed' }
          })
          
          console.log(`Missed appointment follow-up sent for appointment ${appointment.id}`)
        } else {
          errors.push(`Failed to send missed appointment follow-up for appointment ${appointment.id}: ${result.error}`)
        }
      } catch (error: any) {
        errors.push(`Error sending missed appointment follow-up for appointment ${appointment.id}: ${error.message}`)
      }
    }

    return {
      success: true,
      followUpsSent,
      errors
    }
  } catch (error: any) {
    console.error('Error checking missed appointments:', error)
    return {
      success: false,
      followUpsSent: 0,
      errors: [error.message]
    }
  }
}

// Check for birthdays and send birthday messages
export async function checkBirthdays(): Promise<{
  success: boolean
  birthdayMessagesSent: number
  errors: string[]
}> {
  const errors: string[] = []
  let birthdayMessagesSent = 0

  try {
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()

    // Find clients with birthdays today who haven't opted out
    const birthdayClients = await prisma.client.findMany({
      where: {
        dateOfBirth: {
          not: null
        },
        smsOptOut: false
      }
    })

    for (const client of birthdayClients) {
      if (client.dateOfBirth) {
        const birthDate = new Date(client.dateOfBirth)
        const birthMonth = birthDate.getMonth() + 1
        const birthDay = birthDate.getDate()

        if (month === birthMonth && day === birthDay) {
          try {
            const result = await birthdayMessage(client.id)
            if (result.success) {
              birthdayMessagesSent++
              console.log(`Birthday message sent for client ${client.id}`)
            } else {
              errors.push(`Failed to send birthday message for client ${client.id}: ${result.error}`)
            }
          } catch (error: any) {
            errors.push(`Error sending birthday message for client ${client.id}: ${error.message}`)
          }
        }
      }
    }

    return {
      success: true,
      birthdayMessagesSent,
      errors
    }
  } catch (error: any) {
    console.error('Error checking birthdays:', error)
    return {
      success: false,
      birthdayMessagesSent: 0,
      errors: [error.message]
    }
  }
}

// Process scheduled campaigns
export async function processScheduledCampaigns(): Promise<{
  success: boolean
  campaignsProcessed: number
  errors: string[]
}> {
  const errors: string[] = []
  let campaignsProcessed = 0

  try {
    const now = new Date()

    // Find campaigns that are scheduled to be sent now
    const scheduledCampaigns = await prisma.sMSCampaign.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now
        }
      }
    })

    for (const campaign of scheduledCampaigns) {
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
            campaign.message,
            campaign.id
          )

          if (result.success) {
            // Update campaign status
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
                    body: campaign.message,
                    status: 'sent',
                    sentAt: new Date(),
                    clientId: recipient?.id,
                    campaignId: campaign.id
                  }
                })
              }
            }

            campaignsProcessed++
            console.log(`Campaign ${campaign.id} processed successfully`)
          } else {
            errors.push(`Failed to send campaign ${campaign.id}: No messages sent`)
          }
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
          campaignsProcessed++
        }
      } catch (error: any) {
        errors.push(`Error processing campaign ${campaign.id}: ${error.message}`)
      }
    }

    return {
      success: true,
      campaignsProcessed,
      errors
    }
  } catch (error: any) {
    console.error('Error processing scheduled campaigns:', error)
    return {
      success: false,
      campaignsProcessed: 0,
      errors: [error.message]
    }
  }
}

// Clean up old messages (30+ days)
export async function cleanupOldMessages(): Promise<{
  success: boolean
  messagesDeleted: number
  error?: string
}> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await prisma.sMSMessage.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log(`Cleaned up ${result.count} old SMS messages`)
    return {
      success: true,
      messagesDeleted: result.count
    }
  } catch (error: any) {
    console.error('Error cleaning up old messages:', error)
    return {
      success: false,
      messagesDeleted: 0,
      error: error.message
    }
  }
}

// Main scheduler function that runs all checks
export async function runSMScheduler(): Promise<{
  success: boolean
  summary: {
    remindersSent: number
    followUpsSent: number
    birthdayMessagesSent: number
    campaignsProcessed: number
    messagesDeleted: number
  }
  errors: string[]
}> {
  const errors: string[] = []
  const summary = {
    remindersSent: 0,
    followUpsSent: 0,
    birthdayMessagesSent: 0,
    campaignsProcessed: 0,
    messagesDeleted: 0
  }

  try {
    console.log('Starting SMS scheduler...')

    // Check upcoming appointments
    const appointmentResult = await checkUpcomingAppointments()
    summary.remindersSent = appointmentResult.remindersSent
    errors.push(...appointmentResult.errors)

    // Check missed appointments
    const missedResult = await checkMissedAppointments()
    summary.followUpsSent = missedResult.followUpsSent
    errors.push(...missedResult.errors)

    // Check birthdays
    const birthdayResult = await checkBirthdays()
    summary.birthdayMessagesSent = birthdayResult.birthdayMessagesSent
    errors.push(...birthdayResult.errors)

    // Process scheduled campaigns
    const campaignResult = await processScheduledCampaigns()
    summary.campaignsProcessed = campaignResult.campaignsProcessed
    errors.push(...campaignResult.errors)

    // Clean up old messages (run once per day)
    const now = new Date()
    if (now.getHours() === 2 && now.getMinutes() < 5) { // Run at 2 AM
      const cleanupResult = await cleanupOldMessages()
      summary.messagesDeleted = cleanupResult.messagesDeleted
      if (!cleanupResult.success) {
        errors.push(cleanupResult.error || 'Cleanup failed')
      }
    }

    console.log('SMS scheduler completed:', summary)
    return {
      success: true,
      summary,
      errors
    }
  } catch (error: any) {
    console.error('SMS scheduler error:', error)
    return {
      success: false,
      summary,
      errors: [error.message]
    }
  }
}

// Test function for manual execution
export async function testSMScheduler(): Promise<void> {
  console.log('Testing SMS scheduler...')
  const result = await runSMScheduler()
  console.log('Test result:', result)
}
