import twilio from 'twilio'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

// Check if Twilio credentials are configured
const isTwilioConfigured = accountSid && authToken && fromNumber && 
  accountSid.startsWith('AC') && 
  authToken.length > 0 && 
  fromNumber.length > 0

// Debug logging
console.log('Twilio configuration check:', {
  hasAccountSid: !!accountSid,
  hasAuthToken: !!authToken,
  hasFromNumber: !!fromNumber,
  accountSidPrefix: accountSid?.substring(0, 2),
  isConfigured: isTwilioConfigured
})

let client: any = null

// Rate limiting configuration
const RATE_LIMIT = {
  messagesPerMinute: 10,
  messagesPerHour: 100,
  messagesPerDay: 1000
}

// In-memory rate limiting (in production, use Redis or database)
const rateLimitStore = {
  minute: new Map<string, number>(),
  hour: new Map<string, number>(),
  day: new Map<string, number>()
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now()
  const minuteAgo = now - 60 * 1000
  const hourAgo = now - 60 * 60 * 1000
  const dayAgo = now - 24 * 60 * 60 * 1000

  for (const [key, timestamp] of rateLimitStore.minute) {
    if (timestamp < minuteAgo) rateLimitStore.minute.delete(key)
  }
  for (const [key, timestamp] of rateLimitStore.hour) {
    if (timestamp < hourAgo) rateLimitStore.hour.delete(key)
  }
  for (const [key, timestamp] of rateLimitStore.day) {
    if (timestamp < dayAgo) rateLimitStore.day.delete(key)
  }
}, 60000) // Clean up every minute

// Check rate limits
function checkRateLimit(phoneNumber: string): { allowed: boolean; reason?: string } {
  const now = Date.now()
  const minuteKey = `${phoneNumber}:${Math.floor(now / 60000)}`
  const hourKey = `${phoneNumber}:${Math.floor(now / 3600000)}`
  const dayKey = `${phoneNumber}:${Math.floor(now / 86400000)}`

  const minuteCount = rateLimitStore.minute.get(minuteKey) || 0
  const hourCount = rateLimitStore.hour.get(hourKey) || 0
  const dayCount = rateLimitStore.day.get(dayKey) || 0

  if (minuteCount >= RATE_LIMIT.messagesPerMinute) {
    return { allowed: false, reason: 'Rate limit exceeded: too many messages per minute' }
  }
  if (hourCount >= RATE_LIMIT.messagesPerHour) {
    return { allowed: false, reason: 'Rate limit exceeded: too many messages per hour' }
  }
  if (dayCount >= RATE_LIMIT.messagesPerDay) {
    return { allowed: false, reason: 'Rate limit exceeded: too many messages per day' }
  }

  return { allowed: true }
}

// Update rate limit counters
function updateRateLimit(phoneNumber: string) {
  const now = Date.now()
  const minuteKey = `${phoneNumber}:${Math.floor(now / 60000)}`
  const hourKey = `${phoneNumber}:${Math.floor(now / 3600000)}`
  const dayKey = `${phoneNumber}:${Math.floor(now / 86400000)}`

  rateLimitStore.minute.set(minuteKey, (rateLimitStore.minute.get(minuteKey) || 0) + 1)
  rateLimitStore.hour.set(hourKey, (rateLimitStore.hour.get(hourKey) || 0) + 1)
  rateLimitStore.day.set(dayKey, (rateLimitStore.day.get(dayKey) || 0) + 1)
}

// Validate phone number format
export function validatePhoneNumber(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
  try {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Check if it's a valid US phone number (10 or 11 digits)
    if (cleaned.length === 10) {
      // Add +1 prefix for US numbers
      return { valid: true, formatted: `+1${cleaned}` }
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // Already has country code
      return { valid: true, formatted: `+${cleaned}` }
    } else if (cleaned.length > 11) {
      // International number
      return { valid: true, formatted: `+${cleaned}` }
    } else {
      return { valid: false, error: 'Invalid phone number format. Please enter a valid US or international phone number.' }
    }
  } catch (error) {
    return { valid: false, error: 'Error validating phone number' }
  }
}

// Send individual SMS
export async function sendSMS(to: string, body: string, options?: {
  clientId?: string
  campaignId?: string
}): Promise<{
  success: boolean
  messageId?: string
  error?: string
  twilioSid?: string
}> {
  try {
    // Check if Twilio is configured
    if (!isTwilioConfigured) {
      console.warn('Twilio not configured. SMS will be logged but not sent.')
      // Generate a mock message ID for logging purposes
      const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return {
        success: true,
        messageId: mockMessageId,
        error: 'Twilio not configured - message logged but not sent'
      }
    }

    // Validate phone number
    const validation = validatePhoneNumber(to)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const formattedNumber = validation.formatted!

    // Check rate limits
    const rateLimitCheck = checkRateLimit(formattedNumber)
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.reason }
    }

    // Initialize Twilio client if not already done
    if (!client && isTwilioConfigured) {
      client = twilio(accountSid, authToken)
    }

    // Check if client is available
    if (!client) {
      return { success: false, error: 'Twilio client not available' }
    }

    // Send message via Twilio
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: formattedNumber
    })

    // Update rate limit
    updateRateLimit(formattedNumber)

    return {
      success: true,
      messageId: message.sid,
      twilioSid: message.sid
    }
  } catch (error: any) {
    console.error('SMS send error:', error)
    
    // Handle specific Twilio errors
    if (error.code === 21211) {
      return { success: false, error: 'Invalid phone number format' }
    } else if (error.code === 21608) {
      return { success: false, error: 'Message quota exceeded' }
    } else if (error.code === 21614) {
      return { success: false, error: 'Invalid phone number' }
    } else if (error.code === 30007) {
      return { success: false, error: 'Message delivery failed' }
    } else {
      return { success: false, error: error.message || 'Failed to send SMS' }
    }
  }
}

// Send bulk SMS with rate limiting
export async function sendBulkSMS(
  recipients: Array<{ phone: string; clientId?: string }>,
  body: string,
  campaignId?: string
): Promise<{
  success: boolean
  results: Array<{
    phone: string
    success: boolean
    messageId?: string
    error?: string
  }>
  summary: {
    total: number
    sent: number
    failed: number
  }
}> {
  const results: Array<{
    phone: string
    success: boolean
    messageId?: string
    error?: string
  }> = []

  let sentCount = 0
  let failedCount = 0

  // Process recipients with rate limiting
  for (const recipient of recipients) {
    try {
      // Add delay between messages to respect rate limits
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
      }

      const result = await sendSMS(recipient.phone, body, {
        clientId: recipient.clientId,
        campaignId
      })

      results.push({
        phone: recipient.phone,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      })

      if (result.success) {
        sentCount++
      } else {
        failedCount++
      }
    } catch (error: any) {
      results.push({
        phone: recipient.phone,
        success: false,
        error: error.message || 'Unknown error'
      })
      failedCount++
    }
  }

  return {
    success: sentCount > 0,
    results,
    summary: {
      total: recipients.length,
      sent: sentCount,
      failed: failedCount
    }
  }
}

// Retry failed messages (max 3 attempts)
export async function retryFailedMessage(
  messageId: string,
  to: string,
  body: string,
  attempt: number = 1
): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  if (attempt > 3) {
    return { success: false, error: 'Max retry attempts exceeded' }
  }

  try {
    // Add exponential backoff delay
    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
    await new Promise(resolve => setTimeout(resolve, delay))

    return await sendSMS(to, body)
  } catch (error: any) {
    console.error(`Retry attempt ${attempt} failed for message ${messageId}:`, error)
    
    if (attempt < 3) {
      // Recursive retry
      return retryFailedMessage(messageId, to, body, attempt + 1)
    } else {
      return { success: false, error: error.message || 'All retry attempts failed' }
    }
  }
}

// Get message status from Twilio
export async function getMessageStatus(messageSid: string): Promise<{
  success: boolean
  status?: string
  error?: string
}> {
  try {
    const message = await client.messages(messageSid).fetch()
    return {
      success: true,
      status: message.status
    }
  } catch (error: any) {
    console.error('Error fetching message status:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch message status'
    }
  }
}

// Get account usage and limits
export async function getAccountUsage(): Promise<{
  success: boolean
  usage?: {
    messagesSent: number
    messagesRemaining: number
    accountBalance: string
  }
  error?: string
}> {
  try {
    // Simplified version - return basic info
    return {
      success: true,
      usage: {
        messagesSent: 0, // Would need to track this in database
        messagesRemaining: 1000, // Assuming 1000 messages per month
        accountBalance: '0.00' // Would need to fetch from Twilio API
      }
    }
  } catch (error: any) {
    console.error('Error fetching account usage:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch account usage'
    }
  }
}

// Test SMS functionality
export async function testSMS(to: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const testMessage = `Test message from TurnMate - ${new Date().toLocaleString()}`
    const result = await sendSMS(to, testMessage)
    
    if (result.success) {
      return {
        success: true,
        message: 'Test SMS sent successfully'
      }
    } else {
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Test SMS failed'
    }
  }
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 