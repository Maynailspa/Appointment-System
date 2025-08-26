import { PrismaClient } from '@prisma/client'
import { sendSMS } from './twilio'

const prisma = new PrismaClient()

// Template variables that can be used in SMS messages
export interface SMSTemplateVariables {
  clientName?: string
  appointmentDate?: string
  appointmentTime?: string
  serviceName?: string
  staffName?: string
  businessName?: string
  phoneNumber?: string
  address?: string
  website?: string
  [key: string]: any
}

// Replace template variables in message body
function replaceTemplateVariables(body: string, variables: SMSTemplateVariables): string {
  let result = body
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), value || '')
  }
  
  return result
}

// Get default SMS templates
function getDefaultTemplate(type: string): string {
  const templates = {
    appointment_confirmation: `Hi {{clientName}}! Your appointment has been confirmed for {{appointmentDate}} at {{appointmentTime}} for {{serviceName}} with {{staffName}}. We look forward to seeing you! - {{businessName}}`,
    appointment_reminder_24h: `Hi {{clientName}}! This is a friendly reminder that you have an appointment tomorrow at {{appointmentTime}} for {{serviceName}} with {{staffName}}. See you soon! - {{businessName}}`,
    appointment_reminder_1h: `Hi {{clientName}}! Your appointment is in 1 hour at {{appointmentTime}} for {{serviceName}} with {{staffName}}. We're looking forward to seeing you! - {{businessName}}`,
    appointment_missed: `Hi {{clientName}}! We noticed you missed your appointment today. Please call us at {{phoneNumber}} to reschedule. We'd love to see you soon! - {{businessName}}`,
    birthday: `Happy Birthday {{clientName}}! 🎉 We hope you have a wonderful day! Come celebrate with us - book your appointment today! - {{businessName}}`,
    follow_up: `Hi {{clientName}}! We hope you enjoyed your recent visit. How was your experience? We'd love to see you again soon! - {{businessName}}`
  }
  
  return templates[type as keyof typeof templates] || 'Default message'
}

// Check if automation is enabled
async function isAutomationEnabled(type: string): Promise<boolean> {
  try {
    const automation = await prisma.sMSAutomation.findUnique({
      where: { type }
    })
    return automation?.enabled ?? true // Default to enabled if not found
  } catch (error) {
    console.error('Error checking automation status:', error)
    return false
  }
}

// Check if client has opted out of SMS
async function isClientOptedOut(clientId: string): Promise<boolean> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { smsOptOut: true }
    })
    return client?.smsOptOut ?? false
  } catch (error) {
    console.error('Error checking client opt-out status:', error)
    return false
  }
}

// Send appointment confirmation SMS
export async function appointmentCreated(appointmentId: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    // Check if automation is enabled
    if (!(await isAutomationEnabled('appointment_created'))) {
      return { success: false, error: 'Automation disabled' }
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        staff: true,
        services: true
      }
    })

    if (!appointment || !appointment.client) {
      return { success: false, error: 'Appointment or client not found' }
    }

    // Check if client has opted out
    if (await isClientOptedOut(appointment.clientId!)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    // Get template
    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'appointment_created' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('appointment_confirmation')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    // Prepare variables
    const variables: SMSTemplateVariables = {
      clientName: `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim(),
      appointmentDate: appointment.start.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      appointmentTime: appointment.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      serviceName: appointment.services.map(s => s.serviceName).join(', '),
      staffName: appointment.staff?.name || 'Any Staff',
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567',
      address: '123 Main St, City, State',
      website: 'www.maynails.com'
    }

    // Replace variables in message
    const finalMessage = replaceTemplateVariables(messageBody, variables)

    // Send SMS
    const result = await sendSMS(appointment.client.phone, finalMessage, {
      clientId: appointment.clientId!
    })

    // Log message to database
    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: appointment.client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: appointment.clientId!,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending appointment confirmation:', error)
    return { success: false, error: error.message }
  }
}

// Send 1-hour reminder
export async function oneHourBefore(appointmentId: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!(await isAutomationEnabled('one_hour_before'))) {
      return { success: false, error: 'Automation disabled' }
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        staff: true,
        services: true
      }
    })

    if (!appointment || !appointment.client) {
      return { success: false, error: 'Appointment or client not found' }
    }

    if (await isClientOptedOut(appointment.clientId!)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'one_hour_before' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('appointment_reminder_1h')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    const variables: SMSTemplateVariables = {
      clientName: `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim(),
      appointmentTime: appointment.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      serviceName: appointment.services.map(s => s.serviceName).join(', '),
      staffName: appointment.staff?.name || 'Any Staff',
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567'
    }

    const finalMessage = replaceTemplateVariables(messageBody, variables)
    const result = await sendSMS(appointment.client.phone, finalMessage, {
      clientId: appointment.clientId!
    })

    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: appointment.client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: appointment.clientId!,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending 1-hour reminder:', error)
    return { success: false, error: error.message }
  }
}

// Send 24-hour reminder
export async function twentyFourHoursBefore(appointmentId: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!(await isAutomationEnabled('twenty_four_hours_before'))) {
      return { success: false, error: 'Automation disabled' }
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        staff: true,
        services: true
      }
    })

    if (!appointment || !appointment.client) {
      return { success: false, error: 'Appointment or client not found' }
    }

    if (await isClientOptedOut(appointment.clientId!)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'twenty_four_hours_before' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('appointment_reminder_24h')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    const variables: SMSTemplateVariables = {
      clientName: `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim(),
      appointmentTime: appointment.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      serviceName: appointment.services.map(s => s.serviceName).join(', '),
      staffName: appointment.staff?.name || 'Any Staff',
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567'
    }

    const finalMessage = replaceTemplateVariables(messageBody, variables)
    const result = await sendSMS(appointment.client.phone, finalMessage, {
      clientId: appointment.clientId!
    })

    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: appointment.client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: appointment.clientId!,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending 24-hour reminder:', error)
    return { success: false, error: error.message }
  }
}

// Send missed appointment follow-up
export async function appointmentMissed(appointmentId: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!(await isAutomationEnabled('appointment_missed'))) {
      return { success: false, error: 'Automation disabled' }
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        staff: true,
        services: true
      }
    })

    if (!appointment || !appointment.client) {
      return { success: false, error: 'Appointment or client not found' }
    }

    if (await isClientOptedOut(appointment.clientId!)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'appointment_missed' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('appointment_missed')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    const variables: SMSTemplateVariables = {
      clientName: `${appointment.client.firstName} ${appointment.client.lastName || ''}`.trim(),
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567'
    }

    const finalMessage = replaceTemplateVariables(messageBody, variables)
    const result = await sendSMS(appointment.client.phone, finalMessage, {
      clientId: appointment.clientId!
    })

    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: appointment.client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: appointment.clientId!,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending missed appointment follow-up:', error)
    return { success: false, error: error.message }
  }
}

// Send birthday message
export async function birthdayMessage(clientId: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!(await isAutomationEnabled('birthday'))) {
      return { success: false, error: 'Automation disabled' }
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    if (await isClientOptedOut(clientId)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'birthday' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('birthday')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    const variables: SMSTemplateVariables = {
      clientName: `${client.firstName} ${client.lastName || ''}`.trim(),
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567'
    }

    const finalMessage = replaceTemplateVariables(messageBody, variables)
    const result = await sendSMS(client.phone, finalMessage, {
      clientId: clientId
    })

    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: clientId,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending birthday message:', error)
    return { success: false, error: error.message }
  }
}

// Send follow-up message after appointment
export async function followUpMessage(clientId: string, appointmentId?: string): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!(await isAutomationEnabled('follow_up'))) {
      return { success: false, error: 'Automation disabled' }
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    if (await isClientOptedOut(clientId)) {
      return { success: false, error: 'Client has opted out of SMS' }
    }

    const automation = await prisma.sMSAutomation.findUnique({
      where: { type: 'follow_up' },
      include: { template: true }
    })

    let messageBody = getDefaultTemplate('follow_up')
    if (automation?.template?.body) {
      messageBody = automation.template.body
    }

    const variables: SMSTemplateVariables = {
      clientName: `${client.firstName} ${client.lastName || ''}`.trim(),
      businessName: 'May Nails & Spa',
      phoneNumber: '555-123-4567'
    }

    const finalMessage = replaceTemplateVariables(messageBody, variables)
    const result = await sendSMS(client.phone, finalMessage, {
      clientId: clientId
    })

    if (result.success) {
      await prisma.sMSMessage.create({
        data: {
          to: client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: finalMessage,
          status: 'sent',
          sentAt: new Date(),
          clientId: clientId,
          campaignId: null
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('Error sending follow-up message:', error)
    return { success: false, error: error.message }
  }
}
